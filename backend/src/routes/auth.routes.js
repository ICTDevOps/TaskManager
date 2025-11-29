const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, updateProfile, updateEmail, updatePassword, updateDefaultContext } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: { error: 'Trop de tentatives, veuillez réessayer dans 15 minutes.' }
});

// Public routes
router.post('/register', register);
router.post('/login', authLimiter, login);

// Protected routes
router.get('/me', authMiddleware, me);
router.patch('/profile', authMiddleware, updateProfile);
router.patch('/email', authMiddleware, updateEmail);
router.patch('/password', authMiddleware, updatePassword);
router.patch('/default-context', authMiddleware, updateDefaultContext);

module.exports = router;
