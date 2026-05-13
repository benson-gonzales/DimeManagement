
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Category, Classification } from '../types';
import { formatCurrency, getMonthYearKey, generateId } from '../utils';
import { Target, TrendingUp, TrendingDown, Plus, Trash2, X, Wallet, Settings2, GripVertical, ChevronUp, ChevronDown, CheckCircle2, Palette, Save, Loader2, Layers, AlertTriangle } from 'lucide-react';

interface BudgetManagerProps {
  state: AppState;
  onUpdateBudget: (id: string, val: number) => void;
  onUpdateCategoryMetadata: (id: string, updates: any) => Promise<any>;
  onUpdateEstIncome: (val: number) => void;
  onAddCategory: (name: string, className: string, color: string) => void;
  onAddClassification: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteClassification: (id: string) => void;
  persistLayout?: (classifications: Classification[], categories: Category[]) => Promise<void>;
}

const COLOR_OPTIONS = [
  { name: 'Sky', value: 'bg-sky-100' },
  { name: 'Emerald', value: 'bg-emerald-100' },
  { name: 'Green', value: 'bg-green-100' },
  { name: 'Amber', value: 'bg-amber-100' },
  { name: 'Yellow', value: 'bg-yellow-100' },
  { name: 'Cyan', value: 'bg-cyan-100' },
  { name: 'Blue', value: 'bg-blue-100' },
  { name: 'Slate', value: 'bg-slate-100' },
  { name: 'Rose', value: 'bg-rose-100' },
  { name: 'Indigo', value: 'bg-indigo-100' },
];

const BudgetManager: React.FC<BudgetManagerProps> = ({ 
  state, 
  onUpdateBudget, 
  onUpdateCategoryMetadata,
  onUpdateEstIncome, 
  onAddCategory, 
  onAddClassification,
  onDeleteCategory,
  onDeleteClassification,
  persistLayout
}) => {
  const currentMonth = getMonthYearKey(new Date());
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [draftClassifications, setDraftClassifications] = useState<Classification[]>([]);
  const [draftCategories, setDraftCategories] = useState<Category[]>([]);

  const [newCat, setNewCat] = useState({ name: '', className: '', color: 'bg-slate-100' });
  const [newClass, setNewClass] = useState({ name: '', color: 'bg-slate-100' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string, type: 'cat' | 'class' } | null>(null);

  useEffect(() => {
    if (isEditLayoutMode) {
      setDraftClassifications([...state.classifications]);
      setDraftCategories([...state.categories]);
    }
  }, [isEditLayoutMode, state.classifications, state.categories]);

  const budgetStats = useMemo(() => {
    const list = isEditLayoutMode ? draftCategories : state.categories;
    return list
      .filter(cat => !cat.deleted && cat.id !== 'cat-credit-payment' && cat.name !== 'Credit Payment')
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
            if (t.amount > 0 && !t.fromCategoryId && !t.toCategoryId) return sum + t.amount;
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

        return { ...cat, added, spent };
      });
  }, [isEditLayoutMode, draftCategories, state.categories, state.transactions, currentMonth]);

  const incomeCategories = budgetStats.filter(c => {
    const cls = state.classifications.find(cl => cl.id === c.classificationId);
    return c.classificationId === 'class-income' || cls?.name.toLowerCase() === 'income';
  });
  
  const expenseCategories = budgetStats.filter(c => {
    const cls = state.classifications.find(cl => cl.id === c.classificationId);
    const isInc = c.classificationId === 'class-income' || cls?.name.toLowerCase() === 'income';
    const isTrans = c.classificationId === 'class-transfers' || cls?.name.toLowerCase() === 'transfers';
    return !isInc && !isTrans;
  });
  
  const incomeClass = state.classifications.find(cls => cls.id === 'class-income' || cls.name.toLowerCase() === 'income');
  const isSystemGroup = (cls: Classification) => ['transfers', 'income'].includes(cls.name.toLowerCase()) || ['class-transfers', 'class-income'].includes(cls.id);
  const activeClasses = (isEditLayoutMode ? draftClassifications : state.classifications).filter(cls => !cls.deleted && !isSystemGroup(cls));
  
  const totalTargetIncome = incomeCategories.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
  const totalBudgetedExpenses = expenseCategories.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
  const diff = totalTargetIncome - totalBudgetedExpenses;

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCat.name && newCat.className) {
      if (isEditLayoutMode) {
        const clsId = draftClassifications.find(c => c.name === newCat.className)?.id || 'unknown';
        const newCatObj: Category = {
          id: `cat-temp-${generateId()}`,
          name: newCat.name,
          classificationId: clsId,
          balance: 0,
          monthlyBudget: 0,
          goalAmount: 0,
          orderIndex: draftCategories.length
        };
        setDraftCategories([...draftCategories, newCatObj]);
      } else {
        onAddCategory(newCat.name, newCat.className, newCat.color);
      }
      setNewCat({ name: '', className: '', color: 'bg-slate-100' });
      setShowAddCat(false);
    }
  };

  const handleQuickAddCat = (classificationId: string) => {
    const currentClasses = isEditLayoutMode ? draftClassifications : state.classifications;
    const cls = currentClasses.find(c => c.id === classificationId);
    if (cls) {
      setNewCat({ name: '', className: cls.name, color: 'bg-slate-100' });
      setShowAddCat(true);
    }
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClass.name) {
      if (isEditLayoutMode) {
        const newCls: Classification = {
          id: `class-temp-${generateId()}`,
          name: newClass.name,
          color: newClass.color || 'bg-slate-100',
          orderIndex: draftClassifications.length
        };
        setDraftClassifications([...draftClassifications, newCls]);
      } else {
        onAddClassification(newClass.name, newClass.color);
      }
      setNewClass({ name: '', color: 'bg-slate-100' });
      setShowAddClass(false);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      if (isEditLayoutMode) {
        if (deleteConfirm.type === 'cat') {
          setDraftCategories(prev => prev.map(c => c.id === deleteConfirm.id ? { ...c, deleted: true } : c));
        } else {
          setDraftClassifications(prev => prev.map(c => c.id === deleteConfirm.id ? { ...c, deleted: true } : c));
          setDraftCategories(prev => prev.map(c => c.classificationId === deleteConfirm.id ? { ...c, deleted: true } : c));
        }
      } else {
        if (deleteConfirm.type === 'cat') onDeleteCategory(deleteConfirm.id);
        else onDeleteClassification(deleteConfirm.id);
      }
      setDeleteConfirm(null);
    }
  };

  const moveItem = (id: string, direction: 'up' | 'down', type: 'class' | 'cat') => {
    if (type === 'class') {
      const idx = draftClassifications.findIndex(item => item.id === id);
      const list = draftClassifications.filter(c => !isSystemGroup(c));
      const filteredIdx = list.findIndex(c => c.id === id);
      if (direction === 'up' && filteredIdx === 0) return;
      if (direction === 'down' && filteredIdx === list.length - 1) return;
      const targetFilteredIdx = direction === 'up' ? filteredIdx - 1 : filteredIdx + 1;
      const targetCls = list[targetFilteredIdx];
      const realTargetIdx = draftClassifications.findIndex(c => c.id === targetCls.id);
      const newList = [...draftClassifications];
      [newList[idx], newList[realTargetIdx]] = [newList[realTargetIdx], newList[idx]];
      setDraftClassifications(newList);
    } else {
      const cat = draftCategories.find(c => c.id === id);
      if (!cat) return;
      const sameGroup = draftCategories.filter(c => c.classificationId === cat.classificationId && !c.deleted);
      const subIdx = sameGroup.findIndex(c => c.id === id);
      if (direction === 'up' && subIdx === 0) return;
      if (direction === 'down' && subIdx === sameGroup.length - 1) return;
      const targetSubIdx = direction === 'up' ? subIdx - 1 : subIdx + 1;
      const targetCat = sameGroup[targetSubIdx];
      const gIdxA = draftCategories.findIndex(c => c.id === id);
      const gIdxB = draftCategories.findIndex(c => c.id === targetCat.id);
      const newList = [...draftCategories];
      [newList[gIdxA], newList[gIdxB]] = [newList[gIdxB], newList[gIdxA]];
      setDraftCategories(newList);
    }
  };

  const handleSaveLayout = async () => {
    if (!persistLayout) return;
    setIsSaving(true);
    try {
      await persistLayout(draftClassifications, draftCategories);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsEditLayoutMode(false); }, 1000);
    } catch (err) { alert("Error: Changes could not be saved."); }
    finally { setIsSaving(false); }
  };

  const renderSortButtons = (id: string, idx: number, max: number, type: 'class' | 'cat') => (
    <div className="flex flex-col gap-0.5 ml-3">
      <button onClick={() => moveItem(id, 'up', type)} disabled={idx === 0} className={`p-1 rounded ${idx === 0 ? 'opacity-20' : 'text-slate-500 hover:bg-slate-200'}`}><ChevronUp size={14} /></button>
      <button onClick={() => moveItem(id, 'down', type)} disabled={idx === max} className={`p-1 rounded ${idx === max ? 'opacity-20' : 'text-slate-500 hover:bg-slate-200'}`}><ChevronDown size={14} /></button>
    </div>
  );

  const renderClassificationTable = (cls: Classification, cats: any[], clsIdx: number, maxCls: number) => {
    const isIncome = cls.id === 'class-income' || cls.name.toLowerCase() === 'income';
    const isSavings = cls.id === 'class-savings' || cls.name.toLowerCase() === 'savings';
    const currentCls = isEditLayoutMode ? draftClassifications.find(d => d.id === cls.id)! : cls;
    const catsToRender = isEditLayoutMode ? draftCategories.filter(c => c.classificationId === cls.id && !c.deleted) : cats;
    if (!currentCls) return null;

    return (
      <div key={cls.id} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-12">
        <div className={`px-8 py-6 ${isIncome ? 'bg-cyan-50' : currentCls.color} border-b border-slate-200 flex justify-between items-center`}>
          <div className="flex items-center gap-4">
            {isEditLayoutMode && <GripVertical size={20} className="text-slate-400" />}
            {isEditLayoutMode ? (
              <div className="flex items-center gap-4">
                <input type="text" value={currentCls.name} onChange={e => {
                  const newList = [...draftClassifications];
                  const i = newList.findIndex(d => d.id === cls.id);
                  newList[i] = { ...newList[i], name: e.target.value };
                  setDraftClassifications(newList);
                }} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500 w-64 shadow-inner" />
                {!isIncome && (
                  <div className="flex gap-2 bg-white/50 p-2 rounded-xl border border-white/50">
                    {COLOR_OPTIONS.slice(0, 6).map(opt => (
                      <button key={opt.value} onClick={() => {
                        const newList = [...draftClassifications];
                        const i = newList.findIndex(d => d.id === cls.id);
                        newList[i] = { ...newList[i], color: opt.value };
                        setDraftClassifications(newList);
                      }} className={`w-6 h-6 rounded-full border-2 ${currentCls.color === opt.value ? 'ring-2 ring-blue-500' : ''} ${opt.value}`} />
                    ))}
                    <button onClick={() => setDeleteConfirm({ id: cls.id, name: cls.name, type: 'class' })} className="ml-3 p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>
                  </div>
                )}
                <button 
                  onClick={() => handleQuickAddCat(currentCls.id)}
                  className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-white text-slate-600 transition-all border border-slate-200 ml-2"
                >
                  <Plus size={12} /> Add Category
                </button>
              </div>
            ) : (
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-3">{isIncome && <Wallet size={20} />} {cls.name}</h3>
            )}
            {isEditLayoutMode && !isIncome && renderSortButtons(cls.id, clsIdx, maxCls, 'class')}
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{isIncome ? 'Cash Inflow' : 'Strategic Allocation'}</p>
        </div>
        <table className="w-full text-left text-base">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 font-black text-slate-500 uppercase text-[11px] tracking-widest">Category</th>
              <th className="px-6 py-5 font-black text-slate-500 uppercase text-[11px] tracking-widest text-right">Budget</th>
              {isSavings && <th className="px-6 py-5 font-black text-slate-500 uppercase text-[11px] tracking-widest text-right">Goal</th>}
              <th className="px-6 py-5 font-black text-slate-500 uppercase text-[11px] tracking-widest text-right">Actual Inflow (CM)</th>
              {!isIncome && <th className="px-6 py-5 font-black text-slate-500 uppercase text-[11px] tracking-widest text-right">Spent (CM)</th>}
              <th className="px-6 py-5 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {catsToRender.map((cat, catIdx) => (
              <tr key={cat.id} className="hover:bg-slate-50/50 group transition-colors">
                <td className="px-8 py-4 font-semibold text-slate-700">
                  {isEditLayoutMode ? (
                    <div className="flex items-center gap-6">
                      <div className="space-y-1">
                        <input type="text" value={cat.name} onChange={e => {
                          const newList = [...draftCategories];
                          const i = newList.findIndex(c => c.id === cat.id);
                          newList[i] = { ...newList[i], name: e.target.value };
                          setDraftCategories(newList);
                        }} className="bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-sm font-bold text-slate-700 w-48 shadow-sm" />
                        <select value={cat.classificationId} onChange={e => {
                          const newList = [...draftCategories];
                          const i = newList.findIndex(c => c.id === cat.id);
                          newList[i] = { ...newList[i], classificationId: e.target.value };
                          setDraftCategories(newList);
                        }} className="block w-full text-[10px] font-black uppercase text-slate-400 border-none bg-transparent">
                          {draftClassifications.filter(c => c.name.toLowerCase() !== 'transfers').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      {renderSortButtons(cat.id, catIdx, catsToRender.length - 1, 'cat')}
                    </div>
                  ) : cat.name}
                </td>
                <td className="px-6 py-4 text-right">
                  <input type="number" step="0.01" disabled={isEditLayoutMode} className={`w-32 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${isEditLayoutMode ? 'opacity-50' : 'hover:border-slate-300'}`} value={cat.monthlyBudget || 0} onChange={e => onUpdateBudget(cat.id, parseFloat(e.target.value) || 0)} />
                </td>
                {isSavings && (
                  <td className="px-6 py-4 text-right">
                    <input type="number" step="0.01" disabled={isEditLayoutMode} className={`w-32 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${isEditLayoutMode ? 'opacity-50' : 'hover:border-slate-300'}`} value={cat.goalAmount || 0} onChange={e => onUpdateCategoryMetadata(cat.id, { goalAmount: parseFloat(e.target.value) || 0 })} />
                  </td>
                )}
                <td className={`px-6 py-4 text-right font-bold text-lg ${isIncome ? 'text-cyan-600' : 'text-blue-600'}`}>{formatCurrency(cat.added || 0, true)}</td>
                {!isIncome && <td className={`px-6 py-4 text-right font-bold text-lg ${cat.spent !== 0 ? 'text-red-500' : 'text-slate-400'}`}>{cat.spent === 0 ? '-' : formatCurrency(cat.spent || 0, true)}</td>}
                <td className="px-6 py-4 text-right">
                  {isEditLayoutMode && <button onClick={() => setDeleteConfirm({ id: cat.id, name: cat.name, type: 'cat' })} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className={`font-black ${isIncome ? 'bg-[#004d61]' : 'bg-[#0f172a]'} text-white`}>
            <tr>
              <td className="px-8 py-8 uppercase tracking-[0.2em] text-[11px]">Subtotal: {cls.name}</td>
              <td className="px-6 py-8 text-right text-2xl">{formatCurrency(catsToRender.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0), true)}</td>
              {isSavings && <td className="px-6 py-8 text-right text-2xl">{formatCurrency(catsToRender.reduce((sum, c) => sum + (c.goalAmount || 0), 0), true)}</td>}
              <td className="px-6 py-8 text-right text-xl">{formatCurrency(catsToRender.reduce((sum, c) => sum + (c.added || 0), 0), true)}</td>
              {!isIncome && <td className="px-6 py-8 text-right text-xl">{formatCurrency(catsToRender.reduce((sum, c) => sum + (c.spent || 0), 0), true)}</td>}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-40">
      <div className="flex flex-wrap gap-5 items-center justify-between border-b border-slate-200 pb-8">
        <div className="flex gap-4">
          {!isEditLayoutMode ? (
            <>
              <button onClick={() => setShowAddCat(true)} className="flex items-center gap-3 bg-[#0f172a] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
                <Plus size={18} /> Add Category
              </button>
              <button onClick={() => setShowAddClass(true)} className="flex items-center gap-3 bg-white text-slate-800 border-2 border-slate-100 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:border-slate-300 transition-all active:scale-95">
                <Layers size={18} /> Add Group
              </button>
              <button onClick={() => setIsEditLayoutMode(true)} className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all bg-white text-slate-500 border-2 border-slate-100 hover:border-slate-300">
                <Settings2 size={18} /> Edit Layout
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleSaveLayout} 
                disabled={isSaving} 
                className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${saveSuccess ? 'bg-green-600' : 'bg-blue-600'} text-white`}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {isSaving ? 'Deploying...' : saveSuccess ? 'Success!' : 'Save Layout'}
              </button>
              <button 
                onClick={() => setIsEditLayoutMode(false)} 
                className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all bg-white text-slate-400 border-2 border-slate-100"
              >
                <X size={18} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {incomeClass && renderClassificationTable(incomeClass, incomeCategories, 0, 0)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
        <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-6"><div className="p-5 bg-blue-50 text-blue-600 rounded-2xl"><Target size={32} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Budgeted Inflow</p><p className="text-3xl font-black text-slate-900">{formatCurrency(totalTargetIncome, true)}</p></div></div>
        <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-6"><div className="p-5 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={32} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Budgeted</p><p className="text-3xl font-black text-slate-900">{formatCurrency(totalBudgetedExpenses, true)}</p></div></div>
        <div className={`bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-6 border-l-8 ${diff < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}><div className={`p-5 rounded-2xl ${diff < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><TrendingDown size={32} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p><p className="text-3xl font-black text-slate-900">{formatCurrency(diff, true)}</p></div></div>
      </div>

      <div className="space-y-6">
        {activeClasses.map((cls, idx) => renderClassificationTable(cls, expenseCategories.filter(c => c.classificationId === cls.id), idx, activeClasses.length - 1))}
      </div>

      {/* Add Group Modal */}
      {showAddClass && (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-lg flex items-center justify-center z-[200] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-xl p-12 border border-slate-200 shadow-2xl relative">
            <button onClick={() => setShowAddClass(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
            <div className="flex items-center gap-5 mb-10">
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><Layers size={24} /></div>
              <h4 className="text-2xl font-black uppercase tracking-tight text-slate-800">New Structural Group</h4>
            </div>
            <form onSubmit={handleAddClass} className="space-y-8">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Group Name</label>
                <input type="text" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-inner" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} placeholder="e.g. Subscriptions" required autoFocus />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Display Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(opt => (
                    <button 
                      key={opt.value} 
                      type="button"
                      onClick={() => setNewClass({...newClass, color: opt.value})}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${newClass.color === opt.value ? 'ring-4 ring-blue-500/20 border-blue-500' : 'border-transparent'} ${opt.value}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-5 pt-4">
                <button type="button" onClick={() => setShowAddClass(false)} className="flex-1 px-4 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] bg-[#0f172a] text-white px-6 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl active:scale-95">Add Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCat && (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-lg flex items-center justify-center z-[200] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-xl p-12 border border-slate-200 shadow-2xl relative">
            <button onClick={() => setShowAddCat(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
            <div className="flex items-center gap-5 mb-10">
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><Plus size={24} /></div>
              <h4 className="text-2xl font-black uppercase tracking-tight text-slate-800">New Category</h4>
            </div>
            <form onSubmit={handleAddCat} className="space-y-8">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Category Designation</label>
                <input type="text" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-inner" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} placeholder="e.g. Travel Fund" required autoFocus />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Structural Group</label>
                <select className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-base outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all" value={newCat.className} onChange={e => setNewCat({...newCat, className: e.target.value})} required>
                  <option value="">Choose Classification Group...</option>
                  {(isEditLayoutMode ? draftClassifications : state.classifications).filter(c => !c.deleted && c.name.toLowerCase() !== 'transfers').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-5 pt-4">
                <button type="button" onClick={() => setShowAddCat(false)} className="flex-1 px-4 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] bg-[#0f172a] text-white px-6 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl active:scale-95">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-10 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black uppercase text-slate-800 tracking-tight">Delete {deleteConfirm.type === 'cat' ? 'Category' : 'Group'}?</h4>
              <p className="text-[11px] text-slate-400 uppercase font-bold leading-relaxed px-4">
                Are you sure you want to remove <span className="text-slate-800">"{deleteConfirm.name}"</span>?
                {deleteConfirm.type === 'class' ? " This will also archive all associated categories." : " Existing transactions will be preserved."}
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManager;
