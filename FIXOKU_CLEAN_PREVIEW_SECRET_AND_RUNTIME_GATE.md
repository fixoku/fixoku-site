# FIXOKU Clean Preview — Secret ve İlk Runtime Kabul Kapısı

Tarih: 2026-10-29  
Proje: `fixoku-site`  
Project ID: `prj_yWvXfOndJ6se89FdCiPbvKIZoGwR`  
Team ID: `team_G4NbdNKM6NSdvIVMUkszTQYc`  
Hedef branch: `codex/fixoku-clean-integration-20261029`  
Hedef commit: `15d9964d7e06dcc424cec62255b430a0544d6bc5`  
Korunan R98 Preview: `codex/r97g-staging-preview-20261027` / `f1167d8b0afe8bc30da85369d277316d9ffaa3c3`  
Staging Neon: `damp-night-76577929` / `br-solitary-scene-ba3d7ejb` / `neondb` / `ep-dark-math-baw61g90`  
Production Neon: `long-mountain-95369343` (kullanılmadı)

## Karar

Secret hazırlığı ve ilk runtime kabulü bu turda hazır değildir. Neon Console’daki staging metadata ve read-only SQL parmak izi doğrulandı; fakat Vercel’e verilecek gerçek pooled/direct URI’ler kontrollü secret kanalından alınmadı ve bu URI’lerle iki ayrı Vercel-side fingerprint çalıştırılmadı. Bu nedenle `FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED=1` üretilemez veya yazılamaz.

Önceden uygulanan beş Bootstrap Config değişkeni değiştirilmedi. Bu rapor Vercel environment yazımı, deployment, Neon migration/seed veya database yazımı yapmaz.

## Sonuçlar

| Alan | Sonuç | Kanıt / sınır |
|---|---|---|
| `SECRET_SOURCE_VERIFIED` | **BLOCKED — metadata-only** | Console Connect metadata ve SQL sonucu staging hedefiyle eşleşti. URI secret’ları alınmadığı için Vercel-side secret kaynağı doğrulanmadı. |
| `POOLED_HOST_MATCH` | **PASS — Console metadata** | Pooled form, `ep-dark-math-baw61g90` endpoint ID’sinin `-pooler` varyantı olarak görüldü. Gerçek `DATABASE_URL` hostname’i parse edilmedi. |
| `DIRECT_HOST_MATCH` | **PASS — Console metadata** | Direct form aynı endpoint ID ve Neon region suffix’iyle görüldü. Gerçek `DATABASE_URL_UNPOOLED` hostname’i parse edilmedi. |
| `AUTH_SECRET_COMPATIBILITY` | **UNVERIFIED** | R98/Production secret’ı açığa çıkarılmadan uyumluluk kanıtlanamaz. Clean Preview için bağımsız, en az 32 karakterlik secret gerekir. |
| `EXACT_BRANCH_SCOPE` | **PASS** | Önceki envanterde beş Bootstrap key’i yalnız `Preview + codex/fixoku-clean-integration-20261029` kapsamındaydı. |
| `READY_FOR_SECRET_APPLY` | **NO** | URI metadata/fingerprint, bağımsız auth secret ve probe token kontrollü kaynaktan hazır değil. |
| `READY_FOR_FIRST_DEPLOYMENT` | **NO** | Deployment origin, Vercel-side fingerprint ve attestation yok. Kaynakta attestation öncesi bütün normal iş API’lerini durduran global middleware de yok. |
| `ATTESTATION_BLOCKER` | **ACTIVE** | `FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED=1` iki Vercel-side bağlantı aynı staging kimliğini ve `transaction_read_only=on` sonucunu kanıtladıktan sonra değerlendirilebilir. |

## Neon Console kanıtı

Seçili salt-okunur hedef:

- Proje: `fixoku-r97f-clean-staging-20261027`
- Project ID: `damp-night-76577929`
- Branch ID: `br-solitary-scene-ba3d7ejb`
- Database: `neondb`
- Endpoint ID: `ep-dark-math-baw61g90`
- Role: `neondb_owner`

Connect metadata pooled hostu aynı endpoint ID’nin `-pooler` biçiminde, direct hostu eki olmadan gösterdi. Tam URI, parola ve token kopyalanmadı, loglanmadı veya rapora alınmadı.

Çalıştırılan read-only transaction:

```sql
begin read only;
select current_database() AS database_name,
       current_user AS database_role,
       current_schema() AS schema_name,
       current_setting('server_version') AS postgres_version,
       current_setting('transaction_read_only') AS read_only;
rollback;
```

Gözlenen özet:

```text
database_name = neondb
database_role = neondb_owner
schema_name = public
postgres_version = 18.6 (4e5fd08)
read_only = on
```

SQL sonucu Console’da seçili project/branch/database metadata’sıyla çaprazlandı; SQL sonucu tek başına project/branch kanıtı sayılmadı. Production project `long-mountain-95369343` açılmadı ve sorgulanmadı.

Vercel-side kabul için `DATABASE_URL` pooled hostunun `ep-dark-math-baw61g90-pooler` + doğrulanmış suffix, `DATABASE_URL_UNPOOLED` direct hostunun `ep-dark-math-baw61g90` + aynı suffix olması gerekir. Her iki URI database path’i `neondb`, role’ü `neondb_owner` ile uyumlu olmalı; her iki bağlantıda `begin read only` ve fingerprint SELECT sonucu `transaction_read_only=on` vermelidir. Pooled/direct sonucu Console project/branch metadata’sıyla birlikte değerlendirilir. Production URI hiçbir aşamada kullanılmaz.

## Secret ve Config planı

| Değişken | Kaynak / sınıf | Durum | Uygulama koşulu |
|---|---|---|---|
| `DATABASE_URL` | Staging pooled URI / Secret | **BLOCKED** | Secret manager veya kontrollü prompt; dosya, manifest, CLI argümanı ve log yok. Parse + pooled fingerprint PASS. |
| `DATABASE_URL_UNPOOLED` | Staging direct URI / Secret | **BLOCKED** | Aynı güvenli kanal; direct fingerprint PASS. Migration yalnız direct staging bağlantısıyla planlanır. |
| `BETTER_AUTH_SECRET` | Clean Preview’e özel auth secret | **BLOCKED** | En az 32 karakter; R98/Production değeri kopyalanmaz. |
| `FIXOKU_CLEAN_RUNTIME_PROBE_TOKEN` | Bağımsız probe secret | **BLOCKED** | En az 32 karakter; auth secret’tan farklı; `x-fixoku-clean-runtime-token` dışında loglanmaz. |
| `FIXOKU_CLEAN_STAGING_POOLED_HOST` | Pooled URI’den türetilen Config | **BLOCKED** | URI hostname’i Console metadata ile birebir eşleşmeden girilmez. |
| `FIXOKU_CLEAN_STAGING_DIRECT_HOST` | Direct URI’den türetilen Config | **BLOCKED** | URI hostname’i Console metadata ile birebir eşleşmeden girilmez. |
| `FIXOKU_CLEAN_STAGING_ENDPOINT_METADATA_ATTESTED` | Operator attestation Config | **UNSET** | Bağımsız metadata + iki Vercel-side fingerprint PASS sonrası `1`; tahminle doldurulmaz. |
| `APP_ORIGIN` | Gerçek clean Vercel deployment origin’i | **BLOCKED** | Deployment sonrası gözlenen `VERCEL_URL` origin’i; eski R98 URL’si veya genel `*.vercel.app` izni yok. |
| `BETTER_AUTH_URL` | Aynı exact deployment origin’i | **BLOCKED** | `APP_ORIGIN` ve güncel `VERCEL_URL` origin’iyle tam eşit. |

Beş Bootstrap key’i (`FIXOKU_CLEAN_RUNTIME_EXPECTED_COMMIT_SHA`, `FIXOKU_CLEAN_RUNTIME_PROBE_ENABLED`, `FIXOKU_CLEAN_STAGING_PROJECT_ID`, `FIXOKU_CLEAN_STAGING_BRANCH_ID`, `FIXOKU_CLEAN_STAGING_DATABASE`) yeniden oluşturulmayacak veya değiştirilmeyecek.

## Kaynak guard ve auth davranışı

`src/server/auth/preview-contract.js` clean sözleşmesi:

- Branch tam olarak `codex/fixoku-clean-integration-20261029`.
- Expected SHA geçerli 40 haneli SHA ve gerçek `VERCEL_GIT_COMMIT_SHA` ile tam eşleşir.
- Eski R98 SHA’sı forbidden’dır.
- `VERCEL=1`, `VERCEL_ENV=preview` ve clean probe enabled koşulları korunur.
- Clean contract’ta legacy sabit origin yoktur; Vercel deployment host deseni zorunludur.

`src/server/auth/origin.js` ve `src/server/auth/auth.js`:

- `APP_ORIGIN` ve `BETTER_AUTH_URL` boşken, geçerli branch/SHA ve güvenilir `VERCEL_URL` varsa clean deployment origin’i güvenli biçimde türetilebilir.
- Tanımlı origin değerleri birbirine ve mevcut `VERCEL_URL` origin’ine exact eşit olmalıdır. R98 alias’ı, `staging.fixoku.com` veya rastgele Vercel hostu clean branch için reddedilir.
- `BETTER_AUTH_SECRET` yok/weak ise auth modülü fail-closed başlar; normal auth instance `twoFactor` plugin’ini korur.
- Owner-only istisnası Production’a taşınmaz ve bu hazırlıkta privileged 2FA gevşetmesi yapılmaz.

`api/internal/r97g-runtime-fingerprint.js`:

- Clean branch/SHA/origin/probe token kontrolleri geçmeden fingerprint verilmez.
- Attestation yoksa `503 RUNTIME_METADATA_UNAVAILABLE` döner.
- Legacy R98’te attestation yoksa `503 RUNTIME_METADATA_UNAVAILABLE` döner. Clean Preview’da attestation yokken yalnız exact clean SHA/origin, probe token, kaynakta sabit staging metadata ve pooled/direct URI kontrolleri geçerse `bootstrapReadOnly=true` ile salt-read fingerprint çalışır; bu sonuç iş erişimi attestation’ı değildir.
- Kaynakta normal iş API’lerinin tamamını attestation PASS olana kadar kapatan global middleware yoktur. Bu nedenle genel API izolasyonu henüz kanıtlanmış değildir; gerekirse ayrı dar kapsamlı kaynak değişikliği ve test gerekir. Fingerprint guard gevşetilmemelidir.

## Yerel test kanıtı

```text
node scripts/test-clean-preview-guard.mjs
OLD_BRANCH_GUARD=PASS
NEW_BRANCH_GUARD=PASS
AUTH_ORIGIN_NEGATIVES=PASS
SUPER_ADMIN_2FA=PASS

node scripts/test-r97g-runtime-fingerprint.mjs
R97G16_RUNTIME_FINGERPRINT_TEST=PASS
```

Bu testler kaynak sözleşmesini ve sahte pool factory akışını doğrular; gerçek Vercel deployment’ı, Vercel secret’larını veya Neon endpoint erişimini doğrulamaz.

## İlk kontrollü runtime kabul sırası

1. Neon Console Connect panelinden pooled/direct URI’leri secret manager’a veya görünür olmayan kontrollü prompt’a alın. URI, parola ve token dosyaya, manifest’e, CLI argümanına, Git’e veya log’a konmaz.
2. URI’leri yalnız scheme/host/port/database path/role metadata’sı için parse edin; production project/host görülürse durun.
3. Pooled/direct host Config’lerini yalnız URI parse sonucu Console metadata ile tam eşleşirse hazır kabul edin.
4. Exact branch env inventory’sini salt okunur tekrar doğrulayın; mevcut exact key varsa overwrite etmeyin.
5. Ayrı yetkili onayla yalnız PostDeploy secret apply çalıştırın; secret’ları stdin/prompt/manager’dan alın ve yazdırmayın.
6. Ayrı deployment yetkisi sonrasında project/team, branch, `VERCEL_GIT_COMMIT_SHA=15d9964d…`, `VERCEL_ENV=preview`, `VERCEL_URL` ve deployment hostu salt okunur doğrulayın.
7. `APP_ORIGIN` ve `BETTER_AUTH_URL` yalnız gözlenen clean deployment origin’ine exact eşit olabilir.
8. Probe endpoint’e yalnız clean probe header’ı ile POST edin; pooled/direct sonuçlarını Console metadata’sıyla çaprazlayın.
9. İki fingerprint PASS olmadan attestation `1` yazmayın. Herhangi bir uyumsuzlukta durun.
10. Attestation PASS ve API izolasyonu planı gözden geçirildikten sonra, ayrı migration onayıyla staging backup alın ve migration’ı yalnız direct staging bağlantısıyla çalıştırın. Production/R98 kullanılmaz.

## NEXT_AUTHORIZED_ACTION

Gereken sonraki ayrı onay, **PostDeploy secret apply için kontrollü secret girişidir**. Bu onay olmadan Vercel’e database URL’leri, auth/probe secret’ları veya host metadata’sı yazılmamalıdır. Onay sonrasında da apply şu kanıtlar olmadan fail-closed durmalıdır:

- Pooled/direct URI’ler doğrulanmış staging Connect panelinden alınmış; gerçek host/path/role metadata’sı maskeli olarak doğrulanmış olmalı.
- İki Vercel-side read-only fingerprint aynı staging project/branch/database ile eşleşmiş olmalı.
- Attestation `1` yalnız bu bağımsız kanıttan sonra değerlendirilmeli.
- Clean deployment origin’i gözlenmiş ve auth origin exact eşleşmesi sağlanmış olmalı.
- R98 branch ve Production scope değişmemiş olmalı.

Güvenli mevcut sonuç: **secret apply beklemede, ilk deployment beklemede, attestation beklemede**. Console düzeyinde doğru staging hedefi doğrulanmıştır; Vercel runtime’ın gerçekten aynı pooled/direct hedefi kullandığı henüz doğrulanmamıştır.

## Güvenli Preview açılış düzeltmesi — 2026-10-29 devamı

Kaynakta önceki durumun önemli sınırı doğrulandı: fingerprint endpoint’inin `503 RUNTIME_METADATA_UNAVAILABLE` yanıtı yalnızca fingerprint isteğini durduruyordu. Vercel/Vite tarafında bütün API fonksiyonlarını saran genel bir middleware veya dispatcher yoktu. Secret’lar kurulmuş olsaydı bazı normal auth ve iş rotaları fingerprint attestation’ından bağımsız çalışabilirdi.

Bu nedenle yalnız clean Preview sözleşmesine bağlı, fail-closed bir iş erişim kapısı eklendi:

- `src/server/auth/preview-contract.js` clean Preview’ın exact deployment hostu, expected SHA’sı, probe flag’i ve exact staging metadata attestation’ını birlikte kontrol ediyor.
- `isCleanPreviewBusinessAccessBlocked()` yalnız `VERCEL=1`, `VERCEL_ENV=preview` ve clean branch için aktiftir. R98 branch ve Production bu kapıyı kullanmaz.
- Attestation eksik, `0`, yanlış project/branch/database/host, yanlış SHA veya güvenilmeyen/missing `VERCEL_URL` olduğunda `cleanPreviewGateResponse()` `503 CLEAN_PREVIEW_RUNTIME_UNVERIFIED` döndürür.
- `resolvePrincipal`, `requireSession`, `requireMembership`, `requirePermission` ve `requirePackagePermission` bu durumda veri/iş erişimini fail-closed keser. Principal kullanan route’lar authenticated iş akışına ulaşamaz.
- Doğrudan mutasyon sınırları da aynı kapıya bağlandı: account lifecycle, Better Auth/Owner 2FA, invitation/candidate activation, commerce dev settlement/webhook, PayTR callback, kurum başvurusu ve contact SMTP.
- Fingerprint endpoint’i bu helper’a bağlanmadı. `api/internal/r97g-runtime-fingerprint.js` metadata ve pooled/direct read-only fingerprint için bağımsız kalır.
- Public öğrenci katalog projection’ı ve benzeri saf read-only yollar bu kapının veri değiştirmeyen istisnalarıdır; ticari işlem, hesap oluşturma, oturum/2FA, ödeme, webhook, mail veya veri değişikliği yolu değildir.

### Gate test kanıtı

```text
node scripts/test-clean-preview-business-gate.mjs
CLEAN_MISSING_ATTESTATION=BLOCKED
CLEAN_METADATA_MISMATCHES=BLOCKED
CLEAN_VERIFIED_GATE=PASS
LEGACY_R98_UNCHANGED=PASS
PRODUCTION_UNCHANGED=PASS
FINGERPRINT_PATH_UNBLOCKED=PASS

node scripts/test-clean-preview-route-gate.mjs
DIRECT_MUTATION_ROUTES_GATED=13
PRINCIPAL_ROUTES_INVENTORIED=92
FINGERPRINT_ROUTE_SEPARATE=PASS
```

Önceki guard, runtime fingerprint, lint ve platform typecheck sonuçları da geçerlidir:

```text
OLD_BRANCH_GUARD=PASS
NEW_BRANCH_GUARD=PASS
AUTH_ORIGIN_NEGATIVES=PASS
SUPER_ADMIN_2FA=PASS
R97G16_RUNTIME_FINGERPRINT_TEST=PASS
lint=PASS
typecheck:platform=PASS
build=PASS
```

`NEW_SHA` kaynağa göre `15d9964d7e06dcc424cec62255b430a0544d6bc5` olarak doğrulandı. Legacy R98 contract’ı clean SHA’yı forbidden kabul etmeye devam eder; clean contract hedef SHA’yı kabul eder.

### Güncel kararlar

- **Runtime güvenlik kontrolü: PASS_WITH_GUARD** — Clean Preview attestation olmadan normal authenticated iş ve mutasyon yolları `503` ile durur; fingerprint sağlık yolu açık kalır. Bu kaynak kontrolü gerçek Vercel runtime gözleminin yerine geçmez.
- **Vercel secret uygulamasına hazır mı: HAYIR** — Gerçek pooled/direct URI’ler ve bağımsız auth/probe secret’ları güvenli kanaldan hazır değil; attestation yazılamaz.
- **Gerekli kullanıcı etkileşimi/yetki:** Neon Connect panelinden URI’lerin kontrollü secret girişine alınması; değerlerin host/path/role metadata’sının maskeli doğrulanması; iki Vercel-side read-only fingerprint sonucunun gözlenmesi; sonra ayrı PostDeploy `-Apply` ve ayrıca deployment yetkisi.
- **İlk güvenli Preview deployment koşulu:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, bağımsız `BETTER_AUTH_SECRET`, bağımsız probe token ve host metadata’sı exact clean branch scope’unda hazır olmalı; deployment branch/SHA/`VERCEL_URL` salt okunur doğrulanmalı; fingerprint PASS olmadan attestation `1` yazılmamalı; başlangıçta provider değerleri disabled/test olmalı.
- **Gerçek deployment öncesi kalan engeller:** Vercel-side pooled/direct fingerprint yok; deployment origin yok; `APP_ORIGIN`/`BETTER_AUTH_URL` için gözlenmiş exact origin yok; attestation yok; migration için staging backup/direct-only uygulama onayı yok.

Bu düzeltme yerel izole çalışma ağacında hazırlanmıştır. GitHub push, Vercel env/deployment, Neon migration/seed ve provider işlemleri yapılmamıştır.

## Push sonrası bootstrap notu — 2026-10-29

Clean branch remote’u artık `60f6d96fc72afc5579b6fe537a21096f5befe23d` değerindedir. Mevcut 28 değişkenlik manifest ve apply script’i önceki remote SHA olan `15d9964d7e06dcc424cec62255b430a0544d6bc5` değerini taşımaya devam eder; Vercel’deki mevcut değişken bu turda değiştirilmemiştir. Yeni env/apply aşamasından önce expected SHA’nın yeni remote değerine güncellenmesi zorunludur.

Attestation’sız clean bootstrap fingerprint yolu yerel takip adayı olarak eklendi ve şu koşullarla test edildi:

- Clean branch ve expected SHA `60f6d96fc72afc5579b6fe537a21096f5befe23d`.
- Güvenilir clean Vercel deployment hostu ve clean probe token.
- Exact staging project/branch/database/pooled/direct host metadata.
- Pooled ve direct URI üzerinde yalnız `begin read only` + fingerprint SELECT + `rollback`.
- Yanıt `metadataAttested=false`, `bootstrapReadOnly=true`; business access gate yine kapalı.

Bu takip adayı henüz remote branch’e push edilmedi. Gerçek yeni Preview’ın bootstrap fingerprint’e ulaşması için takip adayının ayrıca gözden geçirilip non-force push edilmesi gerekir. Orijinal müfredat, video, ortak beş PDF ve yedi PNG rozet için salt-okunur medya envanteri/dry-run sonraki paralel aşamadır; bu görevde R2 upload yapılmadı.
