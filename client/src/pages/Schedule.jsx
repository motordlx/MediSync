import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  CalendarDays,
  Plus,
  Clock,
  Pill,
  Trash2,
  RefreshCw,
  Power,
  Check,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast } from '../components/common/Toast';
import { EmptyState } from '../components/common/EmptyState';

const DAYS_OF_WEEK = [
  { index: 0, label: 'Sun' },
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
];

export const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // New Schedule Form
  const [formData, setFormData] = useState({
    medicineId: '',
    times: ['08:00'],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, medRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/medicines'),
      ]);
      if (schedRes.data.success) setSchedules(schedRes.data.schedules);
      if (medRes.data.success) {
        const activeMeds = medRes.data.medicines.filter((m) => !m.isArchived);
        setMedicines(activeMeds);
        if (activeMeds.length > 0 && !formData.medicineId) {
          setFormData((prev) => ({ ...prev, medicineId: activeMeds[0]._id }));
        }
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTimeInput = () => {
    setFormData((prev) => ({
      ...prev,
      times: [...prev.times, '12:00'],
    }));
  };

  const handleRemoveTimeInput = (index) => {
    if (formData.times.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index),
    }));
  };

  const handleTimeChange = (index, value) => {
    const updated = [...formData.times];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, times: updated }));
  };

  const toggleDayOfWeek = (dayIndex) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(dayIndex);
      if (exists) {
        if (prev.daysOfWeek.length <= 1) return prev; // Keep at least 1 day
        return { ...prev, daysOfWeek: prev.daysOfWeek.filter((d) => d !== dayIndex) };
      }
      return { ...prev, daysOfWeek: [...prev.daysOfWeek, dayIndex].sort() };
    });
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!formData.medicineId || formData.times.length === 0) return;

    try {
      setSubmitting(true);
      const res = await api.post('/schedules', formData);
      if (res.data.success) {
        setToastMessage(`Schedule created! Generated ${res.data.generatedDosesCount} doses.`);
        setModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSchedule = async (scheduleId) => {
    try {
      const res = await api.patch(`/schedules/${scheduleId}/toggle`);
      if (res.data.success) {
        setToastMessage(res.data.message);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle schedule.');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!confirmDelete) return;
    try {
      setSubmitting(true);
      await api.delete(`/schedules/${confirmDelete._id}`);
      setToastMessage('Schedule deleted and pending future doses cancelled.');
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncDoses = async () => {
    try {
      setGenerating(true);
      const res = await api.post('/doses/generate');
      setToastMessage(res.data.message || 'Doses generated successfully.');
    } catch (err) {
      alert('Failed to sync doses.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medication Schedules</h2>
          <p className="text-xs text-slate-500">
            Configure multiple daily medication times and recurring days of the week.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncDoses}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
            title="Generate doses for the next 3 days"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>Sync Upcoming Doses</span>
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={medicines.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>
      </div>

      {medicines.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You need to add at least one medicine before configuring recurring schedules.</span>
          </div>
          <button
            onClick={() => (window.location.href = '/medicines')}
            className="font-bold underline text-amber-900"
          >
            Add Medicine
          </button>
        </div>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No medication schedules configured"
          description="Create recurring daily times for your medicines so MediSync can generate individual dose records."
          actionText="Configure Schedule"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schedules.map((sched) => {
            const med = sched.medicineId;
            const daysCount = sched.daysOfWeek?.length || 0;
            const isDaily = daysCount === 7;

            return (
              <div
                key={sched._id}
                className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between ${
                  !sched.isActive
                    ? 'border-slate-200 opacity-60 bg-slate-50/40'
                    : 'border-slate-200 shadow-2xs hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{med?.name || 'Medication'}</h3>
                        {med?.dosage && (
                          <span className="text-xs text-slate-500 font-medium">{med.dosage}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSchedule(sched._id)}
                      className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 transition-colors cursor-pointer ${
                        sched.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                      title={sched.isActive ? 'Click to Pause' : 'Click to Activate'}
                    >
                      <Power className="w-3 h-3" />
                      {sched.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Scheduled Times */}
                  <div className="my-3 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Daily Medication Times
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sched.times.map((time, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-teal-600" />
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Days of Week */}
                  <div className="my-3 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Active Days ({isDaily ? 'Everyday' : `${daysCount} days/week`})
                    </span>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const isDayActive = sched.daysOfWeek?.includes(day.index);
                        return (
                          <span
                            key={day.index}
                            className={`w-7 h-7 rounded-md text-[11px] font-bold flex items-center justify-center ${
                              isDayActive
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {day.label[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    TZ: {sched.timezone || 'Asia/Kolkata'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(sched)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Schedule Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Configure Medication Schedule"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Medicine *
            </label>
            <select
              value={formData.medicineId}
              onChange={(e) => setFormData({ ...formData, medicineId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              required
            >
              {medicines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} {m.dosage ? `(${m.dosage})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Multiple Daily Times */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Scheduled Daily Times (24-hour format) *
              </label>
              <button
                type="button"
                onClick={handleAddTimeInput}
                className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Time
              </button>
            </div>

            <div className="space-y-2">
              {formData.times.map((time, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                  {formData.times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTimeInput(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove time"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Example: Morning (08:00), Afternoon (14:00), Evening (20:00).
            </p>
          </div>

          {/* Days of Week selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Active Days of the Week
            </label>
            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.daysOfWeek.includes(day.index);
                return (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.index)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Save & Generate Doses'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteSchedule}
        title="Delete Schedule"
        message="Permanently remove this recurring medication schedule? All pending future doses generated from this schedule will be cancelled."
        confirmText="Delete Schedule"
        isDanger={true}
        isLoading={submitting}
      />
    </div>
  );
};
