
import React, { useMemo, useState } from 'react';
import { AppState, Account, InvestmentSnapshot, AccountType, Transaction } from '../types';
import { formatCurrency, getMonthLabel, getMonthYearKey, parseLocalDate } from '../utils';
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Plus, TrendingUp, X, Calendar } from 'lucide-react';

interface NetWorthProps {
  state: AppState;
  onAddSnapshot: (s: InvestmentSnapshot) => void;
  onAddAccount: (name: string, type: AccountType, balance: number) => void;
}

const NetWorth: React.FC<NetWorthProps> = ({ state, onAddSnapshot, onAddAccount }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthYearKey(new Date()));
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showAddInv, setShowAddInv] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [newInvBalance, setNewInvBalance] = useState('');

  const currentMonthKey = useMemo(() => getMonthYearKey(new Date()), []);

  // Dynamically determine available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    state.transactions.forEach(t => {
      const y = new Date(t.date).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [state.transactions, currentYear]);

  // All months for the SELECTED year (Jan - Dec)
  const monthsInSelectedYear = useMemo(() => {
    const res: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(selectedYear, i, 1);
      res.push(getMonthYearKey(d));
    }
    return res;
  }, [selectedYear]);

  // We need to calculate everything from "Now" back to the start of the earliest year in availableYears
  const balanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number | null>> = {};
    const earliestYear = Math.min(...availableYears);
    
    // Generate full list of months from earliest point to today (or end of selected year if viewing future)
    const allRelevantMonths: string[] = [];
    const start = new Date(earliestYear, 0, 1);
    const end = new Date(); // Anchor at today
    
    let curr = new Date(start);
    const endBound = new Date(Math.max(end.getTime(), new Date(selectedYear, 11, 1).getTime()));
    
    while (curr <= endBound) {
      allRelevantMonths.push(getMonthYearKey(curr));
      curr.setMonth(curr.getMonth() + 1);
    }

    state.accounts.forEach(acc => {
      matrix[acc.id] = {};

      if (acc.type === 'Investment') {
        allRelevantMonths.forEach(m => {
          if (m > currentMonthKey) {
            matrix[acc.id][m] = null;
            return;
          }
          const snapshot = state.investmentSnapshots.find(s => s.monthKey === m && s.accountId === acc.id);
          if (snapshot) {
            matrix[acc.id][m] = snapshot.balance;
          } else {
            const previousSnapshots = state.investmentSnapshots
              .filter(s => s.accountId === acc.id && s.monthKey <= m)
              .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
            
            matrix[acc.id][m] = previousSnapshots.length > 0 ? previousSnapshots[0].balance : (m === currentMonthKey ? acc.balance : 0);
          }
        });
      } else {
        // Checking, Savings, Credit use Reverse Calculation
        matrix[acc.id][currentMonthKey] = acc.balance;

        allRelevantMonths.forEach(m => {
          if (m > currentMonthKey) matrix[acc.id][m] = null;
        });

        // Calculate backwards from today
        const monthsToCalculate = allRelevantMonths
          .filter(m => m < currentMonthKey)
          .sort((a, b) => b.localeCompare(a));

        let runningBalance = acc.balance;
        let activeMonth = currentMonthKey;

        monthsToCalculate.forEach(m => {
          const monthTxs = state.transactions.filter(t => getMonthYearKey(t.date) === activeMonth);
          const netChange = monthTxs.reduce((sum, t) => {
            let delta = 0;
            if (!t.fromAccountId && !t.toAccountId) {
              if (t.accountId === acc.id) delta += t.amount;
            } else {
              if (t.fromAccountId === acc.id) delta -= t.amount;
              if (t.toAccountId === acc.id) delta += t.amount;
            }
            return sum + delta;
          }, 0);

          runningBalance -= netChange;
          matrix[acc.id][m] = runningBalance;
          activeMonth = m;
        });
      }
    });

    return matrix;
  }, [state.accounts, state.transactions, state.investmentSnapshots, availableYears, currentMonthKey, selectedYear]);

  // Chart data: Only show up to current month within the selected year
  const historyData = useMemo(() => {
    return monthsInSelectedYear
      .filter(m => m <= currentMonthKey)
      .map((m: string) => {
        const total = state.accounts.reduce((sum, acc) => {
          const val = balanceMatrix[acc.id]?.[m];
          return sum + (val === null ? 0 : val);
        }, 0);
        return { monthKey: m, label: getMonthLabel(m + "-01"), value: total };
      });
  }, [state.accounts, balanceMatrix, monthsInSelectedYear, currentMonthKey]);

  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    (Object.entries(editValues) as [string, string][]).forEach(([accId, val]) => {
      if (val) {
        onAddSnapshot({ 
          monthKey: selectedMonth, 
          accountId: accId, 
          balance: parseFloat(val) 
        });
      }
    });
    setEditValues({});
  };

  const handleCreateInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInvName) {
      onAddAccount(newInvName, 'Investment', parseFloat(newInvBalance) || 0);
      setNewInvName('');
      setNewInvBalance('');
      setShowAddInv(false);
    }
  };

  const groups = [
    { label: 'Checking', type: 'Checking' },
    { label: 'Credit cards', type: 'Credit' },
    { label: 'Savings', type: 'Savings' },
    { label: 'Investments', type: 'Investment' }
  ];

  const inputStyles = "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300";

  return (
    <div className="space-y-6 pb-24">
      {/* Year Selector Tabs */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                selectedYear === year 
                ? 'bg-white text-blue-600 shadow-md scale-105' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><TrendingUp size={14} /> Net Worth Growth ({selectedYear})</h3>
            <button onClick={() => setShowAddInv(true)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">+ Add Investment</button>
          </div>
          <div className="h-64 w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs><linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value) || 0, true), 'Net Worth']} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic">
                No history data for {selectedYear}
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 text-white h-fit">
          <form onSubmit={handleSaveSnapshot} className="space-y-4">
            <label className="text-[9px] text-slate-500 uppercase font-black">Manual Snapshot</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full bg-slate-800 text-xs font-bold p-3 rounded-lg">
              {monthsInSelectedYear.filter(m => m <= currentMonthKey).map(m => <option key={m} value={m}>{getMonthLabel(m + "-01")}</option>)}
            </select>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {state.accounts.filter(a => a.type === 'Investment' && !a.archived).map(acc => (
                <div key={acc.id} className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase font-black">{acc.name}</label>
                  <input type="number" step="0.01" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg p-2 text-xs font-bold" placeholder={acc.balance.toFixed(2)} value={editValues[acc.id] || ''} onChange={e => setEditValues({...editValues, [acc.id]: e.target.value})} />
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-blue-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest mt-4">Commit Snapshots</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-[10px] uppercase border-collapse">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 font-black text-slate-400 sticky left-0 bg-slate-50 border-r">Asset Class</th>
              {monthsInSelectedYear.map((m: string) => (
                <th key={m} className={`px-4 py-4 text-right ${m === currentMonthKey ? 'text-blue-600 bg-blue-50/50 font-black' : 'text-slate-400'}`}>
                  {getMonthLabel(m + "-01")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y font-bold">
            {groups.map(group => {
              const accs = state.accounts.filter(a => a.type === group.type);
              if (accs.length === 0) return null;
              return (
                <React.Fragment key={group.label}>
                  {accs.map(acc => (
                    <tr key={acc.id} className={`hover:bg-slate-50/50 ${acc.archived ? 'opacity-60 grayscale' : ''}`}>
                      <td className="px-6 py-2 text-slate-500 sticky left-0 bg-white border-r">{acc.name} {acc.archived && '(arc)'}</td>
                      {monthsInSelectedYear.map((m: string) => {
                        const bal = balanceMatrix[acc.id]?.[m] ?? null;
                        return (
                          <td key={m} className={`px-4 py-2 text-right border-r border-slate-50 ${bal === null ? 'text-slate-200 bg-slate-50/30' : ''}`}>
                            {bal === null ? '-' : formatCurrency(bal, true)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td className="px-6 py-2 sticky left-0 bg-slate-50 border-r">{group.label} Subtotal</td>
                    {monthsInSelectedYear.map((m: string) => {
                      let subtotal: number | null = 0;
                      let hasNull = false;
                      accs.forEach(a => {
                        const b = balanceMatrix[a.id]?.[m] ?? null;
                        if (b === null) hasNull = true;
                        else if (subtotal !== null) subtotal += b;
                      });
                      const finalSub = hasNull ? null : subtotal;
                      return (
                        <td key={m} className="px-4 py-2 text-right border-r border-slate-50">
                          {finalSub === null ? '-' : formatCurrency(finalSub, true)}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-slate-900 text-white font-black">
              <td className="px-6 py-4 sticky left-0 bg-slate-900 border-r uppercase tracking-widest">Net Worth</td>
              {monthsInSelectedYear.map((m: string) => {
                let total: number | null = 0;
                let hasNull = false;
                state.accounts.forEach(a => {
                  const b = balanceMatrix[a.id]?.[m] ?? null;
                  if (b === null) hasNull = true;
                  else if (total !== null) total += b;
                });
                const finalNet = hasNull ? null : total;
                return (
                  <td key={m} className="px-4 py-4 text-right border-r border-slate-800">
                    {finalNet === null ? '-' : formatCurrency(finalNet, true)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {showAddInv && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 border border-slate-200 shadow-2xl relative">
            <button onClick={() => setShowAddInv(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h4 className="text-lg font-black uppercase text-slate-800 mb-6">New Investment Account</h4>
            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Account Name</label>
                <input 
                  type="text" 
                  value={newInvName} 
                  onChange={e => setNewInvName(e.target.value)} 
                  placeholder="e.g. Robinhood Portfolio" 
                  className={inputStyles}
                  required 
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Current Balance ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={newInvBalance} 
                  onChange={e => setNewInvBalance(e.target.value)} 
                  placeholder="0.00" 
                  className={inputStyles}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddInv(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="flex-[2] bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg">Create Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetWorth;
