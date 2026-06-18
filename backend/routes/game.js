const express = require('express');
const Game = require('../models/Game');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const GAME_CONFIGS = {
  classic: { numbers: 6, range: 49, ticketCost: 50, prizes: { 6: 10000, 5: 2000, 4: 500, 3: 100, 2: 20 } },
  speed:   { numbers: 5, range: 36, ticketCost: 30, prizes: { 5: 5000,  4: 1000, 3: 200, 2: 40 } },
  mega:    { numbers: 7, range: 70, ticketCost: 100, prizes: { 7: 50000, 6: 10000, 5: 2000, 4: 500, 3: 150 } }
};

function generateNumbers(count, max) {
  const nums = new Set();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * max) + 1);
  }
  return [...nums].sort((a, b) => a - b);
}

function getPrizeType(matchCount, gameType) {
  const total = GAME_CONFIGS[gameType].numbers;
  if (matchCount === total) return 'jackpot';
  if (matchCount === total - 1) return 'platinum';
  if (matchCount === total - 2) return 'gold';
  if (matchCount === total - 3) return 'silver';
  if (matchCount >= 2) return 'bronze';
  return 'none';
}

// Play a game
router.post('/play', auth, async (req, res) => {
  try {
    const { gameType = 'classic', selectedNumbers } = req.body;
    const config = GAME_CONFIGS[gameType];

    if (!config) {
      return res.status(400).json({ message: 'Etibarsız oyun növü' });
    }

    if (req.user.coins < config.ticketCost) {
      return res.status(400).json({ message: 'Kifayət qədər coin yoxdur' });
    }

    let ticketNumbers;
    if (selectedNumbers && selectedNumbers.length === config.numbers) {
      ticketNumbers = selectedNumbers.sort((a, b) => a - b);
    } else {
      ticketNumbers = generateNumbers(config.numbers, config.range);
    }

    const drawnNumbers = generateNumbers(config.numbers, config.range);
    const matchedNumbers = ticketNumbers.filter(n => drawnNumbers.includes(n));
    const matchCount = matchedNumbers.length;

    const winAmount = config.prizes[matchCount] || 0;
    const isWin = winAmount > 0;
    const prizeType = getPrizeType(matchCount, gameType);

    // Deduct cost and add winnings
    req.user.coins -= config.ticketCost;
    req.user.coins += winAmount;
    req.user.totalGames += 1;

    if (isWin) {
      req.user.totalWins += 1;
      if (winAmount > req.user.biggestWin) req.user.biggestWin = winAmount;
    }

    // Update VIP level
    if (req.user.totalGames >= 500) req.user.vipLevel = 5;
    else if (req.user.totalGames >= 200) req.user.vipLevel = 4;
    else if (req.user.totalGames >= 100) req.user.vipLevel = 3;
    else if (req.user.totalGames >= 50) req.user.vipLevel = 2;
    else if (req.user.totalGames >= 10) req.user.vipLevel = 1;

    await req.user.save();

    const game = new Game({
      userId: req.user._id,
      username: req.user.username,
      gameType,
      ticketNumbers,
      drawnNumbers,
      matchedNumbers,
      betAmount: config.ticketCost,
      winAmount,
      matchCount,
      prizeType,
      isWin
    });
    await game.save();

    res.json({
      game,
      user: req.user,
      message: isWin ? `🎉 Qazandınız! +${winAmount} coin` : 'Şans gəlir! Yenidən cəhd edin'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası', error: error.message });
  }
});

// Get user game history
router.get('/history', auth, async (req, res) => {
  try {
    const games = await Game.find({ userId: req.user._id })
      .sort({ playedAt: -1 })
      .limit(20);
    res.json({ games });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Get game configs
router.get('/configs', (req, res) => {
  res.json({ configs: GAME_CONFIGS });
});

// Buy coins
router.post('/buy-coins', auth, async (req, res) => {
  try {
    const { package: pkg } = req.body;
    const packages = {
      starter: 1000,
      popular: 5000,
      premium: 15000,
      vip: 50000
    };
    if (!packages[pkg]) {
      return res.status(400).json({ message: 'Etibarsız paket' });
    }
    req.user.coins += packages[pkg];
    await req.user.save();
    res.json({ coins: req.user.coins, added: packages[pkg] });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
