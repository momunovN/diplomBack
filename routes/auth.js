const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { 
  getYandexAuthUrl, 
  yandexCallback, 
  checkAuth 
} = require('../controllers/oauthController');
const jwt = require('jsonwebtoken');

// Middleware
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

// Стандартная аутентификация
router.post('/register', register);
router.post('/login', login);

// Яндекс OAuth
router.get('/yandex/url', getYandexAuthUrl);
router.get('/yandex/callback', yandexCallback);

// Проверка авторизации
router.get('/check', checkAuth);

// Проверка конфигурации Яндекс OAuth (для отладки)
router.get('/yandex/config', (req, res) => {
  res.json({
    clientId: process.env.YANDEX_CLIENT_ID ? 'Установлен' : 'Не установлен',
    clientIdPreview: process.env.YANDEX_CLIENT_ID ? 
      process.env.YANDEX_CLIENT_ID.substring(0, 10) + '...' : 'Не установлен',
    callbackUrl: process.env.YANDEX_CALLBACK_URL,
    frontendUrl: process.env.FRONTEND_URL,
    hasClientSecret: !!process.env.YANDEX_CLIENT_SECRET,
    redirectUrl: process.env.YANDEX_CLIENT_ID ? 
      `https://oauth.yandex.ru/authorize?response_type=code&client_id=${process.env.YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.YANDEX_CALLBACK_URL)}` : 
      'Client ID не установлен'
  });
});

module.exports = router;