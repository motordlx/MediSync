import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  History as HistoryIcon,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bell,
  Pill,
} from 'lucide-react';
import { StatusBadge, EscalationStageBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';

export const History = () => {
  const [doses, setDoses] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [selectedMed, setSelectedMed] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines?includeArchived=true');
      if (res.data.success) {
        setMedicines(res.data.medicines);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (selectedMed) params.append('medicineId', selectedMed);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/doses/history?${params.toString()}`);
      if (res.data.success) {
        setDoses(res.data.doses);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [selectedMed, selectedStatus, startDate, endDate]);

  const handleResetFilters = () => {
    setSelectedMed('');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medication History & Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Comprehensive historical record of scheduled doses, confirmations, and escalation logs.
          </p>
        </div>

        <button
          onClick={() => fetchHistory(pagination.page)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 self-end sm:self-auto cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-teal-600" />
          <span>Filter Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Medicine Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Medication</label>
            <select
              value={selectedMed}
              onChange={(e) => setSelectedMed(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-teal-600"
            >
              <option value="">All Medications</option>
              {medicines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Dose Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="TAKEN">Confirmed Taken</option>
              <option value="UNCONFIRMED">Unconfirmed</option>
              <option value="DUE">Due Now</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">To Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors cursor-pointer"
                title="Reset filters"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Table / Records */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : doses.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No dose history records match criteria"
          description="Try adjusting your filters or date ranges to see past records."
          actionText="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Medication</th>
                  <th className="px-5 py-3.5">Scheduled Time</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Confirmation Record</th>
                  <th className="px-5 py-3.5">Escalation History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doses.map((dose) => {
                  const isTaken = dose.status === 'TAKEN';
                  const hasHistory = dose.escalationHistory && dose.escalationHistory.length > 0;

                  return (
                    <tr key={dose._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Medication */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {dose.medicineId?.name || 'Medication'}
                            </div>
                            {dose.medicineId?.dosage && (
                              <div className="text-[11px] text-slate-400">
                                {dose.medicineId.dosage}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {new Date(dose.scheduledTime).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{dose.timeString}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={dose.status} size="sm" />
                      </td>

                      {/* Confirmation Record */}
                      <td className="px-5 py-4">
                        {isTaken && dose.confirmationTimestamp ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                            </span>
                            <p className="text-[11px] text-slate-500">
                              {new Date(dose.confirmationTimestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {dose.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">
                                "{dose.notes}"
                              </p>
                            )}
                          </div>
                        ) : dose.status === 'UNCONFIRMED' ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> No confirmation received
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending</span>
                        )}
                      </td>

                      {/* Escalation History */}
                      <td className="px-5 py-4">
                        {hasHistory ? (
                          <div className="space-y-1">
                            {dose.escalationHistory.map((h, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-[11px] text-slate-600"
                              >
                                <Bell className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="font-medium">
                                  Stage {h.stage} ({h.recipientRole}):
                                </span>
                                <span className="text-slate-400">{h.recipientEmail}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None triggered</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing page <strong>{pagination.page}</strong> of{' '}
              <strong>{pagination.totalPages || 1}</strong> ({pagination.total} total doses)
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchHistory(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                onClick={() => fetchHistory(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
