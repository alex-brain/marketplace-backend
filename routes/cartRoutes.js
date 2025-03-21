const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

// Получение корзины пользователя (требует аутентификации)
router.get('/', auth, cartController.getCart);

// Добавление товара в корзину (требует аутентификации)
router.post('/add', auth, cartController.addToCart);

// Обновление количества товара в корзине (требует аутентификации)
router.put('/items/:itemId', auth, cartController.updateCartItem);

// Удаление товара из корзины (требует аутентификации)
router.delete('/items/:itemId', auth, cartController.removeFromCart);

// Очистка корзины (требует аутентификации)
router.delete('/clear', auth, cartController.clearCart);

module.exports = router;