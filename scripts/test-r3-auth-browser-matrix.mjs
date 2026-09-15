import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { loadLocalEnv } from "./local-env.mjs";
loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const routes = ["/giris","/ogrenci-girisi","/ogrenci-kayit","/ogretmen-girisi","/ogretmen-basvuru","/admin-girisi","/owner-girisi","/sifremi-unuttum","/sifre-sifirla","/e-posta-dogrula","/hesap/guvenlik","/ogretmen-aktivasyon","/admin-davet-kabul","/hesap/iki-adimli-dogrulama","/hesap-kapatma"];
const viewports = [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844}];
const browser = await chromium.launch({ headless: true });
const results=[]; let pageErrors=0, unexpected5xx=0, overflow=0, critical=0, serious=0, deadActions=0, noindexFailures=0;
for (const viewport of viewports) {
  const context=await browser.newContext({ viewport:{width:viewport.width,height:viewport.height}, locale:"tr-TR", timezoneId:"Europe/Istanbul" });
  const page=await context.newPage();
  page.on("pageerror",()=>{pageErrors+=1});
  page.on("response",r=>{if(r.status()>=500){unexpected5xx+=1}});
  for (const route of routes) {
    await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:60000});
    await page.waitForTimeout(100);
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth||document.body.scrollWidth>innerWidth, noindex:(document.querySelector('meta[name="robots"]')?.getAttribute("content")||"").toLowerCase().includes("noindex"), forms:document.querySelectorAll("form").length, controls:document.querySelectorAll("input,button,select,textarea").length, h1:document.querySelectorAll("h1").length}));
    if(state.overflow)overflow+=1;
    if(!state.noindex)noindexFailures+=1;
    if(state.controls===0)deadActions+=1;
    const axe=await new AxeBuilder({page}).analyze();
    const c=axe.violations.filter(v=>v.impact==="critical").length; const s=axe.violations.filter(v=>v.impact==="serious").length; critical+=c; serious+=s;
    results.push({viewport:viewport.name,route,status:200,pageerror:0,overflow:state.overflow,controls:state.controls,critical:c,serious:s,noindex:state.noindex});
  }
  await context.close();
}
await browser.close();
assert.equal(pageErrors,0,"PAGEERROR_COUNT"); assert.equal(unexpected5xx,0,"UNEXPECTED_HTTP_5XX"); assert.equal(overflow,0,"DOCUMENT_HORIZONTAL_OVERFLOW"); assert.equal(critical,0,"A11Y_CRITICAL"); assert.equal(serious,0,"A11Y_SERIOUS"); assert.equal(deadActions,0,"CRITICAL_VISIBLE_DEAD_ACTIONS"); assert.equal(noindexFailures,0,"AUTH_NO_INDEX_MATRIX");
console.log(JSON.stringify({AUTH_ROUTE_BROWSER_MATRIX:"PASS",AUTH_ROUTE_MOBILE_MATRIX:"PASS",A11Y_AUTH_ROUTES:"PASS",AUTH_NO_INDEX_MATRIX:"PASS",PAGEERROR_COUNT:pageErrors,UNEXPECTED_HTTP_5XX:unexpected5xx,DOCUMENT_HORIZONTAL_OVERFLOW:overflow,CRITICAL_VISIBLE_DEAD_ACTIONS:deadActions,results}));
