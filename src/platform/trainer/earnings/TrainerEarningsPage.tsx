import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PanelShell } from '../../panel/layout/PanelShell';
import { TrainerIcon } from '../components/TrainerIcon';
import { TrainerPayoutAccountContent } from '../payout/TrainerPayoutAccountPage';
import './trainer-earnings.css';

type User = { id: string; name: string; email: string };
type Entry = { id: string; type: string; status: string; amountMinor: number; currency: string; description: string; occurredAt: string };
type Payload = { currency: string; summary: { earnedMinor: number; paidMinor: number; heldMinor: number; pendingMinor: number }; entries: Entry[]; payout: string };
const money = (minor: number, currency: string) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(minor / 100);
const labels: Record<string, string> = { SESSION: 'Ders / oturum', BONUS: 'Prim', ADJUSTMENT: 'Düzeltme' };
const tabs = [{ id:'kazanclarim', label:'Kazançlarım', icon:'wallet' },{ id:'odeme-hesabim', label:'Ödeme Hesabım', icon:'briefcase' }] as const;

function EarningsContent() {
 const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
 const [payload, setPayload] = useState<Payload | null>(null);
 const [filter, setFilter] = useState('ALL');
 const load = () => { setState('loading'); fetch('/api/trainer/earnings', { credentials:'same-origin' }).then(async r => { if (!r.ok) throw Error(); setPayload(await r.json()); setState('ready'); }).catch(() => setState('error')); };
 useEffect(load, []);
 if(state === 'loading') return <div className="earnings-state" role="status">Kazançlar yükleniyor…</div>;
 if(state === 'error') return <div className="earnings-state" role="alert"><h3>Kazançlar yüklenemedi</h3><button type="button" onClick={load}>Tekrar dene</button></div>;
 if(!payload) return null;
 const entries = payload.entries.filter(entry => filter === 'ALL' || entry.status === filter);
 return <><div className="earnings-summary">{[
 { label:'Toplam Hak Ediş', value:payload.summary.earnedMinor, icon:'wallet-solid', tone:'earned' },
 { label:'Ödenen Tutar', value:payload.summary.paidMinor, icon:'check-circle', tone:'paid' },
 { label:'Kalan Bakiye', value:payload.summary.pendingMinor, icon:'hourglass', tone:'pending' },
 ].map(item=><article key={item.tone} className={`earnings-${item.tone}`}><span className="earnings-summary-icon"><TrainerIcon name={item.icon as 'wallet-solid' | 'check-circle' | 'hourglass'} size={32} /></span><div><span>{item.label}</span><strong>{money(item.value,payload.currency)}</strong></div></article>)}</div><section className="earnings-card"><header className="earnings-list-heading"><h3><TrainerIcon name="wallet" size={28} />Hak Ediş Detayları</h3><select aria-label="Hak ediş durumuna göre filtrele" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Tüm Durumlar</option><option value="PAID">Ödendi</option><option value="HELD">Bekliyor</option><option value="CONFIRMED">Hak edildi</option><option value="REVERSED">İptal</option></select></header>{!entries.length ? <p className="earnings-empty">{payload.entries.length ? 'Bu durumda kazanç hareketi yok.' : 'Henüz kayıtlı bir kazanç hareketi yok.'}</p> : <div className="earnings-table-wrap"><table><thead><tr><th scope="col">Tarih</th><th scope="col">Tür</th><th scope="col">Açıklama</th><th scope="col">Durum</th><th scope="col">Tutar</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td data-label="Tarih">{new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(new Date(entry.occurredAt))}</td><td data-label="Tür">{labels[entry.type] || 'Diğer kazanç'}</td><td data-label="Açıklama">{entry.description}</td><td data-label="Durum"><span className={`earning-status ${entry.status.toLowerCase()}`}>{entry.status === 'PAID' ? 'Ödendi' : entry.status === 'HELD' ? 'Bekliyor' : entry.status === 'REVERSED' ? 'İptal' : 'Hak edildi'}</span></td><td data-label="Tutar">{money(entry.amountMinor,entry.currency)}</td></tr>)}</tbody></table></div>}<p className="earnings-footnote"><TrainerIcon name="info" size={18} />Ödeme talebi ve banka aktarımı bu fazda kullanılabilir değildir.</p></section></>;
}
export function TrainerEarningsPage({ user }: { user:User }) {
 const [params,setParams] = useSearchParams();
 const active = params.get('sekme') === 'odeme-hesabim' ? 1 : 0;
 function select(index:number, focus=false) { setParams(index ? {sekme:'odeme-hesabim'} : {}, {replace:true}); if(focus) document.getElementById(`entitlement-tab-${tabs[index].id}`)?.focus(); }
 return <PanelShell user={user}><main className="trainer-earnings-page trainer-entitlements-page"><header className="entitlements-heading"><nav className="trainer-breadcrumb" aria-label="Sayfa yolu"><Link to="/panel/egitmen">Ana Sayfa</Link><TrainerIcon name="chevron-right" size={14} /><span aria-current="page">Hakedişlerim</span></nav><h2>Hakedişlerim</h2><p>Eğitimlerinizden oluşan hak edişlerinizi bu sayfada görüntüleyebilirsiniz.</p><img src="/images/teacher-panel/banners/trainer-entitlements-hero.png" width={1196} height={268} alt="" /></header><div className="entitlements-tabs" role="tablist" aria-label="Hakediş bölümleri">{tabs.map((tab,index)=><button key={tab.id} id={`entitlement-tab-${tab.id}`} type="button" role="tab" aria-selected={active===index} aria-controls={`entitlement-panel-${tab.id}`} tabIndex={active===index ? 0 : -1} onClick={()=>select(index)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home' ? 0 : e.key==='End' ? 1 : 1-active,true);}}}><TrainerIcon name={tab.icon} size={21}/>{tab.label}</button>)}</div><section id={`entitlement-panel-${tabs[active].id}`} role="tabpanel" aria-labelledby={`entitlement-tab-${tabs[active].id}`}>{active===0 ? <EarningsContent /> : <TrainerPayoutAccountContent user={user} />}</section></main></PanelShell>;
}
