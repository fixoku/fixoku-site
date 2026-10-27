import { useState } from "react";
import logo from "../assets/logo-fixoku.png";
import Icon from "../components/Icon";
import { menuItems } from "../data/studentData";

export default function StudentLayout({ user, activePage, setActivePage, children, onLogout }) {
  const [avatar, setAvatar] = useState(user.avatar);

  const uploadAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatar(URL.createObjectURL(file));
  };

  return (
    <div className="student-shell">
      <aside className="student-sidebar">
        <div className="sidebar-logo-wrap">
          <img src={logo} alt="Fixoku" className="sidebar-logo" />
        </div>

        <div className="sidebar-profile">
          <label className="profile-avatar">
            {avatar ? (
              <img src={avatar} alt="Profil" />
            ) : (
              <>
                <span className="avatar-head" />
                <span className="avatar-body" />
                <span className="avatar-camera"><Icon name="camera" /></span>
              </>
            )}
            <input type="file" accept="image/*" onChange={uploadAvatar} />
          </label>

          <strong>{user.name}</strong>
          <p>Yazılım Bitiş Tarihi: {user.endDate}</p>

          <button className="info-link" type="button">
            <Icon name="info" />
            Bilgilendirme
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={activePage === item.key ? "active" : ""}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}

          <button type="button" onClick={onLogout}>
            <Icon name="logout" />
            <span>Çıkış</span>
          </button>
        </nav>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <h1>ÖĞRENCİ YAZILIM PANELİ</h1>
        </header>

        <div className="student-content">{children}</div>

        <footer className="student-footer">
          Fixoku eğitim setinin kitap, yazılım ve eğitim sistemi tüm hakları saklıdır.
          İzinsiz çoğaltılamaz veya dağıtılamaz.
        </footer>
      </main>
    </div>
  );
}
