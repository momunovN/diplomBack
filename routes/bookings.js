const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getBookings, createBooking } = require('../controllers/bookingController');

// Middleware проверки токена
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  console.log('Token received:', token ? 'Yes' : 'No');
  if (token) {
    console.log('Token preview:', token.substring(0, 20) + '...');
  }

  if (!token) {
    return res.status(401).json({ error: 'Нет токена' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token valid, user:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('Token invalid:', err.message);
    return res.status(401).json({ error: 'Неверный токен' });
  }
};

// Применяем middleware к роутам
router.get('/', authMiddleware, getBookings);
router.post('/', authMiddleware, createBooking);

module.exports = router;