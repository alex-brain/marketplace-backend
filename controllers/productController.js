const db = require('../config/db');

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
  try {
    const { name, description, price, stock, category_id } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Преобразуем пустую строку в null
    const categoryId = category_id === '' ? null : category_id;

    const [result] = await db.query(
      'INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, price, stock, imageUrl, categoryId]
    );

    res.status(201).json({
      message: 'Товар успешно создан',
      productId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Обновление товара
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category_id } = req.body;
    const productId = req.params.id;
    let imageUrl = null;

    // Если загружено новое изображение
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      await db.query(
        'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ? WHERE id = ?',
        [name, description, price, stock, imageUrl, category_id, productId]
      );
    } else {
      // Если изображение не обновляем
      await db.query(
        'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ? WHERE id = ?',
        [name, description, price, stock, category_id, productId]
      );
    }

    res.status(200).json({ message: 'Товар успешно обновлен' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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