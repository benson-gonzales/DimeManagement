
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  orderBy,
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { AppState, Transaction, Category, InvestmentSnapshot, Classification, Account, AccountType } from '../types';
import { INITIAL_DATA } from '../constants';
import { roundToTwo } from '../utils';

export const useFinance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>({
    accounts: [],
    classifications: [],
    categories: [],
    transactions: [],
    investmentSnapshots: [],
    estimatedMonthlyIncome: 0,
  });

  const getUserCollection = useCallback((name: string) => {
    if (!user || !user.uid) throw new Error("Security Violation: User not authenticated");
    return collection(db, 'users', user.uid, name);
  }, [user]);

  const getUserDoc = useCallback((collectionName: string, id: string) => {
    if (!user || !user.uid) throw new Error("Security Violation: User not authenticated");
    return doc(db, 'users', user.uid, collectionName, id);
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) {
      setState({
        accounts: [],
        classifications: [],
        categories: [],
        transactions: [],
        investmentSnapshots: [],
        estimatedMonthlyIncome: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribers = [
      onSnapshot(getUserCollection('accounts'), (snap) => {
        const accounts = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Account))
          .sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
        setState(prev => ({ ...prev, accounts }));
      }),
      onSnapshot(getUserCollection('categories'), (snap) => {
        const categories = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Category))
          .sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
        setState(prev => ({ ...prev, categories }));
      }),
      onSnapshot(query(getUserCollection('transactions'), orderBy('date', 'desc')), (snap) => {
        const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        setState(prev => ({ ...prev, transactions }));
      }),
      onSnapshot(getUserCollection('classifications'), (snap) => {
        const classifications = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Classification))
          .sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
        setState(prev => ({ ...prev, classifications }));
      }),
      onSnapshot(getUserCollection('investmentSnapshots'), (snap) => {
        const investmentSnapshots = snap.docs.map(d => ({ ...d.data() } as InvestmentSnapshot));
        setState(prev => ({ ...prev, investmentSnapshots }));
      }),
      onSnapshot(getUserDoc('settings', 'general'), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setState(prev => ({ 
            ...prev, 
            estimatedMonthlyIncome: data.estimatedMonthlyIncome || 0,
          }));
        }
      })
    ];

    const checkReady = async () => {
      await new Promise(r => setTimeout(r, 600));
      setLoading(false);
    };
    checkReady();

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, getUserCollection, getUserDoc]);

  const addTransaction = useCallback(async (txData: Omit<Transaction, 'id'>) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const txRef = doc(getUserCollection('transactions'));
      const roundedAmount = roundToTwo(txData.amount);
      
      batch.set(txRef, { ...txData, amount: roundedAmount, cleared: false });

      if (txData.categoryId && txData.categoryId !== 'none') {
        const catRef = getUserDoc('categories', txData.categoryId);
        const catSnap = await getDoc(catRef);
        if (catSnap.exists()) {
          batch.update(catRef, { balance: roundToTwo((catSnap.data().balance || 0) + roundedAmount) });
        }
      }

      if (txData.accountId && !txData.accountId.startsWith('internal') && txData.accountId !== 'none') {
        const accRef = getUserDoc('accounts', txData.accountId);
        const accSnap = await getDoc(accRef);
        if (accSnap.exists()) {
          batch.update(accRef, { balance: roundToTwo((accSnap.data().balance || 0) + roundedAmount) });
        }
      }
      await batch.commit();
    } catch (e) { console.error("Write Error: Transaction failed", e); }
  }, [user, getUserCollection, getUserDoc]);

  const executeTransfer = useCallback(async (params: any) => {
    if (!user) return;
    let { type, date, amount, description, fromAccountId, toAccountId, fromCategoryId, toCategoryId } = params;
    const roundedAmount = roundToTwo(amount);
    
    if (!description) {
      if (fromCategoryId && toCategoryId) {
        const fromCatName = state.categories.find(c => c.id === fromCategoryId)?.name || 'Category';
        const toCatName = state.categories.find(c => c.id === toCategoryId)?.name || 'Category';
        description = `Transfer from ${fromCatName} to ${toCatName}`;
      } else if (fromAccountId && toAccountId) {
        const fromAccName = state.accounts.find(a => a.id === fromAccountId)?.name || 'Account';
        const toAccName = state.accounts.find(a => a.id === toAccountId)?.name || 'Account';
        description = `Transfer from ${fromAccName} to ${toAccName}`;
      }
    }

    try {
      const batch = writeBatch(db);
      const txRef = doc(getUserCollection('transactions'));

      if (fromAccountId && fromAccountId !== 'none' && !fromAccountId.startsWith('internal')) {
        const fromAccRef = getUserDoc('accounts', fromAccountId);
        const snap = await getDoc(fromAccRef);
        if (snap.exists()) batch.update(fromAccRef, { balance: roundToTwo((snap.data().balance || 0) - roundedAmount) });
      }
      if (toAccountId && toAccountId !== 'none' && !toAccountId.startsWith('internal')) {
        const toAccRef = getUserDoc('accounts', toAccountId);
        const snap = await getDoc(toAccRef);
        if (snap.exists()) batch.update(toAccRef, { balance: roundToTwo((snap.data().balance || 0) + roundedAmount) });
      }

      if (fromCategoryId && fromCategoryId !== 'none') {
        const fromCatRef = getUserDoc('categories', fromCategoryId);
        const snap = await getDoc(fromCatRef);
        if (snap.exists()) batch.update(fromCatRef, { balance: roundToTwo((snap.data().balance || 0) - roundedAmount) });
      }
      if (toCategoryId && toCategoryId !== 'none') {
        const toCatRef = getUserDoc('categories', toCategoryId);
        const snap = await getDoc(toCatRef);
        if (snap.exists()) batch.update(toCatRef, { balance: roundToTwo((snap.data().balance || 0) + roundedAmount) });
      }

      batch.set(txRef, {
        date, amount: roundedAmount, description,
        accountId: fromAccountId || 'internal',
        fromAccountId: fromAccountId || null, toAccountId: toAccountId || null,
        fromCategoryId: fromCategoryId || null, toCategoryId: toCategoryId || null,
        type, cleared: false
      });

      await batch.commit();
    } catch (e) { console.error("Write Error: Transfer failed", e); }
  }, [user, getUserCollection, getUserDoc, state.categories, state.accounts]);

  const deleteTransaction = useCallback(async (txId: string) => {
    if (!user) return;
    try {
      const txRef = getUserDoc('transactions', txId);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) return;
      const tx = txSnap.data() as Transaction;
      const batch = writeBatch(db);
      const amount = tx.amount;

      if (tx.fromAccountId) {
        const ref = getUserDoc('accounts', tx.fromAccountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + amount) });
      }
      if (tx.toAccountId) {
        const ref = getUserDoc('accounts', tx.toAccountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - amount) });
      }
      if (tx.fromCategoryId) {
        const ref = getUserDoc('categories', tx.fromCategoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + amount) });
      }
      if (tx.toCategoryId) {
        const ref = getUserDoc('categories', tx.toCategoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - amount) });
      }

      if (!tx.fromAccountId && !tx.toAccountId && tx.accountId && tx.accountId !== 'internal') {
        const ref = getUserDoc('accounts', tx.accountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - amount) });
      }
      if (!tx.fromCategoryId && !tx.toCategoryId && tx.categoryId && tx.categoryId !== 'none') {
        const ref = getUserDoc('categories', tx.categoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - amount) });
      }

      batch.delete(txRef);
      await batch.commit();
    } catch (e) { console.error("Write Error: Delete failed", e); }
  }, [user, getUserDoc]);

  const updateTransaction = useCallback(async (txId: string, updates: Partial<Transaction>) => {
    if (!user) return;
    try {
      const txRef = getUserDoc('transactions', txId);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) return;
      const oldTx = txSnap.data() as Transaction;
      const batch = writeBatch(db);

      // 1. Revert old transaction impact
      const oldAmount = oldTx.amount;
      if (oldTx.fromAccountId) {
        const ref = getUserDoc('accounts', oldTx.fromAccountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + oldAmount) });
      }
      if (oldTx.toAccountId) {
        const ref = getUserDoc('accounts', oldTx.toAccountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - oldAmount) });
      }
      if (oldTx.fromCategoryId) {
        const ref = getUserDoc('categories', oldTx.fromCategoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + oldAmount) });
      }
      if (oldTx.toCategoryId) {
        const ref = getUserDoc('categories', oldTx.toCategoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - oldAmount) });
      }
      if (!oldTx.fromAccountId && !oldTx.toAccountId && oldTx.accountId && oldTx.accountId !== 'internal') {
        const ref = getUserDoc('accounts', oldTx.accountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - oldAmount) });
      }
      if (!oldTx.fromCategoryId && !oldTx.toCategoryId && oldTx.categoryId && oldTx.categoryId !== 'none') {
        const ref = getUserDoc('categories', oldTx.categoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - oldAmount) });
      }

      // 2. Apply new transaction impact
      const newTx = { ...oldTx, ...updates };
      const newAmount = roundToTwo(newTx.amount);
      
      if (newTx.fromAccountId) {
        const ref = getUserDoc('accounts', newTx.fromAccountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - newAmount) });
      }
      if (newTx.toAccountId) {
        const ref = getUserDoc('accounts', newTx.toAccountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + newAmount) });
      }
      if (newTx.fromCategoryId) {
        const ref = getUserDoc('categories', newTx.fromCategoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) - newAmount) });
      }
      if (newTx.toCategoryId) {
        const ref = getUserDoc('categories', newTx.toCategoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + newAmount) });
      }
      if (!newTx.fromAccountId && !newTx.toAccountId && newTx.accountId && newTx.accountId !== 'internal') {
        const ref = getUserDoc('accounts', newTx.accountId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + newAmount) });
      }
      if (!newTx.fromCategoryId && !newTx.toCategoryId && newTx.categoryId && newTx.categoryId !== 'none') {
        const ref = getUserDoc('categories', newTx.categoryId);
        const s = await getDoc(ref);
        if (s.exists()) batch.update(ref, { balance: roundToTwo((s.data().balance || 0) + newAmount) });
      }

      // 3. Update transaction doc
      batch.update(txRef, { ...updates, amount: newAmount });
      await batch.commit();
    } catch (e) { console.error("Write Error: Update failed", e); }
  }, [user, getUserDoc]);

  const undoLastTransaction = useCallback(async () => {
    if (!user || state.transactions.length === 0) return;
    await deleteTransaction(state.transactions[0].id);
  }, [user, state.transactions, deleteTransaction]);

  const toggleCleared = useCallback(async (txId: string) => {
    if (!user) return;
    const txRef = getUserDoc('transactions', txId);
    const txSnap = await getDoc(txRef);
    if (txSnap.exists()) {
      await updateDoc(txRef, { cleared: !txSnap.data().cleared });
    }
  }, [user, getUserDoc]);

  const addCategory = useCallback(async (name: string, classificationName: string, color: string) => {
    if (!user) return;
    let classId = state.classifications.find(c => c.name === classificationName)?.id;
    if (!classId) {
      const classRef = doc(getUserCollection('classifications'));
      classId = classRef.id;
      await setDoc(classRef, { name: classificationName, color: color || 'bg-slate-100', orderIndex: state.classifications.length });
    }
    const catRef = doc(getUserCollection('categories'));
    await setDoc(catRef, { name, classificationId: classId, balance: 0, monthlyBudget: 0, goalAmount: 0, orderIndex: state.categories.length });
  }, [user, state.classifications, state.categories, getUserCollection]);

  const addClassification = useCallback(async (name: string, color: string) => {
    if (!user) return;
    const classRef = doc(getUserCollection('classifications'));
    await setDoc(classRef, { name, color: color || 'bg-slate-100', orderIndex: state.classifications.length });
  }, [user, state.classifications, getUserCollection]);

  const deleteCategory = useCallback(async (catId: string) => {
    if (!user) return;
    const hasTransactions = state.transactions.some(t => t.categoryId === catId || t.fromCategoryId === catId || t.toCategoryId === catId);
    if (hasTransactions) {
      await updateDoc(getUserDoc('categories', catId), { deleted: true });
    } else {
      await deleteDoc(getUserDoc('categories', catId));
    }
  }, [user, state.transactions, getUserDoc]);

  const deleteClassification = useCallback(async (classId: string) => {
    if (!user) return;
    const hasCategories = state.categories.some(c => c.classificationId === classId && !c.deleted);
    if (hasCategories) {
      await updateDoc(getUserDoc('classifications', classId), { deleted: true });
    } else {
      await deleteDoc(getUserDoc('classifications', classId));
    }
  }, [user, state.categories, getUserDoc]);

  const updateBudget = useCallback(async (catId: string, amount: number) => {
    if (!user) return;
    await updateDoc(getUserDoc('categories', catId), { monthlyBudget: roundToTwo(amount) });
  }, [user, getUserDoc]);

  const setEstIncome = useCallback(async (amount: number) => {
    if (!user) return;
    await setDoc(getUserDoc('settings', 'general'), { estimatedMonthlyIncome: roundToTwo(amount) }, { merge: true });
  }, [user, getUserDoc]);

  const addInvestmentSnapshot = useCallback(async (snapshot: InvestmentSnapshot) => {
    if (!user) return;
    await setDoc(getUserDoc('investmentSnapshots', `${snapshot.monthKey}_${snapshot.accountId}`), {
      ...snapshot,
      balance: roundToTwo(snapshot.balance)
    });
  }, [user, getUserDoc]);

  const setCategoryBalance = useCallback(async (catId: string, balance: number) => {
    if (!user) return;
    await updateDoc(getUserDoc('categories', catId), { balance: roundToTwo(balance) });
  }, [user, getUserDoc]);

  const setAccountBalance = useCallback(async (accId: string, balance: number) => {
    if (!user) return;
    await updateDoc(getUserDoc('accounts', accId), { balance: roundToTwo(balance) });
  }, [user, getUserDoc]);

  const addAccount = useCallback(async (name: string, type: AccountType, balance: number = 0) => {
    if (!user) return;
    const accRef = doc(getUserCollection('accounts'));
    await setDoc(accRef, { name, type, balance: roundToTwo(balance), archived: false, orderIndex: state.accounts.length });
  }, [user, state.accounts, getUserCollection]);

  const updateAccountMetadata = useCallback(async (id: string, updates: Partial<Account>) => {
    if (!user) return;
    const data = { ...updates };
    if (updates.balance !== undefined) {
      data.balance = roundToTwo(updates.balance);
    }
    if (updates.archived === true && !updates.archivedDate) {
      data.archivedDate = new Date().toISOString().split('T')[0];
    }
    await updateDoc(getUserDoc('accounts', id), data);
  }, [user, getUserDoc]);

  const initializeDefaultData = useCallback(async () => {
    if (!user) return;
    const categoriesSnapshot = await getDocs(getUserCollection('categories'));
    if (!categoriesSnapshot.empty) return;

    try {
      const batch = writeBatch(db);
      const classMap: Record<string, string> = {};
      INITIAL_DATA.classifications.forEach((cls, idx) => {
        const ref = doc(getUserCollection('classifications'));
        batch.set(ref, { name: cls.name, color: cls.color, orderIndex: idx });
        classMap[cls.id] = ref.id;
      });
      const countsByClass: Record<string, number> = {};
      INITIAL_DATA.categories.forEach((cat) => {
        const ref = doc(getUserCollection('categories'));
        const newClassId = classMap[cat.classificationId];
        if (newClassId) {
          countsByClass[newClassId] = (countsByClass[newClassId] || 0) + 1;
          batch.set(ref, { 
            name: cat.name, 
            classificationId: newClassId, 
            balance: 0, 
            monthlyBudget: roundToTwo(cat.monthlyBudget), 
            orderIndex: countsByClass[newClassId] - 1 
          });
        }
      });
      const savAccRef = doc(getUserCollection('accounts'));
      batch.set(savAccRef, { name: 'Savings', type: 'Savings', balance: 0, archived: false, orderIndex: 0 });
      await batch.commit();
    } catch (err) { console.error(err); }
  }, [user, getUserCollection]);

  const loadState = useCallback(async (newState: AppState) => {
    if (!user) return;
    const batch = writeBatch(db);
    newState.classifications.forEach(c => batch.set(getUserDoc('classifications', c.id), c));
    newState.categories.forEach(c => batch.set(getUserDoc('categories', c.id), { ...c, balance: roundToTwo(c.balance), monthlyBudget: roundToTwo(c.monthlyBudget) }));
    newState.accounts.forEach(a => batch.set(getUserDoc('accounts', a.id), { ...a, balance: roundToTwo(a.balance) }));
    newState.transactions.forEach(t => batch.set(getUserDoc('transactions', t.id), { ...t, amount: roundToTwo(t.amount) }));
    newState.investmentSnapshots.forEach(s => batch.set(getUserDoc('investmentSnapshots', `${s.monthKey}_${s.accountId}`), { ...s, balance: roundToTwo(s.balance) }));
    batch.set(getUserDoc('settings', 'general'), { estimatedMonthlyIncome: roundToTwo(newState.estimatedMonthlyIncome) }, { merge: true });
    await batch.commit();
  }, [user, getUserDoc]);

  const persistLayout = useCallback(async (classifications: Classification[], categories: Category[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    classifications.forEach((cls, idx) => {
      const ref = getUserDoc('classifications', cls.id);
      batch.set(ref, { name: cls.name, color: cls.color, orderIndex: idx, deleted: cls.deleted || false }, { merge: true });
    });
    categories.forEach((cat, idx) => {
      const ref = getUserDoc('categories', cat.id);
      batch.set(ref, { 
        name: cat.name, 
        classificationId: cat.classificationId, 
        orderIndex: idx, 
        deleted: cat.deleted || false,
        monthlyBudget: cat.monthlyBudget || 0,
        goalAmount: cat.goalAmount || 0
      }, { merge: true });
    });
    await batch.commit();
  }, [user, getUserDoc]);

  const persistAccountLayout = useCallback(async (accounts: Account[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    accounts.forEach((acc, idx) => {
      batch.update(getUserDoc('accounts', acc.id), { 
        name: acc.name, 
        archived: acc.archived || false, 
        orderIndex: idx 
      });
    });
    await batch.commit();
  }, [user, getUserDoc]);

  return {
    state,
    loading,
    addTransaction,
    executeTransfer,
    addCategory,
    addClassification,
    deleteCategory,
    deleteClassification,
    deleteTransaction,
    updateTransaction,
    undoLastTransaction,
    toggleCleared,
    updateBudget,
    setEstIncome,
    addInvestmentSnapshot,
    setCategoryBalance,
    setAccountBalance,
    addAccount,
    updateAccountMetadata,
    initializeDefaultData,
    loadState,
    persistLayout,
    persistAccountLayout,
    updateCategoryMetadata: async (id: string, u: any) => user && updateDoc(getUserDoc('categories', id), u),
    updateClassificationMetadata: async (id: string, u: any) => user && updateDoc(getUserDoc('classifications', id), u),
  };
};
