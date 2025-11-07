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

  // When loading completes and we've played at least once, fade out
  useEffect(() => {
    if (!isLoading && hasPlayedOnce && !hasCalledOnLoadedRef.current) {
      // Start fade out
      setIsFadingOut(true);
      // Call onLoaded after fade animation completes
      setTimeout(() => {
        if (!hasCalledOnLoadedRef.current) {
          hasCalledOnLoadedRef.current = true;
          onLoaded();
        }
      }, 500); // Match fade duration
    }
  }, [isLoading, hasPlayedOnce, onLoaded]);

  // Ensure minimum play time - if loading finishes too quickly, wait for at least one cycle
  useEffect(() => {
    if (!isLoading && !hasPlayedOnce) {
      // Loading finished but we haven't played once yet
      // Wait a bit to ensure the animation plays at least one full cycle
      const checkInterval = setInterval(() => {
        if (animationCountRef.current >= 2 && !hasPlayedOnce) {
          setHasPlayedOnce(true);
          clearInterval(checkInterval);
        }
      }, 100); // Check every 100ms

      // Fallback: ensure it plays at least one full cycle (2 seconds for in + out)
      const fallbackTimer = setTimeout(() => {
        if (!hasPlayedOnce) {
          setHasPlayedOnce(true);
        }
        clearInterval(checkInterval);
      }, 2000); // 2 seconds = 1 full pulse cycle (1s in + 1s out)

      return () => {
        clearInterval(checkInterval);
        clearTimeout(fallbackTimer);
      };
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
          className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 object-contain loading-logo"
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
          
          .loading-logo {
            animation: pulse 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}

