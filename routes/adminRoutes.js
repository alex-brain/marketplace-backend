const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const ProductController = require('../controllers/productController');
const OrderController = require('../controllers/orderController');
const CategoryController = require('../controllers/CategoryController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/seller');
//const upload = require('../middleware/uploadMiddleware');

// Проверка прав доступа для админ-маршрутов
//router.use(authMiddleware);
//router.use(adminMiddleware);

// Маршруты для администраторов
router.post('/register', AdminController.registerAdmin);
router.post('/login', AdminController.loginAdmin);
router.get('/profile', AdminController.getAdminProfile);
router.get('/all', AdminController.getAllAdmins);
router.get('/dashboard', AdminController.getDashboard);

// Управление продуктами
router.get('/products', ProductController.getAllProducts);
router.get('/products/:id', ProductController.getProductById);
//router.post('/products', upload.single('image'), ProductController.createProduct);
//router.put('/products/:id', upload.single('image'), ProductController.updateProduct);
router.delete('/products/:id', ProductController.deleteProduct);

// Управление заказами
router.get('/orders', OrderController.getOrders);
router.get('/orders/:id', OrderController.getOrderById);
router.put('/orders/:id/status', OrderController.updateOrderStatus);
router.get('/orders-count', OrderController.getOrdersCount);
router.get('/sales-stats', OrderController.getSalesStats);

module.exports = router;