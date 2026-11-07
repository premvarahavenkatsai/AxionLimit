const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyJWT } = require('../middleware/auth');
require('../config/passport');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_axionlimit_key_12345!';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/?error=oauth_failed', session: false }),

  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.redirect(`${FRONTEND_URL}/#token=${token}`);
    } catch (err) {
      console.error('Callback token generation error:', err);
      res.redirect('/?error=server_error');
    }
  }
);

router.post('/dev-login', async (req, res) => {
  try {
    const devGoogleId = 'mock_dev_google_id_99999';
    let user = await User.findOne({ googleId: devGoogleId });

    if (!user) {
      user = new User({
        googleId: devGoogleId,
        email: 'dev.tester@axionlimit.local',
        name: 'Developer Mode Tester',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Developer'
      });
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('❌ Developer login error:', err);
    return res.status(500).json({ error: 'Failed to authenticate developer.' });
  }
});

router.get('/me', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar
    });
  } catch (err) {
    console.error('❌ Profile route error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;

