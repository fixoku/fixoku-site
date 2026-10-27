export type SmtpConfig = {
  provider: "SMTP" | "TEST";
  from: string;
  transport: Record<string, unknown>;
};
export function getSmtpConfig(env?: Record<string, string | undefined>): SmtpConfig | null;
export function sendTransactionalEmail(input: {
  kind: "reset" | "verification" | string;
  to: string;
  url?: string;
  recipientName?: string;
  applicationField?: string;
  env?: Record<string, string | undefined>;
  transportFactory?: (config: Record<string, unknown>) => { sendMail(message: Record<string, unknown>): Promise<{ messageId?: string }> };
  logger?: { info?: (...args: unknown[]) => void };
}): Promise<{ status: "SENT"; messageId: string | null }>;
export function classifyEmailError(error: unknown): { code: string; retryable: boolean };
export function processOutboxBatch(options?: Record<string, unknown>): Promise<{ status: string; processed: number }>;
