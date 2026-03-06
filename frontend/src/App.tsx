import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

/* ✅ IMPORT SPLASH SCREEN */
import SplashScreen from './components/SplashScreen';

import CommandCenter from './pages/CommandCenter';
import LoginPage from './pages/Login';
import SignUpPage from './pages/Signup';
import Home from './pages/Home';
import OnboardingPage from './components/OnBoarding';
import AutoCreate from './pages/AutoCreate';
import AdSurveillance from './components/AdSurveillance';
import AdDetailPage from './pages/AdDetailPage';
import VideoAnalysis from './pages/VideoAnalysis';
import BookingPage from './pages/BookingPage';


/* ✅ NEW PAGE IMPORT */
import TargetingIntel from './pages/targetingIntel';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {/* ✅ Splash Screen */}
      {showSplash && (
        <SplashScreen
          duration={1000} // keep your current timing
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* ✅ App Routes (only show after splash disappears.) */}
      {!showSplash && (
        <Router>
          <Routes>

            {/* LANDING PAGE - Public route */}
            <Route path="/" element={<Home />} />

            {/* Ad Detail Page */}
            <Route path="/ads/:id" element={<AdDetailPage />} />

            {/* PUBLIC ROUTES */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            <Route
              path="/sign-up"
              element={
                <PublicRoute>
                  <SignUpPage />
                </PublicRoute>
              }
            />

            <Route 
              path="/video-analysis" 
              element={
                <ProtectedRoute>
                  <VideoAnalysis />
                </ProtectedRoute>
              } 
            />
            {/* ONBOARDING ROUTE */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* PROTECTED ROUTES */}
            <Route
              path="/command-center"
              element={
                <ProtectedRoute>
                  <CommandCenter />
                </ProtectedRoute>
              }
            />

            <Route
              path="/booking"
              element={
                <ProtectedRoute>
                  <BookingPage />
                </ProtectedRoute>
              }
            />

            {/* Alias */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <CommandCenter />
                </ProtectedRoute>
              }
            />

            <Route
              path="/auto-create"
              element={
                <ProtectedRoute>
                  <AutoCreate />
                </ProtectedRoute>
              }
            />

            {/* Ad Surveillance */}
            <Route
              path="/ad-surveillance"
              element={
                <ProtectedRoute>
                  <AdSurveillance />
                </ProtectedRoute>
              }
            />

            <Route
              path="/targeting_intel"
              element={
                <ProtectedRoute>
                  <TargetingIntel />
                </ProtectedRoute>
              }
            />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Router>
      )}
    </>
  );
}

export default App;