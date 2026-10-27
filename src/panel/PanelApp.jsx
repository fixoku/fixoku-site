import { useMemo, useState } from "react";
import "./panel.css";
import Login from "./pages/Login";
import StudentPanel from "./pages/StudentPanel";
import TeacherDashboard from "./pages/TeacherDashboard";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const demoUsers = {
  "ogrenci@fixoku.com": {
    id: "stu-001",
    name: "Yusuf Selek",
    email: "ogrenci@fixoku.com",
    role: "student",
    school: "Fixoku Akademi",
    className: "Öğrenci",
    endDate: "Tanımlanmamış",
    avatar: "",
  },
  "ogretmen@fixoku.com": {
    id: "tea-001",
    name: "Burak Öğretmen",
    email: "ogretmen@fixoku.com",
    role: "teacher",
    school: "Fixoku Antalya",
    className: "Eğitmen",
    avatar: "",
  },
  "kurum@fixoku.com": {
    id: "ins-001",
    name: "Fixoku Kurum",
    email: "kurum@fixoku.com",
    role: "institution",
    school: "Kurum Yönetimi",
    className: "Merkez",
    avatar: "",
  },
  "admin@fixoku.com": {
    id: "adm-001",
    name: "Fixoku Admin",
    email: "admin@fixoku.com",
    role: "admin",
    school: "Genel Merkez",
    className: "Admin",
    avatar: "",
  },
};

export default function PanelApp() {
  const [user, setUser] = useState(null);

  const handleLogin = ({ email }) => {
    setUser(demoUsers[email] || demoUsers["ogrenci@fixoku.com"]);
  };

  const handleLogout = () => setUser(null);

  const page = useMemo(() => {
    if (!user) return null;
    if (user.role === "teacher") return <TeacherDashboard user={user} onLogout={handleLogout} />;
    if (user.role === "institution") return <InstitutionDashboard user={user} onLogout={handleLogout} />;
    if (user.role === "admin") return <AdminDashboard user={user} onLogout={handleLogout} />;
    return <StudentPanel user={user} onLogout={handleLogout} />;
  }, [user]);

  if (!user) return <Login onLogin={handleLogin} />;

  return page;
}
