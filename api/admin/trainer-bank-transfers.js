import pg from "pg";
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

      if (action === "REJECT") {
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
        await client.query("commit");
        return json(res, 200, { status: "REJECTED", entitlementActivated: false });
      }

      if (action !== "APPROVE") {
        throw Object.assign(new Error("BANK_TRANSFER_ACTION_INVALID"), { status: 400 });
      }

      const expected = (
        await client.query(
          "select total_minor from trainer_package_orders where id=$1",
          [input.orderId],
        )
      ).rows[0];

      if (Number(row.reported_amount_minor) !== Number(expected?.total_minor)) {
        throw Object.assign(new Error("BANK_TRANSFER_AMOUNT_MISMATCH"), { status: 409 });
      }

      const result = await fulfillTrainerOrder(client, {
        orderId: input.orderId,
        actorUserId: principal.user.id,
        provider: "BANK_TRANSFER",
        providerReference: row.reference,
        manageTransaction: false,
      });

      await client.query(
        "update trainer_bank_transfer_notifications set status='APPROVED',review_note=$1,reviewed_by=$2,reviewed_at=now(),updated_at=now() where order_id=$3",
        [
          String(input.note || "").trim().slice(0, 500) || null,
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
