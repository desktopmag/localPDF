import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { Cpu, MemoryStick, Layers, Database, Boxes, WifiOff, CircleCheck, CircleAlert } from 'lucide-react';

function StatusRow({ icon: Icon, label, value, ok }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-display text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{value}</p>
      </div>
      {ok ? <CircleCheck className="h-5 w-5 text-primary" /> : <CircleAlert className="h-5 w-5 text-destructive" />}
    </div>
  );
}

export default function SystemStatus() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function probe() {
      let storage = null;
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          storage = { quota: est.quota, usage: est.usage };
        }
      } catch { /* ignore */ }
      setStats({
        worker: typeof Worker !== 'undefined',
        fileApi: typeof File !== 'undefined' && typeof FileReader !== 'undefined' && typeof Blob !== 'undefined',
        wasm: typeof WebAssembly !== 'undefined',
        offscreen: typeof OffscreenCanvas !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        localStorage: (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch { return false; } })(),
        cores: navigator.hardwareConcurrency || 'unknown',
        memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown',
        storage,
        online: navigator.onLine,
      });
    }
    probe();
  }, []);

  function fmtBytes(n) {
    if (!n && n !== 0) return 'unknown';
    if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
    if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1024).toFixed(0)} KB`;
  }

  return (
    <PageShell title="System Status" description="A live diagnostic of the browser capabilities LocalPDF relies on. Everything here is read on your device — nothing is reported anywhere.">
      {!stats ? (
        <p className="font-mono text-xs text-muted-foreground">Probing your browser…</p>
      ) : (
        <div className="space-y-3">
          <StatusRow icon={Cpu} label="Web Workers" value={stats.worker ? 'available — processing off the main thread' : 'unavailable — tools may block the UI'} ok={stats.worker} />
          <StatusRow icon={Layers} label="File API" value={stats.fileApi ? 'available — files open locally' : 'unavailable'} ok={stats.fileApi} />
          <StatusRow icon={Boxes} label="WebAssembly" value={stats.wasm ? 'available — core PDF libraries ready' : 'unavailable'} ok={stats.wasm} />
          <StatusRow icon={Layers} label="OffscreenCanvas" value={stats.offscreen ? 'available — faster rendering' : 'fallback to main-thread rendering'} ok={stats.offscreen} />
          <StatusRow icon={Database} label="IndexedDB" value={stats.indexedDB ? 'available' : 'unavailable'} ok={stats.indexedDB} />
          <StatusRow icon={Database} label="localStorage" value={stats.localStorage ? 'available — feedback saved locally' : 'unavailable'} ok={stats.localStorage} />
          <StatusRow icon={Cpu} label="CPU cores" value={`${stats.cores} logical core(s)`} ok={stats.cores !== 'unknown'} />
          <StatusRow icon={MemoryStick} label="Device memory" value={stats.memory} ok={stats.memory !== 'unknown'} />
          <StatusRow
            icon={Database}
            label="Storage estimate"
            value={stats.storage ? `${fmtBytes(stats.storage.usage)} used of ${fmtBytes(stats.storage.quota)}` : 'unavailable in this browser'}
            ok={!!stats.storage}
          />
          <StatusRow icon={WifiOff} label="Network" value={stats.online ? 'online — not required for any tool' : 'offline — fully functional'} ok />
        </div>
      )}
      <p className="mt-6 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        These checks run entirely in your browser. The results are shown to you and only you —
        they are never transmitted. If a capability shows unavailable, the corresponding tools may
        be slower or unavailable on this device.
      </p>
    </PageShell>
  );
}