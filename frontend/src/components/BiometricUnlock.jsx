/**
 * Biometric Unlock Component
 * Handles fingerprint, face, and other platform biometric authentication
 */

import React, { useState, useEffect } from 'react';
import { secureStorage } from '../services/secureStorage';
import '../styles/appLock.css';

const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return window.btoa(binary);
};

const base64ToBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const BiometricUnlock = ({ credentialId, onSuccess, onFallback, onCredentialRegistered }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [biometricType, setBiometricType] = useState('fingerprint');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    detectBiometricType();
    // Auto-start scanning or registration on component mount
    handleBiometricAuth();
  }, []);

  const detectBiometricType = async () => {
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
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

    if (!credentialId) {
      await registerBiometricCredential();
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'preferred',
          allowCredentials: [
            {
              type: 'public-key',
              id: base64ToBuffer(credentialId),
            },
          ],
        },
        mediation: 'optional',
      };

      const assertion = await navigator.credentials.get(options);

      if (assertion) {
        onSuccess();
      } else {
        setError('Biometric verification failed. Please try again.');
        setIsScanning(false);
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setError('Biometric verification cancelled.');
      } else if (error.name === 'InvalidStateError') {
        setError('No biometric credential exists. Please set up biometric unlock or use PIN.');
      } else {
        console.error('Biometric auth error:', error);
        setError('Biometric verification unavailable. Use PIN instead.');
      }
      setIsScanning(false);
    }
  };

  const registerBiometricCredential = async () => {
    setIsRegistering(true);
    setError('');

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new TextEncoder().encode('nexos-identity');
      const options = {
        publicKey: {
          challenge,
          rp: {
            name: 'Health Assistant',
          },
          user: {
            id: userId,
            name: 'local-user',
            displayName: 'Health Assistant User',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
          ],
          authenticatorSelection: {
            userVerification: 'preferred',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      };

      const credential = await navigator.credentials.create(options);
      if (credential && credential.rawId) {
        const storedId = bufferToBase64(credential.rawId);
        await secureStorage.setBiometricCredential(storedId);
        onCredentialRegistered(storedId);
        onSuccess();
      } else {
        setError('Biometric setup failed. Please try again or use PIN instead.');
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Biometric registration error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Biometric setup cancelled.');
      } else {
        setError('Unable to register biometric credential. Use PIN instead.');
      }
      setIsScanning(false);
    } finally {
      setIsRegistering(false);
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
