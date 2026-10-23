import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Plus, CheckCircle2, Trash2, Calendar } from 'lucide-react';

export default function SavingsPlanner() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New goal form parameters
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [monthly, setMonthly] = useState('');
  const [date, setDate] = useState('');

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/intelligence/savings');
      setGoals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/intelligence/savings', {
        name,
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current || '0'),
        monthlyContribution: parseFloat(monthly || '0'),
        targetDate: new Date(date),
      });
      setName('');
      setTarget('');
      setCurrent('');
      setMonthly('');
      setDate('');
      fetchGoals();
    } catch (err) {
      alert('Failed to establish savings goal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this goal tracker?')) return;
    try {
      await axios.delete(`/api/intelligence/savings/${id}`);
      fetchGoals();
    } catch (err) {
      alert('Deletion failed');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Savings & Wealth Planner</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">Configure targets, schedule monthly allocations, and monitor progress bars.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Set Savings Targets Form */}
        <div className="glass p-6 rounded-3xl border border-border h-fit space-y-6">
          <div>
            <h3 className="text-lg font-bold">New Target Matrix</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">Establish custom portfolio targets.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Goal Description</label>
              <input
                type="text"
                placeholder="6-Month Emergency Buffer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Target ($)</label>
                <input
                  type="number"
                  placeholder="20000"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                  className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Savings ($)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Monthly Contribution ($)</label>
              <input
                type="number"
                placeholder="800"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Target Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Goal
            </button>
          </form>
        </div>

        {/* Goals Progress Monitor list */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold">Active Targets Coverage</h3>

          {loading ? (
            <p className="text-sm text-neutral-400 font-light">Loading targets matrix...</p>
          ) : goals.length === 0 ? (
            <div className="glass p-8 text-center text-neutral-400 font-light rounded-3xl border border-border">
              No targets established. Build your first financial target in the sidebar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((g) => {
                const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                return (
                  <div key={g.id} className="glass p-5 rounded-2xl border border-border relative flex flex-col justify-between gap-5 shadow-premium">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                          <Target className="w-5 h-5" />
                        </div>
                        <button onClick={() => handleDelete(g.id)} className="p-1 text-neutral-400 hover:text-rose-500 rounded transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{g.name}</h4>
                      <p className="text-xs text-neutral-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Target: {new Date(g.targetDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{percent}% Complete</span>
                        <span>${g.currentAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    {g.monthlyContribution > 0 && (
                      <div className="pt-2 text-xs text-neutral-500 font-light border-t border-border">
                        Allocating <span className="font-bold text-neutral-900 dark:text-neutral-100">${g.monthlyContribution}/mo</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
