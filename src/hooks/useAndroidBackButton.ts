import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Custom hook to handle Android back button behavior
 * Prevents app from closing immediately and allows proper navigation
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Track if user pressed back button recently
    let backPressedOnce = false;
    let backPressTimeout: NodeJS.Timeout;

    const handlePopState = (event: PopStateEvent) => {
      // Prevent default behavior
      event.preventDefault();

      const isRootPath = location.pathname === '/' || location.pathname === '/login';

      if (isRootPath) {
        // On root path, show toast and exit on double back press
        if (backPressedOnce) {
          // User pressed back twice, allow app to close
          window.history.back();
          return;
        }

        // First back press on root
        backPressedOnce = true;
        
        // Show toast notification
        showExitToast();

        // Reset after 2 seconds
        backPressTimeout = setTimeout(() => {
          backPressedOnce = false;
        }, 2000);
      } else {
        // Not on root path, navigate back normally
        navigate(-1);
      }
    };

    // Add event listener for popstate (back button)
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimeout) {
        clearTimeout(backPressTimeout);
      }
    };
  }, [navigate, location]);
}

/**
 * Show toast notification for exit confirmation
 */
function showExitToast() {
  // Remove existing toast if any
  const existingToast = document.getElementById('exit-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'exit-toast';
  toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-100 px-6 py-3 rounded-full shadow-lg z-[9999] animate-in fade-in slide-in-from-bottom-2';
  toast.textContent = 'Tekan sekali lagi untuk keluar';
  
  document.body.appendChild(toast);

  // Remove toast after 2 seconds
  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-2');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
