/* global process */
import crypto from "node:crypto";
import pg from "pg";
import { auth } from "./auth.js";
import { captureTestMail } from "../domain/test-mail-sink.js";
import { requireApplicationOrigin } from "./origin.js";

function origin(env = process.env) { return requireApplicationOrigin(env); }
export function newInvitationToken() { return crypto.randomBytes(32).toString("base64url"); }
export function hashInvitationToken(token) { return crypto.createHash("sha256").update(String(token)).digest("hex"); }

/** Invitation authority is checked by the caller before this server API call. */
export async function createAuthAccount({ email, name, password }) {
  let body;
  try {
    body = await auth.api.signUpEmail({ body: { name, email, password, callbackURL: "/giris" } });
  } catch (cause) {
    const error = new Error("AUTH_ACCOUNT_CREATE_FAILED");
    error.status = cause.statusCode || 503;
    throw error;
  }
  if (!body?.user?.id) throw new Error("AUTH_ACCOUNT_CREATE_FAILED");
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
