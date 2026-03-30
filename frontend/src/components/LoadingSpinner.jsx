import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { FULL_ROTATION } from '../constants';

const LoadingSpinner = ({ text = 'LADE...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div
        animate={{ rotate: FULL_ROTATION }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-8 h-8 text-military-green" />
      </motion.div>
      <p className="text-military-green font-mono text-sm mt-3">{text}</p>
    </div>
  );
};

export default LoadingSpinner;