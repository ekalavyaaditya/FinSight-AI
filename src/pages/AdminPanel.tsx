import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Layers, ShieldAlert, CheckCircle, RefreshCw, Eye } from 'lucide-react';

export default function AdminPanel() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Administrative setting state
  const [maintenance, setMaintenance] = useState(false);
  const [allowSignup, setAllowSignup] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data || []);

      if (statsRes.data?.settings) {
        setMaintenance(statsRes.data.settings.maintenanceMode);
        setAllowSignup(statsRes.data.settings.signupAllowed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Are you sure you want to change this user's administrative level to ${nextRole}?`)) return;
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: nextRole });
      fetchAdminData();
    } catch (err) {
      alert('Role modification failed');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put('/api/admin/settings', {
        maintenanceMode: maintenance,
        signupAllowed: allowSignup,
        freeTierLimit: 1000.0,
      });
      alert('Administrative configuration updated successfully');
      fetchAdminData();
    } catch (err) {
      alert('Failed to modify global configurations');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-neutral-400 font-light animate-pulse">Retrieving administrative credentials...</div>;
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Platform Administration</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">Manage portal configurations, view telemetry, and re-assign user roles.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass p-5 rounded-2xl border border-border">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Total Registered</p>
            <p className="text-2xl font-extrabold mt-1 text-primary">{stats.metrics.totalUsers} users</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-border">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Verified Profiles</p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-500">{stats.metrics.verifiedUsers} users</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-border">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Statement Transactions</p>
            <p className="text-2xl font-extrabold mt-1 text-indigo-500">{stats.metrics.totalTransactions} items</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-border">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Active Sessions</p>
            <p className="text-2xl font-extrabold mt-1 text-neutral-800 dark:text-neutral-100">{stats.metrics.activeSessions} links</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Global settings modification panel */}
        <div className="glass p-6 rounded-3xl border border-border h-fit space-y-6">
          <div>
            <h3 className="text-base font-bold">Platform Controls</h3>
            <p className="text-xs text-neutral-400">Apply global settings overrides.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-bold">Maintenance Mode</p>
                <p className="text-[10px] text-neutral-400">Puts portal into lock state</p>
              </div>
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
                className="w-9 h-5 rounded-full appearance-none bg-neutral-300 checked:bg-primary cursor-pointer relative"
              />
            </div>

            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-bold">Allow Registration</p>
                <p className="text-[10px] text-neutral-400">Permits custom email signup</p>
              </div>
              <input
                type="checkbox"
                checked={allowSignup}
                onChange={(e) => setAllowSignup(e.target.checked)}
                className="w-9 h-5 rounded-full appearance-none bg-neutral-300 checked:bg-primary cursor-pointer relative"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-all"
            >
              Apply Platform Controls
            </button>
          </div>
        </div>

        {/* Dynamic Audit log logs list */}
        <div className="lg:col-span-2 glass p-6 rounded-3xl border border-border space-y-4">
          <h3 className="text-base font-bold">Platform Telemetry Audit Logs</h3>
          <div className="divide-y divide-border rounded-xl border border-border bg-white/50 dark:bg-black/30 overflow-hidden text-xs">
            {stats && stats.auditLogs && stats.auditLogs.map((log: any) => (
              <div key={log.id} className="p-3.5 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <div className="space-y-0.5">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{log.action}</p>
                  <p className="text-[10px] text-neutral-400">IP: {log.ipAddress || 'Transient'} • {log.user?.fullName || 'Platform'}</p>
                </div>
                <span className="text-neutral-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users Role Management Table */}
      <div className="glass rounded-3xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-neutral-50/50 dark:bg-neutral-900/20">
          <h3 className="text-base font-bold">Administrative User Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100/50 dark:bg-neutral-900/30 font-bold text-neutral-400">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Credit Score</th>
                <th className="p-4 text-center">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/10 transition-all">
                  <td className="p-4">
                    <div>
                      <p className="font-bold">{u.fullName}</p>
                      <p className="text-[10px] text-neutral-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${u.isVerified ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {u.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="p-4 font-semibold">{u.creditScore || '—'}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleUpdateRole(u.id, u.role)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Swap Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
