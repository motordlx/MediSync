import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const DemoContext = createContext(null);

export const DemoProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [demoStatus, setDemoStatus] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState(null);

  const fetchDemoStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/demo/status');
      if (res.data.success) {
        setDemoStatus(res.data);
      }
    } catch {
      // Demo mode might be disabled or unauthenticated
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDemoStatus();
  }, [fetchDemoStatus]);

  const seedScenario = async () => {
    setLoading(true);
    try {
      const res = await api.post('/demo/seed');
      setLastActionMessage(res.data.message);
      await fetchDemoStatus();
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const createTestDose = async (medicineName = '') => {
    setLoading(true);
    try {
      const res = await api.post('/demo/create-dose', { medicineName });
      setLastActionMessage(res.data.message);
      await fetchDemoStatus();
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const advanceStage = async (doseId, targetStage) => {
    setLoading(true);
    try {
      const res = await api.post('/demo/advance-stage', { doseId, targetStage });
      setLastActionMessage(res.data.message);
      await fetchDemoStatus();
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = async () => {
    setLoading(true);
    try {
      const res = await api.post('/demo/reset');
      setLastActionMessage(res.data.message);
      await fetchDemoStatus();
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const confirmDose = async (doseId, notes = '') => {
    setLoading(true);
    try {
      const res = await api.post(`/doses/${doseId}/confirm`, { notes });
      setLastActionMessage(res.data.message || 'Dose recorded as taken!');
      await fetchDemoStatus();
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        demoStatus,
        isPanelOpen,
        setIsPanelOpen,
        loading,
        lastActionMessage,
        setLastActionMessage,
        fetchDemoStatus,
        seedScenario,
        createTestDose,
        advanceStage,
        confirmDose,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
