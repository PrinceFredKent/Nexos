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
      appLockEnabled: false,

      login: (token, userRole = 'patient', patientData = null) => {
        localStorage.setItem('token', token);
        // Store token in secure storage for app lock feature
        secureStorage.setToken(token).catch(err => console.error('Failed to store token securely:', err));
        set({ isAuthenticated: true, userRole, patient: patientData, token, appLocked: false });
      },

      logout: () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        secureStorage.clearAppLockPreferences().catch(err => console.error('Failed to clear secure app lock preferences:', err));
        set({ isAuthenticated: false, patient: null, token: null, adminEmail: null, appLocked: false, hasAppLock: false, appLockEnabled: false });
      },

      unlockApp: () => {
        set({ appLocked: false });
      },

      lockApp: () => {
        set({ appLocked: true });
      },

      setAppLockEnabled: async (enabled) => {
        try {
          await secureStorage.setAppLockEnabled(enabled);
          set({ appLockEnabled: enabled, hasAppLock: enabled, appLocked: enabled });
        } catch (error) {
          console.error('Failed to set app lock preference:', error);
        }
      },

      initializeAppLock: async () => {
        try {
          const enabled = await secureStorage.getAppLockEnabled();
          const hasPin = await secureStorage.getAppPin();
          const hasBiometric = await secureStorage.isBiometricAvailable();
          const shouldLock = enabled && (hasPin || hasBiometric);
          set({ appLockEnabled: enabled, hasAppLock: shouldLock, appLocked: shouldLock });
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
