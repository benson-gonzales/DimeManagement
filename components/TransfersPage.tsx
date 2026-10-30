
import React, { useState, useMemo } from 'react';
import { AppState, Transaction } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils';
import { Shuffle, ArrowRightLeft, Sparkles, CreditCard, Trash2, AlertTriangle, Layers, Target, ArrowRight } from 'lucide-react';

interface TransfersPageProps {
  state: AppState;
  onAddTransaction: (tx: any) => void;
  onExecuteTransfer: (transfer: any) => void;
  onDeleteTransaction: (id: string) => void;
}

type TopFilter = 'all' | 'allocations' | 'transfers';
type TransferSubTab = 'category' | 'account' | 'hybrid' | 'credit';

const TransfersPage: React.FC<TransfersPageProps> = ({ 
  state, 
  onDeleteTransaction
}) => {
  const [topFilter, setTopFilter] = useState<TopFilter>('transfers');
  const [activeSubTab, setActiveSubTab] = useState<TransferSubTab>('category');
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);

  const transferTabs = [
    { id: 'category', label: 'Category Transfers', icon: Shuffle },
    { id: 'account', label: 'Transfer Between Accounts', icon: ArrowRightLeft },
    { id: 'hybrid', label: 'Account & Category Transfer', icon: Sparkles },
    { id: 'credit', label: 'Credit Payments', icon: CreditCard },
  ];

  const filteredMovements = useMemo(() => {
    return state.transactions
      .filter(t => {
        // Broadly identify any transaction that acts as a transfer or allocation
        const isTransferType = [
          'Update Budget (Allocation)',
          'Category Transfer',
          'Transfer to Savings',
          'Transfer to Checking',
          'Credit Payment',
          'Transfer between Checking',
          'Account + Category Transfer'
        ].includes(t.type);

        // Fallback check: if it has multiple involved accounts/categories, it's a movement
        const hasTransferProperties = !!(t.fromAccountId || t.toAccountId || t.fromCategoryId || t.toCategoryId);

        if (!isTransferType && !hasTransferProperties) return false;

        // Base filter for Top Level
        if (topFilter === 'allocations') {
          return t.type === 'Update Budget (Allocation)';
        }
        
        if (topFilter === 'transfers') {
          switch (activeSubTab) {
            case 'category':
              return t.type === 'Category Transfer' || (t.fromCategoryId && t.toCategoryId && !t.fromAccountId && !t.toAccountId);
            case 'account':
              return ['Transfer between Checking', 'Transfer to Savings', 'Transfer to Checking'].includes(t.type) || (t.fromAccountId && t.toAccountId && !t.fromCategoryId && !t.toCategoryId);
            case 'hybrid':
              return t.type === 'Account + Category Transfer' || (t.fromAccountId && t.toAccountId && t.fromCategoryId && t.toCategoryId);
            case 'credit':
              return t.type === 'Credit Payment';
            default:
              return false;
          }
        }

        if (topFilter === 'all') {
          return true; // We already filtered non-transfer types at the start
        }

        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, topFilter, activeSubTab]);

  const getAccountName = (id?: string | null) => {
    if (!id || id === 'internal' || id === 'none') return null;
    return state.accounts.find(a => a.id === id)?.name || 'Unknown Account';
  };

  const getCategoryName = (id?: string | null) => {
    if (!id || id === 'none') return null;
    return state.categories.find(c => c.id === id)?.name || 'Unknown Category';
  };

  const renderHeaders = () => {
    return (
      <tr>
        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px] w-32">Date</th>
        <th className="px-4 py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Category Flow</th>
        <th className="px-4 py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Account Flow</th>
        <th className="px-4 py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px] text-right">Amount</th>
        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Description</th>
        <th className="px-4 py-4"></th>
      </tr>
    );
  };

  const renderFlow = (from: string | null, to: string | null, highlightTo: boolean = false) => {
    if (!from && !to) return <span className="text-slate-200">-</span>;
    return (
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight">
        {from ? (
          <span className="text-slate-400 truncate max-w-[120px]">{from}</span>
        ) : (
          <span className="text-slate-200">-</span>
        )}
        <ArrowRight size={10} className="text-slate-300 shrink-0" />
        {to ? (
          <span className={`${highlightTo ? 'text-blue-600' : 'text-slate-800'} truncate max-w-[120px]`}>{to}</span>
        ) : (
          <span className="text-slate-200">-</span>
        )}
      </div>
    );
  };

  const renderRow = (tx: Transaction) => {
    const fromCat = getCategoryName(tx.fromCategoryId);
    const toCat = getCategoryName(tx.toCategoryId || (tx.type === 'Update Budget (Allocation)' ? tx.categoryId : null));
    const fromAcc = getAccountName(tx.fromAccountId || (tx.type !== 'Update Budget (Allocation)' && tx.accountId !== 'internal' ? tx.accountId : null));
    const toAcc = getAccountName(tx.toAccountId);

    let categoryFlow = renderFlow(fromCat, toCat, true);
    let accountFlow = renderFlow(fromAcc, toAcc);

    // Contextual cleanup for specific types to make it "look good"
    if (tx.type === 'Update Budget (Allocation)') {
      categoryFlow = renderFlow(null, toCat, true);
      accountFlow = renderFlow(null, null);
    } else if (tx.type === 'Category Transfer' || (!tx.fromAccountId && !tx.toAccountId)) {
      accountFlow = renderFlow(null, null);
    } else if (tx.type === 'Credit Payment') {
      // For credit payment, show account flow but maybe hide category flow if not applicable
      categoryFlow = fromCat || toCat ? renderFlow(fromCat, toCat, true) : renderFlow(null, null);
    } else if (['Transfer between Checking', 'Transfer to Savings', 'Transfer to Checking'].includes(tx.type)) {
      if (!tx.fromCategoryId && !tx.toCategoryId) categoryFlow = renderFlow(null, null);
    }

    return (
      <tr key={tx.id} className="hover:bg-slate-50/50 group transition-colors border-b border-slate-50">
        <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-[10px] font-medium">{formatDisplayDate(tx.date)}</td>
        <td className="px-4 py-4">{categoryFlow}</td>
        <td className="px-4 py-4">{accountFlow}</td>
        <td className="px-4 py-4 text-right font-black text-sm text-blue-600">
          {formatCurrency(tx.amount)}
        </td>
        <td className="px-6 py-4 text-slate-600 font-medium text-[10px]">
          <div className="truncate max-w-[250px]">{tx.description || tx.type}</div>
        </td>
        <td className="px-4 py-4 text-right">
          <button onClick={() => setDeleteConfirm(tx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Level Navigation */}
      <div className="flex gap-2 sm:gap-4 mb-4 overflow-x-auto no-scrollbar p-1 -m-1">
        {[
          { id: 'all', label: 'All Movements', icon: Layers },
          { id: 'allocations', label: 'Allocations', icon: Target },
          { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTopFilter(item.id as TopFilter)}
            className={`px-4 sm:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3 whitespace-nowrap shrink-0 transition-all border-2 ${
              topFilter === item.id 
                ? 'bg-[#0f172a] text-white border-slate-900 shadow-xl scale-105' 
                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Transfers Sub-Navigation - Only visible when Transfers is selected */}
      {(topFilter === 'transfers') && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar border-b border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
          {transferTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as TransferSubTab)}
              className={`px-6 py-3 rounded-t-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border-t border-l border-r flex items-center gap-2 ${
                activeSubTab === tab.id 
                  ? 'bg-white text-blue-600 border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] -mb-[1px] relative z-10' 
                  : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              {renderHeaders()}
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMovements.length > 0 ? (
                filteredMovements.map(renderRow)
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center text-slate-300 italic uppercase text-[10px] tracking-widest font-black">
                    No records found for this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center space-y-6">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-base font-black uppercase text-slate-800">Reverse Movement?</h4>
            <p className="text-[11px] text-slate-400 uppercase font-bold leading-relaxed">
              This action will restore the balances of all involved accounts and categories to their previous state.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-3 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
              <button onClick={() => { onDeleteTransaction(deleteConfirm.id); setDeleteConfirm(null); }} className="flex-1 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersPage;
