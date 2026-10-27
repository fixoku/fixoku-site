import { useEffect, useMemo, useState } from "react";
import { TrainerIcon as PanelIcon } from "../components/TrainerIcon";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TURKEY_LOCATIONS, getTurkeyDistricts } from "../../../data/turkeyLocations.js";
import { resolveProfileImage } from "../../panel/profileAvatar";
import { TrainerQualificationBadgeR5 } from "../../../shared/FixokuTrainerBadgeR5";
import "./trainer-profile.css";
import "./trainer-badges-r9.css";

type Profile = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  profession: string;
  institution: string;
  educationBackground: string;
  experience: string;
  specialties: string;
  bio: string;
  email: string;
  photoStorageKey?: string | null;
  photoUrl?: string | null;
};

type Address = { id?: string; title: string; firstName: string; lastName: string; phone: string; city: string; district: string; addressLine: string; neighborhood?: string | null; postalCode?: string | null };
const emptyAddress: Address = { title: "Teslimat Adresi", firstName: "", lastName: "", phone: "", city: "", district: "", addressLine: "" };
type Status = "loading" | "ready" | "saving" | "success" | "error";
type TabId = "personal" | "professional" | "address";

type QualificationBadgeR9 = { id: string; label: string };

const empty: Profile = {
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  district: "",
  profession: "",
  institution: "",
  educationBackground: "",
  experience: "",
  specialties: "",
  bio: "",
  email: "",
  photoStorageKey: null,
  photoUrl: null,
};

const tabs: readonly [TabId, string, "user-solid" | "briefcase" | "pin"][] = [
  ["personal", "Kişisel Bilgiler", "user-solid"],
  ["professional", "Mesleki Bilgiler", "briefcase"],
  ["address", "Adres", "pin"],
];

function placeKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .toLocaleLowerCase("en-US")
    .trim();
}

function canonicalizeLocation(city: string, district: string) {
  const province = TURKEY_LOCATIONS.find((item) => placeKey(item.name) === placeKey(city));
  if (!province) return { city: city || "", district: district || "" };
  const canonicalDistrict = province.districts.find((item) => placeKey(item) === placeKey(district)) || "";
  return { city: province.name, district: canonicalDistrict };
}

function localMobile(value: string) {
  let digits = String(value || "").replace(/\D/gu, "");
  if (digits.length === 12 && digits.startsWith("90")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(String(value || "").trim());
}

export function TrainerProfilePage({
  user,
}: {
  user: { id: string; name: string; email: string };
}) {
  const [profile, setProfile] = useState<Profile>({ ...empty, email: user.email });
  const [initial, setInitial] = useState<Profile>({ ...empty, email: user.email });
  const [originalEmail, setOriginalEmail] = useState(user.email);
  const [status, setStatus] = useState<Status>("loading");
  const [tab, setTab] = useState<TabId>("personal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [qualificationBadges, setQualificationBadges] = useState<QualificationBadgeR9[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<Address>({ ...emptyAddress });
  const [addressState, setAddressState] = useState<"loading" | "ready" | "saving">("loading");
  const [addressFeedback, setAddressFeedback] = useState("");
  useEffect(() => {
    fetch("/api/trainer/addresses", { credentials: "same-origin", cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { const saved = data.addresses?.[0]; setDeliveryAddress(saved ? saved : { ...emptyAddress }); setAddressState("ready"); })
      .catch(() => { setAddressState("ready"); setAddressFeedback("Kayıtlı adresler yüklenemedi. Tekrar deneyin."); });
  }, []);
  async function saveDeliveryAddress() {
    const a = deliveryAddress;
    if (![a.title, a.firstName, a.lastName, a.phone, a.city, a.district, a.addressLine].every(value => String(value || "").trim())) {
      setAddressFeedback("Adres başlığı, ad, soyad, telefon, il, ilçe ve açık adres zorunludur."); return;
    }
    setAddressState("saving"); setAddressFeedback("");
    try {
      const response = await fetch("/api/trainer/addresses", { method: a.id ? "PATCH" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
      const data = await response.json().catch(() => ({}));
      const validationMessage = data.errors && typeof data.errors === "object"
        ? Object.values(data.errors).find((item): item is string => typeof item === "string")
        : null;
      if (!response.ok || !data.address) throw new Error(validationMessage || data.message || data.error || "Adres kaydedilemedi.");
      setDeliveryAddress(data.address); setAddressFeedback("Adresiniz kaydedildi. Ödeme sayfasında otomatik seçilir.");
    } catch (error) { setAddressFeedback(error instanceof Error ? error.message : "Adres kaydedilemedi."); }
    finally { setAddressState("ready"); }
  }


  useEffect(() => {
    fetch("/api/trainer/profile", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("PROFILE_LOAD");
        const data = await response.json();
        const loaded = { ...empty, ...data.profile, email: data.profile?.email ?? user.email };
        const place = canonicalizeLocation(loaded.city, loaded.district);
        const next = { ...loaded, ...place };
        setProfile(next);
        // FIXOKU_BADGES_R9: read actual active qualifications, not editable specialties.
        setQualificationBadges(Array.isArray(data.badges) ? data.badges : []);
        setInitial(next);
        setOriginalEmail(next.email || user.email);
        setStatus("ready");
      })
      .catch(() => {
        setFeedback("Profil verileri yüklenemedi.");
        setStatus("error");
      });
  }, [user.email]);

  useEffect(() => {
    if (addressState !== "ready") return;
    setDeliveryAddress(current => current.id ? current : {
      ...current,
      firstName: current.firstName || profile.firstName,
      lastName: current.lastName || profile.lastName,
      phone: current.phone || profile.phone,
      city: current.city || profile.city,
      district: current.district || profile.district,
    });
  }, [addressState, profile.firstName, profile.lastName, profile.phone, profile.city, profile.district]);

  const dirty = useMemo(
    () =>
      JSON.stringify(profile) !== JSON.stringify(initial) ||
      Boolean(photoDataUrl) ||
      removePhoto,
    [profile, initial, photoDataUrl, removePhoto],
  );

  const districts = getTurkeyDistricts(profile.city);
  const badges = qualificationBadges;

  function update(key: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFeedback("");
    setStatus((current) => (current === "success" ? "ready" : current));
  }

  function validate() {
    const next: Record<string, string> = {};

    if (!profile.firstName.trim()) next.firstName = "Ad alanı zorunludur.";
    if (!profile.lastName.trim()) next.lastName = "Soyad alanı zorunludur.";

    const phone = localMobile(profile.phone);
    if (!/^5\d{9}$/u.test(phone)) {
      next.phone = "5 ile başlayan 10 haneli Türkiye cep telefonu girin.";
    }

    if (!validEmail(profile.email)) {
      next.email = "Geçerli bir e-posta adresi girin.";
    }

    if (profile.city && !profile.district) {
      next.district = "İlçe seçin.";
    }
    if (!profile.city && profile.district) {
      next.city = "Önce il seçin.";
    }

    if (profile.bio.length > 500) {
      next.bio = "Kısa özgeçmiş 500 karakteri geçemez.";
    }

    setErrors(next);
    return !Object.keys(next).length;
  }

  async function save() {
    if (!validate()) {
      setStatus("ready");
      return;
    }

    setStatus("saving");
    setFeedback("");

    try {
      const response = await fetch("/api/trainer/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: localMobile(profile.phone),
          city: profile.city,
          district: profile.district,
          profession: profile.profession,
          institution: profile.institution,
          educationBackground: profile.educationBackground,
          experience: profile.experience,
          bio: profile.bio,
          ...(photoDataUrl ? { photoDataUrl } : {}),
          ...(removePhoto ? { removePhoto: true } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(data.errors ?? { form: "Profil kaydedilemedi." });
        setStatus("ready");
        return;
      }

      const savedProfile: Profile = {
        ...profile,
        ...data.profile,
        email: originalEmail,
      };

      const requestedEmail = profile.email.trim().toLowerCase();
      const emailChanged = requestedEmail !== originalEmail.trim().toLowerCase();

      if (emailChanged) {
        const emailResponse = await fetch("/api/auth/change-email", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newEmail: requestedEmail,
            callbackURL: "/panel/egitmen/profil",
          }),
        });

        const emailBody = await emailResponse.json().catch(() => ({}));

        if (!emailResponse.ok) {
          setProfile(savedProfile);
          setInitial(savedProfile);
          setPhotoDataUrl(null);
          setRemovePhoto(false);
          setErrors({
            email: emailBody.message || "E-posta değişikliği başlatılamadı.",
          });
          setFeedback("Diğer profil bilgileriniz kaydedildi.");
          setStatus("ready");
          return;
        }

        setProfile(savedProfile);
        setInitial(savedProfile);
        setPhotoDataUrl(null);
        setRemovePhoto(false);
        setFeedback(
          "Profil bilgileriniz kaydedildi. Yeni e-posta adresinize doğrulama bağlantısı gönderildi; doğrulamadan sonra e-posta değişecektir.",
        );
        setStatus("success");
        return;
      }

      const next = { ...profile, ...data.profile, email: originalEmail };
      setProfile(next);
      setInitial(next);
      setPhotoDataUrl(null);
      setRemovePhoto(false);
      setFeedback("Bilgileriniz başarıyla kaydedildi.");
      setStatus("success");
    } catch {
      setFeedback("Sunucuya ulaşılamadı. Değişiklikleriniz korunuyor.");
      setStatus("error");
    }
  }

  function choosePhoto(file: File | undefined) {
    if (!file) return;

    if (!/^image\/(?:jpeg|png|webp)$/u.test(file.type) || file.size > 2 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        photo: "JPG, PNG veya WebP ve en fazla 2 MB kullanın.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(String(reader.result));
      setRemovePhoto(false);
      setErrors((current) => ({ ...current, photo: "" }));
    };
    reader.readAsDataURL(file);
  }

  const initials = `${(profile.firstName || user.name).charAt(0)}${(
    profile.lastName ||
    user.name.split(" ").at(-1) ||
    ""
  ).charAt(0)}`.toLocaleUpperCase("tr-TR");

  const avatarSrc =
    photoDataUrl ||
    (profile.photoUrl
      ? `${profile.photoUrl}?v=${encodeURIComponent(profile.photoStorageKey || "")}`
      : resolveProfileImage({ name: `${profile.firstName} ${profile.lastName}`.trim() || user.name, email: user.email }));

  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);

  const remove = () => {
    setPhotoDataUrl(null);
    setRemovePhoto(true);
    setProfile((current) => ({
      ...current,
      photoStorageKey: null,
      photoUrl: null,
    }));
  };

  const personalPanel = (
    <div className="profile-grid">
      <Field
        label="Ad"
        name="firstName"
        value={profile.firstName}
        error={errors.firstName}
        onChange={update}
      />

      <Field
        label="Soyad"
        name="lastName"
        value={profile.lastName}
        error={errors.lastName}
        onChange={update}
      />

      <label className="profile-field">
        <span>Telefon</span>
        <span className="profile-input-wrap trainer-phone-control">
          <b>+90</b>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            pattern="5[0-9]{9}"
            value={localMobile(profile.phone)}
            onInput={(event) =>
              update(
                "phone",
                event.currentTarget.value.replace(/\D/gu, "").slice(0, 10),
              )
            }
            aria-invalid={Boolean(errors.phone)}
            placeholder="5XXXXXXXXX"
          />
        </span>
        {errors.phone && <small>{errors.phone}</small>}
      </label>

      <Field
        label="E-posta"
        name="email"
        value={profile.email}
        error={errors.email}
        onChange={update}
        type="email"
      />

      <label className="profile-field">
        <span>İl</span>
        <span className="profile-input-wrap trainer-location-control">
          <PanelIcon name="pin" size={20} />
          <select
            value={profile.city}
            onChange={(event) => {
              setProfile((current) => ({
                ...current,
                city: event.target.value,
                district: "",
              }));
              setErrors((current) => ({ ...current, city: "", district: "" }));
              setFeedback("");
            }}
            aria-invalid={Boolean(errors.city)}
          >
            <option value="">İl seçin</option>
            {TURKEY_LOCATIONS.map((province) => (
              <option key={province.plate} value={province.name}>
                {province.name}
              </option>
            ))}
          </select>
        </span>
        {errors.city && <small>{errors.city}</small>}
      </label>

      <label className="profile-field">
        <span>İlçe</span>
        <span className="profile-input-wrap trainer-location-control">
          <PanelIcon name="pin" size={20} />
          <select
            value={profile.district}
            disabled={!profile.city}
            onChange={(event) => update("district", event.target.value)}
            aria-invalid={Boolean(errors.district)}
          >
            <option value="">
              {profile.city ? "İlçe seçin" : "Önce il seçin"}
            </option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </span>
        {errors.district && <small>{errors.district}</small>}
      </label>
    </div>
  );

  const addressPanel = (
    <div className="trainer-profile-address-panel">
      <p className="trainer-profile-address-note">Burada kaydettiğiniz teslimat adresi, ödeme ekranında otomatik seçilir.</p>
      <div className="profile-grid">
        <label className="profile-field full"><span>Adres başlığı</span><input value={deliveryAddress.title} onChange={event => setDeliveryAddress(a => ({ ...a, title: event.target.value }))} placeholder="Ev / İş" /></label>
        <label className="profile-field"><span>Ad</span><input value={deliveryAddress.firstName} onChange={event => setDeliveryAddress(a => ({ ...a, firstName: event.target.value }))} /></label>
        <label className="profile-field"><span>Soyad</span><input value={deliveryAddress.lastName} onChange={event => setDeliveryAddress(a => ({ ...a, lastName: event.target.value }))} /></label>
        <label className="profile-field full"><span>Telefon</span><input type="tel" value={deliveryAddress.phone} onChange={event => setDeliveryAddress(a => ({ ...a, phone: event.target.value }))} placeholder="05XX XXX XX XX" /></label>
        <label className="profile-field"><span>İl</span><select value={deliveryAddress.city} onChange={event => setDeliveryAddress(a => ({ ...a, city: event.target.value, district: "" }))}><option value="">İl seçin</option>{TURKEY_LOCATIONS.map(p => <option key={p.plate} value={p.name}>{p.name}</option>)}</select></label>
        <label className="profile-field"><span>İlçe</span><select value={deliveryAddress.district} onChange={event => setDeliveryAddress(a => ({ ...a, district: event.target.value }))} disabled={!deliveryAddress.city}><option value="">İlçe seçin</option>{getTurkeyDistricts(deliveryAddress.city).map(d => <option key={d} value={d}>{d}</option>)}</select></label>
        <label className="profile-field full"><span>Açık adres</span><textarea value={deliveryAddress.addressLine} onChange={event => setDeliveryAddress(a => ({ ...a, addressLine: event.target.value }))} placeholder="Mahalle, cadde, sokak, bina ve daire numarası" /></label>
      </div>
      <div className="trainer-profile-address-actions"><span role="status">{addressState === "loading" ? "Adres yükleniyor..." : addressFeedback}</span><button type="button" className="profile-button" disabled={addressState !== "ready"} onClick={() => void saveDeliveryAddress()}>{addressState === "saving" ? "Kaydediliyor..." : "Adresi Kaydet"}</button></div>
    </div>
  );

  const professionalPanel = (
    <div className="profile-grid">
      <Field
        label="Meslek / Branş"
        name="profession"
        value={profile.profession}
        error={errors.profession}
        onChange={update}
      />

      <Field
        label="Kurum Bilgisi"
        name="institution"
        value={profile.institution}
        error={errors.institution}
        onChange={update}
      />

      <Field
        className="full"
        label="Eğitim / Arka Plan"
        name="educationBackground"
        value={profile.educationBackground}
        error={errors.educationBackground}
        onChange={update}
      />

      <Field
        className="full"
        label="Deneyim"
        name="experience"
        value={profile.experience}
        error={errors.experience}
        onChange={update}
      />

      <div className="profile-bio-action-row full">
        <label className="profile-field profile-bio-field">
          <span>Kısa Özgeçmiş</span>
          <textarea
            name="bio"
            value={profile.bio}
            maxLength={500}
            onInput={(event) => update("bio", event.currentTarget.value)}
            aria-invalid={Boolean(errors.bio)}
          />
          {errors.bio && <small>{errors.bio}</small>}
        </label>

        <div className="profile-bio-action">
          <button
            type="button"
            className="profile-button"
            disabled={status === "saving" || !dirty}
            onClick={() => void save()}
          >
            <PanelIcon name="save" size={22} />
            {status === "saving" ? "Kaydediliyor…" : "Bilgilerimi Güncelle"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PanelShell user={user}>
      <main className="trainer-profile-page">
        <div className="trainer-profile-heading">
          <div>
            <h2>Profilim</h2>
            <p>Kişisel ve mesleki bilgilerinizi güncel tutabilirsiniz.</p>
          </div>

          <div className="trainer-profile-breadcrumb">
            Ana Sayfa <PanelIcon name="chevron-right" size={16} /> <strong>Profilim</strong>
          </div>
        </div>

        <div className="trainer-profile-layout">
          <section className="trainer-profile-card">
            <div
              className="trainer-profile-tabs"
              role="tablist"
              aria-label="Profil bölümleri"
            >
              {tabs.map(([id, label, icon], index) => (
                <button
                  key={id}
                  id={`profile-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`profile-panel-${id}`}
                  tabIndex={tab === id ? 0 : -1}
                  className={tab === id ? "is-active" : ""}
                  onClick={() => setTab(id)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(
                        event.key,
                      )
                    ) {
                      return;
                    }

                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : (index +
                              (["ArrowRight", "ArrowDown"].includes(event.key)
                                ? 1
                                : tabs.length - 1)) %
                            tabs.length;

                    setTab(tabs[next][0]);
                    document.getElementById(`profile-tab-${tabs[next][0]}`)?.focus();
                  }}
                >
                  <PanelIcon name={icon} size={21} />
                  {label}
                </button>
              ))}
            </div>

            {status === "loading" ? (
              <div className="trainer-profile-loading" role="status" aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            ) : status === "error" && !dirty ? (
              <div className="trainer-profile-state">
                <h3>Profil yüklenemedi</h3>
                <p>Bağlantınızı kontrol edip tekrar deneyin.</p>
                <button
                  type="button"
                  className="profile-button"
                  onClick={() => window.location.reload()}
                >
                  Tekrar dene
                </button>
              </div>
            ) : (
              <div
                id={`profile-panel-${tab}`}
                className="trainer-profile-form"
                role="tabpanel"
                aria-labelledby={`profile-tab-${tab}`}
              >
                {tab === "personal" ? personalPanel : tab === "address" ? addressPanel : professionalPanel}

                {errors.form && (
                  <p className="profile-form-error" role="alert">
                    {errors.form}
                  </p>
                )}

                <div className="trainer-profile-feedback-row">
                  <span className="profile-feedback" role="status" aria-live="polite">
                    {tab === "address" ? "" : (feedback || (dirty ? "Kaydedilmemiş değişiklikleriniz var." : ""))}
                  </span>

                  {tab === "personal" && (
                    <button
                      type="button"
                      className="profile-button trainer-profile-personal-save"
                      disabled={status === "saving" || !dirty}
                      onClick={() => void save()}
                    >
                      <PanelIcon name="save" size={22} />
                      {status === "saving" ? "Kaydediliyor…" : "Bilgilerimi Güncelle"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="trainer-profile-rail">
            <div className="trainer-profile-identity">
              <div className="profile-photo-control">
                {avatarSrc && !avatarError ? (
                  <img
                    className="trainer-profile-avatar trainer-profile-avatar-image"
                    src={avatarSrc}
                    alt="Profil fotoğrafı"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="trainer-profile-avatar" aria-label="Profil fotoğrafı yok">
                    {initials}
                  </div>
                )}

                <label className="profile-photo-button">
                  <PanelIcon name="camera" size={25} />
                  <input
                    aria-label="Profil fotoğrafı seç"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => choosePhoto(event.target.files?.[0])}
                  />
                </label>
              </div>

              {errors.photo && <p className="trainer-photo-error" role="alert">{errors.photo}</p>}

              <h3>
                {profile.firstName || user.name.split(" ")[0]}{" "}
                {profile.lastName || user.name.split(" ").slice(1).join(" ")}
              </h3>

              <span className="trainer-role-pill">Fixoku Eğitmeni</span>

              <div className="trainer-specialty-badges" aria-label="Uzmanlık rozetleri">
                {badges.map((badge) => (
                  <div className="trainer-specialty-badge" key={badge.id} title={badge.label} aria-label={badge.label}>
                    <TrainerQualificationBadgeR5 title={badge.label} fallback={null} size={76} />
                    <span>{badge.label}</span>
                  </div>
                ))}

                {!badges.length && (
                  <small className="trainer-specialty-empty">
                    Henüz uzmanlık rozeti bulunmuyor.
                  </small>
                )}
              </div>

              {(profile.photoStorageKey || photoDataUrl) && (
                <button
                  type="button"
                  className="profile-button profile-button-secondary trainer-photo-remove"
                  onClick={remove}
                >
                  Fotoğrafı kaldır
                </button>
              )}
            </div>

            <blockquote>
              <PanelIcon name="quote" size={36} />
              Her çocuk,
              <br />
              doğru yönlendirildiğinde
              <br />
              başarabilir.
            </blockquote>

            <div className="trainer-profile-brand">
              <img src="/siyah-logo-fixoku.png" alt="Fixoku" />
              <small>
                Daha Güçlü Zihinler
                <br />
                Daha Aydınlık Yarınlar
              </small>
            </div>
          </aside>
        </div>
      </main>
    </PanelShell>
  );
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  name: keyof Profile;
  value: string;
  error?: string;
  onChange: (name: keyof Profile, value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`profile-field ${className}`}>
      <span>{label}</span>
      <span className="profile-input-wrap">
        {name === "phone" ? (
          <PanelIcon name="phone" size={20} />
        ) : name === "email" ? (
          <PanelIcon name="mail" size={20} />
        ) : name === "profession" ? (
          <PanelIcon name="cap" size={20} />
        ) : name === "institution" ? (
          <PanelIcon name="building" size={20} />
        ) : null}

        <input
          name={name}
          type={type}
          value={value}
          maxLength={120}
          onInput={(event) => onChange(name, event.currentTarget.value)}
          aria-invalid={Boolean(error)}
        />
      </span>

      {error && <small>{error}</small>}
    </label>
  );
}


/* FIXOKU_BADGES_R9: superseded SVG previews removed. */
