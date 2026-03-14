import { create } from 'zustand';

interface MemoryState {
  searchQuery: string;
  categoryFilter: string | null;
  setSearchQuery: (searchQuery: string) => void;
  setCategoryFilter: (categoryFilter: string | null) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  searchQuery: '',
  categoryFilter: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
}));
