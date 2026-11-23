
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    BookOpen,
    ClipboardList,
    Users,
    Settings,
    GraduationCap,
    Mail,
    LogOut,
    ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Sidebar() {
    const { user, logout } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: "Prehľad", path: "/" },
        { icon: BookOpen, label: "Kurzy", path: "/courses" },
        { icon: ClipboardList, label: "Zadania", path: "/assignments" },
        ...(user?.role === "TEACHER"
            ? [
                { icon: Users, label: "Študenti", path: "/students" },
                { icon: Mail, label: "Pozvánky", path: "/invitations" },
            ]
            : []),
        { icon: Settings, label: "Nastavenia", path: "/settings" },
    ];

    return (
        <aside className="ca-sidebar">
            <div className="ca-sidebar-brand">
                <div className="ca-brand-icon">
                    <GraduationCap size={26} strokeWidth={1.8} />
                </div>

                <div>
                    <div className="ca-brand-name">CODE<span>ASSESS</span></div>
                    <div className="ca-brand-subtitle">ACADEMIC PLATFORM / 01</div>
                </div>
            </div>

            <div className="ca-sidebar-section">
                <span className="ca-sidebar-section-label">01 / NAVIGÁCIA</span>

                <nav className="ca-sidebar-nav">
                    {menuItems.map(({ icon: Icon, label, path }, index) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === "/"}
                            className={({ isActive }) =>
                                `ca-sidebar-link ${isActive ? "ca-sidebar-link-active" : ""}`
                            }
                        >
                            <Icon size={19} strokeWidth={1.8} />
                            <span>{label}</span>
                            <span className="ca-sidebar-link-number">
                {String(index + 1).padStart(2, "0")}
              </span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="ca-sidebar-bottom">
                <div className="ca-sidebar-user">
                    <div className="ca-sidebar-user-label">PRIHLÁSENÝ POUŽÍVATEĽ</div>

                    <div className="ca-sidebar-user-name">
                        {user?.full_name || "Používateľ"}
                    </div>

                    <div className="ca-sidebar-user-email">{user?.email}</div>

                    <span className="ca-sidebar-role">
            {user?.role === "TEACHER" ? "UČITEĽ" : "ŠTUDENT"}
          </span>
                </div>

                <button
                    type="button"
                    onClick={logout}
                    className="ca-sidebar-logout"
                >
                    <LogOut size={18} />
                    <span>Odhlásiť sa</span>
                    <ArrowUpRight size={16} />
                </button>

                <div className="ca-sidebar-footer">
                    BAKALÁRSKA PRÁCA
                    <span>STU / 2026</span>
                </div>
            </div>
        </aside>
    );
}
