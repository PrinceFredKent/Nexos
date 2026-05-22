/**
 * App Lock Component
 * Main lock screen that appears when app is opened with stored token
 */

import React, { useState, useEffect } from 'react';
import BiometricUnlock from './BiometricUnlock';
import PinUnlock from './PinUnlock';
import { secureStorage } from '../services/secureStorage';
import '../styles/appLock.css';

export const AppLock = ({ onUnlocked, onLogout }) => {
  const [unlockMethod, setUnlockMethod] = useState(null); // 'biometric', 'pin', or null
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState(null);
  const [pinSet, setPinSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeAppLock();
  }, []);

  const initializeAppLock = async () => {
    try {
      const [hasBiometric, hasPin, storedCredential] = await Promise.all([
        secureStorage.isBiometricAvailable(),
        secureStorage.getAppPin(),
        secureStorage.getBiometricCredential(),
      ]);

      setBiometricAvailable(!!hasBiometric);
      setBiometricCredentialId(storedCredential);
      setPinSet(!!hasPin);

      // Default to biometric if available, otherwise PIN
      if (hasBiometric) {
        setUnlockMethod('biometric');
      } else if (hasPin) {
        setUnlockMethod('pin');
      }

      setLoading(false);
    } catch (error) {
      console.error('App lock initialization error:', error);
      setError('Failed to initialize app lock');
      setLoading(false);
    }
  };

  const handleBiometricSuccess = () => {
    onUnlocked();
  };

  const handleBiometricFallback = () => {
    if (pinSet) {
      setUnlockMethod('pin');
    } else {
      setError('PIN not set. Please log in again.');
    }
  };

  const handlePinSuccess = async (pin) => {
    try {
      const isValid = await secureStorage.verifyAppPin(pin);
      if (isValid) {
        onUnlocked();
      } else {
        setError('Incorrect PIN');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setError('Error verifying PIN');
    }
  };

  const handlePinCancel = () => {
    if (biometricAvailable) {
      setUnlockMethod('biometric');
    }
  };

  if (loading) {
    return (
      <div className="app-lock-screen">
        <div className="lock-loading">
          <div className="loading-spinner"></div>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  if (!unlockMethod) {
    return (
      <div className="app-lock-screen">
        <div className="lock-initial-setup">
          <div className="lock-icon-wrapper">
            <span className="material-icons-round lock-icon-large">lock_open</span>
          </div>
          <h2>Secure Your App</h2>
          <p>Choose how you'd like to unlock this app on future opens</p>

          <div className="lock-method-options">
            {biometricAvailable && (
              <button
                className="btn btn-primary btn-full"
                onClick={() => setUnlockMethod('biometric')}
              >
                <span className="material-icons-round">fingerprint</span>
                Use Biometric
              </button>
            )}
            <button
              className="btn btn-secondary btn-full"
              onClick={() => setUnlockMethod('pin')}
            >
              <span className="material-icons-round">pin</span>
              Set PIN
            </button>
          </div>

          <button className="btn btn-link" onClick={onLogout}>
            Log Out Instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-lock-screen">
      <div className="lock-content">
        <div className="lock-app-branding">
          <span className="material-icons-round">favorite</span>
          <h2>Health Assistant</h2>
        </div>

        {unlockMethod === 'biometric' && biometricAvailable ? (
          <BiometricUnlock
            credentialId={biometricCredentialId}
            onSuccess={handleBiometricSuccess}
            onFallback={handleBiometricFallback}
            onCredentialRegistered={(newId) => setBiometricCredentialId(newId)}
          />
        ) : unlockMethod === 'pin' && pinSet ? (
          <PinUnlock onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
        ) : unlockMethod === 'pin' && !pinSet ? (
          <PinUnlock
            onSuccess={async (pin) => {
              try {
                await secureStorage.setAppPin(pin);
                setPinSet(true);
                onUnlocked();
              } catch (error) {
                setError('Failed to set PIN');
              }
            }}
            isSettingPin={true}
            onCancel={() => {
              if (biometricAvailable) {
                setUnlockMethod('biometric');
              } else {
                onLogout();
              }
            }}
          />
        ) : null}

        {error && (
          <div className="error-banner app-lock-error">
            <span className="material-icons-round">error</span>
            {error}
          </div>
        )}

        <button className="btn btn-link lock-logout" onClick={onLogout}>
          <span className="material-icons-round">logout</span>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default AppLock;
