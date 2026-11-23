import { PaymentResultR408 } from "../commerce/PaymentResultR408";
import "../commerce/fixoku-checkout-r408.css";
import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StudentPanelShell } from "./StudentPanelShell";
import PaytrCheckout from "../commerce/PaytrCheckout.jsx";
import CheckoutLegalConsents from "../commerce/CheckoutLegalConsents.jsx";
import { BankTransferPayment } from "../commerce/BankTransferPayment";
import InstallmentCampaignBanner from "../../shared/InstallmentCampaignBanner";
import { TrainerPhysicalProducts } from "../trainer/commerce/TrainerPhysicalProducts";
import { pushEvent } from "../../martech/events.js";
import {
  TURKEY_LOCATIONS,
  getTurkeyDistricts,
} from "../../data/turkeyLocations.js";
import "../trainer/commerce/trainer-commerce.css";
import "./student-portal.css";

type PaymentMethod = "PAYTR" | "BANK_TRANSFER";

type Cart = {
  beneficiary: {
    studentProfileId?: string | null;
    educationStage?: string | null;
    grade?: string | null;
  };
  items: Array<{
    packageVersionId?: string | null;
    title: string;
    priceMinor: number;
    currency: string;
    products?: Array<{
      packageComponentId?: string | null;
      sku?: string | null;
      title?: string | null;
      productType?: string | null;
      quantity?: number | null;
      imageReference?: string | null;
    }>;
  }>;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  requiresShipping: boolean;
};

type SavedOrderSummary = {
  bankReference?: string | null;
  id: string;
  status: string;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  requiresShipping: boolean;
  items: Array<{
    title: string;
    totalMinor: number;
    quantity: number;
    currency: string;
  }>;
};
type StudentProfile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  district?: string;
  addressLine?: string;
};

const money = (
  minor: number,
  currency = "TRY",
) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(minor / 100);

function cleanTc(value: string) {
  return String(value || "")
    .replace(/\D/gu, "")
    .slice(0, 11);
}

export function StudentCheckoutPage({
  user,
  guardian,
}: {
  user: {
    name: string;
    email?: string;
  };
  guardian: boolean;
}) {
  const [params,setParams] = useSearchParams();

  const studentProfileId =
    params.get("studentProfileId") || "";

  const [cart, setCart] =
    useState<Cart | null>(null);

  const [state, setState] =
    useState("loading");

  const [message, setMessage] =
    useState("");

  const [orderId, setOrderId] =
    useState(params.get("orderId") || "");

  const [savedOrder,setSavedOrder] =
    useState<SavedOrderSummary|null>(null);

  useEffect(()=>{if(!orderId||params.get("orderId")!==orderId)return;let active=true;void fetch(`/api/student/orders?orderId=${encodeURIComponent(orderId)}`,{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("ORDER_NOT_FOUND");return r.json();}).then(b=>{if(active&&b.order?.id===orderId)setSavedOrder(b.order);}).catch(()=>{if(active)setMessage("Sipariş durumu doğrulanamadı.");});return()=>{active=false;};},[orderId,params]);

  const [legalAcceptance, setLegalAcceptance] = useState({ preInformation: false, distanceSales: false, privacy: false, marketing: false, commencement: false });
  const legalReady = legalAcceptance.preInformation && legalAcceptance.distanceSales && legalAcceptance.privacy;

  // Stable for retries, unique for a new checkout/payment choice. No personal data in the key.
  const [checkoutKey, setCheckoutKey] =
    useState(() => `student-checkout-${crypto.randomUUID()}`);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [paytrConfigured, setPaytrConfigured] = useState<boolean | null>(null);
  const [bankTransferReady, setBankTransferReady] = useState(false);
  const [bankDraft,setBankDraft]=useState<{id:string;reference:string;expectedAmountMinor:number;currency:string}|null>(null);
  const [transfer, setTransfer] = useState({ payerName: user.name, bankName: "", reportedAmount: "", transferDate: new Date().toISOString().slice(0, 10), reference: "" });

  const [shipping, setShipping] =
    useState({
      firstName: "",
      lastName: "",
      phone: "",
      city: "",
      district: "",
      addressLine: "",
    });

  const [billing, setBilling] =
    useState({
      type: "INDIVIDUAL",
      sameAsShipping: true,
      firstName: "",
      lastName: "",
      identityNumber: "",
      companyName: "",
      taxOffice: "",
      taxNumber: "",
      phone: "",
      addressLine: "",
    });

  const districts =
    getTurkeyDistricts(shipping.city);

  useEffect(() => { let active = true; fetch("/api/paytr/runtime", { credentials: "same-origin", cache: "no-store" }).then(async response => response.ok ? response.json() : null).then(body => { if (active) setPaytrConfigured(body?.configured === true); }).catch(() => { if (active) setPaytrConfigured(false); }); return () => { active = false; }; }, []);

  useEffect(() => {
    let active = true;

    const profileQuery =
      studentProfileId
        ? `?studentProfileId=${encodeURIComponent(
            studentProfileId,
          )}`
        : "";

    Promise.all([
      fetch(
        `/api/student/cart${studentProfileId ? `?studentProfileId=${encodeURIComponent(studentProfileId)}` : ""}`,
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      ),
      fetch(
        `/api/student/profile${profileQuery}`,
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      ),
    ])
      .then(async ([cartResponse, profileResponse]) => {
        if (!cartResponse.ok) {
          throw new Error(
            "CHECKOUT_LOAD_FAILED",
          );
        }

        const nextCart =
          (await cartResponse.json()) as Cart;

        let profile: StudentProfile = {};

        if (profileResponse.ok) {
          const profileBody =
            await profileResponse
              .json()
              .catch(() => ({}));

          profile =
            profileBody.profile || {};
        }

        if (!active) return;

        setCart(nextCart);

        setShipping({
          firstName:
            String(profile.firstName || ""),
          lastName:
            String(profile.lastName || ""),
          phone:
            String(profile.phone || ""),
          city:
            String(profile.city || ""),
          district:
            String(profile.district || ""),
          addressLine:
            String(profile.addressLine || ""),
        });

        setBilling((current) => ({
          ...current,
          firstName:
            String(profile.firstName || ""),
          lastName:
            String(profile.lastName || ""),
          sameAsShipping: true,
          phone: String(profile.phone || ""),
          addressLine: String(profile.addressLine || ""),
        }));

        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
      });

    return () => {
      active = false;
    };
  }, [studentProfileId]);

  useEffect(() => {
    if (!cart?.items?.length) return;
    const items = cart.items.slice(0, 50).map((item) => ({
      item_id: item.packageVersionId || item.title,
      item_name: item.title,
      price: Number(item.priceMinor) / 100,
      currency: item.currency || cart.currency,
    }));
    pushEvent("begin_checkout", { currency: cart.currency, value: Number(cart.totalMinor || 0) / 100, items }, { onceKey: `student:begin_checkout:${items.map((item) => item.item_id).join(",")}` });
  }, [cart]);

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    setMessage("");

    if (!legalReady) {
      setMessage(
        "Ön bilgilendirme, mesafeli satış ve gizlilik onayları zorunludur.",
      );
      return;
    }

    if (
      billing.type === "INDIVIDUAL" &&
      !/^\d{11}$/u.test(
        billing.identityNumber,
      )
    ) {
      setMessage(
        "Bireysel fatura için 11 haneli T.C. Kimlik Numarası gereklidir.",
      );
      return;
    }

    if (!cart?.requiresShipping && paymentMethod === "PAYTR") {
      const digits = billing.phone.replace(/\D/gu, "");
      if (!billing.firstName.trim() || !billing.lastName.trim() || digits.length < 10 || digits.length > 15 || !billing.addressLine.trim()) {
        setMessage("Kartla dijital ödeme için ad, soyad, telefon ve fatura/iletişim adresini tamamlayın.");
        return;
      }
    }
    if (!paymentMethod) { setMessage("Ödeme yöntemini seçin."); return; }
    if (paymentMethod === "PAYTR" && paytrConfigured !== true) { setMessage("Kart ödeme sistemi şu anda yapılandırılmadı. Havale/EFT seçebilirsiniz."); return; }

    if (paymentMethod === "BANK_TRANSFER" && !bankTransferReady) {
      try {
        const response = await fetch("/api/student/bank-transfer", {method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({action:"PREPARE_DRAFT",...(studentProfileId ? { studentProfileId } : { catalogEducationStage: cart?.beneficiary.educationStage, catalogGrade: cart?.beneficiary.grade }), legalAcceptance})});
        const body = await response.json().catch(()=>({}));
        if(!response.ok||!body.draft?.id||!body.draft?.reference||!Number.isSafeInteger(body.draft.expectedAmountMinor)) {setMessage(body.error||"Ödeme referansı hazırlanamadı. Para göndermeyin.");return;}
        setBankDraft(body.draft);
        setBankTransferReady(true);
      } catch {setMessage("Ödeme referansı hazırlanamadı. Para göndermeyin.");return;}
      setMessage("Bilgileriniz hazırlandı. Banka transferini yaptıktan sonra aşağıdaki bildirim formunu doldurun.");
      return;
    }

    if (paymentMethod === "BANK_TRANSFER" && bankTransferReady) { await submitBankTransfer(event); return; }

    const response = await fetch(
      "/api/student/orders",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type":
            "application/json",
          "idempotency-key":
            checkoutKey,
        },
        body: JSON.stringify({
          ...(studentProfileId ? { studentProfileId } : { catalogEducationStage: cart?.beneficiary.educationStage, catalogGrade: cart?.beneficiary.grade }),
          paymentMethod,
          shippingAddress:
            cart?.requiresShipping
              ? shipping
              : null,
          billing,
          legalAcceptance,
        }),
      },
    );

    const body = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      setMessage(
        body.error === "PAYTR_CUSTOMER_INFO_REQUIRED"
          ? "Kartla ödeme için ad, soyad, telefon ve fatura/iletişim adresini kontrol edin."
          : body.error === "SHIPPING_VAT_RATE_REQUIRED"
          ? "Sipariş oluşturulamadı: Kargo KDV oranı Owner tarafından henüz onaylanmamış. Lütfen destekle iletişime geçin; ödeme yapmayın."
          : body.error || "Sipariş oluşturulamadı.",
      );
      return;
    }

    const nextOrderId =
      body.order?.id || "";

    const summary=body.orderSummary as SavedOrderSummary;

    if (
      !nextOrderId ||
      !summary ||
      summary.id!==nextOrderId ||
      !Array.isArray(summary.items) ||
      !summary.items.length ||
      !Number.isSafeInteger(summary.totalMinor) ||
      summary.totalMinor<0 ||
      !["PAYTR","BANK_TRANSFER"].includes(summary.paymentMethod)
    ) {
      setMessage(
        "Sipari\u015f bilgileri do\u011frulanamad\u0131. \u00d6deme yapmadan yeniden deneyin."
      );
      return;
    }

    setSavedOrder(summary);
    setOrderId(nextOrderId);

    window.dispatchEvent(
      new CustomEvent(
        "fixoku:student-cart-updated",
      ),
    );

    if (
      paymentMethod ===
      "BANK_TRANSFER"
    ) {
      setMessage(
        "Sipariş oluşturuldu. Havale/EFT ödemeniz onaylanana kadar sipariş Ödeme Bekliyor durumunda kalacaktır.",
      );
      return;
    }

    setMessage(
      body.checkoutState ===
        "PAYMENT_PROVIDER_NOT_CONFIGURED"
        ? "Sipariş oluşturuldu; kart ödeme sistemi henüz yapılandırılmadı."
        : "Sipariş oluşturuldu. Güvenli kart ödeme adımına devam edebilirsiniz.",
    );
  };

  const submitBankTransfer = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/student/bank-transfer", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "idempotency-key": checkoutKey }, body: JSON.stringify({ draftId:bankDraft?.id, ...(studentProfileId ? { studentProfileId } : { catalogEducationStage: cart?.beneficiary.educationStage, catalogGrade: cart?.beneficiary.grade }), paymentMethod: "BANK_TRANSFER", shippingAddress: cart?.requiresShipping ? shipping : null, billing, legalAcceptance, payerName: transfer.payerName, bankName: transfer.bankName, reportedAmountMinor: transfer.reportedAmount, transferDate: transfer.transferDate, reference: transfer.reference, idempotencyKey: checkoutKey }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(body.error || "Havale/EFT bildirimi gönderilemedi."); return; }
    const summary = body.order;
    if(!summary?.id||body.bankReference!==bankDraft?.reference){setMessage("Sipariş referansı doğrulanamadı. Tekrar ödeme yapmayın.");return;}
    setSavedOrder({ bankReference:body.bankReference, id: summary.id, status: summary.status, paymentMethod: "BANK_TRANSFER", currency: summary.currency, subtotalMinor: Number(summary.totalMinor), shippingMinor: 0, totalMinor: Number(summary.totalMinor), requiresShipping: Boolean(cart?.requiresShipping), items: cart?.items.map((item) => ({ title: item.title, totalMinor: item.priceMinor, quantity: 1, currency: item.currency })) || [] });
    setOrderId(summary.id);
    const nextParams=new URLSearchParams(params);nextParams.set("orderId",summary.id);setParams(nextParams,{replace:true});
    setMessage(body.message || "Havale/EFT bildiriminiz alındı.");
  };

  if (state === "loading") {
    return (
      <StudentPanelShell
        user={user}
        guardian={guardian}
        studentProfileId={
          studentProfileId ||
          undefined
        }
      >
        <div
          className="trainer-panel"
          style={{
            display: "contents",
          }}
        >
          <main className="trainer-commerce-page">
            <p role="status">
              Checkout yükleniyor…
            </p>
          </main>
        </div>
      </StudentPanelShell>
    );
  }

  if (
    state === "error" ||
    !cart
  ) {
    return (
      <StudentPanelShell
        user={user}
        guardian={guardian}
        studentProfileId={
          studentProfileId ||
          undefined
        }
      >
        <div
          className="trainer-panel"
          style={{
            display: "contents",
          }}
        >
          <main className="trainer-commerce-page">
            <p role="alert">
              Checkout bilgileri
              yüklenemedi.
            </p>
          </main>
        </div>
      </StudentPanelShell>
    );
  }

  const bankReference = savedOrder?.bankReference || bankDraft?.reference || (orderId ? `FIXOKU-${orderId.slice(0,8).toUpperCase()}` : null);

  return (
    <StudentPanelShell
      user={user}
      guardian={guardian}
      studentProfileId={
        studentProfileId ||
        undefined
      }
    >
      <div
        className="trainer-panel"
        style={{
          display: "contents",
        }}
      >
        <main className="trainer-commerce-page">

          <div className="trainer-commerce-heading">
            <Link
              to={studentProfileId ? `/panel/ogrenci/sepet?studentProfileId=${encodeURIComponent(studentProfileId)}` : "/panel/ogrenci/sepet"}
            >
              ← Sepete dön
            </Link>

            <h2>{savedOrder?.paymentMethod === "PAYTR" ? (savedOrder.status === "PAID" ? "\u00d6deme tamamland\u0131" : "") : orderId ? "Sipari\u015f bilgileri" : "\u00d6demeye ge\u00e7in"}</h2>

            <p>
              Teslimat, fatura ve ödeme
              bilgilerinizi tamamlayın.
            </p>
          </div>

          {message && savedOrder?.paymentMethod !== "PAYTR" && (
            <p
              className="trainer-commerce-message"
              role="status"
            >
              {message}
            </p>
          )}

          {orderId && savedOrder &&
            savedOrder.paymentMethod ===
              "PAYTR" && ["PENDING_PAYMENT","PAYMENT_REVIEW"].includes(savedOrder.status) && (
              <section className="trainer-checkout-step">
                <h3>
                  Güvenli Kart Ödemesi
                </h3>

                <PaytrCheckout
                  orderId={orderId}
                  initialStatus={savedOrder.status}
                  statusUrl={`/api/student/orders?orderId=${encodeURIComponent(orderId)}`}
                  onPaymentState={(next: string) => setSavedOrder((current) => current ? ({ ...current, status: next === "succeeded" ? "PAID" : next === "review" ? "PAYMENT_REVIEW" : current.status }) : current)}
                  amountMinor={savedOrder.totalMinor}
                  summary={{
                    title:
                      savedOrder.items
                        .map(
                          (item) =>
                            item.title,
                        )
                        .join(", "),
                    price: money(
                      savedOrder.totalMinor,
                      savedOrder.currency,
                    ),
                    delivery:
                      savedOrder.requiresShipping
                        ? "Kargo"
                        : "Dijital / hizmet",
                  }}
                  legalReady={
                    legalReady
                  }
                />
              </section>
            )}



          {orderId && savedOrder && (savedOrder.paymentMethod !== "PAYTR" || savedOrder.status === "PAID") && (
  <PaymentResultR408
    status={savedOrder.status}
    paymentMethod={savedOrder.paymentMethod}
    reference={savedOrder.bankReference || orderId}
    total={money(savedOrder.totalMinor,savedOrder.currency)}
    packages={savedOrder.items.map(item=>item.title)}
    returnPath="/panel/ogrenci/paketler"
    returnLabel="Paketlerime dön"
  />
)}

          {!orderId && <form
            className={`trainer-checkout-layout r408-checkout ${paymentMethod === "BANK_TRANSFER" && bankTransferReady ? "r408-bank-stage" : ""}`}
            onSubmit={(event) =>
              void submit(event)
            }
          >
            <div className="trainer-checkout-main">
              {cart.requiresShipping && (
                <section className="trainer-checkout-step" hidden={paymentMethod === "BANK_TRANSFER" && bankTransferReady}>
                  <h3>
                    <span>1</span>
                    Teslimat Adresi
                  </h3>

                  <p className="fixoku-checkout-prefill-note">
                    Profilinizdeki bilgiler otomatik getirildi.
                    Gerekirse bu sipariş için değiştirebilirsiniz.
                  </p>

                  <div className="fixoku-checkout-three-grid">
                    <label>
                      Ad
                      <input
                        required
                        value={
                          shipping.firstName
                        }
                        onChange={(
                          event,
                        ) =>
                          setShipping({
                            ...shipping,
                            firstName:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Soyad
                      <input
                        required
                        value={
                          shipping.lastName
                        }
                        onChange={(
                          event,
                        ) =>
                          setShipping({
                            ...shipping,
                            lastName:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Telefon
                      <input
                        required
                        value={
                          shipping.phone
                        }
                        onChange={(
                          event,
                        ) =>
                          setShipping({
                            ...shipping,
                            phone:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>

                    <label>
                      İl
                      <select
                        required
                        value={
                          shipping.city
                        }
                        onChange={(
                          event,
                        ) =>
                          setShipping({
                            ...shipping,
                            city:
                              event
                                .target
                                .value,
                            district:
                              "",
                          })
                        }
                      >
                        <option value="">
                          İl seçin
                        </option>

                        {TURKEY_LOCATIONS.map(
                          (
                            province,
                          ) => (
                            <option
                              key={
                                province.plate
                              }
                              value={
                                province.name
                              }
                            >
                              {
                                province.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label>
                      İlçe
                      <select
                        required
                        disabled={
                          !shipping.city
                        }
                        value={
                          shipping.district
                        }
                        onChange={(
                          event,
                        ) =>
                          setShipping({
                            ...shipping,
                            district:
                              event
                                .target
                                .value,
                          })
                        }
                      >
                        <option value="">
                          {shipping.city
                            ? "İlçe seçin"
                            : "Önce il seçin"}
                        </option>

                        {districts.map(
                          (district) => (
                            <option
                              key={
                                district
                              }
                              value={
                                district
                              }
                            >
                              {district}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label>
                      Açık adres
                      <textarea
                        required
                        rows={1}
                        value={
                          shipping.addressLine
                        }
                        onChange={(
                          event,
                        ) =>
                          setShipping({
                            ...shipping,
                            addressLine:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>
                  </div>
                </section>
              )}

              <section className="trainer-checkout-step" hidden={paymentMethod === "BANK_TRANSFER" && bankTransferReady}>
                <h3>
                  <span>
                    {cart.requiresShipping
                      ? "2"
                      : "1"}
                  </span>
                  Fatura ve Kargo Bilgileri
                </h3>

                {!cart.requiresShipping && paymentMethod === "PAYTR" && (
                  <div className="fixoku-checkout-three-grid" aria-label="Dijital ödeme iletişim bilgileri">
                    <p>Bu bilgiler kart ödemesi ve fatura içindir; fiziksel kargo teslimatı yapılmaz.</p>
                    <label>Ad<input required autoComplete="given-name" value={billing.firstName} onChange={(event) => setBilling({ ...billing, firstName: event.target.value })} /></label>
                    <label>Soyad<input required autoComplete="family-name" value={billing.lastName} onChange={(event) => setBilling({ ...billing, lastName: event.target.value })} /></label>
                    <label>Telefon<input required type="tel" autoComplete="tel" value={billing.phone} onChange={(event) => setBilling({ ...billing, phone: event.target.value })} /></label>
                    <label>Fatura / iletişim adresi<textarea required rows={2} value={billing.addressLine} onChange={(event) => setBilling({ ...billing, addressLine: event.target.value })} /></label>
                  </div>
                )}

                <div className="trainer-choice-row">
                  <label>
                    <input
                      type="radio"
                      checked={
                        billing.type ===
                        "INDIVIDUAL"
                      }
                      onChange={() =>
                        setBilling({
                          ...billing,
                          type:
                            "INDIVIDUAL",
                          sameAsShipping:
                            true,
                        })
                      }
                    />
                    Bireysel Fatura
                  </label>

                  <label>
                    <input
                      type="radio"
                      checked={
                        billing.type ===
                        "CORPORATE"
                      }
                      onChange={() =>
                        setBilling({
                          ...billing,
                          type:
                            "CORPORATE",
                          sameAsShipping:
                            true,
                        })
                      }
                    />
                    Kurumsal Fatura
                  </label>
                </div>

                {billing.type ===
                "INDIVIDUAL" ? (
                  <div className="fixoku-invoice-fields fixoku-invoice-fields--single">
                    <label>
                      T.C. Kimlik Numarası
                      <input
                        required
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={11}
                        pattern="[0-9]{11}"
                        placeholder="11 haneli T.C. Kimlik No"
                        value={
                          billing.identityNumber
                        }
                        onChange={(
                          event,
                        ) =>
                          setBilling({
                            ...billing,
                            identityNumber:
                              cleanTc(
                                event
                                  .target
                                  .value,
                              ),
                          })
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <div className="fixoku-invoice-fields fixoku-invoice-fields--three">
                    <label>
                      Şirket / unvan
                      <input
                        required
                        value={
                          billing.companyName
                        }
                        onChange={(
                          event,
                        ) =>
                          setBilling({
                            ...billing,
                            companyName:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Vergi dairesi
                      <input
                        required
                        value={
                          billing.taxOffice
                        }
                        onChange={(
                          event,
                        ) =>
                          setBilling({
                            ...billing,
                            taxOffice:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Vergi numarası
                      <input
                        required
                        value={
                          billing.taxNumber
                        }
                        onChange={(
                          event,
                        ) =>
                          setBilling({
                            ...billing,
                            taxNumber:
                              event
                                .target
                                .value,
                          })
                        }
                      />
                    </label>
                  </div>
                )}


                {/* FIXOKU_021F_PARITY: gerçek kargo ürünleri, sepet API verisinden */}
                {cart.requiresShipping && (
                  <section className="fixoku-checkout-included" aria-label="Pakete dahil kargo ile gönderilecek kitaplar">
                    <h4>Pakete dahil kargo ile gönderilecek kitaplar</h4>
                    {cart.items.map((item, index) => {
                      const books = (item.products || [])
                        .filter((product) => product.productType === "PHYSICAL")
                        .map((product) => ({
                          componentId: product.packageComponentId || undefined,
                          sku: product.sku || "",
                          title: product.title || "Ürün bilgisi yüklenemedi",
                          quantity: Number(product.quantity || 1),
                          imageReference: product.imageReference,
                        }));
                      return books.length ? (
                        <div className="fixoku-checkout-included-package" key={`${item.title}-${index}`}>
                          {cart.items.length > 1 && <p className="fixoku-checkout-included-package-name">{item.title}</p>}
                          <TrainerPhysicalProducts items={books} />
                        </div>
                      ) : null;
                    })}
                    {!cart.items.some((item) => (item.products || []).some((product) => product.productType === "PHYSICAL")) && (
                      <p role="status" className="student-checkout-included-note">Pakete dahil ürün ayrıntıları henüz yüklenemedi. Siparişi oluşturmadan önce paket içeriğini kontrol edin.</p>
                    )}
                    <p className="fixoku-checkout-included-note">Ürünler paket fiyatına dahildir. Kargo bedeli ayrıca sipariş özetinde gösterilir.</p>
                  </section>
                )}
              </section>

              <section className="trainer-checkout-step" hidden={paymentMethod === "BANK_TRANSFER" && bankTransferReady}>
                <h3>
                  <span>
                    {cart.requiresShipping
                      ? "3"
                      : "2"}
                  </span>
                  Ödeme
                </h3>

                <InstallmentCampaignBanner showNote />
                <div className="trainer-choice-row">
                  <label>
                    <input
                      type="radio"
                      checked={
                        paymentMethod ===
                        "PAYTR"
                      }
                      onChange={() => {
                        setBankTransferReady(false);
                        setPaymentMethod(
                          "PAYTR",
                        );
                        setOrderId("");
                        setCheckoutKey(`student-checkout-${crypto.randomUUID()}`);
                      }}
                    />
                    Kredi / banka kartı (PayTR){paytrConfigured === false ? " · Yapılandırılmadı" : ""}
                  </label>

                  <label>
                    <input
                      type="radio"
                      checked={
                        paymentMethod ===
                        "BANK_TRANSFER"
                      }
                      onChange={() => {
                        setBankTransferReady(false);
                        setPaymentMethod(
                          "BANK_TRANSFER",
                        );
                        setOrderId("");
                        setCheckoutKey(`student-checkout-${crypto.randomUUID()}`);
                      }}
                    />
                    Havale / EFT
                  </label>
                </div>

              </section>



              <section className="trainer-checkout-step" hidden={paymentMethod === "BANK_TRANSFER" && bankTransferReady}>
                <h3>
                  <span>
                    {cart.requiresShipping
                      ? "4"
                      : "3"}
                  </span>
                  Onay
                </h3>

                <div className="trainer-legal-approval student-checkout-legal" aria-label="Yasal belgeler ve onaylar">
                  <p className="student-checkout-legal__intro">Yasal Belgeler ve Onaylar</p>
                  <div className="trainer-legal-approval__required">
                    <CheckoutLegalConsents
                      digitalOrService={!cart.requiresShipping}
                      onChange={(consents: { preInformation: boolean; distanceSales: boolean; privacy: boolean; marketing: boolean; commencement: boolean }) => setLegalAcceptance(consents)}
                    />
                  </div>
                  <details className="trainer-legal-approval__documents" style={{marginTop:12}}><summary style={{cursor:"pointer",padding:"12px 14px",border:"1px solid #e2e8f0",borderRadius:10,fontWeight:700}}>Diğer yasal belgeleri görüntüle (11 belge)</summary><div className="trainer-legal-approval__additional" aria-label="İncelenecek hukuki metinler" style={{paddingTop:12}}>
                    {[
                      ["Satıcı / Sağlayıcı Künyesi", "/satici-bilgileri"],
                      ["Üyelik ve Platform Kullanım Koşulları", "/uyelik-sozlesmesi"],
                      ["Ön Bilgilendirme Formu", "/on-bilgilendirme-formu"],
                      ["Mesafeli Satış Sözleşmesi", "/mesafeli-satis-sozlesmesi"],
                      ["İptal, İade ve Cayma Politikası", "/iptal-iade-cayma-politikasi"],
                      ["Teslimat ve Kargo Politikası", "/teslimat-kargo-politikasi"],
                      ["Dijital İçerik ve Hizmet Koşulları", "/dijital-icerik-ve-hizmet-kosullari"],
                      ["KVKK Aydınlatma Metni", "/kvkk-aydinlatma-metni"],
                      ["Çocuk ve Kanuni Temsilci Bilgilendirmesi", "/cocuk-ve-kanuni-temsilci-bilgilendirme"],
                      ["Gizlilik ve Bilgi Güvenliği Politikası", "/gizlilik-politikasi"],
                      ["Müşteri Şikâyetleri ve Uyuşmazlık", "/musteri-sikayetleri-ve-uyusmazlik"],
                    ].map(([title, href]) => (
                      <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="trainer-legal-approval__link trainer-legal-approval__chip">{title} ↗</a>
                    ))}
                  </div></details>
                  <p className="student-checkout-legal__note">Belgeler ayrı sekmede açılır; sipariş bilgilerinizi kaybetmeden inceleyebilirsiniz.</p>
                </div>

                <button
                  className="trainer-commerce-primary"
                  type="submit"
                  disabled={paymentMethod === "BANK_TRANSFER" && bankTransferReady}
                >
                  {paymentMethod === "BANK_TRANSFER" && bankTransferReady ? "Bildirim formunu doldurun" : "Ödemeye devam et"}
                </button>
              </section>
            </div>

            {paymentMethod === "BANK_TRANSFER" && bankTransferReady && bankDraft && (
  <section className="trainer-checkout-step" data-r408-bank-heading="true" aria-label="Havale / EFT ödeme bilgileri">
    <h2>Havale / EFT Ödeme</h2>
    <p>Gönderilecek tutar: {money(bankDraft.expectedAmountMinor, bankDraft.currency)}</p>
    <button type="button" onClick={() => setBankTransferReady(false)}>
      Ödeme bilgilerine dön
    </button>
  </section>
)}
{paymentMethod === "BANK_TRANSFER" && bankTransferReady && bankDraft && (
    <BankTransferPayment
      reference={bankDraft.reference}
      detailsVisible={true}
    />
)}
{paymentMethod === "BANK_TRANSFER" && bankTransferReady && !orderId && (
                <section className="trainer-checkout-step" aria-labelledby="student-bank-transfer-notification-title">
                  <h3 id="student-bank-transfer-notification-title">Havale / EFT Bildirimi</h3>
                  {bankDraft && <p><strong>Gönderilecek tutar: {money(bankDraft.expectedAmountMinor,bankDraft.currency)}</strong></p>}
                  <p>Transferi yaptıktan sonra aşağıdaki zorunlu alanları doldurun. Bildirim gönderilmeden sipariş ve muhasebe kaydı oluşturulmaz.</p>
                  <div className="trainer-checkout-fields">
                    <label>Ödeyen adı ve soyadı<input required value={transfer.payerName} onChange={(event) => setTransfer({ ...transfer, payerName: event.target.value })} /></label>
                    <label>Gönderen banka<input required value={transfer.bankName} onChange={(event) => setTransfer({ ...transfer, bankName: event.target.value })} /></label>
                    <label>Gönderilen tutar (TL)<input required inputMode="decimal" value={transfer.reportedAmount} onChange={(event) => setTransfer({ ...transfer, reportedAmount: event.target.value })} /></label>
                    <label>Transfer tarihi<input required type="date" value={transfer.transferDate} onChange={(event) => setTransfer({ ...transfer, transferDate: event.target.value })} /></label>
                    <label>Banka referans no<input required value={transfer.reference} onChange={(event) => setTransfer({ ...transfer, reference: event.target.value })} /></label>
                  </div>
                  <button className="trainer-commerce-primary" type="submit">Ödememi yaptım, bildirim gönder</button>
                </section>
              )}
<aside className="trainer-order-summary">
              <h3>Sipariş özeti</h3>

              {cart.items.map(
                (item) => (
                  <p key={item.title}>
                    {item.title}
                    <strong>
                      {money(
                        item.priceMinor,
                        item.currency,
                      )}
                    </strong>
                  </p>
                ),
              )}

              <dl>
                <div>
                  <dt>Ara toplam</dt>
                  <dd>
                    {money(
                      cart.subtotalMinor,
                      cart.currency,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Kargo</dt>
                  <dd>
                    {cart.shippingMinor
                      ? money(
                          cart.shippingMinor,
                          cart.currency,
                        )
                      : "Ücretsiz"}
                  </dd>
                </div>

                <div>
                  <dt>Toplam</dt>
                  <dd>
                    {money(
                      cart.totalMinor,
                      cart.currency,
                    )}
                  </dd>
                </div>
              </dl>
            </aside>
          </form>}
        </main>
      </div>
    </StudentPanelShell>
  );
}
