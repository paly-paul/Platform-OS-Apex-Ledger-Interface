'use client';

import { useState, useRef, useCallback } from 'react';
import { accountMasterData } from '@/lib/mock-data';

const docTypes = [
  { value: 'CONSOLIDATED_ACCOUNT_STATEMENT', label: 'Consolidated Account Statement (CAS)' },
  { value: 'ANNUAL_ACCOUNT_STATEMENT', label: 'Annual Account Statement (AAS)' },
  { value: 'MUTUAL_FUND_STATEMENT', label: 'Mutual Fund Statement' },
  { value: 'RIA_STATEMENT', label: 'RIA / Advisor Statement' },
  { value: 'CORPORATE_HOLDING_REPORT', label: 'Corporate Holding Report' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
];

type ValidationStatus = 'PENDING' | 'VALIDATING' | 'PARSING' | 'PARSED' | 'FAILED';

interface UploadRecord {
  id: string;
  fileName: string;
  entity: string;
  docType: string;
  riaName: string;
  status: ValidationStatus;
  uploadedAt: string;
}

const statusStyle: Record<ValidationStatus, string> = {
  PENDING: 'bg-paper border border-line text-ink-soft',
  VALIDATING: 'bg-amber-bg text-amber border border-amber/30',
  PARSING: 'bg-amber-bg text-amber border border-amber/30',
  PARSED: 'bg-verified-bg text-verified border border-verified/30',
  FAILED: 'bg-alert-bg text-alert border border-alert/30',
};

const entities = accountMasterData.filter(e => e.type !== 'GROUP').map(e => e.name);

export default function UploadsPage() {
  const [selectedEntity, setSelectedEntity] = useState(entities[0] ?? '');
  const [docType, setDocType] = useState('CONSOLIDATED_ACCOUNT_STATEMENT');
  const [riaName, setRiaName] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500); };

  const isRia = docType === 'RIA_STATEMENT';

  const handleFile = (file: File) => setFileName(file.name);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, []);

  const submitUpload = () => {
    if (!fileName) { showToast('Choose a file before uploading.'); return; }
    if (isRia && !riaName.trim()) { showToast('Enter the RIA / Advisor name before uploading an RIA statement.'); return; }

    const record: UploadRecord = {
      id: Date.now().toString(),
      fileName,
      entity: selectedEntity,
      docType,
      riaName: isRia ? riaName.trim() : '',
      status: 'PENDING',
      uploadedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST',
    };

    setUploads(prev => [record, ...prev]);
    showToast(`${docType} queued for ${selectedEntity}${riaName ? ' via ' + riaName : ''} — validation_status: PENDING.`);

    // Pipeline simulation
    const simulate = (id: string, statuses: ValidationStatus[], delay: number) => {
      const [next, ...rest] = statuses;
      setTimeout(() => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: next } : u));
        if (rest.length > 0) simulate(id, rest, delay + 1200);
      }, delay);
    };
    simulate(record.id, ['VALIDATING', 'PARSING', 'PARSED'], 1500);

    setFileName('');
    setRiaName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-lg shadow-lg">{toastMsg}</div>
      )}

      <div>
        <h1 className="text-[22px] font-semibold text-ink mb-1">Uploads</h1>
        <p className="text-sm text-ink-soft">Entity-scoped document ingestion · US-01–05, US-23</p>
      </div>

      {/* Upload form */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="font-semibold text-ink text-[15px]">Upload Document</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Entity</label>
            <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink">
              {entities.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink">
              {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        {isRia && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">RIA / Advisor Name <span className="text-alert">*</span></label>
            <input
              type="text"
              value={riaName}
              onChange={e => setRiaName(e.target.value)}
              placeholder="e.g. Alpha Wealth Advisors"
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink"
            />
          </div>
        )}

        {/* Dropzone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-verified bg-verified-bg' : fileName ? 'border-verified bg-verified-bg/50' : 'border-line bg-paper hover:border-ink-soft'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="text-[28px] mb-2">{fileName ? '📄' : '📁'}</div>
          <div className="text-[14px] font-medium text-ink">{fileName || 'Click to choose a file, or drag one here'}</div>
          {!fileName && <div className="text-[12px] text-ink-faint mt-1">Supported: PDF, CSV, XLSX, XLS</div>}
        </div>

        <button
          onClick={submitUpload}
          className="text-[13px] bg-verified text-white rounded-lg px-5 py-2 font-medium hover:opacity-90 cursor-pointer"
        >
          Upload Document
        </button>
      </div>

      {/* Upload list */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
          <span className="font-semibold text-ink text-[15px]">Upload Dashboard</span>
          <span className="ml-1 text-[11px] bg-paper border border-line text-ink-soft rounded-full px-3 py-0.5 font-mono">{uploads.length} documents</span>
        </div>
        {uploads.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-faint text-[13px]">No documents uploaded yet — submit one above to begin ingestion.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-medium">File</th>
                  <th className="px-5 py-3 text-left font-medium">Entity</th>
                  <th className="px-5 py-3 text-left font-medium">Source</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Uploaded</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(u => (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-5 py-3 font-mono text-ink text-[12px]">{u.fileName}</td>
                    <td className="px-5 py-3 text-ink-soft">{u.entity}</td>
                    <td className="px-5 py-3">
                      {u.riaName
                        ? <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-paper border border-line text-ink-soft">Via RIA: {u.riaName}</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-paper border border-line text-ink-soft">Direct</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${statusStyle[u.status]}`}>{u.status}</span>
                    </td>
                    <td className="px-5 py-3 text-ink-soft text-[12px]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-ink-faint inline-block" />
                        {u.uploadedAt}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.status === 'FAILED' && (
                        <button
                          onClick={() => {
                            setSelectedEntity(u.entity);
                            showToast(`Re-uploading for ${u.entity} — the corrected file will supersede the rejected one, which stays on record.`);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-[12px] border border-line bg-paper text-ink-soft rounded px-2 py-0.5 hover:bg-surface cursor-pointer"
                        >Re-upload</button>
                      )}
                      {u.status === 'PARSED' && (
                        <button
                          onClick={() => showToast('Source document viewer ships with document_upload file storage.')}
                          className="text-[12px] border border-line bg-paper text-ink-soft rounded px-2 py-0.5 hover:bg-surface cursor-pointer"
                        >View Source</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
