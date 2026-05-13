
import React, { useEffect, useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
  setActiveTab: (tab: string) => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, onComplete, setActiveTab }) => {
  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-left space-y-2">
          <h3 className="text-lg font-black uppercase text-blue-400">Welcome to Dime Management!</h3>
          <p className="text-sm">Let's take a quick tour to set up your financial dashboard and master your money flow.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#tour-accounts-nav',
      content: "Start here. Add your Checking, Savings, and Credit Cards to verify your current balances.",
    },
    {
      target: '#tour-budget-nav',
      content: "This is your home base. Define your 'Envelopes' (Categories) for Rent, Groceries, and Savings.",
    },
    {
      target: '#tour-edit-layout',
      content: "Make it yours! Use these controls to Add, Delete, or Drag & Drop categories to match your life.",
    },
    {
      target: '#tour-transaction-form',
      content: "Log your income and daily expenses here. Select an Account and a Category to keep everything in sync.",
    },
    {
      target: '#tour-transfers-nav',
      content: "Need to move money? Use this tab for Account Transfers or Budget Moves (Reallocating money between envelopes).",
    },
    {
      target: '#tour-category-ledgers-nav',
      content: "Dive deep. Click here to see the history of every dollar flowing in and out of your specific categories.",
    },
    {
      target: '#tour-full-summary-nav',
      content: "See the big picture. View your Resources vs. Expenses breakdown for the entire year.",
    },
    {
      target: '#tour-net-worth-nav',
      content: "Track your growth. Watch your Assets vs. Liabilities evolve over time.",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, step, type, index } = data;
    
    // Automatically switch tabs for relevant steps
    if (type === 'step:after') {
      if (index === 2) { // After "Budget Setup" sidebar link
        setActiveTab('budget');
      } else if (index === 3) { // After "Customize Layout" on Budget page
        setActiveTab('dashboard');
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          backgroundColor: '#1e293b', // Slate 800
          arrowColor: '#1e293b',
          textColor: '#f1f5f9',
          primaryColor: '#3b82f6', // Blue 500
          zIndex: 10000,
        },
        buttonNext: {
          borderRadius: '12px',
          fontWeight: 900,
          textTransform: 'uppercase',
          fontSize: '10px',
          letterSpacing: '0.1em',
          padding: '12px 24px',
        },
        buttonBack: {
          fontWeight: 900,
          textTransform: 'uppercase',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#94a3b8',
        },
        buttonSkip: {
          fontWeight: 900,
          textTransform: 'uppercase',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#ef4444',
        },
        tooltipContainer: {
          borderRadius: '24px',
          padding: '10px',
        }
      }}
    />
  );
};

export default OnboardingTour;
