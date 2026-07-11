import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Percent, Calendar, HelpCircle, ArrowUpRight, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function EMIPlanner() {
  const [principal, setPrincipal] = useState('25000');
  const [rate, setRate] = useState('5.5');
  const [tenure, setTenure] = useState('60');
  const [extra, setExtra] = useState('150');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calculateAmortization = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/intelligence/loans/calculate-emi', {
        params: {
          principal,
          interestRate: rate,
          tenureMonths: tenure,
          extraMonthlyPay: extra,
        },
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateAmortization();
  }, [principal, rate, tenure, extra]);

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">EMI Debt Optimizer</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">Simulate loan repayments, extra principal payments, and forecast total interest saved.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Setup Parameters Panel */}
        <div className="glass p-6 rounded-3xl border border-border h-fit space-y-6">
          <div>
            <h3 className="text-lg font-bold">Amortization Parameters</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">Adjust inputs to compute amortization balances.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Principal Balance ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  className="w-full glass py-2.5 pl-9 pr-3 rounded-lg text-sm focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Rate (Annual %)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full glass py-2.5 pl-9 pr-3 rounded-lg text-sm focus:outline-none font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Tenure (Months)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full glass py-2.5 pl-9 pr-3 rounded-lg text-sm focus:outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-neutral-400">Simulate Extra Monthly Pay ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="number"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="w-full glass py-2.5 pl-9 pr-3 rounded-lg text-sm focus:outline-none font-semibold border-2 border-primary/20"
                />
              </div>
              <p className="text-[10px] text-neutral-400 font-light">Enter surplus payments to simulate early settlement.</p>
            </div>
          </div>
        </div>

        {/* Dynamic Calculations results */}
        <div className="lg:col-span-2 space-y-8">
          {result && (
            <>
              {/* Top Analytical Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="glass p-5 rounded-2xl border border-border">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Standard EMI</p>
                  <p className="text-2xl font-extrabold mt-1 text-primary">${result.standardMonthlyEMI}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Scheduled regular pay</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-border border-primary/20 bg-primary/5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Interest Saved</p>
                  <p className="text-2xl font-extrabold mt-1 text-emerald-500">${result.interestSaved}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Saved from extra payments</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-border border-primary/20 bg-primary/5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Months Saved</p>
                  <p className="text-2xl font-extrabold mt-1 text-indigo-500">{result.monthsSaved} mo</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Accelerated settlement</p>
                </div>
              </div>

              {/* Chart of Amortization remaining balance decline curve */}
              <div className="glass p-6 rounded-3xl border border-border space-y-4">
                <div>
                  <h3 className="text-base font-bold">Outstanding Principle Balance Curvature</h3>
                  <p className="text-xs text-neutral-400">Scheduled trajectory mapping outstanding liability.</p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.schedule.filter((_: any, idx: number) => idx % 3 === 0)}>
                      <XAxis dataKey="month" stroke="#888888" fontSize={11} label={{ value: 'Month', position: 'insideBottom', offset: -5 }} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip />
                      <Area type="monotone" dataKey="remainingBalance" stroke="#0070f3" fill="rgba(0,112,243,0.1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Amortization schedule ledger table */}
              <div className="glass rounded-3xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-neutral-50/50 dark:bg-neutral-900/30">
                  <h4 className="text-sm font-bold">Amortization Ledger Schedule</h4>
                </div>
                <div className="max-h-60 overflow-y-auto no-scrollbar">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-neutral-100/50 dark:bg-neutral-900/20 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                      <tr>
                        <th className="p-3">Month</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3">Principal</th>
                        <th className="p-3">Interest</th>
                        <th className="p-3">Extra Paid</th>
                        <th className="p-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-light">
                      {result.schedule.map((row: any) => (
                        <tr key={row.month} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/10">
                          <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100">Month {row.month}</td>
                          <td className="p-3">${row.emi}</td>
                          <td className="p-3 text-emerald-500">${row.principal}</td>
                          <td className="p-3 text-rose-500">${row.interest}</td>
                          <td className="p-3 text-primary">${row.extraPaid}</td>
                          <td className="p-3 text-right font-semibold">${row.remainingBalance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
