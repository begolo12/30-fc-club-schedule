import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInAsAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInAsAdmin(adminId, adminPin);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative min-h-[100dvh]">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 md:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden text-center transition-all duration-500">
        {/* Background Decorative Element */}
        <div className="relative z-10 flex flex-col items-center">
          <img src="/logo.jpeg" alt="Thirty FC" className="w-20 h-20 rounded-[1.25rem] object-cover mb-8 transform -rotate-6 shadow-[0_0_30px_rgba(163,230,53,0.3)]" />
          
          <h1 className="text-3xl md:text-4xl font-black italic mb-3 tracking-tighter uppercase text-zinc-100">Thirty FC Club</h1>
          <p className="text-zinc-500 mb-10 text-sm max-w-xs leading-relaxed">
            Masuk untuk kelola jadwal, ikut main, dan koordinasi bareng tim.
          </p>
          
          {!showAdminLogin ? (
            <div className="w-full space-y-4">
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-2xl px-4 py-4 text-xs font-bold text-zinc-100 transition-all uppercase tracking-widest duration-300 transform hover:-translate-y-1 hover:shadow-lg"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
                Continue with Google
              </button>
              
              <button
                onClick={() => setShowAdminLogin(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors"
              >
                <Shield className="w-3 h-3" />
                Login Admin
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminSignIn} className="w-full flex flex-col gap-4 text-left">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-bold text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Admin ID</label>
                <input 
                  type="text" 
                  value={adminId}
                  onChange={e => setAdminId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Password</label>
                <input 
                  type="password" 
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdminLogin(false); setError(''); }}
                  className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-950 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 rounded-xl transition-colors shadow-[0_0_15px_rgba(163,230,53,0.2)]"
                >
                  {loading ? 'Logging in...' : 'Login As Admin'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
