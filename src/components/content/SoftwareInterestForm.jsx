import { useState } from "react";
import { Link } from "react-router-dom";
import "./software-interest-form.css";

const USER_TYPE_OPTIONS = ["Eğitmen", "Öğrenci", "Kurum Sahibi"];

const INITIAL_VALUES = {
  fullName: "",
  email: "",
  phone: "",
  userType: "",
  city: "",
  district: "",
  message: "",
};

const FIELD_LIMITS = {
  fullName: 100,
  email: 254,
  phone: 24,
  city: 80,
  district: 80,
  message: 2000,
};

function validateForm(values) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
  const phonePattern = /^[0-9+()\s.-]{7,24}$/u;

  if (values.fullName.trim().length < 2) {
    errors.fullName = "Adınızı ve soyadınızı yazın.";
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = "Geçerli bir e-posta adresi yazın.";
  }
  if (!phonePattern.test(values.phone.trim())) {
    errors.phone = "Geçerli bir telefon numarası yazın.";
  }
  if (!USER_TYPE_OPTIONS.includes(values.userType)) {
    errors.userType = "Kullanıcı tipini seçin.";
  }
  if (values.city.trim().length < 2) {
    errors.city = "İl bilgisini yazın.";
  }
  if (values.district.trim().length < 2) {
    errors.district = "İlçe bilgisini yazın.";
  }
  if (values.message.trim().length < 10) {
    errors.message = "Mesajınızı en az 10 karakterle açıklayın.";
  }

  return errors;
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <span className="software-interest-field-error" id={id}>
      {children}
    </span>
  );
}

export default function SoftwareInterestForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;
    const limit = FIELD_LIMITS[name];
    setValues((current) => ({
      ...current,
      [name]: typeof limit === "number" ? value.slice(0, limit) : value,
    }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setStatus("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("Lütfen işaretli alanları kontrol edin.");
      const firstInvalidName = Object.keys(nextErrors)[0];
      event.currentTarget.elements[firstInvalidName]?.focus();
      return;
    }

    setStatus(
      "Form gönderim servisi henüz bağlı değil. Bilgi almak için İletişim sayfasından ekibimize ulaşabilirsiniz.",
    );
  };

  return (
    <section className="software-interest-form" aria-labelledby="software-interest-form-title">
      <div className="software-interest-form-inner">
        <div className="software-interest-form-heading">
          <span className="software-interest-form-kicker">Yazılım hakkında bilgi</span>
          <h2 id="software-interest-form-title">Yazılımı İncelemek İstiyorum</h2>
          <p>
            Yazılımın eğitim sürecindeki kullanımını değerlendirmek için bilgilerinizi paylaşabilirsiniz.
          </p>
        </div>

        <form className="software-interest-form-fields" onSubmit={handleSubmit} noValidate>
          <div className="software-interest-form-grid">
            <label className="software-interest-field" htmlFor="software-interest-full-name">
              <span>Ad Soyad</span>
              <input
                id="software-interest-full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                maxLength={FIELD_LIMITS.fullName}
                value={values.fullName}
                onChange={updateField}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "software-interest-full-name-error" : undefined}
              />
              <FieldError id="software-interest-full-name-error">{errors.fullName}</FieldError>
            </label>

            <label className="software-interest-field" htmlFor="software-interest-email">
              <span>E-posta</span>
              <input
                id="software-interest-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={FIELD_LIMITS.email}
                value={values.email}
                onChange={updateField}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "software-interest-email-error" : undefined}
              />
              <FieldError id="software-interest-email-error">{errors.email}</FieldError>
            </label>

            <label className="software-interest-field" htmlFor="software-interest-phone">
              <span>Telefon</span>
              <input
                id="software-interest-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={FIELD_LIMITS.phone}
                value={values.phone}
                onChange={updateField}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "software-interest-phone-error" : undefined}
              />
              <FieldError id="software-interest-phone-error">{errors.phone}</FieldError>
            </label>

            <label className="software-interest-field" htmlFor="software-interest-user-type">
              <span>Kullanıcı Tipi</span>
              <select
                id="software-interest-user-type"
                name="userType"
                required
                value={values.userType}
                onChange={updateField}
                aria-invalid={Boolean(errors.userType)}
                aria-describedby={errors.userType ? "software-interest-user-type-error" : undefined}
              >
                <option value="">Seçiniz</option>
                {USER_TYPE_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <FieldError id="software-interest-user-type-error">{errors.userType}</FieldError>
            </label>

            <label className="software-interest-field" htmlFor="software-interest-city">
              <span>İl</span>
              <input
                id="software-interest-city"
                name="city"
                type="text"
                autoComplete="address-level1"
                required
                maxLength={FIELD_LIMITS.city}
                value={values.city}
                onChange={updateField}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? "software-interest-city-error" : undefined}
                placeholder="Örn. İzmir"
              />
              <FieldError id="software-interest-city-error">{errors.city}</FieldError>
            </label>

            <label className="software-interest-field" htmlFor="software-interest-district">
              <span>İlçe</span>
              <input
                id="software-interest-district"
                name="district"
                type="text"
                autoComplete="address-level2"
                required
                maxLength={FIELD_LIMITS.district}
                value={values.district}
                onChange={updateField}
                aria-invalid={Boolean(errors.district)}
                aria-describedby={errors.district ? "software-interest-district-error" : undefined}
                placeholder="Örn. Konak"
              />
              <FieldError id="software-interest-district-error">{errors.district}</FieldError>
            </label>

            <label className="software-interest-field software-interest-field-full" htmlFor="software-interest-message">
              <span>Mesajınız</span>
              <textarea
                id="software-interest-message"
                name="message"
                rows="5"
                required
                minLength="10"
                maxLength={FIELD_LIMITS.message}
                value={values.message}
                onChange={updateField}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "software-interest-message-error" : undefined}
                placeholder="Yazılım hakkında öğrenmek istediklerinizi yazın..."
              />
              <FieldError id="software-interest-message-error">{errors.message}</FieldError>
            </label>
          </div>

          {status && (
            <p className={`software-interest-form-status ${Object.keys(errors).length ? "is-error" : "is-unresolved"}`} role="status" aria-live="polite">
              {status}
              {!Object.keys(errors).length && (
                <>
                  {" "}
                  <Link to="/iletisim">İletişim sayfasına geçin.</Link>
                </>
              )}
            </p>
          )}

          <button type="submit" className="software-interest-submit">
            Formu Kontrol Et <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="software-interest-form-note">
          Form bilgileri bu sayfada geçici olarak tutulur; gönderim servisi bağlanana kadar otomatik olarak iletilmez.
        </p>
      </div>
    </section>
  );
}
