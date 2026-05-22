/**
 * Biometric Unlock Component
 * Handles fingerprint, face, and other platform biometric authentication
 */

import React, { useState, useEffect } from 'react';
import '../styles/appLock.css';

export const BiometricUnlock = ({ onSuccess, onFallback }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [biometricType, setBiometricType] = useState('fingerprint');

  useEffect(() => {
    detectBiometricType();
    // Auto-start scanning on component mount
    handleBiometricAuth();
  }, []);

  const detectBiometricType = async () => {
    // Try to detect which type of biometric is available
    // This is a fallback for WebAuthn API
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          // Can't determine exact type from WebAuthn alone
          // Use generic "biometric"
          setBiometricType('biometric');
        }
      } catch (error) {
        console.warn('Biometric detection failed:', error);
      }
    }
  };

  const handleBiometricAuth = async () => {
    setIsScanning(true);
    setError('');

    try {
      // Generate challenge for WebAuthn
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options = {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'preferred',
      };

      // Attempt biometric verification
      const assertion = await navigator.credentials.get({
        publicKey: options,
        mediation: 'optional',
      });

      if (assertion) {
        // Biometric verification successful
        onSuccess();
      } else {
        setError('Biometric verification failed. Please try again.');
        setIsScanning(false);
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        // User cancelled
        setError('Biometric verification cancelled.');
      } else if (error.name === 'InvalidStateError') {
        setError('This device does not support biometric authentication.');
      } else {
        console.error('Biometric auth error:', error);
        setError('Biometric verification unavailable. Use PIN instead.');
      }
      setIsScanning(false);
    }
  };

  return (
    <div className="biometric-unlock-container">
      <div className="biometric-icon-wrapper">
        {isScanning ? (
          <>
            <div className="biometric-scanner-animation"></div>
            <span className="material-icons-round biometric-icon scanning">fingerprint</span>
          </>
        ) : (
          <span className="material-icons-round biometric-icon">fingerprint</span>
        )}
      </div>

      <h3>{isScanning ? 'Scanning...' : 'Unlock with Biometric'}</h3>
      <p className="biometric-subtitle">
        {biometricType === 'fingerprint' && 'Place your finger on the scanner'}
        {biometricType === 'face' && 'Look at the camera'}
        {biometricType === 'biometric' && 'Use your biometric authentication'}
      </p>

      {error && <div className="error-message biometric-error">{error}</div>}

      <button
        className="btn btn-secondary btn-full"
        onClick={onFallback}
        disabled={isScanning}
      >
        Use PIN Instead
      </button>

      {!isScanning && (
        <button
          className="btn btn-link"
          onClick={handleBiometricAuth}
          disabled={isScanning}
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default BiometricUnlock;
