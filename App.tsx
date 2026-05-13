
import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Savings from './components/Savings';
import Ledgers from './components/Ledgers';
import AccountLedgers from './components/AccountLedgers';
import TransfersPage from './components/TransfersPage';
import BudgetManager from './components/BudgetManager';
import Summary from './components/Summary';
import NetWorth from './components/NetWorth';
import Login from './components/Login';
import OnboardingWizard from './components/OnboardingWizard';
import { useFinance } from './hooks/useFinance';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitializingDefaults, setIsInitializingDefaults] = useState(false);
  
  const { 
    state, 
    loading: financeLoading,
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
    updateCategoryMetadata,
    initializeDefaultData,
    persistLayout,
    persistAccountLayout,
  } = useFinance();

  const needsDefaultData = useMemo(() => {
    if (financeLoading) return false;
    return state.classifications.filter(c => !c.deleted).length === 0;
  }, [financeLoading, state.classifications]);

  const needsOnboarding = useMemo(() => {
    if (financeLoading) return false;
    const hasFramework = state.classifications.filter(c => !c.deleted).length > 0;
    const hasNoAccounts = state.accounts.length === 0; 
    return hasFramework && hasNoAccounts;
  }, [financeLoading, state.classifications, state.accounts]);

  useEffect(() => {
    if (user && needsDefaultData && !isInitializingDefaults && !financeLoading) {
      const runInit = async () => {
        setIsInitializingDefaults(true);
        try {
          await initializeDefaultData();
        } catch (e) {
          console.error("Initialization failed", e);
        } finally {
          setIsInitializingDefaults(false);
        }
      };
      runInit();
    }
  }, [user, needsDefaultData, isInitializingDefaults, initializeDefaultData, financeLoading]);

  const handleOnboardingComplete = async (accounts: any[]) => {
    for (const acc of accounts) {
      await addAccount(acc.name, acc.type, acc.balance);
    }
  };

  if (authLoading || (user && (financeLoading || isInitializingDefaults))) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
          {isInitializingDefaults ? "Initializing your financial framework..." : "Synchronizing Precision Data..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            state={state} 
            addTransaction={addTransaction} 
            undoLastTransaction={undoLastTransaction}
            executeTransfer={executeTransfer} 
            setCategoryBalance={setCategoryBalance}
            setAccountBalance={setAccountBalance}
          />
        );
      case 'savings':
        return (
          <Savings 
            state={state}
            addTransaction={addTransaction}
            executeTransfer={executeTransfer}
            setCategoryBalance={setCategoryBalance}
            setAccountBalance={setAccountBalance}
          />
        );
      case 'acc-ledgers':
        return (
          <AccountLedgers 
            state={state} 
            onToggleCleared={toggleCleared} 
            onDeleteTransaction={deleteTransaction}
            onUpdateTransaction={updateTransaction}
            onAddAccount={addAccount}
            onUpdateAccount={updateAccountMetadata}
            persistAccountLayout={persistAccountLayout}
          />
        );
      case 'transfers':
        return (
          <TransfersPage 
            state={state}
            onAddTransaction={addTransaction}
            onExecuteTransfer={executeTransfer}
            onDeleteTransaction={deleteTransaction}
          />
        );
      case 'ledgers':
        return <Ledgers state={state} />;
      case 'budget':
        return (
          <BudgetManager 
            state={state} 
            onUpdateBudget={updateBudget} 
            onUpdateCategoryMetadata={updateCategoryMetadata}
            onUpdateEstIncome={setEstIncome} 
            onAddCategory={addCategory}
            onAddClassification={addClassification}
            onDeleteCategory={deleteCategory}
            onDeleteClassification={deleteClassification}
            persistLayout={persistLayout}
          />
        );
      case 'summary':
        return <Summary state={state} />;
      case 'networth':
        return (
          <NetWorth 
            state={state} 
            onAddSnapshot={addInvestmentSnapshot} 
            onAddAccount={addAccount}
          />
        );
      default:
        return (
          <Dashboard 
            state={state} 
            addTransaction={addTransaction} 
            undoLastTransaction={undoLastTransaction} 
            executeTransfer={executeTransfer} 
            setCategoryBalance={setCategoryBalance}
            setAccountBalance={setAccountBalance}
          />
        );
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
