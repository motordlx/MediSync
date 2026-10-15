import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  Pill,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  History,
  Activity,
  Plus,
  RefreshCw,
  BellRing,
} from 'lucide-react';
import { StatusBadge, EscalationStageBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { EmptyState } from '../components/common/EmptyState';
import { useDemo } from '../context/DemoContext';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingDose, setConfirmingDose] = useState(null);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { setIsPanelOpen, demoStatus } = useDemo();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleConfirmDoseSubmit = async (e) => {
    e.preventDefault();
    if (!confirmingDose) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/doses/${confirmingDose._id}/confirm`, {
        notes: confirmationNotes,
      });

      if (res.data.success) {
        setToastMessage(res.data.message || 'Dose recorded as taken!');
        setConfirmingDose(null);
        setConfirmationNotes('');
        await fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm dose.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your medication dashboard...</p>
        </div>
      </div>
    );
  }

  const today = data?.today || {};
  const timeline = today.timeline || [];
  const nextReminders = data?.nextReminders || [];
  const adherence = data?.adherence || { rate: 100 };
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Top Banner for Demo Mode presentation convenience */}
      {demoStatus?.config?.enabled && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900">Accelerated Demo Mode Active</h2>
              <p className="text-xs text-amber-700">
                Escalation delays operate in seconds (30s follow-up, 60s caregiver, 120s doctor) for project evaluation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Open Control Panel
            </button>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scheduled */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Doses</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{today.totalScheduled || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Total scheduled for today</p>
        </div>

        {/* Confirmed Taken */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirmed Taken</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{today.confirmedTaken || 0}</div>
          <p className="text-xs text-emerald-700 font-medium mt-1">Confirmed in dashboard</p>
        </div>

        {/* Due / Unconfirmed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Action</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(today.dueNow || 0) + (today.unconfirmed || 0)}
          </div>
          <p className="text-xs text-amber-700 font-medium mt-1">
            {today.dueNow || 0} due now • {today.unconfirmed || 0} unconfirmed
          </p>
        </div>

        {/* Adherence Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Adherence Rate</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-700">{adherence.rate}%</div>
          <p className="text-xs text-slate-500 mt-1">Past 7 days confirmation rate</p>
        </div>
      </div>

      {/* Main Grid: Today's Timeline + Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Today's Medication Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Today's Medication Timeline</h2>
              <p className="text-xs text-slate-500">Chronological schedule of medication doses</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh timeline"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {timeline.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No doses scheduled for today"
              description="Configure recurring times for your medicines to begin automated reminder tracking."
              actionText="Add Medicine Schedule"
              onAction={() => (window.location.href = '/schedule')}
            />
          ) : (
            <div className="space-y-3">
              {timeline.map((dose) => {
                const isDue = dose.status === 'DUE' || dose.status === 'UNCONFIRMED';
                const isTaken = dose.status === 'TAKEN';

                return (
                  <div
                    key={dose._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDue
                        ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                        : isTaken
                        ? 'bg-white border-slate-200 opacity-90'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isTaken
                              ? 'bg-emerald-100 text-emerald-700'
                              : isDue
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-teal-50 text-teal-700'
                          }`}
                        >
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm">
                              {dose.medicineId?.name || 'Medication'}
                            </h3>
                            {dose.medicineId?.dosage && (
                              <span className="text-xs text-slate-500 font-medium">
                                ({dose.medicineId.dosage})
                              </span>
                            )}
                            <StatusBadge status={dose.status} size="sm" />
                            {dose.escalationStage > 0 && (
                              <EscalationStageBadge stage={dose.escalationStage} />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              Scheduled for <strong>{dose.timeString}</strong> (
                              {new Date(dose.scheduledTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              )
                            </span>
                          </div>

                          {/* Patient-entered instructions displayed verbatim */}
                          {dose.medicineId?.instructions && (
                            <p className="text-xs text-slate-600 mt-1.5 italic bg-slate-50/80 px-2.5 py-1 rounded-md border border-slate-100">
                              Instructions: "{dose.medicineId.instructions}"
                            </p>
                          )}

                          {isTaken && dose.confirmationTimestamp && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-1">
                              ✓ Confirmed taken at {new Date(dose.confirmationTimestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Confirm Action Button */}
                      {!isTaken && dose.status !== 'CANCELLED' && (
                        <div className="self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDose(dose);
                              setConfirmationNotes('');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                              isDue
                                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark as Taken</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Reminders & Adherence Summary & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Reminders Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-teal-600" /> Upcoming Reminders
              </h2>
              <Link to="/schedule" className="text-xs text-teal-600 hover:underline font-medium">
                View all
              </Link>
            </div>

            {nextReminders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No further upcoming doses today.</p>
            ) : (
              <div className="space-y-3">
                {nextReminders.slice(0, 4).map((rem) => (
                  <div
                    key={rem._id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{rem.medicineId?.name}</p>
                      <p className="text-slate-500 text-[11px]">
                        {new Date(rem.scheduledTime).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at {rem.timeString}
                      </p>
                    </div>
                    <StatusBadge status={rem.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adherence Summary Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> Adherence Tracking Notice
            </h2>
            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 text-xs text-teal-900 leading-relaxed">
              MediSync evaluates adherence based on <strong>recorded confirmations</strong>. The system records when doses are confirmed, but does not claim that medication was physically swallowed.
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>7-day scheduled doses:</span>
                <span className="font-semibold text-slate-800">{adherence.pastTotal || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Confirmed on time / late:</span>
                <span className="font-semibold text-emerald-700">{adherence.pastConfirmed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Unconfirmed:</span>
                <span className="font-semibold text-rose-700">{adherence.pastUnconfirmed || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Audit Trail */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" /> Recent Activity
              </h2>
              <Link to="/history" className="text-xs text-teal-600 hover:underline font-medium">
                Audit Log
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent actions logged.</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {recentActivity.slice(0, 6).map((act) => (
                  <div key={act._id} className="text-xs border-l-2 border-teal-500 pl-2.5 py-1">
                    <p className="font-semibold text-slate-800 capitalize">
                      {act.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(act.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmingDose}
        onClose={() => setConfirmingDose(null)}
        title="Confirm Medication Dose"
      >
        <form onSubmit={handleConfirmDoseSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 text-xs text-teal-900 leading-relaxed">
            Confirming that you took{' '}
            <strong>{confirmingDose?.medicineId?.name || 'this medication'}</strong> scheduled for{' '}
            <strong>{confirmingDose?.timeString}</strong>. This updates your adherence record and cancels pending follow-ups to your Care Circle.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Note (e.g., "Taken with meal", "Slight headache")
            </label>
            <input
              type="text"
              value={confirmationNotes}
              onChange={(e) => setConfirmationNotes(e.target.value)}
              placeholder="Add optional notes..."
              maxLength={200}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmingDose(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Confirming...' : 'Yes, Mark as Taken'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
