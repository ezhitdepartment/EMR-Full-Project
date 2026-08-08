import { useEffect, useRef, useState } from "react";
import { Menu, Search, ChevronDown, UserCog, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AccountSettingsModal from "./AccountSettingsModal";
import NotificationBell from "./NotificationBell";
import "./Topbar.css";

export default function Topbar({ onMenuClick }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const fullName = [user?.prefix, user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName = fullName || user?.username || "User";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="topbar">
      <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="topbar__search">
        <Search size={16} />
        <input type="text" placeholder="Search patients, registrations, orders…" />
      </div>

      <div className="topbar__actions">
        <NotificationBell />

        <div className="topbar__user-menu" ref={menuRef}>
          <button
            className="topbar__user"
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
          >
            <span className="topbar__avatar">{initials || "U"}</span>
            <span className="topbar__user-name">{displayName}</span>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <div className="topbar__dropdown">
              <div className="topbar__dropdown-header">
                <p className="topbar__dropdown-name">{displayName.toUpperCase()}</p>
                {user?.email && <p className="topbar__dropdown-email">{user.email}</p>}
                {user?.role && (
                  <p className="topbar__dropdown-role">{user.role.replace(/_/g, " ")}</p>
                )}
              </div>

              <button
                type="button"
                className="topbar__dropdown-item"
                onClick={() => {
                  setShowAccountSettings(true);
                  setMenuOpen(false);
                }}
              >
                <UserCog size={16} />
                Account Settings
              </button>

              <button
                type="button"
                className="topbar__dropdown-item topbar__dropdown-item--danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {showAccountSettings && (
        <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}
    </header>
  );
}