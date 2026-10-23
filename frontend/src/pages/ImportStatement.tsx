import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw, X, ShieldAlert, Check, HelpCircle } from 'lucide-react';

export default function ImportStatement() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedRules, setSavedRules] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
      setErrorMsg('');
      setSuccessResult(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setErrorMsg('Please select one or more statement files (PDF, CSV, Excel) to upload.');
      return;
    }

    setUploading(true);
    setProgress(15);
    setErrorMsg('');
    setSuccessResult(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('statements', file);
    });

    try {
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
      setFiles([]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to parse and process your statement batch.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmMapping = async (item: any, customEntity: string, customCategory: string) => {
    try {
      await axios.post('/api/transactions/rules', {
        pattern: item.description,
        entityName: customEntity || item.entityName,
        entityType: item.entityType || 'merchant',
        category: customCategory || item.category,
        subcategory: item.subcategory || 'User Confirmed',
      });
      setSavedRules(prev => [...prev, item.description]);
    } catch (err) {
      console.error('Failed to save confirmed mapping', err);
    }
  };

  const totalSizeMB = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Bank Statement Batch Import</h1>
        <p className="text-sm text-neutral-500 font-light mt-1">
          Securely import single or multi-bank statements (PDF, Scanned PDF, CSV, Excel .xlsx/.xls) with automated entity disambiguation, currency detection, and intelligent review workflows.
        </p>
      </div>

      <div className="glass p-8 rounded-3xl border border-border space-y-6">
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-all relative">
            <input
              type="file"
              multiple
              accept=".csv,.pdf,.xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Drag & drop bank statement files here, or click to browse
              </p>
              <p className="text-xs text-neutral-400">
                Supports single or batch statements: PDF, CSV, Excel (.xlsx, .xls) up to 25MB each
              </p>
            </div>
          </div>

          {/* Selected File Chips */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-neutral-500">
                <span>Selected Files ({files.length})</span>
                <span>Total: {totalSizeMB.toFixed(2)} MB</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900/40 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium truncate">{f.name}</span>
                      <span className="text-neutral-400">({(f.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      disabled={uploading}
                      className="p-1 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <span>Analyzing columnar structures, detecting currency, & classifying entities...</span>
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
            <div className="p-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <h4 className="text-sm font-bold">Statement Batch Successfully Processed!</h4>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 glass rounded-xl border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Total Scanned</p>
                  <p className="text-xl font-bold mt-1 text-neutral-900 dark:text-neutral-100">{successResult.totalParsed} txs</p>
                </div>
                <div className="p-3 glass rounded-xl border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Imported New</p>
                  <p className="text-xl font-bold mt-1 text-primary">{successResult.insertedCount} txs</p>
                </div>
                <div className="p-3 glass rounded-xl border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Duplicates Skipped</p>
                  <p className="text-xl font-bold mt-1 text-amber-500">{successResult.duplicateCount} txs</p>
                </div>
                <div className="p-3 glass rounded-xl border border-emerald-500/10">
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Needs Review</p>
                  <p className="text-xl font-bold mt-1 text-purple-500">{successResult.reviewCount || 0} txs</p>
                </div>
              </div>

              {/* Per-File Summary Table */}
              {successResult.filesProcessed && successResult.filesProcessed.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Files in Batch:</p>
                  <div className="space-y-1.5 text-xs">
                    {successResult.filesProcessed.map((fileRes: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border glass">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold">{fileRes.fileName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {fileRes.format}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
                            {fileRes.detectedCurrency || 'USD'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-500 font-medium">
                          <span>{fileRes.insertedCount} imported</span>
                          {fileRes.duplicateCount > 0 && <span className="text-amber-500">({fileRes.duplicateCount} dups)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review & Feedback Section */}
              {successResult.reviewItems && successResult.reviewItems.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-purple-500 font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Transactions Requiring Verification or Missing Context ({successResult.reviewItems.length})</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {successResult.reviewItems.map((rev: any, idx: number) => {
                      const isConfirmed = savedRules.includes(rev.description);
                      return (
                        <div key={idx} className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100">{rev.description}</p>
                              <p className="text-[11px] text-neutral-500">
                                Date: {rev.transactionDate} • Amount: {rev.currency} {rev.amount} ({rev.transactionType})
                              </p>
                              {rev.evidence && rev.evidence.length > 0 && (
                                <p className="text-[10px] text-neutral-400 mt-0.5 italic">
                                  Evidence: {rev.evidence.join(' | ')}
                                </p>
                              )}
                            </div>
                            {isConfirmed ? (
                              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                                <Check className="w-3 h-3" /> Confirmed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfirmMapping(rev, rev.entityName, rev.category)}
                                className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                              >
                                Confirm & Learn
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={files.length === 0 || uploading}
            className="w-full py-3.5 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-premium"
          >
            {uploading ? (
              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
            ) : (
              `Process ${files.length > 0 ? `${files.length} Statement(s)` : 'Statements'} & Extract Transactions`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
