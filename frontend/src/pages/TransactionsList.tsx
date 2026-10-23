import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Download,
  Star,
  ChevronLeft,
  ChevronRight,
  Edit2,
  CheckCircle,
} from 'lucide-react';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Custom manual modal toggles
  const [modalOpen, setModalOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('OTHERS');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/transactions', {
        params: {
          search,
          category,
          page,
          limit: pageSize,
        },
      });
      setTransactions(res.data.transactions || []);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to pull transaction logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, category, page, pageSize]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) return;

    const nextPage = Math.min(totalPages, Math.max(1, requestedPage));
    setPage(nextPage);
    setPageInput(String(nextPage));
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/transactions', {
        description: desc,
        amount: parseFloat(amount),
        category: cat,
        date: new Date(),
      });
      setDesc('');
      setAmount('');
      setModalOpen(false);
      fetchTransactions();
    } catch (err) {
      alert('Failed to insert custom manual transaction');
    }
  };

  const handleToggleFavorite = async (id: string, isFav: boolean) => {
    try {
      await axios.put(`/api/transactions/${id}`, { isFavorite: !isFav });
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isFavorite: !isFav } : t))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      await axios.delete(`/api/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      alert('Deletion failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected records?`)) return;
    try {
      await axios.delete('/api/transactions/bulk', { data: { ids: selectedIds } });
      setSelectedIds([]);
      fetchTransactions();
    } catch (err) {
      alert('Bulk deletion failed');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(transactions.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Statement Ledger</h1>
          <p className="text-sm text-neutral-500 font-light mt-1">Audit, modify, filter, or export recorded transaction history.</p>
        </div>
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <a
            href="/api/transactions/export/csv"
            className="glass py-2 px-4 rounded-full text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV Ledger
          </a>
          <button
            onClick={() => setModalOpen(true)}
            className="glass py-2 px-4 rounded-full text-sm font-medium text bg-primary hover:text-white hover:bg-primary-dark transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Transaction
          </button>
        </div>
      </div>

      {/* Complex Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search merchants, labels, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass py-2.5 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full glass py-2.5 px-4 rounded-xl text-sm focus:outline-none"
          >
            <option value="">All Categories</option>
            {['FOOD', 'SHOPPING', 'TRAVEL', 'BILLS', 'UTILITIES', 'INVESTMENT', 'SALARY', 'RENT', 'EMI'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="py-2.5 px-5 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/15 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Bulk Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className="glass rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50/50 dark:bg-neutral-900/40 border-b border-border text-xs uppercase font-bold text-neutral-400 tracking-wider">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={handleSelectAll}
                    className="rounded border-neutral-300 text-primary"
                  />
                </th>
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-400 font-light">
                    Querying ledger matrices...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-400 font-light">
                    No matching transaction records discovered.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-all">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={(e) => handleSelectOne(t.id, e.target.checked)}
                        className="rounded border-neutral-300 text-primary"
                      />
                    </td>
                    <td className="p-4 text-neutral-500 font-light">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-neutral-950 dark:text-neutral-100">{t.description}</td>
                    <td className="p-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        {t.category}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${t.amount > 0 ? 'text-emerald-500' : 'text-neutral-950 dark:text-neutral-50'}`}>
                      {t.amount > 0 ? '+' : ''}${t.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleToggleFavorite(t.id, t.isFavorite)}
                          className={`p-1.5 rounded-lg transition-all ${t.isFavorite ? 'text-amber-500' : 'text-neutral-400 hover:text-amber-500'}`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-neutral-50/30 dark:bg-neutral-950/20">
          <div className="flex items-center gap-3">
            <p className="text-xs text-neutral-400">Page {page} of {totalPages}</p>
            <label htmlFor="transaction-page-size" className="text-xs text-neutral-400">Rows</label>
            <select
              id="transaction-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="glass rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 glass rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5">
              <label htmlFor="transaction-page" className="sr-only">Go to page</label>
              <input
                id="transaction-page"
                type="number"
                min={1}
                max={totalPages}
                step={1}
                required
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className="w-16 glass rounded-lg px-2 py-2 text-center text-sm focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                className="px-3 py-2 glass rounded-lg text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
              >
                Go
              </button>
            </form>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 glass rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom record creation Modal Popup */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass p-6 rounded-3xl border border-border shadow-2xl space-y-6">
            <h3 className="text-lg font-extrabold">Manual Record Registry</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Description</label>
                <input
                  type="text"
                  placeholder="Grocery market checkout"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                  className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="-45.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-neutral-400">Category</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full glass py-2.5 px-3 rounded-lg text-sm focus:outline-none"
                >
                  {['FOOD', 'SHOPPING', 'TRAVEL', 'BILLS', 'UTILITIES', 'INVESTMENT', 'SALARY', 'RENT', 'EMI'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full text-xs font-semibold glass text-neutral-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-all"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
