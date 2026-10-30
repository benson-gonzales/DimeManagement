
import React, { useMemo, useState } from 'react';
import { AlertCircle, Undo2, Edit3, CheckCircle2, X, RotateCcw, Pencil, Check } from 'lucide-react';
import { AppState } from '../types';
import { formatCurrency, getMonthYearKey, formatDisplayDate } from '../utils';
import TransactionPanel from './TransactionPanel';

interface DashboardProps {
  state: AppState;
  addTransaction: (tx: any) => void;
  undoLastTransaction: () => void;
  executeTransfer: (transfer: any) => void;
  setCategoryBalance: (catId: string, balance: number) => void;
  setAccountBalance: (accId: string, balance: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  addTransaction, 
  undoLastTransaction, 
  executeTransfer,
  setCategoryBalance,
  setAccountBalance
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const currentMonth = getMonthYearKey(new Date());

  const lastTransaction = useMemo(() => {
    return state.transactions.length > 0 ? state.transactions[state.transactions.length - 1] : null;
  }, [state.transactions]);

  const categoryCalculations = useMemo(() => {
    return state.categories
      .filter(cat => !cat.deleted)
      .map(cat => {
        const monthlyTx = state.transactions.filter(t => 
          (t.categoryId === cat.id || t.toCategoryId === cat.id || t.fromCategoryId === cat.id) && 
          getMonthYearKey(t.date) === currentMonth
        );
        
        const added = monthlyTx.reduce((sum, t) => {
          if (t.toCategoryId === cat.id) return sum + Math.abs(t.amount);
          if (t.categoryId === cat.id) {
            if (t.type === 'Income' || t.type === 'Update Budget (Allocation)') {
              return sum + Math.abs(t.amount);
            }
            if (t.amount > 0 && !t.fromCategoryId && !t.toCategoryId) {
              return sum + t.amount;
            }
          }
          return sum;
        }, 0);

        const spent = monthlyTx.reduce((sum, t) => {
          if (t.fromCategoryId === cat.id) {
            return sum - Math.abs(t.amount);
          }
          if (t.categoryId === cat.id && t.amount < 0 && !t.toCategoryId && !t.fromCategoryId) {
            return sum + t.amount;
          }
          return sum;
        }, 0);

        return { ...cat, monthlyAdded: added, monthlySpent: spent };
      });
  }, [state.categories, state.transactions, currentMonth]);

  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof categoryCalculations> = {};
    state.classifications.forEach(cls => {
      groups[cls.id] = categoryCalculations.filter(cat => cat.classificationId === cls.id);
    });
    return groups;
  }, [state.classifications, categoryCalculations]);

  const reconciliation = useMemo(() => {
    const activeAccounts = state.accounts.filter(a => !a.archived);
    const checkingAccs = activeAccounts.filter(a => a.type === 'Checking');
    const creditAccs = activeAccounts.filter(a => a.type === 'Credit');
    
    const checkingSum = checkingAccs.reduce((s, a) => s + a.balance, 0);
    const creditSum = creditAccs.reduce((s, a) => s + a.balance, 0);
    const net = checkingSum + creditSum;

    const budgetCategories = state.categories.filter(c => {
      const cls = state.classifications.find(cl => cl.id === c.classificationId);
      const clsName = cls?.name.toLowerCase() || '';
      return !['income', 'transfers', 'savings'].includes(clsName) && !c.deleted;
    });
    const totalAllocated = budgetCategories.reduce((sum, cat) => sum + cat.balance, 0);

    return {
      checkingAccs,
      creditAccs,
      net,
      totalAllocated,
      difference: net - totalAllocated
    };
  }, [state.accounts, state.categories, state.classifications]);

  const dashboardClasses = state.classifications.filter(c => 
    !c.deleted && !['income', 'transfers', 'savings'].includes(c.name.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 sm:gap-8">
      <div className="xl:col-span-7 space-y-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-6 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Balance Statement</h3>
            <div className="flex gap-2 sm:gap-3">
               <button 
                 onClick={() => setIsEditMode(!isEditMode)} 
                 className={`flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase transition-all shadow-sm ${isEditMode ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
               >
                 {isEditMode ? <><Check size={14} /> Finish Update</> : <><Pencil size={14} /> Manual Update</>}
               </button>
               {!isEditMode && lastTransaction && (
                 <button 
                   onClick={() => setShowUndoConfirm(true)} 
                   className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase text-slate-400 border border-slate-200 hover:bg-slate-50 transition-all"
                 >
                   <RotateCcw size={14} /> Undo Last
                 </button>
               )}
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm lg:text-base">
            <thead className="bg-white border-b">
              <tr>
                <th className="px-4 sm:px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Category</th>
                <th className="px-3 sm:px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Balance</th>
                <th className="px-3 sm:px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Budget</th>
                <th className="px-3 sm:px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Added</th>
                <th className="px-3 sm:px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboardClasses.map(cls => {
                const cats = groupedCategories[cls.id] || [];
                if (cats.length === 0) return null;
                return (
                  <React.Fragment key={cls.id}>
                    <tr className={`${cls.color} font-black text-[11px] uppercase tracking-widest`}><td colSpan={5} className="px-4 sm:px-8 py-3.5">{cls.name}</td></tr>
                    {cats.map(cat => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 sm:px-8 py-3.5 text-slate-700 font-semibold whitespace-nowrap">{cat.name}</td>
                        <td className="px-3 sm:px-6 py-3.5 text-right font-bold text-slate-900">
                          {isEditMode ? (
                            <input type="number" step="0.01" value={cat.balance} onChange={e => setCategoryBalance(cat.id, parseFloat(e.target.value) || 0)} className="w-full min-w-[6rem] bg-blue-50 rounded-lg text-right px-3 py-1.5 border border-blue-100 outline-none focus:ring-2 focus:ring-blue-500" />
                          ) : (
                            <span className={cat.balance < 0 ? 'text-red-500' : ''}>{formatCurrency(cat.balance)}</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 text-right text-slate-400 font-medium">{cat.monthlyBudget > 0 ? formatCurrency(cat.monthlyBudget) : '-'}</td>
                        <td className="px-3 sm:px-6 py-3.5 text-right text-blue-600 font-bold">{cat.monthlyAdded !== 0 ? formatCurrency(cat.monthlyAdded) : '-'}</td>
                        <td className="px-3 sm:px-6 py-3.5 text-right text-red-400 font-bold">{cat.monthlySpent !== 0 ? formatCurrency(cat.monthlySpent) : '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="xl:col-span-3">
        <div className="xl:sticky xl:top-12 space-y-4 sm:space-y-8">
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            {!isEditMode ? <TransactionPanel state={state} onAddTransaction={addTransaction} onExecuteTransfer={executeTransfer} /> : <div className="bg-white rounded-3xl border-4 border-dashed border-slate-100 p-12 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest leading-relaxed">System Update Active</div>}
          </div>
          <div className="bg-[#0f172a] rounded-[2rem] p-6 sm:p-8 text-slate-300 font-bold text-xs uppercase space-y-6 shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center h-10 border-b border-slate-800 pb-2"><h3 className="text-[11px] text-slate-500 tracking-widest">Reconciliation</h3><AlertCircle size={18} className="text-slate-600"/></div>
            <div className="space-y-4">
              {reconciliation.checkingAccs.map(a => (
                <div key={a.id} className="flex justify-between items-center h-10">
                  <span className="text-slate-400">{a.name}</span>
                  {isEditMode ? (
                    <input 
                      type="number" 
                      step="0.01" 
                      value={a.balance} 
                      onChange={e => setAccountBalance(a.id, parseFloat(e.target.value) || 0)} 
                      className="w-28 bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-right focus:ring-2 focus:ring-blue-500 outline-none text-[12px]" 
                    />
                  ) : (
                    <span className="text-white text-sm">{formatCurrency(a.balance)}</span>
                  )}
                </div>
              ))}
              {reconciliation.creditAccs.map(a => (
                <div key={a.id} className="flex justify-between items-center h-10">
                  <span className="text-slate-400">{a.name}</span>
                  {isEditMode ? (
                    <input 
                      type="number" 
                      step="0.01" 
                      value={a.balance} 
                      onChange={e => setAccountBalance(a.id, parseFloat(e.target.value) || 0)} 
                      className="w-28 bg-slate-800 text-red-400 border border-slate-700 rounded-lg px-3 py-1.5 text-right focus:ring-2 focus:ring-blue-500 outline-none text-[12px]" 
                    />
                  ) : (
                    <span className="text-red-400 text-sm">{formatCurrency(a.balance)}</span>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-slate-800 flex justify-between font-black text-white h-10 items-center">
                <span className="tracking-widest">Net Assets</span>
                <span className={`text-base ${reconciliation.net < 0 ? 'text-red-400' : ''}`}>{formatCurrency(reconciliation.net)}</span>
              </div>
              <div className="flex justify-between text-slate-500 h-10 items-center">
                <span className="tracking-widest">Allocated</span>
                <span className="text-sm font-bold">{formatCurrency(-reconciliation.totalAllocated)}</span>
              </div>
              <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 block tracking-widest mb-1 uppercase">Difference</span>
                  <span className={`text-3xl font-black transition-colors ${Math.abs(reconciliation.difference) < 0.01 ? 'text-green-400' : 'text-blue-500'}`}>
                    {formatCurrency(reconciliation.difference)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUndoConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-10 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <RotateCcw size={32} />
            </div>
            <h4 className="text-lg font-black uppercase text-slate-800 tracking-tight">Undo Last Action?</h4>
            <p className="text-[12px] text-slate-400 uppercase font-bold px-4">
              Balances will restore to their previous states.
            </p>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowUndoConfirm(false)} className="flex-1 px-4 py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={() => { undoLastTransaction(); setShowUndoConfirm(false); }} className="flex-1 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
