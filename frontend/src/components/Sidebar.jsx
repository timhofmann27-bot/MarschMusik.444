import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Library, Upload, ListMusic, Heart, Search, User, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: Home, label: 'Startseite' },
  { to: '/bibliothek', icon: Library, label: 'Bibliothek' },
  { to: '/suche', icon: Search, label: 'Suche' },
  { to: '/hochladen', icon: Upload, label: 'Hochladen' },
  { to: '/playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/favoriten', icon: Heart, label: 'Favoriten' },
  { to: '/verlauf', icon: Clock, label: 'Verlauf' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-hf-bg border-r border-white/5 h-screen fixed left-0 top-0 z-40" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <img src="/logo.jpg" alt="444HF" className="w-10 h-10 rounded-xl" />
        <div>
          <div className="text-sm font-bold text-white tracking-tight">444.HEIMAT-FUNK</div>
          <div className="text-[10px] text-hf-text-muted tracking-widest uppercase">Music</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-hf-gold/10 text-hf-gold'
                  : 'text-hf-text-muted hover:text-white hover:bg-white/5'
              }`
            }
            data-testid={`nav-${to.replace('/', '') || 'home'}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <NavLink
          to="/profil"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-hf-text-muted hover:text-white hover:bg-white/5 transition-all"
          data-testid="nav-profile"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-hf-gold/20 flex items-center justify-center">
              <User size={14} className="text-hf-gold" />
            </div>
          )}
          <span className="truncate">{user?.username || 'Profil'}</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-hf-text-muted hover:text-red-400 hover:bg-red-500/5 transition-all w-full mt-1"
          data-testid="logout-button"
        >
          <LogOut size={18} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
