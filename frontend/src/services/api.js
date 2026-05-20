import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
  }

  return 'http://localhost:5000/api';
};

const API = axios.create({ baseURL: getApiBaseUrl() });

API.interceptors.request.use((req) => {
  const stored = localStorage.getItem('user');

  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user?.token) {
        req.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {
      localStorage.removeItem('user');
    }
  }

  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('user');

      const path = window.location.pathname;
      const isAuthPage = path === '/login' || path === '/register';

      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getProfile = () => API.get('/auth/profile');
export const forgotPassword = (data) => API.post('/auth/forgotpassword', data);
export const resetPassword = (token, data) => API.put(`/auth/resetpassword/${token}`, data);
export const updatePassword = (data) => API.put('/auth/updatepassword', data);

// ── Wishlist ──────────────────────────────────────────────
export const getWishlist = () => API.get('/auth/wishlist');
export const addToWishlist = (productId) => API.post(`/auth/wishlist/${productId}`);
export const removeFromWishlist = (productId) => API.delete(`/auth/wishlist/${productId}`);

// ── Categories ────────────────────────────────────────────
export const getCategories = () => API.get('/categories');
export const createCategory = (data) => API.post('/categories', data);
export const updateCategory = (id, data) => API.put(`/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/categories/${id}`);

// ── Products ──────────────────────────────────────────────
export const getProducts = (params) => API.get('/products', { params });
export const getProduct = (id) => API.get(`/products/${id}`);
export const createProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const createProductReview = (id, data) => API.post(`/products/${id}/reviews`, data);

// ── Orders ────────────────────────────────────────────────
export const createOrder = (data) => API.post('/orders', data);
export const getUserOrders = () => API.get('/orders/my-orders');
export const getOrderById = (id) => API.get(`/orders/${id}`);
export const updateOrderShippingAddress = (id, data) => API.put(`/orders/${id}/shipping`, data);

// ── Admin: Orders ─────────────────────────────────────────
export const getAllOrders = () => API.get('/orders/admin/all');
export const updateOrderStatus = (id, data) => API.put(`/orders/admin/${id}/status`, data);

// ── Admin: Users ──────────────────────────────────────────
export const getAllUsers = () => API.get('/auth/admin/users');
export const updateUserRole = (id, data) => API.patch(`/auth/admin/users/${id}`, data);

// ── Payment ───────────────────────────────────────────────
export const createPaymentIntent = (data) => API.post('/payment/create-intent', data);
export const createPayfastSession = (data) => API.post('/payment/payfast/create-session', data);
export const verifyPayfastSession = (data) => API.post('/payment/payfast/verify', data);

// ── AI Assistant ───────────────────────────────────────────
export const assistantChat = (data) => API.post('/assistant/chat', data);
export const assistantSuggest = (q) => API.get('/assistant/suggest', { params: { q } });
export const assistantSeo = (data) => API.post('/assistant/seo', data);

// ── Analytics ──────────────────────────────────────────────
export const getAnalytics = () => API.get('/analytics');
export const getPersonalizedRecommendations = (params) => API.get('/analytics/recommendations', { params });
export const logAnalyticsEvent = (data) => API.post('/analytics/events', data);

// ── Contact ─────────────────────────────────────────────────
export const sendContactForm = (data) => API.post('/contact', data);