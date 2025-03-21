const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Регистрация нового пользователя
router.post('/register', authController.register);

// Авторизация пользователя
router.post('/login', authController.login);

// Получение информации о текущем пользователе (требует аутентификации)
router.get('/me', auth, authController.getCurrentUser);

// Обновление данных пользователя
router.put('/update', auth, authController.updateUser);

// Изменение пароля
router.put('/change-password', auth, authController.changePassword);

module.exports = router;