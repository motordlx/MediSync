import crypto from 'crypto';
import { CareContact } from '../models/CareContact.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { sendContactInvitationEmail } from '../services/emailService.js';

export const getContacts = async (req, res, next) => {
  try {
    const contacts = await CareContact.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    next(error);
  }
};

export const addContact = async (req, res, next) => {
  try {
    const { name, email, phone, relationship, role, escalationLevel } = req.body;

    if (!name || !email || !relationship) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and relationship are required fields.',
      });
    }

    const existing = await CareContact.findOne({
      userId: req.user._id,
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A contact with this email address already exists in your Care Circle.',
      });
    }

    // Generate secure verification token valid for 7 days
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const level = escalationLevel ? parseInt(escalationLevel, 10) : (role === 'healthcare_professional' ? 4 : 3);

    const contact = await CareContact.create({
      userId: req.user._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      relationship: relationship.trim(),
      role: role || 'caregiver',
      escalationLevel: level,
      verificationStatus: 'pending',
      verificationToken,
      verificationExpires,
      isActive: true,
    });

    // Send invitation email
    await sendContactInvitationEmail({
      to: contact.email,
      contactName: contact.name,
      patientName: req.user.name,
      role: contact.role,
      verificationToken,
    });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'CARE_CONTACT_ADDED',
      entityType: 'CareContact',
      entityId: contact._id,
      details: { email: contact.email, role: contact.role },
    });

    res.status(201).json({
      success: true,
      contact,
      message: 'Care Circle contact added and verification invitation sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const { name, phone, relationship, role, escalationLevel, isActive } = req.body;

    const contact = await CareContact.findOne({ _id: req.params.id, userId: req.user._id });
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found or access denied.',
      });
    }

    if (name) contact.name = name.trim();
    if (phone !== undefined) contact.phone = phone.trim();
    if (relationship) contact.relationship = relationship.trim();
    if (role) contact.role = role;
    if (escalationLevel) contact.escalationLevel = parseInt(escalationLevel, 10);
    if (isActive !== undefined) contact.isActive = isActive;

    await contact.save();

    await AuditEvent.create({
      userId: req.user._id,
      action: 'CARE_CONTACT_UPDATED',
      entityType: 'CareContact',
      entityId: contact._id,
    });

    res.status(200).json({
      success: true,
      contact,
      message: 'Contact updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const removeContact = async (req, res, next) => {
  try {
    const contact = await CareContact.findOne({ _id: req.params.id, userId: req.user._id });
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found or access denied.',
      });
    }

    await CareContact.deleteOne({ _id: contact._id });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'CARE_CONTACT_REMOVED',
      entityType: 'CareContact',
      entityId: contact._id,
      details: { email: contact.email },
    });

    res.status(200).json({
      success: true,
      message: 'Contact removed from Care Circle.',
    });
  } catch (error) {
    next(error);
  }
};

export const resendInvite = async (req, res, next) => {
  try {
    const contact = await CareContact.findOne({ _id: req.params.id, userId: req.user._id });
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found or access denied.',
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    contact.verificationToken = verificationToken;
    contact.verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    contact.verificationStatus = 'pending';
    await contact.save();

    await sendContactInvitationEmail({
      to: contact.email,
      contactName: contact.name,
      patientName: req.user.name,
      role: contact.role,
      verificationToken,
    });

    res.status(200).json({
      success: true,
      message: `Invitation resent to ${contact.email}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public endpoint to verify contact invite via token
 */
export const verifyInvite = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const contact = await CareContact.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    }).populate('userId', 'name');

    if (!contact) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation token.',
      });
    }

    contact.verificationStatus = 'verified';
    contact.verificationToken = null;
    contact.verificationExpires = null;
    await contact.save();

    await AuditEvent.create({
      userId: contact.userId._id,
      action: 'CARE_CONTACT_VERIFIED',
      entityType: 'CareContact',
      entityId: contact._id,
      details: { contactEmail: contact.email, verifiedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      patientName: contact.userId.name,
      role: contact.role,
      message: 'Invitation accepted! You are now a verified Care Circle contact.',
    });
  } catch (error) {
    next(error);
  }
};
