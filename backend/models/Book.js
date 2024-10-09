const mongoose = require('mongoose');

// Book schema
const bookSchema = mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  imageUrl: { type: String, required: true },
  year: { type: Number, required: true },
  genre: { type: String, required: true },
  ratings: [
    {
        userId: { type: String },
        grade: { type: Number },
    }
  ],
  averageRating: { type: Number },
});

// reusable model export
module.exports = mongoose.model('Book', bookSchema);