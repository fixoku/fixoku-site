import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { StudentPanelShell } from "./StudentPanelShell";
import { studentDisplayName } from "./studentDisplayName";
import { TrainerIcon as PanelIcon } from "../trainer/components/TrainerIcon";
import { TURKEY_LOCATIONS, getTurkeyDistricts } from "../../data/turkeyLocations.js";
import "../trainer/profile/trainer-profile.css";
import "./student-portal.css";

type Profile = {
  id?: string;
  childProfileId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelation: string;
  educationStage: string;
  grade: string;
  school: string;
  classBranch: string;
  city: string;
  district: string;
  email: string;
  phone: string;
  addressLine: string;
  postalCode: string;
  marketingConsent?: boolean;
  photoStorageKey?: string | null;
  photoUrl?: string | null;
};


const empty: Profile = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  guardianName: "",
  guardianEmail: "",
  guardianPhone: "",
  guardianRelation: "",
  educationStage: "",
  grade: "",
  school: "",
  classBranch: "",
  city: "",
  district: "",
  email: "",
  phone: "",
  addressLine: "",
  postalCode: "",
  marketingConsent: false,
  photoStorageKey: null,
  photoUrl: null,
};

const stages = [
  { value: "PRIMARY", label: "İlkokul Öğrencisi", grades: ["3", "4"] },
  { value: "MIDDLE", label: "Ortaokul Öğrencisi", grades: ["5", "6", "7", "8"] },
  { value: "HIGH", label: "Lise Öğrencisi", grades: ["9", "10", "11", "12"] },
  { value: "ADULT", label: "Yetişkin", grades: [] },
] as const;


function localMobile(value: string) {
  let digits = String(value || "").replace(/\D/gu, "");
  if (digits.length === 12 && digits.startsWith("90")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function todayIso() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function validDateOfBirth(value: string) {
  if (!value) return true;
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/u.test(value)
    && !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
    && value <= todayIso();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(String(value || "").trim());
}

export function StudentProfilePage({
  guardian = false,
  user = { name: "Öğrenci", email: "" },
}: {
  guardian?: boolean;
  user?: { name: string; email?: string };
}) {
  const [profile, setProfile] = useState<Profile>(empty);
  const [originalEmail, setOriginalEmail] = useState(user.email || "");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  // FIXOKU_R23_PHOTO_SAVE
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoNotice, setPhotoNotice] = useState("");
  const [photoError, setPhotoError] = useState(false);
  const targetQuery = profile.childProfileId ? `?childProfileId=${encodeURIComponent(profile.childProfileId)}` : guardian && profile.id ? `?studentProfileId=${encodeURIComponent(profile.id)}` : "";
  const [educationSaving, setEducationSaving] = useState(false);
  const [educationNotice, setEducationNotice] = useState("");
  const saveChildEducation = async () => {
    const id = profile.childProfileId;
    if (!id || educationSaving || photoSaving) return;
    if (!profile.grade || String(profile.school || "").trim().length < 2) { setEducationNotice("Okul adını ve sınıfı kontrol edin."); return; }
    setEducationSaving(true); setEducationNotice("");
    try {
      const response = await fetch(`/api/student/profile?childProfileId=${encodeURIComponent(id)}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ childEducationOnly: true, school: profile.school, grade: profile.grade, classBranch: profile.classBranch }) });
      const result = await response.json();
      if (!response.ok || result.childProfileId !== id) throw new Error("CHILD_EDUCATION_SAVE_FAILED");
      setProfile(current => current.childProfileId === id ? { ...current, school: result.school || "", grade: String(result.grade || ""), classBranch: result.classBranch || "" } : current);
      setEducationNotice("Çocuğun eğitim bilgileri kaydedildi.");
    } catch { setEducationNotice("Eğitim bilgileri kaydedilemedi. Okul, sınıf ve şubeyi kontrol edin."); }
    finally { setEducationSaving(false); }
  };
  const canManagePhoto = Boolean(profile.id) && (!guardian || Boolean(targetQuery));
  useEffect(() => setPhotoError(false), [profile.photoUrl, photoDataUrl]);
  const savePhoto = async (remove = false) => {
    if ((!remove && !photoDataUrl) || photoSaving || !canManagePhoto) return;
    setPhotoSaving(true); setPhotoNotice("");
    try {
      const response = await fetch(`/api/student/profile${targetQuery}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(remove ? { photoOnly: true, removePhoto: true } : { photoOnly: true, photoDataUrl }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || (remove ? result.photoStorageKey !== null : !result.photoStorageKey)) throw new Error("PHOTO_SAVE_FAILED");
      setProfile((current) => ({ ...current, photoStorageKey: result.photoStorageKey, photoUrl: result.photoUrl }));
      setPhotoDataUrl(null); setRemovePhoto(false);
      setPhotoNotice(remove ? "Profil fotoğrafı kaldırıldı." : "Profil fotoğrafınız kaydedildi.");
      window.dispatchEvent(new Event("fixoku:profile-photo-updated"));
    } catch { setPhotoNotice("Fotoğraf kaydedilemedi. Tekrar deneyin."); }
    finally { setPhotoSaving(false); }
  };
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = () => {
    setState("loading");
    const params = new URLSearchParams(window.location.search);
    const child = params.get("childProfileId");
    const legacy = params.get("studentProfileId");
    const query = child ? `?childProfileId=${encodeURIComponent(child)}` : legacy ? `?studentProfileId=${encodeURIComponent(legacy)}` : "";

    fetch(`/api/student/profile${query}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("PROFILE_LOAD_FAILED");
        const body = await response.json();
        if (!body.profile) throw new Error("PROFILE_NOT_FOUND");
        const loaded = { ...empty, ...body.profile };
        setProfile(loaded);
        setOriginalEmail(loaded.email || user.email || "");
        setState("ready");
      })
      .catch(() => {
        setMessage("Profil verileri yüklenemedi.");
        setState("error");
      });
  };

  useEffect(() => {
    load();
  }, []);

  const stage = useMemo(
    () => stages.find((item) => item.value === profile.educationStage),
    [profile.educationStage],
  );

  const districts = useMemo(
    () => getTurkeyDistricts(profile.city),
    [profile.city],
  );

  const initials = `${(profile.firstName || user.name).charAt(0)}${(
    profile.lastName ||
    user.name.split(" ").at(-1) ||
    ""
  ).charAt(0)}`.toLocaleUpperCase("tr-TR");

  const avatarSrc =
    photoDataUrl ||
    (profile.photoUrl
      ? `${profile.photoUrl}${profile.photoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(profile.photoStorageKey || "")}`
      : null);

  const update = (key: keyof Profile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setMessage("");
  };

  const choosePhoto = (file?: File) => {
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
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!profile.firstName.trim()) next.firstName = "Ad zorunludur.";
    if (!profile.lastName.trim()) next.lastName = "Soyad zorunludur.";
    if (!validDateOfBirth(profile.dateOfBirth)) next.dateOfBirth = "Geçerli ve bugünden önce veya bugüne eşit bir tarih girin.";

    if (!validEmail(profile.email)) {
      next.email = "Geçerli bir e-posta adresi girin.";
    }

    if (!/^5\d{9}$/u.test(localMobile(profile.phone))) {
      next.phone = "5 ile başlayan 10 haneli Türkiye cep telefonu girin.";
    }

    if (!profile.educationStage) {
      next.educationStage = "Paket grubunu seçin.";
    }

    if (profile.educationStage !== "ADULT") {
      if (!profile.grade) next.grade = "Sınıf seçin.";
      if (!profile.school.trim()) next.school = "Okulunuzun adını yazın.";
    }

    if (profile.educationStage && profile.educationStage !== "ADULT") {
      if (!(profile.guardianName || "").trim()) next.guardianName = "Veli adı ve soyadı zorunludur.";
      if (!validEmail(profile.guardianEmail)) next.guardianEmail = "Geçerli veli e-posta adresi girin.";
      if (!/^5\d{9}$/u.test(localMobile(profile.guardianPhone || ""))) next.guardianPhone = "5 ile başlayan 10 haneli veli cep telefonu girin.";
      if (!["Anne", "Baba", "Vasi", "Diğer"].includes(profile.guardianRelation)) next.guardianRelation = "Yakınlık derecesini seçin.";
    }

    if (!profile.city || !profile.district) {
      next.city = "İl ve ilçe seçin.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (guardian || profile.childProfileId || !validate()) return;

    setState("saving");
    setMessage("");

    const profileResponse = await fetch("/api/student/profile", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth || null,
        ...(profile.educationStage !== "ADULT" ? {
          guardianName: (profile.guardianName || "").trim(),
          guardianEmail: (profile.guardianEmail || "").trim(),
          guardianPhone: localMobile(profile.guardianPhone || ""),
          guardianRelation: profile.guardianRelation,
        } : {}),
        educationStage: profile.educationStage,
        grade: profile.educationStage === "ADULT" ? null : profile.grade,
        school: profile.educationStage === "ADULT" ? null : profile.school,
        phone: localMobile(profile.phone),
        city: profile.city,
        district: profile.district,
        addressLine: profile.addressLine,
        postalCode: profile.postalCode,
        marketingConsent: profile.marketingConsent === true,
        ...(photoDataUrl ? { photoDataUrl } : {}),
        ...(removePhoto ? { removePhoto: true } : {}),
      }),
    });

    const profileBody = await profileResponse.json().catch(() => ({}));

    if (!profileResponse.ok) {
      setMessage(
        profileBody.errors
          ? Object.values(profileBody.errors).join(" ")
          : "Profil kaydedilemedi.",
      );
      setState("ready");
      return;
    }

    const requestedEmail = profile.email.trim().toLowerCase();
    const currentEmail = originalEmail.trim().toLowerCase();

    if (requestedEmail !== currentEmail) {
      const emailResponse = await fetch("/api/auth/change-email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newEmail: requestedEmail,
          callbackURL: "/panel/ogrenci/profil",
        }),
      });

      const emailBody = await emailResponse.json().catch(() => ({}));

      if (!emailResponse.ok) {
        setProfile((current) => ({
          ...current,
          ...profileBody.profile,
          email: originalEmail,
        }));
        setPhotoDataUrl(null);
        setRemovePhoto(false);
        setErrors((current) => ({
          ...current,
          email: emailBody.message || "E-posta değişikliği başlatılamadı.",
        }));
        setMessage("Diğer profil bilgileriniz kaydedildi.");
        setState("ready");
        return;
      }

      setProfile((current) => ({
        ...current,
        ...profileBody.profile,
        email: originalEmail,
      }));
      setPhotoDataUrl(null);
      setRemovePhoto(false);
      setMessage(
        "Profiliniz kaydedildi. Yeni e-posta adresinize doğrulama bağlantısı gönderildi.",
      );
      setState("ready");
      return;
    }

    setProfile((current) => ({
      ...current,
      ...profileBody.profile,
      email: originalEmail,
    }));
    setPhotoDataUrl(null);
    setRemovePhoto(false);
    setMessage("Profiliniz kaydedildi.");
    setState("ready");
  };

  if (state === "loading") {
    return (
      <StudentPanelShell user={user} guardian={guardian}>
        <div className="student-portal__state" role="status">
          Profil yükleniyor…
        </div>
      </StudentPanelShell>
    );
  }

  if (state === "error") {
    return (
      <StudentPanelShell user={user} guardian={guardian}>
        <div className="student-portal__state">
          <h3>Profil yüklenemedi</h3>
          <p>{message}</p>
          <button type="button" onClick={load}>
            Tekrar dene
          </button>
        </div>
      </StudentPanelShell>
    );
  }

  return (
    <StudentPanelShell user={user} guardian={guardian}>
      <div className="trainer-panel" style={{ display: "contents" }}>
        <main className="trainer-profile-page student-profile-trainer-parity">
          <div className="trainer-profile-heading">
            <div>
              <h2>Profilim</h2>
              <p>Kişisel, eğitim ve adres bilgilerinizi güncel tutabilirsiniz.</p>
            </div>

            <div className="trainer-profile-breadcrumb">
              Ana Sayfa <PanelIcon name="chevron-right" size={16} />{" "}
              <strong>Profilim</strong>
            </div>
          </div>

          {message && (
            <p className="student-portal__banner" role="status">
              {message}
            </p>
          )}

          <form onSubmit={(event) => void save(event)}>
            <div className="trainer-profile-layout">
              {profile.childProfileId && <section className="trainer-profile-card student-profile-single-card">
                <div className="trainer-profile-form">
                  <h3>Çocuğun eğitim bilgileri</h3>
                  <p>{profile.firstName} {profile.lastName} · {stage?.label || "Eğitim kademesi belirtilmedi"}</p>
                  {stage && stage.value !== "ADULT" ? <>
                    <label>Okul adı<input value={profile.school || ""} maxLength={160} disabled={educationSaving} onChange={e => setProfile(p => ({ ...p, school: e.target.value }))}/></label>
                    <label>Sınıf<select value={profile.grade || ""} disabled={educationSaving} onChange={e => setProfile(p => ({ ...p, grade: e.target.value }))}><option value="">Seçin</option>{stage.grades.map(g => <option key={g} value={g}>{g}. Sınıf</option>)}</select></label>
                    <label>Şube (isteğe bağlı)<input value={profile.classBranch || ""} maxLength={12} disabled={educationSaving} onChange={e => setProfile(p => ({ ...p, classBranch: e.target.value }))}/></label>
                    <button type="button" className="profile-button" disabled={educationSaving || photoSaving} onClick={() => void saveChildEducation()}>{educationSaving ? "Kaydediliyor..." : "Eğitim bilgilerini kaydet"}</button>
                    {educationNotice && <p role="status">{educationNotice}</p>}
                  </> : <p>Eğitim kademesi değişikliği için yönetimle iletişime geçin.</p>}
                </div>
              </section>}
              {!profile.childProfileId && <section className="trainer-profile-card student-profile-single-card">
                <div className="trainer-profile-form">
                  <div className="student-profile-section-heading">
                    <div className="student-profile-section-icon">
                      <PanelIcon name="user-solid" size={20} />
                    </div>
                    <div>
                      <h3>Kişisel Bilgiler</h3>
                      <p>Temel profil ve eğitim bilgilerinizi güncel tutun.</p>
                    </div>
                  </div>

                  <div className="profile-grid">
                    <ProfileField
                      label="Ad"
                      value={profile.firstName}
                      required
                      readOnly={guardian}
                      error={errors.firstName}
                      onChange={(value) => update("firstName", value)}
                    />

                    <ProfileField
                      label="Soyad"
                      value={profile.lastName}
                      required
                      readOnly={guardian}
                      error={errors.lastName}
                      onChange={(value) => update("lastName", value)}
                    />

                    <BirthDatePicker
                      value={profile.dateOfBirth || ""}
                      disabled={guardian}
                      error={errors.dateOfBirth}
                      onChange={(value) => update("dateOfBirth", value)}
                    />

                    <ProfileField
                      label="E-posta"
                      type="email"
                      icon="mail"
                      value={profile.email}
                      required
                      readOnly={guardian}
                      error={errors.email}
                      onChange={(value) => update("email", value)}
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
                          readOnly={guardian}
                          onInput={(event) =>
                            update(
                              "phone",
                              event.currentTarget.value
                                .replace(/\D/gu, "")
                                .slice(0, 10),
                            )
                          }
                          aria-invalid={Boolean(errors.phone)}
                          placeholder="5XXXXXXXXX"
                        />
                      </span>
                      {errors.phone && <small>{errors.phone}</small>}
                    </label>

                    <label className="profile-field">
                      <span>Size uygun paket grubunu seçin</span>
                      <span className="profile-input-wrap student-profile-select-wrap">
                        <select
                          disabled={guardian}
                          required
                          value={profile.educationStage}
                          onChange={(event) => {
                            setProfile((current) => ({
                              ...current,
                              educationStage: event.target.value,
                              grade: "",
                              school:
                                event.target.value === "ADULT"
                                  ? ""
                                  : current.school,
                            }));
                            setErrors((current) => ({
                              ...current,
                              educationStage: "",
                              grade: "",
                              school: "",
                            }));
                            setMessage("");
                          }}
                        >
                          <option value="">Seçin</option>
                          {stages.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </span>
                      <small className="student-profile-v2__helper">
                        Size doğru paketleri gösterebilmemiz için mevcut
                        durumunuzu seçin.
                      </small>
                      {errors.educationStage && (
                        <small>{errors.educationStage}</small>
                      )}
                    </label>

                    {profile.educationStage !== "ADULT" && (
                      <>
                        <label className="profile-field">
                          <span>Sınıf</span>
                          <span className="profile-input-wrap student-profile-select-wrap">
                            <select
                              disabled={guardian || !stage}
                              required
                              value={profile.grade || ""}
                              onChange={(event) =>
                                update("grade", event.target.value)
                              }
                            >
                              <option value="">Seçin</option>
                              {stage?.grades.map((grade) => (
                                <option key={grade} value={grade}>
                                  {grade}. Sınıf
                                </option>
                              ))}
                            </select>
                          </span>
                          {errors.grade && <small>{errors.grade}</small>}
                        </label>

                        <ProfileField
                          label="Okulunuzun adı"
                          icon="building"
                          value={profile.school}
                          required
                          readOnly={guardian}
                          error={errors.school}
                          onChange={(value) => update("school", value)}
                        />
                      </>
                    )}
                  </div>

                  {/* FIXOKU_STUDENT_R14_GUARDIAN */}
                  {profile.educationStage && profile.educationStage !== "ADULT" && (
                    <>
                      <div className="student-profile-section-divider" />
                      <div className="student-profile-section-heading">
                        <div className="student-profile-section-icon"><PanelIcon name="users" size={20} /></div>
                        <div>
                          <h3>Veli Bilgileri</h3>
                          <p>Öğrenciyle iletişim için veli bilgilerini girin.</p>
                        </div>
                      </div>
                      <div className="profile-grid">
                        <ProfileField
                          label="Veli adı soyadı"
                          value={profile.guardianName || ""}
                          required
                          readOnly={guardian}
                          error={errors.guardianName}
                          onChange={(value) => update("guardianName", value)}
                        />
                        <ProfileField
                          label="Veli e-posta adresi"
                          type="email"
                          icon="mail"
                          value={profile.guardianEmail || ""}
                          required
                          readOnly={guardian}
                          error={errors.guardianEmail}
                          onChange={(value) => update("guardianEmail", value)}
                        />
                        {/* FIXOKU_STUDENT_R15_GUARDIAN_PHONE */}
                        <label className="profile-field">
                          <span>Veli telefon numarası</span>
                          <span className="profile-input-wrap trainer-phone-control">
                            <b>+90</b>
                            <input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              maxLength={10}
                              pattern="5[0-9]{9}"
                              required
                              readOnly={guardian}
                              value={localMobile(profile.guardianPhone || "")}
                              onChange={(event) => update("guardianPhone", event.currentTarget.value.replace(/\D/gu, "").slice(0, 10))}
                              aria-invalid={Boolean(errors.guardianPhone)}
                              placeholder="5XXXXXXXXX"
                            />
                          </span>
                          {errors.guardianPhone && <small>{errors.guardianPhone}</small>}
                        </label>
                        <label className="profile-field ">
                          <span>Yakınlık derecesi</span>
                          <span className="profile-input-wrap student-profile-select-wrap">
                            <select
                              disabled={guardian}
                              required
                              value={profile.guardianRelation || ""}
                              onChange={(event) => update("guardianRelation", event.target.value)}
                            >
                              <option value="">Seçiniz</option>
                              {["Anne", "Baba", "Vasi", "Diğer"].map((relation) => (
                                <option key={relation} value={relation}>{relation}</option>
                              ))}
                            </select>
                          </span>
                          {errors.guardianRelation && <small>{errors.guardianRelation}</small>}
                        </label>
                      </div>
                    </>
                  )}

                  <div className="student-profile-section-divider" />

                  <div className="student-profile-section-heading student-profile-address-heading">
                    <div className="student-profile-section-icon">
                      <PanelIcon name="pin" size={20} />
                    </div>
                    <div>
                      <h3>Adres Bilgileri</h3>
                      <p>Teslimat ve iletişim için adres bilgilerinizi güncel tutun.</p>
                    </div>
                  </div>

                  <div className="profile-grid">
                    <label className="profile-field">
                      <span>İl</span>
                      <span className="profile-input-wrap student-profile-select-wrap">
                        <select
                          disabled={guardian}
                          required
                          value={profile.city || ""}
                          onChange={(event) => {
                            setProfile((current) => ({
                              ...current,
                              city: event.target.value,
                              district: "",
                            }));
                            setErrors((current) => ({
                              ...current,
                              city: "",
                              district: "",
                            }));
                            setMessage("");
                          }}
                        >
                          <option value="">İl seçin</option>
                          {TURKEY_LOCATIONS.map((province) => (
                            <option
                              key={province.plate}
                              value={province.name}
                            >
                              {province.name}
                            </option>
                          ))}
                        </select>
                      </span>
                      {errors.city && <small>{errors.city}</small>}
                    </label>

                    <label className="profile-field">
                      <span>İlçe</span>
                      <span className="profile-input-wrap student-profile-select-wrap">
                        <select
                          disabled={guardian || !profile.city}
                          required
                          value={profile.district || ""}
                          onChange={(event) =>
                            update("district", event.target.value)
                          }
                        >
                          <option value="">
                            {profile.city
                              ? "İlçe seçin"
                              : "Önce il seçin"}
                          </option>
                          {districts.map((district) => (
                            <option key={district} value={district}>
                              {district}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>

                    <ProfileField
                      className="full"
                      label="Açık adres"
                      value={profile.addressLine}
                      readOnly={guardian}
                      onChange={(value) => update("addressLine", value)}
                    />


                  </div>

                  <div className="trainer-profile-feedback-row student-profile-save-row">
                    <span
                      className="profile-feedback"
                      role="status"
                      aria-live="polite"
                    >
                      {message}
                    </span>

                    {!guardian && (
                      <button
                        type="submit"
                        className="profile-button trainer-profile-personal-save"
                        disabled={state === "saving"}
                      >
                        <PanelIcon name="save" size={22} />
                        {state === "saving"
                          ? "Kaydediliyor…"
                          : "Bilgilerimi Güncelle"}
                      </button>
                    )}
                  </div>
                </div>
              </section>}

              <aside className="trainer-profile-rail student-profile-rail">
                <div className="trainer-profile-identity student-profile-identity">
                  <div className="profile-photo-control">
                    {avatarSrc && !photoError ? (
                      <img
                        className="trainer-profile-avatar trainer-profile-avatar-image student-profile-avatar"
                        src={avatarSrc}
                        alt="Profil fotoğrafı"
                        onError={() => setPhotoError(true)}
                      />
                    ) : (
                      <div
                        className="trainer-profile-avatar student-profile-avatar"
                        aria-label="Profil fotoğrafı yok"
                      >
                        {initials}
                      </div>
                    )}

                    {canManagePhoto && (
                      <label className="profile-photo-button">
                        <PanelIcon name="camera" size={25} />
                        <input
                          aria-label="Profil fotoğrafı seç"
                          type="file"
                          disabled={photoSaving || state === "saving"}
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            choosePhoto(event.target.files?.[0])
                          }
                        />
                      </label>
                    )}
                  </div>

                  {errors.photo && (
                    <p className="trainer-photo-error" role="alert">
                      {errors.photo}
                    </p>
                  )}

                  <h3>{studentDisplayName(profile.firstName, profile.lastName, user.name)}</h3>

                  <p className="student-profile-role-text">Öğrenci</p>
                  {profile.childProfileId && <p>Seçili çocuk profili · {[profile.grade, profile.school].filter(Boolean).join(" · ")}</p>}

                  {canManagePhoto && photoDataUrl && (
                    <button type="button" className="profile-button" disabled={photoSaving} onClick={() => void savePhoto()}>
                      <PanelIcon name="save" size={20} />{photoSaving ? "Fotoğraf kaydediliyor..." : "Fotoğrafı Kaydet"}
                    </button>
                  )}
                  {photoNotice && <small role="status" aria-live="polite" className="fixoku-r23-photo-notice">{photoNotice}</small>}
                  {canManagePhoto &&
                    Boolean(profile.photoStorageKey) && !photoDataUrl && (
                      <button
                        type="button"
                        className="profile-button profile-button-secondary trainer-photo-remove"
                        disabled={photoSaving || state === "saving"}
                        onClick={() => { if (window.confirm("Profil fotoğrafı kaldırılsın mı?")) void savePhoto(true); }}
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
          </form>
        </main>
      </div>
    </StudentPanelShell>
  );
}

/* FIXOKU_STUDENT_R14_BIRTHDATE */
function BirthDatePicker({ value, onChange, disabled, error }: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}) {
  const parts = /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value.split("-") : [];
  const [year, setYear] = useState(parts[0] || "");
  const [month, setMonth] = useState(parts[1] || "");
  const [day, setDay] = useState(parts[2] ? String(Number(parts[2])) : "");
  const currentYear = new Date().getFullYear();
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const maxDay = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  function change(y: string, m: string, d: string) {
    const safeDay = y && m && Number(d) > new Date(Number(y), Number(m), 0).getDate() ? "" : d;
    setYear(y);
    setMonth(m);
    setDay(safeDay);
    onChange(y && m && safeDay ? `${y}-${m}-${safeDay.padStart(2,"0")}` : "");
  }
  return (
    <fieldset className="student-r14-birthdate">
      <legend>Doğum tarihi</legend>
      <div className="student-r14-date-fields">
        <select aria-label="Doğum günü" disabled={disabled} value={day} onChange={(e) => change(year, month, e.target.value)}>
          <option value="">Gün</option>
          {Array.from({ length: maxDay }, (_, i) => String(i + 1)).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Doğum ayı" disabled={disabled} value={month} onChange={(e) => change(year, e.target.value, day)}>
          <option value="">Ay</option>
          {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2,"0")}>{m}</option>)}
        </select>
        <select aria-label="Doğum yılı" disabled={disabled} value={year} onChange={(e) => change(e.target.value, month, day)}>
          <option value="">Yıl</option>
          {Array.from({length: 110}, (_, i) => String(currentYear - i)).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {error && <small>{error}</small>}
    </fieldset>
  );
}
function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  required = false,
  max,
  error,
  className = "",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  max?: string;
  error?: string;
  className?: string;
  icon?: any;
}) {
  return (
    <label className={`profile-field ${className}`}>
      <span>{label}</span>
      <span className="profile-input-wrap">
        {icon && <PanelIcon name={icon} size={20} />}
        <input
          type={type}
          value={value || ""}
          readOnly={readOnly}
          required={required}
          max={max}
          onInput={(event) => onChange(event.currentTarget.value)}
          aria-invalid={Boolean(error)}
        />
      </span>
      {error && <small>{error}</small>}
    </label>
  );
}
