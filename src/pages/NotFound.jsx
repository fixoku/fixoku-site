import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";

export default function NotFound() {
  return (
    <div className="page not-found-page">
      <Header />
      <main className="not-found-main">
        <div className="not-found-card">
          <span>404</span>
          <h1>Aradığınız sayfa bulunamadı</h1>
          <p>
            Bağlantı değişmiş veya sayfa kaldırılmış olabilir. Ana sayfaya dönebilir ya da Hızlı Okuma içerik merkezini inceleyebilirsiniz.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="content-button content-button-primary">Ana Sayfaya Dön</Link>
            <Link to="/hizli-okuma" className="content-button content-button-secondary">Hızlı Okuma Merkezi</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
