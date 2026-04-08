import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import FolderDetail from './pages/FolderDetail';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import { useSync } from './hooks/useSync';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );

  const { isOnline, pendingCount, performSync } = useSync();

  const setAuth = (value) => {
    setIsAuthenticated(value);
    localStorage.setItem('isLoggedIn', value);
  };

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
            element={isAuthenticated ? <Dashboard setAuth={setAuth} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/folder/:id" 
            element={isAuthenticated ? <FolderDetail /> : <Navigate to="/login" />} 
          />
        </Routes>

        {isAuthenticated && (
          <BottomNav 
            isOnline={isOnline} 
            onSync={performSync} 
            pendingCount={pendingCount} 
          />
        )}
      </div>
    </Router>
  );
}

export default App;
