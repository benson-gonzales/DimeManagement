
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Transaction, Classification } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils';

interface LedgersProps {
  state: AppState;
}

const Ledgers: React.FC<LedgersProps> = ({ state }) => {
  // Filter out the Transfers classification from the ledger tabs as they are now handled on the Transfers & Allocations page.
  const sortedClassifications = useMemo(() => {
    return state.classifications
      .filter(c => 
        !c.deleted && 
        c.id !== 'class-transfers' && 
        c.name.toLowerCase() !== 'transfers'
      )
      .sort((a, b) => {
        // Prioritize Income class at the front
        if (a.id === 'class-income') return -1;
        if (b.id === 'class-income') return 1;
        return (a.orderIndex ?? 999) - (b.orderIndex ?? 999);
      });
  }, [state.classifications]);

  const [activeClassId, setActiveClassId] = useState(sortedClassifications[0]?.id);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const activeClass = useMemo(() => {
    return state.classifications.find(c => c.id === activeClassId);
  }, [state.classifications, activeClassId]);

  const categoriesInClass = useMemo(() => {
    return state.categories.filter(c => c.classificationId === activeClassId && !c.deleted);
  }, [state.categories, activeClassId]);

  useEffect(() => {
    if (categoriesInClass.length > 0) {
      setActiveCategoryId(categoriesInClass[0].id);
    } else {
      setActiveCategoryId(null);
    }
  }, [categoriesInClass]);

  const activeCategory = useMemo(() => {
    return state.categories.find(c => c.id === activeCategoryId);
  }, [state.categories, activeCategoryId]);

  const filteredTransactions = useMemo(() => {
    if (!activeCategoryId) return [];
    return state.transactions
      .filter(tx => tx.categoryId === activeCategoryId || tx.fromCategoryId === activeCategoryId || tx.toCategoryId === activeCategoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, activeCategoryId]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar border-b border-slate-200">
        {sortedClassifications.map(cls => (
          <button
            key={cls.id}
            onClick={() => setActiveClassId(cls.id)}
            className={`px-6 py-2 rounded-t-lg text-[11px] font-bold transition-all whitespace-nowrap uppercase tracking-widest border-t border-l border-r ${
              activeClassId === cls.id 
                ? `${cls.color} text-slate-800 border-slate-300 -mb-[1px]` 
                : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
            }`}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {categoriesInClass.length > 0 && (
        <div className="flex flex-wrap gap-3 py-2">
          {categoriesInClass.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-5 py-1.5 rounded-md text-[11px] font-black transition-all uppercase tracking-wider border-2 ${
                activeCategoryId === cat.id
                  ? `${activeClass?.color || 'bg-blue-50'} border-slate-400 text-slate-900 shadow-sm`
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {activeCategory ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`px-6 py-4 ${activeClass?.color || 'bg-slate-50'} border-b border-slate-200 flex justify-between items-center`}>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 shadow-sm opacity-50"></div>
              <h3 className="font-black text-slate-800 tracking-tight uppercase text-xs">
                {activeCategory.name}
              </h3>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Current Balance: <span className={`text-sm ml-2 ${activeCategory.balance < 0 ? 'text-red-600 font-black' : 'text-slate-900 font-black'}`}>
                {formatCurrency(activeCategory.balance)}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-tighter w-32">Date</th>
                  <th className="px-4 py-4 font-bold text-slate-400 uppercase tracking-tighter w-48">Account</th>
                  <th className="px-4 py-4 font-bold text-slate-400 uppercase tracking-tighter text-right w-32">Amount</th>
                  <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-tighter">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(tx => {
                    const account = state.accounts.find(a => a.id === tx.accountId);
                    
                    // Logic to determine display amount and description for transfers
                    let displayAmt = tx.amount;
                    let displayDesc = tx.description;

                    if (tx.fromCategoryId === activeCategoryId) {
                      displayAmt = -Math.abs(tx.amount);
                    } else if (tx.toCategoryId === activeCategoryId) {
                      displayAmt = Math.abs(tx.amount);
                    }

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-3.5 text-slate-500 font-medium">
                          {formatDisplayDate(tx.date)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-semibold uppercase text-[10px] tracking-tight">
                          {account?.name || (tx.accountId === 'internal' ? 'Internal Allocation' : 'N/A')}
                        </td>
                        <td className={`px-4 py-3.5 text-right font-black text-sm ${displayAmt < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                          {displayAmt < 0 ? `(${formatCurrency(Math.abs(displayAmt))})` : formatCurrency(displayAmt)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 group-hover:text-slate-900 transition-colors">
                          {displayDesc || tx.type}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-300 italic text-[11px] uppercase tracking-widest">
                      No transactions found for {activeCategory.name}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 uppercase text-[10px] font-bold tracking-widest italic">Select a category to view ledger</p>
        </div>
      )}
    </div>
  );
};

export default Ledgers;
