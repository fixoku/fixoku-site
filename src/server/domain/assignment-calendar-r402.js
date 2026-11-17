export function istanbulDay(value = new Date()) {
  const d=new Date(value); if(!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}
export function calendarLimit(day){
  const [y,m,d]=day.split("-").map(Number);
  const next=new Date(Date.UTC(y,m,1));
  const last=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();
  next.setUTCDate(Math.min(d,last)); return next.toISOString().slice(0,10);
}
export function permittedStart(value,now=new Date()){
  if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
  const date=new Date(value);const day=istanbulDay(date),today=istanbulDay(now);
  if(!day||!today||day<today||day>calendarLimit(today))return null;
  return date;
}
