
import React from 'react';
import { LayoutDashboard, ReceiptText, PieChart, Landmark, Settings, Target, CreditCard, PiggyBank, ArrowRightLeft, LogOut, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DMLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center`}>
    <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M60 60 V240 H140 C200 240 250 190 250 150 C250 110 200 60 140 60 H60Z" 
        fill="#002D5E" 
      />
      <path 
        d="M130 240 L180 150 L230 220 L320 80" 
        stroke="#76BC21" 
        strokeWidth="35" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
      <path 
        d="M320 80 L260 95 M320 80 L305 140" 
        stroke="#76BC21" 
        strokeWidth="35" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
    </svg>
  </div>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const menuItems = [
    { id: 'dashboard', label: 'Balance Statement', icon: LayoutDashboard },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'budget', label: 'Budget Setup', icon: Target },
    { id: 'acc-ledgers', label: 'Account Ledgers', icon: CreditCard },
    { id: 'transfers', label: 'Transfers & Allocations', icon: ArrowRightLeft },
    { id: 'ledgers', label: 'Category Ledgers', icon: ReceiptText },
    { id: 'summary', label: 'Full Summary', icon: PieChart },
    { id: 'networth', label: 'Net Worth', icon: Landmark },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <DMLogo className="w-12 h-12" />
            <div className="flex flex-col">
              <h1 className="brand-font text-xl font-extrabold leading-tight tracking-tight text-white">
                Dime
              </h1>
              <h1 className="brand-font text-xl font-extrabold leading-tight tracking-tight text-blue-400 -mt-1">
                Management
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-5 py-2 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <item.icon size={20} className={`${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-6 py-8 border-t border-slate-800/50 mx-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 shadow-xl overflow-hidden shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.15em] truncate mb-0.5">
                Active Member
              </p>
              <p className="text-xs font-bold text-white truncate">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <button 
                onClick={() => logout()}
                className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 hover:text-red-400 transition-colors tracking-widest mt-1"
              >
                <LogOut size={10} /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex flex-col">
            <h2 className="brand-font text-2xl font-black text-slate-900 tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Synchronized</span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#f8fafc]">
          <div className="max-w-[1700px] mx-auto space-y-10 pb-16 animate-in fade-in duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
