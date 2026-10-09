import axios from 'axios';

/**
 * Base Axios instance configured with environment-based base URL
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

/**
 * Request interceptor: Automatically attach JWT Bearer token if present in localStorage
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Global response interceptor for clean error handling
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract server message or fallback
    const message =
      error.response?.data?.message ||
      error.message ||
      'Network error connecting to HomeServe API';

    const customError = {
      message,
      status: error.response?.status || null,
      data: error.response?.data || null,
    };
    return Promise.reject(customError);
  }
);

/**
 * API Service Modules
 */

// Health Service
export const healthService = {
  /**
   * Check backend server & database health
   * @returns {Promise<{success: boolean, message: string, database: string}>}
   */
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Authentication Service
export const authService = {
  /**
   * Register a new user
   * @param {{name: string, email: string, password: string, phone?: string, role?: string}} userData
   * @returns {Promise<{success: boolean, token: string, user: object}>}
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Login user with credentials
   * @param {{email: string, password: string}} credentials
   * @returns {Promise<{success: boolean, token: string, user: object}>}
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Fetch authenticated user's profile
   * @returns {Promise<{success: boolean, user: object}>}
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Services Service (MongoDB Integration)
export const serviceService = {
  /**
   * Fetch active services with optional search and category filters
   * @param {{search?: string, category?: string}} [params]
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  getAll: async (params = {}) => {
    const response = await api.get('/services', { params });
    return response.data;
  },

  /**
   * Fetch single service by slug or ObjectId
   * @param {string} slugOrId
   * @returns {Promise<{success: boolean, data: object}>}
   */
  getById: async (slugOrId) => {
    const response = await api.get(`/services/${slugOrId}`);
    return response.data;
  },

  /**
   * Create a new service (Admin only)
   * @param {object} serviceData
   * @returns {Promise<{success: boolean, data: object}>}
   */
  create: async (serviceData) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },

  /**
   * Update service by slug or ObjectId (Admin only)
   * @param {string} slugOrId
   * @param {object} serviceData
   * @returns {Promise<{success: boolean, data: object}>}
   */
  update: async (slugOrId, serviceData) => {
    const response = await api.put(`/services/${slugOrId}`, serviceData);
    return response.data;
  },

  /**
   * Soft-delete service by slug or ObjectId (Admin only)
   * @param {string} slugOrId
   * @returns {Promise<{success: boolean, data: object}>}
   */
  delete: async (slugOrId) => {
    const response = await api.delete(`/services/${slugOrId}`);
    return response.data;
  },
};

// Technician Service
export const technicianService = {
  /**
   * Get own technician profile
   * @returns {Promise<{success: boolean, profileExists: boolean, data?: object}>}
   */
  getMyProfile: async () => {
    const response = await api.get('/technicians/me');
    return response.data;
  },

  /**
   * Create technician profile (onboarding)
   * @param {{skills: string[], experience: number, description: string, profileImage?: string, documents?: object[]}} profileData
   * @returns {Promise<{success: boolean, data: object}>}
   */
  createProfile: async (profileData) => {
    const response = await api.post('/technicians/profile', profileData);
    return response.data;
  },

  /**
   * Update own technician profile
   * @param {object} profileData
   * @returns {Promise<{success: boolean, data: object}>}
   */
  updateProfile: async (profileData) => {
    const response = await api.put('/technicians/profile', profileData);
    return response.data;
  },

  /**
   * Toggle availability (ONLINE / OFFLINE)
   * @param {boolean} isAvailable
   * @returns {Promise<{success: boolean, data: {isAvailable: boolean}}>}
   */
  toggleAvailability: async (isAvailable) => {
    const response = await api.patch('/technicians/availability', { isAvailable });
    return response.data;
  },
};

// Admin Technician Service
export const adminTechnicianService = {
  /**
   * Get all technician applications
   * @param {{status?: string, search?: string}} [params]
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  getAll: async (params = {}) => {
    const response = await api.get('/admin/technicians', { params });
    return response.data;
  },

  /**
   * Get single technician by technician profile ID
   * @param {string} id
   * @returns {Promise<{success: boolean, data: object}>}
   */
  getById: async (id) => {
    const response = await api.get(`/admin/technicians/${id}`);
    return response.data;
  },

  /**
   * Approve a technician application
   * @param {string} id
   * @returns {Promise<{success: boolean, data: object}>}
   */
  approve: async (id) => {
    const response = await api.patch(`/admin/technicians/${id}/approve`);
    return response.data;
  },

  /**
   * Reject a technician application
   * @param {string} id
   * @param {string} [rejectionReason]
   * @returns {Promise<{success: boolean, data: object}>}
   */
  reject: async (id, rejectionReason = '') => {
    const response = await api.patch(`/admin/technicians/${id}/reject`, { rejectionReason });
    return response.data;
  },
};

// Booking Service
export const bookingService = {
  /**
   * Create a new booking (CUSTOMER only)
   * @param {object} bookingData
   * @returns {Promise<{success: boolean, data: object, pricing: object}>}
   */
  create: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  /**
   * List authenticated customer's bookings
   * @param {{status?: string}} [params]
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  getMyBookings: async (params = {}) => {
    const response = await api.get('/bookings/my', { params });
    return response.data;
  },

  /**
   * Get booking detail by ID (ownership is enforced on backend)
   * @param {string} id
   * @returns {Promise<{success: boolean, data: object}>}
   */
  getById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  /**
   * Get latest live GPS location for an active booking (Phase 8)
   * @param {string} id
   * @returns {Promise<{success: boolean, data: {bookingId: string, status: string, isEligible: boolean, isSharing: boolean, location: object|null}}>}
   */
  getLocation: async (id) => {
    const response = await api.get(`/bookings/${id}/location`);
    return response.data;
  },

  /**
   * Cancel a booking (CUSTOMER, only while REQUESTED or ACCEPTED)
   * @param {string} id
   * @param {string} [cancellationReason]
   * @returns {Promise<{success: boolean, data: object}>}
   */
  cancel: async (id, cancellationReason = '') => {
    const response = await api.patch(`/bookings/${id}/cancel`, { cancellationReason });
    return response.data;
  },

  // ── Technician ──────────────────────────────────────────────────────────

  /**
   * Get pending requests assigned to the authenticated technician
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  getTechnicianRequests: async () => {
    const response = await api.get('/bookings/technician/requests');
    return response.data;
  },

  /**
   * Get all bookings for the authenticated technician
   * @param {{status?: string}} [params]
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  getTechnicianBookings: async (params = {}) => {
    const response = await api.get('/bookings/technician/my', { params });
    return response.data;
  },

  /**
   * Technician accepts an assigned booking request
   * @param {string} id
   * @returns {Promise<{success: boolean, data: object}>}
   */
  accept: async (id) => {
    const response = await api.patch(`/bookings/${id}/accept`);
    return response.data;
  },

  /**
   * Technician rejects an assigned booking request
   * @param {string} id
   * @returns {Promise<{success: boolean, data: object}>}
   */
  reject: async (id) => {
    const response = await api.patch(`/bookings/${id}/reject`);
    return response.data;
  },

  /**
   * Technician updates job status
   * @param {string} id
   * @param {string} status - New status
   * @returns {Promise<{success: boolean, data: object}>}
   */
  updateStatus: async (id, status) => {
    const response = await api.patch(`/bookings/${id}/status`, { status });
    return response.data;
  },

  // ── Admin ───────────────────────────────────────────────────────────────

  /**
   * Admin: list all bookings with optional filters
   * @param {{status?: string, customerId?: string, technicianId?: string}} [params]
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  adminGetAll: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },
};

export default api;

