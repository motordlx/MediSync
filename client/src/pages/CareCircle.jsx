import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Users2,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Trash2,
  Edit2,
  Send,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast } from '../components/common/Toast';
import { EmptyState } from '../components/common/EmptyState';

export const CareCircle = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    role: 'caregiver',
    escalationLevel: 3,
  });

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contacts');
      if (res.data.success) {
        setContacts(res.data.contacts);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const openAddModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      relationship: '',
      role: 'caregiver',
      escalationLevel: 3,
    });
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingContact(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      relationship: c.relationship,
      role: c.role,
      escalationLevel: c.escalationLevel || 3,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingContact) {
        const res = await api.put(`/contacts/${editingContact._id}`, formData);
        if (res.data.success) setToastMessage('Contact details updated.');
      } else {
        const res = await api.post('/contacts', formData);
        if (res.data.success) setToastMessage('Care Circle contact added and invitation dispatched.');
      }
      setModalOpen(false);
      await fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (contactId) => {
    try {
      const res = await api.post(`/contacts/${contactId}/invite`);
      if (res.data.success) {
        setToastMessage(res.data.message);
        await fetchContacts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend invite.');
    }
  };

  const handleCopyInviteLink = (contact) => {
    if (!contact.verificationToken) {
      alert('This contact has already been verified.');
      return;
    }
    const url = `${window.location.origin}/verify-invite?token=${contact.verificationToken}`;
    navigator.clipboard.writeText(url);
    setToastMessage('Verification link copied to clipboard!');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setSubmitting(true);
      await api.delete(`/contacts/${confirmDelete._id}`);
      setToastMessage('Contact removed from Care Circle.');
      setConfirmDelete(null);
      await fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove contact.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Care Circle Network</h2>
          <p className="text-xs text-slate-500">
            Trusted contacts who receive escalation alerts when a dose remains unconfirmed.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Care Contact
        </button>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-950 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-teal-900">Authorization & Verification Safety Principle</p>
          <p className="text-teal-800 leading-relaxed">
            Only contacts who explicitly accept their email verification invitation will receive escalation alerts. Adding a healthcare provider or family member only authorizes automated notifications—it does not grant unrestricted access to your medical records or dashboard.
          </p>
        </div>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No Care Circle contacts registered"
          description="Add a caregiver, family member, or physician to automatically alert them when doses remain unconfirmed."
          actionText="Add First Contact"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contacts.map((contact) => {
            const isVerified = contact.verificationStatus === 'verified';
            const isHealthcare = contact.role === 'healthcare_professional';

            return (
              <div
                key={contact._id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{contact.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {contact.relationship} •{' '}
                        <span className="capitalize">
                          {contact.role.replace(/_/g, ' ')}
                        </span>
                      </p>
                    </div>

                    {/* Verification Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        isVerified
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : contact.verificationStatus === 'pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Invite
                        </>
                      )}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 my-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Escalation Stage Assigned */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 my-2 text-xs">
                    <span className="font-semibold text-slate-700 block mb-0.5">
                      Escalation Configuration
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {isHealthcare
                        ? 'Stage 4: Clinical escalation (Extended unconfirmed doses)'
                        : 'Stage 3: Care Circle alert (Unconfirmed past grace period)'}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <div>
                    {!isVerified && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleResendInvite(contact._id)}
                          className="text-[11px] font-semibold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Resend invitation email"
                        >
                          <Send className="w-3 h-3" /> Resend
                        </button>
                        {contact.verificationToken && (
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(contact)}
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 ml-2 flex items-center gap-1 cursor-pointer"
                            title="Copy link for manual testing"
                          >
                            <Copy className="w-3 h-3" /> Copy Link
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Contact"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(contact)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove Contact"
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

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingContact ? 'Edit Care Contact' : 'Add Care Circle Contact'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Sarah Rivera, Dr. Watson"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Relationship *
              </label>
              <input
                type="text"
                required
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="e.g. Spouse, Daughter, Primary Doctor"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role in Care Circle *
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const role = e.target.value;
                  setFormData({
                    ...formData,
                    role,
                    escalationLevel: role === 'healthcare_professional' ? 4 : 3,
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="caregiver">Caregiver (Stage 3 Alert)</option>
                <option value="family_member">Family Member (Stage 3 Alert)</option>
                <option value="healthcare_professional">Healthcare Professional (Stage 4 Alert)</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            MediSync will dispatch an invitation verification link to this email address. Escalation emails will only be sent after the recipient verifies their email.
          </p>

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
              {submitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Remove Care Contact"
        message={`Remove "${confirmDelete?.name}" from your Care Circle? They will no longer receive escalation alerts if a dose is unconfirmed.`}
        confirmText="Remove Contact"
        isDanger={true}
        isLoading={submitting}
      />
    </div>
  );
};
