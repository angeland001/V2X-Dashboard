import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import '../styles/navigation.css';

const Navigation = () => {
  const [activeTab, setActiveTab] = useState('map');
  const history = useHistory();

  const navigationItems = [
    {
      id: 'dashboard',
      name: 'Dashboard'
    },
    {
      id: 'map',
      name: 'Live Map'
    },
    {
      id: 'analytics',
      name: 'Analytics'
    },
    {
      id: 'collisions',
      name: 'Collision Reports'
    },
    
    {
      id: 'alerts',
      name: 'Alerts'
    },
    {
      id: 'traffic',
      name: 'Traffic Flow'
    },
    {
      id: 'settings',
      name: 'Settings'
    }
  ];

  return (
    <nav className="navigation-sidebar">
      <div className="nav-header">
        <div className="nav-logo">
          <h2 className="nav-title">V2X Dashboard</h2>
        </div>
      </div>

      <div className="nav-items">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-label">{item.name}</span>
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <button className="nav-item profile-item">
          <span className="nav-label">Profile</span>
        </button>
        <button className="nav-item logout-item" onClick={() => history.push('/')}>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
