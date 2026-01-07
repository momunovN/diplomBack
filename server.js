const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS для продакшена
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://film-live.vercel.app',// или ваш фронтенд домен
];

app.use(cors({
  origin: function (origin, callback) {
    // Разрешить запросы без origin
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));

// Health check для деплоя
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'NEWKINO API',
    version: '1.0.0',
    nodeVersion: process.version
  });
});

// MongoDB подключение
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB подключён успешно'))
  .catch(err => {
    console.error('❌ Ошибка MongoDB:', err);
    // Не завершаем процесс, сервер продолжит работать без БД
  });

// // Обработка 404 для API (ИСПРАВЛЕННЫЙ СИНТАКСИС)
// Вместо '/api/*' используйте регулярное выражение
app.all(/^\/api\//, (req, res, next) => {
  // Если ни один из API роутов не совпал
  if (!req.route) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path 
    });
  }
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NEWKINO API Server',
    endpoints: {
      auth: '/api/auth',
      bookings: '/api/bookings',
      health: '/api/health'
    },
    docs: 'See documentation for more information'
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB: ${process.env.MONGO_URI ? 'подключен' : 'не настроен'}`);
  console.log(`🎯 Яндекс OAuth: ${process.env.YANDEX_CLIENT_ID ? 'настроен' : 'не настроен'}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});