import { Link, useLocation } from 'react-router-dom';
import { Home, Music, Upload, List, Activity, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navigation = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: '/', label: 'KOMMANDO', icon: Home },
    { path: '/arsenal', label: 'ARSENAL', icon: Music },
    { path: '/upload', label: 'UPLOAD', icon: Upload },
    { path: '/missions', label: 'MISSIONEN', icon: List },
  ];
  
  const closeMobileMenu = () => setMobileMenuOpen(false);
  
  return (
    <nav className="bg-black border-b border-military-green/30 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 md:w-6 md:h-6 text-military-green" />
            <span className="text-sm md:text-xl font-bold terminal-text tracking-wider hidden sm:inline">
              TACTICAL SOUND STATION
            </span>
            <span className="text-sm font-bold terminal-text tracking-wider sm:hidden">
              TSS
            </span>
            <div className="status-led ml-2 md:ml-3"></div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
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
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-military-green hover:bg-military-green/10 transition"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-military-green/30">
          <div className="container mx-auto px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 transition-all w-full ${
                    isActive 
                      ? 'bg-military-green/20 text-military-green border border-military-green/50' 
                      : 'text-military-green/60 hover:text-military-green hover:bg-military-green/10 border border-transparent'
                  }`}
                  data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base font-mono tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;