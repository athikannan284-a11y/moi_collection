import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import FolderDetail from './pages/FolderDetail';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import SplashScreen from './components/SplashScreen';
import UpdatePrompt from './components/UpdatePrompt';
import { useSync } from './hooks/useSync';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );

  const [clientFolderId, setClientFolderId] = React.useState(
    localStorage.getItem('clientFolderId')
  );

  // Normal App Load Splash
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splashShown');
  });

  // Manual Update Splash
  const [isUpdating, setIsUpdating] = useState(false);

  const { isOnline, pendingCount, performSync, isSyncing } = useSync();

  const setAuth = (value) => {
    setIsAuthenticated(value);
    localStorage.setItem('isLoggedIn', value);
  };

  const updateClientAuth = (id) => {
    if (id) {
        setClientFolderId(id);
        localStorage.setItem('clientFolderId', id);
    } else {
        setClientFolderId(null);
        localStorage.removeItem('clientFolderId');
    }
  };

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  }, []);

  if (showSplash || isUpdating) {
    return <SplashScreen onFinish={isUpdating ? () => {} : handleSplashFinish} />;
  }

  return (
    <Router>
      <div className="app-container">
        <InstallPrompt />
        <UpdatePrompt onUpdating={() => setIsUpdating(true)} />
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login setAuth={setAuth} setClientAuth={updateClientAuth} /> : <Navigate to="/" />} 
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
            element={(isAuthenticated || clientFolderId) ? <FolderDetail isSyncing={isSyncing} pendingCount={pendingCount} setClientAuth={updateClientAuth} clientFolderId={clientFolderId} isAdmin={isAuthenticated} /> : <Navigate to="/login" />} 
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

