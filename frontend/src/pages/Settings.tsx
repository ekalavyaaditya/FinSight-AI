import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import type { RiskProfile } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Settings as SettingsIcon, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuthStore();

  const [name, setName] = useState(user?.fullName || '');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [risk, setRisk] = useState<RiskProfile>(user?.riskProfile || 'MODERATE');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateProfile(name, currency, risk);
      setMessage('Profile settings updated successfully!');
    } catch (err: any) {
      setMessage(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Deleting your account will permanently wipe all transactions, targets, and sessions. This action cannot be undone. Are you sure?')) return;
    try {
      await axios.delete('/api/auth/delete-account');
      await logout();
      navigate('/');
    } catch (err) {
      alert('Failed to delete account');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">Adjust system parameters, connected banks, or remove personal details.</p>
      </div>

      {message && (
        <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-500 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}

      {/* Main Settings Form */}
      <div className="glass p-8 rounded-3xl border border-border space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full glass py-2.5 px-3.5 rounded-xl text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full glass py-2.5 px-3.5 rounded-xl text-sm focus:outline-none"
              >
                <option value="USD">USD ($) - US Dollars</option>
                <option value="EUR">EUR (€) - Euros</option>
                <option value="GBP">GBP (£) - British Pounds</option>
                <option value="INR">INR (₹) - Indian Rupees</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Risk profile</label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value as RiskProfile)}
                className="w-full glass py-2.5 px-3.5 rounded-xl text-sm focus:outline-none font-medium text-primary"
              >
                <option value="CONSERVATIVE">Conservative - High Debt Fixed Income</option>
                <option value="MODERATE">Moderate - Balanced ETFs/Equities</option>
                <option value="AGGRESSIVE">Aggressive - Leveraged indices/Crypto</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <p className="text-[10px] text-neutral-400 font-light italic">
                Adjusting your risk profile dynamically updates your educational investment portfolio recommendations.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-3 px-8 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 shadow-premium"
          >
            {saving ? 'Saving...' : 'Update Settings'}
          </button>
        </form>
      </div>

      {/* Connected Bank accounts Simulation */}
      <div className="glass p-6 rounded-3xl border border-border space-y-4">
        <div>
          <h3 className="text-sm font-bold">Connected Banking institutions</h3>
          <p className="text-xs text-neutral-400 font-light mt-0.5">Mock connections simulated via manual uploads.</p>
        </div>
        <div className="flex items-center gap-3 p-3.5 glass rounded-xl border border-border">
          <span className="p-2 bg-primary/10 rounded-lg text-primary text-xs font-bold">PDF</span>
          <div>
            <p className="text-xs font-bold">Direct Offline Parser active</p>
            <p className="text-[10px] text-neutral-400">Standard file-extraction layer active</p>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10">Active</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass p-6 rounded-3xl border border-rose-500/10 bg-rose-500/5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-500">System Danger Zone</h3>
          <p className="text-xs text-neutral-400 font-light mt-0.5">Wipes profile statistics and logs permanently.</p>
        </div>
        <button
          onClick={handleDeleteAccount}
          className="py-2.5 px-6 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-premium"
        >
          <Trash2 className="w-4 h-4" /> Delete Profile permanently
        </button>
      </div>
    </div>
  );
}

