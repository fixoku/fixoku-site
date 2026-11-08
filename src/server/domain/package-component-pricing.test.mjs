import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreComponentPricing, assertComponentPricingIntegrity } from "./package-component-pricing.js";

function fakeClient({ components, pricing = [] }) {
  const inserts = [];
  return {
    inserts,
    async query(sql, params = []) {
      if (sql.includes("from package_components pc") && sql.includes("join r6_package_component_pricing")) return { rows: pricing };
      if (sql.includes("component_type <> 'TEXT_ITEM'") && sql.includes("limit 1")) return { rows: components.filter((row) => row.is_active !== false && row.component_type !== "TEXT_ITEM").slice(0, 1) };
      if (sql.includes("from package_components where package_version_id")) return { rows: components };
      if (sql.includes("insert into r6_package_component_pricing")) { inserts.push({ sql, params }); return { rowCount: 1, rows: [] }; }
      if (sql.includes("left join r6_package_component_pricing") && sql.includes("p.package_component_id is null")) return { rows: pricing };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

test("draft pricing is restored by product identity and TEXT_ITEM order", async () => {
  const client = fakeClient({
    components: [
      { id: "new-book", component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 0 },
      { id: "new-text", component_type: "TEXT_ITEM", reference_id: null, physical_product_id: null, display_order: 1 },
    ],
  });
  const result = await restoreComponentPricing(client, "draft", [
    { component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 4, list_gross_minor: 55000, effective_sale_gross_minor: 50000, discount_minor: 5000, discount_percent_bps: 909, vat_rate_bps: 0, net_minor: 50000, vat_minor: 0, currency: "TRY" },
    { component_type: "TEXT_ITEM", display_order: 1, list_gross_minor: 0, effective_sale_gross_minor: 0, discount_minor: 0, discount_percent_bps: 0, vat_rate_bps: 0, net_minor: 0, vat_minor: 0, currency: "TRY" },
    { component_type: "PHYSICAL_PRODUCT", reference_id: "book-2", physical_product_id: "book-2", display_order: 2, list_gross_minor: 10000, effective_sale_gross_minor: 10000, discount_minor: 0, discount_percent_bps: 0, vat_rate_bps: 0, net_minor: 10000, vat_minor: 0, currency: "TRY" },
  ]);
  assert.equal(result.copied, 1);
  assert.equal(result.missing.length, 0);
  assert.equal(client.inserts.length, 1);
});

test("a new commercial component requires explicit Owner pricing", async () => {
  const client = fakeClient({
    components: [{ id: "new-book", component_type: "PHYSICAL_PRODUCT", reference_id: "book-new", physical_product_id: "book-new", display_order: 0, is_active: true }],
  });
  await assert.rejects(() => restoreComponentPricing(client, "draft", [{ source_component_id: "old-book", component_type: "PHYSICAL_PRODUCT", reference_id: "book-old", physical_product_id: "book-old", display_order: 0, list_gross_minor: 55000, effective_sale_gross_minor: 50000, discount_minor: 5000, discount_percent_bps: 909, vat_rate_bps: 0, net_minor: 50000, vat_minor: 0, currency: "TRY" }]), /COMPONENT_PRICING_REVIEW_REQUIRED/);
});

test("an empty pricing snapshot cannot save an active commercial component", async () => {
  const client = fakeClient({ components: [{ id: "new-book", component_type: "PHYSICAL_PRODUCT", is_active: true }] });
  await assert.rejects(() => restoreComponentPricing(client, "draft", []), /COMPONENT_PRICING_REVIEW_REQUIRED/);
});

test("repeated product rows do not collapse into one price target", async () => {
  const client = fakeClient({
    components: [
      { id: "a", component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 0, is_active: true },
      { id: "b", component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 1, is_active: true },
    ],
  });
  await assert.rejects(() => restoreComponentPricing(client, "draft", [{ source_component_id: "old", component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 0, list_gross_minor: 55000, effective_sale_gross_minor: 50000, discount_minor: 5000, discount_percent_bps: 909, vat_rate_bps: 0, net_minor: 50000, vat_minor: 0, currency: "TRY" }]), /COMPONENT_PRICING_REVIEW_REQUIRED/);
});

test("reordering preserves each component price by UUID", async () => {
  const client = fakeClient({
    components: [
      { id: "b", component_type: "PHYSICAL_PRODUCT", reference_id: "book-2", physical_product_id: "book-2", display_order: 0, is_active: true },
      { id: "a", component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 1, is_active: true },
    ],
  });
  await restoreComponentPricing(client, "draft", [
    { source_component_id: "a", component_type: "PHYSICAL_PRODUCT", reference_id: "book-1", physical_product_id: "book-1", display_order: 0, list_gross_minor: 55000, effective_sale_gross_minor: 50000, discount_minor: 5000, discount_percent_bps: 909, vat_rate_bps: 0, net_minor: 50000, vat_minor: 0, currency: "TRY" },
    { source_component_id: "b", component_type: "PHYSICAL_PRODUCT", reference_id: "book-2", physical_product_id: "book-2", display_order: 1, list_gross_minor: 10000, effective_sale_gross_minor: 10000, discount_minor: 0, discount_percent_bps: 0, vat_rate_bps: 2000, net_minor: 8333, vat_minor: 1667, currency: "TRY" },
  ]);
  assert.deepEqual(client.inserts.map((entry) => entry.params.slice(0, 3)), [["a", 55000, 50000], ["b", 10000, 10000]]);
});

test("pricing integrity fails closed for an active component without a price row", async () => {
  const client = fakeClient({ components: [], pricing: [{ package_component_id: "missing" }] });
  await assert.rejects(() => assertComponentPricingIntegrity(client, ["version"]), (error) => error.code === "MISSING_COMPONENT_PRICING");
});
