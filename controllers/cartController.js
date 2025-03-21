const db = require('../config/db');

// Получение корзины пользователя
exports.getCart = async (req, res) => {
  try {
    const userId = req.userData.userId;

    // Получаем ID корзины пользователя
    const [carts] = await db.query(
      'SELECT id FROM cart WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      // Создаем корзину, если она не существует
      const [newCart] = await db.query(
        'INSERT INTO cart (user_id) VALUES (?)',
        [userId]
      );

      return res.status(200).json({
        cartId: newCart.insertId,
        items: [],
        total: 0
      });
    }

    const cartId = carts[0].id;

    // Получаем товары в корзине с деталями
    const [items] = await db.query(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cartId]);

    // Рассчитываем общую стоимость
    let total = 0;
    const cartItems = items.map(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      return {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product_id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          stock: item.stock
        }
      };
    });

    res.status(200).json({
      cartId,
      items: cartItems,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Добавление товара в корзину
exports.addToCart = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { productId, quantity } = req.body;

    // Проверяем наличие товара
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    const product = products[0];

    // Проверяем наличие достаточного количества товара
    if (product.stock < quantity) {
      return res.status(400).json({
        message: 'Недостаточное количество товара на складе'
      });
    }

    // Получаем ID корзины пользователя
    const [carts] = await db.query(
      'SELECT id FROM cart WHERE user_id = ?',
      [userId]
    );

    let cartId;

    if (carts.length === 0) {
      // Создаем корзину, если она не существует
      const [newCart] = await db.query(
        'INSERT INTO cart (user_id) VALUES (?)',
        [userId]
      );

      cartId = newCart.insertId;
    } else {
      cartId = carts[0].id;
    }

    // Проверяем, есть ли уже этот товар в корзине
    const [existingItems] = await db.query(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, productId]
    );

    if (existingItems.length > 0) {
      // Обновляем количество, если товар уже в корзине
      const newQuantity = existingItems[0].quantity + quantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          message: 'Недостаточное количество товара на складе'
        });
      }

      await db.query(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );
    } else {
      // Добавляем новый товар в корзину
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
        [cartId, productId, quantity]
      );
    }

    res.status(200).json({ message: 'Товар добавлен в корзину' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Обновление количества товара в корзине
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { quantity } = req.body;
    const itemId = req.params.itemId;

    // Проверяем доступ пользователя к корзине
    const [cartItems] = await db.query(`
      SELECT ci.*, p.stock, c.user_id
      FROM cart_items ci
      JOIN cart c ON ci.cart_id = c.id
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ?
    `, [itemId]);

    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'Товар в корзине не найден' });
    }

    const cartItem = cartItems[0];

    if (cartItem.user_id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Проверяем наличие достаточного количества товара
    if (quantity > cartItem.stock) {
      return res.status(400).json({
        message: 'Недостаточное количество товара на складе'
      });
    }

    // Обновляем количество
    await db.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ?',
      [quantity, itemId]
    );

    res.status(200).json({ message: 'Количество товара обновлено' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Удаление товара из корзины
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const itemId = req.params.itemId;

    // Проверяем доступ пользователя к корзине
    const [cartItems] = await db.query(`
      SELECT c.user_id
      FROM cart_items ci
      JOIN cart c ON ci.cart_id = c.id
      WHERE ci.id = ?
    `, [itemId]);

    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'Товар в корзине не найден' });
    }

    if (cartItems[0].user_id !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Удаляем товар из корзины
    await db.query('DELETE FROM cart_items WHERE id = ?', [itemId]);

    res.status(200).json({ message: 'Товар удален из корзины' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Очистка корзины
exports.clearCart = async (req, res) => {
  try {
    const userId = req.userData.userId;

    // Получаем ID корзины пользователя
    const [carts] = await db.query(
      'SELECT id FROM cart WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      return res.status(404).json({ message: 'Корзина не найдена' });
    }

    const cartId = carts[0].id;

    // Удаляем все товары из корзины
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    res.status(200).json({ message: 'Корзина очищена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};