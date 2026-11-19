import { useState } from "react";

export default function PaytrInstallmentTable({ amountMinor }) {
  const [expanded, setExpanded] = useState(false);

  const merchantId = String(
    import.meta.env.VITE_PAYTR_INSTALLMENT_MERCHANT_ID || ""
  );

  const token = String(
    import.meta.env.VITE_PAYTR_INSTALLMENT_TABLE_TOKEN || ""
  );

  const configured =
    /^[0-9]+$/.test(merchantId) &&
    /^[a-fA-F0-9]{64}$/.test(token);

  const validAmount =
    Number.isSafeInteger(amountMinor) && amountMinor > 0;

  const amount = validAmount
    ? (amountMinor / 100).toFixed(2)
    : "";

  const params = new URLSearchParams({
    token,
    merchant_id: merchantId,
    amount,
    taksit: "0",
    tumu: "0"
  });

  const widgetUrl =
    "https://www.paytr.com/odeme/taksit-tablosu/v2?" +
    params.toString().replace(/&/g, "&amp;");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;padding:8px;font-family:Arial,sans-serif;color:#17283c}
#paytr_taksit_tablosu{text-align:center;font-size:12px;max-width:1200px}
#paytr_taksit_tablosu::after{content:"";display:table;clear:both}
.taksit-tablosu-wrapper{display:inline-block;vertical-align:top;width:280px;max-width:100%;margin:5px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;text-align:center}
.taksit-logo img{max-height:28px;max-width:100%;padding-bottom:8px}
.taksit-tutari-text{float:left;width:50%;color:#64748b;margin-bottom:5px}
.taksit-tutar-wrapper{display:inline-block;width:100%;background:#f7f7f7}
.taksit-tutari{float:left;width:50%;padding:8px 0;color:#475569;border:2px solid white}
.taksit-tutari-bold{font-weight:bold}
@media(max-width:600px){.taksit-tablosu-wrapper{margin:5px 0}}
</style>
</head>
<body>
<div id="paytr_taksit_tablosu"></div>
<script src="${widgetUrl}"></script>
</body>
</html>`;

  return (
    <section
      style={{
        marginTop:20,
        border:"1px solid #e2e8f0",
        borderRadius:12,
        background:"#fff",
        overflow:"hidden"
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={()=>setExpanded(value=>!value)}
        style={{
          width:"100%",
          padding:"16px 20px",
          background:"#fff",
          color:"#17283c",
          border:0,
          textAlign:"left",
          display:"flex",
          justifyContent:"space-between",
          fontWeight:700
        }}
      >
        <span>{"Taksit Se\u00e7enekleri"}</span>
        <span aria-hidden="true">{expanded ? "\u2212" : "+"}</span>
      </button>

      {expanded && (
        <div style={{padding:12,borderTop:"1px solid #e2e8f0"}}>
          {configured && validAmount ? (
            <iframe
              key={amount}
              title={"PayTR banka ve taksit se\u00e7enekleri"}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              srcDoc={html}
              style={{width:"100%",height:620,border:0}}
            />
          ) : (
            <p role="status" style={{color:"#64748b",padding:12}}>
              {"Taksit bilgileri \u015fu anda g\u00f6r\u00fcnt\u00fclenemiyor."}
            </p>
          )}
          <p style={{fontSize:13,color:"#64748b",padding:8}}>
            {"Kesin taksit se\u00e7enekleri ve toplam tutar kart\u0131n\u0131za ve PayTR ko\u015fullar\u0131na g\u00f6re \u00f6deme formunda belirlenir."}
          </p>
        </div>
      )}
    </section>
  );
}