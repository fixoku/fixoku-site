# Panel 003E frontend/backend parity

FRONTEND_BACKEND_PARITY=PASS (internal controls and persistence closures implemented; authenticated runtime gates remain environment-dependent)

Each user-facing operation below has a routed API, a visible control, and a persistence or server-derived readback path. Provider-dependent work remains explicitly disabled until credentials are configured.

| FEATURE | ROLE | BACKEND_API | FRONTEND_ROUTE | CONTROL | CREATE | READ | UPDATE | STATE_CHANGE | BROWSER_TEST | NO_DEAD_BUTTONS |
|---|---|---|---|---|---|---|---|---|---|---|
| Trainer profile and photo | TRAINER | `/api/trainer/profile` | `/panel/egitmen/profil` | Profile form, file picker, remove, save | yes | yes | yes | photo replace/remove | PASS — local DB/browser | PASS |
| Trainer availability | TRAINER | `/api/trainer/availability` | `/panel/egitmen/musaitlik` | Add slot | yes | yes | cancel/state | yes | PASS — existing phase test | PASS |
| Trainer progress/completion | TRAINER | `/api/trainer/progress`, `/api/trainer/completions` | student detail | progress/completion forms | yes | yes | yes | completion | PASS — browser | PASS |
| Trainer payout account | TRAINER | `/api/trainer/payout-account` | `/panel/egitmen/payout-hesabim` | IBAN form/save | yes | yes | yes | configured state | PASS — local DB/browser | PASS |
| Trainer earnings/history | TRAINER | `/api/trainer/earnings` | `/panel/egitmen/bakiyem` | filtered read table | n/a | yes | n/a | paid/read-only state | PASS — local DB/browser | PASS |
| Student profile | STUDENT | `/api/student/profile` | `/panel/ogrenci/profil` | profile form/save | yes | yes | yes | profile status | PASS — local DB/browser | PASS |
| Student packages/entitlements | STUDENT/GUARDIAN | `/api/student/packages`, `/api/student/entitlements` | `/panel/ogrenci/paketler` | package/order controls | order route | yes | n/a | entitlement state | existing routed test | PASS |
| Student shipments | STUDENT/GUARDIAN | `/api/student/shipments` | `/panel/ogrenci/kargolar` | shipment status/read | n/a | yes | n/a | carrier status read | PASS — browser | PASS |
| Admin trainer qualification | OWNER/ADMIN | `/api/admin/trainers` | `/panel/admin/egitmenler` | grant/suspend/revoke form | yes | yes | yes | qualification state | existing security test | PASS |
| Admin assignments/reassignment | OWNER/ADMIN | `/api/admin/assignment-requests` | `/panel/admin/atamalar` | candidate filters + assign | yes | yes | yes | assign/reassign | existing routed test | PASS |
| Admin products/inventory | OWNER/ADMIN | `/api/admin/products`, `/api/admin/inventory` | `/panel/admin/urunler` | product and movement forms | yes | yes | yes | stock movement | PASS — browser | PASS |
| Admin shipments | OWNER/ADMIN | `/api/admin/shipments` | `/panel/admin/kargo` | transition buttons | n/a | yes | n/a | lifecycle transitions | PASS — browser | PASS |
| Owner finance metrics and advanced filters | OWNER | `/api/owner/finance` | `/panel/owner` | date/package/trainer/currency filters, metrics and package profitability table | n/a | yes | n/a | URL-backed server-derived financial state | PASS — 003F bundled-runtime browser acceptance | PASS |
| Owner finance adjustment and filtered CSV | OWNER | `POST /api/owner/finance`, `GET /api/owner/finance?format=csv` | `/panel/owner` | append-only adjustment, CSV export preserving active filters | yes | yes | append-only | ledger entry/export | PASS — 003F bundled-runtime browser acceptance | PASS |
| Owner trainer payout | OWNER | `/api/owner/payouts` | owner operations route | payout form | yes | yes | append-only | paid state | PASS — browser | PASS |
| Digital delivery | STUDENT | `/api/student/downloads/:id` | package download controls | entitlement-checked download | n/a | yes | n/a | download audit | PASS — delivery contract | PASS |
| External provider health | OWNER/SUPER_ADMIN | `GET /api/provider-status` | `/panel/admin/saglayicilar`, `/panel/owner/saglayicilar` | safe Email/Storage/Shipping status cards | n/a | yes | n/a | configuration health | PASS — redacted local runtime/API contract | PASS |
| Notification center and read state | OWNER/ADMIN/TRAINER/STUDENT/GUARDIAN | `GET/PATCH/POST /api/notifications` | `/panel/bildirimler` (alias `/panel/notifications`) | notification list, open, mark one/all read | n/a | yes | read state | unread count/read timestamp | PASS — 003F bundled-runtime browser acceptance | PASS |

The 003D local acceptance run exercised the representative routes against the shadow database at desktop and mobile viewports. Provider-disabled states remain explanatory and do not expose a false success path.
