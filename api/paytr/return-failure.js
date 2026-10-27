/** PayTR browser redirect. NEVER a payment settlement authority. */
const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Ödeme işlemi tamamlanamadı | Fixoku</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f5f8fc;color:#17334f;margin:0;padding:40px 18px}main{max-width:600px;background:white;border-radius:18px;margin:8vh auto;padding:32px;box-shadow:0 10px 35px #182d4b12}h1{font-size:1.65rem}p{line-height:1.6}a{color:#0667bc;font-weight:600}</style></head>
<body><main><h1>Ödeme işlemi tamamlanamadı</h1>
<p>Ödeme işlemi iptal edilmiş veya işlem sırasında bir sorun oluşmuş olabilir. Kesin ödeme durumu PayTR bildirimiyle güncellenir.</p>
<p>Hesabınızdaki sipariş durumunu kontrol edip gerekirse tekrar deneyebilirsiniz.</p><p><a href="/panel">Fixoku hesabıma dön</a></p></main></body></html>`;
export default function handler(req, res) {
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  if(req.method!=='GET' && req.method!=='HEAD') {res.statusCode=405;res.setHeader('Allow','GET, HEAD'); return res.end('METHOD_NOT_ALLOWED');}
  res.statusCode=200;
  return res.end(req.method==='HEAD' ? '' : html);
}