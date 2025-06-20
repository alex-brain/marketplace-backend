const db = require('../config/db');

// Получение изображения товара
exports.getProductImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads', filename);// Проверяем существование файла
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: 'Изображение не найдено' });
    }

    // Отправляем файл
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение всех товаров
exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products');
    res.status(200).json({ products: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение товара по ID
exports.getProductById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    res.status(200).json({ product: rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Поиск товаров
exports.searchProducts = async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const [rows] = await db.query(
      'SELECT * FROM products WHERE name LIKE ? OR description LIKE ?',
      [query, query]
    );

    res.status(200).json({ products: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Создание нового товара
exports.createProduct = async (req, res) => {
  console.log('=== Создание нового продукта ===');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);

  try {
    const { name, description, price, stock, category_id } = req.body;

    // Валидация обязательных полей
    if (!name || !price || !stock) {
      return res.status(400).json({
        message: 'Поля name, price и stock обязательны для заполнения'
      });
    }

    // Валидация типов данных
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: 'Цена должна быть положительным числом'
      });
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        message: 'Количество должно быть положительным числом'
      });
    }

    // Обработка изображения
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Обработка category_id (может быть пустой строкой)
    const categoryId = category_id && category_id !== '' ? parseInt(category_id) : null;

    console.log('Данные для вставки:', {
      name,
      description: description || null,
      price: parsedPrice,
      stock: parsedStock,
      imageUrl,
      categoryId
    });

    // Вставка в базу данных
    const [result] = await db.query(
      'INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || null, parsedPrice, parsedStock, imageUrl, categoryId]
    );

    // Получаем созданный продукт
    const [newProduct] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    console.log('Продукт успешно создан:', newProduct[0]);

    res.status(201).json({
      message: 'Товар успешно создан',
      product: newProduct[0]
    });

  } catch (error) {
    console.error('Ошибка при создании продукта:', error);

    // Удаляем загруженный файл в случае ошибки
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../uploads', req.file.filename);

      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          console.error('Ошибка при удалении файла:', unlinkError);
        }
      });
    }

    res.status(500).json({
      message: 'Ошибка сервера при создании товара',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Обновление товара
exports.updateProduct = async (req, res) => {
  console.log('=== Обновление продукта ===');
  console.log('Product ID:', req.params.id);
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);

  try {
    const productId = parseInt(req.params.id);
    const { name, description, price, stock, category_id } = req.body;

    // Проверяем существование продукта
    const [existingProduct] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        message: 'Товар не найден'
      });
    }

    // Валидация данных
    if (!name || !price || !stock) {
      return res.status(400).json({
        message: 'Поля name, price и stock обязательны для заполнения'
      });
    }

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: 'Цена должна быть положительным числом'
      });
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        message: 'Количество должно быть положительным числом'
      });
    }

    // Обработка изображения
    let imageUrl = existingProduct[0].image_url; // Сохраняем текущее изображение

    if (req.file) {
      // Удаляем старое изображение, если оно есть
      if (existingProduct[0].image_url) {
        const fs = require('fs');
        const path = require('path');
        const oldFilePath = path.join(__dirname, '..', existingProduct[0].image_url);

        fs.unlink(oldFilePath, (unlinkError) => {
          if (unlinkError) {
            console.error('Ошибка при удалении старого файла:', unlinkError);
          }
        });
      }

      imageUrl = `/uploads/${req.file.filename}`;
    }

    const categoryId = category_id && category_id !== '' ? parseInt(category_id) : null;

    // Обновляем продукт
    await db.query(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ? WHERE id = ?',
      [name, description || null, parsedPrice, parsedStock, imageUrl, categoryId, productId]
    );

    // Получаем обновленный продукт
    const [updatedProduct] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    console.log('Продукт успешно обновлен:', updatedProduct[0]);

    res.json({
      message: 'Товар успешно обновлен',
      product: updatedProduct[0]
    });

  } catch (error) {
    console.error('Ошибка при обновлении продукта:', error);

    // Удаляем загруженный файл в случае ошибки
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../uploads', req.file.filename);

      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          console.error('Ошибка при удалении файла:', unlinkError);
        }
      });
    }

    res.status(500).json({
      message: 'Ошибка сервера при обновлении товара',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Удаление товара
exports.deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    res.status(200).json({ message: 'Товар успешно удален' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение товаров по категории
exports.getProductsByCategory = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE category_id = ?',
      [req.params.categoryId]
    );

    res.status(200).json({ products: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};