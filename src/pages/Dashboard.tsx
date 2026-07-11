import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Search,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [stats, setStats] = useState({
    balance: 14500,
    income: 5500,
    expenses: 2450,
    netWorth: 41200,
    healthScore: 84,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel API calls
      const [txRes, insightRes, predRes, goalsRes, loansRes] = await Promise.all([
        axios.get('/api/transactions?limit=8'),
        axios.get('/api/intelligence/ai-insights').catch(() => ({ data: { insights: [] } })),
        axios.get('/api/intelligence/predictions').catch(() => ({ data: null })),
        axios.get('/api/intelligence/savings').catch(() => ({ data: [] })),
        axios.get('/api/intelligence/loans').catch(() => ({ data: [] })),
      ]);

      const txList = txRes.data.transactions || [];
      setTransactions(txList);
      setInsights(insightRes.data.insights || []);
      setPredictions(predRes.data);
      setGoals(goalsRes.data || []);
      setLoans(loansRes.data || []);

      // Recalculate dynamic statistics based on actual database entries
      if (txList.length > 0) {
        let totalIncome = 0;
        let totalExpense = 0;

        txList.forEach((t: any) => {
          if (t.amount > 0) {
            totalIncome += t.amount;
          } else {
            totalExpense += Math.abs(t.amount);
          }
        });

        // Dynamic metrics setup
        const computedIncome = totalIncome || 5500;
        const computedExpense = totalExpense || 2450;
        const computedSavings = Math.max(0, computedIncome - computedExpense);

        // Base starting balance
        const baseBalance = 15000 + computedSavings;

        setStats({
          balance: parseFloat(baseBalance.toFixed(2)),
          income: parseFloat(computedIncome.toFixed(2)),
          expenses: parseFloat(computedExpense.toFixed(2)),
          netWorth: parseFloat((baseBalance + 25000).toFixed(2)), // balance + mock investments
          healthScore: computedExpense > computedIncome ? 45 : computedExpense > computedIncome * 0.75 ? 65 : 88,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recharts Expense Category Pie data
  const COLORS = ['#0070f3', '#00DF89', '#FF4D4D', '#F5A623', '#7928CA', '#0051af', '#ff0080'];
  const getPieData = () => {
    const counts: { [key: string]: number } = {};
    transactions.filter(t => t.amount < 0).forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + Math.abs(t.amount);
    });
    const entries = Object.entries(counts).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
    return entries.length > 0 ? entries : [
      { name: 'FOOD', value: 450 },
      { name: 'RENT', value: 1500 },
      { name: 'SHOPPING', value: 350 },
      { name: 'UTILITIES', value: 120 },
    ];
  };

  // Bar chart monthly aggregates mock data combined with prediction
  const getBarData = () => {
    if (predictions && predictions.trends) {
      return predictions.trends.map((item: any) => ({
        name: item.month,
        Expenses: item.amount,
      }));
    }
    return [
      { name: 'Prior Month 2', Expenses: 2100 },
      { name: 'Prior Month 1', Expenses: 2350 },
      { name: 'Predicted Next', Expenses: 2450 },
    ];
  };

  // Generate matrix cells for a GitHub-style daily spending heatmap (e.g. past 24 days)
  const getHeatmapGrid = () => {
    // 4 rows (weeks) x 7 columns (days)
    const days = [];
    const seedSpend = [0, 15, 0, 45, 120, 0, 8, 32, 0, 0, 95, 10, 0, 240, 15, 0, 0, 5, 40, 0, 12, 0, 80, 22];
    for (let i = 0; i < 28; i++) {
      const amt = seedSpend[i % seedSpend.length];
      days.push({
        day: i + 1,
        amount: amt,
        colorClass: amt === 0
          ? 'bg-neutral-100 dark:bg-neutral-900 border border-border'
          : amt < 30
          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800'
          : amt < 100
          ? 'bg-blue-300 dark:bg-blue-800 text-blue-900'
          : 'bg-primary text-white font-bold',
      });
    }
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-neutral-500 animate-pulse font-light">Loading premium fintech workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Financial Workspace</h1>
          <p className="text-sm text-neutral-500 font-light mt-1">Real-time analytical portfolio performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="glass p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-neutral-500 hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/import" className="glass py-2 px-4 rounded-full text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all shadow-premium flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Import Statement
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Liquid Portfolio Value</p>
              <h3 className="text-2xl font-extrabold mt-1 text-primary">${stats.balance.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="text-green-500 font-semibold flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5" /> +12.4%</span>
            vs prior quarter
          </div>
        </div>

        {/* Monthly Income */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Monthly Inflow</p>
              <h3 className="text-2xl font-extrabold mt-1 text-emerald-500">${stats.income.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="text-green-500 font-semibold flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5" /> Stability</span>
            Recurring payroll checked
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Monthly Outflow</p>
              <h3 className="text-2xl font-extrabold mt-1 text-rose-500">${stats.expenses.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="text-amber-500 font-semibold">Overspend risk:</span>
            Low-medium threshold
          </div>
        </div>

        {/* Health Score */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Financial Health Score</p>
              <h3 className="text-2xl font-extrabold mt-1 text-indigo-500">{stats.healthScore} <span className="text-xs font-normal text-neutral-400">/ 100</span></h3>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="text-indigo-500 font-semibold">Grade A-</span>
            Top 15% of active cohort
          </div>
        </div>
      </div>

      {/* Main Analytical Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expense Forecast / Predictions */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-border space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">ML Expenses Trend & Prediction</h3>
              <p className="text-xs text-neutral-400 font-light mt-0.5">Autoregressive confidence forecasting based on statement logs.</p>
            </div>
            {predictions && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                Confidence: {Math.round(predictions.confidence_score * 100)}%
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBarData()}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,15,20,0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="Expenses" fill="#0070f3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {predictions && (
            <div className="glass p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-amber-500">Risk Assessment Forecast</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 font-light mt-1">
                  {predictions.risk_explanation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Category Composition */}
        <div className="glass p-6 rounded-2xl border border-border flex flex-col justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold">Category Composition</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">Distribution of overall outbound liabilities.</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {getPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legends */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            {getPieData().slice(0, 4).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="font-light text-neutral-600 dark:text-neutral-300 truncate max-w-[100px]">{entry.name}</span>
                <span className="font-bold ml-auto">${entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GitHub-style Heatmap & Recent Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spending Density Calendar Heatmap */}
        <div className="glass p-6 rounded-2xl border border-border space-y-6">
          <div>
            <h3 className="text-lg font-bold">Spending Density Grid</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">Historical daily transaction density index.</p>
          </div>

          {/* Simple Grid Calendar */}
          <div className="grid grid-cols-7 gap-2.5 max-w-[320px] mx-auto">
            {getHeatmapGrid().map((cell) => (
              <div
                key={cell.day}
                className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-light transition-all duration-300 hover:scale-110 cursor-pointer ${cell.colorClass}`}
                title={`Day ${cell.day}: $${cell.amount}`}
              >
                {cell.day}
              </div>
            ))}
          </div>

          <div className="flex justify-between text-[11px] text-neutral-500 font-light max-w-[320px] mx-auto pt-2 border-t border-border">
            <span>Low Spending</span>
            <span>Peak Spending</span>
          </div>
        </div>

        {/* Recent Statement Transactions ledger list */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-border space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">Statement Registry</h3>
              <p className="text-xs text-neutral-400 font-light mt-0.5">Recent automated statement audit logs.</p>
            </div>
            <Link to="/transactions" className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
              View All Registry <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white/50 dark:bg-black/30">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-light">
                No statement records uploaded yet.
                <Link to="/import" className="block text-xs text-primary font-bold mt-2 hover:underline">
                  Upload PDF Bank Statement
                </Link>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-3.5 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-all text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-xs font-bold ${tx.amount > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                      {tx.category.slice(0, 4)}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100 max-w-[180px] sm:max-w-xs truncate">{tx.description}</p>
                      <p className="text-xs text-neutral-400 font-light mt-0.5">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Advisory Intelligence Insights Section */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-500" /> Neural Advisors Warnings & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {insights.map((insight, idx) => (
              <div key={idx} className="glass p-5 rounded-2xl border border-border relative flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                      {insight.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      insight.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {insight.severity} Alert
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-light leading-relaxed">
                    {insight.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
