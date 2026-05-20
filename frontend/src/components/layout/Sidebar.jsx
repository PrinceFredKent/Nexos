import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

const Sidebar = () => {
  const { logout } = useAuthStore();
  const { activeDropdown } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar expanded ${activeDropdown ? 'blur-content' : ''}`}>
      <div className="logo-container">
        <div className="logo-wrapper">
          <div className="logo-icon">
            <img src="/logo.png" alt="Nexos Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
          </div>
          <div className="logo-text">Nexos</div>
        </div>
      </div>

      <nav className="nav-icons">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}>
          <span className="material-icons-round">home</span>
          <span className="nav-text">Dashboard</span>
        </NavLink>
        <NavLink to="/medications" className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}>
          <span className="material-icons-round">bar_chart</span>
          <span className="nav-text">Medications</span>
        </NavLink>
        <NavLink to="/planner" className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}>
          <span className="material-icons-round">calendar_today</span>
          <span className="nav-text">Planner</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}>
          <span className="material-icons-round">person_outline</span>
          <span className="nav-text">My Profile</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}>
          <span className="material-icons-round">settings</span>
          <span className="nav-text">Settings</span>
        </NavLink>
      </nav>

      <div className="logout-icon" onClick={handleLogout} title="Logout">
        <span className="material-icons-round">logout</span>
        <span className="nav-text">Logout</span>
      </div>
    </aside>
  );
};

export default Sidebar;
