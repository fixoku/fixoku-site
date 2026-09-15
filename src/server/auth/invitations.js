/* global process */
import crypto from "node:crypto";
import pg from "pg";
import { auth } from "./auth.js";
import { captureTestMail } from "../domain/test-mail-sink.js";

function origin(env = process.env) { return String(env.APP_ORIGIN || "http://127.0.0.1:5173").replace(/\/$/u, ""); }
export function newInvitationToken() { return crypto.randomBytes(32).toString("base64url"); }
export function hashInvitationToken(token) { return crypto.createHash("sha256").update(String(token)).digest("hex"); }

/** Create a Better Auth password account through the in-process server handler. */
export async function createAuthAccount({ email, name, password }) {
  const response = await auth.handler(new Request("http://local/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: origin() },
    body: JSON.stringify({ name, email, password, callbackURL: "/giris" }),
  }));
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.user?.id) {
    const error = new Error("AUTH_ACCOUNT_CREATE_FAILED");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body.user;
}

export function issueInvitationMail({ kind, email, token, path }) {
  const url = `${origin()}/${path.replace(/^\//u, "")}?token=${encodeURIComponent(token)}`;
  // In test mode this remains process-local. Production delivery is delegated to
  // the configured mail transport and the URL is never returned by an API.
  captureTestMail({ kind, to: email, url });
  return url;
}

export async function withPool(callback) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try { return await callback(pool); } finally { await pool.end(); }
}

export function invitationError(error) {
  if (error?.code === "23505") return { status: 409, body: { error: "INVITATION_ALREADY_USED" } };
  if (error?.status === 409) return { status: 409, body: { error: "ACCOUNT_ALREADY_EXISTS" } };
  return { status: 400, body: { error: "INVITATION_INVALID" } };
}
