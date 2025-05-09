import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Создание экземпляра axios с базовым URL
const api = axios.create({
  baseURL: API_URL
});

// Добавление токена к запросам
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API методы
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getCurrentUser: () => api.get('/auth/me')
};

export const productsAPI = {
  getAll: (filters) => api.get('/products', { params: filters }),
  getById: (id) => api.get(`/products/${id}`),
  create: (productData) => {
    // Для отправки файлов используем FormData
    const formData = new FormData();

    Object.keys(productData).forEach(key => {
      if (key === 'image') {
        formData.append('image', productData.image);
      } else {
        formData.append(key, productData[key]);
      }
    });

    return api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, productData) => api.put(`/products/${id}`, productData),
  delete: (id) => api.delete(`/products/${id}`)
};
export const cartAPI = {
  // Получение содержимого корзины текущего пользователя
  getCart: () => api.get('/cart'),
  
  // Добавление товара в корзину
  addToCart: (productId, quantity = 1) => api.post('/cart', { productId, quantity }),
  
  // Обновление количества товара в корзине
  updateCartItem: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }),
  
  // Удаление товара из корзины
  removeFromCart: (itemId) => api.delete(`/cart/items/${itemId}`),
  
  // Очистка всей корзины
  clearCart: () => api.delete('/cart')
};
// Аналогично для других сущностей (корзина, заказы и т.д.)

export default api;