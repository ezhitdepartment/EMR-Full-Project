import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Users,
  BedDouble,
  FlaskConical,
  Pill,
  FileBarChart2,
  ClipboardList,
  Send,
  Activity,
  ShieldCheck,
  Package2,
  History,
  Settings,
  Archive,
  X,
} from "lucide-react";
import { navGroups } from "../../data/navigation";
import { hasFeatureAccess } from "../../data/roles";
import { useAuth } from "../../context/AuthContext";
import logoImg from "../../assets/logo.jpg";
import "./Sidebar.css";

const iconMap = {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Users,
  BedDouble,
  FlaskConical,
  Pill,
  FileBarChart2,
  ClipboardList,
  Send,
  Activity,
  ShieldCheck,
  Package2,
  History,
  Settings,
  Archive,
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {isOpen && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <img src={logoImg} alt="E. Zarate Hospital seal" className="sidebar__mark" />
          <div className="sidebar__brand-text">
            <strong>E. ZARATE</strong>
            <span>HOSPITAL</span>
          </div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              hasFeatureAccess(user?.role, item.feature)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div className="sidebar__group" key={group.label}>
                <p className="sidebar__group-label">{group.label}</p>
                <ul>
                  {visibleItems.map((item) => {
                    const Icon = iconMap[item.icon];
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                          }
                          onClick={onClose}
                        >
                          <Icon size={18} strokeWidth={1.8} />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}