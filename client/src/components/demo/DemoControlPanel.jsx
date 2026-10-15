import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import {
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Clock,
  Layers,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge, EscalationStageBadge } from '../common/StatusBadge';

export const DemoControlPanel = ({ onClose }) => {
  const {
    demoStatus,
    loading,
    lastActionMessage,
    seedScenario,
    createTestDose,
    advanceStage,
    confirmDose,
    resetDemo,
    fetchDemoStatus,
  } = useDemo();

  const [activeDoseId, setActiveDoseId] = useState('');
  const [selectedTargetStage, setSelectedTargetStage] = useState('2');
  const [testMedName, setTestMedName] = useState('Demo Lisinopril 10mg');

  const demoDoses = demoStatus?.demoDoses || [];
  const queueStatus = demoStatus?.queueStatus || { counts: {} };
  const recentLogs = demoStatus?.recentLogs || [];

  const handleCreateDose = async () => {
    const res = await createTestDose(testMedName);
    if (res?.dose?._id) {
      setActiveDoseId(res.dose._id);
    }
  };

  const handleAdvance = async (doseId, stage) => {
    await advanceStage(doseId, stage);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-white">Live Escalation Demo Controller</h2>
            <p className="text-xs text-slate-400">Accelerated Notification Timeline & Presentation Controls</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Timing Information Card */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
          <div className="flex items-center justify-between font-medium text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" /> Accelerated Timeline Active
            </span>
            <span className="text-slate-400">Seconds vs Hours</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/40 text-[11px]">
            <div className="p-2 rounded bg-slate-900/60">
              <div className="text-slate-400">Stage 1</div>
              <div className="font-semibold text-white">Immediate (0s)</div>
              <div className="text-slate-500">Patient Reminder</div>
            </div>
            <div className="p-2 rounded bg-slate-900/60">
              <div className="text-slate-400">Stage 2</div>
              <div className="font-semibold text-amber-400">+30 Seconds</div>
              <div className="text-slate-500">Unconfirmed Follow-up</div>
            </div>
            <div className="p-2 rounded bg-slate-900/60">
              <div className="text-slate-400">Stage 3</div>
              <div className="font-semibold text-orange-400">+60 Seconds</div>
              <div className="text-slate-500">Caregiver Alert</div>
            </div>
            <div className="p-2 rounded bg-slate-900/60">
              <div className="text-slate-400">Stage 4</div>
              <div className="font-semibold text-purple-400">+120 Seconds</div>
              <div className="text-slate-500">Doctor Escalation</div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={seedScenario}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Seed Sample Scenario
          </button>
          <button
            type="button"
            onClick={resetDemo}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo Data
          </button>
        </div>

        {/* Test Dose Generator */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" /> Generate Live Test Dose
          </h3>
          <p className="text-xs text-slate-400">
            Creates a scheduled dose due right now and enqueues real persistent BullMQ jobs with accelerated intervals.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMedName}
              onChange={(e) => setTestMedName(e.target.value)}
              placeholder="Medicine Name"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={handleCreateDose}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Enqueue Test Dose
            </button>
          </div>
        </div>

        {/* Active Demo Doses & Fast-Forward Trigger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" /> Active Demonstration Doses ({demoDoses.length})
            </h3>
            <button
              onClick={fetchDemoStatus}
              className="text-xs text-teal-400 hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {demoDoses.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-800/20 border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No active test doses. Click "Enqueue Test Dose" above to simulate.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {demoDoses.map((dose) => (
                <div
                  key={dose._id}
                  className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{dose.medicineId?.name || 'Test Medicine'}</span>
                    <StatusBadge status={dose.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Due: {new Date(dose.scheduledTime).toLocaleTimeString()}</span>
                    <span>Stage: {dose.escalationStage || 0}/4</span>
                  </div>

                  {/* Manual stage advancement & mark taken controls */}
                  <div className="pt-2 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-2">
                    {dose.status !== 'TAKEN' ? (
                      <button
                        type="button"
                        onClick={() => confirmDose(dose._id, 'Confirmed in Live Demo')}
                        disabled={loading}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Taken</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Taken
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] text-slate-400 mr-0.5">Advance:</span>
                      {[1, 2, 3, 4].map((stg) => (
                        <button
                          key={stg}
                          type="button"
                          onClick={() => handleAdvance(dose._id, stg)}
                          disabled={loading || dose.status === 'TAKEN'}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            dose.escalationStage >= stg
                              ? 'bg-slate-700 text-slate-400 cursor-default'
                              : 'bg-teal-600/80 hover:bg-teal-500 text-white'
                          }`}
                          title={`Trigger Stage ${stg} immediately`}
                        >
                          Stage {stg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BullMQ Job Queue Status */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" /> BullMQ Queue State (Redis)
            </h3>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Connected
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Delayed</div>
              <div className="font-bold text-amber-400 text-sm">{queueStatus.counts?.delayed || 0}</div>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Active</div>
              <div className="font-bold text-sky-400 text-sm">{queueStatus.counts?.active || 0}</div>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Completed</div>
              <div className="font-bold text-emerald-400 text-sm">{queueStatus.counts?.completed || 0}</div>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Failed</div>
              <div className="font-bold text-rose-400 text-sm">{queueStatus.counts?.failed || 0}</div>
            </div>
          </div>
        </div>

        {/* Notification Attempts Inspection */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-white">Recent Notification Attempts & Outcomes</h3>
          {recentLogs.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center bg-slate-800/20 rounded-lg">
              No notifications dispatched yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
              {recentLogs.slice(0, 8).map((log) => (
                <div
                  key={log._id}
                  className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-200">
                      Stage {log.stage} ({log.recipientRole}) → <span className="text-slate-400">{log.recipientEmail}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleTimeString()} • {log.subject}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      log.status === 'DELIVERED' || log.status === 'SIMULATED' || log.status === 'ACCEPTED'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950/60 text-rose-400 border-rose-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer feedback */}
      {lastActionMessage && (
        <div className="p-3 bg-teal-950/80 border-t border-teal-800/60 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{lastActionMessage}</span>
        </div>
      )}
    </div>
  );
};
