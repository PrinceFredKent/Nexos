import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

const MainLayout = ({ patient, userEvents, handleLogout }) => {
  const { activeDropdown } = useUIStore();
  
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        <Header activeTab="dashboard" />
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
