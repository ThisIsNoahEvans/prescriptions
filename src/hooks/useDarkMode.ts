import { useState, useEffect, useRef } from 'react';

export function useDarkMode() {
  const hasManualToggle = useRef(false);
  
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      hasManualToggle.current = true;
      return stored === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Update document class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update theme color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#111827' : '#2563eb');
    }
    
    // Update Apple status bar style for dark mode
    const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBarMeta) {
      appleStatusBarMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
    
    // Only save to localStorage if user has manually toggled
    if (hasManualToggle.current) {
      localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    }
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      if (!hasManualToggle.current) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    hasManualToggle.current = true;
    setIsDark((prev) => !prev);
  };

  return { isDark, toggleDarkMode };
}

