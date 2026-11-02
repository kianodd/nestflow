import { useMemo, useState } from 'react';
import { NODE_DEFS, CATEGORIES } from '../nodes/definitions';
import { useStore } from '../store/useStore';
export function Library({ onAdded }: { onAdded?: () => void }) {
  const [q, setQ] = useState(''); const addNode = useStore(s => s.addNode);
  const list = useMemo(() => NODE_DEFS.filter(d => (d.label + ' ' + d.kind + ' ' + d.category).toLowerCase().includes(q.toLowerCase())), [q]);
  return (<div className="flex flex-col h-full">
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search nodes… (module, DTO, guard…)" className="m-3 mb-2 px-3 py-2.5 rounded-lg bg-bg border border-line text-sm outline-none focus:border-accent min-h-[44px]" />
    <div className="overflow-y-auto px-3 pb-3 space-y-4">
      {CATEGORIES.map(cat => { const items = list.filter(d => d.category === cat); if (!items.length) return null; return (<div key={cat}><div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">{cat} · {items.length}</div><div className="space-y-1.5">{items.map(dfd => (<button key={dfd.kind} onClick={() => { addNode(dfd.kind); onAdded?.(); }} className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-node border border-line hover:border-accent active:scale-[.99] min-h-[48px]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dfd.color }} /><span className="min-w-0"><span className="block text-[13px] text-neutral-100 truncate">{dfd.label}</span><span className="block text-[11px] text-neutral-400 truncate">{dfd.description}</span></span><span className="ml-auto text-accent text-lg">＋</span></button>))}</div></div>); })}
      {!list.length && <p className="text-sm text-neutral-400 p-2">No nodes match “{q}”.</p>}
    </div></div>);
}
