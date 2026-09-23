'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Clock, 
  Plus,
  RefreshCw
} from 'lucide-react';
import { Customer, AppStats } from '@/lib/types';
import { getTodayDateString, getDaysDifference, getCustomerDueCategory } from '@/lib/dateUtils';
import { Header } from '@/components/Header';
import { FilterBar, TabType } from '@/components/FilterBar';
import { CustomerCard } from '@/components/CustomerCard';
import { OnMyWayModal } from '@/components/OnMyWayModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { SettingsModal } from '@/components/SettingsModal';

export default function HomePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [onMyWayCustomer, setOnMyWayCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
        setIsDemoMode(Boolean(data.isDemoMode));
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const todayStr = getTodayDateString();

  // Mark a customer clean completed for today
  const handleMarkComplete = async (customer: Customer) => {
    setCompletingId(customer.id);

    // Optimistic UI update
    const previousCustomers = [...customers];
    const isAlreadyDoneToday = customer.lastCleanedDate === todayStr;

    try {
      // Trigger pleasant celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0284c7', '#38bdf8', '#10b981', '#34d399', '#f59e0b'],
      });

      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      const data = await res.json();
      if (data.customer) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? data.customer : c))
        );
      } else {
        await fetchCustomers();
      }
    } catch (err) {
      console.error('Failed to mark customer complete:', err);
      // Revert on error
      setCustomers(previousCustomers);
    } finally {
      setCompletingId(null);
    }
  };

  // Compute Statistics
  const stats: AppStats = useMemo(() => {
    let overdueCount = 0;
    let dueTodayCount = 0;
    let dueThisWeekCount = 0;
    let totalActiveCount = 0;
    let todayEstimatedEarnings = 0;
    let completedTodayCount = 0;
    let completedTodayEarnings = 0;

    customers.forEach((c) => {
      if (c.status !== 'paused') {
        totalActiveCount++;
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
      } else if (diff <= 7) {
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

  // Filter & categorize customers
  const filteredCustomers = useMemo(() => {
    // 1. Text Search Filter
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

    // 2. Tab Filter
    if (currentTab === 'today') {
      // Shows Overdue + Due Today first! (Active customers)
      filtered = filtered.filter((c) => {
        if (c.status === 'paused') return false;
        // Don't hide if completed today, but put at bottom
        const diff = getDaysDifference(c.nextDueDate, todayStr);
        return diff <= 0 || c.lastCleanedDate === todayStr;
      });

      // Sort: Overdue first (oldest first), then due today, then done today
      filtered.sort((a, b) => {
        const aDone = a.lastCleanedDate === todayStr;
        const bDone = b.lastCleanedDate === todayStr;
        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;

        return a.nextDueDate.localeCompare(b.nextDueDate);
      });
    } else if (currentTab === 'week') {
      // Cleans due within next 7 days
      filtered = filtered.filter((c) => {
        if (c.status === 'paused') return false;
        const diff = getDaysDifference(c.nextDueDate, todayStr);
        return diff >= 0 && diff <= 7;
      });

      filtered.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    } else if (currentTab === 'completed') {
      filtered = filtered.filter((c) => c.lastCleanedDate === todayStr);
    } else {
      // 'all' tab: Sort by next due date, paused customers at end
      filtered.sort((a, b) => {
        if (a.status === 'paused' && b.status !== 'paused') return 1;
        if (a.status !== 'paused' && b.status === 'paused') return -1;
        return a.nextDueDate.localeCompare(b.nextDueDate);
      });
    }

    return filtered;
  }, [customers, searchQuery, currentTab, todayStr]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const todayTarget = stats.overdueCount + stats.dueTodayCount;
    return {
      today: todayTarget,
      week: stats.dueThisWeekCount + stats.dueTodayCount,
      all: customers.length,
      completed: stats.completedTodayCount,
    };
  }, [stats, customers.length]);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen">
      {/* Header with Stats & Actions */}
      <Header
        stats={stats}
        isDemoMode={isDemoMode}
        isLoading={isLoading}
        onRefresh={fetchCustomers}
        onOpenAddCustomer={() => setIsAddModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Filter Tabs & Search Bar */}
      <FilterBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        todayCount={tabCounts.today}
        weekCount={tabCounts.week}
        totalCount={tabCounts.all}
        completedCount={tabCounts.completed}
      />

      {/* Main Customer List Area */}
      <main className="flex-1 p-3.5 space-y-3 pb-24">
        {isLoading && customers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-brand-600" />
            <p className="text-xs font-semibold">Loading rounds from Google Sheets...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">No customers found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? `No matches for "${searchQuery}". Try a different name or street.`
                  : currentTab === 'today'
                  ? "All caught up! You don't have any overdue or cleans due today."
                  : currentTab === 'week'
                  ? 'No cleans scheduled for this week.'
                  : 'Start by adding your first customer round.'}
              </p>
            </div>
            {!searchQuery && currentTab === 'today' && (
              <button
                onClick={() => setCurrentTab('all')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                View all scheduled customers
              </button>
            )}
            {customers.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Customer</span>
              </button>
            )}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onOpenOnMyWay={(c) => setOnMyWayCustomer(c)}
              onMarkComplete={handleMarkComplete}
              onEdit={(c) => setEditingCustomer(c)}
              isCompleting={completingId === customer.id}
            />
          ))
        )}
      </main>

      {/* Floating Add Customer Quick Button for mobile */}
      <div className="fixed bottom-4 right-4 z-20 sm:hidden">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-14 h-14 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-brand-600/30 flex items-center justify-center transition-all"
          title="Add Customer"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Modals */}
      <OnMyWayModal
        customer={onMyWayCustomer}
        onClose={() => setOnMyWayCustomer(null)}
      />

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCustomerAdded={fetchCustomers}
      />

      <EditCustomerModal
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onCustomerUpdated={fetchCustomers}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isDemoMode={isDemoMode}
        onDataReset={fetchCustomers}
      />
    </div>
  );
}
