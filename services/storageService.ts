import { FatigueEvent } from '../types';

const STORAGE_KEY = 'neurodrive_history_v1';

export const storageService = {
  saveEvent: (event: FatigueEvent) => {
    try {
      const history = storageService.getHistory();
      // Keep only last 50 events to prevent bloat
      const newHistory = [event, ...history].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save event', e);
    }
  },

  getHistory: (): FatigueEvent[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load history', e);
      return [];
    }
  },

  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};