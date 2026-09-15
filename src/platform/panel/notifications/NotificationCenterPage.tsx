import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PanelIcon } from "../components/PanelIcon";
import { PanelShell } from "../layout/PanelShell";
import "./notification-center.css";

type NotificationRecord = {
  id: string;
  eventType?: string;
  title: string;
  body: string;
  metadataJson?: string | Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

type NotificationResponse = { notifications?: NotificationRecord[]; unreadCount?: number };
type User = { id: string; name: string; email?: string };

function parseMetadata(value: NotificationRecord["metadataJson"]): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** Metadata is data from the database, so only same-origin panel paths can become links. */
function safePanelPath(notification: NotificationRecord): string | null {
  const metadata = parseMetadata(notification.metadataJson);
  const candidate = metadata.path ?? metadata.href ?? metadata.url;
  if (typeof candidate !== "string" || !candidate.startsWith("/panel/") || candidate.startsWith("//")) return null;
  try {
    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const url = new URL(candidate, origin);
    return url.origin === origin && url.pathname.startsWith("/panel/") ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const eventLabels: Record<string, string> = {
  TRAINER_ASSIGNMENT: "Eğitmen ataması",
  TRAINER_REASSIGNMENT: "Eğitmen değişikliği",
  PACKAGE_COMPLETION: "Eğitim tamamlandı",
  PAYMENT_SUCCEEDED: "Ödeme alındı",
};

export function NotificationCenterPage({ user, role }: { user: User; role?: "OWNER" | "ADMIN" | "TRAINER" | "STUDENT" }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | "all" | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("NOTIFICATIONS_UNAVAILABLE");
      const data = await response.json() as NotificationResponse;
      const notifications = Array.isArray(data.notifications) ? data.notifications : [];
      setItems(notifications);
      setUnreadCount(Number.isFinite(Number(data.unreadCount)) ? Number(data.unreadCount) : notifications.filter((item) => !item.readAt).length);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const unreadInList = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const markRead = async (notification: NotificationRecord, target?: string | null) => {
    if (busyId || notification.readAt) {
      if (target) navigate(target);
      return;
    }
    setBusyId(notification.id);
    setMessage("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notification.id }) });
      if (!response.ok) throw new Error("READ_FAILED");
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      if (target) navigate(target);
    } catch {
      setMessage("Bildirim okunamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    if (busyId || unreadCount === 0) return;
    setBusyId("all");
    setMessage("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (!response.ok) throw new Error("READ_ALL_FAILED");
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      setUnreadCount(0);
    } catch {
      setMessage("Bildirimler okunamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  };

  return <PanelShell user={user} role={role}>
    <main className="notification-center-page">
      <div className="notification-center-heading">
        <div>
          <p className="notification-center-breadcrumb"><button type="button" onClick={() => navigate(-1)}>Geri</button><span aria-hidden="true">›</span> Bildirimler</p>
          <h1>Bildirim Merkezi</h1>
          <p>Hesabınızla ilişkili güncel gelişmeleri buradan takip edebilirsiniz.</p>
        </div>
        <div className="notification-center-actions">
          <span className="notification-count" aria-live="polite">{unreadCount} okunmamış</span>
          <button type="button" className="notification-mark-all" onClick={() => void markAllRead()} disabled={busyId !== null || unreadCount === 0}>{busyId === "all" ? "İşleniyor…" : "Tümünü okundu işaretle"}</button>
        </div>
      </div>
      {message && <p className="notification-center-message" role="alert">{message}</p>}
      {status === "loading" && <div className="notification-center-state" role="status" aria-live="polite">Bildirimler yükleniyor…</div>}
      {status === "error" && <div className="notification-center-state" role="alert"><h2>Bildirimler yüklenemedi</h2><p>Bağlantınızı kontrol edip tekrar deneyin.</p><button type="button" onClick={() => void load()}>Tekrar dene</button></div>}
      {status === "ready" && items.length === 0 && <div className="notification-center-state"><PanelIcon name="bell" size={34} /><h2>Henüz bildiriminiz yok</h2><p>Yeni bir gelişme olduğunda burada göreceksiniz.</p></div>}
      {status === "ready" && items.length > 0 && <section className="notification-list" aria-label="Bildirim listesi">
        {items.map((notification) => {
          const target = safePanelPath(notification);
          const isUnread = !notification.readAt;
          return <article key={notification.id} data-notification-id={notification.id} className={`notification-item${isUnread ? " is-unread" : ""}`}>
            <div className="notification-item-icon" aria-hidden="true"><PanelIcon name={isUnread ? "bell" : "check"} size={22} /></div>
            <div className="notification-item-copy">
              <div className="notification-item-meta"><span>{eventLabels[notification.eventType || ""] || "Bildirim"}</span><time dateTime={notification.createdAt}>{dateLabel(notification.createdAt)}</time></div>
              <h2><button type="button" className="notification-title" onClick={() => void markRead(notification, target)}>{notification.title}</button></h2>
              <p>{notification.body}</p>
              <div className="notification-item-actions">
                {target && <button type="button" className="notification-open" onClick={() => void markRead(notification, target)}>Aç <span aria-hidden="true">→</span></button>}
                {isUnread ? <button type="button" className="notification-read" onClick={() => void markRead(notification)} disabled={busyId !== null}>{busyId === notification.id ? "İşleniyor…" : "Okundu işaretle"}</button> : <span className="notification-read-state">Okundu</span>}
              </div>
            </div>
            {isUnread && <span className="notification-unread-indicator" aria-label="Okunmamış" />}
          </article>;
        })}
      </section>}
      {status === "ready" && items.length > 0 && unreadInList !== unreadCount && <p className="notification-center-footnote">Liste son 100 bildirimi gösterir; üstteki sayaç hesabınızdaki toplam okunmamış bildirim sayısını yansıtır.</p>}
    </main>
  </PanelShell>;
}
