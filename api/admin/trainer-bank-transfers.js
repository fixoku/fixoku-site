import { queuePanelNotification as queueR406RejectionNotification } from "../../src/server/domain/panel-notifications.js";
import { assertUniqueBankReference, normalizeBankReference } from "../../src/server/domain/bank-reference-guard.js";
import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { fulfillTrainerOrder, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
import { recordApprovedAuditEvent } from "../../src/server/domain/fixoku-audit-policy.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const headers = (req) =>
  new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]));

async function body(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });

  const permission = req.method === "GET" ? "bank_transfer.review" : "bank_transfer.approve";
  const denied = requirePermission(principal, permission);
  if (denied) return json(res, denied.status, denied.body);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (req.method === "GET") {
      const purchases = (
        await pool.query(`
          select
            o.id,
            o.trainer_user_id as "trainerUserId",
            u.display_name as "trainerName",
            u.email as "trainerEmail",
            o.status,
            o.payment_method as "paymentMethod",
            o.currency,
            o.subtotal_minor as "subtotalMinor",
            o.shipping_minor as "shippingMinor",
            o.total_minor as "totalMinor",
            o.created_at as "createdAt",
            o.completed_at as "completedAt",
            n.status as "transferStatus",
            n.bank_name as "bankName",
            n.reported_amount_minor as "reportedAmountMinor",
            n.reference,
            n.transfer_date as "transferDate",
            n.submitted_at as "submittedAt",
            n.review_note as "reviewNote",
            coalesce(
              json_agg(
                json_build_object(
                  'packageId', i.package_id,
                  'packageVersionId', i.package_version_id,
                  'title', i.title_snapshot,
                  'lineTotalMinor', i.line_total_minor,
                  'quantity', i.quantity
                )
                order by i.id
              ) filter (where i.id is not null),
              '[]'
            ) as items
          from trainer_package_orders o
          join platform_users u on u.id = o.trainer_user_id
          left join trainer_package_order_items i on i.order_id = o.id
          left join trainer_bank_transfer_notifications n on n.order_id = o.id
          where o.payment_method='BANK_TRANSFER' and n.status in ('SUBMITTED','IN_REVIEW')
          group by
            o.id,
            u.display_name,
            u.email,
            n.status,
            n.bank_name,
            n.reported_amount_minor,
            n.reference,
            n.transfer_date,
            n.submitted_at,
            n.review_note
          order by o.created_at desc
          limit 500
        `)
      ).rows;

      const notifications = purchases
        .filter((row) => row.paymentMethod === "BANK_TRANSFER")
        .map((row) => ({
          id: row.id,
          orderId: row.id,
          status: row.transferStatus,
          trainerName: row.trainerName,
          trainerEmail: row.trainerEmail,
          packageTitle: Array.isArray(row.items) ? row.items.map((item) => item.title).join(", ") : "",
          bankName: row.bankName,
          reportedAmountMinor: row.reportedAmountMinor,
          expectedAmountMinor: row.totalMinor,
          currency: row.currency,
          reference: row.reference,
          reviewNote: row.reviewNote,
          submittedAt: row.submittedAt,
        }));

      return json(res, 200, { purchases, notifications });
    }

    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

    const input = await body(req);
    if (!TRAINER_COMMERCE_UUID.test(String(input.orderId || ""))) {
      return json(res, 400, { error: "ORDER_ID_INVALID" });
    }

    const client = await pool.connect();

    try {
      await client.query("begin");

      const row = (
        await client.query(
          "select * from trainer_bank_transfer_notifications where order_id=$1 for update",
          [input.orderId],
        )
      ).rows[0];

      if (!row) {
        await client.query("rollback");
        return json(res, 404, { error: "BANK_TRANSFER_NOT_FOUND" });
      }

      const action = String(input.action || "").toUpperCase();
      const order = (await client.query("select id,status,payment_method,total_minor,currency from trainer_package_orders where id=$1 for update", [input.orderId])).rows[0];
      if (!order || order.payment_method !== "BANK_TRANSFER") throw Object.assign(new Error("BANK_TRANSFER_ORDER_NOT_FOUND"), { status: 404 });

      if (action === "REJECT") {
        // R406_REJECT_STATE_GUARD
        if (order.status === "REJECTED" && row.status === "REJECTED") {
          await client.query("commit");
          return json(res, 200, {
            status: "REJECTED",
            entitlementActivated: false,
            replay: true
          });
        }

        if (!["PENDING_PAYMENT", "PAYMENT_REVIEW"].includes(order.status) ||
            !["SUBMITTED", "IN_REVIEW"].includes(row.status)) {
          await client.query("rollback");
          return json(res, 409, {
            error: "BANK_TRANSFER_NOT_REVIEWABLE"
          });
        }
        if (order.status === "PAID" || row.status === "APPROVED") {
          await client.query("rollback");
          return json(res, 409, { error: "BANK_TRANSFER_ALREADY_APPROVED" });
        }
        await client.query(
          "update trainer_bank_transfer_notifications set status='REJECTED',review_note=$1,reviewed_by=$2,reviewed_at=now(),updated_at=now() where order_id=$3",
          [
            String(input.note || "").trim().slice(0, 500) || "Bildirim reddedildi.",
            principal.user.id,
            input.orderId,
          ],
        );

        await client.query(
          "update trainer_package_orders set status='REJECTED',updated_at=now() where id=$1",
          [input.orderId],
        );

        await recordApprovedAuditEvent(client, {
          policyId: 47,
          actorUserId: principal.user.id,
          action: "trainer.commerce.bank_transfer.review.rejected",
          subjectType: "trainer_package_order",
          subjectId: input.orderId,
        });
        // R406_REJECTION_NOTIFICATION
        const recipient = (await client.query(
          "select u.id,u.email,u.display_name from trainer_package_orders o join platform_users u on u.id=o.trainer_user_id where o.id=$1",
          [input.orderId]
        )).rows[0];

        if (recipient?.id) {
          const title = "Havale/EFT ödemeniz onaylanmadı.";
          const message = "Banka hesabımızda ilgili ödeme tespit edilemediği için siparişiniz onaylanmamıştır. Eğitim paketinizi panelinizden yeniden satın alabilirsiniz.";

          await queueR406RejectionNotification(client, {
            recipientUserId: recipient.id,
            recipientEmail: recipient.email,
            eventType: "BANK_TRANSFER_REJECTED",
            title,
            body: message,
            emailSubject: "FIXOKU | Havale/EFT ödemeniz onaylanmadı",
            emailBody: message,
            metadata: {
              recipientName: recipient.display_name,
              orderId: input.orderId,
              reference: input.orderId,
              paymentMethod: "Havale/EFT",
              status: "REJECTED",
              path: "/panel/egitmen/egitimlerim",
              actionUrl: "/panel/egitmen/egitimlerim",
              reason: message
            },
            dedupeKey: "r406-bank-rejected:TRAINER:" + input.orderId
          });
        }

        await client.query("commit");
        return json(res, 200, { status: "REJECTED", entitlementActivated: false });
      }

      if (action !== "APPROVE") {
        throw Object.assign(new Error("BANK_TRANSFER_ACTION_INVALID"), { status: 400 });
      }

      if (order.status === "PAID" || row.status === "APPROVED") {
        await client.query("rollback");
        return json(res, 200, { status: "APPROVED", duplicateApproval: true, entitlementActivated: true });
      }
      if (!['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(order.status)) throw Object.assign(new Error("BANK_TRANSFER_NOT_REVIEWABLE"), { status: 409 });
      if (Number(row.reported_amount_minor) !== Number(order.total_minor) || String(row.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
        throw Object.assign(new Error("BANK_TRANSFER_AMOUNT_MISMATCH"), { status: 409 });
      }

      const receivedAmountMinor = input.receivedAmountMinor;
      const bankTransactionReference = normalizeBankReference(input.bankTransactionReference);

      if (!Number.isSafeInteger(receivedAmountMinor) ||
          receivedAmountMinor <= 0) {
        throw Object.assign(
          new Error("BANK_TRANSFER_RECEIVED_AMOUNT_REQUIRED"),
          {status:400}
        );
      }

      if (receivedAmountMinor !== Number(order.total_minor)) {
        throw Object.assign(
          new Error("BANK_TRANSFER_AMOUNT_MISMATCH"),
          {status:409}
        );
      }

      if (input.bankVerified !== true ||
          bankTransactionReference.length < 3 ||
          bankTransactionReference.length > 160) {
        throw Object.assign(
          new Error("BANK_TRANSFER_VERIFICATION_REQUIRED"),
          {status:400}
        );
      }
      await assertUniqueBankReference(client,{
        orderId:input.orderId,
        reference:bankTransactionReference
      });

      const result = await fulfillTrainerOrder(client, {
        orderId: input.orderId,
        actorUserId: principal.user.id,
        provider: "BANK_TRANSFER",
        providerReference: row.reference,
        amountMinor: receivedAmountMinor,
        currency: row.currency,
        manageTransaction: false,
      });

      await client.query(
        "update trainer_bank_transfer_notifications set status='APPROVED',review_note=$1,reviewed_by=$2,reviewed_at=now(),updated_at=now() where order_id=$3",
        [
          (`[BANK_VERIFIED] AmountMinor=${receivedAmountMinor}; BankReference=${bankTransactionReference}; ${String(input.note || "").trim()}`).slice(0,500),
          principal.user.id,
          input.orderId,
        ],
      );

      await recordApprovedAuditEvent(client, {
        policyId: 47,
        actorUserId: principal.user.id,
        action: "trainer.commerce.bank_transfer.review.approved",
        subjectType: "trainer_package_order",
        subjectId: input.orderId,
      });
      await client.query("commit");
      return json(res, 200, {
        status: "APPROVED",
        ...result,
        entitlementActivated: true,
      });
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        /* rollback best effort */
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return json(res, error.status || 409, {
      error: error.code || error.message || "BANK_TRANSFER_REVIEW_FAILED",
    });
  } finally {
    await pool.end();
  }
}
