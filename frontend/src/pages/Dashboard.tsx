import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Award,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
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

interface DashboardSummary {
  balance: number;
  income: number;
  expenses: number;
  netWorth: number;
  savings: number;
  healthScore: number;
  healthGrade: string;
  healthStatus: string;
  inflowCount: number;
  outflowCount: number;
  totalCount: number;
  expenseRisk: string;
  categoryBreakdown: Array<{ name: string; value: number }>;
  dailySpending: Array<{ day: number; date: string; amount: number }>;
  monthlyTrends: Array<{ month: string; amount: number }>;
  currency: string;
}

const COLORS = ['#0070f3', '#00DF89', '#FF4D4D', '#F5A623', '#7928CA', '#0051af', '#ff0080'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, txRes, insightRes, predRes] = await Promise.all([
        axios.get('/api/transactions/summary'),
        axios.get('/api/transactions?limit=8'),
        axios.get('/api/intelligence/ai-insights').catch(() => ({ data: { insights: [] } })),
        axios.get('/api/intelligence/predictions').catch(() => ({ data: null })),
      ]);

      setSummary(summaryRes.data);
      setTransactions(txRes.data.transactions || []);
      setInsights(insightRes.data.insights || []);
      setPredictions(predRes.data);
    } catch (err) {
      console.error('Failed to load dashboard parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number = 0, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Bar chart monthly aggregates combined with ML predictions from API
  const getBarData = () => {
    if (predictions?.trends && predictions.trends.length > 0) {
      return predictions.trends.map((item: any) => ({
        name: item.month,
        Expenses: item.amount,
      }));
    }
    if (summary?.monthlyTrends && summary.monthlyTrends.length > 0) {
      return summary.monthlyTrends.map((item: any) => ({
        name: item.month,
        Expenses: item.amount,
      }));
    }
    return [];
  };

  const pieData = summary?.categoryBreakdown || [];
  const barData = getBarData();
  const dailySpending = summary?.dailySpending || [];
  const maxDailySpend = Math.max(0, ...dailySpending.map((d) => d.amount));

  const getCellBg = (amt: number) => {
    if (amt <= 0) return 'bg-neutral-100 dark:bg-neutral-900 border border-border text-neutral-400';
    if (maxDailySpend <= 0) return 'bg-blue-100 dark:bg-blue-950 text-blue-800';
    const ratio = amt / maxDailySpend;
    if (ratio < 0.3) return 'bg-blue-100 dark:bg-blue-950 text-blue-800 border border-blue-500/20';
    if (ratio < 0.7) return 'bg-blue-300 dark:bg-blue-800 text-blue-900 dark:text-blue-100 border border-blue-500/30';
    return 'bg-primary text-white font-bold shadow-sm';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-neutral-500 animate-pulse font-light">Loading analytical workspace from API...</p>
      </div>
    );
  }

  const currency = summary?.currency || 'USD';

  return (
    <div className="space-y-8 pb-16">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Financial Workspace</h1>
          <p className="text-sm text-neutral-500 font-light mt-1">Real-time analytical portfolio performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refresh from API"
            className="glass p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-neutral-500 hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/import"
            className="glass py-2 px-4 rounded-full text-sm font-medium hover:text-white text-primary bg-primary hover:bg-primary-dark transition-all shadow-premium flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Import Statement
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid - 100% computed from API */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net / Statement Balance */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Liquid Portfolio Value</p>
              <h3 className="text-2xl font-extrabold mt-1 text-primary">
                {formatCurrency(summary?.balance ?? 0, currency)}
              </h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            {summary && summary.totalCount > 0 ? (
              <span className="text-primary font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {summary.totalCount} statement records synced
              </span>
            ) : (
              <span>No statements uploaded yet</span>
            )}
          </div>
        </div>

        {/* Monthly Inflow */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Inflow</p>
              <h3 className="text-2xl font-extrabold mt-1 text-emerald-500">
                {formatCurrency(summary?.income ?? 0, currency)}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            {summary && summary.inflowCount > 0 ? (
              <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> {summary.inflowCount} deposits logged
              </span>
            ) : (
              <span>No deposits recorded</span>
            )}
          </div>
        </div>

        {/* Monthly Outflow */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Outflow</p>
              <h3 className="text-2xl font-extrabold mt-1 text-rose-500">
                {formatCurrency(summary?.expenses ?? 0, currency)}
              </h3>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="text-amber-500 font-semibold">Risk:</span>
            <span>{summary?.expenseRisk ?? 'Awaiting data'}</span>
            {summary && summary.outflowCount > 0 && (
              <span className="text-neutral-400">({summary.outflowCount} debits)</span>
            )}
          </div>
        </div>

        {/* Health Score */}
        <div className="glass p-6 rounded-2xl border border-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Financial Health Score</p>
              <h3 className="text-2xl font-extrabold mt-1 text-indigo-500">
                {summary?.healthScore ?? 0} <span className="text-xs font-normal text-neutral-400">/ 100</span>
              </h3>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500 truncate">
            <span className="text-indigo-500 font-semibold">{summary?.healthGrade ?? 'Grade N/A'}</span>
            <span className="truncate">{summary?.healthStatus ?? 'Awaiting statement data'}</span>
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
            {predictions && predictions.confidence_score > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                Confidence: {Math.round(predictions.confidence_score * 100)}%
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
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
                    formatter={(val: any) => [formatCurrency(Number(val), currency), 'Expenses']}
                  />
                  <Bar dataKey="Expenses" fill="#0070f3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-6 text-center">
                <BarChart3 className="w-10 h-10 text-neutral-400 mb-2" />
                <p className="text-sm font-medium text-foreground">No monthly trend data available</p>
                <p className="text-xs text-neutral-400 font-light mt-1 max-w-sm">
                  Upload bank statements to view machine-learning expense trends and predictive spending forecasts.
                </p>
                <Link to="/import" className="mt-4 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Upload Statement <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {predictions && predictions.risk_explanation && summary && summary.totalCount > 0 && (
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
            <p className="text-xs text-neutral-400 font-light mt-0.5">Distribution of overall outbound liabilities from statements.</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val), currency), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-4 text-center">
                <PieIcon className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-xs font-medium text-foreground">No expense categories</p>
                <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                  Debits will automatically be grouped into categorized allocations here.
                </p>
              </div>
            )}
          </div>

          {/* Chart Legends */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            {pieData.slice(0, 4).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="font-light text-neutral-600 dark:text-neutral-300 truncate max-w-[100px]">{entry.name}</span>
                <span className="font-bold ml-auto">{formatCurrency(entry.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Spending Heatmap & Recent Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spending Density Calendar Heatmap */}
        <div className="glass p-6 rounded-2xl border border-border space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">Spending Density Grid</h3>
              <p className="text-xs text-neutral-400 font-light mt-0.5">
                {dailySpending.length > 0
                  ? `Daily outflow intensity (${dailySpending[0].date} → ${dailySpending[dailySpending.length - 1].date})`
                  : 'Daily statement outflow intensity (past 28 days).'}
              </p>
            </div>
            <Calendar className="w-4 h-4 text-neutral-400" />
          </div>

          {/* 4x7 Daily Heatmap Grid */}
          <div className="grid grid-cols-7 gap-2.5 max-w-[320px] mx-auto">
            {dailySpending.length > 0 ? (
              dailySpending.map((cell) => (
                <div
                  key={cell.date}
                  className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-light transition-all duration-300 hover:scale-110 cursor-pointer ${getCellBg(
                    cell.amount
                  )}`}
                  title={`${cell.date}: ${formatCurrency(cell.amount, currency)}`}
                >
                  {cell.day}
                </div>
              ))
            ) : (
              <div className="col-span-7 p-6 text-center text-xs text-neutral-400 border border-dashed border-border rounded-xl">
                Awaiting statement records to generate daily spend heatmap.
              </div>
            )}
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
                      {String(tx.category).slice(0, 4)}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100 max-w-[180px] sm:max-w-xs truncate">{tx.description}</p>
                      <p className="text-xs text-neutral-400 font-light mt-0.5">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {tx.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), currency)}
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

function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
