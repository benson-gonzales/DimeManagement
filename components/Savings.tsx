
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { formatCurrency, getMonthYearKey, parseLocalDate } from '../utils';
import { AlertCircle, PiggyBank, Pencil, Check } from 'lucide-react';
import TransactionPanel from './TransactionPanel';

interface SavingsProps {
  state: AppState;
  addTransaction: (tx: any) => void;
  executeTransfer: (transfer: any) => void;
  setCategoryBalance: (catId: string, balance: number) => void;
  setAccountBalance: (accId: string, balance: number) => void;
}

const Savings: React.FC<SavingsProps> = ({ 
  state, 
  addTransaction, 
  executeTransfer,
  setCategoryBalance,
  setAccountBalance
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  
  const savingsClass = useMemo(() => 
    state.classifications.find(cls => cls.name.toLowerCase() === 'savings' || cls.id === 'class-savings'),
    [state.classifications]
  );

  const savingsCategories = useMemo(() => 
    state.categories.filter(c => c.classificationId === savingsClass?.id && !c.deleted), 
    [state.categories, savingsClass]
  );

  const savingsAccounts = useMemo(() => 
    state.accounts.filter(a => a.type === 'Savings' && !a.archived), 
    [state.accounts]
  );

  const reconciliation = useMemo(() => {
    const totalBank = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAllocated = savingsCategories.reduce((sum, cat) => sum + cat.balance, 0);
    return {
      accounts: savingsAccounts,
      totalBank,
      totalAllocated,
      difference: totalBank - totalAllocated
    };
  }, [savingsAccounts, savingsCategories]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-emerald-50 border-b flex flex-wrap gap-2 justify-between items-center"><h3 className="font-bold text-emerald-800 uppercase text-xs flex items-center gap-2"><PiggyBank size={16}/> Savings Fund Balances</h3>
              <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${isEditMode ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-100'}`}
              >
                {isEditMode ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Manual Update</>}
              </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b">
                <tr>
                  <th className="px-6 py-4 text-[10px] uppercase text-slate-600">Category</th>
                  <th className="px-6 py-4 text-[10px] uppercase text-slate-600 text-right">Balance</th>
                  <th className="px-6 py-4 text-[10px] uppercase text-slate-600 text-right">Goal</th>
                  <th className="px-6 py-4 text-[10px] uppercase text-slate-600 text-right">% Saved</th>
                  <th className="px-6 py-4 text-[10px] uppercase text-slate-600 text-right">Months to Goal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savingsCategories.map(cat => {
                  const goal = cat.goalAmount || 0;
                  const percent = goal > 0 ? Math.min(100, (cat.balance / goal) * 100) : 0;
                  const remaining = Math.max(0, goal - cat.balance);
                  const monthlyTarget = cat.monthlyBudget || 0;
                  const monthsToGoal = (monthlyTarget > 0 && remaining > 0) ? Math.ceil(remaining / monthlyTarget) : 0;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors border-l-2 border-transparent hover:border-emerald-400">
                      <td className="px-6 py-3 text-slate-600 font-medium whitespace-nowrap">{cat.name}</td>
                      <td className="px-6 py-3 text-right font-bold">
                        {isEditMode ? (
                          <input 
                            type="number" 
                            step="0.01" 
                            value={cat.balance} 
                            onChange={e => setCategoryBalance(cat.id, parseFloat(e.target.value) || 0)} 
                            className="w-full min-w-[6rem] px-2 py-1 bg-emerald-50 border rounded text-right text-xs" 
                          />
                        ) : (
                          <span className={cat.balance < 0 ? 'text-red-500' : ''}>{formatCurrency(cat.balance)}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(goal)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-emerald-600">{percent.toFixed(1)}%</span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-slate-600">
                        {monthsToGoal > 0 ? `${monthsToGoal} mo` : remaining <= 0 && goal > 0 ? 'Goal Met!' : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-emerald-900 text-white font-black">
                <tr>
                  <td className="px-6 py-4 uppercase text-[10px]">Total Allocated Savings</td>
                  <td className="px-6 py-4 text-right text-lg">{formatCurrency(reconciliation.totalAllocated)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </div>
        <div className="lg:block"><div className="lg:sticky lg:top-8 space-y-6">
          {!isEditMode ? <TransactionPanel state={state} onAddTransaction={addTransaction} onExecuteTransfer={executeTransfer} allowedModes={['income', 'expense', 'allocation', 'transfer']} filterClassificationId={savingsClass?.id} /> : <div className="bg-white rounded-xl border-2 border-dashed p-8 text-center text-slate-400 uppercase font-black text-[10px]">Edit Mode Active</div>}
          <div className="bg-[#0f172a] rounded-xl p-6 text-slate-300 font-bold text-[11px] uppercase space-y-4 border border-slate-800"><div className="flex justify-between items-center"><h3 className="text-[10px] text-slate-500">Savings Reconciliation</h3></div>
            <div className="space-y-3">
              {reconciliation.accounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center h-8">
                  <span>{acc.name}</span>
                  {isEditMode ? (
                    <input 
                      type="number" 
                      step="0.01" 
                      value={acc.balance} 
                      onChange={e => setAccountBalance(acc.id, parseFloat(e.target.value) || 0)} 
                      className="w-24 bg-slate-800 text-white border border-slate-700 rounded px-2 py-0.5 text-right focus:ring-1 focus:ring-blue-500 outline-none text-[11px]" 
                    />
                  ) : (
                    <span className="text-white">{formatCurrency(acc.balance)}</span>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t border-slate-800 flex justify-between text-emerald-400 h-8 items-center">
                <span>Liquid Savings</span>
                <span>{formatCurrency(reconciliation.totalBank)}</span>
              </div>
              <div className="flex justify-between text-slate-500 h-8 items-center">
                <span>Allocated</span>
                <span>{formatCurrency(-reconciliation.totalAllocated)}</span>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center"><div><span className="text-[9px] block">Difference</span><span className={`text-2xl font-black ${Math.abs(reconciliation.difference) < 0.01 ? 'text-green-400' : 'text-blue-500'}`}>{formatCurrency(reconciliation.difference)}</span></div><AlertCircle size={28} /></div>
            </div>
          </div>
        </div></div>
      </div>
    </div>
  );
};

export default Savings;
