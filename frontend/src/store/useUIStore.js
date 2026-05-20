import { create } from 'zustand';

export const useUIStore = create((set) => ({
  theme: localStorage.getItem('nexos_theme') || 'system',
  showWelcome: !localStorage.getItem('token') && !sessionStorage.getItem('token') && window.innerWidth < 1025,
  showMobileTour: false,
  tourStep: 1,
  activeDropdown: null,
  closingDropdown: null,
  searchHistory: (() => {
    const saved = localStorage.getItem('nexos_search_history');
    return saved ? JSON.parse(saved) : ['Dashboard', 'Medications', 'Planner', 'Profile'];
  })(),
  notifications: [
    { id: 1, type: 'info', title: 'Welcome to Nexos', text: 'All systems are active. Stay healthy!', read: false },
    { id: 2, type: 'reminder', title: 'Medication Schedule', text: 'Your Morning dose of multivitamin is coming up.', read: false }
  ],

  setTheme: (theme) => {
    localStorage.setItem('nexos_theme', theme);
    set({ theme });
  },
  setShowWelcome: (show) => set({ showWelcome: show }),
  setShowMobileTour: (show) => set({ showMobileTour: show }),
  setTourStep: (step) => set({ tourStep: step }),
  setActiveDropdown: (dropdown) => set({ activeDropdown: dropdown }),
  setClosingDropdown: (dropdown) => set({ closingDropdown: dropdown }),
  
  addToSearchHistory: (term) => set((state) => {
    if (!term || term.trim() === '') return state;
    const newHistory = [term, ...state.searchHistory.filter(h => h !== term)].slice(0, 5);
    localStorage.setItem('nexos_search_history', JSON.stringify(newHistory));
    return { searchHistory: newHistory };
  }),

  markNotificationsAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  }))
}));
