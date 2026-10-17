import { useEffect, useMemo, useRef, useState } from "react";

const commerceTrainerPhotoV20=(name:string)=>{
  const key=name.trim().toLocaleLowerCase("tr-TR");
  if(key==="elif usta") return "/images/profiles/elif.jpg";
  if(key==="özlem kaplan") return "/images/profiles/ozlem.jpg";
  return "";
};import { PanelIcon } from "../panel/components/PanelIcon";
import "./admin-panel.css";
import { TrainerQualificationBadgeR5 } from "../../shared/FixokuTrainerBadgeR5"; // FIXOKU_TRAINER_BADGES_R5

type Entitlement = {
  id: string;
  trainerUserId: string;
  packageId: string;
  trainerName: string;
  title: string;
  packageVersionId: string;
  status: string;
  source: string;
  effectiveAt: string;
  historicalPurchaseAt?: string | null;
  note?: string | null;
  revokeReason: string | null;
};

type Trainer = { id: string; name: string };
type Choice = { packageId: string; packageVersionId: string; title: string; qualifications?: Array<{qualificationId:string;code:string;title:string}> };
type ExpertiseV29 = { trainerUserId:string; qualificationId:string; status:string; source:string; sourceRef?:string; code:string; title:string };

type PurchaseItem = {
  packageId: string;
  packageVersionId: string;
  title: string;
  lineTotalMinor: number;
  quantity: number;
};

type Purchase = {
  id: string;
  status: string;
  paymentMethod: "PAYTR" | "BANK_TRANSFER";
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  createdAt: string;
  completedAt?: string | null;
  trainerUserId: string;
  trainerName: string;
  trainerEmail: string;
  items: PurchaseItem[];
  transferStatus?: string | null;
  bankName?: string | null;
  reportedAmountMinor?: number | null;
  reference?: string | null;
  transferDate?: string | null;
  submittedAt?: string | null;
  reviewNote?: string | null;
};

type AssignmentResult = {
  packageVersionId: string;
  title: string;
  ok: boolean;
  message: string;
};

const money = (minor: number | null | undefined, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: /^[A-Z]{3}$/u.test(currency) ? currency : "TRY",
  }).format(Number(minor || 0) / 100);

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const sourceLabel = (value: string) =>
  value === "PAYMENT"
    ? "Satın alma"
    : value === "LEGACY_PURCHASE"
      ? "Eski sistem satın alımı"
      : value === "MANUAL_GIFT"
        ? "Owner özel erişimi"
        : value;

const purchaseStatusLabel = (purchase: Purchase) => {
  if (purchase.status === "PAID") return "Ödeme tamamlandı";
  if (purchase.status === "REJECTED") return "Ödeme reddedildi";
  if (purchase.status === "CANCELLED") return "İptal edildi";
  if (purchase.status === "REFUNDED") return "İade edildi";
  if (purchase.paymentMethod === "BANK_TRANSFER") return "Ödeme bekleniyor";
  return "PayTR ödeme bekleniyor";
};

const purchaseStatusClass = (purchase: Purchase) => {
  if (purchase.status === "PAID") return "is-success";
  if (["REJECTED", "CANCELLED", "REFUNDED"].includes(purchase.status)) return "is-danger";
  return "is-warning";
};

const errorLabel = (value: string) =>
  ({
    DUPLICATE_ENTITLEMENT: "Bu eğitim erişimi zaten aktif.",
    PACKAGE_UNAVAILABLE: "Eğitim yayında değil veya kullanılamıyor.",
    TRAINER_NOT_FOUND: "Eğitmen bulunamadı.",
    ASSIGNMENT_TARGET_INVALID: "Eğitmen veya eğitim seçimi geçersiz.",
    BANK_TRANSFER_AMOUNT_MISMATCH: "Bildirilen tutar beklenen ödeme ile eşleşmiyor.",
    BANK_TRANSFER_NOT_FOUND: "Bu sipariş için havale bildirimi bulunamadı.",
    NETWORK_ERROR: "Bağlantı kurulamadı; yeniden deneyin.",
  })[value] || "İşlem tamamlanamadı.";

const isSalesSet = (title: string) => /\bSET\b/iu.test(title);

/* OWNER_ACCESS_REDESIGN_V31B */
type TrainerQualificationSymbolV29="speed"|"flow"|"focus"|"paragraph"|"understand"|"coach"|"exam";

const trainerQualificationSymbolV29=(title:string):TrainerQualificationSymbolV29=>{
  const key=title.toLocaleLowerCase("tr-TR");
  if(key.includes("hızlı"))return "speed";
  if(key.includes("akıcı"))return "flow";
  if(key.includes("dikkat"))return "focus";
  if(key.includes("paragraf"))return "paragraph";
  if(key.includes("anlama")||key.includes("kitap")||key.includes("dijital"))return "understand";
  if(key.includes("koç")||key.includes("usta"))return "coach";
  return "exam";
};

function TrainerQualificationSvgV29({title}:{title:string}){
  const symbol=trainerQualificationSymbolV29(title);
  const common={width:24,height:24,viewBox:"0 0 26 26",fill:"none",xmlns:"http://www.w3.org/2000/svg","aria-hidden":true} as const;
  if(symbol==="speed")return <svg {...common}><path d="M4 15a9 9 0 1 1 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 14l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="13" cy="14" r="2" fill="currentColor"/></svg>;
  if(symbol==="flow")return <svg {...common}><path d="M4 8h12M4 13h18M4 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m18 6 4 2-4 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>;
  if(symbol==="focus")return <svg {...common}><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="2"/><circle cx="13" cy="13" r="3" fill="currentColor"/><path d="M13 2v3M13 21v3M2 13h3M21 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
  if(symbol==="paragraph")return <svg {...common}><path d="M7 5h12M7 10h12M7 15h8M7 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="4" cy="5" r="1.3" fill="currentColor"/><circle cx="4" cy="10" r="1.3" fill="currentColor"/><circle cx="4" cy="15" r="1.3" fill="currentColor"/><circle cx="4" cy="20" r="1.3" fill="currentColor"/></svg>;
  if(symbol==="understand")return <svg {...common}><path d="M5 7.5C7.5 5 10 4 13 4s5.5 1 8 3.5V20c-2.5-1.6-5-2.4-8-2.4S7.5 18.4 5 20V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M13 4v13.5" stroke="currentColor" strokeWidth="2"/></svg>;
  if(symbol==="coach")return <svg {...common}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/><path d="M4 21c.5-5 2.5-7 5-7s4.5 2 5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m17 10 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg {...common}><path d="M5 5h16v16H5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 10h8M9 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m15 18 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}


/* FIXOKU_OWNER_HIDE_EMPTY_AND_PASTEL_ICONS_V37B */
const trainerEducationVisualKeyV37 = (title: string) => {
  const key = title.toLocaleLowerCase("tr-TR");
  if (key.includes("ilkokul")) return "primary-kids";
  if (key.includes("ortaokul") && key.includes("paragraf")) return "middle-paragraph";
  if (key.includes("ortaokul")) return "middle-reading";
  if (key.includes("lise") && key.includes("paragraf")) return "high-paragraph";
  if (key.includes("lise")) return "high-reading";
  if (key.includes("yetişkin")) return "adult-reading";
  if (key.includes("akıcı")) return "flow-reading";
  if (key.includes("paragraf")) return "paragraph";
  if (key.includes("kitap") || key.includes("dijital")) return "digital-book";
  if (key.includes("eğitmen destekli")) return "guided-reading";
  if (key.includes("usta") || key.includes("yetkinlik")) return "mentor";
  if (key.includes("dikkat") || key.includes("odak")) return "focus-practice";
  if (key.includes("anlama") || key.includes("yorumlama")) return "comprehension";
  if (key.includes("koç") || key.includes("rehber")) return "coaching";
  if (key.includes("sınav") || key.includes("strateji")) return "exam-strategy";
  return "general";
};

function TrainerEducationSvgV37({ title }: { title: string }) {
  const kind = trainerEducationVisualKeyV37(title);
  const common = {
    width: 30,
    height: 30,
    viewBox: "0 0 32 32",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    "aria-hidden": true,
  } as const;

  const tile = (bg: string, color: string, body: any) => (
    <svg {...common}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="10" fill={bg} />
      <g stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {body}
      </g>
    </svg>
  );

  if (kind === "primary-kids") {
    return tile("#FFF3D9", "#D69717", <>
      <path d="M8 22V11.7c0-1 .8-1.7 1.7-1.7H22" />
      <path d="M10.4 10h9.9c1 0 1.7.8 1.7 1.7V22" />
      <path d="M11 14h8" />
      <path d="M11 17.5h6.2" />
      <path d="M24.5 7.5v3" />
      <path d="M23 9h3" />
    </>);
  }
  if (kind === "middle-paragraph") {
    return tile("#F4E8FF", "#8C57D8", <>
      <path d="M9 9.5h13" />
      <path d="M9 14h13" />
      <path d="M9 18.5h9.5" />
      <path d="M9 23h11.2" />
      <circle cx="6" cy="9.5" r="1.2" fill="#8C57D8" stroke="none" />
      <circle cx="6" cy="14" r="1.2" fill="#8C57D8" stroke="none" />
      <circle cx="6" cy="18.5" r="1.2" fill="#8C57D8" stroke="none" />
      <circle cx="6" cy="23" r="1.2" fill="#8C57D8" stroke="none" />
    </>);
  }
  if (kind === "middle-reading") {
    return tile("#E8F7EE", "#2FAF6B", <>
      <path d="M7.5 18a8.5 8.5 0 0 1 17 0" />
      <path d="M16 17.5l4.8-4.8" />
      <circle cx="16" cy="17.5" r="1.8" fill="#2FAF6B" stroke="none" />
      <path d="M9 24h14" />
    </>);
  }
  if (kind === "high-paragraph") {
    return tile("#E8F2FF", "#4E7EDB", <>
      <path d="M8 23.2V10.2" />
      <path d="M12 23.2V10.2" />
      <path d="M8 10.2h9.5a4 4 0 0 1 0 8H12" />
      <path d="M20.2 8.4 23 5.6" />
      <path d="M21.8 10.5h3" />
    </>);
  }
  if (kind === "high-reading") {
    return tile("#E8F8FF", "#2998C5", <>
      <path d="M8.5 22.5 13 10.2l4.2 6 2.8-3.7 3.4 10" />
      <path d="M8 24h16" />
      <path d="M13.2 10.2h3.1" />
    </>);
  }
  if (kind === "adult-reading") {
    return tile("#FFF0E7", "#D97A3C", <>
      <path d="M10 23V11.5c0-.9.7-1.5 1.5-1.5H20" />
      <path d="M12.5 10h7.8c.9 0 1.7.8 1.7 1.7V23" />
      <path d="M12.8 14.3h6.8" />
      <path d="M12.8 17.8h5.5" />
      <path d="M7.5 20.5v-7" />
      <path d="M7.5 13.5h3" />
    </>);
  }
  if (kind === "flow-reading") {
    return tile("#FFF6DB", "#D6A300", <>
      <path d="M7 12h11" />
      <path d="M7 17h15" />
      <path d="M7 22h10" />
      <path d="m17 10 4 2-4 2" />
      <path d="m19 15 4 2-4 2" />
    </>);
  }
  if (kind === "paragraph") {
    return tile("#F4F0FF", "#7A63D1", <>
      <path d="M10 9h10.5" />
      <path d="M10 13.5h10.5" />
      <path d="M10 18h7.6" />
      <path d="M10 22.5h9.2" />
      <path d="M6.6 8.7v14" />
      <path d="M5 8.7h3.2" />
    </>);
  }
  if (kind === "digital-book") {
    return tile("#E8FBF6", "#1FAE8A", <>
      <rect x="8.5" y="7.8" width="15" height="16.4" rx="2.8" />
      <path d="M12.2 11.5h7.6" />
      <path d="M12.2 15.5h7.6" />
      <path d="M12.2 19.5h4.8" />
      <path d="M10 26h12" />
    </>);
  }
  if (kind === "guided-reading") {
    return tile("#FFF1F7", "#D56A95", <>
      <circle cx="11" cy="12" r="2.4" />
      <circle cx="20.2" cy="10.8" r="2" />
      <path d="M7.8 21c.6-3.4 2.2-5 4.4-5s3.8 1.6 4.4 5" />
      <path d="M17.8 21c.3-2.4 1.4-3.8 3.1-4.1" />
      <path d="M17.4 15.2h6" />
    </>);
  }
  if (kind === "mentor") {
    return tile("#FDEFD9", "#C98A11", <>
      <path d="M16 7.8 18.1 12l4.6.7-3.3 3.2.8 4.5L16 18.2l-4.2 2.2.8-4.5-3.3-3.2 4.6-.7Z" />
      <path d="M10.4 23.2h11.2" />
    </>);
  }
  if (kind === "focus-practice") {
    return tile("#FFECEF", "#CF597F", <>
      <circle cx="16" cy="16" r="8" />
      <circle cx="16" cy="16" r="3.3" />
      <path d="M16 4v4M16 24v4M4 16h4M24 16h4" />
    </>);
  }
  if (kind === "comprehension") {
    return tile("#E8F6FF", "#268BBF", <>
      <path d="M7 10.5c2.7-1.5 5.8-1.8 9-.5v13c-3.2-1.3-6.3-1-9 .5Z" />
      <path d="M16 10c3.2-1.3 6.3-1 9 .5v13c-2.7-1.5-5.8-1.8-9-.5Z" />
      <path d="m12 16 2 2 4-4" />
    </>);
  }
  if (kind === "coaching") {
    return tile("#F0E9FF", "#9164D0", <>
      <circle cx="13" cy="11" r="3" />
      <path d="M7 24c.4-5.4 2.4-8 6-8 3 0 4.8 2 5.5 6" />
      <path d="m19 13 2.2 2.2 4.5-5" />
    </>);
  }
  if (kind === "exam-strategy") {
    return tile("#FFF3DE", "#B87B16", <>
      <rect x="9" y="7" width="14" height="18" rx="2" />
      <path d="M12 12h7M12 16h7M12 20h4" />
      <path d="m18.5 22 1.5 1.5 3-3" />
    </>);
  }
  return tile("#EEF2FF", "#5C78D8", <>
    <path d="M9 22V10.8c0-.9.7-1.6 1.6-1.6H22" />
    <path d="M11.2 9.2h9.3c1 0 1.8.8 1.8 1.8V22" />
    <path d="M12.2 13h7.2" />
    <path d="M12.2 16.8h5.8" />
    <path d="m18.8 22.2 1.9 1.9 3.8-4.2" />
  </>);
}
export function AdminTrainerCommercePage() {
  const [activeTab, setActiveTab] = useState<"purchases" | "manual">(()=>new URLSearchParams(window.location.search).get("section")==="manual"?"manual":"purchases");
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [expertiseV29,setExpertiseV29]=useState<ExpertiseV29[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseFilter, setPurchaseFilter] = useState<"ALL" | "WAITING" | "PAID">("ALL");

  const [trainerUserId, setTrainerUserId] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [selectedPackageVersionIds, setSelectedPackageVersionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const assignmentSubmittingRef = useRef(false);
  const [assignmentResults, setAssignmentResults] = useState<AssignmentResult[]>([]);
  /* FIXOKU_OWNER_COMPACT_V40: UI-only modal selection; existing audited API handlers are preserved. */
  const [ownerModeV40,setOwnerModeV40]=useState<"grant"|"revoke">("grant");
  const [ownerModalV40,setOwnerModalV40]=useState<null|"grant"|"revoke">(null);


  const load = async () => {
    setLoading(true);
    try {
      const [entitlementResponse, purchaseResponse] = await Promise.all([
        fetch("/api/admin/trainer-entitlements", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/admin/trainer-bank-transfers", { credentials: "same-origin", cache: "no-store" }),
      ]);

      if (!entitlementResponse.ok || !purchaseResponse.ok) {
        throw new Error("LOAD_FAILED");
      }

      const entitlementBody = await entitlementResponse.json();
      const purchaseBody = await purchaseResponse.json();

      setEntitlements(Array.isArray(entitlementBody?.entitlements) ? entitlementBody.entitlements : []);
      setTrainers(Array.isArray(entitlementBody?.trainers) ? entitlementBody.trainers : []);
      setChoices(Array.isArray(entitlementBody?.packages) ? entitlementBody.packages : []);
      setExpertiseV29(Array.isArray(entitlementBody?.expertise) ? entitlementBody.expertise : []);
      setPurchases(Array.isArray(purchaseBody?.purchases) ? purchaseBody.purchases : []);
    } catch {
      setMessage("Eğitmen satın alma ve erişim bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get("trainer")||"";
    if(requested&&trainers.some(item=>item.id===requested)){
      setTrainerUserId(requested);
    }
  },[trainers]); // TRAINER_QUERY_AUTOSELECT_V29

  const activeEntitlementKeys = useMemo(
    () =>
      new Set(
        entitlements
          .filter((item) => item.status === "ACTIVE")
          .map((item) => `${item.trainerUserId}:${item.packageId}`),
      ),
    [entitlements],
  );

  const manualChoices = useMemo(
    () =>
      choices
        .filter((item) => !isSalesSet(item.title))
        .filter((item) => item.title.toLocaleLowerCase("tr-TR").includes(packageSearch.toLocaleLowerCase("tr-TR")))
        .filter((item) => !trainerUserId || !activeEntitlementKeys.has(`${trainerUserId}:${item.packageId}`))
        .filter((item) => (item.qualifications || []).length > 0),
    [choices,packageSearch,trainerUserId,activeEntitlementKeys],
  );
  /* FIXOKU_OWNER_HIDE_EMPTY_AND_PASTEL_ICONS_V37B */
  const availableEducationCountV37 = trainerUserId
    ? choices.filter((choice) =>
        !isSalesSet(choice.title) &&
        !activeEntitlementKeys.has(`${trainerUserId}:${choice.packageId}`) &&
        (choice.qualifications || []).length > 0
      ).length
    : 0;
  const assignableManualChoicesV37 = manualChoices;

  /* OWNER_COMPACT_V40: Six core courses only; combo packages provide rights without extra courses.
     Access and expertise are independent. Never infer a purchase from a qualification grant. */
  const ownerCoursesV40=useMemo(()=>{
    const codes=[
      ["PRIMARY_FAST","İlkokul Akıcı ve Hızlı Okuma"],
      ["MIDDLE_FAST","Ortaokul Hızlı Okuma"],
      ["HIGH_FAST","Lise Hızlı Okuma"],
      ["ADULT_FAST","Yetişkin Hızlı Okuma"],
      ["MIDDLE_PARAGRAPH","Ortaokul Paragraf Teknikleri"],
      ["HIGH_PARAGRAPH","Lise Paragraf Teknikleri"],
    ] as const;
    return codes.map(([code,title])=>{
      const choice=choices.find(item=>(item.qualifications||[]).length===1&&item.qualifications?.[0]?.code===code);
      const covering=entitlements.filter(ent=>ent.trainerUserId===trainerUserId&&ent.status==="ACTIVE"&&
        choices.some(c=>c.packageId===ent.packageId&&(c.qualifications||[]).some(q=>q.code===code)));
      const active=covering.find(ent=>ent.packageId===choice?.packageId) || covering[0];
      const paid=covering.some(ent=>ent.source==="PAYMENT"||ent.source==="LEGACY_PURCHASE");
      const combo=!!active&&active.packageId!==choice?.packageId;
      const expertise=expertiseV29.some(grant=>grant.trainerUserId===trainerUserId&&grant.code===code&&grant.status==="ACTIVE");
      const source=active?.source==="LEGACY_PURCHASE"?"Eski sistem satın alımı":
        active?.source==="PAYMENT"?"Satın alındı":active?.source==="MANUAL_GIFT"?"Owner erişimi":"Erişim yok";
      /* Combo access is never partially revoked by checking a standalone course. */
      const removable=!paid&&!combo&&active?.source==="MANUAL_GIFT"?active:undefined;
      return {code,title,choice,active:!!active,source:combo?`Set · ${source}`:source,
        expertise,removable,protectedAccess:paid||combo};
    });
  },[choices,entitlements,expertiseV29,trainerUserId]);
  const openedCourseCountV39=ownerCoursesV40.filter(item=>item.active).length;
  const activeExpertiseCountV40=ownerCoursesV40.filter(item=>item.expertise).length;
  const isSeniorV39=openedCourseCountV39===6&&activeExpertiseCountV40===6;

  /* FIXOKU_OWNER_ACCESS_MANAGEMENT_V34 */
  const [ownerRevokeIdsV38,setOwnerRevokeIdsV38]=useState<string[]>([]);
  const ownerRevokeBusyRefV38 = useRef(false);
  const [assignmentConfirmV38,setAssignmentConfirmV38]=useState(false);
  const [ownerRevokeReasonV34,setOwnerRevokeReasonV34]=useState("");
  const [ownerRevokeConfirmV34,setOwnerRevokeConfirmV34]=useState(false);
  /* FIXOKU_OWNER_ACCESS_COLLAPSIBLE_REVOKE_V36 */
  const [ownerManageOpenV36,setOwnerManageOpenV36]=useState(false);
  const [ownerR6BusyV36,setOwnerR6BusyV36]=useState(false);
  const selectedTrainer = trainers.find((item) => item.id === trainerUserId) || null;

  const selectedChoices = choices.filter((item) =>
    selectedPackageVersionIds.includes(item.packageVersionId),
  );

  const selectedTrainerEntitlements = entitlements.filter(
    (item) => item.trainerUserId === trainerUserId && item.status === "ACTIVE",
  );
  /* FIXOKU_OWNER_ACCESS_MANAGEMENT_VISIBLE_V35 */
  const selectedTrainerUnlinkedRightsV35 = (() => {
    if (!trainerUserId) return [];
    const coveredQualificationIds = new Set<string>();
    for (const entitlement of selectedTrainerEntitlements) {
      for (const choice of choices) {
        if (choice.packageId !== entitlement.packageId) continue;
        for (const qualification of choice.qualifications || []) {
          coveredQualificationIds.add(qualification.qualificationId);
        }
      }
    }
    const seen = new Set<string>();
    return expertiseV29.filter((grant) => {
      if (grant.trainerUserId !== trainerUserId || grant.status !== "ACTIVE") return false;
      if (coveredQualificationIds.has(grant.qualificationId)) return false;
      if (seen.has(grant.qualificationId)) return false;
      seen.add(grant.qualificationId);
      return true;
    });
  })();
  const canRevokeOwnerR6V36 = (grant: ExpertiseV29) =>
    grant.trainerUserId===trainerUserId &&
    grant.status==="ACTIVE" &&
    grant.source==="OWNER_MANUAL" &&
    !!grant.sourceRef?.trim() &&
    !expertiseV29.some(other=>
      other.trainerUserId===trainerUserId &&
      other.qualificationId===grant.qualificationId &&
      other.status==="ACTIVE" && other.source==="PURCHASE"
    );

  const removableOwnerRightsV38 = [
    ...selectedTrainerEntitlements
      .filter(item => item.source === "MANUAL_GIFT")
      .map(item => ({ id: item.id, title: item.title, kind: "entitlement" as const, entitlement: item })),
    ...selectedTrainerUnlinkedRightsV35
      .filter(canRevokeOwnerR6V36)
      .map(grant => ({
        id: `r6:${grant.qualificationId}:${grant.sourceRef}`,
        title: grant.title || grant.code || "Yetkinlik",
        kind: "qualification" as const,
        grant,
      })),
  ];
  const selectedOwnerRightsV38 = removableOwnerRightsV38.filter(item => ownerRevokeIdsV38.includes(item.id));
  const toggleOwnerRevokeV38 = (id: string) => {
    if (ownerR6BusyV36) return;
    setOwnerRevokeIdsV38(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    setOwnerRevokeConfirmV34(false);
  };


  const filteredPurchases = purchases.filter((purchase) => {
    if (purchaseFilter === "WAITING" && (purchase.status === "PAID" || ["REJECTED", "CANCELLED", "REFUNDED"].includes(purchase.status))) return false;
    if (purchaseFilter === "PAID" && purchase.status !== "PAID") return false;

    const query = purchaseSearch.trim().toLocaleLowerCase("tr-TR");
    if (!query) return true;

    const haystack = [
      purchase.id,
      purchase.trainerName,
      purchase.trainerEmail,
      purchase.paymentMethod,
      ...purchase.items.map((item) => item.title),
    ]
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return haystack.includes(query);
  });

  const waitingCount = purchases.filter((item) => item.status !== "PAID" && !["REJECTED", "CANCELLED", "REFUNDED"].includes(item.status)).length;
  const paidCount = purchases.filter((item) => item.status === "PAID").length;
  const manualActiveCount = entitlements.filter((item) => item.status === "ACTIVE" && item.source === "MANUAL_GIFT").length;

  const togglePackage = (choice: Choice) => {
    if (!trainerUserId) return;
    if (activeEntitlementKeys.has(`${trainerUserId}:${choice.packageId}`)) return;

    setAssignmentConfirmV38(false);
    setSelectedPackageVersionIds((current) =>
      current.includes(choice.packageVersionId)
        ? current.filter((id) => id !== choice.packageVersionId)
        : [...current, choice.packageVersionId],
    );
  };

  const assign = async () => {
    if (!trainerUserId || selectedPackageVersionIds.length === 0 || !assignmentConfirmV38 || assignmentSubmittingRef.current) return;

    assignmentSubmittingRef.current = true;
    setAssignmentSubmitting(true);
    setAssignmentResults([]);
    setMessage("");

    try {
      const results: AssignmentResult[] = [];

      for (const packageVersionId of selectedPackageVersionIds) {
        const choice = choices.find((item) => item.packageVersionId === packageVersionId);

        if (!choice) continue;
        if (activeEntitlementKeys.has(`${trainerUserId}:${choice.packageId}`)) {
          results.push({
            packageVersionId,
            title: choice.title,
            ok: false,
            message: "Bu eğitim erişimi zaten aktif.",
          });
          continue;
        }

        try {
          const response = await fetch("/api/admin/trainer-entitlements", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              trainerUserId,
              packageVersionId,
              source: "MANUAL_GIFT",
              historicalPurchaseAt: null,
              note,
            }),
          });

          const body = await response.json().catch(() => ({}));
          results.push({
            packageVersionId,
            title: choice.title,
            ok: response.ok,
            message: response.ok
              ? "Erişim tanımlandı."
              : errorLabel(String(body.error || "")),
          });
        } catch {
          results.push({
            packageVersionId,
            title: choice.title,
            ok: false,
            message: errorLabel("NETWORK_ERROR"),
          });
        }
      }

      const successful = results.filter((item) => item.ok);
      const failed = results.filter((item) => !item.ok);

      setAssignmentResults(results);
      setSelectedPackageVersionIds(failed.map((item) => item.packageVersionId));
      setAssignmentConfirmV38(false);

      if (successful.length > 0) {
        await load();
      }

      setMessage(
        failed.length === 0
          ? `${successful.length} eğitim erişimi tanımlandı.`
          : `${successful.length} erişim tanımlandı, ${failed.length} işlem tamamlanamadı.`,
      );
    } finally {
      assignmentSubmittingRef.current = false;
      setAssignmentSubmitting(false);
    }
  };

  /* OWNER_BULK_REVOKE_V38: individual, existing audited endpoints. Partial failures are visible. */
  const revokeSelectedOwnerRightsV38 = async () => {
    if (!trainerUserId || !selectedOwnerRightsV38.length || !ownerRevokeReasonV34.trim() ||
        !ownerRevokeConfirmV34 || ownerRevokeBusyRefV38.current) return;
    ownerRevokeBusyRefV38.current = true;
    setOwnerR6BusyV36(true);
    setMessage("");
    const targetTrainerId = trainerUserId;
    const reason = ownerRevokeReasonV34.trim();
    const failures: string[] = [];
    const failedIds: string[] = [];
    let completed = 0;
    try {
      for (const item of selectedOwnerRightsV38) {
        try {
          let response: Response;
          if (item.kind === "entitlement") {
            if (item.entitlement.source !== "MANUAL_GIFT") throw new Error("OWNER_ONLY");
            response = await fetch("/api/admin/trainer-entitlements", {
              method: "DELETE", credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ entitlementId: item.entitlement.id, reason }),
            });
          } else {
            if (!canRevokeOwnerR6V36(item.grant)) throw new Error("OWNER_ONLY");
            response = await fetch("/api/admin/r6-qualifications", {
              method: "POST", credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "revoke", source: "OWNER_MANUAL",
                trainerUserId: targetTrainerId, qualificationId: item.grant.qualificationId,
                sourceRef: item.grant.sourceRef, reason }),
            });
          }
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(String(body.error || `HTTP_${response.status}`));
          completed += 1;
        } catch (error) {
          failedIds.push(item.id);
          failures.push(`${item.title}: ${error instanceof Error ? error.message : "İşlem tamamlanamadı"}`);
        }
      }
      setOwnerRevokeIdsV38(failedIds);
      setOwnerRevokeConfirmV34(false);
      if (!failures.length) setOwnerRevokeReasonV34("");
      setMessage(failures.length
        ? `${completed} yetki kaldırıldı, ${failures.length} işlem başarısız: ${failures.join(" | ")}`
        : `${completed} Owner yetkisi kaldırıldı. Satın alınmış haklar korundu.`);
      await load();
    } finally {
      ownerRevokeBusyRefV38.current = false;
      setOwnerR6BusyV36(false);
    }
  };

  const reviewTransfer = async (purchase: Purchase, action: "APPROVE" | "REJECT") => {
    const noteValue =
      action === "APPROVE"
        ? window.prompt("Ödeme onay notu (isteğe bağlı):") ?? ""
        : window.prompt("Ödemeyi reddetme gerekçesini yazın:") ?? "";

    if (action === "REJECT" && !noteValue.trim()) return;

    const response = await fetch("/api/admin/trainer-bank-transfers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: purchase.id,
        action,
        note: noteValue,
      }),
    });

    const body = await response.json().catch(() => ({}));

    setMessage(
      response.ok
        ? action === "APPROVE"
          ? "Ödeme onaylandı; satın alınan eğitim erişimi aktif edildi."
          : "Ödeme bildirimi reddedildi."
        : errorLabel(String(body.error || "")),
    );

    if (response.ok) {
      await load();
    }
  };

  return (
    <main className="platform-foundation-panel admin-panel trainer-exact-v24 trainer-exact-v24-commerce">
      <header className="trainer-exact-header-v24">
        <div>
          <span className="trainer-exact-eyebrow-v24">EĞİTMENLER</span>
          <h1>Eğitmen Yönetimi</h1>
          <p>Eğitmen, yetkinlik, eğitim satın alma ve özel erişim işlemlerini tek merkezden yönetin.</p>
        </div>
      </header>

      {message && <p className="admin-feedback trainer-commerce-feedback" role="status">{message}</p>}

      {activeTab==="purchases"&&<section className="trainer-exact-kpis-v24" aria-label="Eğitmen eğitim özeti">
        <article><span className="is-purple"><PanelIcon name="credit-card" size={24}/></span><div><small>Satın alma</small><strong>{purchases.length}</strong><em>Toplam satın alma</em></div><b>›</b></article>
        <article><span className="is-orange"><PanelIcon name="info" size={24}/></span><div><small>Ödeme bekleyen</small><strong>{waitingCount}</strong><em>Onay bekleyen ödeme</em></div><b>›</b></article>
        <article><span className="is-green"><PanelIcon name="user-check" size={24}/></span><div><small>Aktif edilen</small><strong>{paidCount}</strong><em>Erişimi verilen eğitim</em></div><b>›</b></article>
        <article><span className="is-purple"><PanelIcon name="users" size={24}/></span><div><small>Özel erişim</small><strong>{manualActiveCount}</strong><em>Owner erişimi</em></div><b>›</b></article>
      </section>}

      <nav className="trainer-exact-tabs-v24" aria-label="Eğitmen yönetimi bölümleri">
        <a className="is-directory" href="/panel/admin/egitmenler?section=directory"><span className="trainer-exact-tab-number-v24">1</span><span><strong>Eğitmen Listesi</strong><small>Profil ve yetkinlik özeti</small></span><i><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3"/><path d="M3.5 18c.7-3.8 2.6-5.8 5.5-5.8s4.8 2 5.5 5.8"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 13.2c2.5-.2 4.2 1.2 4.8 3.8"/></svg></i></a>
        <a className={activeTab==="purchases"?"is-active is-sales":"is-sales"} href="/panel/admin/egitmen-ticaret?section=purchases"><span className="trainer-exact-tab-number-v24">2</span><span><strong>Eğitim Satışları</strong><small>Satın alma ve ödeme kayıtları</small></span><i><svg viewBox="0 0 24 24" fill="none"><path d="M3 4h2l2 10h10l2-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg></i></a>
        <a className={activeTab==="manual"?"is-active is-access":"is-access"} href="/panel/admin/egitmen-ticaret?section=manual"><span className="trainer-exact-tab-number-v24">3</span><span><strong>Özel Eğitim Erişimi</strong><small>Owner ücretsiz erişimi</small></span><i><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="4"/><path d="m12.5 9.5 7-7M16 3l2 2M14 5l2 2"/></svg></i></a>
      </nav>

      {activeTab==="purchases"&&<div className="trainer-exact-flow-v24">
        <span><PanelIcon name={activeTab==="purchases"?"credit-card":"user-check"} size={18}/></span>
        {activeTab==="purchases"
          ? <div><strong>Satın alma akışı</strong><small>PayTR ödemesi tamamlandığında erişim otomatik açılır. Havale / EFT owner onayından sonra aktive edilir.</small></div>
          : <div><strong>Özel erişim akışı</strong><small>Owner tarafından ücretsiz açılan eğitim, ilgili eğitmen yetkinliğini de aktif eder.</small></div>}
      </div>}

      {activeTab==="purchases" ? (
        <section className="trainer-exact-sales-v24">
          <header className="trainer-exact-panel-head-v24">
            <div><span className="trainer-exact-eyebrow-v24">GERÇEK SATIN ALMALAR</span><h2>Gerçek satın almalar</h2><p>Eğitmenlerin satın aldığı eğitimler ve ödeme durumlarını tek satırda görün.</p></div>
            <label className="trainer-exact-search-v24"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg></span><input type="search" placeholder="Eğitmen, eğitim adı veya e-posta ara..." value={purchaseSearch} onChange={e=>setPurchaseSearch(e.target.value)}/></label>
          </header>

          <div className="trainer-exact-sales-tools-v24">
            <div>
              <button type="button" className={purchaseFilter==="ALL"?"is-active":""} onClick={()=>setPurchaseFilter("ALL")}>Tümü <span>{purchases.length}</span></button>
              <button type="button" className={purchaseFilter==="WAITING"?"is-active":""} onClick={()=>setPurchaseFilter("WAITING")}>Ödeme bekleyen <span>{waitingCount}</span></button>
              <button type="button" className={purchaseFilter==="PAID"?"is-active":""} onClick={()=>setPurchaseFilter("PAID")}>Aktif edilen <span>{paidCount}</span></button>
            </div>
            <span>Sırala: En yeni</span>
          </div>

          <div className="trainer-exact-sales-head-v24"><span>Eğitmen</span><span>Satın alınan eğitim</span><span>Ödeme yöntemi</span><span>Satın alma tarihi</span><span>Durum</span><span>İşlemler</span></div>

          {loading ? <div className="trainer-exact-empty-v24">Satın almalar yükleniyor…</div> :
           filteredPurchases.length===0 ? <div className="trainer-exact-empty-v24"><strong>Gösterilecek satın alma yok</strong><span>Yeni bir PayTR veya havale siparişi geldiğinde burada görünecek.</span></div> :
           <div className="trainer-exact-sales-list-v24">
            {filteredPurchases.map((purchase)=>{
              const waitingBankTransfer=purchase.paymentMethod==="BANK_TRANSFER"&&purchase.status!=="PAID"&&!["REJECTED","CANCELLED","REFUNDED"].includes(purchase.status);
              const transferCanApprove=waitingBankTransfer&&["SUBMITTED","IN_REVIEW"].includes(String(purchase.transferStatus||""));
              return <article className="trainer-exact-sales-row-v24" key={purchase.id}>
                <div className="trainer-exact-purchase-person-v24">
                  <span>{commerceTrainerPhotoV20(purchase.trainerName)?<img src={commerceTrainerPhotoV20(purchase.trainerName)} alt=""/>:(purchase.trainerName?.trim()?.charAt(0)?.toUpperCase()||"E")}</span>
                  <div><strong>{purchase.trainerName}<i>✓</i></strong><small>✉ {purchase.trainerEmail}</small></div>
                </div>
                <div className="trainer-exact-purchase-course-v24"><i>▣</i><div><strong>{purchase.items[0]?.title||"Eğitim"}</strong>{purchase.items.length>1&&<small>+{purchase.items.length-1} eğitim daha</small>}</div></div>
                <div className="trainer-exact-payment-v24"><i>▤</i><div><strong>{purchase.paymentMethod==="PAYTR"?"PayTR":"Havale / EFT"}</strong><small>{purchase.paymentMethod==="PAYTR"?"Kredi Kartı":"Banka Transferi"}</small></div></div>
                <time>{dateTime(purchase.createdAt)}</time>
                <div className="trainer-exact-purchase-status-v24"><span className={purchaseStatusClass(purchase)}>{purchaseStatusLabel(purchase)}</span><i className={purchase.status==="PAID"?"is-green":"is-orange"}/><small>{money(purchase.totalMinor,purchase.currency)}</small></div>
                <details className="trainer-exact-purchase-detail-v24">
                  <summary>Detay →</summary>
                  <div>
                    <strong>Sipariş #{purchase.id.slice(0,8)}</strong>
                    {purchase.items.map(item=><span key={item.packageVersionId}>{item.title}</span>)}
                    {purchase.paymentMethod==="BANK_TRANSFER"&&<span>{purchase.bankName||"Banka bildirimi"} · {purchase.reference||"Referans yok"}</span>}
                    {waitingBankTransfer&&transferCanApprove&&<div className="trainer-exact-bank-actions-v24"><button type="button" onClick={()=>void reviewTransfer(purchase,"APPROVE")}>Ödeme geldi</button><button type="button" onClick={()=>void reviewTransfer(purchase,"REJECT")}>Reddet</button></div>}
                    {waitingBankTransfer&&!transferCanApprove&&<small>Öğretmenin havale bildirimi bekleniyor.</small>}
                  </div>
                </details>
              </article>;
            })}
           </div>}
        </section>
      ) : (
        <section className="owner-v40" aria-label="Özel eğitim erişimi yönetimi">
          <style>{`
            .owner-v40{--o40-border:#e4eaf1;--o40-green:#12805a;--o40-orange:#f35b16;max-width:1320px;margin:0 auto 42px;color:#172b44}
            .owner-v40 .owner-panel{background:#fff;border:1px solid var(--o40-border);border-radius:20px;padding:22px 24px;margin:0 0 16px;box-shadow:0 5px 20px #24385308}
            .owner-v40 .owner-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:17px}
            .owner-v40 .owner-head h2{font-size:21px;font-weight:800;margin:0 0 4px;line-height:1.35}
            .owner-v40 .owner-muted{color:#718098;font-size:13px;margin:0;line-height:1.6}
            .owner-v40 .owner-selector{display:flex;gap:13px;align-items:center;flex-wrap:wrap}
            .owner-v40 .owner-selector label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#566779;flex:1;max-width:440px}
            .owner-v40 select{min-height:42px;padding:0 13px;border:1px solid #d7e2ef;border-radius:10px;background:#fff;color:#142b48;font-weight:600}
            .owner-v40 .owner-identity{display:flex;align-items:center;gap:11px;background:#f7f9fd;border:1px solid #e9eef7;padding:9px 13px;border-radius:12px}
            .owner-v40 .owner-avatar{width:41px;height:41px;display:grid;place-items:center;background:#ffece2;color:#e95915;border-radius:50%;font-weight:800;overflow:hidden}
            .owner-v40 .owner-avatar img{width:100%;height:100%;object-fit:cover}
            .owner-v40 .owner-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:15px 0 0}
            .owner-v40 .owner-kpi{background:#f8fafc;border:1px solid #edf0f5;border-radius:13px;padding:15px}
            .owner-v40 .owner-kpi small{display:block;font-size:12px;color:#6c7c8f;margin-bottom:6px}
            .owner-v40 .owner-kpi strong{font-size:23px;color:#162c45;font-weight:850}
            .owner-v40 .owner-kpi span{display:block;font-size:11px;color:#7c899a;margin-top:3px}
            .owner-v40 .owner-tabs{display:flex;background:#f5f7fb;border:1px solid #e4e9f0;border-radius:12px;padding:4px;gap:4px;width:max-content;max-width:100%}
            .owner-v40 .owner-tabs button{font-weight:750;border:0;background:transparent;color:#627287;border-radius:9px;padding:10px 19px;cursor:pointer}
            .owner-v40 .owner-tabs button.is-active{color:#e85a16;background:#fff;box-shadow:0 1px 5px #22324918}
            .owner-v40 .owner-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;justify-content:space-between;margin:13px 0}
            .owner-v40 .owner-button{border:1px solid #d7e1ed;border-radius:9px;background:#fff;padding:9px 14px;font-weight:750;cursor:pointer;color:#31506e}
            .owner-v40 .owner-button:disabled{opacity:.5;cursor:not-allowed}
            .owner-v40 .owner-main-button{background:#f56820;color:#fff;border-color:#f56820}
            .owner-v40 .owner-danger{background:#bd3434;border-color:#bd3434;color:#fff}
            .owner-v40 .owner-rows{border:1px solid var(--o40-border);border-radius:12px;overflow:hidden}
            .owner-v40 .owner-row{display:grid;grid-template-columns:30px minmax(150px,2fr) minmax(120px,1fr) minmax(90px,.85fr);align-items:center;gap:10px;padding:14px 15px;border-bottom:1px solid #edf0f4;cursor:pointer;background:#fff}
            .owner-v40 .owner-row:last-child{border-bottom:0}
            .owner-v40 .owner-row:hover{background:#fafcfe}
            .owner-v40 .owner-row.is-selected{background:#fff6f0}
            .owner-v40 .owner-row input{width:17px;height:17px;accent-color:#fa641a;cursor:pointer}
            .owner-v40 .owner-row input:disabled{cursor:not-allowed}
            .owner-v40 .owner-row strong{font-size:13px;line-height:1.35}
            .owner-v40 .owner-row span{font-size:12px}
            .owner-v40 .owner-pill{border-radius:30px;padding:5px 8px;font-size:11px;font-weight:750;width:max-content;max-width:100%}
            .owner-v40 .owner-pill.is-ok{background:#eaf8f0;color:#177b55}
            .owner-v40 .owner-pill.is-no{background:#f1f3f6;color:#58697b}
            .owner-v40 .owner-pill.is-protected{background:#fff2e9;color:#a65114}
            .owner-v40 .owner-action-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:17px}
            .owner-v40 details{margin-top:16px;border-top:1px solid #eaeef4;padding-top:14px}
            .owner-v40 details summary{cursor:pointer;font-size:13px;font-weight:750;color:#475f76}
            .owner-v40 .owner-qual-list{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}
            .owner-v40 .owner-qual{display:flex;gap:6px;align-items:center;border:1px solid #e5eaf1;padding:7px 10px;border-radius:10px;background:#fbfcff;font-size:11px}
            .owner-v40 .owner-qual img{width:30px;height:30px;object-fit:contain}
            .owner-v40 .owner-note{font-size:12px;color:#718098;line-height:1.6;margin:14px 0 0}
            .owner-v40 .owner-modal-back{position:fixed;inset:0;background:#10203794;z-index:9999;display:flex;justify-content:center;align-items:center;padding:15px}
            .owner-v40 .owner-modal{width:min(100%,570px);max-height:calc(100vh - 36px);overflow:auto;background:white;padding:25px;border-radius:20px;box-shadow:0 24px 70px #0002}
            .owner-v40 .owner-modal h3{font-size:21px;font-weight:850;margin:0 0 6px}
            .owner-v40 .owner-modal-list{background:#f7f9fb;border:1px solid #e7edf3;border-radius:12px;padding:12px 18px;margin:13px 0}
            .owner-v40 .owner-modal-list li{margin:6px 0;font-size:13px}
            .owner-v40 .owner-modal textarea{width:100%;resize:vertical;min-height:76px;padding:11px;border-radius:10px;border:1px solid #d9e1eb;margin:8px 0}
            .owner-v40 .owner-modal-ack{display:flex;align-items:flex-start;gap:9px;margin:14px 0;font-size:12px;line-height:1.5}
            .owner-v40 .owner-modal-ack input{margin-top:3px}
            .owner-v40 .owner-modal-footer{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
            @media(max-width:760px){.owner-v40 .owner-panel{padding:16px}.owner-v40 .owner-kpis{grid-template-columns:repeat(2,1fr)}.owner-v40 .owner-kpi:last-child{grid-column:span 2}.owner-v40 .owner-row{grid-template-columns:25px minmax(0,1fr);gap:5px}.owner-v40 .owner-row>span:nth-of-type(2),.owner-v40 .owner-row>span:nth-of-type(3){grid-column:2}.owner-v40 .owner-head{flex-direction:column}}
          `}</style>
          <section className="owner-panel">
            <div className="owner-head"><div><h2>Öğretmenin eğitim yetkileri</h2><p className="owner-muted">Tek listeden eğitim erişimini yönetin. Uzmanlık ve satın alma kayıtları korunur.</p></div></div>
            <div className="owner-selector">
              <label>Eğitmen seç
                <select value={trainerUserId} onChange={e=>{
                  setTrainerUserId(e.target.value);setSelectedPackageVersionIds([]);setOwnerRevokeIdsV38([]);
                  setAssignmentResults([]);setAssignmentConfirmV38(false);setOwnerRevokeConfirmV34(false);
                  setOwnerRevokeReasonV34("");setOwnerModalV40(null);setOwnerModeV40("grant");
                }}>
                  <option value="">Eğitmen seçin</option>
                  {trainers.map(trainer=><option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
                </select>
              </label>
              {selectedTrainer&&<div className="owner-identity">
                <span className="owner-avatar">{commerceTrainerPhotoV20(selectedTrainer.name)?<img src={commerceTrainerPhotoV20(selectedTrainer.name)} alt=""/>:selectedTrainer.name.slice(0,1)}</span>
                <div><strong>{selectedTrainer.name}</strong><p className="owner-muted">Aktif öğretmen</p></div>
              </div>}
            </div>
            {trainerUserId&&<div className="owner-kpis">
              <div className="owner-kpi"><small>Açık eğitim</small><strong>{openedCourseCountV39}/6</strong><span>{6-openedCourseCountV39} eğitime erişim kapalı</span></div>
              <div className="owner-kpi"><small>Aktif uzmanlık</small><strong>{activeExpertiseCountV40}/6</strong><span>Rozetler eğitim erişiminden ayrı</span></div>
              <div className="owner-kpi"><small>Kıdemli Eğitmen</small><strong style={{fontSize:19}}>{isSeniorV39?"Kazanıldı":"Kilitli"}</strong><span>6 eğitim + 6 uzmanlık gerekir</span></div>
            </div>}
          </section>

          {trainerUserId&&<section className="owner-panel">
            <div className="owner-head"><div><h2>Eğitim erişimlerini yönet</h2><p className="owner-muted">Altı temel eğitim tek listede. Set paketleri ek bir eğitim sayılmaz.</p></div></div>
            <div className="owner-tabs" role="group" aria-label="İşlem türü">
              <button type="button" className={ownerModeV40==="grant"?"is-active":""} aria-pressed={ownerModeV40==="grant"}
                onClick={()=>{setOwnerModeV40("grant");setOwnerRevokeIdsV38([]);setOwnerModalV40(null)}}>+ Erişim ver</button>
              <button type="button" className={ownerModeV40==="revoke"?"is-active":""} aria-pressed={ownerModeV40==="revoke"}
                onClick={()=>{setOwnerModeV40("revoke");setSelectedPackageVersionIds([]);setOwnerModalV40(null)}}>− Erişimi kaldır</button>
            </div>
            <div className="owner-actions">
              <p className="owner-muted">{ownerModeV40==="grant"?"Yalnızca henüz açılmamış eğitimler seçilebilir.":"Yalnızca Owner tarafından açılan tekil eğitim erişimleri kaldırılabilir."}</p>
              <div style={{display:"flex",gap:8}}>
                <button type="button" className="owner-button" disabled={assignmentSubmitting||ownerR6BusyV36}
                  onClick={()=>{
                    if(ownerModeV40==="grant")setSelectedPackageVersionIds(ownerCoursesV40.filter(c=>!c.active&&c.choice).map(c=>c.choice!.packageVersionId));
                    else setOwnerRevokeIdsV38(ownerCoursesV40.filter(c=>c.removable).map(c=>c.removable!.id));
                  }}>Uygunların tümünü seç</button>
                <button type="button" className="owner-button" disabled={assignmentSubmitting||ownerR6BusyV36}
                  onClick={()=>{setSelectedPackageVersionIds([]);setOwnerRevokeIdsV38([])}}>Temizle</button>
              </div>
            </div>
            <div className="owner-rows" role="group" aria-label="Altı temel eğitim">
              {ownerCoursesV40.map(course=>{
                const canGrant=!course.active&&!!course.choice;
                const canRevoke=!!course.removable;
                const enabled=ownerModeV40==="grant"?canGrant:canRevoke;
                const checked=ownerModeV40==="grant"?
                  (!!course.choice&&selectedPackageVersionIds.includes(course.choice.packageVersionId)):
                  (!!course.removable&&ownerRevokeIdsV38.includes(course.removable.id));
                return <label className={`owner-row ${checked?"is-selected":""}`} key={course.code}>
                  <input type="checkbox" checked={checked} disabled={!enabled||assignmentSubmitting||ownerR6BusyV36}
                    onChange={()=>{
                      if(ownerModeV40==="grant"&&course.choice)togglePackage(course.choice);
                      else if(course.removable)toggleOwnerRevokeV38(course.removable.id);
                    }}/>
                  <strong>{course.title}</strong>
                  <span className={`owner-pill ${course.protectedAccess?"is-protected":course.active?"is-ok":"is-no"}`}>
                    {course.active?course.source:"Erişim kapalı"}
                  </span>
                  <span className={`owner-pill ${course.expertise?"is-ok":"is-no"}`}>
                    Uzmanlık: {course.expertise?"Aktif":"Yok"}
                  </span>
                </label>;
              })}
            </div>
            <div className="owner-action-footer">
              <span className="owner-muted">{ownerModeV40==="grant"?selectedChoices.length:selectedOwnerRightsV38.length} seçim yapıldı</span>
              <button type="button" className={`owner-button ${ownerModeV40==="grant"?"owner-main-button":"owner-danger"}`}
                disabled={(ownerModeV40==="grant"?!selectedChoices.length:!selectedOwnerRightsV38.length)||assignmentSubmitting||ownerR6BusyV36}
                onClick={()=>{setAssignmentConfirmV38(false);setOwnerRevokeConfirmV34(false);setOwnerModalV40(ownerModeV40)}}>
                {ownerModeV40==="grant"?"Erişim verme onayı →":"Erişim kaldırma onayı →"}
              </button>
            </div>
            <details><summary>Uzmanlık rozetleri ve kaynaklarını görüntüle</summary>
              <div className="owner-qual-list">
                {ownerCoursesV40.map(course=><span key={course.code} className="owner-qual">{course.title}: {course.expertise?"Aktif":"Yok"}</span>)}
                <span className="owner-qual">Kıdemli Eğitmen: {isSeniorV39?"Kazanıldı":"Kilitli"}</span>
              </div>
              {ownerModeV40==="revoke" && selectedTrainerUnlinkedRightsV35.filter(canRevokeOwnerR6V36).length>0 && <>
                <p className="owner-note">Aşağıdaki eski Owner uzmanlık kayıtları eğitim erişiminden ayrıdır. Seçim yapıldığında rozet de geri alınabilir. Satın alma kökenli uzmanlıklar seçilemez.</p>
                <div className="owner-qual-list">
                  {selectedTrainerUnlinkedRightsV35.filter(canRevokeOwnerR6V36).map(grant=>{
                    const id=`r6:${grant.qualificationId}:${grant.sourceRef}`;
                    return <label className="owner-qual" key={id}>
                      <input type="checkbox" checked={ownerRevokeIdsV38.includes(id)} disabled={ownerR6BusyV36}
                        onChange={()=>toggleOwnerRevokeV38(id)}/>
                      <TrainerQualificationBadgeR5 title={grant.title} size={32} fallback={<span aria-hidden="true">◇</span>}/>
                      {grant.title} <strong>Manuel uzmanlık</strong>
                    </label>;
                  })}
                </div>
              </>}
              {ownerModeV40==="grant"&&<p className="owner-note">Uzmanlık rozetleri otomatik olarak değiştirilmez. İçerik erişimi verildiğinde eşleşen yetki kaydı da sistem kurallarına göre işlenir.</p>}
            </details>
          </section>}

          {assignmentResults.length>0&&<section className="owner-panel" role="status"><strong>İşlem sonuçları</strong>
            <div className="owner-qual-list">{assignmentResults.map(result=><span className="owner-qual" key={result.packageVersionId}>{result.ok?"✓":"!"} {result.title}: {result.message}</span>)}</div>
          </section>}

          {ownerModalV40&&selectedTrainer&&<div className="owner-modal-back" role="presentation">
            <div className="owner-modal" role="dialog" aria-modal="true" aria-labelledby="owner-v40-modal-title">
              <h3 id="owner-v40-modal-title">{ownerModalV40==="grant"?"Eğitim erişimi ver":"Eğitim erişimini kaldır"}</h3>
              <p className="owner-muted">Öğretmen: <strong>{selectedTrainer.name}</strong> · Seçilen işlem: {ownerModalV40==="grant"?"Ücretsiz Owner erişimi":"Owner erişimini kaldır"}</p>
              <ul className="owner-modal-list">{ownerModalV40==="grant"?
                selectedChoices.map(item=><li key={item.packageVersionId}>{item.title}</li>):
                selectedOwnerRightsV38.map(item=><li key={item.id}>{item.title} ({item.kind==="qualification"?"Manuel uzmanlık":"Eğitim erişimi"})</li>)}</ul>
              {ownerModalV40==="grant"?<>
                <label className="owner-muted">Owner notu (isteğe bağlı)
                  <textarea rows={3} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Örn. Sunum amacıyla eğitim erişimi"/>
                </label>
                <p className="owner-note">Satın alma/ödeme kaydı oluşturulmaz. Mevcut kazanılmış uzmanlıklar korunur. İşlem sonuçları ayrı ayrı raporlanır.</p>
                <label className="owner-modal-ack"><input type="checkbox" checked={assignmentConfirmV38} onChange={e=>setAssignmentConfirmV38(e.target.checked)}/><span>{selectedChoices.length} eğitime Owner erişimi vereceğimi onaylıyorum.</span></label>
              </>:<>
                <label className="owner-muted">Kaldırma gerekçesi (zorunlu)
                  <textarea rows={3} maxLength={500} value={ownerRevokeReasonV34} onChange={e=>setOwnerRevokeReasonV34(e.target.value)} placeholder="Neden kaldırılıyor?"/>
                </label>
                <p className="owner-note">Erişim kaldırma ile manuel uzmanlık kaldırma ayrı kayıtlardır. Seçili uzmanlık kaldırılırsa ilgili rozet kaybolabilir. Ödenmiş ve eski satın alma hakları korunur.</p>
                <label className="owner-modal-ack"><input type="checkbox" checked={ownerRevokeConfirmV34} onChange={e=>setOwnerRevokeConfirmV34(e.target.checked)}/><span>{selectedOwnerRightsV38.length} Owner erişimini kaldıracağımı onaylıyorum.</span></label>
              </>}
              <div className="owner-modal-footer">
                <button className="owner-button" type="button" disabled={assignmentSubmitting||ownerR6BusyV36} onClick={()=>setOwnerModalV40(null)}>Vazgeç</button>
                <button className={`owner-button ${ownerModalV40==="grant"?"owner-main-button":"owner-danger"}`} type="button"
                  disabled={assignmentSubmitting||ownerR6BusyV36||(ownerModalV40==="grant"?!assignmentConfirmV38||!selectedChoices.length:!ownerRevokeConfirmV34||!ownerRevokeReasonV34.trim()||!selectedOwnerRightsV38.length)}
                  onClick={()=>{
                    if(ownerModalV40==="grant"){setOwnerModalV40(null);void assign();}
                    else {setOwnerModalV40(null);void revokeSelectedOwnerRightsV38();}
                  }}>{ownerModalV40==="grant"?"Erişimleri kaydet":"Seçili erişimleri kaldır"}</button>
              </div>
            </div>
          </div>}
        </section>
      )}
    </main>
  );
}
