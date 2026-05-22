import { isApiConfigured, API_CONFIG_MESSAGE } from '../config';

export default function ApiConfigBanner() {
  if (isApiConfigured) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: '0.65rem 1rem',
        background: '#7f1d1d',
        color: '#fef2f2',
        fontSize: '0.85rem',
        lineHeight: 1.4,
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      {API_CONFIG_MESSAGE}
    </div>
  );
}
