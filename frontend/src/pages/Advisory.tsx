import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Compass, ShieldAlert, CheckCircle, HelpCircle, Award, Sparkles } from 'lucide-react';

export default function Advisory() {
  const [investResult, setInvestResult] = useState<any>(null);
  const [creditResult, setCreditResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdvisory = async () => {
    setLoading(true);
    try {
      const [investRes, creditRes] = await Promise.all([
        axios.get('/api/intelligence/investment-recommendations'),
        axios.get('/api/intelligence/credit-roadmap'),
      ]);
      setInvestResult(investRes.data);
      setCreditResult(creditRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisory();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-neutral-400 font-light animate-pulse">Querying advisory recommendations...</div>;
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Advisory & Onboarding Intelligence</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">Get custom portfolios and structured credit score optimization maps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Educational Investment Advisory recommendations */}
        {investResult && (
          <div className="glass p-6 rounded-3xl border border-border flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-1.5">
                  <Compass className="w-5 h-5 text-primary" /> Educational Portfolio Allocations
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Profile: {investResult.riskProfile}
                </span>
              </div>

              {/* Portfolio distributions list */}
              <div className="space-y-4">
                {investResult.portfolio.map((p: any, idx: number) => (
                  <div key={idx} className="glass p-4 rounded-xl border border-border flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{p.asset}</p>
                      <p className="text-xs text-neutral-500 font-light leading-relaxed">{p.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-primary">{p.allocation}%</p>
                      <p className="text-[10px] text-neutral-400 font-medium">Est: {p.yield}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory required Educational Disclaimer notice */}
            <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-500 text-xs font-medium flex items-start gap-2">
              <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <span>
                <b>Disclaimer:</b> {investResult.disclaimer}
              </span>
            </div>
          </div>
        )}

        {/* Actionable Credit Score Optimizer Booster Roadmap */}
        {creditResult && (
          <div className="glass p-6 rounded-3xl border border-border space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-1.5">
                <Award className="w-5 h-5 text-indigo-500" /> Credit Booster Optimization Map
              </h3>
              <div className="text-right">
                <p className="text-base font-extrabold text-indigo-500">{creditResult.currentScore} Score</p>
                <p className="text-[10px] text-neutral-400 font-medium">Rating: {creditResult.rating}</p>
              </div>
            </div>

            <div className="space-y-4">
              {creditResult.suggestions.map((s: any, idx: number) => (
                <div key={idx} className="glass p-4 rounded-xl border border-border relative overflow-hidden flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-500">
                      Impact: {s.impact}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">Timeframe: {s.timeframe}</span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {s.action}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-light leading-relaxed pl-5.5">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
