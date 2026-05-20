import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: !!(localStorage.getItem('token') || sessionStorage.getItem('token')),
      userRole: 'patient',
      patient: null,
      adminEmail: null,
      token: localStorage.getItem('token') || sessionStorage.getItem('token') || null,

      login: (token, userRole = 'patient', patientData = null) => {
        localStorage.setItem('token', token);
        set({ isAuthenticated: true, userRole, patient: patientData, token });
      },

      logout: () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        set({ isAuthenticated: false, patient: null, token: null, adminEmail: null });
      },

      setPatient: (patientData) => set({ patient: patientData }),
      setAdminEmail: (email) => set({ adminEmail: email }),
      setIsAuthenticated: (status) => set({ isAuthenticated: status })
    }),
    {
      name: 'auth-storage', // unique name
      getStorage: () => localStorage, // (optional) by default the 'localStorage' is used
    }
  )
);
