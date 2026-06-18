const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');

const router = express.Router();

// Top players by coins
router.get('/top', async (req, res) => {
  try {
    const topPlayers = await User.find({}, 'username coins totalWins totalGames biggestWin avatar vipLevel')
      .sort({ coins: -1 })
      .limit(10);
    res.json({ players: topPlayers });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Recent big wins
router.get('/recent-wins', async (req, res) => {
  try {
    const recentWins = await Game.find({ isWin: true, winAmount: { $gt: 500 } })
      .sort({ playedAt: -1 })
      .limit(10)
      .select('username winAmount prizeType gameType playedAt');
    res.json({ wins: recentWins });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Global stats
router.get('/stats', async (req, res) => {
  try {
    const totalPlayers = await User.countDocuments();
    const totalGames = await Game.countDocuments();
    const totalWins = await Game.countDocuments({ isWin: true });
    const biggestWinDoc = await Game.findOne({ isWin: true }).sort({ winAmount: -1 });

    res.json({
      totalPlayers,
      totalGames,
      totalWins,
      biggestWin: biggestWinDoc?.winAmount || 0,
      biggestWinner: biggestWinDoc?.username || '-'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
