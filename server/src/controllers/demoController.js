import {
  seedDemoScenario,
  createDemoDose,
  advanceDemoStage,
  resetDemoData,
  getDemoStatus,
} from '../services/demoService.js';
import { config } from '../config/env.js';

export const handleSeedDemo = async (req, res, next) => {
  try {
    if (!config.demoMode.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Demo mode is disabled in this environment.',
      });
    }

    const result = await seedDemoScenario(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Demo scenario seeded with sample medicines, schedules, and verified care contacts.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleCreateDemoDose = async (req, res, next) => {
  try {
    if (!config.demoMode.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Demo mode is disabled.',
      });
    }

    const { medicineName } = req.body;
    const result = await createDemoDose(req.user._id, medicineName);

    res.status(201).json({
      success: true,
      dose: result.dose,
      medicine: result.medicine,
      scheduledJobs: result.scheduledJobs,
      message: 'Live test dose generated with accelerated escalation timeline.',
    });
  } catch (error) {
    next(error);
  }
};

export const handleAdvanceDemoStage = async (req, res, next) => {
  try {
    if (!config.demoMode.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Demo mode is disabled.',
      });
    }

    const { doseId, targetStage } = req.body;
    if (!doseId) {
      return res.status(400).json({
        success: false,
        message: 'Dose ID is required.',
      });
    }

    const result = await advanceDemoStage(doseId, targetStage ? parseInt(targetStage, 10) : undefined);

    res.status(200).json({
      success: true,
      result: result.result,
      dose: result.dose,
      message: `Accelerated dose advanced to stage ${result.dose.escalationStage}.`,
    });
  } catch (error) {
    next(error);
  }
};

export const handleResetDemoData = async (req, res, next) => {
  try {
    const result = await resetDemoData(req.user._id);
    res.status(200).json({
      success: true,
      message: `Reset complete. Removed ${result.count} test demo doses.`,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetDemoStatus = async (req, res, next) => {
  try {
    const status = await getDemoStatus(req.user._id);
    res.status(200).json({
      success: true,
      config: config.demoMode,
      ...status,
    });
  } catch (error) {
    next(error);
  }
};
