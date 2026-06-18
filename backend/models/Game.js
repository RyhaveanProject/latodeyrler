const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  gameType: {
    type: String,
    enum: ['classic', 'speed', 'mega'],
    default: 'classic'
  },
  ticketNumbers: [{
    type: Number
  }],
  drawnNumbers: [{
    type: Number
  }],
  matchedNumbers: [{
    type: Number
  }],
  betAmount: {
    type: Number,
    required: true
  },
  winAmount: {
    type: Number,
    default: 0
  },
  matchCount: {
    type: Number,
    default: 0
  },
  prizeType: {
    type: String,
    enum: ['none', 'bronze', 'silver', 'gold', 'platinum', 'jackpot'],
    default: 'none'
  },
  isWin: {
    type: Boolean,
    default: false
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
});

gameSchema.index({ userId: 1, playedAt: -1 });
gameSchema.index({ winAmount: -1 });

module.exports = mongoose.model('Game', gameSchema);
