
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, Tag, Landmark, FileText, ArrowRightLeft, AlertCircle, Shuffle, Sparkles, TrendingUp, TrendingDown, PieChart, CheckCircle2, X } from 'lucide-react';
import { AppState, TransactionType } from '../types';
// Add missing import for formatCurrency
import { formatCurrency, roundToTwo } from '../utils';

interface TransactionPanelProps {
  state: AppState;
  onAddTransaction: (tx: any) => void;
  onExecuteTransfer: (transfer: any) => void;
  allowedModes?: ('income' | 'expense' | 'allocation' | 'transfer')[];
  filterClassificationId?: string;
}

type LogicMode = 'budget_only' | 'bank_only' | 'mixed' | 'credit_pay' | '';

const DEFAULT_MODES: ('income' | 'expense' | 'allocation' | 'transfer')[] = ['income', 'expense', 'allocation', 'transfer'];

const TransactionPanel: React.FC<TransactionPanelProps> = ({ 
  state, 
  onAddTransaction, 
  onExecuteTransfer,
  allowedModes = DEFAULT_MODES,
  filterClassificationId
}) => {
  const isSavingsPage = filterClassificationId === 'class-savings' || 
    state.classifications.find(c => c.id === filterClassificationId)?.name.toLowerCase() === 'savings';

  const [activeMode, setActiveMode] = useState<'income' | 'expense' | 'allocation' | 'transfer'>(allowedModes[0]);
  const [logicMode, setLogicMode] = useState<LogicMode>('');
  const [error, setError] = useState<string | null>(null);
  const [showTithingPrompt, setShowTithingPrompt] = useState(false);
  
  const [formData, setFormData] = useState({
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    amount: '',
    description: '',
    toCategoryId: '',
    toAccountId: '',
    fromCategoryId: '',
    fromAccountId: '',
  });

  // Reset logic state only when tab explicitly changes
  useEffect(() => {
    setLogicMode('');
    setError(null);
    setFormData(prev => ({ 
      ...prev, 
      amount: '', 
      description: '', 
      categoryId: '', 
      accountId: '', 
      toCategoryId: '', 
      fromCategoryId: '', 
      toAccountId: '', 
      fromAccountId: '' 
    }));
  }, [activeMode]);

  useEffect(() => {
    if (!allowedModes.includes(activeMode)) {
      setActiveMode(allowedModes[0]);
    }
  }, [allowedModes]);

  const activeCategories = state.categories.filter(c => !c.deleted);
  const activeAccounts = state.accounts.filter(a => !a.archived);

  const processIncome = (shouldTithe: boolean) => {
    const amountNum = roundToTwo(parseFloat(formData.amount));
    
    onAddTransaction({
      categoryId: formData.categoryId,
      date: formData.date,
      accountId: formData.accountId,
      amount: amountNum,
      description: formData.description || 'Income Deposit',
      type: 'Income',
    });

    if (shouldTithe) {
      const tithingCat = state.categories.find(c => c.name.toLowerCase() === 'tithing' && !c.deleted);
      if (tithingCat) {
        const tithingAmount = roundToTwo(amountNum * 0.10);
        onAddTransaction({
          categoryId: tithingCat.id,
          date: formData.date,
          accountId: 'internal',
          amount: tithingAmount,
          description: `10% Tithing Allocation from Income: ${formData.description || 'Deposit'}`,
          type: 'Update Budget (Allocation)',
        });
      }
    }

    resetForm();
    setShowTithingPrompt(false);
  };

  const resetForm = () => {
    setFormData(prev => ({ 
      ...prev, 
      amount: '', 
      description: '', 
      categoryId: '', 
      accountId: '', 
      toCategoryId: '', 
      fromCategoryId: '', 
      toAccountId: '', 
      fromAccountId: '' 
    }));
    setLogicMode('');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = roundToTwo(parseFloat(formData.amount));
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a positive amount.");
      return;
    }

    if (activeMode === 'income') {
      const tithingCat = state.categories.find(c => c.name.toLowerCase() === 'tithing' && !c.deleted);
      if (tithingCat) {
        setShowTithingPrompt(true);
      } else {
        processIncome(false);
      }
      return;
    }

    if (activeMode === 'transfer') {
      if (!logicMode) {
        setError("Please select a transfer intent.");
        return;
      }

      const fromAcc = formData.fromAccountId;
      const toAcc = formData.toAccountId;
      const fromCat = formData.fromCategoryId;
      const toCat = formData.toCategoryId;

      if (logicMode !== 'budget_only' && (!fromAcc || !toAcc)) {
        setError("Please select both source and destination accounts.");
        return;
      }
      
      if (logicMode !== 'bank_only' && logicMode !== 'credit_pay' && (!fromCat || !toCat)) {
        setError("Please select both source and destination categories.");
        return;
      }

      if (fromAcc === toAcc && fromCat === toCat) {
        setError("Source and destination cannot be identical.");
        return;
      }

      let txType: TransactionType = 'Category Transfer';
      if (logicMode === 'credit_pay') txType = 'Credit Payment';
      else if (logicMode === 'bank_only') txType = 'Transfer between Checking'; 
      else if (logicMode === 'mixed') txType = 'Account + Category Transfer'; 

      onExecuteTransfer({
        type: txType,
        date: formData.date,
        amount: amountNum,
        description: formData.description,
        fromAccountId: (logicMode === 'budget_only') ? null : fromAcc,
        toAccountId: (logicMode === 'budget_only') ? null : toAcc,
        fromCategoryId: (logicMode === 'bank_only' || logicMode === 'credit_pay') ? null : fromCat,
        toCategoryId: (logicMode === 'bank_only' || logicMode === 'credit_pay') ? null : toCat
      });
    } else if (activeMode === 'expense') {
      let accId = formData.accountId;
      if (isSavingsPage && !accId) {
        accId = activeAccounts.find(a => a.type === 'Savings' && a.id !== 'acc-cd')?.id || '';
      }
      onAddTransaction({
        categoryId: formData.categoryId,
        date: formData.date,
        accountId: accId,
        amount: -amountNum,
        description: formData.description,
        type: 'Standard',
      });
    } else if (activeMode === 'allocation') {
      onAddTransaction({
        categoryId: formData.toCategoryId,
        date: formData.date,
        accountId: 'internal',
        amount: amountNum,
        description: formData.description || 'Internal Allocation',
        type: 'Update Budget (Allocation)',
      });
    }

    resetForm();
  };

  const inputStyles = "w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300";
  const labelStyles = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 px-1";

  const renderCategoryOptions = (context: 'from' | 'to', placeholder: string = "Select Category") => {
    return (
      <>
        <option value="">{placeholder}</option>
        {state.classifications.map(cls => {
          const isIncomeClass = cls.id === 'class-income' || cls.name.toLowerCase() === 'income';
          const isSavingsClass = cls.id === 'class-savings' || cls.name.toLowerCase() === 'savings';
          const isTransfersClass = cls.id === 'class-transfers' || cls.name.toLowerCase() === 'transfers';
          
          if (isTransfersClass || isIncomeClass) return null;

          if (logicMode === 'budget_only') {
            if (isSavingsPage) {
              if (!isSavingsClass) return null;
            } else {
              if (isSavingsClass) return null;
            }
          } else if (logicMode === 'mixed') {
            if (context === 'from') {
               if (isSavingsPage) {
                 if (!isSavingsClass) return null;
               } else {
                 if (isSavingsClass) return null;
               }
            }
          }
          
          const catsInClass = activeCategories.filter(cat => cat.classificationId === cls.id);
          if (catsInClass.length === 0) return null;
          return (
            <optgroup key={cls.id} label={cls.name}>
              {catsInClass.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </optgroup>
          );
        })}
      </>
    );
  };

  const getFilteredAccounts = (direction: 'from' | 'to') => {
    const accs = activeAccounts;
    if (logicMode === 'credit_pay') {
      return direction === 'from' ? accs.filter(a => a.type === 'Checking') : accs.filter(a => a.type === 'Credit');
    }
    if (isSavingsPage) {
      const pureSavings = accs.filter(a => a.type === 'Savings' && a.id !== 'acc-cd');
      if (direction === 'from') return pureSavings;
      return accs.filter(a => (a.type === 'Checking' || a.type === 'Savings') && a.id !== 'acc-cd');
    }
    
    if (direction === 'from') {
      return accs.filter(a => a.type === 'Checking' && a.id !== 'acc-cd');
    } else {
      return accs.filter(a => ['Checking', 'Savings'].includes(a.type) && a.id !== 'acc-cd');
    }
  };

  const getLogicModeOptions = () => {
    if (isSavingsPage) {
      return [
        { value: 'budget_only', label: 'Category Transfer' },
        { value: 'bank_only', label: 'Transfer between Accounts' },
        { value: 'mixed', label: 'Account + Category Transfer' }
      ];
    }
    return [
      { value: 'budget_only', label: 'Category Transfer' },
      { value: 'bank_only', label: 'Transfer between Accounts' },
      { value: 'mixed', label: 'Account + Category Transfer' },
      { value: 'credit_pay', label: 'Credit Payment' }
    ];
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'income': return <TrendingUp size={12} />;
      case 'expense': return <TrendingDown size={12} />;
      case 'allocation': return <PieChart size={12} />;
      case 'transfer': return <ArrowRightLeft size={12} />;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
      <div className="flex bg-slate-50 border-b border-slate-200">
        {allowedModes.map(mode => (
          <button 
            key={mode} 
            type="button" 
            onClick={() => setActiveMode(mode)} 
            className={`flex-1 py-3.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 ${activeMode === mode ? 'bg-white text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {getModeIcon(mode)}
            {mode}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-tight">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {activeMode === 'income' ? (
          <div className="space-y-4">
             <div>
              <label className={labelStyles}>Income Category</label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className={inputStyles} required>
                   <option value="">Select Income Type</option>
                   {state.classifications.filter(c => c.name.toLowerCase() === 'income' || c.id === 'class-income').map(cls => (
                     <optgroup key={cls.id} label={cls.name}>
                       {state.categories.filter(cat => cat.classificationId === cls.id && !cat.deleted).map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                       ))}
                     </optgroup>
                   ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelStyles}>Deposit Account</label>
              <div className="relative">
                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className={inputStyles} required>
                  <option value="">Select Account</option>
                  {activeAccounts.filter(a => {
                    if (isSavingsPage) return a.type === 'Savings' && a.id !== 'acc-cd';
                    return a.type === 'Checking';
                  }).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : activeMode === 'expense' ? (
          <div className="space-y-4">
             <div>
              <label className={labelStyles}>{isSavingsPage ? 'Savings Category' : 'Expense Category'}</label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className={inputStyles} required>
                   <option value="">Select Category</option>
                   {state.classifications.filter(c => {
                     const isInc = c.name.toLowerCase() === 'income' || c.id === 'class-income';
                     const isTrans = c.name.toLowerCase() === 'transfers' || c.id === 'class-transfers';
                     if (isInc || isTrans) return false;
                     if (isSavingsPage) return c.name.toLowerCase() === 'savings' || c.id === 'class-savings';
                     return c.name.toLowerCase() !== 'savings' && c.id !== 'class-savings';
                   }).map(cls => (
                     <optgroup key={cls.id} label={cls.name}>
                       {state.categories.filter(cat => cat.classificationId === cls.id && !cat.deleted).map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                       ))}
                     </optgroup>
                   ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelStyles}>Account / Source</label>
              <div className="relative">
                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className={inputStyles} required>
                  <option value="">Select Account</option>
                  {activeAccounts.filter(a => {
                    if (isSavingsPage) return a.type === 'Savings' && a.id !== 'acc-cd';
                    return (a.type === 'Checking' || a.type === 'Credit');
                  }).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : activeMode === 'allocation' ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-[10px] text-blue-700 font-black uppercase tracking-[0.1em] mb-1">Budget Allocation</p>
              <p className="text-[10px] text-blue-500/80 leading-tight font-semibold">Direct envelope funding from pool.</p>
            </div>
            <div>
              <label className={labelStyles}>Target Category</label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select value={formData.toCategoryId} onChange={e => setFormData({...formData, toCategoryId: e.target.value})} className={inputStyles} required>
                  <option value="">Select Target Category</option>
                  {state.classifications.filter(c => {
                    const isInc = c.name.toLowerCase() === 'income' || c.id === 'class-income';
                    const isTrans = c.name.toLowerCase() === 'transfers' || c.id === 'class-transfers';
                    if (isInc || isTrans) return false;
                    if (isSavingsPage) return c.name.toLowerCase() === 'savings' || c.id === 'class-savings';
                    return c.name.toLowerCase() !== 'savings' && c.id !== 'class-savings';
                  }).map(cls => (
                    <optgroup key={cls.id} label={cls.name}>
                      {state.categories.filter(cat => cat.classificationId === cls.id && !cat.deleted).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelStyles}>Transfer Intent</label>
              <div className="relative">
                <Shuffle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select 
                  value={logicMode} 
                  onChange={e => setLogicMode(e.target.value as LogicMode)} 
                  className={inputStyles}
                  required
                >
                  <option value="">Select Intent</option>
                  {getLogicModeOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>

            {logicMode && logicMode !== 'budget_only' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                <div>
                  <label className={labelStyles}>From Account</label>
                  <select value={formData.fromAccountId} onChange={e => setFormData({...formData, fromAccountId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-600" required>
                    <option value="">Select</option>
                    {getFilteredAccounts('from').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>To Account</label>
                  <select value={formData.toAccountId} onChange={e => setFormData({...formData, toAccountId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-600" required>
                    <option value="">Select</option>
                    {getFilteredAccounts('to').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {logicMode && logicMode !== 'bank_only' && logicMode !== 'credit_pay' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                <div>
                  <label className={labelStyles}>From Category</label>
                  <select value={formData.fromCategoryId} onChange={e => setFormData({...formData, fromCategoryId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-600" required>
                    {renderCategoryOptions('from', "Select")}
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>To Category</label>
                  <select value={formData.toCategoryId} onChange={e => setFormData({...formData, toCategoryId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-600" required>
                    {renderCategoryOptions('to', "Select")}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className={inputStyles} placeholder="0.00" required />
            </div>
          </div>
          <div>
            <label className={labelStyles}>Date</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputStyles} required />
            </div>
          </div>
        </div>

        <div>
          <label className={labelStyles}>Description</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputStyles} placeholder="Details..." />
          </div>
        </div>

        <button type="submit" className="w-full bg-[#0f172a] text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2">
          {activeMode === 'income' ? <><TrendingUp size={16} /> Record Income</> : activeMode === 'expense' ? <><TrendingDown size={16} /> Record Expense</> : activeMode === 'allocation' ? <><PieChart size={16} /> Allocate Funds</> : <><ArrowRightLeft size={16} /> Process Transfer</>}
        </button>
      </form>

      {/* Tithing Prompt Modal */}
      {showTithingPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-10 text-center space-y-6 relative overflow-hidden border border-slate-100">
            <button onClick={() => setShowTithingPrompt(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Sparkles size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black uppercase text-slate-800 tracking-tight">Apply Tithing?</h4>
              <p className="text-[11px] text-slate-400 uppercase font-bold leading-relaxed px-4">
                Would you like to automatically allocate <span className="text-blue-600">10%</span> ({formatCurrency(roundToTwo(parseFloat(formData.amount) * 0.1))}) to your tithing envelope?
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => processIncome(true)} 
                className="w-full bg-[#0f172a] text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> Yes, Allocate 10%
              </button>
              <button 
                onClick={() => processIncome(false)} 
                className="w-full bg-white text-slate-400 border-2 border-slate-50 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
              >
                No, Just Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionPanel;
