import { ShipmentCardR408 } from "../../commerce/ShipmentCardR408";
import { useEffect, useState } from "react";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon } from "../components/TrainerIcon";
import "../../student/student-portal.css";

export function TrainerShipmentsPage({ user }: { user: { name: string; email?: string } }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { let active = true; fetch("/api/trainer/shipments", { credentials: "same-origin", cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { if (active) { setRows(Array.isArray(data.shipments) ? data.shipments : []); setState("ready"); } }).catch(() => { if (active) setState("error"); }); return () => { active = false; }; }, []);
  return <PanelShell user={user} role="TRAINER"><main className="platform-foundation-panel"><div className="student-portal__hero"><div><h1>Kargolarım</h1><p>Fiziksel ürün içeren eğitmen siparişlerinin teslimat durumunu görün.</p></div></div>{state === "loading" && <div role="status">Kargolar yükleniyor…</div>}{state === "error" && <div role="alert">Kargo bilgileri yüklenemedi.</div>}{state === "ready" && (!rows.length ? <div className="student-portal__state trainer-shipments-empty" role="status"><TrainerIcon name="package" size={52} /><h3>Henüz kargonuz bulunmuyor</h3><p>Siparişleriniz kargoya verildiğinde gönderi ve takip bilgilerinizi buradan görüntüleyebilirsiniz.</p></div> : <section className="student-shipment-list" aria-label="Eğitmen kargo gönderileri">{rows.map(row => <ShipmentCardR408 key={row.id} row={row}/>)}</section>)}</main></PanelShell>;
}
