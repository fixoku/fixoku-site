import assert from "node:assert/strict";
import { replaceStructuredComponents } from "../api/admin/student-commerce-packages.js";

const productId = "11111111-1111-4111-8111-111111111111";
const referencedId = "22222222-2222-4222-8222-222222222222";
const sqlLog = [];
const client = {
  async query(sql) {
    sqlLog.push(String(sql));
    if (String(sql).includes("from physical_products")) return { rows: [{ id: productId, sku: "BOOK-1", title: "Test kitap", productType: "PHYSICAL", r6ProductType: "BOOK", isActive: true, stageScopes: [] }] };
    if (String(sql).includes("from package_components pc")) return { rows: [{ id: referencedId, component_type: "PHYSICAL_PRODUCT", physical_product_id: productId, reference_id: productId, display_order: 0, hasPricingReference: true, hasOrderReference: false, hasFamilyReference: false }] };
    return { rows: [] };
  },
};

await replaceStructuredComponents(client, "33333333-3333-4333-8333-333333333333", [
  { componentType: "TEXT_ITEM", title: "Kalıcı içerik", isActive: true },
  { componentType: "PHYSICAL_PRODUCT", productId, quantity: 1, isActive: true },
], "PRIMARY");

assert.equal(sqlLog.some((sql) => /delete\s+from\s+package_components/iu.test(sql)), false);
assert.equal(sqlLog.some((sql) => /hasPricingReference/iu.test(sql)), true);
assert.equal(sqlLog.some((sql) => /insert\s+into\s+package_components/iu.test(sql)), true);
assert.equal(sqlLog.some((sql) => /set\s+is_active=false/iu.test(sql)), true);
console.log(JSON.stringify({ REFERENCED_COMPONENT_PRESERVED: "PASS_SOURCE_CONTRACT", NO_RESTRICTING_DELETE: "PASS", DB_WRITE: "NO" }));
