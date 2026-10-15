import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { config } from '../config/env.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, timezone, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      timezone: timezone || config.defaultTimezone,
      phone: phone?.trim() || '',
    });

    const token = generateToken(user);

    await AuditEvent.create({
      userId: user._id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Account created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const token = generateToken(user);

    await AuditEvent.create({
      userId: user._id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      token,
      user,
      message: 'Signed in successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, timezone, notificationPreferences } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (timezone) user.timezone = timezone;
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences.toObject(),
        ...notificationPreferences,
      };
    }

    await user.save();

    await AuditEvent.create({
      userId: user._id,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: user._id,
      details: { timezone, notificationPreferences },
    });

    res.status(200).json({
      success: true,
      user,
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await AuditEvent.create({
        userId: req.user._id,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: req.user._id,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};
