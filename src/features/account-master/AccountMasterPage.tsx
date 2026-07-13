'use client';

import { useState, useMemo } from 'react';
import { accountMasterData, riaAdvisors, mandatesForAdvisor, EntityType } from '@/lib/mock-data';

const typeOrder: EntityType[] = ['GROUP', 'COMPANY', 'FAMILY', 'INDIVIDUAL'];

const typeTagCls: Record<EntityType, string> = {
  GROUP: 'bg-ink text-paper',
  COMPANY: 'bg-verified-bg text-verified',
  FAMILY: 'bg-amber-bg text-amber',
  INDIVIDUAL: 'bg-paper text-ink-soft border border-line',
};

export default function AccountMasterPage() {
  const [filterType, setFilterType] = useState<EntityType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['GROUP', 'COMPANY', 'FAMILY', 'INDIVIDUAL']));
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500); };

  const toggleGroup = (type: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const filteredEntities = useMemo(() => {
    const q = search.toLowerCase();
    return accountMasterData.filter(e => {
      if (filterType !== 'ALL' && e.type !== filterType) return false;
      if (q && !e.name.toLowerCase().includes(q) && !e.pan.toLowerCase().includes(q)) return false;
      if (dateFrom && e.updated < dateFrom) return false;
      if (dateTo && e.updated > dateTo) return false;
      return true;
    });
  }, [filterType, search, dateFrom, dateTo]);

  const exportCSV = () => {
    if (filteredEntities.length === 0) { showToast('No entities match the current filters — nothing to export.'); return; }
    const header = ['Entity', 'PAN', 'Type', 'Status', 'Updated'];
    const lines = [header.join(','), ...filteredEntities.map(e => [e.name, e.pan, e.type, e.active ? 'Active' : 'Inactive', e.updated].map(v => `"${v}"`).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account_master_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${filteredEntities.length} entities exported to CSV.`);
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-lg shadow-lg">{toastMsg}</div>
      )}

      <div>
        <h1 className="text-[22px] font-semibold text-ink mb-1">Account Master</h1>
        <p className="text-sm text-ink-soft">Entity hierarchy · Group / Company / Family / Individual · RIA Roster (US-25)</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {(['ALL', ...typeOrder] as (EntityType | 'ALL')[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer ${filterType === t ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-line hover:bg-surface'}`}
            >{t}</button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={exportCSV} className="text-[13px] border border-line bg-paper text-ink-soft rounded-lg px-3 py-1.5 hover:bg-surface cursor-pointer">Export CSV</button>
            <button onClick={() => showToast('PDF export ships with the reporting engine — CSV export is available now.')} className="text-[13px] border border-line bg-paper text-ink-soft rounded-lg px-3 py-1.5 hover:bg-surface cursor-pointer">Export PDF</button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entity name or PAN…"
            className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink flex-1 min-w-[200px]"
          />
          <div className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span>Updated from:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-line rounded-lg px-3 py-1.5 text-[13px] bg-paper text-ink" />
            <span>to:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-line rounded-lg px-3 py-1.5 text-[13px] bg-paper text-ink" />
          </div>
        </div>
        <div className="text-[12px] text-ink-faint">{filteredEntities.length} of {accountMasterData.length} entities shown</div>
      </div>

      {/* Entity sections */}
      {typeOrder.filter(t => filterType === 'ALL' || filterType === t).map(type => {
        const rows = filteredEntities.filter(e => e.type === type);
        if (rows.length === 0 && filterType !== 'ALL') return null;
        const isOpen = openGroups.has(type);
        return (
          <div key={type} className="bg-surface border border-line rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-line text-left cursor-pointer hover:bg-paper/60"
              onClick={() => toggleGroup(type)}
            >
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${typeTagCls[type]}`}>{type}</span>
              <span className="font-semibold text-ink text-[15px]">{type === 'GROUP' ? 'Apex Group' : type === 'FAMILY' ? 'Family Office' : type + ' Entities'}</span>
              <span className="ml-1 text-[11px] bg-paper border border-line text-ink-soft rounded-full px-3 py-0.5 font-mono">{rows.length} {rows.length === 1 ? 'entity' : 'entities'}</span>
              <span className="ml-auto text-ink-faint text-[12px]">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                      <th className="px-5 py-3 text-left font-medium">Entity</th>
                      <th className="px-5 py-3 text-left font-medium">PAN</th>
                      <th className="px-5 py-3 text-left font-medium">Type</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                      <th className="px-5 py-3 text-left font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-6 text-center text-ink-faint text-sm">No entities match the current filters.</td></tr>
                    ) : rows.map((e, i) => (
                      <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                        <td className="px-5 py-3 font-medium text-ink">{e.name}</td>
                        <td className="px-5 py-3 font-mono text-ink-soft text-[12px]">{e.pan}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${typeTagCls[e.type]}`}>{e.type}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1.5 text-[13px]">
                            <span className={`w-2 h-2 rounded-full inline-block ${e.active ? 'bg-verified' : 'bg-ink-faint'}`} />
                            {e.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-ink-soft text-[12px]">{e.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* RIA Roster */}
      {(filterType === 'ALL') && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-line text-left cursor-pointer hover:bg-paper/60"
            onClick={() => toggleGroup('RIA')}
          >
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold bg-paper border border-line text-ink-soft">RIA</span>
            <span className="font-semibold text-ink text-[15px]">Registered Investment Advisors</span>
            <span className="ml-1 text-[11px] bg-paper border border-line text-ink-soft rounded-full px-3 py-0.5 font-mono">{riaAdvisors.length} advisors</span>
            <span className="ml-auto text-ink-faint text-[12px]">{openGroups.has('RIA') ? '▲' : '▼'}</span>
          </button>
          {openGroups.has('RIA') && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-medium">Code</th>
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-5 py-3 text-left font-medium">SEBI Reg.</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Mandates</th>
                  </tr>
                </thead>
                <tbody>
                  {riaAdvisors.map((r, i) => {
                    const mandates = mandatesForAdvisor(r.code);
                    return (
                      <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                        <td className="px-5 py-3">
                          <span className="font-mono text-[12px] bg-paper border border-line text-ink px-2 py-0.5 rounded">{r.code}</span>
                        </td>
                        <td className="px-5 py-3 font-medium text-ink">{r.name}</td>
                        <td className="px-5 py-3 font-mono text-ink-soft text-[12px]">{r.sebi}</td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1.5 text-[13px]">
                            <span className={`w-2 h-2 rounded-full inline-block ${r.active ? 'bg-verified' : 'bg-ink-faint'}`} />
                            {r.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {mandates.length === 0 ? (
                            <span className="text-ink-faint text-[12px]">No mandates on record</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {mandates.map((m, j) => (
                                <span key={j} className={`text-[11px] px-2 py-0.5 rounded font-mono ${m.end ? 'bg-paper border border-line text-ink-faint' : 'bg-verified-bg text-verified border border-verified/30'}`}>
                                  {m.entity} · {m.start} – {m.end ?? 'ongoing'}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
