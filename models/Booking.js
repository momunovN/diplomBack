const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, required: true }, // или movieTitle — выбирай одно
  movieId: { type: Number },
  date: { type: Date, required: true },
  seats: { type: Number, required: true },
  name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);