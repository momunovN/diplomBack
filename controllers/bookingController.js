const Booking = require("../models/Booking");

// Получить все брони пользователя
exports.getBookings = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    const bookings = await Booking.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res
      .status(500)
      .json({ error: "Ошибка сервера при получении бронирований" });
  }
};

// Создать бронь
exports.createBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { title, movieTitle, movieId, date, seats, name } = req.body;

    // Берём название из любого поля
    const finalTitle = title || movieTitle || 'Неизвестный фильм';

    if (!finalTitle || !seats) {
      return res.status(400).json({ error: 'Заполните обязательные поля: название фильма и количество мест' });
    }

    const booking = await Booking.create({
      userId: req.user.id,
      title: finalTitle,
      movieId: movieId || null,
      date: date || new Date(),
      seats: Number(seats),
      name: name || req.user.email || 'Аноним',
    });

    // Успешный ответ
    return res.status(201).json(booking);
  } catch (err) {
    console.error('Ошибка создания брони:', err);

    // Если ошибка валидации — возвращаем 400
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }

    // Любая другая ошибка — 500, но без падения сервера
    return res.status(500).json({ error: 'Ошибка сервера при создании брони' });
  }
};
