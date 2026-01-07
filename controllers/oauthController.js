const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
const YANDEX_CALLBACK_URL = process.env.YANDEX_CALLBACK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://film-live.vercel.app';

// Получение URL для авторизации через Яндекс
exports.getYandexAuthUrl = (req, res) => {
  if (!YANDEX_CLIENT_ID || !YANDEX_CALLBACK_URL) {
    return res.status(500).json({ 
      error: 'Yandex OAuth не настроен на сервере',
      details: {
        hasClientId: !!YANDEX_CLIENT_ID,
        hasCallbackUrl: !!YANDEX_CALLBACK_URL,
        hasClientSecret: !!YANDEX_CLIENT_SECRET
      }
    });
  }

  const state = Math.random().toString(36).substring(7);
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(YANDEX_CALLBACK_URL)}&state=${state}`;
  
  console.log('Yandex auth URL generated:', {
    clientId: YANDEX_CLIENT_ID.substring(0, 10) + '...',
    callbackUrl: YANDEX_CALLBACK_URL,
    authUrl: authUrl.substring(0, 100) + '...'
  });
  
  res.json({ url: authUrl });
};

// Обработка callback от Яндекс
exports.yandexCallback = async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    console.log('Yandex callback received:', {
      code: code ? 'present' : 'missing',
      error: error || 'none',
      error_description: error_description || 'none'
    });

    if (error) {
      console.error('Yandex OAuth error:', error, error_description);
      return res.redirect(`${FRONTEND_URL}/?error=yandex_auth_failed&message=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/?error=no_auth_code`);
    }

    // 1. Получаем access_token от Яндекс (ИСПРАВЛЕННЫЙ ЗАПРОС)
    console.log('Exchanging code for token...');
    const tokenResponse = await axios.post('https://oauth.yandex.ru/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: YANDEX_CLIENT_ID,
        client_secret: YANDEX_CLIENT_SECRET,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log('Got access token from Yandex:', accessToken.substring(0, 20) + '...');

    // 2. Получаем информацию о пользователе
    console.log('Getting user info from Yandex...');
    const userResponse = await axios.get('https://login.yandex.ru/info', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
      params: {
        format: 'json',
      },
    });

    const yandexUser = userResponse.data;
    console.log('Yandex user info received:', {
      id: yandexUser.id,
      email: yandexUser.default_email,
      name: yandexUser.display_name,
      login: yandexUser.login
    });

    // 3. Ищем пользователя в базе
    console.log('Looking for user in database...');
    let user = await User.findOne({ 
      $or: [
        { yandexId: yandexUser.id },
        { email: yandexUser.default_email }
      ]
    });

    // 4. Если пользователь не найден - создаем нового
    if (!user) {
      console.log('User not found, creating new...');
      user = await User.create({
        yandexId: yandexUser.id,
        email: yandexUser.default_email || `yandex_${yandexUser.id}@yandex.com`,
        displayName: yandexUser.display_name || yandexUser.login || yandexUser.real_name || 'Yandex User',
        avatar: yandexUser.default_avatar_id ? 
          `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200` : null,
        provider: 'yandex',
      });
      console.log('New user created:', user.email);
    } else if (!user.yandexId) {
      // Если пользователь был зарегистрирован через email, привязываем Яндекс аккаунт
      console.log('User found, updating with Yandex ID...');
      user.yandexId = yandexUser.id;
      user.displayName = yandexUser.display_name || yandexUser.login || user.displayName;
      user.avatar = yandexUser.default_avatar_id ? 
        `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200` : user.avatar;
      user.provider = 'yandex';
      await user.save();
      console.log('Existing user updated with Yandex ID');
    } else {
      console.log('User already exists with Yandex ID:', user.email);
    }

    // 5. Создаем JWT токен
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        provider: user.provider,
        displayName: user.displayName
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    console.log('JWT token created, redirecting to frontend...');

    // 6. Редирект на фронтенд с токеном
    const redirectUrl = `${FRONTEND_URL}/auth-callback?token=${token}&email=${encodeURIComponent(user.email)}&provider=yandex&displayName=${encodeURIComponent(user.displayName || '')}&avatar=${encodeURIComponent(user.avatar || '')}`;
    console.log('Redirect URL:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Yandex OAuth error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      requestData: error.config?.data
    });
    
    const errorMessage = encodeURIComponent(error.response?.data?.error_description || error.message || 'Unknown error');
    res.redirect(`${FRONTEND_URL}/?error=yandex_auth_error&message=${errorMessage}`);
  }
};

// Проверка состояния авторизации
exports.checkAuth = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ isAuthenticated: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.json({ isAuthenticated: false });
    }

    res.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        provider: user.provider,
      }
    });
  } catch (err) {
    console.error('Auth check error:', err.message);
    res.json({ isAuthenticated: false });
  }
};