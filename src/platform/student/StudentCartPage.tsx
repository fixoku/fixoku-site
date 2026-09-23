import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StudentPanelShell } from "./StudentPanelShell";
import { TrainerIcon } from "../trainer/components/TrainerIcon";
import "../trainer/commerce/trainer-commerce.css";
import "./student-portal.css";

type CartItem = {
  packageVersionId: string;
  title: string;
  subtitle: string;
  priceMinor: number;
  currency: string;
  shippingFeeMinor: number;
  requiresShipping: boolean;
  products: Array<{
    title: string;
    productType: string;
    quantity: number;
  }>;
};

type Cart = {
  beneficiary: {
    studentProfileId?: string | null;
    educationStage?: string | null;
    grade?: string | null;
    studentName?: string;
  };
  items: CartItem[];
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  requiresShipping: boolean;
};

const money = (minor: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(minor / 100);

export function StudentCartPage({
  user,
  guardian,
}: {
  user: { name: string; email?: string };
  guardian: boolean;
}) {
  const navigate = useNavigate();
  const query = window.location.search;
  const [cart, setCart] = useState<Cart | null>(null);
  const [state, setState] = useState("loading");
  const accountQuery = cart?.beneficiary?.educationStage ? `?catalogEducationStage=${encodeURIComponent(cart.beneficiary.educationStage)}${cart.beneficiary.grade ? `&catalogGrade=${encodeURIComponent(cart.beneficiary.grade)}` : ""}` : "";

  const load = async () => {
    try {
      const response = await fetch(`/api/student/cart${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("CART_LOAD_FAILED");

      setCart(await response.json());
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    void load();
  }, [query]);

  const remove = async (packageVersionId: string) => {
    const response = await fetch("/api/student/cart", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        packageVersionId,
        ...(cart?.beneficiary.studentProfileId ? { studentProfileId: cart.beneficiary.studentProfileId } : {}),
      }),
    });

    if (!response.ok) return;

    await load();
    window.dispatchEvent(
      new CustomEvent("fixoku:student-cart-updated"),
    );
  };

  return (
    <StudentPanelShell user={user} guardian={guardian}>
      <div className="trainer-panel" style={{ display: "contents" }}>
        <main className="trainer-commerce-page trainer-cart-page">
          <div className="trainer-commerce-heading">
            <Link
              to={cart?.beneficiary.studentProfileId ? `/panel/ogrenci/paketler?studentProfileId=${encodeURIComponent(cart.beneficiary.studentProfileId)}` : `/panel/ogrenci/paketler${accountQuery}`}
            >
              ← Paketlere dön
            </Link>
            <h2>Sepetim</h2>
            <p>Seçtiğiniz öğrenci paketlerini gözden geçirin.</p>
          </div>

          {state === "loading" && (
            <p role="status">Sepet yükleniyor…</p>
          )}

          {state === "error" && (
            <p role="alert">Sepet yüklenemedi.</p>
          )}

          {state === "ready" && !cart?.items.length && (
            <section className="trainer-commerce-empty">
              <TrainerIcon name="shopping-cart" size={42} />
              <h3>Sepetiniz boş</h3>
              <p>Paketler ekranından size uygun bir paket ekleyebilirsiniz.</p>
              <Link
                className="trainer-commerce-primary"
                to="/panel/ogrenci/paketler"
              >
                Paketlere dön
              </Link>
            </section>
          )}

          {!!cart?.items.length && (
            <div className="trainer-cart-layout">
              <section
                className="trainer-cart-list"
                aria-label="Sepet ürünleri"
              >
                <div className="trainer-cart-list-heading">
                  <div>
                    <span>Seçilen paket</span>
                    <strong>{cart.items.length} paket</strong>
                  </div>
                  <span>Toplam</span>
                </div>

                {cart.items.map((item) => (
                  <article
                    className="trainer-cart-item"
                    key={item.packageVersionId}
                  >
                    <span className="trainer-package-icon">
                      <TrainerIcon name="book" size={30} />
                    </span>

                    <div className="trainer-cart-item-copy">
                      <h3>{item.title}</h3>
                      <p>{item.subtitle}</p>
                      <small>
                        {item.requiresShipping
                          ? item.shippingFeeMinor
                            ? `${money(
                                item.shippingFeeMinor,
                                item.currency,
                              )} kargo`
                            : "Ücretsiz kargo"
                          : "Kargo gerektirmez"}
                      </small>
                    </div>

                    <strong className="trainer-cart-item-price">
                      {money(item.priceMinor, item.currency)}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        void remove(item.packageVersionId)
                      }
                      aria-label={`${item.title} paketini kaldır`}
                    >
                      Kaldır
                    </button>
                  </article>
                ))}
              </section>

              <aside className="trainer-order-summary">
                <span className="trainer-summary-eyebrow">
                  Fixoku öğrenci mağazası
                </span>
                <h3>Sipariş Özeti</h3>

                <dl>
                  <div>
                    <dt>Ara Toplam</dt>
                    <dd>{money(cart.subtotalMinor, cart.currency)}</dd>
                  </div>
                  <div>
                    <dt>Kargo</dt>
                    <dd>
                      {cart.shippingMinor
                        ? money(cart.shippingMinor, cart.currency)
                        : "Ücretsiz"}
                    </dd>
                  </div>
                  <div>
                    <dt>Toplam</dt>
                    <dd>{money(cart.totalMinor, cart.currency)}</dd>
                  </div>
                </dl>

                <button
                  className="trainer-commerce-primary"
                  type="button"
                  onClick={() =>
                    navigate(
                      cart.beneficiary.studentProfileId ? `/panel/ogrenci/checkout?studentProfileId=${encodeURIComponent(cart.beneficiary.studentProfileId)}` : "/panel/ogrenci/checkout",
                    )
                  }
                >
                  Ödemeye Geç
                </button>

                <Link
                  to={cart.beneficiary.studentProfileId ? `/panel/ogrenci/paketler?studentProfileId=${encodeURIComponent(cart.beneficiary.studentProfileId)}` : `/panel/ogrenci/paketler${accountQuery}`}
                >
                  Alışverişe Devam Et
                </Link>
              </aside>
            </div>
          )}
        </main>
      </div>
    </StudentPanelShell>
  );
}
