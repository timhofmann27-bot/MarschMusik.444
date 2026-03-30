import { NavLink } from 'react-router-dom';
import { Home, Library, Search, Upload, ListMusic, Heart } from 'lucide-react';

const items = [
  { to: '/', icon: Home, label: 'Start' },
  { to: '/suche', icon: Search, label: 'Suche' },
  { to: '/bibliothek', icon: Library, label: 'Bibliothek' },
  { to: '/hochladen', icon: Upload, label: 'Upload' },
  { to: '/playlists', icon: ListMusic, label: 'Playlists' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-hf-bg/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-bottom" data-testid="mobile-nav">
      <div className="flex justify-around items-center py-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 transition-all duration-200 ${
                isActive ? 'text-hf-gold' : 'text-hf-text-muted'
              }`
            }
            data-testid={`mobile-nav-${to.replace('/', '') || 'home'}`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
