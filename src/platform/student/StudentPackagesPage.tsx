import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudentPanelShell } from "./StudentPanelShell";
import {
  findFixokuPackageMedia,
  listFixokuEducationPackageMedia,
} from "../../data/fixokuPackageMedia";
import {
  findFixokuPackageCardContent,
} from "../../data/fixokuPackageCardContent";
import "./student-portal.css";
import { StudentR6CommercePanel } from "./StudentR6CommercePanel";

type StudentChoice = {
  studentProfileId: string;
  name: string;
  educationStage: string;
  grade: string | null;
};

type Product = {
  title: string;
  productType: string;
  quantity: number;
  displayLabel?: string | null;
  imageReference?: string | null;
};

type PackageRow = {
  packageVersionId: string;
  packageId: string;
  versionNumber: number;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  priceMinor: number | null;
  currency: string | null;
  shippingFeeMinor: number;
  requiresShipping: boolean;
  products: Product[];
  components?: Array<{ componentType: string; title: string; titleSnapshot?: string; displayLabel?: string | null; quantity: number; imageReference?: string | null; isActive?: boolean }>;
  contentItems?: Array<{ title: string; titleSnapshot?: string }>;
  accessState: "AVAILABLE" | "OWNED" | "PENDING_PAYMENT";
  priceRequired: boolean;
  pendingOrderId?: string | null;
};

type Body = {
  role: "STUDENT" | "GUARDIAN";
  context: {
    studentProfileId: string;
    studentUserId: string;
    studentName?: string;
    educationStage: string;
    grade: string | null;
  } | null;
  students: StudentChoice[];
  packages: PackageRow[];
};

type CartBody = {
  items?: Array<{
    packageVersionId: string;
  }>;
};

const stageMeta: Record<string, { label: string; theme: string }> = {
  PRIMARY: { label: "İlkokul Öğrencisi", theme: "primary" },
  MIDDLE: { label: "Ortaokul Öğrencisi", theme: "middle" },
  HIGH: { label: "Lise Öğrencisi", theme: "high" },
  ADULT: { label: "Yetişkin", theme: "adult" },
};

const stateLabel: Record<PackageRow["accessState"], string> = {
  AVAILABLE: "Satın alınabilir",
  OWNED: "Erişim kaydı görünüyor",
  PENDING_PAYMENT: "Ödeme bekliyor",
};

function money(minor: number | null | undefined, currency = "TRY") {
  return minor == null
    ? "Fiyat bilgisi bekleniyor"
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency,
      }).format(minor / 100);
}

function unique(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = String(item || "")
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function StudentPackagesPage({
  user,
  guardian,
}: {
  user: { name: string; email?: string };
  guardian: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPackageVersionId = new URLSearchParams(location.search).get("packageVersionId") || "";
  const autoCheckoutRef = useRef("");

  const [body, setBody] = useState<Body | null>(null);
  const [state, setState] =
    useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState("");

  const refreshCart = async (studentProfileId: string, educationStage?: string, grade?: string | null) => {
    const params = new URLSearchParams();
    if (guardian && studentProfileId) params.set("studentProfileId", studentProfileId);
    if (!guardian && educationStage) { params.set("catalogEducationStage", educationStage); if (grade) params.set("catalogGrade", grade); }

    const response = await fetch(
      `/api/student/cart${params.toString() ? `?${params.toString()}` : ""}`,
      {
        credentials: "same-origin",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      setCartIds(new Set());
      return;
    }

    const next = (await response.json()) as CartBody;

    setCartIds(
      new Set(
        (next.items || []).map(
          (item) => item.packageVersionId,
        ),
      ),
    );
  };

  const load = async () => {
    setState("loading");

    try {
      const response = await fetch(
        `/api/student/entitlements${location.search}`,
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const next = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(next.error || "Paketler yüklenemedi.");
      }

      setBody(next);
      await refreshCart(next?.context?.studentProfileId || "", next?.context?.educationStage, next?.context?.grade);
      setState("ready");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Paketler yüklenemedi.",
      );
      setState("error");
    }
  };

  useEffect(() => {
    void load();
  }, [location.search]);

  const addToCart = async (
    item: PackageRow,
    mode: "stay" | "cart" | "checkout",
  ) => {
    setMessage("");

    const studentProfileId = guardian ? body?.context?.studentProfileId || "" : "";
    if (guardian && !studentProfileId) {
      setMessage("Aktif öğrenci profili bulunamadı.");
      return;
    }

    if (cartIds.has(item.packageVersionId)) {
      navigate(
        mode === "checkout"
          ? guardian ? `/panel/ogrenci/checkout?studentProfileId=${encodeURIComponent(studentProfileId)}` : "/panel/ogrenci/checkout"
          : guardian ? `/panel/ogrenci/sepet?studentProfileId=${encodeURIComponent(studentProfileId)}` : "/panel/ogrenci/sepet",
      );
      return;
    }

    setBusyId(item.packageVersionId);

    try {
      const response = await fetch("/api/student/cart", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          packageVersionId: item.packageVersionId,
          ...(guardian ? { studentProfileId } : { catalogEducationStage: body?.context?.educationStage, catalogGrade: body?.context?.grade }),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          result.error || "Paket sepete eklenemedi.",
        );
        return;
      }

      await refreshCart(studentProfileId, body?.context?.educationStage, body?.context?.grade);

      window.dispatchEvent(
        new CustomEvent("fixoku:student-cart-updated"),
      );

      if (mode === "checkout") {
        navigate(
          guardian ? `/panel/ogrenci/checkout?studentProfileId=${encodeURIComponent(studentProfileId)}` : "/panel/ogrenci/checkout",
        );
        return;
      }

      if (mode === "cart") {
        navigate(
          guardian ? `/panel/ogrenci/sepet?studentProfileId=${encodeURIComponent(studentProfileId)}` : "/panel/ogrenci/sepet",
        );
        return;
      }

      setMessage("Paket sepete eklendi.");
    } finally {
      setBusyId("");
    }
  };

  const goCart = () => {
    const studentProfileId = guardian ? body?.context?.studentProfileId || "" : "";
    navigate(guardian ? `/panel/ogrenci/sepet?studentProfileId=${encodeURIComponent(studentProfileId)}` : "/panel/ogrenci/sepet");
  };

  useEffect(() => {
    if (state !== "ready" || !body || !selectedPackageVersionId || autoCheckoutRef.current === selectedPackageVersionId) return;
    const selected = body.packages.find((item) => item.packageVersionId === selectedPackageVersionId);
    autoCheckoutRef.current = selectedPackageVersionId;
    if (!selected) {
      setMessage("Seçtiğiniz paket mevcut öğrenci grubu için uygun değil.");
      return;
    }
    if (selected.accessState !== "AVAILABLE" && !cartIds.has(selectedPackageVersionId)) {
      setMessage("Seçtiğiniz paket satın alınabilir durumda değil.");
      return;
    }
    void addToCart(selected, "cart").catch(() => {
      autoCheckoutRef.current = "";
    });
  }, [state, body, selectedPackageVersionId, cartIds]);

  const changeChild = (studentProfileId: string) => {
    navigate(
      `/panel/ogrenci/paketler?studentProfileId=${encodeURIComponent(
        studentProfileId,
      )}`,
    );
  };

  const shell = (content: ReactNode) => (
    <StudentPanelShell
      user={user}
      guardian={guardian}
      studentProfileId={
        body?.context?.studentProfileId || undefined
      }
    >
      {content}
    </StudentPanelShell>
  );

  const meta = useMemo(
    () =>
      stageMeta[
        body?.context?.educationStage || ""
      ] || {
        label: "Paket Grubu",
        theme: "adult",
      },
    [body?.context?.educationStage],
  );

  if (state === "loading") {
    return shell(
      <div
        className="student-portal__state"
        role="status"
      >
        Paketler yükleniyor…
      </div>,
    );
  }

  if (state === "error" || !body) {
    return shell(
      <div
        className="student-portal__state"
        role="alert"
      >
        <h3>Paketler yüklenemedi</h3>
        <p>{message}</p>
        <button
          type="button"
          onClick={() => void load()}
        >
          Tekrar dene
        </button>
      </div>,
    );
  }

  const stage =
    body.context?.educationStage || "";

  const regularMedia =
    listFixokuEducationPackageMedia(stage);

  const visiblePackages = body.packages.filter(
    (item) => {
      const media = findFixokuPackageMedia(
        stage,
        item.title,
      );

      return Boolean(
        media &&
          media.section === "education" &&
          regularMedia.some(
            (entry) => entry.slug === media.slug,
          ),
      );
    },
  );

  const segmentSummary = body.context
    ? `${
        stageMeta[stage]?.label || stage
      }${
        body.context.grade
          ? ` · ${body.context.grade}. Sınıf`
          : ""
      }`
    : "";

  return shell(
    <>
      <StudentR6CommercePanel token={new URLSearchParams(location.search).get("token")} />
      <div
        className={`student-package-hero student-package-theme--${meta.theme}`}
      >
        <div>
          <h2>
            {guardian &&
            body.context?.studentName
              ? `${body.context.studentName} için paketler`
              : "Size Uygun Paketler"}
          </h2>

          {segmentSummary && (
            <div className="student-package-segment-pill">
              {segmentSummary}
            </div>
          )}
        </div>

        {guardian &&
          body.students.length > 0 && (
            <label className="student-portal__context">
              Görüntülenen öğrenci
              <select
                value={
                  body.context
                    ?.studentProfileId || ""
                }
                onChange={(event) =>
                  changeChild(event.target.value)
                }
              >
                {body.students.map(
                  (student) => (
                    <option
                      key={
                        student.studentProfileId
                      }
                      value={
                        student.studentProfileId
                      }
                    >
                      {student.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
      </div>

      {message && (
        <p
          className="student-portal__banner"
          role="status"
        >
          {message}
        </p>
      )}

      {!visiblePackages.length && (
        <div className="student-portal__state">
          <h3>
            Size uygun yayınlanmış paket bulunmuyor
          </h3>
          <p>
            Profilinizin paket grubuna ve
            sınıfına uygun, yayına alınmış bir
            paket henüz bulunmuyor.
          </p>
        </div>
      )}

      <section
        className={`student-package-grid student-package-grid--${meta.theme}`}
        aria-label="Öğrenci paketleri"
      >
        {visiblePackages.map((item) => {
          const media =
            findFixokuPackageMedia(
              stage,
              item.title,
            );

          if (!media) return null;

          const exact =
            findFixokuPackageCardContent(
              stage,
              item.title,
            );

          const canBuy =
            item.accessState ===
              "AVAILABLE" &&
            !item.priceRequired &&
            item.priceMinor != null;

          const inCart = cartIds.has(
            item.packageVersionId,
          );

          const busy =
            busyId === item.packageVersionId;

          const displaySubtitle =
            exact?.subtitle ||
            item.subtitle;

          const contentItems = unique(
            item.contentItems?.map((content) => content.title || content.titleSnapshot || "") ||
            (exact?.features?.length ? exact.features : item.features),
          );

          return (
            <article
              className={`student-package-card student-package-card--${meta.theme}`}
              key={item.packageVersionId}
            >
              <div className="student-package-card__visual student-package-card__visual--image">
                <img
                  src={media.image}
                  alt={item.title}
                  loading="lazy"
                />
              </div>

              <div className="student-package-card__body">
                <div className="student-package-card__head">
                  <span
                    className={`student-package-state student-package-state--${item.accessState.toLowerCase()}`}
                  >
                    {
                      stateLabel[
                        item.accessState
                      ]
                    }
                  </span>

                  {inCart && (
                    <span className="student-package-cart-state">
                      Sepette
                    </span>
                  )}
                </div>

                <div className="student-package-card__title-block">
                  <h3>{item.title}</h3>

                  {displaySubtitle && (
                    <p className="student-package-card__subtitle">
                      {displaySubtitle}
                    </p>
                  )}
                </div>

                {contentItems.length > 0 && (
                  <div className="student-package-card__content">
                    <h4>Paket içeriği</h4>

                    <ul className="student-package-card__features">
                      {contentItems.map(
                        (feature, index) => (
                          <li
                            key={`${feature}-${index}`}
                          >
                            <span
                              className="student-package-check"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>
                              {feature}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {item.products.length > 0 && (
                  <div className="student-package-card__content">
                    <h4>Paketle gelen kitaplar</h4>
                    <ul className="student-package-card__features">
                      {item.products.map((product, index) => (
                        <li key={`${product.title}-${index}`}>
                          {product.imageReference ? <img src={product.imageReference} alt="" width={40} height={40} /> : <span className="student-package-check" aria-hidden="true">▧</span>}
                          <span>{product.displayLabel || product.title}{product.quantity > 1 ? ` × ${product.quantity}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="student-package-card__footer">
                  <div className="student-package-card__price">
                    <span>Paket fiyatı</span>
                    <strong
                      className={
                        item.priceRequired
                          ? "is-pending"
                          : ""
                      }
                    >
                      {money(
                        item.priceMinor,
                        item.currency ||
                          "TRY",
                      )}
                    </strong>
                  </div>

                  <div className="student-package-card__shipping">
                    {item.requiresShipping
                      ? item.shippingFeeMinor
                        ? `Kargo: ${money(
                            item.shippingFeeMinor,
                            item.currency ||
                              "TRY",
                          )}`
                        : "Fiziksel ürün içerir · Ücretsiz kargo"
                      : "Kargo gerektirmez"}
                  </div>

                  {item.priceRequired && (
                    <div className="student-package-card__notice">
                      Fiyat tanımlanmadan satın alma açılamaz.
                    </div>
                  )}

                  {canBuy && (
                    <div className="student-package-card__actions">
                      {inCart ? (
                        <>
                          <button
                            className="student-package-card__buy student-package-card__buy--in-cart"
                            type="button"
                            disabled
                          >
                            Sepette
                          </button>

                          <button
                            className="student-package-card__cart-action"
                            type="button"
                            onClick={goCart}
                          >
                            Sepete git
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="student-package-card__buy"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void addToCart(
                                item,
                                "checkout",
                              )
                            }
                          >
                            {busy
                              ? "İşleniyor…"
                              : "Satın al"}
                          </button>

                          <button
                            className="student-package-card__cart-action"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void addToCart(
                                item,
                                "stay",
                              )
                            }
                          >
                            {busy
                              ? "Ekleniyor…"
                              : "Sepete ekle"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {item.accessState ===
                    "PENDING_PAYMENT" && (
                    <div className="student-package-card__notice">
                      Bu paket için bekleyen siparişiniz bulunuyor.
                    </div>
                  )}

                  {item.accessState ===
                    "OWNED" && (
                    <div className="student-package-card__notice">
                      Bu paket için sistemde bir erişim kaydı bulunuyor. Bu kayıt, ödemenin yapıldığı anlamına tek başına gelmez. Erişim ve sipariş durumunu ayrıca doğrulayın.
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>,
  );
}
