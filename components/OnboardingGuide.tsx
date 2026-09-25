'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Building2,
  Users,
  Compass,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  HelpCircle,
  MapPin,
  Send,
  Check,
  Banknote,
  Upload
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Customer } from '@/lib/types';
import { getTodayDateString, addWeeksToDate } from '@/lib/dateUtils';
import { getLocalStartLocation, setLocalStartLocation } from '@/lib/storage';

export const SAMPLE_UK_CUSTOMERS: Omit<Customer, 'id'>[] = [
  {
    name: 'Sarah Jenkins',
    address: '14 High Street, Wilmslow, SK9 1AA',
    phone: '07700 900123',
    price: 18,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'unpaid',
    nextDueDate: getTodayDateString(),
    notes: 'Gate round the side is unlocked.',
  },
  {
    name: 'David & Claire Miller',
    address: '22 High Street, Wilmslow, SK9 1AA',
    phone: '07700 900456',
    price: 20,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'cash',
    nextDueDate: getTodayDateString(),
    notes: 'Knock on front door for cash payment.',
  },
  {
    name: 'Arthur Pendelton',
    address: '5 Church Lane, Wilmslow, SK9 1HH',
    phone: '07700 900789',
    price: 15,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'unpaid',
    nextDueDate: getTodayDateString(),
    notes: 'Watch out for friendly golden retriever.',
  },
  {
    name: 'Fiona Gallagher',
    address: '11 Church Lane, Wilmslow, SK9 1HH',
    phone: '07700 900321',
    price: 22,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'card',
    nextDueDate: getTodayDateString(),
    notes: 'Includes conservatory roof panels.',
  },
  {
    name: 'Marcus Bell',
    address: '8 Victoria Road, Alderley Edge, SK9 7QL',
    phone: '07700 900654',
    price: 25,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'unpaid',
    nextDueDate: addWeeksToDate(getTodayDateString(), 1),
    notes: 'Text 15 mins before arrival.',
  },
  {
    name: 'Eleanor Vance',
    address: '19 Victoria Road, Alderley Edge, SK9 7QL',
    phone: '07700 900987',
    price: 18,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'unpaid',
    nextDueDate: addWeeksToDate(getTodayDateString(), 1),
  },
  {
    name: 'Oliver Croft',
    address: '3 Mill Lane, Macclesfield, SK11 7UW',
    phone: '07700 900234',
    price: 16,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'cash',
    nextDueDate: addWeeksToDate(getTodayDateString(), 2),
  },
  {
    name: 'Sophie Turner',
    address: '15 Mill Lane, Macclesfield, SK11 7UW',
    phone: '07700 900567',
    price: 24,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'unpaid',
    nextDueDate: addWeeksToDate(getTodayDateString(), 2),
    notes: 'Side gate latch is stiff.',
  },
  {
    name: 'Graham Norton',
    address: '42 Park Avenue, Cheadle, SK8 2BX',
    phone: '07700 900890',
    price: 30,
    frequencyWeeks: 8,
    status: 'active',
    paymentStatus: 'unpaid',
    nextDueDate: addWeeksToDate(getTodayDateString(), 3),
    notes: 'Large 4-bed detached house with annex.',
  },
  {
    name: 'Patricia Hayes',
    address: '50 Park Avenue, Cheadle, SK8 2BX',
    phone: '07700 900112',
    price: 20,
    frequencyWeeks: 4,
    status: 'active',
    paymentStatus: 'card',
    nextDueDate: addWeeksToDate(getTodayDateString(), 3),
  },
];

interface OnboardingGuideProps {
  customers: Customer[];
  businessName: string;
  onOpenAddCustomer: () => void;
  onOpenImport: () => void;
  onOpenAreaPlanner: () => void;
  onOpenProfileModal: () => void;
  onLoadSampleData: () => void;
  onDismiss: () => void;
}

export function OnboardingGuide({
  customers,
  businessName,
  onOpenAddCustomer,
  onOpenImport,
  onOpenAreaPlanner,
  onOpenProfileModal,
  onLoadSampleData,
  onDismiss,
}: OnboardingGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // Check step completion dynamically
  const savedBase = typeof window !== 'undefined' ? getLocalStartLocation() : null;
  const isStep1Done = Boolean(businessName && businessName !== 'ClearView') || Boolean(savedBase?.address);
  const isStep2Done = customers.length > 0;
  
  // Step 3 is done if proximity planner was run or customers are scheduled across multiple dates
  const isStep3Done =
    (typeof window !== 'undefined' && localStorage.getItem('clearview_onboarding_planner_run') === 'true') ||
    (customers.length >= 3 && new Set(customers.map((c) => c.nextDueDate)).size > 1);

  // Step 4 is done if at least 1 customer has been marked complete or workflow tour was viewed
  const isStep4Done =
    (typeof window !== 'undefined' && localStorage.getItem('clearview_onboarding_workflow_seen') === 'true') ||
    customers.some((c) => c.lastCleanedDate);

  const steps = [
    {
      id: 1,
      title: 'Business & Depot Base',
      subtitle: isStep1Done ? `${businessName || 'Set'} • ${savedBase?.address || 'Base saved'}` : 'Set business name & starting postcode',
      isComplete: isStep1Done,
      action: onOpenProfileModal,
      actionLabel: isStep1Done ? 'Edit' : 'Set Up',
      icon: Building2,
    },
    {
      id: 2,
      title: 'Add or Import Customers',
      subtitle: isStep2Done ? `${customers.length} customer${customers.length !== 1 ? 's' : ''} added` : 'Add first cleans or import CSV',
      isComplete: isStep2Done,
      action: onOpenAddCustomer,
      actionLabel: isStep2Done ? 'Add More' : 'Add Customers',
      icon: Users,
    },
    {
      id: 3,
      title: 'Auto-Plan Daily Areas',
      subtitle: isStep3Done ? 'Rounds clustered by neighborhood' : 'Group houses into Day 1, Day 2, Day 3',
      isComplete: isStep3Done,
      action: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('clearview_onboarding_planner_run', 'true');
        }
        onOpenAreaPlanner();
      },
      actionLabel: 'Plan Areas',
      icon: Compass,
    },
    {
      id: 4,
      title: 'Daily 1-Tap Workflow',
      subtitle: isStep4Done ? 'Daily check-offs mastered' : 'Learn On My Way SMS & 1-tap checkoffs',
      isComplete: isStep4Done,
      action: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('clearview_onboarding_workflow_seen', 'true');
        }
        setShowWorkflowModal(true);
      },
      actionLabel: 'Quick Tour',
      icon: CheckCheck,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-all duration-200">
        {/* Header with Progress */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  Getting Started Setup
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                  {completedCount}/{steps.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {completedCount === steps.length
                  ? '🎉 All set! Your round is ready for the day.'
                  : 'Complete these quick steps to get fully set up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand setup guide' : 'Collapse setup guide'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Hide setup guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Items (Visible when not collapsed) */}
        {!isCollapsed && (
          <div className="mt-3.5 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                    step.isComplete
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {step.isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {step.id}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-bold truncate ${
                          step.isComplete
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={step.action}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      step.isComplete
                        ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                    }`}
                  >
                    {step.actionLabel}
                  </button>
                </div>
              );
            })}

            {/* Quick 1-Tap Sample Data Option (For brand new cleaners testing the app) */}
            {customers.length === 0 && (
              <div className="mt-2.5 p-3 rounded-xl bg-linear-to-r from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-sky-100 dark:border-indigo-900/40 flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    ⚡ Want to test drive the app immediately?
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                    Load 10 sample houses with streets, prices & postcodes in 1 tap
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLoadSampleData();
                    confetti({ particleCount: 50, spread: 60 });
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  Load 10 Samples
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive 15-Second Daily Workflow Tour Modal */}
      {showWorkflowModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  The Daily 3-Tap Routine
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkflowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              ClearView is designed to save you hours of paperwork while you are on the road. Here is the 3-step routine window cleaners use at every house:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">1. "On My Way" SMS</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap the paper plane button to text the customer you're heading over so they unlock side gates or put dogs inside.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">2. 1-Tap "Mark Done"</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Once the windows are clean, check off the house. The app celebrates with confetti and automatically schedules their next clean 4 weeks ahead.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">3. Cash or Card Ledger</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap <strong>Cash</strong> or <strong>Card</strong> if they pay right away. If unpaid, they automatically appear on your <strong>Unpaid</strong> tab with 1-tap payment reminders!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowWorkflowModal(false);
                confetti({ particleCount: 40, spread: 60 });
              }}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Got it, let's go!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
