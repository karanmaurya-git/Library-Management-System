import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, ArrowLeftRight, BookMarked, Receipt, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_TABS = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/books', label: 'Catalog', icon: BookOpen },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/borrow', label: 'Issue & Return', icon: ArrowLeftRight },
  { to: '/reservations', label: 'Reservations', icon: BookMarked },
  { to: '/fines', label: 'Fines', icon: Receipt },
  { to: '/admins', label: 'Admins', icon: ShieldCheck },
];

const MEMBER_TABS = [
  { to: '/', label: 'Catalog', end: true, icon: BookOpen },
  { to: '/my-loans', label: 'My Loans', icon: ArrowLeftRight },
  { to: '/reservations', label: 'My Reservations', icon: BookMarked },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const tabs = isAdmin ? ADMIN_TABS : MEMBER_TABS;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Stacks<span>.</span></div>
      <nav className="sidebar-nav">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `sidebar-tab${isActive ? ' active' : ''}`}
            >
              <Icon size={15} strokeWidth={2} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user-name">{user?.name}</div>
        <div className="sidebar-user-role">{user?.role === 'admin' ? 'Librarian' : user?.member_type}</div>
        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={13} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
