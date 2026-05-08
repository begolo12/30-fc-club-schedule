import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import BottomNavbar from './components/BottomNavbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScheduleDetail from './pages/ScheduleDetail';
import Finance from './pages/Finance';
import CalendarView from './pages/CalendarView';
import AdminSettings from './pages/AdminSettings';
import Map from './pages/Map/Map';
import Inventory from './pages/Inventory';
import Announcements from './pages/Announcements';
import Polling from './pages/Polling';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin } = useAuth();
  if (!user || !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-lime-400 selection:text-zinc-950">
      {user && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden">
          <Navbar />
        </div>
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-4 md:py-8 flex flex-col pb-24 md:pb-8">
          {children}
        </main>
        <BottomNavbar />
      </div>
    </div>
  );
};

// Component to handle Android back button
function AndroidBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let backPressedOnce = false;
    let backPressTimeout: NodeJS.Timeout;

    const handleBackButton = () => {
      const isRootPath = location.pathname === '/' || location.pathname === '/login';

      if (isRootPath) {
        if (backPressedOnce) {
          // Allow app to close
          return true;
        }

        backPressedOnce = true;
        showExitToast();

        backPressTimeout = setTimeout(() => {
          backPressedOnce = false;
        }, 2000);

        // Prevent default back behavior
        return false;
      }

      // Not on root, navigate back normally
      return true;
    };

    // Override history back for Android
    const originalBack = window.history.back;
    window.history.back = function() {
      if (handleBackButton()) {
        originalBack.call(window.history);
      }
    };

    return () => {
      window.history.back = originalBack;
      if (backPressTimeout) {
        clearTimeout(backPressTimeout);
      }
    };
  }, [location, navigate]);

  return null;
}

function showExitToast() {
  const existingToast = document.getElementById('exit-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'exit-toast';
  toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-100 px-6 py-3 rounded-full shadow-lg z-[9999] text-sm font-bold';
  toast.style.animation = 'slideUp 0.3s ease-out';
  toast.textContent = 'Tekan sekali lagi untuk keluar';
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AndroidBackButtonHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Layout><CalendarView /></Layout></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><Layout><Map /></Layout></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute><Layout><Finance /></Layout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><Layout><Inventory /></Layout></PrivateRoute>} />
          <Route path="/announcements" element={<PrivateRoute><Layout><Announcements /></Layout></PrivateRoute>} />
          <Route path="/polling" element={<PrivateRoute><Layout><Polling /></Layout></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Layout><AdminSettings /></Layout></AdminRoute>} />
          <Route path="/schedule/:id" element={<PrivateRoute><Layout><ScheduleDetail /></Layout></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
