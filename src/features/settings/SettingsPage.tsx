'use client';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold m-0 mb-1">Settings</h1>
        <div className="text-xs text-ink-soft font-mono">SYSTEM CONFIGURATION</div>
      </div>
      <div className="bg-surface border border-line rounded-[10px] p-8 text-center text-ink-soft text-sm">
        <div className="text-4xl mb-3">⚙️</div>
        <div className="font-semibold mb-1">Settings — Stage 4 migration pending</div>
        <div className="text-xs font-mono text-ink-faint">
          Content will be ported from apex_app_shell.html in the stage-4 pass.
        </div>
      </div>
    </div>
  );
}
