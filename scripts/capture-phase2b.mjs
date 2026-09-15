import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const origin=process.env.APP_ORIGIN; const out=process.env.VISUAL_OUT; if(!origin)throw new Error("APP_ORIGIN_REQUIRED");
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
async function session(email,name,paths){const ctx=await browser.newContext({locale:"tr-TR",timezoneId:"Europe/Istanbul"});const page=await ctx.newPage();const resp=await page.request.post(`${origin}/api/auth/sign-in/email`,{headers:{origin},data:{email,password:process.env.TEST_SEED_PASSWORD}});if(!resp.ok())throw Error(`${email} login ${resp.status()}`);const setCookie=resp.headers()["set-cookie"]||"";const token=setCookie.match(/better-auth\.session_token=([^;]+)/)?.[1];if(token)await ctx.addCookies([{name:"better-auth.session_token",value:decodeURIComponent(token),domain:"127.0.0.1",path:"/"}]);await page.goto(`${origin}${paths[0]}`,{waitUntil:"domcontentloaded",timeout:60000});for(const [i,path] of paths.entries()){if(i)await page.goto(`${origin}${path}`,{waitUntil:"domcontentloaded",timeout:60000});await page.waitForTimeout(500);await page.screenshot({path:`${out}/${name}-${i===0?"desktop":"mobile"}.png`,fullPage:true});}await ctx.close()}
async function mobileSession(role,name,path){const ctx=await browser.newContext({locale:"tr-TR",timezoneId:"Europe/Istanbul",viewport:{width:390,height:844}});const page=await ctx.newPage();await page.goto(`${origin}/giris`,{waitUntil:"domcontentloaded",timeout:60000});await page.getByRole("button",{name:role==="SUPER_ADMIN"?"Super Admin olarak test et":role==="GUARDIAN"?"Veli olarak test et":"Öğrenci olarak test et"}).click();await page.waitForURL(`**${path}`,{timeout:60000});await page.waitForTimeout(500);await page.screenshot({path:`${out}/${name}-mobile.png`,fullPage:true});await ctx.close()}
async function desktopSession(role,name,path){const ctx=await browser.newContext({locale:"tr-TR",timezoneId:"Europe/Istanbul",viewport:{width:1440,height:900}});const page=await ctx.newPage();await page.goto(`${origin}/giris`,{waitUntil:"domcontentloaded",timeout:60000});await page.getByRole("button",{name:role==="SUPER_ADMIN"?"Super Admin olarak test et":role==="GUARDIAN"?"Veli olarak test et":"Öğrenci olarak test et"}).click();await page.waitForURL(`**${path}`,{timeout:60000});await page.waitForTimeout(500);await page.screenshot({path:`${out}/${name}-desktop.png`,fullPage:true});await ctx.close()}
await mobileSession("STUDENT","student-packages","/panel/ogrenci/paketler");
await mobileSession("GUARDIAN","guardian-packages","/panel/ogrenci/paketler");
await mobileSession("SUPER_ADMIN","admin-assignments","/panel/admin/atamalar");
await desktopSession("STUDENT","student-packages","/panel/ogrenci/paketler");
await desktopSession("GUARDIAN","guardian-packages","/panel/ogrenci/paketler");
await desktopSession("SUPER_ADMIN","admin-overview","/panel/admin");
await desktopSession("SUPER_ADMIN","admin-assignments","/panel/admin/atamalar");
await browser.close();
