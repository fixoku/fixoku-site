export type EmailTemplate = {
  id: string;
  category: string;
  subject: string;
  title: string;
  body: string;
  marketing: boolean;
};

export type EmailIdentity = {
  address: string;
  purpose: string;
  kind: string;
  replyTo: string;
};

export type RenderedEmail = {
  templateId: string;
  category: string;
  subject: string;
  from: string;
  replyTo: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export const EMAIL_TEMPLATE_CATALOG: EmailTemplate[];
export const EMAIL_IDENTITIES: EmailIdentity[];
export const EMAIL_TEMPLATE_COUNT: number;
export function escapeHtml(value: unknown): string;
export function renderEmail(templateId: string, input?: Record<string, unknown>, options?: { baseUrl?: string; logoUrl?: string }): RenderedEmail;
export function renderEmailForEvent(eventType: string, data?: Record<string, unknown>, options?: { baseUrl?: string; logoUrl?: string }): RenderedEmail;
