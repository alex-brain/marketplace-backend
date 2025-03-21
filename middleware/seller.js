// Middleware для проверки роли продавца
module.exports = (req, res, next) => {
  if (req.userData.role !== 'seller') {
    return res.status(403).json({
      message: 'Доступ запрещен. Требуются права продавца.'
    });
  }
  next();
};