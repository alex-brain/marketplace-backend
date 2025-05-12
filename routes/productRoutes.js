const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const seller = require('../middleware/seller');
const multer = require('multer');
const path = require('path');

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Максимальный размер 5MB
  }
});

// Получение всех товаров (публичный доступ)
router.get('/', productController.getAllProducts);

// Получение товара по ID (публичный доступ)
router.get('/:id', productController.getProductById);

// Поиск товаров (публичный доступ)
router.get('/search/:query', productController.searchProducts);

// Создание нового товара (только для продавца)
router.post(
  '/',
  // auth,
  // seller,
  upload.single('image'),
  productController.createProduct
);

// Обновление товара (только для продавца)
router.put(
  '/:id',
  auth,
  seller,
  upload.single('image'),
  productController.updateProduct
);

// Удаление товара (только для продавца)
router.delete('/:id', auth, seller, productController.deleteProduct);

// Получение товаров по категории
router.get('/category/:categoryId', productController.getProductsByCategory);

module.exports = router;