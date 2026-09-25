'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Users, Plus, RefreshCw, Compass, MapPin, X } from 'lucide-react';
import { Customer, AppStats, FrequencyWeeks, ActiveRouteState, NavApp, TravelMode, PaymentStatus } from '@/lib/types';
import {
  getTodayDateString,
  getDaysDifference,
  addWeeksToDate,
  getCurrentWeekDates,
  getMonthMatrix,
  isCustomerScheduledOnDate,
} from '@/lib/dateUtils';
import {
  getLocalCustomers,
  setLocalCustomers,
  getLocalUser,
  setLocalUser,
  CleanerUser,
  getLocalActiveRoute,
  setLocalActiveRoute,
  getLocalNavApp,
} from '@/lib/storage';
import { Header } from '@/components/Header';
import { FilterBar, TabType, PaymentFilter } from '@/components/FilterBar';
import { CustomerCard } from '@/components/CustomerCard';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { RouteRunnerBar } from '@/components/RouteRunnerBar';
import { RouteMapModal } from '@/components/RouteMapModal';
import { OnMyWayModal } from '@/components/OnMyWayModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { SyncModal } from '@/components/SyncModal';
import { ExportModal } from '@/components/ExportModal';
import { BottomNav, MainNavTab } from '@/components/BottomNav';
import { MonthView } from '@/components/MonthView';
import { UnpaidView } from '@/components/UnpaidView';
import { CustomerDirectoryView } from '@/components/CustomerDirectoryView';
import { MoreSettingsView } from '@/components/MoreSettingsView';
import { SmartAreaPlannerModal } from '@/components/SmartAreaPlannerModal';
import { OnboardingGuide, SAMPLE_UK_CUSTOMERS } from '@/components/OnboardingGuide';
import { BusinessProfileModal } from '@/components/BusinessProfileModal';

export default function HomePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<CleanerUser | null>(null);
  const [businessName, setBusinessName] = useState('ClearView');
  const [isLoaded, setIsLoaded] = useState(false);
  const [mainTab, setMainTab] = useState<MainNavTab>('today');
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Route Runner State
  const [activeRoute, setActiveRoute] = useState<ActiveRouteState | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeModalScope, setRouteModalScope] = useState<'today' | 'week' | 'all' | 'custom'>('today');
  const [customRouteCustomers, setCustomRouteCustomers] = useState<Customer[] | null>(null);
  const [customRouteDateLabel, setCustomRouteDateLabel] = useState<string | null>(null);
  const [isAreaPlannerOpen, setIsAreaPlannerOpen] = useState(false);
  const [navApp, setNavApp] = useState<NavApp>('google');

  // Onboarding & Setup Guide State
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Modals
  const [onMyWayCustomer, setOnMyWayCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Initialize local data immediately
  useEffect(() => {
    const localCust = getLocalCustomers();
    const localUsr = getLocalUser();
    const localRoute = getLocalActiveRoute();
    const localNav = getLocalNavApp();
    const dismissed = localStorage.getItem('clearview_onboarding_dismissed');

    if (dismissed === 'true') {
      setIsOnboardingDismissed(true);
    }

    setCustomers(localCust);
    if (localUsr) {
      setCurrentUser(localUsr);
      if (localUsr.businessName) setBusinessName(localUsr.businessName);
    }
    if (localRoute && localRoute.isActive) {
      setActiveRoute(localRoute);
    }
    setNavApp(localNav);
    setIsLoaded(true);

    // Auto-sync with cloud on initial app load if logged in
    if (localUsr?.identifier && localUsr?.token) {
      fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          identifier: localUsr.identifier,
          pin: localUsr.token,
          customers: localCust,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.customers) && data.customers.length > 0) {
            // If device local had 0 or server has customers, adopt them immediately
            if (localCust.length === 0 || data.customers.length >= localCust.length) {
              setCustomers(data.customers);
              setLocalCustomers(data.customers);
            }
          }
        })
        .catch((err) => console.warn('Background cloud sync failed:', err));
    }
  }, []);

  // Save to localStorage whenever customers change & auto-sync to cloud if logged in
  const updateCustomers = useCallback((newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    setLocalCustomers(newCustomers);

    const localUsr = getLocalUser();
    if (localUsr?.identifier && localUsr?.token) {
      fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          identifier: localUsr.identifier,
          pin: localUsr.token,
          businessName: localUsr.businessName,
          cleanerName: localUsr.cleanerName,
          customers: newCustomers,
        }),
      }).catch((err) => console.warn('Auto cloud sync error:', err));
    }
  }, []);

  const todayStr = getTodayDateString();

  // Mark / Toggle Customer Clean Completed
  const handleMarkComplete = async (customer: Customer) => {
    setCompletingId(customer.id);

    try {
      const isDoneToday = customer.lastCleanedDate === todayStr;

      if (isDoneToday) {
        // Toggle OFF (Uncheck)
        const updatedList = customers.map((c) =>
          c.id === customer.id
            ? { ...c, lastCleanedDate: undefined, nextDueDate: todayStr }
            : c
        );
        updateCustomers(updatedList);
      } else {
        // Toggle ON (Check off with confetti)
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#0284c7', '#38bdf8', '#10b981', '#34d399', '#f59e0b'],
        });

        const nextDue = addWeeksToDate(todayStr, customer.frequencyWeeks || 4);
        const updatedList = customers.map((c) =>
          c.id === customer.id
            ? { ...c, lastCleanedDate: todayStr, nextDueDate: nextDue }
            : c
        );

        updateCustomers(updatedList);

        // Auto-advance active route if running
        if (activeRoute?.isActive) {
          const nextUnfinishedIdx = activeRoute.stopIds.findIndex((id) => {
            if (id === customer.id) return false;
            const c = updatedList.find((cust) => cust.id === id);
            return c && c.lastCleanedDate !== todayStr;
          });

          if (nextUnfinishedIdx !== -1) {
            const updatedRoute = { ...activeRoute, currentStopIndex: nextUnfinishedIdx };
            setActiveRoute(updatedRoute);
            setLocalActiveRoute(updatedRoute);
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle clean status:', err);
    } finally {
      setCompletingId(null);
    }
  };

  // Add customer callback
  const handleAddCustomer = (newCustomer: Customer) => {
    const updated = [newCustomer, ...customers];
    updateCustomers(updated);
  };

  // Update customer callback
  const handleUpdateCustomer = (id: string, updates: Partial<Customer>) => {
    const updated = customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
    updateCustomers(updated);
  };

  // Update customer payment status callback (cash, card, unpaid)
  const handleUpdatePaymentStatus = useCallback(
    (customer: Customer, newStatus: PaymentStatus) => {
      const updated = customers.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              paymentStatus: newStatus,
              paymentDate: newStatus !== 'unpaid' ? todayStr : undefined,
            }
          : c
      );
      updateCustomers(updated);
    },
    [customers, todayStr, updateCustomers]
  );

  // Delete customer callback
  const handleDeleteCustomer = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    updateCustomers(updated);
    if (activeRoute?.isActive && activeRoute.stopIds.includes(id)) {
      const newStopIds = activeRoute.stopIds.filter((stopId) => stopId !== id);
      const updatedRoute = { ...activeRoute, stopIds: newStopIds };
      setActiveRoute(updatedRoute);
      setLocalActiveRoute(updatedRoute);
    }
  };

  // Toggle customer paused/active status
  const handleTogglePauseCustomer = (customer: Customer) => {
    const newStatus: 'active' | 'paused' = customer.status === 'paused' ? 'active' : 'paused';
    const updated = customers.map((c) => (c.id === customer.id ? { ...c, status: newStatus } : c));
    updateCustomers(updated);
  };

  // Month cleans count for month tab badge (counts all scheduled & recurring cleans this month)
  const monthCleansCount = useMemo(() => {
    const [y, m] = todayStr.split('-').map(Number);
    const matrix = getMonthMatrix(y, m, todayStr);
    let count = 0;
    const safe = customers.filter((c) => c && c.status !== 'paused');
    matrix.forEach((d) => {
      if (!d.isCurrentMonth) return;
      safe.forEach((c) => {
        if (isCustomerScheduledOnDate(c, d.dateString, todayStr)) {
          count++;
        }
      });
    });
    return count;
  }, [customers, todayStr]);

  // Import customers from CSV
  const handleImportCustomers = (imported: Omit<Customer, 'id'>[]) => {
    const newItems: Customer[] = imported.map((c, i) => ({
      ...c,
      id: `cust-imp-${Date.now()}-${i}`,
    }));
    const combined = [...newItems, ...customers];
    updateCustomers(combined);
  };

  // Onboarding handlers
  const handleDismissOnboarding = () => {
    setIsOnboardingDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clearview_onboarding_dismissed', 'true');
    }
  };

  const handleReopenOnboarding = () => {
    setIsOnboardingDismissed(false);
    setMainTab('today');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('clearview_onboarding_dismissed');
    }
  };

  const handleLoadSampleData = () => {
    const newItems: Customer[] = SAMPLE_UK_CUSTOMERS.map((c, i) => ({
      ...c,
      id: `sample-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
    }));
    const merged = [...newItems, ...customers];
    updateCustomers(merged);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#38bdf8', '#10b981', '#34d399', '#f59e0b'],
    });
  };

  // User auth change
  const handleUserChange = (user: CleanerUser | null, syncedCustomers?: Customer[]) => {
    setCurrentUser(user);
    setLocalUser(user);
    if (Array.isArray(syncedCustomers)) {
      setCustomers(syncedCustomers);
      setLocalCustomers(syncedCustomers);
    }
  };

  // Route Handlers
  const handleStartRouteRunner = (
    orderedCustomers: Customer[],
    options?: { travelMode?: TravelMode; finishAddress?: string }
  ) => {
    // Save any newly geocoded coordinates to customer state
    const customerMap = new Map(orderedCustomers.map((c) => [c.id, c]));
    const updatedAll = customers.map((c) => {
      const match = customerMap.get(c.id);
      return match && (match.lat || match.lng) ? { ...c, lat: match.lat, lng: match.lng } : c;
    });
    updateCustomers(updatedAll);

    const routeState: ActiveRouteState = {
      isActive: true,
      stopIds: orderedCustomers.map((c) => c.id),
      currentStopIndex: 0,
      travelMode: options?.travelMode || 'walking',
      finishAddress: options?.finishAddress,
      lastOptimizedAt: new Date().toISOString(),
    };
    setActiveRoute(routeState);
    setLocalActiveRoute(routeState);
    setCurrentTab('today');
  };

  const handleEndRoute = () => {
    setActiveRoute(null);
    setLocalActiveRoute(null);
  };

  // Customers scheduled for today (for route planning)
  const todayDueCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (c.status === 'paused') return false;
      const diff = getDaysDifference(c.nextDueDate, todayStr);
      return diff <= 0 || c.lastCleanedDate === todayStr;
    });
  }, [customers, todayStr]);

  // Customers scheduled for this week (including projected recurring cleans)
  const weekCustomers = useMemo(() => {
    const weekDates = getCurrentWeekDates(todayStr).map((d) => d.dateString);
    return customers.filter((c) => {
      if (!c || c.status === 'paused') return false;
      return (
        weekDates.some((wDate) => isCustomerScheduledOnDate(c, wDate, todayStr)) ||
        c.lastCleanedDate === todayStr
      );
    });
  }, [customers, todayStr]);

  // All active customers
  const allActiveCustomers = useMemo(() => {
    return customers.filter((c) => c.status !== 'paused');
  }, [customers]);

  // Customers currently active in route
  const activeRouteCustomers = useMemo(() => {
    if (!activeRoute?.isActive || activeRoute.stopIds.length === 0) return [];
    return activeRoute.stopIds
      .map((id) => customers.find((c) => c.id === id))
      .filter((c): c is Customer => Boolean(c));
  }, [activeRoute, customers]);

  // Stats calculation
  const stats: AppStats = useMemo(() => {
    let overdueCount = 0,
      dueTodayCount = 0,
      dueThisWeekCount = 0;
    let totalActiveCount = 0,
      todayEstimatedEarnings = 0;
    let completedTodayCount = 0,
      completedTodayEarnings = 0;
    let unpaidCount = 0,
      unpaidAmount = 0,
      cashCount = 0,
      cashAmount = 0,
      cardCount = 0,
      cardAmount = 0;

    const weekDates = getCurrentWeekDates(todayStr).map((d) => d.dateString);

    customers.forEach((c) => {
      if (c.status !== 'paused') {
        totalActiveCount++;
        const pStatus = c.paymentStatus || 'unpaid';
        if (pStatus === 'cash') {
          cashCount++;
          cashAmount += c.price;
        } else if (pStatus === 'card') {
          cardCount++;
          cardAmount += c.price;
        } else {
          unpaidCount++;
          unpaidAmount += c.price;
        }
      }

      if (c.lastCleanedDate === todayStr) {
        completedTodayCount++;
        completedTodayEarnings += c.price;
        return;
      }

      if (c.status === 'paused') return;

      const diff = getDaysDifference(c.nextDueDate, todayStr);
      if (diff < 0) {
        overdueCount++;
        todayEstimatedEarnings += c.price;
      } else if (diff === 0) {
        dueTodayCount++;
        todayEstimatedEarnings += c.price;
      }

      if (weekDates.some((wDate) => isCustomerScheduledOnDate(c, wDate, todayStr))) {
        dueThisWeekCount++;
      }
    });

    return {
      overdueCount,
      dueTodayCount,
      dueThisWeekCount,
      totalActiveCount,
      todayEstimatedEarnings,
      completedTodayCount,
      completedTodayEarnings,
      unpaidCount,
      unpaidAmount,
      cashCount,
      cashAmount,
      cardCount,
      cardAmount,
    };
  }, [customers, todayStr]);

  // Tab Filtering & Optimal Route Ordering
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    });

    if (currentTab === 'today') {
      filtered = filtered.filter((c) => {
        if (c.status === 'paused') return false;
        const diff = getDaysDifference(c.nextDueDate, todayStr);
        return diff <= 0 || c.lastCleanedDate === todayStr;
      });

      if (activeRoute?.isActive && activeRoute.stopIds.length > 0) {
        const orderMap = new Map(activeRoute.stopIds.map((id, index) => [id, index]));
        filtered.sort((a, b) => {
          const aDone = a.lastCleanedDate === todayStr;
          const bDone = b.lastCleanedDate === todayStr;
          if (aDone && !bDone) return 1;
          if (!aDone && bDone) return -1;
          const aIdx = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
          const bIdx = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
          return aIdx - bIdx;
        });
      } else {
        filtered.sort((a, b) => {
          const aDone = a.lastCleanedDate === todayStr;
          const bDone = b.lastCleanedDate === todayStr;
          if (aDone && !bDone) return 1;
          if (!aDone && bDone) return -1;
          return a.nextDueDate.localeCompare(b.nextDueDate);
        });
      }
    } else if (currentTab === 'week') {
      if (selectedWeekDate) {
        filtered = filtered.filter(
          (c) => c && c.status !== 'paused' && isCustomerScheduledOnDate(c, selectedWeekDate, todayStr)
        );
      } else {
        const weekDates = getCurrentWeekDates(todayStr).map((d) => d.dateString);
        filtered = filtered.filter(
          (c) => c && c.status !== 'paused' && weekDates.some((wDate) => isCustomerScheduledOnDate(c, wDate, todayStr))
        );
      }
      filtered.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    } else if (currentTab === 'completed') {
      filtered = filtered.filter((c) => c.lastCleanedDate === todayStr);
    } else {
      filtered.sort((a, b) => {
        if (a.status === 'paused' && b.status !== 'paused') return 1;
        if (a.status !== 'paused' && b.status === 'paused') return -1;
        return a.nextDueDate.localeCompare(b.nextDueDate);
      });
    }

    // Secondary Filter by Payment Status (Unpaid, Cash, Card)
    if (paymentFilter === 'unpaid') {
      filtered = filtered.filter((c) => (c.paymentStatus || 'unpaid') === 'unpaid');
    } else if (paymentFilter === 'cash') {
      filtered = filtered.filter((c) => c.paymentStatus === 'cash');
    } else if (paymentFilter === 'card') {
      filtered = filtered.filter((c) => c.paymentStatus === 'card');
    }

    return filtered;
  }, [customers, searchQuery, currentTab, selectedWeekDate, activeRoute, todayStr, paymentFilter]);

  const tabCounts = useMemo(
    () => ({
      today: stats.overdueCount + stats.dueTodayCount,
      week: stats.dueThisWeekCount,
      all: customers.length,
      completed: stats.completedTodayCount,
    }),
    [stats, customers.length]
  );

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    if (tab !== 'week') {
      setSelectedWeekDate(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  const uncleanedTodayCount = todayDueCustomers.filter((c) => c.lastCleanedDate !== todayStr).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <Header
        stats={stats}
        businessName={businessName}
        currentUser={currentUser}
        onOpenAddCustomer={() => setIsAddModalOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        showSummaryCards={mainTab === 'today'}
      />

      {mainTab === 'today' && (
        <FilterBar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          todayCount={tabCounts.today}
          weekCount={tabCounts.week}
          totalCount={tabCounts.all}
          completedCount={tabCounts.completed}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          unpaidCount={stats.unpaidCount}
          cashCount={stats.cashCount}
          cardCount={stats.cardCount}
        />
      )}

      <main className={`flex-1 p-3.5 space-y-3 ${activeRoute?.isActive ? 'pb-52' : 'pb-24'}`}>
        {/* Today Tab: Active rounds, route runner, and cards */}
        {mainTab === 'today' && (
          <>
            {/* Interactive Step-by-Step Onboarding Guide */}
            {!isOnboardingDismissed && (
              <OnboardingGuide
                customers={customers}
                businessName={businessName}
                onOpenAddCustomer={() => setIsAddModalOpen(true)}
                onOpenImport={() => setIsExportModalOpen(true)}
                onOpenAreaPlanner={() => setIsAreaPlannerOpen(true)}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                onLoadSampleData={handleLoadSampleData}
                onDismiss={handleDismissOnboarding}
              />
            )}

            {/* Weekly Calendar Widget when in 'week' view */}
            {currentTab === 'week' && (
              <WeeklyCalendar
                customers={customers}
                selectedDate={selectedWeekDate}
                onSelectDate={setSelectedWeekDate}
              />
            )}

            {/* Route Planner Launch Bar */}
            {allActiveCustomers.length > 0 && (
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-900/80 border border-sky-200/80 dark:border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs transition-colors duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {activeRoute?.isActive ? 'Active Route Running' : 'Smart Route Planner'}
                      </h4>
                      {activeRoute?.isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Stop {activeRoute.currentStopIndex + 1} of {activeRoute.stopIds.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {activeRoute?.isActive
                        ? 'Shortest road driving order with 1-tap navigation'
                        : currentTab === 'week' && selectedWeekDate
                        ? `Optimize route for ${new Date(selectedWeekDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
                        : todayDueCustomers.length > 0
                        ? `Optimize driving route for today's ${todayDueCustomers.length} cleans`
                        : `Plan & map driving route for your ${allActiveCustomers.length} rounds`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      if (currentTab === 'week' && selectedWeekDate) {
                        const targetCusts = customers.filter(
                          (c) => c.status !== 'paused' && c.nextDueDate === selectedWeekDate
                        );
                        const [y, m, d] = selectedWeekDate.split('-').map(Number);
                        const label = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        });
                        setCustomRouteCustomers(targetCusts);
                        setCustomRouteDateLabel(label);
                        setRouteModalScope('custom');
                      } else {
                        setRouteModalScope(currentTab === 'week' ? 'week' : 'today');
                      }
                      setIsRouteModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 active:scale-97 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{activeRoute?.isActive ? 'View Map' : 'Plan Best Route'}</span>
                  </button>
                  {activeRoute?.isActive && (
                    <button
                      onClick={handleEndRoute}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="Exit Active Route"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Customer Cards List */}
            {filteredCustomers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-xs transition-colors duration-200">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">No customers found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    {searchQuery
                      ? `No matches for "${searchQuery}".`
                      : paymentFilter !== 'all'
                      ? paymentFilter === 'unpaid'
                        ? 'Great news! No unpaid customers found in this view.'
                        : paymentFilter === 'cash'
                        ? 'No cash payments found for this view.'
                        : 'No card payments found for this view.'
                      : currentTab === 'today'
                      ? 'All caught up! No cleans overdue or due today.'
                      : currentTab === 'week'
                      ? selectedWeekDate
                        ? 'No cleans scheduled for this selected day.'
                        : 'No cleans scheduled for this week.'
                      : 'Tap the Add button to create your first customer.'}
                  </p>
                </div>
                {customers.length === 0 && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Customer</span>
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const stopIndex = activeRoute?.isActive ? activeRoute.stopIds.indexOf(customer.id) : -1;
                const stopNumber = stopIndex !== -1 ? stopIndex + 1 : undefined;

                return (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onOpenOnMyWay={(c) => setOnMyWayCustomer(c)}
                    onMarkComplete={handleMarkComplete}
                    onEdit={(c) => setEditingCustomer(c)}
                    onUpdatePaymentStatus={handleUpdatePaymentStatus}
                    isCompleting={completingId === customer.id}
                    stopNumber={stopNumber}
                  />
                );
              })
            )}
          </>
        )}

        {/* Month Calendar & Where-and-When View */}
        {mainTab === 'month' && (
          <MonthView
            customers={customers}
            onOpenOnMyWay={(c) => setOnMyWayCustomer(c)}
            onMarkComplete={handleMarkComplete}
            onEdit={(c) => setEditingCustomer(c)}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onPlanRouteForDay={(dayCustomers, dateStr) => {
              const [y, m, d] = dateStr.split('-').map(Number);
              const label = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
              setCustomRouteCustomers(dayCustomers);
              setCustomRouteDateLabel(label);
              setRouteModalScope('custom');
              setIsRouteModalOpen(true);
            }}
            isCompletingId={completingId}
          />
        )}

        {/* Dedicated Unpaid Ledger View ("see who's unpaid") */}
        {mainTab === 'unpaid' && (
          <UnpaidView
            customers={customers}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onEditCustomer={(c) => setEditingCustomer(c)}
            businessName={businessName}
            cashTotal={stats.cashAmount}
            cashCount={stats.cashCount}
            cardTotal={stats.cardAmount}
            cardCount={stats.cardCount}
          />
        )}

        {/* Customer Directory View ("see our customers and stuff") */}
        {mainTab === 'customers' && (
          <CustomerDirectoryView
            customers={customers}
            onOpenAddCustomer={() => setIsAddModalOpen(true)}
            onOpenCustomerMap={() => {
              setRouteModalScope('all');
              setIsRouteModalOpen(true);
            }}
            onOpenAreaPlanner={() => setIsAreaPlannerOpen(true)}
            onOpenOnMyWay={(c) => setOnMyWayCustomer(c)}
            onMarkComplete={handleMarkComplete}
            onEditCustomer={(c) => setEditingCustomer(c)}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onTogglePauseCustomer={handleTogglePauseCustomer}
            isCompletingId={completingId}
          />
        )}

        {/* More / Stats, Sync & Settings View */}
        {mainTab === 'more' && (
          <MoreSettingsView
            stats={stats}
            businessName={businessName}
            currentUser={currentUser}
            onOpenSync={() => setIsSyncModalOpen(true)}
            onOpenExport={() => setIsExportModalOpen(true)}
            onOpenAddCustomer={() => setIsAddModalOpen(true)}
            onOpenBusinessProfile={() => setIsProfileModalOpen(true)}
            onReopenOnboarding={handleReopenOnboarding}
          />
        )}
      </main>

      {/* Floating Add Button (Mobile friendly positioned above BottomNav) */}
      {!activeRoute?.isActive && (mainTab === 'today' || mainTab === 'customers') && (
        <div className="fixed bottom-20 right-4 z-30 sm:hidden">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-13 h-13 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-brand-600/30 flex items-center justify-center transition-all cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        currentTab={mainTab}
        onTabChange={setMainTab}
        todayCount={stats.dueTodayCount + stats.overdueCount}
        unpaidCount={stats.unpaidCount}
        totalCustomersCount={customers.length}
        monthCleansCount={monthCleansCount}
        unpaidAmount={stats.unpaidAmount}
      />

      {/* Active Sticky Route Runner Bottom Bar */}
      {activeRoute?.isActive && activeRouteCustomers.length > 0 && (
        <RouteRunnerBar
          stops={activeRouteCustomers}
          currentIndex={activeRoute.currentStopIndex}
          onSelectIndex={(idx) => {
            const updated = { ...activeRoute, currentStopIndex: idx };
            setActiveRoute(updated);
            setLocalActiveRoute(updated);
          }}
          onOpenOnMyWay={(c) => setOnMyWayCustomer(c)}
          onMarkComplete={handleMarkComplete}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          onOpenMapModal={() => setIsRouteModalOpen(true)}
          onCloseRunner={handleEndRoute}
          navApp={navApp}
          travelMode={activeRoute.travelMode || 'walking'}
          finishAddress={activeRoute.finishAddress}
          isCompleting={completingId !== null}
        />
      )}

      {/* Modals */}
      <RouteMapModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        todayCustomers={todayDueCustomers}
        weekCustomers={weekCustomers}
        allCustomers={allActiveCustomers}
        customCustomers={customRouteCustomers || undefined}
        customDateLabel={customRouteDateLabel || undefined}
        onApplyRouteOrder={(ordered) => {
          handleStartRouteRunner(ordered);
        }}
        onStartRouteRunner={handleStartRouteRunner}
        onMarkComplete={handleMarkComplete}
        initialScope={routeModalScope}
      />
      <SmartAreaPlannerModal
        isOpen={isAreaPlannerOpen}
        onClose={() => setIsAreaPlannerOpen(false)}
        customers={customers}
        onApplySchedule={(updated) => updateCustomers(updated)}
      />
      <OnMyWayModal
        customer={onMyWayCustomer}
        onClose={() => setOnMyWayCustomer(null)}
      />
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCustomer={handleAddCustomer}
      />
      <EditCustomerModal
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onUpdateCustomer={handleUpdateCustomer}
        onDeleteCustomer={handleDeleteCustomer}
      />
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        customers={customers}
        businessName={businessName}
        onBusinessNameChange={setBusinessName}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        customers={customers}
        onImportCustomers={handleImportCustomers}
        businessName={businessName}
      />
      <BusinessProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        businessName={businessName}
        onSaveBusinessName={(name) => {
          setBusinessName(name);
          const user = getLocalUser();
          if (user) {
            setLocalUser({ ...user, businessName: name });
          }
        }}
      />
    </div>
  );
}
