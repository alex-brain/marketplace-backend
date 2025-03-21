const db = require('../config/db');

// Получение заказов (для покупателя - свои, для продавца - все)
exports.getOrders = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const userRole = req.userData.role;

    let query;
    let params = [];

    if (userRole === 'seller') {
      // Для продавца - все заказы
      query = `
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
    } else {
      // Для покупателя - только свои заказы
      query = `
        SELECT o.*
        FROM orders o
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
      `;
      params.push(userId);
    }

    const [orders] = await db.query(query, params);

    // Получение элементов для каждого заказа
    for (let order of orders) {
      const [items] = await db.query(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      order.items = items;
    }

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение заказа по ID
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const userRole = req.userData.role;
    const orderId = req.params.id;

    // Запрос заказа
    const [orders] = await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    const order = orders[0];

    // Проверка прав доступа
    if (userRole !== 'seller' && order.user_id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Получение элементов заказа
    const [items] = await db.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    order.items = items;

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Создание заказа
exports.createOrder = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { shippingAddress, paymentMethod } = req.body;

    // Начало транзакции
    await db.query('START TRANSACTION');

    // Получаем корзину пользователя
    const [carts] = await db.query(
      'SELECT id FROM cart WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: 'Корзина пуста' });
    }

    const cartId = carts[0].id;

    // Получаем товары из корзины
    const [cartItems] = await db.query(`
      SELECT ci.product_id, ci.quantity, p.price, p.stock, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cartId]);

    if (cartItems.length === 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: 'Корзина пуста' });
    }

    // Проверяем наличие товаров на складе
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: `Недостаточное количество товара "${item.name}" на складе`
        });
      }
    }

    // Рассчитываем общую сумму заказа
    let totalAmount = 0;
    for (const item of cartItems) {
      totalAmount += item.price * item.quantity;
    }

    // Создаем заказ
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method) VALUES (?, ?, ?, ?, ?)',
      [userId, totalAmount, 'pending', shippingAddress, paymentMethod]
    );

    const orderId = orderResult.insertId;

    // Добавляем товары в заказ
    for (const item of cartItems) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Уменьшаем количество товара на складе
      await db.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Очищаем корзину
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    // Фиксируем изменения
    await db.query('COMMIT');

    res.status(201).json({
      message: 'Заказ успешно создан',
      orderId
    });
  } catch (error) {
    // Откат в случае ошибки
    await db.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  }
};

// Обновление статуса заказа
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Проверяем существование заказа
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    // Проверяем допустимость статуса
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус заказа' });
    }

    // Обновляем статус
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    res.status(200).json({ message: 'Статус заказа обновлен' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение количества заказов по статусам
exports.getOrdersCount = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    const counts = {
      all: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    rows.forEach(row => {
      counts[row.status] = row.count;
      counts.all += row.count;
    });

    res.status(200).json({ counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение статистики продаж
exports.getSalesStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as orders_count
      FROM orders
      WHERE status != 'cancelled'
    `;

    const params = [];

    if (startDate && endDate) {
      query += ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date';

    const [rows] = await db.query(query, params);

    // Расчет общей суммы
    let totalRevenue = 0;
    let totalOrders = 0;

    rows.forEach(row => {
      totalRevenue += parseFloat(row.revenue);
      totalOrders += row.orders_count;
    });

    res.status(200).json({
      salesData: rows,
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Отмена заказа
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const userRole = req.userData.role;
    const orderId = req.params.id;

    // Получаем информацию о заказе
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    const order = orders[0];

    // Проверка прав доступа
    if (userRole !== 'seller' && order.user_id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Покупатель может отменить только заказы в статусе 'pending'
    if (userRole !== 'seller' && order.status !== 'pending') {
      return res.status(400).json({
        message: 'Можно отменить только заказы в статусе "Ожидает обработки"'
      });
    }

    // Начинаем транзакцию
    await db.query('START TRANSACTION');

    // Обновляем статус заказа
    await db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId]);

    // Возвращаем товары на склад
    const [orderItems] = await db.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );

    for (const item of orderItems) {
      await db.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Фиксируем изменения
    await db.query('COMMIT');

    res.status(200).json({ message: 'Заказ успешно отменен' });
  } catch (error) {
    // Откатываем изменения в случае ошибки
    await db.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  }
};