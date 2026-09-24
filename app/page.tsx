'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Users, Plus, RefreshCw, Compass, MapPin, X } from 'lucide-react';
import { Customer, AppStats, FrequencyWeeks, ActiveRouteState, NavApp } from '@/lib/types';
import {
  getTodayDateString,
  getDaysDifference,
  addWeeksToDate,
  getCurrentWeekDates,
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
import { FilterBar, TabType } from '@/components/FilterBar';
import { CustomerCard } from '@/components/CustomerCard';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { RouteRunnerBar } from '@/components/RouteRunnerBar';
import { RouteMapModal } from '@/components/RouteMapModal';
import { OnMyWayModal } from '@/components/OnMyWayModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { SyncModal } from '@/components/SyncModal';
import { ExportModal } from '@/components/ExportModal';

export default function HomePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<CleanerUser | null>(null);
  const [businessName, setBusinessName] = useState('ClearView');
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Route Runner State
  const [activeRoute, setActiveRoute] = useState<ActiveRouteState | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [navApp, setNavApp] = useState<NavApp>('google');

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

  // Import customers from CSV
  const handleImportCustomers = (imported: Omit<Customer, 'id'>[]) => {
    const newItems: Customer[] = imported.map((c, i) => ({
      ...c,
      id: `cust-imp-${Date.now()}-${i}`,
    }));
    const combined = [...newItems, ...customers];
    updateCustomers(combined);
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
  const handleStartRouteRunner = (orderedCustomers: Customer[]) => {
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

  // Customers scheduled for this week
  const weekCustomers = useMemo(() => {
    const weekDates = getCurrentWeekDates(todayStr).map((d) => d.dateString);
    const weekSet = new Set(weekDates);
    return customers.filter((c) => {
      if (c.status === 'paused') return false;
      return weekSet.has(c.nextDueDate) || c.lastCleanedDate === todayStr;
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

    const weekDates = getCurrentWeekDates(todayStr).map((d) => d.dateString);
    const weekSet = new Set(weekDates);

    customers.forEach((c) => {
      if (c.status !== 'paused') totalActiveCount++;

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

      if (weekSet.has(c.nextDueDate)) {
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
          (c) => c.status !== 'paused' && c.nextDueDate === selectedWeekDate
        );
      } else {
        const weekDates = getCurrentWeekDates(todayStr).map((d) => d.dateString);
        const weekSet = new Set(weekDates);
        filtered = filtered.filter(
          (c) => c.status !== 'paused' && weekSet.has(c.nextDueDate)
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

    return filtered;
  }, [customers, searchQuery, currentTab, selectedWeekDate, activeRoute, todayStr]);

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
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen">
      <Header
        stats={stats}
        businessName={businessName}
        currentUser={currentUser}
        onOpenAddCustomer={() => setIsAddModalOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      <FilterBar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        todayCount={tabCounts.today}
        weekCount={tabCounts.week}
        totalCount={tabCounts.all}
        completedCount={tabCounts.completed}
      />

      <main className={`flex-1 p-3.5 space-y-3 ${activeRoute?.isActive ? 'pb-44' : 'pb-24'}`}>
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
          <div className="bg-linear-to-r from-sky-50 to-indigo-50 border border-sky-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                    {activeRoute?.isActive ? 'Active Route Running' : 'Smart Route Planner'}
                  </h4>
                  {activeRoute?.isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Stop {activeRoute.currentStopIndex + 1} of {activeRoute.stopIds.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeRoute?.isActive
                    ? 'Shortest road driving order with 1-tap navigation'
                    : todayDueCustomers.length > 0
                    ? `Optimize driving route for today's ${todayDueCustomers.length} cleans`
                    : `Plan & map driving route for your ${allActiveCustomers.length} rounds`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsRouteModalOpen(true)}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 active:scale-97 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{activeRoute?.isActive ? 'View Map' : 'Plan Best Route'}</span>
              </button>
              {activeRoute?.isActive && (
                <button
                  onClick={handleEndRoute}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">No customers found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? `No matches for "${searchQuery}".`
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
                className="mt-2 inline-flex items-center gap-1.5 bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm"
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
                isCompleting={completingId === customer.id}
                stopNumber={stopNumber}
              />
            );
          })
        )}
      </main>

      {/* Floating Add Button (only when route runner is not active) */}
      {!activeRoute?.isActive && (
        <div className="fixed bottom-4 right-4 z-20 sm:hidden">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-14 h-14 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-brand-600/30 flex items-center justify-center transition-all"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>
      )}

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
          onOpenMapModal={() => setIsRouteModalOpen(true)}
          onCloseRunner={handleEndRoute}
          navApp={navApp}
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
        onApplyRouteOrder={(ordered) => {
          handleStartRouteRunner(ordered);
        }}
        onStartRouteRunner={handleStartRouteRunner}
        onMarkComplete={handleMarkComplete}
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
    </div>
  );
}
