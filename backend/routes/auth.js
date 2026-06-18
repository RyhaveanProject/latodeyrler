const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Bütün sahələri doldurun' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu istifadəçi adı və ya email artıq mövcuddur' });
    }
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'İstifadəçi adı və ya şifrə yanlışdır' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Update avatar
router.patch('/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    const avatars = ['🎯', '🌟', '💎', '🔥', '🚀', '👑', '🎪', '🎨', '🏆', '⚡'];
    if (!avatars.includes(avatar)) {
      return res.status(400).json({ message: 'Etibarsız avatar' });
    }
    req.user.avatar = avatar;
    await req.user.save();
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

// Daily bonus
router.post('/daily-bonus', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastLogin = new Date(req.user.lastLogin);
    lastLogin.setHours(0, 0, 0, 0);

    if (lastLogin.getTime() >= today.getTime()) {
      return res.status(400).json({ message: 'Gündəlik bonus artıq alınıb' });
    }

    const bonus = 500;
    req.user.coins += bonus;
    req.user.lastLogin = new Date();
    await req.user.save();
    res.json({ message: `${bonus} coin bonus aldınız!`, coins: req.user.coins });
  } catch (error) {
    res.status(500).json({ message: 'Server xətası' });
  }
});

module.exports = router;
