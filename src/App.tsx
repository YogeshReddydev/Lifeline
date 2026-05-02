/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Shell from './components/Shell';
import Logo from './components/Logo';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PredictiveAnalysis from './pages/PredictiveAnalysis';
import ImageScanner from './pages/ImageScanner';
import Reports from './pages/Reports';
import Assistant from './pages/Assistant';
import DoctorDashboard from './pages/DoctorDashboard';
import Pricing from './pages/Pricing';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-natural-bg text-primary">
       <div className="flex flex-col items-center gap-8">
         <Logo hideText className="scale-150" iconSize={40} />
         <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-1 bg-accent rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '100%' }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="h-full bg-primary" 
               />
            </div>
            <p className="font-mono text-[10px] lowercase tracking-[0.3em] text-muted">Guardian System Init...</p>
         </div>
       </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/dashboard" />;

  return <Shell>{children}</Shell>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="/doctor-dashboard" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/prediction" element={<ProtectedRoute><PredictiveAnalysis /></ProtectedRoute>} />
      <Route path="/image-scan" element={<ProtectedRoute><ImageScanner /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

import { LanguageProvider } from './lib/LanguageContext';

export default function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

