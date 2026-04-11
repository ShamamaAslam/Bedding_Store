import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

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

// ── Wishlist ──────────────────────────────────────────────
export const getWishlist = () => API.get('/auth/wishlist');
export const addToWishlist = (productId) => API.post(`/auth/wishlist/${productId}`);
export const removeFromWishlist = (productId) => API.delete(`/auth/wishlist/${productId}`);

// ── Categories ────────────────────────────────────────────
export const getCategories = () => API.get('/categories');
export const createCategory = (data) => API.post('/categories', data);
export const deleteCategory = (id) => API.delete(`/categories/${id}`);

// ── Products ──────────────────────────────────────────────
export const getProducts = (params) => API.get('/products', { params });
export const getProduct = (id) => API.get(`/products/${id}`);
export const createProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);

// ── Orders ────────────────────────────────────────────────
export const createOrder = (data) => API.post('/orders', data);
export const getUserOrders = () => API.get('/orders/my-orders');
export const getOrderById = (id) => API.get(`/orders/${id}`);

// ── Admin: Orders ─────────────────────────────────────────
export const getAllOrders = () => API.get('/orders/admin/all');
export const updateOrderStatus = (id, data) => API.put(`/orders/admin/${id}/status`, data);

// ── Admin: Users ──────────────────────────────────────────
export const getAllUsers = () => API.get('/auth/admin/users');
export const updateUserRole = (id, data) => API.patch(`/auth/admin/users/${id}`, data);

// ── Payment ───────────────────────────────────────────────
export const createPaymentIntent = (data) => API.post('/payment/create-intent', data);

// ── AI Assistant ───────────────────────────────────────────
export const assistantChat = (data) => API.post('/assistant/chat', data);
export const assistantSuggest = (q) => API.get('/assistant/suggest', { params: { q } });