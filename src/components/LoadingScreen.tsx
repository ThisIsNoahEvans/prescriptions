import { useState, useEffect, useRef } from 'react';
import logoSvg from '../img/logo.svg';

interface LoadingScreenProps {
  isLoading: boolean;
  onLoaded: () => void;
}

export function LoadingScreen({ isLoading, onLoaded }: LoadingScreenProps) {
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const svgRef = useRef<HTMLImageElement>(null);
  const animationCountRef = useRef(0);
  const hasCalledOnLoadedRef = useRef(false);

  // Track when animation has played at least one full cycle (pulse in + pulse out = 2 iterations)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleIteration = () => {
      animationCountRef.current += 1;
      
      // After first complete cycle (pulse in + pulse out = 2 iterations), mark as played once
      // With 'alternate', each iteration is one direction, so 2 iterations = in + out
      if (animationCountRef.current >= 2 && !hasPlayedOnce) {
        setHasPlayedOnce(true);
      }
    };

    // Listen for animation iterations
    svg.addEventListener('animationiteration', handleIteration);

    return () => {
      svg.removeEventListener('animationiteration', handleIteration);
    };
  }, [hasPlayedOnce]);

  // When loading completes, wait for logo to be at peak (largest) then start shrink
  useEffect(() => {
    if (!isLoading && !hasCalledOnLoadedRef.current) {
      // Wait for the logo to reach its peak (scale 1.15) before starting shrink
      // The pulse animation is 2s, so we need to wait for the right moment
      const checkPeak = setInterval(() => {
        const svg = svgRef.current;
        if (svg) {
          // Check if we're at or past the peak (around 1s into the 2s cycle, or at 50% of animation)
          // We'll trigger the shrink when we're at the peak or just starting to shrink
          const now = Date.now();
          const cycleTime = 2000; // 2 seconds per cycle
          const timeInCycle = (now % cycleTime) / cycleTime;
          
          // If we're at the peak (around 50% of cycle, which is scale 1.15) or just past it (starting to shrink)
          // This allows us to catch it on the first shrink if ready
          if (timeInCycle >= 0.45 && timeInCycle <= 0.65) {
            clearInterval(checkPeak);
            setIsFadingOut(true);
            // Call onLoaded immediately so app can start scaling in during the shrink
            if (!hasCalledOnLoadedRef.current) {
              hasCalledOnLoadedRef.current = true;
              onLoaded();
            }
          }
        }
      }, 16); // Check every ~16ms (60fps) for faster response

      // Fallback: if we don't catch the peak within 1.5 seconds, just proceed
      setTimeout(() => {
        clearInterval(checkPeak);
        if (!hasCalledOnLoadedRef.current) {
          setIsFadingOut(true);
          hasCalledOnLoadedRef.current = true;
          onLoaded();
        }
      }, 1500); // Reduced from 2000ms to 1500ms for faster fallback
    }
  }, [isLoading, onLoaded]);

  // Track when animation has played at least one pulse (in or out)
  useEffect(() => {
    if (!isLoading && !hasPlayedOnce) {
      // Loading finished - mark as played once immediately so we can proceed
      // We don't need to wait for a full cycle, just need to catch the peak
      setHasPlayedOnce(true);
    }
  }, [isLoading, hasPlayedOnce]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center">
        <img
          ref={svgRef}
          src={logoSvg}
          alt="Loading..."
          className={`w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 object-contain loading-logo ${
            isFadingOut ? 'shrink-out' : ''
          }`}
        />
        <style>{`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.15);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0.8;
            }
          }
          
          @keyframes shrinkOut {
            0% {
              transform: scale(1.15);
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }
          
          .loading-logo {
            animation: pulse 2s ease-in-out infinite;
          }
          
          .loading-logo.shrink-out {
            animation: shrinkOut 0.5s ease-in forwards !important;
            animation-fill-mode: forwards;
          }
        `}</style>
      </div>
    </div>
  );
}

