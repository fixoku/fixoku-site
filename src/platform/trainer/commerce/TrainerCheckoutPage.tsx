import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerPhysicalProducts, type TrainerPhysicalProduct } from "./TrainerPhysicalProducts";
import { BankTransferPayment } from "../../commerce/BankTransferPayment";
import PaytrCheckout from "../../commerce/PaytrCheckout.jsx";
import {
  TURKEY_LOCATIONS,
  getTurkeyDistricts,
} from "../../../data/turkeyLocations.js";
import "./trainer-commerce.css";

type PaymentMethod =
  | "PAYTR"
  | "BANK_TRANSFER";

type Address = {
  id?: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  addressLine: string;
  neighborhood?: string | null;
  postalCode?: string | null;
};

type TrainerProfile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  district?: string;
};

type Cart = {
  items: Array<{
    title: string;
    priceGrossMinor: number;
    currency: string;
    physicalItems?: TrainerPhysicalProduct[];
  }>;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
};

const money = (
  value: number,
  currency = "TRY",
) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);

const minor = (
  value: string,
) =>
  Math.round(
    Number(
      String(value).replace(
        ",",
        ".",
      ),
    ) * 100,
  );

function cleanTc(value: string) {
  return String(value || "")
    .replace(/\D/gu, "")
    .slice(0, 11);
}

function placeKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .toLocaleLowerCase("en-US")
    .trim();
}

function canonicalizeAddress(
  address: Address,
): Address {
  const province =
    TURKEY_LOCATIONS.find(
      (item) =>
        placeKey(item.name) ===
        placeKey(address.city),
    );

  if (!province) {
    return address;
  }

  const district =
    province.districts.find(
      (item) =>
        placeKey(item) ===
        placeKey(
          address.district,
        ),
    ) || "";

  return {
    ...address,
    city: province.name,
    district,
  };
}

const initial: Address = {
  title: "Teslimat Adresi",
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  district: "",
  addressLine: "",
};


// Convert Owner Markdown source to a legible plain-text view without changing the archived original.
function legalPlainText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gmu, "")
    .replace(/`/gu, "")
    .replace(/^---\s*$/gmu, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .trim();
}
// Real order and customer values are bold in the preview, with the source template unchanged.
function legalPreviewBody(markdown: string) {
  return legalPlainText(markdown).split(/(\*\*[\s\S]*?\*\*)/gu).map((piece,index)=>
    piece.startsWith("**") && piece.endsWith("**")
      ? <strong key={index}>{piece.slice(2,-2)}</strong>
      : <span key={index}>{piece}</span>
  );
}

// Mevcut Fixoku yasal sayfalarini kullanir; yeni sozlesme metni uretmez.
type TrainerLegalDocument = { title: string; path: string; code: string };
const trainerLegalDocuments: readonly TrainerLegalDocument[] = [
  { code: "PRE_INFO", title: "Ön Bilgilendirme Formu", path: "/on-bilgilendirme-formu" },
  { code: "DISTANCE", title: "Mesafeli Satış Sözleşmesi", path: "/mesafeli-satis-sozlesmesi" },
  { code: "WITHDRAWAL", title: "İptal, İade ve Cayma Politikası", path: "/iptal-iade-cayma-politikasi" },
  { code: "DELIVERY", title: "Teslimat ve Kargo Politikası", path: "/teslimat-kargo-politikasi" },
  { code: "DIGITAL", title: "Dijital İçerik ve Hizmet Koşulları", path: "/dijital-icerik-ve-hizmet-kosullari" },
  { code: "MEMBERSHIP", title: "Üyelik Sözleşmesi", path: "/uyelik-sozlesmesi" },
  { code: "TERMS", title: "Kullanım Koşulları", path: "/kullanim-kosullari" },
  { code: "KVKK", title: "KVKK Aydınlatma Metni", path: "/kvkk-aydinlatma-metni" },
] as const;

export function TrainerCheckoutPage({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
  };
}) {
  const navigate = useNavigate();
  const [params] =
    useSearchParams();

  const [cart, setCart] =
    useState<Cart | null>(null);

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [address, setAddress] =
    useState<Address>(initial);

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
    });

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(
      "PAYTR",
    );

  const [message, setMessage] =
    useState("");

  // Yerel onizleme: kullanicinin onceki sayfalardaki isaretli tercih gorunumunu korur.
  // Bu isaretler tek basina hukuken gecerli riza/ispat kaydi yerine gecmez.
  const [preInfoAcknowledged, setPreInfoAcknowledged] = useState(false);
  const [distanceAcknowledged, setDistanceAcknowledged] = useState(false);
  const [activeLegalDocument, setActiveLegalDocument] = useState<TrainerLegalDocument | null>(null);
  const [legalBodies, setLegalBodies] = useState<Record<string, { markdown: string; sourceSha256: string; version: string }>>({});
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalError, setLegalError] = useState("");
  const [legalPreview, setLegalPreview] = useState<{code:string;markdown:string;ready:boolean;missingFields:string[];legalReviewRequired:boolean}|null>(null);
  useEffect(() => {
    void Promise.all(["PRE_INFO", "DISTANCE"].map(async code => {
      const r = await fetch(`/api/trainer/legal-documents?code=${code}`, { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error("Yasal belgeler yüklenemedi.");
      return r.json();
    })).then(rows => setLegalBodies(current => ({ ...current, ...Object.fromEntries(rows.map(row => [row.code, row])) }))).catch(() => setLegalError("Sözleşme metinleri yüklenemedi. Sipariş oluşturmadan önce sayfayı yenileyin."));
  }, []);
  async function openLegalDocument(document: TrainerLegalDocument) {
    setActiveLegalDocument(document);
    setLegalPreview(null);
    setLegalError("");
    setLegalLoading(true);
    try {
      const r = await fetch(`/api/trainer/legal-documents?code=${encodeURIComponent(document.code)}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({shippingAddress: address, paymentMethod}),
      });
      const next = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(String(next.error || "LEGAL_PREVIEW_UNAVAILABLE"));
      setLegalPreview(next);
    } catch(error) {
      setLegalError(error instanceof Error ? error.message : "Sözleşme hazırlanamadı.");
    } finally { setLegalLoading(false); }
  }



  const [state, setState] =
    useState("loading");

  const [orderId, setOrderId] =
    useState(
      params.get("orderId") || "",
    );

  const [checkoutKey] = useState(() => `trainer-checkout-${crypto.randomUUID()}`);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    id: string; status: string; paymentMethod: string; totalMinor: number;
    createdAt?: string; items?: Array<{title: string}>;
  } | null>(null);
  const [confirmationState, setConfirmationState] = useState<'loading'|'verified'|'error'>('loading');
  useEffect(() => {
    if (!orderId) { setConfirmedOrder(null); setConfirmationState('loading'); return; }
    let active = true;
    setConfirmationState('loading');
    void fetch('/api/trainer/orders', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('ORDER_LIST_UNAVAILABLE');
        const result = await response.json() as {orders?: Array<{id:string;status:string;paymentMethod:string;totalMinor:number;createdAt?:string;items?:Array<{title:string}>}>};
        const match = result.orders?.find(item => item.id === orderId);
        if (!match) throw new Error('ORDER_NOT_FOUND');
        if (active) { setConfirmedOrder(match); setConfirmationState('verified'); }
      }).catch(() => { if (active) setConfirmationState('error'); });
    return () => { active = false; };
  }, [orderId]);

  const [transfer, setTransfer] =
    useState({
      payerName: user.name,
      bankName: "",
      reportedAmountMinor: "",
      transferDate:
        new Date()
          .toISOString()
          .slice(0, 10),
      reference: "",
      receiptReference: "",
    });


  useEffect(() => {
    if (!activeLegalDocument) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveLegalDocument(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [activeLegalDocument]);

  const districts =
    getTurkeyDistricts(
      address.city,
    );

  const load = async () => {
    try {
      const [
        cartResponse,
        addressResponse,
        profileResponse,
      ] =
        await Promise.all([
          fetch(
            "/api/trainer/cart",
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),
          fetch(
            "/api/trainer/addresses",
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),
          fetch(
            "/api/trainer/profile",
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),
        ]);

      if (
        !cartResponse.ok ||
        !addressResponse.ok
      ) {
        throw new Error(
          "CHECKOUT_LOAD_FAILED",
        );
      }

      const nextCart =
        await cartResponse.json();

      const nextAddresses =
        await addressResponse.json();

      let profile:
        TrainerProfile = {};

      if (profileResponse.ok) {
        const profileBody =
          await profileResponse
            .json()
            .catch(() => ({}));

        profile =
          profileBody.profile ||
          {};
      }

      const savedAddresses:
        Address[] =
        nextAddresses.addresses ||
        [];

      setCart(nextCart);

      setAddresses(
        savedAddresses.map(
          canonicalizeAddress,
        ),
      );

      if (
        savedAddresses.length
      ) {
        setAddress(
          canonicalizeAddress(
            savedAddresses[0],
          ),
        );
      } else {
        setAddress({
          ...initial,
          firstName:
            String(
              profile.firstName ||
                "",
            ),
          lastName:
            String(
              profile.lastName ||
                "",
            ),
          phone:
            String(
              profile.phone || "",
            ),
          city:
            String(
              profile.city || "",
            ),
          district:
            String(
              profile.district ||
                "",
            ),
        });
      }

      setBilling((current) => ({
        ...current,
        firstName:
          String(
            profile.firstName ||
              "",
          ),
        lastName:
          String(
            profile.lastName ||
              "",
          ),
        sameAsShipping: true,
      }));

      setTransfer(
        (current) => ({
          ...current,
          payerName:
            `${String(
              profile.firstName ||
                "",
            ).trim()} ${String(
              profile.lastName ||
                "",
            ).trim()}`.trim() ||
            user.name,
        }),
      );

      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveAddress =
    async () => {
      const payload: Address = {
        ...address,
        title:
          address.title ||
          "Teslimat Adresi",
        neighborhood: null,
        postalCode: null,
      };

      const response =
        await fetch(
          "/api/trainer/addresses",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          body.error ||
            "Adres kaydedilemedi.",
        );
        return false;
      }

      const saved =
        canonicalizeAddress(
          body.address,
        );

      setAddress(saved);

      setAddresses(
        (items) => [
          saved,
          ...items,
        ],
      );

      return true;
    };

  const submitTransfer =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      const response =
        await fetch(
          "/api/trainer/bank-transfer",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                ...transfer,
                orderId,
                reportedAmountMinor:
                  minor(
                    transfer.reportedAmountMinor,
                  ),
              }),
          },
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      setMessage(
        response.ok
          ? "Havale/EFT bildiriminiz alındı. Erişim, ödeme onayından sonra açılır."
          : body.error ||
              "Havale/EFT bildirimi gönderilemedi.",
      );
    };

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    setMessage("");

    if (!preInfoAcknowledged || !distanceAcknowledged) {
      setMessage("Sipariş oluşturmak için ön bilgilendirme ve mesafeli satış koşullarını onaylamanız gerekir.");
      return;
    }

    if (!legalBodies.PRE_INFO?.sourceSha256 || !legalBodies.DISTANCE?.sourceSha256) {
      setMessage("Yasal belgelerin kaynak sürümü doğrulanamadı. Sayfayı yenileyin."); return;
    }
    if (!cart?.items.length) {
      setMessage(
        "Sepetiniz boş.",
      );
      return;
    }

    if (
      billing.type ===
        "INDIVIDUAL" &&
      !/^\d{11}$/u.test(
        billing.identityNumber,
      )
    ) {
      setMessage(
        "Bireysel fatura için 11 haneli T.C. Kimlik Numarası gereklidir.",
      );
      return;
    }

    const valid =
      address.id ||
      (await saveAddress());

    if (!valid) return;

    const response =
      await fetch(
        "/api/trainer/orders",
        {
          method: "POST",
          credentials:
            "include",
          headers: {
            "content-type":
              "application/json",
            "idempotency-key":
              checkoutKey,
          },
          body:
            JSON.stringify({
              paymentMethod,
              shippingAddress: {
                ...address,
                neighborhood: "",
                postalCode: "",
              },
              billing,
              legalAcceptance: { preInformation: preInfoAcknowledged, distanceSales: distanceAcknowledged, documentHashes: { PRE_INFO: legalBodies.PRE_INFO.sourceSha256, DISTANCE: legalBodies.DISTANCE.sourceSha256 } },
            }),
        },
      );

    const body =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      setMessage(
        body.error ||
          "Sipariş oluşturulamadı.",
      );
      return;
    }

    const nextOrderId =
      body.order?.id || "";

    setOrderId(
      nextOrderId,
    );

    if (
      paymentMethod ===
      "PAYTR"
    ) {
      setMessage(
        body.paytr?.status ===
          "CONFIGURED"
          ? "PayTR ödeme ekranı hazırlanıyor."
          : "PayTR henüz yapılandırılmadı. Sipariş ödeme bekliyor.",
      );
    } else {
      setMessage(
        "Sipariş hazır. Aşağıdaki Havale/EFT bilgilerini kullanın ve ardından ödemenizi bildirin.",
      );
    }

    navigate(
      `/panel/egitmen/checkout?orderId=${nextOrderId}`,
      {
        replace: true,
      },
    );
  };

  if (
    state === "loading"
  ) {
    return (
      <PanelShell user={user}>
        <main className="trainer-commerce-page">
          <p role="status">
            Checkout yükleniyor…
          </p>
        </main>
      </PanelShell>
    );
  }

  if (
    state === "error"
  ) {
    return (
      <PanelShell user={user}>
        <main className="trainer-commerce-page">
          <p role="alert">
            Checkout bilgileri
            yüklenemedi.
          </p>
        </main>
      </PanelShell>
    );
  }

  const bankReference =
    orderId
      ? `FIXOKU-${orderId
          .slice(0, 8)
          .toUpperCase()}`
      : null;

  if (orderId && confirmationState === 'loading') return <PanelShell user={user}><main className="trainer-commerce-page"><p role="status">Sipariş kaydı doğrulanıyor...</p></main></PanelShell>;
  if (orderId && (confirmationState === 'error' || !confirmedOrder)) return <PanelShell user={user}><main className="trainer-commerce-page"><p role="alert">Sipariş kaydı doğrulanamadı. Ödeme durumu için hesabınızdaki siparişleri kontrol edin.</p><Link to="/panel/egitmen/egitimlerim">Eğitimlerim</Link></main></PanelShell>;

  return (
    <PanelShell user={user}>
      <main className="trainer-commerce-page">
        <div className="trainer-commerce-heading">
          <Link to="/panel/egitmen/sepet">
            ← Sepete dön
          </Link>

          <h2>{confirmedOrder ? "Siparişiniz Alındı" : "Ödemeye Geçin"}</h2>

          <p>
            Teslimat, fatura ve ödeme
            bilgilerinizi tamamlayın.
          </p>
        </div>

        {message && (
          <p
            className="trainer-commerce-message"
            role="status"
          >
            {message}
          </p>
        )}

        {confirmedOrder && <section className="trainer-checkout-step" aria-labelledby="trainer-order-success-heading">
          <h2 id="trainer-order-success-heading">Siparişiniz alındı</h2>
          <p>Numara: <strong>{confirmedOrder.id}</strong></p>
          <p>Toplam: <strong>{money(Number(confirmedOrder.totalMinor || 0))}</strong></p>
          <p>Durum: <strong>{confirmedOrder.status === 'PAID' ? 'Ödendi' : confirmedOrder.paymentMethod === 'BANK_TRANSFER' ? 'Havale/EFT doğrulaması bekleniyor' : 'Ödeme bekleniyor'}</strong></p>
          {confirmedOrder.paymentMethod === 'PAYTR' && confirmedOrder.status === 'PENDING_PAYMENT' && (
            <PaytrCheckout
              orderId={confirmedOrder.id}
              legalReady={true}
              summary={{
                title: (confirmedOrder.items || []).map((item) => item.title).filter(Boolean).join(', ') || 'Eğitmen eğitim paketi',
                price: money(Number(confirmedOrder.totalMinor || 0)),
                delivery: 'Satın alınan eğitim ve varsa fiziksel ürünler',
              }}
            />
          )}
          {confirmedOrder.paymentMethod === 'PAYTR' && confirmedOrder.status !== 'PAID' && confirmedOrder.status !== 'PENDING_PAYMENT' && <p>Bu siparişin ödeme durumu yeniden incelenmelidir. Ödeme yetkilendirmesi henüz yapılmadı.</p>}
          <Link to="/panel/egitmen/egitimlerim">Eğitimlerime dön</Link>
        </section>}

        {confirmedOrder &&
          confirmedOrder.paymentMethod ===
            "BANK_TRANSFER" && (
            <>
              <section className="trainer-checkout-step">
                <BankTransferPayment
                  reference={
                    bankReference
                  }
                />
              </section>

              <form
                className="trainer-checkout-step trainer-bank-transfer-form"
                onSubmit={(event) =>
                  void submitTransfer(
                    event,
                  )
                }
              >
                <h3>
                  Havale / EFT Bildirimi
                </h3>

                <p>
                  Ödemenizi yaptıktan sonra
                  aşağıdaki bilgileri girin.
                  Bildirim tek başına erişim
                  açmaz; yönetici onayı
                  beklenir.
                </p>

                <div className="trainer-checkout-fields">
                  <label>
                    Ödeyen adı
                    <input
                      required
                      value={
                        transfer.payerName
                      }
                      onChange={(
                        event,
                      ) =>
                        setTransfer({
                          ...transfer,
                          payerName:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Gönderen banka
                    <input
                      required
                      value={
                        transfer.bankName
                      }
                      onChange={(
                        event,
                      ) =>
                        setTransfer({
                          ...transfer,
                          bankName:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Gönderilen tutar (TL)
                    <input
                      required
                      inputMode="decimal"
                      value={
                        transfer.reportedAmountMinor
                      }
                      onChange={(
                        event,
                      ) =>
                        setTransfer({
                          ...transfer,
                          reportedAmountMinor:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Transfer tarihi
                    <input
                      required
                      type="date"
                      value={
                        transfer.transferDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setTransfer({
                          ...transfer,
                          transferDate:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Banka referans no
                    <input
                      required
                      value={
                        transfer.reference
                      }
                      onChange={(
                        event,
                      ) =>
                        setTransfer({
                          ...transfer,
                          reference:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Makbuz referansı
                    <input
                      value={
                        transfer.receiptReference
                      }
                      onChange={(
                        event,
                      ) =>
                        setTransfer({
                          ...transfer,
                          receiptReference:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>
                </div>

                <button
                  className="trainer-commerce-primary"
                  type="submit"
                >
                  Havale/EFT bildirimini gönder
                </button>
              </form>
            </>
          )}

        {!confirmedOrder && <form
          className="trainer-checkout-layout"
          onSubmit={(event) =>
            void submit(event)
          }
        >
          <div className="trainer-checkout-main">
            <section className="trainer-checkout-step">
              <h3>
                <span>1</span>
                Teslimat Adresi
              </h3>

              <p className="fixoku-checkout-prefill-note">
                Profil ve kayıtlı adres bilgileriniz
                otomatik getirildi. Gerekirse bu sipariş
                için değiştirebilirsiniz.
              </p>

              {addresses.length >
                0 && (
                <label className="fixoku-saved-address-select">
                  Kayıtlı adres
                  <select
                    value={
                      address.id ||
                      ""
                    }
                    onChange={(
                      event,
                    ) => {
                      const next =
                        addresses.find(
                          (item) =>
                            item.id ===
                            event
                              .target
                              .value,
                        );

                      if (next) {
                        setAddress(
                          canonicalizeAddress(
                            next,
                          ),
                        );
                      }
                    }}
                  >
                    {addresses.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.title} ·{" "}
                          {item.city}/
                          {
                            item.district
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}

              <div className="fixoku-checkout-three-grid">
                <label>
                  Ad
                  <input
                    required
                    value={
                      address.firstName
                    }
                    onChange={(
                      event,
                    ) =>
                      setAddress({
                        ...address,
                        id: undefined,
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
                      address.lastName
                    }
                    onChange={(
                      event,
                    ) =>
                      setAddress({
                        ...address,
                        id: undefined,
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
                      address.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      setAddress({
                        ...address,
                        id: undefined,
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
                      address.city
                    }
                    onChange={(
                      event,
                    ) =>
                      setAddress({
                        ...address,
                        id: undefined,
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
                      !address.city
                    }
                    value={
                      address.district
                    }
                    onChange={(
                      event,
                    ) =>
                      setAddress({
                        ...address,
                        id: undefined,
                        district:
                          event
                            .target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      {address.city
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
                      address.addressLine
                    }
                    onChange={(
                      event,
                    ) =>
                      setAddress({
                        ...address,
                        id: undefined,
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

            <section className="trainer-checkout-step">
              <h3>
                <span>2</span>
                Fatura ve Kargo Bilgileri
              </h3>

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


              {Boolean(cart?.items.some((item) => (item.physicalItems?.length || 0) > 0)) && (
                <section className="fixoku-checkout-included" aria-label="Pakete dahil kargo ile gönderilecek kitaplar">
                  <h4>Pakete dahil kargo ile gönderilecek kitaplar</h4>
                  {cart?.items.map((item, index) => Boolean(item.physicalItems?.length) && (
                    <div className="fixoku-checkout-included-package" key={`${item.title}-${index}`}>
                      {(cart?.items.length || 0) > 1 && <p className="fixoku-checkout-included-package-name">{item.title}</p>}
                      <TrainerPhysicalProducts items={item.physicalItems || []} />
                    </div>
                  ))}
                  <p className="fixoku-checkout-included-note">Bu ürünler paket fiyatına dahildir. Ayrıca ürün bedeli eklenmez.</p>
                </section>
              )}
            </section>

            <section className="trainer-checkout-step">
              <h3>
                <span>3</span>
                Ödeme
              </h3>

              <div className="trainer-choice-row">
                <label>
                  <input
                    type="radio"
                    checked={
                      paymentMethod ===
                      "PAYTR"
                    }
                    onChange={() =>
                      setPaymentMethod(
                        "PAYTR",
                      )
                    }
                  />
                  Kredi / banka kartı
                  (PayTR)
                </label>

                <label>
                  <input
                    type="radio"
                    checked={
                      paymentMethod ===
                      "BANK_TRANSFER"
                    }
                    onChange={() =>
                      setPaymentMethod(
                        "BANK_TRANSFER",
                      )
                    }
                  />
                  Havale / EFT
                </label>
              </div>

              {paymentMethod ===
                "BANK_TRANSFER" && (
                <BankTransferPayment
                  reference={
                    bankReference
                  }
                />
              )}

              {paymentMethod ===
                "PAYTR" && (
                <>
                  <div className="fixoku-paytr-brand">
                    <img
                      src="/images/payments/paytr.svg"
                      alt="PayTR güvenli ödeme"
                    />
                  </div>

                  <p className="trainer-checkout-note">
                    Sipariş oluşturulduktan sonra güvenli PayTR ödeme alanı açılır.
                  </p>
                </>
              )}
            </section>

            <section className="trainer-checkout-step">
              <h3>
                <span>4</span>
                Onay
              </h3>

              <div className="trainer-legal-approval" aria-label="Yasal metinler ve onaylar">
                <div className="trainer-legal-approval__required">
                  <div className="trainer-legal-approval__line">
                    <label className="trainer-legal-approval__tick" htmlFor="trainer-pre-info-consent">
                      <input
                        id="trainer-pre-info-consent"
                        required
                        type="checkbox"
                        checked={preInfoAcknowledged}
                        onChange={(event) => setPreInfoAcknowledged(event.target.checked)}
                      />
                      <span>Okudum, bilgilendirildim:</span>
                    </label>
                    <button type="button" className="trainer-legal-approval__link" onClick={() => void openLegalDocument(trainerLegalDocuments[0]!)}>
                      Ön Bilgilendirme Formu
                    </button>
                  </div>
                  <div className="trainer-legal-approval__line">
                    <label className="trainer-legal-approval__tick" htmlFor="trainer-distance-consent">
                      <input
                        id="trainer-distance-consent"
                        required
                        type="checkbox"
                        checked={distanceAcknowledged}
                        onChange={(event) => setDistanceAcknowledged(event.target.checked)}
                      />
                      <span>Okudum, kabul ediyorum:</span>
                    </label>
                    <button type="button" className="trainer-legal-approval__link" onClick={() => void openLegalDocument(trainerLegalDocuments[1]!)}>
                      Mesafeli Satış Sözleşmesi
                    </button>
                  </div>
                </div>
                <div className="trainer-legal-approval__additional" aria-label="Diğer yasal bilgilendirmeler">
                  {trainerLegalDocuments.slice(2).map((document) => (
                    <button
                      type="button"
                      key={document.code}
                      className="trainer-legal-approval__link trainer-legal-approval__chip"
                      onClick={() => void openLegalDocument(document)}
                    >
                      {document.title}
                    </button>
                  ))}
                </div>
                {legalError && <p role="alert" className="trainer-legal-error">{legalError}</p>}
              </div>

              <button
                className="trainer-commerce-primary"
                type="submit"
              >
                Siparişi oluştur
              </button>
            </section>
          </div>

          <aside className="trainer-order-summary">
            <h3>Sipariş özeti</h3>

            {cart?.items.map(
              (item) => (
                <p key={item.title}>
                  {item.title}
                  <strong>
                    {money(
                      item.priceGrossMinor,
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
                    cart?.subtotalMinor ||
                      0,
                  )}
                </dd>
              </div>

              <div>
                <dt>Kargo</dt>
                <dd>
                  {money(
                    cart?.shippingMinor ||
                      0,
                  )}
                </dd>
              </div>

              <div>
                <dt>Toplam</dt>
                <dd>
                  {money(
                    cart?.totalMinor ||
                      0,
                  )}
                </dd>
              </div>
            </dl>
          </aside>
        </form>}
        {activeLegalDocument && (
          <div
            className="trainer-legal-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setActiveLegalDocument(null);
            }}
          >
            <section
              className="trainer-legal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="trainer-legal-dialog-title"
            >
              <header className="trainer-legal-dialog__header">
                <div>
                  <small>FİXOKU · Yasal Bilgilendirme</small>
                  <h3 id="trainer-legal-dialog-title">{activeLegalDocument.title}</h3>
                </div>
                <button type="button" className="trainer-legal-dialog__close" aria-label="Pencereyi kapat" onClick={() => setActiveLegalDocument(null)}>✕</button>
              </header>
              <div className="trainer-legal-dialog__content" tabIndex={0}>
                <div className="trainer-legal-dialog__buyer">
                  <strong>Bu alışverişe ait bilgiler</strong>
                  <p><b>Alıcı:</b> {`${address.firstName} ${address.lastName}`.trim() || user.name} · {user.email}</p>
                  <p><b>Teslimat:</b> {[address.addressLine, address.district, address.city].filter(Boolean).join(", ")}</p>
                  <p><b>Sipariş toplamı:</b> {money(cart?.totalMinor || 0)} · <b>Kargo:</b> {money(cart?.shippingMinor || 0)}</p>
                  <p><b>Paketler:</b> {cart?.items.map(item => item.title).join(" · ") || "Sepette ürün yok"}</p>
                  <small>Kesin sözleşme kaydı, sipariş oluşturulurken bu bilgiler ve belge sürümüyle hazırlanır.</small>
                </div>
                {legalLoading ? <p>Belge hazırlanıyor...</p> : legalPreview?.code === activeLegalDocument.code ? (
                  <>
                    {!legalPreview.ready && <p role="alert" className="trainer-commerce-message">Bu metin henüz satış onayına hazır değil. {legalPreview.missingFields.length ? `Eksik alanlar: ${legalPreview.missingFields.join(", ")}.` : "Owner kaynak belgesindeki hukuki doğrulamalar bekleniyor."}</p>}
                    <pre className="trainer-legal-dialog__plain">{legalPreviewBody(legalPreview.markdown)}</pre>
                  </>
                ) : <p role="alert">{legalError || "Sipariş bilgileriyle sözleşme hazırlanamadı."}</p>}
              </div>
              <footer className="trainer-legal-dialog__footer">
                <span>Owner belge kütüphanesindeki kaynak metin; onay durumuna ilişkin ibareler değiştirilmemiştir.</span>
                <div><button type="button" className="trainer-legal-dialog__done" onClick={() => setActiveLegalDocument(null)}>Kapat</button></div>
              </footer>
            </section>
          </div>
        )}
      </main>
    </PanelShell>
  );
}