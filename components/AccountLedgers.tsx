
import React, { useState, useEffect } from 'react';
import { AppState, Transaction, Account, AccountType } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils';
import { CheckCircle, Circle, Trash2, X, AlertTriangle, Layers, Plus, Settings2, Eye, EyeOff, CheckCircle2, Landmark, CreditCard, PiggyBank, ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';

interface AccountLedgersProps {
  state: AppState;
  onToggleCleared: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onAddAccount: (name: string, type: AccountType) => void;
  onUpdateAccount: (id: string, updates: Partial<Account>) => void;
  persistAccountLayout?: (accounts: Account[]) => Promise<void>;
}

const AccountLedgers: React.FC<AccountLedgersProps> = ({ 
  state, 
  onToggleCleared, 
  onDeleteTransaction,
  onAddAccount,
  onUpdateAccount,
  persistAccountLayout
}) => {
  const [activeAccId, setActiveAccId] = useState('all'); 
  const [deleteTxConfirm, setDeleteTxConfirm] = useState<Transaction | null>(null);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'Checking' as AccountType });
  const [draftAccounts, setDraftAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (isEditMode) {
      setDraftAccounts([...state.accounts]);
    }
  }, [isEditMode, state.accounts]);

  const isAllActivity = activeAccId === 'all';
  const activeAccount = state.accounts.find(a => a.id === activeAccId);
  const filteredAccounts = (isEditMode ? draftAccounts : state.accounts).filter(a => a.type !== 'Investment' && (showArchived || !a.archived || isEditMode));
  
  const transactions = state.transactions
    .filter(t => activeAccId === 'all' ? (t.accountId !== 'internal') : (t.accountId === activeAccId || t.fromAccountId === activeAccId || t.toAccountId === activeAccId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAcc.name) {
      onAddAccount(newAcc.name, newAcc.type);
      setNewAcc({ name: '', type: 'Checking' });
      setShowAddAcc(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!persistAccountLayout) return;
    setIsSaving(true);
    try {
      await persistAccountLayout(draftAccounts);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditMode(false);
      }, 1000);
    } catch (err) {
      alert("Failed to save layout.");
    } finally {
      setIsSaving(false);
    }
  };

  const moveAccount = (id: string, direction: 'left' | 'right') => {
    const idx = draftAccounts.findIndex(a => a.id === id);
    if (idx === -1) return;
    
    const sameList = draftAccounts.filter(a => a.type !== 'Investment' && (showArchived || !a.archived || isEditMode));
    const subIdx = sameList.findIndex(a => a.id === id);
    
    if (direction === 'left' && subIdx === 0) return;
    if (direction === 'right' && subIdx === sameList.length - 1) return;
    
    const targetSubIdx = direction === 'left' ? subIdx - 1 : subIdx + 1;
    const targetAcc = sameList[targetSubIdx];
    
    const realIdxA = draftAccounts.findIndex(a => a.id === id);
    const realIdxB = draftAccounts.findIndex(a => a.id === targetAcc.id);
    
    const newList = [...draftAccounts];
    [newList[realIdxA], newList[realIdxB]] = [newList[realIdxB], newList[realIdxA]];
    setDraftAccounts(newList);
  };

  const updateDraftName = (id: string, name: string) => {
    setDraftAccounts(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  };

  const toggleDraftArchive = (id: string) => {
    setDraftAccounts(prev => prev.map(a => a.id === id ? { ...a, archived: !a.archived } : a));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-2 rounded-2xl border flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1">
          {!isEditMode && (
            <button 
              onClick={() => setActiveAccId('all')} 
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 flex items-center gap-2 ${activeAccId === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Layers size={14}/>
              All Activity
            </button>
          )}
          
          {filteredAccounts.map((acc, idx) => (
            <div key={acc.id} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1 px-3 py-2 rounded-xl border transition-all ${activeAccId === acc.id && !isEditMode ? 'bg-slate-900 text-white shadow-lg border-slate-900' : 'bg-white text-slate-400 border-slate-100'} ${acc.archived && !isEditMode ? 'opacity-40 grayscale' : ''}`}>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => moveAccount(acc.id, 'left')} 
                      disabled={idx === 0}
                      className={`p-1 rounded hover:bg-slate-100 ${idx === 0 ? 'opacity-20' : 'text-slate-400'}`}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    <input 
                      type="text" 
                      className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-0.5 w-24 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500" 
                      value={acc.name} 
                      onChange={e => updateDraftName(acc.id, e.target.value)} 
                    />
                    
                    <button 
                      onClick={() => toggleDraftArchive(acc.id)}
                      className={`p-1 rounded transition-colors ${acc.archived ? 'text-blue-500 bg-blue-50' : 'text-slate-300 hover:text-slate-500'}`}
                      title={acc.archived ? "Unarchive" : "Archive"}
                    >
                      {acc.archived ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>

                    <button 
                      onClick={() => moveAccount(acc.id, 'right')} 
                      disabled={idx === filteredAccounts.length - 1}
                      className={`p-1 rounded hover:bg-slate-100 ${idx === filteredAccounts.length - 1 ? 'opacity-20' : 'text-slate-400'}`}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setActiveAccId(acc.id)} className="text-[10px] font-black uppercase tracking-tight">
                    {acc.name}
                  </button>
                )}
              </div>
            </div>
          ))}
          {!isEditMode && (
            <button onClick={() => setShowAddAcc(true)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 hover:bg-slate-100 transition-colors shadow-sm">
              <Plus size={18} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 px-2 shrink-0">
          {isEditMode ? (
            <div className="flex gap-2">
              <button 
                onClick={handleSaveOrder} 
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${saveSuccess ? 'bg-green-600' : 'bg-blue-600'} text-white`}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Layout'}
              </button>
              <button 
                onClick={() => setIsEditMode(false)} 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white text-slate-400 border border-slate-200"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowArchived(!showArchived)} className={`p-2 rounded-xl transition-colors ${showArchived ? 'bg-slate-900 text-white shadow-md' : 'text-slate-300 hover:text-slate-500'}`}>
                <Eye size={20} />
              </button>
              <button onClick={() => setIsEditMode(true)} className="p-2 rounded-xl text-slate-400 hover:text-blue-500 transition-colors">
                <Settings2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold uppercase text-xs text-slate-700 tracking-widest">
            {isAllActivity ? 'Global Activity Records' : `${activeAccount?.name} Transaction History`} {activeAccount?.archived && '(Archived)'}
          </h3>
          {!isAllActivity && (
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Available Balance: <span className="text-sm ml-2 text-slate-900 font-black">{formatCurrency(activeAccount?.balance || 0)}</span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter w-32">Date</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter w-48">Source Account</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter w-40">Category</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-right w-32">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Description</th>
                <th className="px-4 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length > 0 ? transactions.map((tx) => {
                const magnitude = Math.abs(tx.amount);
                const isSource = tx.fromAccountId === activeAccId;
                const isDest = tx.toAccountId === activeAccId;
                const displayAmt = isSource ? -magnitude : isDest ? magnitude : tx.amount;
                
                const getCategoryDisplay = () => {
                  if (tx.categoryId && tx.categoryId !== 'none') {
                    return state.categories.find(c => c.id === tx.categoryId)?.name || 'Unknown';
                  }
                  if (tx.fromCategoryId || tx.toCategoryId) {
                    const from = state.categories.find(c => c.id === tx.fromCategoryId)?.name;
                    const to = state.categories.find(c => c.id === tx.toCategoryId)?.name;
                    if (from && to) return `${from} → ${to}`;
                    return from || to || '—';
                  }
                  return '—';
                };

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-3.5 text-slate-400 font-medium">{formatDisplayDate(tx.date)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-black px-2 py-1 rounded-md uppercase bg-slate-100 text-slate-500 border border-slate-200">
                        {state.accounts.find(a => a.id === tx.accountId)?.name || 'Internal Move'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        {getCategoryDisplay()}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-right font-black text-sm ${displayAmt < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                      {formatCurrency(displayAmt)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-medium truncate max-w-[300px]">{tx.description}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => setDeleteTxConfirm(tx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] italic">
                    No matching activity records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddAcc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 border border-slate-200 shadow-2xl">
            <h4 className="text-lg font-black mb-6 uppercase tracking-tight text-slate-800 flex items-center gap-2">
              <Plus className="text-blue-600" size={20} /> New Financial Account
            </h4>
            <form onSubmit={handleAddAccount} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Account Name</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} placeholder="e.g. Primary Checking" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Account Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Checking', 'Savings', 'Credit'].map(t => (
                    <button 
                      key={t} 
                      type="button" 
                      onClick={() => setNewAcc({...newAcc, type: t as AccountType})} 
                      className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-widest ${newAcc.type === t ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddAcc(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                <button type="submit" className="flex-[2] bg-slate-900 text-white py-3 rounded-xl uppercase font-black text-[10px] tracking-widest shadow-lg hover:bg-blue-600 transition-all">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTxConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center space-y-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={24}/>
            </div>
            <h4 className="text-base font-black uppercase text-slate-800">Reverse Activity Record?</h4>
            <p className="text-[11px] text-slate-400 uppercase font-bold leading-relaxed">
              Balances for all involved accounts and categories will revert to their previous state.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteTxConfirm(null)} className="flex-1 py-3 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
              <button onClick={() => { onDeleteTransaction(deleteTxConfirm.id); setDeleteTxConfirm(null); }} className="flex-1 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountLedgers;
