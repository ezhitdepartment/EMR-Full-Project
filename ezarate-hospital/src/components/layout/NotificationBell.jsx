import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, UserPlus, CalendarCheck, FlaskConical, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  loadNotifications,
  markAsRead,
  markAllAsRead,
  notificationLink,
  formatRelativeTime,
} from "../../utils/notifications";

const ICON_BY_TYPE = {
  new_patient: UserPlus,
  new_registration: CalendarCheck,
  new_lab_test: FlaskConical,
  lab_order_completed: CheckCircle2,
};

// Polling instead of a realtime subscription — simple, and consistent
// with how every other list in this app refreshes (on mount + on window
// focus). 45s keeps the bell reasonably current without hammering the DB.
const POLL_INTERVAL_MS = 45000;

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wrapRef = useRef(null);

  async function refresh() {
    if (!user?.id) return;
    setNotifications(await loadNotifications(user.id));
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  }

  async function handleItemClick(n) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markAsRead(n.id, user.id);
    }
    const link = notificationLink(n);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllAsRead(notifications, user.id);
  }

  return (
    <div className="topbar__user-menu" ref={wrapRef}>
      <button
        className="topbar__icon-btn"
        aria-label="Notifications"
        type="button"
        onClick={handleOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="topbar__badge topbar__badge--count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="topbar__dropdown topbar__dropdown--notifications">
          <div className="topbar__dropdown-header topbar__notif-header">
            <p className="topbar__dropdown-name">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" className="topbar__notif-mark-all" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="topbar__notif-list">
            {notifications.length === 0 ? (
              <p className="topbar__notif-empty">No notifications yet.</p>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_BY_TYPE[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`topbar__notif-item ${n.read ? "" : "topbar__notif-item--unread"}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <span className="topbar__notif-icon">
                      <Icon size={15} />
                    </span>
                    <span className="topbar__notif-body">
                      <span className="topbar__notif-title">{n.title}</span>
                      <span className="topbar__notif-message">{n.message}</span>
                      <span className="topbar__notif-time">{formatRelativeTime(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="topbar__notif-dot" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
