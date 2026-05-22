import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureStorage } from '../services/secureStorage';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: !!(localStorage.getItem('token') || sessionStorage.getItem('token')),
      userRole: 'patient',
      patient: null,
      adminEmail: null,
      token: localStorage.getItem('token') || sessionStorage.getItem('token') || null,
      appLocked: false,
      hasAppLock: false,

      login: (token, userRole = 'patient', patientData = null) => {
        localStorage.setItem('token', token);
        // Store token in secure storage for app lock feature
        secureStorage.setToken(token).catch(err => console.error('Failed to store token securely:', err));
        set({ isAuthenticated: true, userRole, patient: patientData, token, appLocked: false });
      },

      logout: () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        secureStorage.clearToken().catch(err => console.error('Failed to clear secure token:', err));
        set({ isAuthenticated: false, patient: null, token: null, adminEmail: null, appLocked: false, hasAppLock: false });
      },

      unlockApp: () => {
        set({ appLocked: false });
      },

      lockApp: () => {
        set({ appLocked: true });
      },

      initializeAppLock: async () => {
        try {
          const hasPin = await secureStorage.getAppPin();
          const hasBiometric = await secureStorage.isBiometricAvailable();
          const shouldLock = hasPin || hasBiometric;
          set({ hasAppLock: shouldLock, appLocked: shouldLock });
        } catch (error) {
          console.error('Failed to initialize app lock:', error);
        }
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
