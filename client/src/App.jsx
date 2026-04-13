import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import FolderDetail from './pages/FolderDetail';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import SplashScreen from './components/SplashScreen';
import { useSync } from './hooks/useSync';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );

  // Show splash screen once per session
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splashShown');
  });

  const { isOnline, pendingCount, performSync, isSyncing } = useSync();

  const setAuth = (value) => {
    setIsAuthenticated(value);
    localStorage.setItem('isLoggedIn', value);
  };

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <Router>
      <div className="app-container">
        <InstallPrompt />
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login setAuth={setAuth} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/forgot-password" 
            element={<ForgotPassword />} 
          />
          <Route 
            path="/" 
            element={isAuthenticated ? <Dashboard setAuth={setAuth} isSyncing={isSyncing} pendingCount={pendingCount} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/folder/:id" 
            element={isAuthenticated ? <FolderDetail isSyncing={isSyncing} pendingCount={pendingCount} /> : <Navigate to="/login" />} 
          />
        </Routes>

        {isAuthenticated && (
          <BottomNav 
            isOnline={isOnline} 
            onSync={performSync} 
            pendingCount={pendingCount}
            isSyncing={isSyncing} 
          />
        )}
      </div>
    </Router>
  );
}

export default App;

