import type { ReactNode } from "react";

export type CatalogIconKindV40 = "package" | "book" | "software" | "individual" | "group" | "content" | "eye" | "school" | "spark" | "growth" | "crown" | "search" | "plus" | "image" | "check" | "grid";

const paths: Record<CatalogIconKindV40, ReactNode> = {
  package: <><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
  book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21V4.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M8 6h8M8 10h7"/></>,
  software: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 9l2 2-2 2M12 13h4"/></>,
  individual: <><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
  group: <><circle cx="9" cy="8" r="3"/><circle cx="18" cy="9" r="2.4"/><path d="M2.5 20v-1.3a6.5 6.5 0 0 1 13 0V20M16 15.5a5 5 0 0 1 5.5 4.5"/></>,
  content: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  school: <><path d="m2 9 10-6 10 6-10 6L2 9Z"/><path d="M6 12v5c3.5 3 8.5 3 12 0v-5M22 9v7"/></>,
  spark: <><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></>,
  growth: <><path d="M4 20V13M10 20V9M16 20V5M22 20V3"/><path d="m3 9 6-4 5 2 6-5"/></>,
  crown: <><path d="m2 7 5 5 5-8 5 8 5-5-2 13H4L2 7Z"/><path d="M6 16h12"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  image: <><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 18 6-6 4 3 3-4 5 7"/></>,
  check: <><path d="m4 12 5 5L20 6"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
};
export function FixokuCatalogIconV40({kind, size=24, className=""}:{kind:CatalogIconKindV40;size?:number;className?:string}){
  return <svg className={className} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}
export function catalogVisualKindV40(title:string, productType?:string, serviceMode?:string):CatalogIconKindV40 {
  if(productType==="PHYSICAL")return "book";
  if(productType==="SOFTWARE"||productType==="DIGITAL")return "software";
  if(productType==="SERVICE")return serviceMode==="GROUP"||/grup/i.test(title)?"group":"individual";
  if(/platinum|premium/i.test(title))return /premium/i.test(title)?"crown":"school";
  if(/yapay zek|akıllı sistem|dijital/i.test(title))return "software";
  if(/gelişim|paragraf/i.test(title))return "growth";
  return "book";
}
