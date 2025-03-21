const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const seller = require('../middleware/seller');

// Получение всех категорий (публичный доступ)
router.get('/', categoryController.getAllCategories);

// Получение категории по ID (публичный доступ)
router.get('/:id', categoryController.getCategoryById);

// Создание новой категории (только для продавца)
router.post('/', auth, seller, categoryController.createCategory);

// Обновление категории (только для продавца)
router.put('/:id', auth, seller, categoryController.updateCategory);

// Удаление категории (только для продавца)
router.delete('/:id', auth, seller, categoryController.deleteCategory);

module.exports = router;