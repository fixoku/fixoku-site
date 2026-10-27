import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { AdminDataTable, type AdminTableFeatures } from "./AdminDataTable";
import "./admin-panel.css";

type Payment = { id:string; orderId:string; createdAt:string; status:string; provider:string|null; paymentMethod:"PAYTR"|"BANK_TRANSFER"|null; providerReference:string|null; amountMinor:number; currency:string; buyerName:string; buyerEmail:string; latestTransactionType:string|null; latestTransactionStatus:string|null; latestTransactionOccurredAt:string|null; transactionCount:number };
type Response = { payments:Payment[]; pagination:{page:number;pageSize:number;total:number;pageCount:number} };
type StudentTransfer = { orderId:string; createdAt:string; orderStatus:string; paymentStatus:string; currency:string; totalMinor:number; buyerName:string; buyerEmail:string; beneficiaryName:string; reference:string; items:Array<{title:string;quantity:number}> };
const statusLabels:Record<string,string>={CREATED:"Oluşturuldu",PENDING:"Bekliyor",AUTHORIZED:"Yetkilendirildi",SUCCEEDED:"Başarılı",FAILED:"Başarısız",CANCELLED:"İptal edildi",PARTIALLY_REFUNDED:"Kısmen iade edildi",REFUNDED:"İade edildi"};
const transactionLabels:Record<string,string>={AUTHORIZATION:"Yetkilendirme",CAPTURE:"Tahsilat",SETTLEMENT:"Mutabakat",REFUND:"İade",VOID:"İptal"};
const transactionStatusLabels:Record<string,string>={PENDING:"Bekliyor",SUCCEEDED:"Başarılı",FAILED:"Başarısız",CANCELLED:"İptal edildi"};
const money=(amount:number,currency:string)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency}).format(amount/100);
async function loadPayments(params:URLSearchParams){const response=await fetch(`/api/admin/payments?${params}`,{credentials:"same-origin",cache:"no-store"});if(!response.ok)throw new Error("Ödemeler okunamadı.");return response.json() as Promise<Response>;}
async function loadStudentTransfers(){const response=await fetch("/api/admin/student-bank-transfers",{credentials:"same-origin",cache:"no-store"});if(!response.ok)throw new Error("Öğrenci havale kuyruğu okunamadı.");return response.json() as Promise<{transfers:StudentTransfer[]}>;}
async function reviewStudentTransfer(input:{orderId:string;action:"APPROVE"|"REJECT"}){const response=await fetch("/api/admin/student-bank-transfers",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(input)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||"Ödeme incelemesi başarısız.");return body;}

export function AdminPaymentsPage(){
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("");
  const [paymentMethod,setPaymentMethod]=useState("");
  const [page,setPage]=useState(1);
  const [sorting,setSorting]=useState<SortingState>([{id:"createdAt",desc:true}]);

  const params=useMemo(()=>{const value=new URLSearchParams({page:String(page),pageSize:"20",sort:sorting[0]?.id||"createdAt",direction:sorting[0]?.desc===false?"asc":"desc"});if(search.trim())value.set("search",search.trim());if(status)value.set("status",status);if(paymentMethod)value.set("paymentMethod",paymentMethod);return value;},[page,paymentMethod,search,sorting,status]);
  const query=useQuery({queryKey:["admin-payments",params.toString()],queryFn:()=>loadPayments(params),placeholderData:keepPreviousData});
  const transferQuery=useQuery({queryKey:["admin-student-bank-transfers"],queryFn:loadStudentTransfers});
  const reviewMutation=useMutation({mutationFn:reviewStudentTransfer,onSuccess:()=>{void transferQuery.refetch();void query.refetch();}});
  const rows=query.data?.payments||[];
  const pageTotal=rows.reduce((sum,item)=>sum+item.amountMinor,0);
  const pageCurrencies=Array.from(new Set(rows.map(item=>item.currency)));
  const pageSucceeded=rows.filter(item=>item.status==="SUCCEEDED").length;
  const pagePending=rows.filter(item=>item.status==="PENDING"||item.status==="CREATED"||item.status==="AUTHORIZED").length;

  const columns=useMemo<ColumnDef<AdminTableFeatures,Payment,any>[]>(()=>[
    {accessorKey:"id",header:"Ödeme",enableSorting:false,cell:({row})=><><strong>#{row.original.id.slice(0,8)}</strong><small>{row.original.transactionCount} işlem</small></>},
    {accessorKey:"createdAt",header:"Tarih",cell:({getValue})=>new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(getValue()))},
    {accessorKey:"orderId",header:"Sipariş",enableSorting:false,cell:({getValue})=><Link to={`/panel/admin/siparisler?search=${String(getValue())}`}>#{String(getValue()).slice(0,8)}</Link>},
    {accessorKey:"buyerName",header:"Müşteri",enableSorting:false,cell:({row})=><>{row.original.buyerName}<small>{row.original.buyerEmail}</small></>},
    {accessorKey:"paymentMethod",header:"Ödeme Yöntemi",enableSorting:false,cell:({getValue})=>getValue()==="PAYTR"?"PayTR":getValue()==="BANK_TRANSFER"?"Havale / EFT":"Belirlenmedi"},
    {accessorKey:"amountMinor",header:"Tutar",cell:({row})=>money(row.original.amountMinor,row.original.currency)},
    {accessorKey:"latestTransactionType",header:"Son İşlem",enableSorting:false,cell:({row})=>row.original.latestTransactionType?`${transactionLabels[row.original.latestTransactionType]||row.original.latestTransactionType} · ${transactionStatusLabels[row.original.latestTransactionStatus||""]||row.original.latestTransactionStatus||""}`:"Henüz yok"},
    {accessorKey:"status",header:"Durum",cell:({getValue})=><span className="admin-status">{statusLabels[getValue()]||getValue()}</span>}
  ],[]);

  return <main className="platform-foundation-panel admin-panel admin-orders-page payments-pro">
    <header className="admin-pro-header"><div><span className="admin-eyebrow">SATIŞLAR</span><h1>Ödemeler</h1><p>Para hareketini takip edin. Ürünün ne olduğu <strong>Siparişler</strong> ekranında, tahsilatın durumu ise burada yönetilir.</p></div><Link className="admin-secondary-link" to="/panel/admin/siparisler">Siparişlere git</Link></header>

    <section className="admin-kpi-grid">
      <article><span>Toplam kayıt</span><strong>{query.data?.pagination.total ?? "—"}</strong><small>Filtre kapsamındaki ödeme</small></article>
      <article><span>Bu sayfada başarılı</span><strong>{pageSucceeded}</strong><small>Yalnız görünen 20 kayıt içinde</small></article>
      <article><span>Bu sayfada bekleyen</span><strong>{pagePending}</strong><small>Oluşturuldu/bekliyor/yetkilendirildi</small></article>
      <article><span>Bu sayfa tutarı</span><strong>{rows.length ? pageCurrencies.length===1 ? money(pageTotal,pageCurrencies[0]) : "Çoklu para birimi" : "—"}</strong><small>Yalnız görüntülenen kayıtlar</small></article>
    </section>

    <section className="panel-card" aria-labelledby="student-bank-transfer-title">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">OWNER ONAYI</span><h2 id="student-bank-transfer-title">Öğrenci havale / EFT kuyruğu</h2></div><span className="admin-section-meta">Onaylanmadan eğitim hakkı açılmaz</span></div>
      {transferQuery.isError&&<div className="admin-callout is-danger" role="alert"><p>Öğrenci havale kuyruğu yüklenemedi.</p><button type="button" onClick={()=>void transferQuery.refetch()}>Yenile</button></div>}
      {!transferQuery.isError&&!transferQuery.isLoading&&!transferQuery.data?.transfers?.length&&<p className="admin-empty-state">Onay bekleyen öğrenci havalesi bulunmuyor.</p>}
      {!!transferQuery.data?.transfers?.length&&<div className="admin-table-wrap"><table><thead><tr><th>Sipariş</th><th>Öğrenci / alıcı</th><th>Paket</th><th>Tutar</th><th>Referans</th><th>İşlem</th></tr></thead><tbody>{transferQuery.data.transfers.map((row)=><tr key={row.orderId}><td><strong>#{row.orderId.slice(0,8)}</strong><small>{new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(row.createdAt))}</small></td><td><strong>{row.buyerName}</strong><small>{row.buyerEmail} · {row.beneficiaryName}</small></td><td>{row.items.map((item)=>`${item.title} × ${item.quantity}`).join(", ")}</td><td>{money(row.totalMinor,row.currency)}</td><td><code>{row.reference}</code></td><td><div className="admin-pro-header-actions"><button type="button" className="admin-secondary-button" disabled={reviewMutation.isPending} onClick={()=>void reviewMutation.mutate({orderId:row.orderId,action:"APPROVE"})}>Onayla</button><button type="button" className="admin-text-button" disabled={reviewMutation.isPending} onClick={()=>void reviewMutation.mutate({orderId:row.orderId,action:"REJECT"})}>Reddet</button></div></td></tr>)}</tbody></table></div>}
      {reviewMutation.isError&&<p className="admin-callout is-danger" role="alert">{String((reviewMutation.error as Error)?.message||"Ödeme incelemesi başarısız.")}</p>}
      {reviewMutation.isSuccess&&<p className="admin-callout" role="status">Ödeme incelemesi kaydedildi; liste yenilendi.</p>}
    </section>

    <section className="panel-card">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">KAYITLAR</span><h2>Ödeme hareketleri</h2></div><span className="admin-section-meta">Siparişten ayrı finansal kayıt</span></div>
      <div className="admin-order-filters"><label>Ara<input type="search" value={search} maxLength={100} placeholder="Ödeme, sipariş veya müşteri ara" onChange={(event)=>{setSearch(event.target.value);setPage(1)}} /></label><label>Durum<select value={status} onChange={(event)=>{setStatus(event.target.value);setPage(1)}}><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Ödeme yöntemi<select value={paymentMethod} onChange={(event)=>{setPaymentMethod(event.target.value);setPage(1)}}><option value="">Tümü</option><option value="PAYTR">PayTR</option><option value="BANK_TRANSFER">Havale / EFT</option></select></label><button type="button" onClick={()=>void query.refetch()} disabled={query.isFetching}>Yenile</button></div>
      {query.isError?<div className="admin-callout is-danger" role="alert"><p>Ödemeler yüklenemedi.</p><button type="button" onClick={()=>void query.refetch()}>Yenile</button></div>:<AdminDataTable columns={columns} data={rows} sorting={sorting} onSortingChange={(value)=>{setSorting(value);setPage(1)}} loading={query.isLoading} emptyMessage="Arama ölçütlerine uygun ödeme bulunamadı." />}
      {query.data&&<div className="admin-table-pagination"><span>Toplam {query.data.pagination.total} ödeme</span><button type="button" disabled={page<=1||query.isFetching} onClick={()=>setPage((value)=>value-1)}>Önceki</button><span>{page} / {Math.max(1,query.data.pagination.pageCount)}</span><button type="button" disabled={page>=query.data.pagination.pageCount||query.isFetching} onClick={()=>setPage((value)=>value+1)}>Sonraki</button></div>}
    </section>
  </main>;
}
