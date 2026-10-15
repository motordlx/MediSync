import { Medicine } from '../models/Medicine.js';
import { MedicationSchedule } from '../models/MedicationSchedule.js';
import { DoseRecord } from '../models/DoseRecord.js';
import { AuditEvent } from '../models/AuditEvent.js';

export const getMedicines = async (req, res, next) => {
  try {
    const { includeArchived } = req.query;
    const filter = { userId: req.user._id };
    if (includeArchived !== 'true') {
      filter.isArchived = false;
    }

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    // Attach schedules count to each medicine
    const medicinesWithSchedules = await Promise.all(
      medicines.map(async (med) => {
        const schedules = await MedicationSchedule.find({ medicineId: med._id, isActive: true });
        return {
          ...med.toObject(),
          schedules,
        };
      })
    );

    res.status(200).json({
      success: true,
      medicines: medicinesWithSchedules,
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found or access denied.',
      });
    }

    const schedules = await MedicationSchedule.find({ medicineId: medicine._id });

    res.status(200).json({
      success: true,
      medicine,
      schedules,
    });
  } catch (error) {
    next(error);
  }
};

export const createMedicine = async (req, res, next) => {
  try {
    const { name, dosage, instructions, purpose, startDate, endDate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name is required.',
      });
    }

    const medicine = await Medicine.create({
      userId: req.user._id,
      name: name.trim(),
      dosage: dosage?.trim() || '',
      instructions: instructions?.trim() || '',
      purpose: purpose?.trim() || '',
      startDate: startDate || new Date(),
      endDate: endDate || null,
      isActive: true,
      isArchived: false,
    });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'MEDICINE_CREATED',
      entityType: 'Medicine',
      entityId: medicine._id,
      details: { name: medicine.name },
    });

    res.status(201).json({
      success: true,
      medicine,
      message: 'Medicine added successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const { name, dosage, instructions, purpose, startDate, endDate, isActive } = req.body;

    const medicine = await Medicine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found or access denied.',
      });
    }

    if (name) medicine.name = name.trim();
    if (dosage !== undefined) medicine.dosage = dosage.trim();
    if (instructions !== undefined) medicine.instructions = instructions.trim();
    if (purpose !== undefined) medicine.purpose = purpose.trim();
    if (startDate) medicine.startDate = startDate;
    if (endDate !== undefined) medicine.endDate = endDate;
    if (isActive !== undefined) medicine.isActive = isActive;

    await medicine.save();

    await AuditEvent.create({
      userId: req.user._id,
      action: 'MEDICINE_UPDATED',
      entityType: 'Medicine',
      entityId: medicine._id,
      details: { name: medicine.name, isActive: medicine.isActive },
    });

    res.status(200).json({
      success: true,
      medicine,
      message: 'Medicine updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const archiveMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found or access denied.',
      });
    }

    medicine.isArchived = true;
    medicine.isActive = false;
    await medicine.save();

    // Deactivate schedules
    await MedicationSchedule.updateMany(
      { medicineId: medicine._id },
      { $set: { isActive: false } }
    );

    // Cancel upcoming doses
    await DoseRecord.updateMany(
      { medicineId: medicine._id, status: 'UPCOMING' },
      { $set: { status: 'CANCELLED' } }
    );

    await AuditEvent.create({
      userId: req.user._id,
      action: 'MEDICINE_ARCHIVED',
      entityType: 'Medicine',
      entityId: medicine._id,
    });

    res.status(200).json({
      success: true,
      message: 'Medicine archived and future doses cancelled.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found or access denied.',
      });
    }

    await MedicationSchedule.deleteMany({ medicineId: medicine._id });
    await DoseRecord.updateMany({ medicineId: medicine._id, status: 'UPCOMING' }, { $set: { status: 'CANCELLED' } });
    await Medicine.deleteOne({ _id: medicine._id });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'MEDICINE_DELETED',
      entityType: 'Medicine',
      entityId: medicine._id,
    });

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
