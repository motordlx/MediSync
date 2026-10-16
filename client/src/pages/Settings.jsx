import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Bell,
  Clock,
  Shield,
  User,
  Save,
  CheckCircle2,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { Toast } from '../components/common/Toast';

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const Settings = () => {
  const { user, updateUser } = useAuth();
  const [toastMessage, setToastMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');

  // Escalation preferences
  const [emailEnabled, setEmailEnabled] = useState(user?.notificationPreferences?.email !== false);
  const [includeMedicineName, setIncludeMedicineName] = useState(
    user?.notificationPreferences?.includeMedicineName !== false
  );
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(
    user?.notificationPreferences?.gracePeriodMinutes || 30
  );
  const [caregiverGraceMinutes, setCaregiverGraceMinutes] = useState(
    user?.notificationPreferences?.caregiverGraceMinutes || 60
  );
  const [healthcareGraceMinutes, setHealthcareGraceMinutes] = useState(
    user?.notificationPreferences?.healthcareGraceMinutes || 120
  );
  const [enableHealthcareEscalation, setEnableHealthcareEscalation] = useState(
    user?.notificationPreferences?.enableHealthcareEscalation !== false
  );

  // Email Diagnostic State
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await api.post('/notifications/test-email');
      setTestResult({ success: true, message: res.data.message });
      setToastMessage('✅ Test email dispatched! Please check your inbox.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch test email.';
      setTestResult({ success: false, message: msg });
      setToastMessage('❌ Email test failed. See diagnostic details below.');
    } finally {
      setTestingEmail(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setTimezone(user.timezone || 'Asia/Kolkata');
      if (user.notificationPreferences) {
        setEmailEnabled(user.notificationPreferences.email !== false);
        setIncludeMedicineName(user.notificationPreferences.includeMedicineName !== false);
        setGracePeriodMinutes(user.notificationPreferences.gracePeriodMinutes || 30);
        setCaregiverGraceMinutes(user.notificationPreferences.caregiverGraceMinutes || 60);
        setHealthcareGraceMinutes(user.notificationPreferences.healthcareGraceMinutes || 120);
        setEnableHealthcareEscalation(user.notificationPreferences.enableHealthcareEscalation !== false);
      }
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/auth/profile', {
        name,
        phone,
        timezone,
        notificationPreferences: {
          email: emailEnabled,
          includeMedicineName,
          gracePeriodMinutes: parseInt(gracePeriodMinutes, 10),
          caregiverGraceMinutes: parseInt(caregiverGraceMinutes, 10),
          healthcareGraceMinutes: parseInt(healthcareGraceMinutes, 10),
          enableHealthcareEscalation,
        },
      });

      if (res.data.success) {
        updateUser(res.data.user);
        setToastMessage('Preferences saved successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      <div>
        <h2 className="text-xl font-bold text-slate-900">Account & Notification Settings</h2>
        <p className="text-xs text-slate-500">
          Customize your personal details, schedule timezone, and notification escalation timing.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                title="Email cannot be changed directly"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Schedule Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Default: Asia/Kolkata. Dose hours are calculated against this timezone.
              </p>
            </div>
          </div>
        </div>

        {/* Escalation Timing Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Notification Escalation Workflow</h3>
              <p className="text-xs text-slate-500">
                Configure timing windows for automatic unconfirmed dose escalations.
              </p>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 block">
                Include Medication Name in Emails
              </span>
              <span className="text-[11px] text-slate-500">
                When disabled, email reminders mention "Scheduled medication" for strict privacy.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeMedicineName}
                onChange={(e) => setIncludeMedicineName(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {/* Grace Period Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stage 2: Follow-up Grace (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                required
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default: 30 minutes</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stage 3: Caregiver Alert (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={360}
                required
                value={caregiverGraceMinutes}
                onChange={(e) => setCaregiverGraceMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default: 60 minutes</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stage 4: Doctor Escalation (Minutes)
              </label>
              <input
                type="number"
                min={30}
                max={720}
                required
                value={healthcareGraceMinutes}
                onChange={(e) => setHealthcareGraceMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default: 120 minutes</p>
            </div>
          </div>

          {/* Healthcare Escalation Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 block">
                Enable Stage 4 Healthcare Escalation
              </span>
              <span className="text-[11px] text-slate-500">
                Notify registered clinic/physician if dose remains unconfirmed after the extended interval.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableHealthcareEscalation}
                onChange={(e) => setEnableHealthcareEscalation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>

        {/* Email Delivery Diagnostics Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Email Delivery Diagnostics</h3>
                <p className="text-xs text-slate-500">
                  Verify that your SMTP provider can dispatch notification emails to your address.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={testingEmail}
              onClick={handleTestEmail}
              className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {testingEmail ? 'Sending Test...' : 'Send Test Email'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <div className="font-bold mb-1">
                {testResult.success ? '✅ Success' : '❌ Email Error'}
              </div>
              <p className="text-xs leading-relaxed">{testResult.message}</p>
            </div>
          )}
        </div>

        {/* Legal / Medical Disclaimer Box */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <strong>Medical Disclaimer:</strong> MediSync is a digital medication schedule reminder and adherence tracking tool. It does not provide medical diagnoses, alter prescriptions, or guarantee physical drug ingestion. Always consult your certified medical professional for dosage guidelines.
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
