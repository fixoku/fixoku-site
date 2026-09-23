/* global process */
export function invoiceRuntime(env = process.env) {
  const provider = String(env.INVOICE_PROVIDER || "DISABLED");
  return { provider, enabled: false, status: "CONFIG_REQUIRED" };
}

function unavailable() {
  const error = new Error("INVOICE_PROVIDER_CONFIG_REQUIRED");
  error.code = "INVOICE_PROVIDER_CONFIG_REQUIRED";
  error.status = 503;
  throw error;
}

export const invoiceProvider = Object.freeze({
  createInvoice: unavailable,
  cancelInvoice: unavailable,
  createReturnInvoice: unavailable,
  getInvoiceStatus: unavailable,
});
