import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const SongCardSkeleton = () => {
  return (
    <div className="bg-black/50 border border-military-green/30 p-3 md:p-4">
      <Skeleton 
        height={200} 
        baseColor="rgba(0, 255, 65, 0.05)" 
        highlightColor="rgba(0, 255, 65, 0.1)"
        className="mb-3"
      />
      <Skeleton 
        height={20} 
        width="80%"
        baseColor="rgba(0, 255, 65, 0.05)" 
        highlightColor="rgba(0, 255, 65, 0.1)"
        className="mb-2"
      />
      <Skeleton 
        height={16} 
        width="60%"
        baseColor="rgba(0, 255, 65, 0.05)" 
        highlightColor="rgba(0, 255, 65, 0.1)"
      />
    </div>
  );
};

export default SongCardSkeleton;