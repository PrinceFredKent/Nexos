/**
 * PIN Unlock Component
 * Allows users to unlock the app with a 4-6 digit PIN
 */

import React, { useState } from 'react';
import '../styles/appLock.css';

export const PinUnlock = ({ onSuccess, onCancel, isSettingPin = false }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const maxPinLength = 6;

  const handlePinInput = (digit) => {
    if (pin.length < maxPinLength) {
      setPin(pin + digit);
      setError('');
    }
  };

  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleConfirmPinInput = (digit) => {
    if (confirmPin.length < maxPinLength) {
      setConfirmPin(confirmPin + digit);
      setError('');
    }
  };

  const handleConfirmPinBackspace = () => {
    setConfirmPin(confirmPin.slice(0, -1));
    setError('');
  };

  const handleUnlock = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    onSuccess(pin);
  };

  const handleSetPin = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    onSuccess(pin);
  };

  const currentPin = isSettingPin && pin !== confirmPin ? confirmPin : pin;
  const activeInput = isSettingPin && confirmPin ? 'confirm' : 'main';

  return (
    <div className="pin-unlock-container">
      <div className="pin-header">
        <h3>{isSettingPin ? 'Set App PIN' : 'Unlock with PIN'}</h3>
        <p className="pin-subtitle">
          {isSettingPin
            ? confirmPin
              ? 'Confirm your PIN'
              : 'Enter a 4-6 digit PIN'
            : 'Enter your PIN'}
        </p>
      </div>

      <div className="pin-display-row">
        {isSettingPin && confirmPin ? (
          <>
            {[...Array(maxPinLength)].map((_, i) => (
              <div key={i} className={`pin-digit ${i < confirmPin.length ? 'filled' : ''}`}>
                {showPin && confirmPin[i] ? confirmPin[i] : '•'}
              </div>
            ))}
          </>
        ) : (
          <>
            {[...Array(maxPinLength)].map((_, i) => (
              <div key={i} className={`pin-digit ${i < pin.length ? 'filled' : ''}`}>
                {showPin && pin[i] ? pin[i] : '•'}
              </div>
            ))}
          </>
        )}
      </div>

      {error && <div className="error-message pin-error">{error}</div>}

      <button
        className="btn btn-link show-pin-toggle"
        onClick={() => setShowPin(!showPin)}
      >
        <span className="material-icons-round">
          {showPin ? 'visibility_off' : 'visibility'}
        </span>
      </button>

      <div className="pin-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            className="pin-key"
            onClick={() =>
              isSettingPin && confirmPin
                ? handleConfirmPinInput(digit)
                : handlePinInput(digit)
            }
          >
            {digit}
          </button>
        ))}

        <button
          className="pin-key pin-key-zero"
          onClick={() =>
            isSettingPin && confirmPin
              ? handleConfirmPinInput(0)
              : handlePinInput(0)
          }
        >
          0
        </button>

        <button
          className="pin-key pin-key-delete"
          onClick={() =>
            isSettingPin && confirmPin
              ? handleConfirmPinBackspace()
              : handlePinBackspace()
          }
        >
          <span className="material-icons-round">backspace</span>
        </button>
      </div>

      <div className="pin-actions">
        {isSettingPin ? (
          <>
            <button
              className="btn btn-secondary btn-full"
              onClick={handleSetPin}
              disabled={pin.length < 4 || !confirmPin}
            >
              Set PIN
            </button>
            {onCancel && (
              <button className="btn btn-link" onClick={onCancel}>
                Cancel
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className="btn btn-primary btn-full"
              onClick={handleUnlock}
              disabled={pin.length < 4}
            >
              Unlock
            </button>
            {onCancel && (
              <button className="btn btn-link" onClick={onCancel}>
                Use Biometric
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PinUnlock;
