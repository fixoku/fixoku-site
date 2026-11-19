import crypto from "node:crypto";

/** Local-only provider double. It never opens a network connection. */
export function createMockShippingProvider(options = {}) {
  const calls = { create: 0, track: 0, cancel: 0, barcode: 0 };
  const records = new Map();
  const behavior = options.behavior || {};
  const provider = {
    runtime: { provider: "MOCK", enabled: true, status: "LOCAL_MOCK" },
    calls,
    records,
    async createShipment(input) {
      calls.create += 1;
      if (behavior.createError) throw Object.assign(new Error(behavior.createError), { code: behavior.createError });
      const referenceNo = String(input.referenceNo);
      const existing = records.get(referenceNo);
      if (existing) return existing;
      const trackingNumber = `MOCK-${crypto.createHash("sha256").update(referenceNo).digest("hex").slice(0, 12).toUpperCase()}`;
      const result = { provider: "MOCK", providerReference: `mock:${referenceNo}`, trackingNumber, trackingUrl: `https://sube.kolaygelsin.com/takip?mock=${encodeURIComponent(referenceNo)}`, barcode: btoa(`MOCK:${referenceNo}`) };
      records.set(referenceNo, { ...result, state: 102, State: 102, StateText: "Gönderi Oluşturuldu", ReferenceNo: referenceNo, TrackingNumber: trackingNumber });
      return result;
    },
    async getTracking(referenceNo) {
      calls.track += 1;
      if (behavior.trackError) throw Object.assign(new Error(behavior.trackError), { code: behavior.trackError });
      const key = String(referenceNo).replace(/^mock:/u, "");
      const row = records.get(key) || [...records.values()].find(candidate => candidate.trackingNumber === key || candidate.providerReference === referenceNo);
      if (!row) throw Object.assign(new Error("MOCK_NOT_FOUND"), { code: "MOCK_NOT_FOUND", status: 404 });
      return row;
    },
    async cancelShipment(referenceNo) {
      calls.cancel += 1;
      if (behavior.cancelError) throw Object.assign(new Error(behavior.cancelError), { code: behavior.cancelError });
      const key = String(referenceNo).replace(/^mock:/u, "");
      const row = records.get(key) || [...records.values()].find(candidate => candidate.trackingNumber === key || candidate.providerReference === referenceNo);
      if (!row) return { cancelled: false };
      if (row.state >= 138) return { cancelled: false };
      records.set(key, { ...row, state: 133, State: 133, StateText: "İptal Gönderi" });
      return { cancelled: true };
    },
    async createLabel(referenceNo) {
      calls.barcode += 1;
      const key = String(referenceNo).replace(/^mock:/u, "");
      const row = records.get(key);
      if (!row) throw Object.assign(new Error("MOCK_NOT_FOUND"), { code: "MOCK_NOT_FOUND", status: 404 });
      return { Barcode: row.barcode, BarcodeNumbers: row.trackingNumber };
    },
  };
  return Object.freeze(provider);
}
