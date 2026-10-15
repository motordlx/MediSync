import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export const VerifyInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No verification token provided in this URL.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/contacts/verify', { token });
        if (res.data.success) {
          setVerified(true);
          setPatientName(res.data.patientName || 'Patient');
          setRole(res.data.role || 'Caregiver');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Verification token is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-sm">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
          Medi<span className="text-teal-600">Sync</span> Care Circle
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Authorization & Contact Verification
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl text-center space-y-6">
          {loading ? (
            <div className="py-8 space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Verifying invitation token...</p>
            </div>
          ) : verified ? (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Invitation Verified Successfully!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are now confirmed as a trusted Care Circle contact for{' '}
                <strong className="text-slate-900">{patientName}</strong> as their{' '}
                <strong className="text-slate-900 capitalize">{role.replace(/_/g, ' ')}</strong>.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-left">
                You will receive timely email alerts if {patientName} does not confirm a scheduled medication dose within their grace period.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verification Issue</h3>
              <p className="text-xs text-rose-600">{error}</p>
              <p className="text-xs text-slate-400">
                Please ask the patient to resend an invitation from their Care Circle page.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/login"
              className="text-xs font-bold text-teal-600 hover:underline"
            >
              Go to MediSync Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
