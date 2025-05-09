const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Регистрация администратора (только для суперадминов)
exports.registerAdmin = async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь суперадмином
    if (req.userData.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { name, email, password, role } = req.body;
    
    // Проверяем, существует ли пользователь с таким email
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('Пытаемся найти пользователя:', email);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем нового пользователя с ролью admin
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'admin']
    );
    
    res.status(201).json({
      message: 'Администратор успешно зарегистрирован',
      userId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Вход администратора
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Пытаемся найти пользователя:', email);
    // Получаем пользователя с указанным email
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND (role = "admin" OR role = "seller")', [email]);
    console.log('Результат запроса:', users);
    if (users.length === 0) {
        console.log('Пользователь не найден');
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }
    
    const user = users[0];
    console.log('Роль пользователя:', user.role);
    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Пароль валиден:', isPasswordValid);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }
    
    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      message: 'Аутентификация успешна',
      token,
      userId: user.id,
      role: user.role,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение информации о текущем администраторе
exports.getAdminProfile = async (req, res) => {
  try {
    const userId = req.userData.userId;
    
    // Получаем данные пользователя без пароля
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

// Получение списка всех администраторов (только для суперадминов)
exports.getAllAdmins = async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь суперадмином
    if (req.userData.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    
    // Получаем всех пользователей с ролью admin, кроме текущего пользователя
    const [admins] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE role = "admin" OR role = "seller"'
    );
    
    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение дашборда (статистики)
exports.getDashboard = async (req, res) => {
  try {
    // Получаем статистику по товарам
    const [productStats] = await db.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_stock,
        AVG(price) as avg_price
      FROM products
    `);
    
    // Получаем статистику по заказам
    const [orderStats] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue
      FROM orders
      WHERE status != 'cancelled'
    `);
    
    // Получаем статистику по пользователям
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) as total_users
      FROM users
      WHERE role = 'user'
    `);
    
    // Получаем статистику по статусам заказов
    const [orderStatusStats] = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `);
    
    // Получаем последние 5 заказов
    const [recentOrders] = await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    
    // Получаем популярные товары (по количеству заказов)
    const [popularProducts] = await db.query(`
      SELECT 
        p.id, p.name, p.price, p.image_url,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT 5
    `);
    
    res.status(200).json({
      productStats: productStats[0],
      orderStats: orderStats[0],
      userStats: userStats[0],
      orderStatusStats,
      recentOrders,
      popularProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};