import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StudentPanelShell } from "./StudentPanelShell";
import PaytrCheckout from "../commerce/PaytrCheckout.jsx";
import CheckoutLegalConsents from "../commerce/CheckoutLegalConsents.jsx";
import { BankTransferPayment } from "../commerce/BankTransferPayment";
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
    title: string;
    priceMinor: number;
    currency: string;
  }>;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  requiresShipping: boolean;
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
  const [params] = useSearchParams();

  const studentProfileId =
    params.get("studentProfileId") || "";

  const [cart, setCart] =
    useState<Cart | null>(null);

  const [state, setState] =
    useState("loading");

  const [message, setMessage] =
    useState("");

  const [orderId, setOrderId] =
    useState("");

  const [legalReady, setLegalReady] =
    useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("PAYTR");

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
    });

  const districts =
    getTurkeyDistricts(shipping.city);

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

    const response = await fetch(
      "/api/student/orders",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type":
            "application/json",
          "idempotency-key":
            `student-checkout-${studentProfileId}-${paymentMethod}-${cart?.items
              .map(
                (item) =>
                  item.title,
              )
              .join("-")}`,
        },
        body: JSON.stringify({
          ...(studentProfileId ? { studentProfileId } : { catalogEducationStage: cart?.beneficiary.educationStage, catalogGrade: cart?.beneficiary.grade }),
          paymentMethod,
          shippingAddress:
            cart?.requiresShipping
              ? shipping
              : null,
          billing,
        }),
      },
    );

    const body = await response
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

  const bankReference =
    orderId
      ? `FIXOKU-${orderId
          .slice(0, 8)
          .toUpperCase()}`
      : null;

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

            <h2>Ödemeye Geçin</h2>

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

          {orderId &&
            paymentMethod ===
              "PAYTR" && (
              <section className="trainer-checkout-step">
                <h3>
                  Güvenli Kart Ödemesi
                </h3>

                <PaytrCheckout
                  orderId={orderId}
                  summary={{
                    title:
                      cart.items
                        .map(
                          (item) =>
                            item.title,
                        )
                        .join(", "),
                    price: money(
                      cart.totalMinor,
                      cart.currency,
                    ),
                    delivery:
                      cart.requiresShipping
                        ? "Kargo"
                        : "Dijital / hizmet",
                  }}
                  legalReady={
                    legalReady
                  }
                />
              </section>
            )}

          {orderId &&
            paymentMethod ===
              "BANK_TRANSFER" && (
              <section className="trainer-checkout-step">
                <BankTransferPayment
                  reference={
                    bankReference
                  }
                />
              </section>
            )}

          <form
            className="trainer-checkout-layout"
            onSubmit={(event) =>
              void submit(event)
            }
          >
            <div className="trainer-checkout-main">
              {cart.requiresShipping && (
                <section className="trainer-checkout-step">
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

              <section className="trainer-checkout-step">
                <h3>
                  <span>
                    {cart.requiresShipping
                      ? "2"
                      : "1"}
                  </span>
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


                {cart.requiresShipping && (
                  <div className="fixoku-shipping-preview">
                    <div className="fixoku-shipping-preview__image-placeholder">
                      Ürün görseli
                    </div>
                    <div>
                      <strong>Fiziksel ürün</strong>
                      <p>
                        Ödeme tamamlandıktan sonra Hazırlanıyor durumuna alınır.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="trainer-checkout-step">
                <h3>
                  <span>
                    {cart.requiresShipping
                      ? "3"
                      : "2"}
                  </span>
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
                      onChange={() => {
                        setPaymentMethod(
                          "PAYTR",
                        );
                        setOrderId("");
                      }}
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
                      onChange={() => {
                        setPaymentMethod(
                          "BANK_TRANSFER",
                        );
                        setOrderId("");
                      }}
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
                  <span>
                    {cart.requiresShipping
                      ? "4"
                      : "3"}
                  </span>
                  Onay
                </h3>

                <CheckoutLegalConsents
                  digitalOrService={
                    !cart.requiresShipping
                  }
                  onChange={(
                    consents: {
                      preInformation: boolean;
                      distanceSales: boolean;
                      privacy: boolean;
                    },
                  ) =>
                    setLegalReady(
                      Boolean(
                        consents.preInformation &&
                          consents.distanceSales &&
                          consents.privacy,
                      ),
                    )
                  }
                />

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
          </form>
        </main>
      </div>
    </StudentPanelShell>
  );
}
