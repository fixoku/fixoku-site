import { useEffect, useState } from "react";
import "./installment-campaign-banner.css";

export type Campaign={text:string;active:boolean;color:"green"|"blue"|"peach"|"purple";updatedAt?:string|null};
let cached: Campaign|null|undefined;
let pending: Promise<Campaign|null>|null=null;
async function readCampaign():Promise<Campaign|null>{if(cached!==undefined)return cached;if(!pending){pending=fetch("/api/public/installment-campaign",{credentials:"same-origin",cache:"no-store"}).then(async r=>{const body:unknown=r.ok?await r.json():{};return body&&typeof body === "object" && "campaign" in body ? ((body as {campaign?:Campaign|null}).campaign||null) : null;}).then(next=>{cached=next;return next;}).catch(()=>{cached=null;return null;}).finally(()=>{pending=null;});}return pending;}
export function invalidateInstallmentCampaign(){cached=undefined;}
export default function InstallmentCampaignBanner({campaign: providedCampaign}:{campaign?:Campaign|null}={}){const [campaign,setCampaign]=useState<Campaign|null>(providedCampaign === undefined ? cached || null : providedCampaign);useEffect(()=>{if(providedCampaign !== undefined){setCampaign(providedCampaign);return undefined;}let live=true;void readCampaign().then(next=>{if(live)setCampaign(next);});return()=>{live=false;};},[providedCampaign]);if(!campaign?.active||!campaign.text)return null;return <aside className={`installment-campaign installment-campaign--${campaign.color}`} aria-label="Taksit kampanyası"><span className="installment-campaign__icon" aria-hidden="true">▣</span><span className="installment-campaign__text">{campaign.text}</span><span className="installment-campaign__note">PayTR ödeme ekranında kesin koşullar gösterilir.</span></aside>;}
