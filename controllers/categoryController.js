const db = require('../config/db');

// Получение всех категорий
exports.getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.status(200).json({ categories: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение категории по ID
exports.getCategoryById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    res.status(200).json({ category: rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Создание новой категории
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const [result] = await db.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );

    res.status(201).json({
      message: 'Категория успешно создана',
      categoryId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Обновление категории
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryId = req.params.id;

    const [result] = await db.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    res.status(200).json({ message: 'Категория успешно обновлена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Удаление категории
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Проверяем, есть ли товары в этой категории
    const [products] = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [categoryId]
    );

    if (products[0].count > 0) {
      return res.status(400).json({
        message: 'Нельзя удалить категорию, в которой есть товары'
      });
    }

    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [categoryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    res.status(200).json({ message: 'Категория успешно удалена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};