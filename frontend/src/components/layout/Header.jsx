import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

const Header = ({
  activeTab,
  setActiveTab,
  notifications,
  toggleDropdown,
  setNotifications,
  closingDropdown,
  notificationsRef,
  mobileMenuRef,
  handleLogout,
  syncProgress,
  showSyncToast,
  syncStatusMsg,
  syncLastAt,
  syncCloudOk
}) => {
  const { activeDropdown, setShowMobileTour, setTourStep } = useUIStore();

  return (
    <header className="top-bar mobile-only">
      <div className="mobile-branding">
        <img src="/logo.png" alt="Nexos Logo" className="mobile-logo" />
        <span className="mobile-app-name">Nexos</span>
      </div>

      <div className="top-actions">
        <div 
          className="mobile-guide-badge"
          onClick={() => { setShowMobileTour(true); setTourStep(1); }}
          style={{ marginRight: '0.25rem' }}
        >
          <span className="material-icons-round" style={{ fontSize: '0.95rem' }}>explore</span>
          <span>Tour</span>
        </div>

        <div 
          className={`header-action-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <span className="material-icons-round">search</span>
        </div>

        <div style={{ position: 'relative' }} ref={notificationsRef}>
          <div 
            className={`header-action-btn ${activeDropdown === 'notifications' ? 'active' : ''}`}
            onClick={() => toggleDropdown('notifications')}
          >
            <span className="material-icons-round">notifications</span>
            {notifications.some(n => !n.read) && <div className="notification-badge"></div>}
          </div>
          
          {activeDropdown === 'notifications' && (
            <div className={`header-dropdown-panel notifications-panel origin-top-right ${closingDropdown === 'notifications' ? 'is-closing' : ''}`}>
              <div className="dropdown-header">
                <h4>Notifications</h4>
                <span style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setNotifications([])}>Clear All</span>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                    <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{n.title}</h5>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.text}</p>
                  </div>
                )) : (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>All caught up!</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} ref={mobileMenuRef}>
          <div 
            className={`header-action-btn ${activeDropdown === 'mobileMenu' ? 'active' : ''}`}
            onClick={() => toggleDropdown('mobileMenu')}
          >
            <span className="material-icons-round">more_vert</span>
          </div>

          {activeDropdown === 'mobileMenu' && (
            <div className={`header-dropdown-panel origin-top-right ${closingDropdown === 'mobileMenu' ? 'is-closing' : ''}`} style={{ width: '200px' }}>
              <div className="dropdown-action-item" onClick={() => { toggleDropdown('mobileMenu'); setActiveTab('profile'); }}>
                <span className="material-icons-round">person</span> My Profile
              </div>
              <div className="dropdown-action-item" onClick={() => { toggleDropdown('mobileMenu'); setActiveTab('settings'); }}>
                <span className="material-icons-round">settings</span> Settings
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-action-item danger" onClick={handleLogout}>
                <span className="material-icons-round">logout</span> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
