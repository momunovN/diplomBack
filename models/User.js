const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: function() {
      return !this.yandexId; // Обязателен, если нет Yandex ID
    },
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.yandexId; // Обязателен, если нет Yandex ID
    },
  },
  // Поля для OAuth Яндекс
  yandexId: {
    type: String,
    unique: true,
    sparse: true,
  },
  displayName: {
    type: String,
  },
  avatar: {
    type: String,
  },
  // Объединение аккаунтов
  provider: {
    type: String,
    enum: ['local', 'yandex'],
    default: 'local',
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);