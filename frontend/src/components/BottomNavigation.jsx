import { Link, useLocation } from 'react-router-dom';
import { Home, Music, Upload, List, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'HOME', icon: Home },
    { path: '/arsenal', label: 'ARSENAL', icon: Music },
    { path: '/upload', label: 'UPLOAD', icon: Upload },
    { path: '/missions', label: 'MISSION', icon: List },
  ];
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-military-green/30 z-40" data-testid="bottom-navigation">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center space-y-1 transition-colors"
              data-testid={`bottom-nav-${item.label.toLowerCase()}`}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-military-green rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Icon className={`w-6 h-6 ${
                  isActive ? 'text-military-green' : 'text-military-green/40'
                }`} />
              </motion.div>
              <span className={`text-xs font-mono tracking-wider ${
                isActive ? 'text-military-green' : 'text-military-green/40'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;