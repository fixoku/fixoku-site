# Panel 003B source adoption record

This record is the source-first decision log for `FIXOKU_PANEL_003B_SOURCE_FIRST_OWNER_TRAINER_FULFILLMENT_EARNINGS`. The implementation reuses the existing Fixoku platform authority wherever it already provides the required boundary. New tables and handlers are limited to Fixoku-specific gaps and remain local-only; PayTR and all payment-provider runtime work are frozen.

| SUBSYSTEM | SOURCE | OFFICIAL_URL_OR_REPOSITORY | VERSION_OR_COMMIT | LICENSE | MATURITY | ADOPTION_MODE | WHAT_IS_REUSED | WHAT_IS_FIXOKU_SPECIFIC | CUSTOM_REASON |
|---|---|---|---|---|---|---|---|---|---|
| Auth, role and permission authority | Existing Fixoku Better Auth + PostgreSQL membership/RBAC | `better-auth.com`, local `src/server/auth/authorization.js` | Better Auth 1.7.3; existing source at task HEAD | MIT | maintained, already deployed in this codebase | EXISTING_FIXOKU | sessions, memberships, scope validation, fail-closed permission checks | OWNER business role and finance permission split | Existing authority is the only trusted identity boundary; adding a parallel auth system would weaken ownership checks. |
| Database migrations and transactions | Drizzle ORM/Kit and PostgreSQL | https://orm.drizzle.team/docs/migrations ; https://www.postgresql.org/docs/current/tutorial-transactions.html | Drizzle ORM 0.45.2, Kit 0.31.10 | Apache-2.0 / PostgreSQL license | maintained | EXISTING_FIXOKU | migration journal, SQL replay, transactions, advisory locks, integer columns and constraints | domain tables and invariants unique to Fixoku | The clean shadow ledger is the canonical local authority. |
| Package/order/entitlement/assignment | Existing Fixoku Phase 2B source | local `src/server/domain/commerce.js`, `drizzle/migrations/0015..0017` | HEAD 99f0534 plus uncommitted Phase 2B work | project source | current task authority | EXISTING_FIXOKU | published package snapshots, beneficiary scoping, idempotent orders, entitlement materialization, admin trainer selection | mixed product component, fulfillment and completion extensions | Reusing these paths preserves proven student/guardian and admin boundaries. |
| Inventory and fulfillment concepts | Medusa documentation used as architecture reference | https://docs.medusajs.com/resources/commerce-modules/inventory ; https://github.com/medusajs/medusa | current documentation reviewed 2026-09-12 | MIT | mature, active project | REFERENCE_ONLY | movement/event model, stock location, reservation and fulfillment concepts | Fixoku tables and Turkish lifecycle labels | Installing a complete commerce platform would add runtime and ownership cost; only the small domain concepts are needed. |
| Shipping provider boundary | ShipEntegra official API documentation | https://developers.shipentegra.com/ | current public API documentation reviewed 2026-09-12 | provider terms; no SDK copied | established Turkish aggregator | REFERENCE_ONLY | shipment creation, label, tracking/event and rate boundary requirements | credential-free disabled adapter contract | Credentials and production calls are intentionally absent, so no provider is coupled into local authority. |
| Secure digital downloads | OWASP File Upload and authorization guidance | https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | current guidance reviewed 2026-09-12 | CC-BY-SA guidance | maintained | REFERENCE_ONLY | entitlement check, short-lived server authorization, download audit, fail-closed revocation | Fixoku entitlement/file/version/download tables and route | No existing download authority exists; a small server-side boundary is required. |
| Notifications and email | Existing Fixoku nodemailer/mail-sink boundary; Novu documentation | local `nodemailer` dependency and mail sink; https://docs.novu.co/ | Nodemailer 9.0.3; Novu docs reviewed 2026-09-12 | MIT | maintained | EXISTING_FIXOKU / REFERENCE_ONLY | local event/audit and email transport seam | durable panel notification rows and event creation | Adding Novu would introduce a service and secrets without reducing this phase's small event persistence gap. |
| Append-only finance and payout principles | ERPNext documentation, source inspected as GPL reference only | https://docs.frappe.io/erpnext/user/manual/en/accounts | current docs reviewed 2026-09-12 | GPLv3 | mature | REFERENCE_ONLY | journal/reversal/source-document principles | Fixoku operational finance and payout register tables | GPL code is not copied; statutory accounting and e-invoice providers are out of scope. |
| Trainer qualification provenance and completion | Existing Fixoku membership, assignment and earning ledger; PostgreSQL transaction/idempotency patterns | local `src/server/auth/authorization.js`, `api/admin/assignment-requests/[id].js`, PostgreSQL docs | task HEAD plus migration 0018 | project source / PostgreSQL | current local authority | EXISTING_FIXOKU + CUSTOM_REQUIRED | scoped roles, advisory locks, append-only audit events and integer minor units | OWNER role, qualification source/history, completion event and deterministic earning key | These are Fixoku-specific authorization and compensation invariants; no external platform is introduced. |

## Large custom subsystem gate

READY_SOURCE_FOUND=YES (existing Fixoku auth, migration, commerce and mail seams; official shipping/download guidance; Medusa/ERPNext architecture references)

OFFICIAL_SOURCE_CHECKED=YES

MATURE_OSS_CHECKED=YES

LICENSE=MIT/Apache-2.0/BSD preferred; GPL/AGPL/SSPL sources are reference-only and no code is copied.

WHY_REUSE_NOT_POSSIBLE=The requested OWNER authority, qualification provenance, Turkish fulfillment lifecycle, beneficiary-scoped downloads, compensation snapshot and completion-to-earning rule are Fixoku business invariants absent from the existing source. A complete ERP/commerce/notification platform would add more runtime and operational authority than it removes.

PAYMENT_DECISION=PAYTR remains reserved for the final phase. No provider SDK, card collection, webhook settlement or payment runtime was added in 003B.

## Final source-reuse accounting

The count below treats the ten table rows above as the major subsystem inventory. Mixed rows are counted by their primary implementation mode; the notes preserve secondary reference use. This avoids claiming a synthetic line-count percentage for code that shares authority boundaries.

TOTAL_MAJOR_SUBSYSTEMS=10
EXISTING_FIXOKU_REUSED=4 (auth/RBAC, migrations, package/order/entitlement/assignment, notification/mail seam)
OFFICIAL_API_SDK_USED=0 (official ShipEntegra API researched; no credentials or SDK integrated)
OPEN_SOURCE_DIRECTLY_INTEGRATED=0
OPEN_SOURCE_ADAPTED=0
REFERENCE_ONLY=4 (Medusa inventory/fulfillment concepts, ShipEntegra API contract, OWASP download guidance, ERPNext ledger principles)
CUSTOM_FIXOKU_SPECIFIC=2 (owner/trainer authority and fulfillment/download/finance domain gaps)
ESTIMATED_REUSE_RATIO=NOT_CALCULATED (subsystems share code and reference guidance; a percentage would be invented)
ESTIMATED_CUSTOM_RATIO=NOT_CALCULATED (same accounting boundary)

## 003C source verification

| SUBSYSTEM | SOURCE / SDK | VERSION | LICENSE | ADOPTION_MODE | DECISION |
|---|---|---|---|---|---|
| DIGITAL_STORAGE | AWS SDK for JavaScript v3 `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` official documentation | current v3 line reviewed 2026-09-12 | Apache-2.0 | REFERENCE_ONLY | No S3-compatible bucket, endpoint, or credentials are configured in Fixoku. The current route keeps authorization and audit server-side and returns no permanent URL. Installing an SDK without a configured storage authority would add dormant infrastructure. |
| EMAIL | Existing Fixoku Nodemailer transport and `notification_email_outbox` | Nodemailer 9.0.3 | MIT | EXISTING_FIXOKU | Reuse the existing Nodemailer dependency and outbox. A worker will claim rows with a lease, retry metadata, and fail-closed transport configuration; no credentials are committed. |
| MONEY | Existing integer minor-unit columns and `Intl.NumberFormat` display | project implementation; Dinero.js evaluation completed 2026-09-12 | existing source; Dinero.js MIT | EXISTING_FIXOKU | Dinero.js would not remove durable business rules because all persisted amounts are already integer minor units. No new money package is installed. |
| SHIPPING | ShipEntegra official developer documentation; direct Yurtiçi, Aras, MNG, Sürat and PTT public API suitability review | current public docs reviewed 2026-09-12 | provider terms | REFERENCE_ONLY | Provider-neutral adapter remains disabled until a contracted provider, sandbox credentials, and endpoint authority are supplied. No random GitHub SDK is copied and no production-success response is fabricated. |
| INVENTORY | Existing Fixoku `physical_products` + append-only `inventory_movements`; Medusa inventory concepts | local 003B schema; Medusa current docs | project source / MIT reference | EXISTING_FIXOKU + REFERENCE_ONLY | Movement history, reservations and underflow checks remain Fixoku authority. Medusa is architectural reference only; no platform install or code copy. |

003C_IMPLEMENTATION_NOTES=Digital delivery now uses a private LOCAL storage boundary only when DIGITAL_STORAGE_PROVIDER=LOCAL and DIGITAL_STORAGE_ROOT is explicitly configured. The S3 v3 packages remain REFERENCE_ONLY because no compatible bucket, endpoint, credentials, or installed SDK exists in this checkout; runtime reports S3_RUNTIME_NOT_CONFIGURED. Nodemailer 9.0.3 is directly reused by the outbox worker with SKIP LOCKED claiming, PROCESSING lease recovery, retryable/permanent classification, bounded exponential backoff, provider message id, and dedupe preservation. No permanent URL is stored or returned. Download count increments only after a private file is present and uses a conditional limit update to prevent concurrent overrun.
SHIPPING_ADAPTER_003C=src/server/shipping/adapter.js exposes quote/createShipment/createLabel/getTracking/cancelShipment with timeout and credential gate. ShipEntegra endpoint paths/auth were not verifiable because developers.shipentegra.com failed DNS/outbound HTTPS in this environment; adapter is a contract stub only, no live or sandbox call was made, and SHIPPING_PROVIDER_RUNTIME remains DISABLED_CONFIG_REQUIRED.

## 004A provider runtime foundation

EMAIL_RUNTIME_004A=Existing Nodemailer outbox worker retained. `EMAIL_PROVIDER=TEST` / `EMAIL_TEST_MODE=1` uses Nodemailer's stream transport for local/sandbox acceptance; SMTP remains configuration-gated. Claim leases, retries, dedupe keys, provider message id, last error and sent timestamps remain in `notification_email_outbox`.
DIGITAL_STORAGE_RUNTIME_004A=Existing private LOCAL stream boundary retained for development when `DIGITAL_STORAGE_ROOT` is explicit. Local storage is forbidden in production; S3 configuration is validated but remains `S3_RUNTIME_NOT_CONFIGURED` / SDK-gated because no approved SDK, bucket, endpoint or credentials are present.
SHIPPING_RUNTIME_004A=Existing provider-neutral ShipEntegra adapter retained with options-aware token/base URL validation, timeout and normalized methods. No provider-specific payloads or credentials are persisted; missing configuration remains `DISABLED_CONFIG_REQUIRED`.
PROVIDER_HEALTH_004A=`GET /api/provider-status` and Owner/Admin status routes expose only safe configured/configuration-required states. Student and trainer principals are denied infrastructure visibility.
