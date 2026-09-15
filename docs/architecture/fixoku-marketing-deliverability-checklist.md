# Fixoku marketing, email and deliverability readiness

## Mail identities and routing

Human inboxes: `destek@`, `egitmen@`, `muhasebe@`, `kvkk@`.
Operational aliases: `bildirim@` (transactional, Reply-To destek@), `siparis@`
(orders/shipment, Reply-To destek@), `kampanya@` (marketing only).
Aliases/shared mailboxes are sufficient; seven paid mailboxes are not required.

Transactional and marketing streams are separate. Marketing unsubscribe never
suppresses password reset, security, order, shipment or requested service mail.

## DNS and transport checklist

- SPF authorizes the actual sender provider and is aligned with the envelope sender.
- DKIM is enabled with provider-managed selector and alignment verified.
- DMARC starts at `p=none` while SPF/DKIM alignment is monitored, then enforces
  `quarantine`/`reject` only after aggregate and forensic review.
- TLS, MX, Return-Path alignment (where supported), PTR/rDNS ownership and
  Google Postmaster Tools are verified in production.
- Marketing messages include `List-Unsubscribe`, `List-Unsubscribe-Post` with
  one-click unsubscribe, visible unsubscribe and preference management.
- Bounce and complaint suppression plus IYS export/import boundaries are durable.

Zero spam probability is not claimed. Production values remain `LEGAL_VALUE_REQUIRED`
or configuration-required until the domain/provider is selected.
