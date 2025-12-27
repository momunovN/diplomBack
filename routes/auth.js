const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const jwt = require('jsonwebtoken');

// Сначала объявляем middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Нет токена' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Теперь используем его в роутах
router.post('/register', register); // ← УБРАЛ authMiddleware с register!
router.post('/login', login);       // ← УБРАЛ authMiddleware с login!

// Если хочешь защитить другие роуты — используй на них, но НЕ на register/login

module.exports = router;