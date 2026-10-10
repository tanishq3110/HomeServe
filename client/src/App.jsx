import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import TechnicianDashboardPage from './pages/technician/TechnicianDashboardPage';
import TechnicianProfilePage from './pages/technician/TechnicianProfilePage';
import AdminTechniciansPage from './pages/admin/AdminTechniciansPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import NewBookingPage from './pages/bookings/NewBookingPage';
import MyBookingsPage from './pages/bookings/MyBookingsPage';
import BookingDetailPage from './pages/bookings/BookingDetailPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
        {/* Reset window scroll to top whenever route changes */}
        <ScrollToTop />

        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:id" element={<ServiceDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />

            {/* Protected User Account Route */}
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* ── Phase 6: Booking Routes (CUSTOMER) ── */}
            <Route
              path="bookings/new/:serviceId"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <NewBookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="bookings"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="bookings/:id"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Technician Routes */}
            <Route
              path="technician/dashboard"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN']}>
                  <TechnicianDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="technician/profile"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN']}>
                  <TechnicianProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/dashboard"
              element={<Navigate to="/admin/analytics" replace />}
            />
            <Route
              path="admin/technicians"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminTechniciansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/bookings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/reviews"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminReviewsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

