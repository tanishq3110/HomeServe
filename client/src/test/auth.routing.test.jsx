import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';

// Mock AuthContext
const mockLogin = vi.fn().mockResolvedValue({ success: true });
const mockRegister = vi.fn().mockResolvedValue({ success: true });
const mockClearError = vi.fn();
let mockAuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: '',
  login: mockLogin,
  register: mockRegister,
  clearError: mockClearError,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('Frontend — Auth & Protected Routes Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. LoginPage Validation & Submission', () => {
    it('renders login form with email, password fields and submit button', () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: '',
        clearError: mockClearError,
      };
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('requires valid input before attempting login', () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: '',
        login: mockLogin,
        clearError: mockClearError,
      };
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText('Enter your email address');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
      fireEvent.click(submitBtn);

      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'Secret123!');
    });
  });

  describe('2. SignupPage Role Selection & Inputs', () => {
    it('renders customer and technician registration options and input fields', () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: '',
        clearError: mockClearError,
        register: mockRegister,
      };
      render(
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /customer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /technician/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    });
  });

  describe('3. ProtectedRoute & RBAC Boundaries', () => {
    it('shows loading spinner when auth is verifying session', () => {
      mockAuthState = { user: null, isAuthenticated: false, loading: true };
      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Secret Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText(/verifying session/i)).toBeInTheDocument();
      expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    });

    it('redirects to /login when unauthenticated', () => {
      mockAuthState = { user: null, isAuthenticated: false, loading: false };
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Screen</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
      expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    });

    it('renders content when user is authenticated with permitted role', () => {
      mockAuthState = {
        user: { name: 'Customer Jane', role: 'CUSTOMER' },
        isAuthenticated: true,
        loading: false,
      };
      render(
        <MemoryRouter>
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <div>Customer Only Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Customer Only Content')).toBeInTheDocument();
    });

    it('shows Access Restricted when user role does not match permitted role', () => {
      mockAuthState = {
        user: { name: 'Technician Bob', role: 'TECHNICIAN' },
        isAuthenticated: true,
        loading: false,
      };
      render(
        <MemoryRouter>
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <div>Admin Super Secret</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
      expect(screen.getByText(/TECHNICIAN/i)).toBeInTheDocument();
      expect(screen.queryByText('Admin Super Secret')).not.toBeInTheDocument();
    });
  });
});
