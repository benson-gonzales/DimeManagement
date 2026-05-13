
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2, User, LogIn as LogInIcon } from 'lucide-react';
import { DMLogo } from './Layout';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error("Please enter your full name.");
        await signup(email, password, name);
      }
    } catch (err: any) {
      setError({ 
        message: err.message || "An authentication error occurred.",
        code: err.code 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError({ message: err.message || "Google Sign-In failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[0%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[60%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
        
        {/* Logo and App Title */}
        <div className="text-center mb-6">
          <DMLogo className="w-24 h-24 mb-2 mx-auto" />
          <h1 className="brand-font text-3xl font-extrabold text-white tracking-tighter uppercase">
            DIME
            <span className="text-blue-500"> MANAGEMENT</span>
          </h1>
        </div>

        {/* Auth Tabs Header */}
        <div className="flex gap-4 mb-4 w-full">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] border-2 transition-all duration-200 ${
              isLogin 
              ? 'bg-[#0f172a] text-white border-white/40 shadow-xl' 
              : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'
            }`}
          >
            Sign In
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] border-2 transition-all duration-200 ${
              !isLogin 
              ? 'bg-[#0f172a] text-white border-white/40 shadow-xl' 
              : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Glass Content Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 w-full border border-white/20">
          
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2 text-red-600 animate-in shake duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="text-[10px] font-bold leading-relaxed">{error.message}</span>
                </div>
              </div>
            )}

            {/* Google Priority Button */}
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 text-slate-700 font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-100 w-full"></div>
              <div className="bg-white px-5 text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] absolute">OR</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-5">
                {!isLogin && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type="text" 
                        required 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                        placeholder="Your Name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                      placeholder="address@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#0f172a] text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      {isLogin ? <LogInIcon size={16} /> : <UserPlus size={16} />}
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
