import { Link, useLocation } from 'react-router-dom';
import { Home, Music, Upload, List, Activity } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'KOMMANDO', icon: Home },
    { path: '/arsenal', label: 'ARSENAL', icon: Music },
    { path: '/upload', label: 'UPLOAD', icon: Upload },
    { path: '/missions', label: 'MISSIONEN', icon: List },
  ];
  
  return (
    <nav className="bg-black border-b border-military-green/30 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-military-green" />
            <span className="text-xl font-bold terminal-text tracking-wider">TACTICAL SOUND STATION</span>
            <div className="status-led ml-3"></div>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 transition-all ${
                    isActive 
                      ? 'bg-military-green/20 text-military-green border border-military-green/50' 
                      : 'text-military-green/60 hover:text-military-green hover:bg-military-green/10 border border-transparent'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-mono tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;