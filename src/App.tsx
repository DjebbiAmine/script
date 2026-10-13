import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AgentInterface from './components/AgentInterface';
import AdminInterface from './components/AdminInterface';
import { UserRole } from './types';

interface UserSession {
  username: string;
  role: UserRole;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    // Attempt local storage load for easier refresh capabilities (common in web applications)
    const stored = localStorage.getItem('synergy_session');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (username: string, role: 'agent' | 'admin') => {
    const newSession: UserSession = { username, role };
    setSession(newSession);
    localStorage.setItem('synergy_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('synergy_session');
  };

  // Render the appropriate portal depending on role
  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (session.role === 'agent') {
    return (
      <AgentInterface 
        username={session.username} 
        onLogout={handleLogout} 
      />
    );
  }

  if (session.role === 'admin') {
    return (
      <AdminInterface 
        username={session.username} 
        onLogout={handleLogout} 
      />
    );
  }

  // Fallback
  return <Login onLoginSuccess={handleLoginSuccess} />;
}
