import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import DashboardRound2 from './pages/DashboardRound2';
import { Sun, Moon } from 'lucide-react';

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Fallback
  });

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/q4-2025" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/round2" element={<DashboardRound2 theme={theme} toggleTheme={toggleTheme} />} />
        {/* Fallback to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
