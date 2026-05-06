import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Layout><CalendarView /></Layout></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute><Layout><Finance /></Layout></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Layout><AdminSettings /></Layout></AdminRoute>} />
          <Route path="/schedule/:id" element={<PrivateRoute><Layout><ScheduleDetail /></Layout></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
