import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ImportStatement() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setSuccessResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a CSV or PDF file to upload.');
      return;
    }

    setUploading(true);
    setProgress(15);
    setErrorMsg('');
    setSuccessResult(null);

    const formData = new FormData();
    formData.append('statement', file);

    try {
      // Fast progress simulator for awesome visual styling
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 250);

      const response = await axios.post('/api/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(interval);
      setProgress(100);
      setSuccessResult(response.data);
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to parse and upload bank statement file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Bank Statement Import</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">
          Securely import statements in PDF or CSV formats to auto-classify transactions.
        </p>
      </div>

      <div className="glass p-8 rounded-3xl border border-border space-y-6">
        {/* Upload Container form */}
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-all relative">
            <input
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
              <Upload className="w-8 h-8" />
            </div>
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{file.name}</p>
                <p className="text-xs text-neutral-400">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Drag & drop files here, or browse files</p>
                <p className="text-xs text-neutral-400">Supports standard bank transaction exports (PDF, CSV up to 10MB)</p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <span>Parsing PDF columns & mapping neural layers...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 text-rose-500 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {successResult && (
            <div className="p-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 text-emerald-500 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <h4 className="text-sm font-bold">Import Operations Concluded Successfully!</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs pt-2 text-neutral-600 dark:text-neutral-300">
                <div className="p-3 glass rounded-lg border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Total Scanned</p>
                  <p className="text-lg font-bold mt-1">{successResult.totalParsed} txs</p>
                </div>
                <div className="p-3 glass rounded-lg border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Imported New</p>
                  <p className="text-lg font-bold mt-1 text-primary">{successResult.insertedCount} txs</p>
                </div>
                <div className="p-3 glass rounded-lg border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Duplicates Skipped</p>
                  <p className="text-lg font-bold mt-1 text-amber-500">{successResult.duplicateCount} txs</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-3.5 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-premium"
          >
            {uploading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Process Statement & Extract Transactions'}
          </button>
        </form>
      </div>
    </div>
  );
}
