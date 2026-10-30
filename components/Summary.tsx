
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { formatCurrency, getMonthYearKey, parseLocalDate } from '../utils';
import { MousePointer2, X, Activity, Calendar } from 'lucide-react';

interface SummaryProps {
  state: AppState;
}

interface SelectedCell {
  id: string;
  value: number;
}

const Summary: React.FC<SummaryProps> = ({ state }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);

  const currentMonthKey = useMemo(() => getMonthYearKey(new Date()), []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    state.transactions.forEach(t => {
      const y = new Date(t.date).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [state.transactions, currentYear]);

  const months = useMemo(() => {
    const res = [];
    for (let i = 0; i < 12; i++) {
      res.push(getMonthYearKey(new Date(selectedYear, i, 1)));
    }
    return res;
  }, [selectedYear]);

  const calculations = useMemo(() => {
    const data: Record<string, Record<string, { externalAdded: number, externalSpent: number, transfers: number, net: number }>> = {};
    state.categories.forEach(cat => {
      data[cat.id] = {};
      months.forEach(m => {
        if (m > currentMonthKey) {
          data[cat.id][m] = { externalAdded: 0, externalSpent: 0, transfers: 0, net: 0 };
          return;
        }

        const txs = state.transactions.filter(t => 
          (t.categoryId === cat.id || t.toCategoryId === cat.id || t.fromCategoryId === cat.id) && 
          getMonthYearKey(t.date) === m
        );
        
        const isTransferType = (t: any) => 
          ['Transfer', 'Category Transfer', 'Account + Category Transfer', 'Credit Payment', 'Transfer between Checking'].includes(t.type || '');

        const externalAdded = txs.reduce((sum, t) => {
          // External: categoryId is set, no from/to categories, and NOT a transfer type
          if (t.categoryId === cat.id && !t.fromCategoryId && !t.toCategoryId && !isTransferType(t)) {
             if (t.type === 'Income' || t.type === 'Update Budget (Allocation)') {
               return sum + Math.abs(t.amount);
             }
             if (t.amount > 0) return sum + t.amount;
          }
          return sum;
        }, 0);

        const externalSpent = txs.reduce((sum, t) => {
          // External: categoryId is set, no from/to categories, negative amount, and NOT a transfer type
          if (t.categoryId === cat.id && t.amount < 0 && !t.toCategoryId && !t.fromCategoryId && !isTransferType(t)) {
            return sum + t.amount;
          }
          return sum;
        }, 0);

        const transfers = txs.reduce((sum, t) => {
          let delta = 0;
          
          // 1. Handle explicit from/to fields (standard for transfers)
          if (t.toCategoryId === cat.id) delta += Math.abs(t.amount);
          if (t.fromCategoryId === cat.id) delta -= Math.abs(t.amount);
          
          // 2. Handle categoryId if it's a transfer type and not already covered by from/to
          if (t.categoryId === cat.id && t.toCategoryId !== cat.id && t.fromCategoryId !== cat.id) {
            if (isTransferType(t)) {
              // For transfers, categoryId acts as the net impact (positive for in, negative for out)
              delta += t.amount;
            }
          }
          
          return sum + delta;
        }, 0);

        data[cat.id][m] = { externalAdded, externalSpent, transfers, net: externalAdded + externalSpent + transfers };
      });
    });
    return data;
  }, [state.categories, state.transactions, months, currentMonthKey]);

  const categoriesToCalculate = useMemo(() => {
    return state.categories.filter(c => {
      if (['cat-credit-payment', 'Credit Payment'].includes(c.name)) return false;
      const cls = state.classifications.find(cl => cl.id === c.classificationId);
      if (cls?.name.toLowerCase() === 'transfers') return false;
      if (c.deleted) return months.some(m => {
        const s = calculations[c.id]?.[m];
        return s && (s.externalAdded !== 0 || s.externalSpent !== 0 || s.transfers !== 0);
      });
      return true;
    });
  }, [state.categories, months, calculations, state.classifications]);

  const incomeCats = useMemo(() => categoriesToCalculate.filter(c => state.classifications.find(cl => cl.id === c.classificationId)?.name.toLowerCase() === 'income'), [categoriesToCalculate, state.classifications]);
  const expenseCats = useMemo(() => categoriesToCalculate.filter(c => state.classifications.find(cl => cl.id === c.classificationId)?.name.toLowerCase() !== 'income'), [categoriesToCalculate, state.classifications]);

  // Analysis Dashboard Calculation (Resources vs Expenses)
  const analysisData = useMemo(() => {
    return months.map(m => {
      if (m > currentMonthKey) return { month: m, income: 0, expenses: 0, savingsResources: 0, net: 0, future: true };
      
      const monthTxs = state.transactions.filter(t => getMonthYearKey(t.date) === m);
      
      // 1. External Income (from Income Summary table)
      const income = incomeCats.reduce((sum, cat) => {
        return sum + (calculations[cat.id]?.[m]?.externalAdded || 0);
      }, 0);

      // 2. External Expenses (from Expense Summary table)
      const expenses = expenseCats.reduce((sum, cat) => {
        return sum + Math.abs(calculations[cat.id]?.[m]?.externalSpent || 0);
      }, 0);

      // 3. Resources from Savings (Transfers from Savings to Checking)
      const savingsResources = monthTxs.reduce((sum, t) => {
        if (t.fromAccountId && t.toAccountId) {
          const fromAcc = state.accounts.find(a => a.id === t.fromAccountId);
          const toAcc = state.accounts.find(a => a.id === t.toAccountId);
          if (fromAcc?.type === 'Savings' && toAcc?.type === 'Checking') {
            return sum + Math.abs(t.amount);
          }
        }
        return sum;
      }, 0);

      return { month: m, income, expenses, savingsResources, net: income - expenses, future: false };
    });
  }, [state.transactions, months, currentMonthKey, incomeCats, expenseCats, calculations, state.accounts]);

  const analysisTotals = useMemo(() => {
    return analysisData.reduce((acc, d) => ({
      income: acc.income + d.income,
      expenses: acc.expenses + d.expenses,
      savingsResources: acc.savingsResources + d.savingsResources,
      net: acc.net + d.net
    }), { income: 0, expenses: 0, savingsResources: 0, net: 0 });
  }, [analysisData]);

  const toggleSelection = (e: React.MouseEvent, id: string, value: number) => {
    if (value === 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      const exists = selectedCells.find(c => c.id === id);
      setSelectedCells(exists ? selectedCells.filter(c => c.id !== id) : [...selectedCells, { id, value }]);
    } else setSelectedCells([{ id, value }]);
  };

  const selectionStats = useMemo(() => {
    if (selectedCells.length === 0) return null;
    const sum = selectedCells.reduce((acc, c) => acc + c.value, 0);
    return { count: selectedCells.length, sum, avg: sum / selectedCells.length };
  }, [selectedCells]);

  const renderSection = (title: string, catList: any[], field: 'externalAdded' | 'externalSpent' | 'transfers' | 'net', colorClass: string, isIncomeTable = false) => {
    const relevantClasses = state.classifications.filter(cls => {
      if (cls.deleted) return false;
      const name = cls.name.toLowerCase();
      if (isIncomeTable) return name === 'income';
      return name !== 'income' && name !== 'transfers';
    });

    const groupedData = relevantClasses.map(cls => ({ classification: cls, categories: catList.filter(c => c.classificationId === cls.id) })).filter(g => g.categories.length > 0);

    return (
      <div className="bg-white rounded border shadow-sm overflow-hidden mb-8">
        <div className={`px-4 py-2 ${colorClass} border-b flex items-center justify-between`}><h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-widest">{title}</h3><span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{months[0]} - {months[months.length-1]}</span></div>
        <div className="overflow-x-auto custom-scrollbar"><table className="w-full text-left text-[10px] uppercase border-collapse select-none">
          <thead className="bg-slate-50 border-b"><tr><th className="px-4 py-2 sticky left-0 bg-slate-50 z-20 border-r">Category</th>{months.map(m => <th key={m} className={`px-2 py-2 text-right border-r ${m === currentMonthKey ? 'text-blue-600 bg-blue-50/50' : ''}`}>{parseLocalDate(m + "-01").toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</th>)}<th className="px-4 py-2 text-right bg-slate-100 font-black">Total</th></tr></thead>
          <tbody className="divide-y divide-slate-300">
            {groupedData.map(({ classification, categories }) => (
              <React.Fragment key={classification.id}>
                {!isIncomeTable && <tr className={`${classification.color} font-black h-7 border-y`}><td colSpan={months.length + 2} className="px-4 py-1 text-[9px] uppercase tracking-widest text-slate-700 bg-inherit sticky left-0 z-10 border-r">{classification.name}</td></tr>}
                {categories.map(cat => {
                  let rowTotal = 0;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50 group h-7"><td className="px-4 py-1 text-slate-700 font-medium sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r">{cat.name}{cat.deleted && <span className="ml-1 opacity-40 lowercase">(arc)</span>}</td>
                      {months.map(m => {
                        const stats = calculations[cat.id]?.[m] || { externalAdded: 0, externalSpent: 0, transfers: 0, net: 0 };
                        const val = stats[field];
                        const isFuture = m > currentMonthKey;
                        rowTotal += val;
                        const isSelected = selectedCells.some(c => c.id === `${cat.id}-${m}-${field}`);
                        return (
                          <td 
                            key={m} 
                            onClick={e => !isFuture && toggleSelection(e, `${cat.id}-${m}-${field}`, val)} 
                            className={`px-2 py-1 text-right border-r cursor-pointer transition-all ${isFuture ? 'text-slate-200 cursor-default bg-slate-50/30' : isSelected ? 'bg-blue-500 text-white font-black' : val === 0 ? 'text-slate-200' : val < 0 ? 'text-red-500' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            {isFuture || val === 0 ? '-' : formatCurrency(val, true)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-1 text-right font-bold bg-slate-50 border-l">{formatCurrency(rowTotal, true)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-bold h-8"><tr><td className="px-4 py-1 uppercase tracking-widest text-[9px] sticky left-0 bg-slate-900 border-r">Total</td>{months.map(m => <td key={m} className="px-2 py-1 text-right border-r">{formatCurrency(catList.reduce((acc, cat) => acc + (calculations[cat.id]?.[m]?.[field] || 0), 0), true)}</td>)}
          <td className="px-4 py-1 text-right bg-slate-800 border-l">{formatCurrency(catList.reduce((acc, cat) => acc + months.reduce((ma, m) => ma + (calculations[cat.id]?.[m]?.[field] || 0), 0), 0), true)}</td></tr></tfoot>
        </table></div>
      </div>
    );
  };

  return (
    <div className="relative space-y-6 pb-24">
      {/* Year Selector Tabs */}
      <div className="flex justify-center mb-4">
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

      {/* 1. Income Summary */}
      {renderSection(`Income Summary (${selectedYear})`, incomeCats, 'externalAdded', 'bg-cyan-50', true)}

      {/* 2. Expense Summary */}
      {renderSection(`Expense Summary (${selectedYear})`, expenseCats, 'externalSpent', 'bg-red-50')}

      {/* 3. Resources vs Expenses Analysis Dashboard */}
      <div className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity size={14} className="text-blue-500" /> Resources vs Expenses Analysis ({selectedYear})
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Resources
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Expenses
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar no-scrollbar">
          <table className="w-full text-left text-[10px] uppercase border-collapse">
            <thead className="bg-[#1e293b] border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 font-black text-slate-400 sticky left-0 bg-[#1e293b] z-20 border-r border-slate-700">Metric</th>
                {months.map(m => (
                  <th key={m} className={`px-3 py-3 text-right border-r border-slate-700/50 ${m === currentMonthKey ? 'text-blue-400 bg-slate-800' : 'text-slate-400'}`}>
                    {parseLocalDate(m + "-01").toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </th>
                ))}
                <th className="px-6 py-3 text-white font-black text-right bg-[#334155] border-l border-slate-700">Total</th>
              </tr>
            </thead>
            <tbody className="font-bold divide-y divide-slate-800">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-blue-400 sticky left-0 bg-[#0f172a] border-r border-slate-800">Resources (Income)</td>
                {analysisData.map(d => (
                  <td key={d.month} className={`px-3 py-4 text-right border-r border-slate-800/50 ${d.future ? 'text-slate-700' : 'text-white'}`}>
                    {d.future ? '-' : formatCurrency(d.income, true)}
                  </td>
                ))}
                <td className="px-6 py-4 text-right bg-slate-900/50 text-blue-400 font-black border-l border-slate-800">
                  {formatCurrency(analysisTotals.income, true)}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-red-400 sticky left-0 bg-[#0f172a] border-r border-slate-800">Expenses (Total Spend)</td>
                {analysisData.map(d => (
                  <td key={d.month} className={`px-3 py-4 text-right border-r border-slate-800/50 ${d.future ? 'text-slate-700' : 'text-white/80'}`}>
                    {d.future ? '-' : formatCurrency(d.expenses, true)}
                  </td>
                ))}
                <td className="px-6 py-4 text-right bg-slate-900/50 text-red-400 font-black border-l border-slate-800">
                  {formatCurrency(analysisTotals.expenses, true)}
                </td>
              </tr>
              <tr className="bg-slate-900/80 font-black h-14">
                <td className="px-6 py-4 text-white uppercase tracking-widest sticky left-0 bg-slate-900/80 border-r border-slate-800">Net Cash Flow</td>
                {analysisData.map(d => (
                  <td key={d.month} className={`px-3 py-4 text-right border-r border-slate-800/50 text-sm ${d.future ? 'text-slate-700' : d.net >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                    {d.future ? '-' : formatCurrency(d.net, true)}
                  </td>
                ))}
                <td className={`px-6 py-4 text-right bg-blue-600 text-white text-base border-l border-blue-500 shadow-inner`}>
                  {formatCurrency(analysisTotals.net, true)}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-slate-400 sticky left-0 bg-[#0f172a] border-r border-slate-800">Resources from Savings</td>
                {analysisData.map(d => (
                  <td key={d.month} className={`px-3 py-4 text-right border-r border-slate-800/50 ${d.future ? 'text-slate-700' : 'text-white/80'}`}>
                    {d.future || d.savingsResources === 0 ? '-' : formatCurrency(d.savingsResources, true)}
                  </td>
                ))}
                <td className="px-6 py-4 text-right bg-slate-900/50 text-slate-400 font-black border-l border-slate-800">
                  {formatCurrency(analysisTotals.savingsResources, true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 bg-slate-100 w-fit px-4 py-1.5 rounded-full mt-8">
        <MousePointer2 size={12} /> Spreadsheet Select Active
      </div>

      {/* 4. Money Added Summary */}
      {renderSection(`Money Added Summary (${selectedYear})`, expenseCats, 'externalAdded', 'bg-blue-50')}

      {/* 5. Category Transfers Summary */}
      {renderSection(`Category Transfers (${selectedYear})`, expenseCats, 'transfers', 'bg-amber-50')}

      {/* 6. Net Activity Summary */}
      {renderSection(`Net Activity Summary (${selectedYear})`, expenseCats, 'net', 'bg-slate-100')}

      {selectionStats && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white rounded-2xl p-4 flex items-center gap-5 sm:gap-12 border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Active Metrics</span>
            <span className="text-xs font-bold">Sum: <span className="text-green-400">{formatCurrency(selectionStats.sum, true)}</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Average</span>
            <span className="text-xs font-bold">{formatCurrency(selectionStats.avg, true)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Count</span>
            <span className="text-xs font-bold">{selectionStats.count}</span>
          </div>
          <button onClick={() => setSelectedCells([])} className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Summary;
