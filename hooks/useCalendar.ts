/**
 * useCalendar Hook
 * Hook personalizado para manejar el calendario de outfits
 */

import { useEffect } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuth } from './useAuth';

export const useCalendar = (autoLoad: boolean = true) => {
  const { user } = useAuth();
  const {
    entries,
    isLoading,
    isSaving,
    error,
    selectedMonth,
    selectedYear,
    loadMonth,
    logOutfit,
    deleteLog,
    navigateMonth,
    setToday,
    clearError,
  } = useCalendarStore();

  useEffect(() => {
    if (autoLoad && user && entries.length === 0) {
      loadMonth(selectedMonth, selectedYear);
    }
  }, [user, autoLoad]);

  return {
    entries,
    isLoading,
    isSaving,
    error,
    selectedMonth,
    selectedYear,
    loadMonth,
    logOutfit,
    deleteLog,
    navigateMonth,
    setToday,
    clearError,
  };
};
