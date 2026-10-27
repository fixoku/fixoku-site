import { useState } from "react";
import logo from "../assets/logo-fixoku.png";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("ogrenci@fixoku.com");
  const [password, setPassword] = useState("");

  return (
    <main className="fx-login">
      <div className="fx-login-orb fx-login-orb-one" />
      <div className="fx-login-orb fx-login-orb-two" />

      <section className="fx-login-panel">
        <div className="fx-login-visual">
          <div
            className="fx-login-brand"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              marginBottom: "20px",
            }}
          >
            <img
              src={logo}
              alt="Fixoku"
              style={{
                height: 120,
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
                filter: "drop-shadow(0 12px 30px rgba(0,0,0,.35))",
              }}
            />
          </div>

          <h1>Akıllı eğitim paneli</h1>
          <p>Okuma, anlama, dikkat ve gelişim takibi tek ekranda.</p>
        </div>

        <form
          className="fx-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin({ email, password });
          }}
        >
          <span className="fx-kicker">Güvenli Giriş</span>
          <h2>Panele giriş yap</h2>

          <label>
            E-posta
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreniz"
            />
          </label>

          <button type="submit">Giriş Yap</button>
        </form>
      </section>
    </main>
  );
}
