import '../styles/auth.css';

const AuthLayout = ({ children, reverse = false, step = 0, image }) => {
  return (
    <div className="auth-container">
      <div className={`auth-card ${reverse ? 'reverse' : ''} step-${step}`}>
        <div className="auth-image-side">
          <img src={image} alt="Auth Background" />
          <div className="image-overlay">
            <div className="auth-branding">
              <img src="/logo.png" alt="Nexos Logo" style={{ width: '60px', height: '60px', marginBottom: '1rem', objectFit: 'contain' }} />
              <h2 className="auth-branding-title">NEXOS</h2>
              <p className="auth-branding-tagline">Unified Intelligence. Personal Wellness.</p>
            </div>

            {/* Progress Ring — Only shows if step is provided (1, 2, or 3) */}
            {step >= 1 && step <= 3 && (
              <div className="step-ring-indicator" aria-label={`Step ${step} of 3`}>
                <svg width="48" height="48" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="4" />
                  <circle
                    cx="26" cy="26" r="22" fill="none"
                    stroke="var(--auth-accent)" strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={2 * Math.PI * 22 * (1 - step / 3)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.35, 1)' }}
                  />
                  <text x="26" y="26" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="13" fontWeight="800">
                    {step}/3
                  </text>
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="auth-form-side">
          <div className="wavy-divider"></div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
