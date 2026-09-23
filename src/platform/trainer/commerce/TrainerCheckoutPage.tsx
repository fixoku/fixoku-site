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
import { BankTransferPayment } from "../../commerce/BankTransferPayment";
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

  const [state, setState] =
    useState("loading");

  const [orderId, setOrderId] =
    useState(
      params.get("orderId") || "",
    );

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
              `trainer-checkout-${address.id || Date.now()}`,
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

  return (
    <PanelShell user={user}>
      <main className="trainer-commerce-page">
        <div className="trainer-commerce-heading">
          <Link to="/panel/egitmen/sepet">
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

        <form
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

              <label className="trainer-checkout-check">
                <input
                  required
                  type="checkbox"
                />
                Ön bilgilendirme ve mesafeli
                satış koşullarını okudum.
              </label>

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
        </form>
      </main>
    </PanelShell>
  );
}