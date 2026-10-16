import { NotificationLog } from '../models/NotificationLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { verifyAndSendTestEmail } from '../services/emailService.js';

export const getNotificationLogs = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, stage } = req.query;

    const query = { userId };
    if (stage) query.stage = parseInt(stage, 10);

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      NotificationLog.find(query)
        .populate('doseRecordId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      NotificationLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditEvents = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      AuditEvent.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditEvent.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const testEmailConnection = async (req, res, next) => {
  try {
    const targetEmail = req.body?.email || req.user.email;
    const result = await verifyAndSendTestEmail(targetEmail);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        details: result.details,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Email delivery failed.',
        code: result.code,
      });
    }
  } catch (error) {
    next(error);
  }
};
