const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Регистрация нового пользователя
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Проверка существования пользователя
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'customer']
    );

    // Создание корзины для нового пользователя
    await db.query(
      'INSERT INTO cart (user_id) VALUES (?)',
      [result.insertId]
    );

    // Генерация JWT
    const token = jwt.sign(
      { userId: result.insertId, email, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Получение данных созданного пользователя
    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Авторизация пользователя
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const user = users[0];

    // Проверка пароля
     const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Генерация JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Отправка данных без пароля
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Авторизация успешна',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение информации о текущем пользователе
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.userData.userId;

    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Обновление данных пользователя
exports.updateUser = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { name, email } = req.body;

    // Проверка существования email
    if (email) {
      const [existingUsers] = await db.query(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email уже используется' });
      }
    }

    // Обновление данных
    await db.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, userId]
    );

    // Получение обновленных данных
    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(200).json({
      message: 'Данные пользователя обновлены',
      user: users[0]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Изменение пароля
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { currentPassword, newPassword } = req.body;

    // Получение текущего пароля
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверка текущего пароля
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный текущий пароль' });
    }

    // Хеширование нового пароля
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновление пароля
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};