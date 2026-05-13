
import React, { useState } from 'react';
import { Landmark, CreditCard, ChevronRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (accounts: { name: string, balance: number, type: 'Checking' | 'Credit' }[]) => Promise<void>;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState({ name: '', balance: '' });
  const [hasCredit, setHasCredit] = useState<boolean | null>(null);
  const [credit, setCredit] = useState({ name: '', balance: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    setIsSubmitting(true);
    const accounts: any[] = [
      { name: checking.name || 'Primary Checking', balance: parseFloat(checking.balance) || 0, type: 'Checking' }
    ];
    if (hasCredit && credit.name) {
      accounts.push({ name: credit.name, balance: -Math.abs(parseFloat(credit.balance) || 0), type: 'Credit' });
    }
    await onComplete(accounts);
    setIsSubmitting(false);
  };

  const inputStyles = "w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300";

  return (
    <div className="min-h-screen bg-[#0a1128] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] bg-blue-900/40 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-lg z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 border border-white/20">
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Initialization</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase 1: Financial Framework</p>
            </div>
          </div>

          <div className="mb-10 flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-600' : 'bg-slate-100'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Landmark className="text-blue-600" size={20} />
                  Main Checking Account
                </h3>
                <p className="text-xs text-slate-400 font-medium">Where do you receive your paychecks?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Account Name</label>
                  <input 
                    type="text" 
                    value={checking.name}
                    onChange={e => setChecking({...checking, name: e.target.value})}
                    placeholder="e.g. Chase Total Checking"
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Current Balance ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={checking.balance}
                    onChange={e => setChecking({...checking, balance: e.target.value})}
                    placeholder="0.00"
                    className={inputStyles}
                  />
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={!checking.name}
                className="w-full bg-[#0f172a] text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.25em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                Next Step <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CreditCard className="text-blue-600" size={20} />
                  Credit Cards
                </h3>
                <p className="text-xs text-slate-400 font-medium">Do you currently have a primary credit card?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setHasCredit(true)}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${hasCredit === true ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  <CheckCircle2 size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Yes, I Do</span>
                </button>
                <button 
                  onClick={() => { setHasCredit(false); setStep(3); }}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${hasCredit === false ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  <X size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Not Right Now</span>
                </button>
              </div>

              {hasCredit && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Card Name</label>
                    <input 
                      type="text" 
                      value={credit.name}
                      onChange={e => setCredit({...credit, name: e.target.value})}
                      placeholder="e.g. Amex Blue Cash"
                      className={inputStyles}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Current Statement Balance ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={credit.balance}
                      onChange={e => setCredit({...credit, balance: e.target.value})}
                      placeholder="0.00"
                      className={inputStyles}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={hasCredit === null || (hasCredit && !credit.name)}
                  className="flex-[2] bg-[#0f172a] text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.25em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  Review Summary <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-center">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuration Complete</h3>
                <p className="text-xs text-slate-400 font-medium">We'll initialize your dashboard with the following assets and our expert category framework.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-3 border border-slate-100">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Primary Assets</span>
                  <span className="text-blue-600">Secure Firestore</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2"><Landmark size={12} /> {checking.name}</span>
                    <span>${parseFloat(checking.balance || '0').toLocaleString()}</span>
                  </div>
                  {hasCredit && (
                    <div className="flex justify-between items-center text-xs font-bold text-red-500">
                      <span className="flex items-center gap-2"><CreditCard size={12} /> {credit.name}</span>
                      <span>-${Math.abs(parseFloat(credit.balance || '0')).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-full bg-[#0f172a] text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Deploy Finance Pro"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export default OnboardingWizard;
