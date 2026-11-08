import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalTrainerProductType, replaceStructuredComponents } from "./trainer-packages.js";

const OLD_PRODUCT = "11111111-1111-4111-8111-111111111111";
const NEW_PRODUCT = "22222222-2222-4222-8222-222222222222";
const OLD_COMPONENT = "33333333-3333-4333-8333-333333333333";

test("R16 product types use r6_product_type as the canonical trainer kind", () => {
  assert.equal(canonicalTrainerProductType({ productType: "PHYSICAL", r6ProductType: "TRAINING_SERVICE" }), "TRAINING_SERVICE");
  assert.equal(canonicalTrainerProductType({ productType: "DIGITAL", r6ProductType: "SOFTWARE" }), "SOFTWARE");
  assert.equal(canonicalTrainerProductType({ productType: "PHYSICAL", r6ProductType: "BOOK" }), "PHYSICAL");
  assert.equal(canonicalTrainerProductType({ productType: "SERVICE", r6ProductType: null }), "SERVICE");
});

function trainerProduct(id, title, price = 55000) {
  return { id, sku: `BOOK-${id.slice(0, 4)}`, title, productType: "PHYSICAL", listGrossMinor: price, vatRateBps: 0, isActive: true };
}

function fakeClient({ changedProduct = false } = {}) {
  const calls = [];
  const state = {
    components: [{ id: OLD_COMPONENT, component_type: "PHYSICAL_PRODUCT", reference_id: OLD_PRODUCT, physical_product_id: OLD_PRODUCT, title_snapshot: "Eski kitap", display_order: 0, is_active: true, quantity: 1, hasPricingReference: true, hasOrderReference: true, hasFamilyReference: false }],
  };
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes("join r6_package_component_pricing") && sql.includes("from package_components pc")) return { rows: [{ source_component_id: OLD_COMPONENT, component_type: "PHYSICAL_PRODUCT", reference_id: OLD_PRODUCT, physical_product_id: OLD_PRODUCT, display_order: 0, list_gross_minor: 55000, effective_sale_gross_minor: 50000, discount_minor: 5000, discount_percent_bps: 909, vat_rate_bps: 0, net_minor: 50000, vat_minor: 0, currency: "TRY" }] };
      if (sql.includes("to_regclass")) return { rows: [{ present: true }] };
      if (sql.startsWith("select distinct package_component_id from r6_order_component_snapshots")) return { rows: [{ package_component_id: OLD_COMPONENT }] };
      if (sql.startsWith("select distinct package_component_id from family_offer_child_selections")) return { rows: [] };
      if (sql.startsWith("select id,sku,title,product_type")) return { rows: [trainerProduct(changedProduct ? NEW_PRODUCT : OLD_PRODUCT, changedProduct ? "Yeni kitap" : "Eski kitap")] };
      if (sql.includes("select pc.*") && sql.includes("for update")) return { rows: state.components };
      if (sql.startsWith("update package_components set reference_id")) return { rowCount: 1, rows: [] };
      if (sql.startsWith("insert into package_components")) {
        state.components.push({ id: "44444444-4444-4444-8444-444444444444", component_type: "PHYSICAL_PRODUCT", reference_id: NEW_PRODUCT, physical_product_id: NEW_PRODUCT, display_order: 0, is_active: true, quantity: 1 });
        return { rowCount: 1, rows: [{ id: "44444444-4444-4444-8444-444444444444" }] };
      }
      if (sql.startsWith("update package_components set is_active=false")) {
        const keep = new Set((params[1] || []).map(String));
        for (const row of state.components) if (!keep.has(String(row.id))) row.is_active = false;
        return { rowCount: 1, rows: [] };
      }
      if (sql.startsWith("update packages set physical_product")) return { rowCount: 1, rows: [] };
      if (sql.includes("from package_components where package_version_id=$1")) return { rows: state.components };
      if (sql.trimStart().startsWith("insert into r6_package_component_pricing")) return { rowCount: 1, rows: [] };
      if (["begin", "commit", "rollback"].includes(sql)) return { rowCount: 1, rows: [] };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

test("trainer replacement keeps referenced components and never issues DELETE", async () => {
  const client = fakeClient();
  await replaceStructuredComponents(client, "55555555-5555-4555-8555-555555555555", [{ componentId: OLD_COMPONENT, componentType: "PHYSICAL_PRODUCT", physicalProductId: OLD_PRODUCT, quantity: 1, isActive: true }]);
  assert.equal(client.calls.some((call) => /delete\s+from\s+package_components/i.test(call.sql)), false);
  assert.equal(client.calls.some((call) => call.sql.startsWith("update package_components set reference_id")), true);
});

test("new product without a price rolls back after the FK-safe versioned edit", async () => {
  const client = fakeClient({ changedProduct: true });
  await client.query("begin");
  await assert.rejects(() => replaceStructuredComponents(client, "55555555-5555-4555-8555-555555555555", [{ componentType: "PHYSICAL_PRODUCT", physicalProductId: NEW_PRODUCT, quantity: 1, isActive: true }]), /COMPONENT_PRICING_REVIEW_REQUIRED/);
  await client.query("rollback");
  assert.equal(client.calls.some((call) => call.sql === "rollback"), true);
  assert.equal(client.calls.some((call) => /delete\s+from\s+package_components/i.test(call.sql)), false);
});
