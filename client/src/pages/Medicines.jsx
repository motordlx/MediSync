import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Pill,
  Plus,
  Edit2,
  Archive,
  Trash2,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast } from '../components/common/Toast';
import { EmptyState } from '../components/common/EmptyState';

export const Medicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    instructions: '',
    purpose: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/medicines?includeArchived=${showArchived}`);
      if (res.data.success) {
        setMedicines(res.data.medicines);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [showArchived]);

  const openAddModal = () => {
    setEditingMed(null);
    setFormData({
      name: '',
      dosage: '',
      instructions: '',
      purpose: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      dosage: med.dosage || '',
      instructions: med.instructions || '',
      purpose: med.purpose || '',
      startDate: med.startDate ? new Date(med.startDate).toISOString().split('T')[0] : '',
      endDate: med.endDate ? new Date(med.endDate).toISOString().split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      if (editingMed) {
        const res = await api.put(`/medicines/${editingMed._id}`, formData);
        if (res.data.success) {
          setToastMessage('Medicine details updated successfully.');
        }
      } else {
        const res = await api.post('/medicines', formData);
        if (res.data.success) {
          setToastMessage('Medicine added to your record.');
        }
      }
      setModalOpen(false);
      await fetchMedicines();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving medicine.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    try {
      setSubmitting(true);
      await api.patch(`/medicines/${confirmArchive._id}/archive`);
      setToastMessage('Medicine archived and future doses cancelled.');
      setConfirmArchive(null);
      await fetchMedicines();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive medicine.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setSubmitting(true);
      await api.delete(`/medicines/${confirmDelete._id}`);
      setToastMessage('Medicine removed from records.');
      setConfirmDelete(null);
      await fetchMedicines();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete medicine.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Medicines</h2>
          <p className="text-xs text-slate-500">
            Manage your personal medication prescriptions and instructions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            Show Archived
          </label>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* Medicines List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : medicines.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medicines registered"
          description="Add your first medicine to configure reminders and enable escalation tracking."
          actionText="Add Medicine"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {medicines.map((med) => {
            const hasSchedules = med.schedules && med.schedules.length > 0;

            return (
              <div
                key={med._id}
                className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between ${
                  med.isArchived
                    ? 'border-slate-200 opacity-60 bg-slate-50/50'
                    : 'border-slate-200 hover:border-teal-200 shadow-2xs hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{med.name}</h3>
                        {med.dosage && (
                          <span className="text-xs text-slate-500 font-medium">Dosage: {med.dosage}</span>
                        )}
                      </div>
                    </div>

                    {med.isArchived && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        Archived
                      </span>
                    )}
                  </div>

                  {med.purpose && (
                    <div className="mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Purpose
                      </span>
                      <p className="text-xs text-slate-700">{med.purpose}</p>
                    </div>
                  )}

                  {/* Instructions displayed verbatim */}
                  {med.instructions && (
                    <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Patient Instructions
                      </span>
                      <p className="text-xs text-slate-700 italic">"{med.instructions}"</p>
                    </div>
                  )}

                  {/* Active Schedules summary */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 my-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {hasSchedules ? (
                      <span>
                        {med.schedules.map((s) => s.times.join(', ')).join(' • ')}
                      </span>
                    ) : (
                      <span className="text-amber-600 italic">No recurring schedule set</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-400">
                    Added {new Date(med.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    {!med.isArchived && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(med)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Medicine"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmArchive(med)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Archive Medicine"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(med)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMed ? 'Edit Medicine' : 'Add New Medicine'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Lisinopril, Metformin"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dosage / Notes
              </label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 10mg, 1 tablet"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Purpose (Optional)
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g. Blood pressure"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Instructions
            </label>
            <textarea
              rows={3}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="e.g. Take with a glass of water after breakfast. Do not crush."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Instructions will be stored and displayed verbatim. MediSync does not modify your prescription directions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
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
              {submitting ? 'Saving...' : editingMed ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={handleArchive}
        title="Archive Medicine"
        message={`Are you sure you want to archive "${confirmArchive?.name}"? Its recurring schedules will be paused and pending future doses cancelled.`}
        confirmText="Archive Medicine"
        isLoading={submitting}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Medicine"
        message={`Permanently remove "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
        isLoading={submitting}
      />
    </div>
  );
};
