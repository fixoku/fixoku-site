# Controlled first-owner bootstrap

Owner creation is intentionally operator-run and has no public signup endpoint.
Set `FIXOKU_OWNER_BOOTSTRAP=1`, `FIXOKU_OWNER_BOOTSTRAP_CONFIRM=I_UNDERSTAND`,
`FIXOKU_OWNER_BOOTSTRAP_EMAIL`, `FIXOKU_OWNER_BOOTSTRAP_PASSWORD` (minimum 12
characters), and optionally `FIXOKU_OWNER_BOOTSTRAP_NAME`, then run:

```powershell
node scripts/bootstrap-owner.mjs
```

The command refuses to run when an active Owner already exists, when the email
is already registered, or when either explicit guard is absent. Credentials are
read in process memory and are never printed or persisted by the script.
