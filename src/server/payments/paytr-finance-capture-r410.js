import { recordPaytrFinance } from "./paytr-finance-store-r410.js";

// Uses the already authenticated status response; never makes a network call.
// Caller owns the commercial transaction and has recorded the successful attempt.
export async function capturePaytrFinance(client, {attempt, providerStatus}, recorder=recordPaytrFinance) {
  if (attempt?.environment !== "LIVE" || attempt?.status !== "SUCCEEDED" || attempt.review_required !== false || !attempt.id) return {status:"SKIPPED"};
  await client.query("savepoint r410_finance_capture");
  try {
    const result = await recorder(client,{attemptId:attempt.id,providerStatus});
    await client.query("release savepoint r410_finance_capture");
    return result;
  } catch {
    await client.query("rollback to savepoint r410_finance_capture");
    await client.query("release savepoint r410_finance_capture");
    return {status:"PENDING"};
  }
}