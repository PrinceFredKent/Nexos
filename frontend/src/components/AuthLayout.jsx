import '../styles/auth.css';

const AuthLayout = ({ children, reverse = false, step = 1, image }) => {
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
