const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const seller = require('../middleware/seller');

// Получение всех заказов пользователя (для покупателя - свои, для продавца - все)
router.get('/', auth, orderController.getOrders);

// Получение заказа по ID
router.get('/:id', auth, orderController.getOrderById);

// Создание нового заказа (требует аутентификации)
router.post('/', auth, orderController.createOrder);

// Обновление статуса заказа (только для продавца)
router.put('/:id/status', auth, seller, orderController.updateOrderStatus);

// Получение количества заказов по статусам (только для продавца)
router.get('/stats/count', auth, seller, orderController.getOrdersCount);

// Получение суммы продаж за период (только для продавца)
router.get('/stats/sales', auth, seller, orderController.getSalesStats);

// Отмена заказа (для покупателя - только свои в статусе pending, для продавца - любые)
router.put('/:id/cancel', auth, orderController.cancelOrder);

module.exports = router;