import { useStore } from '../store/useStore';
import { DEF_MAP } from '../nodes/definitions';
export function Inspector() {
  const nodes = useStore(s => s.nodes); const selectedId = useStore(s => s.selectedId);
  const updateConfig = useStore(s => s.updateConfig); const removeSelected = useStore(s => s.removeSelected); const duplicateSelected = useStore(s => s.duplicateSelected);
  const node = nodes.find(n => n.id === selectedId);
  if (!node) return <div className="p-4 text-sm text-neutral-400"><p className="text-neutral-200 font-medium mb-1">Inspector</p>Select a node to edit its configuration and read what it does in NestJS.<p className="mt-3 text-[12px] leading-relaxed">Tip (touch): tap ＋ to add a node, drag nodes to move them, drag from the right dot of one node to the left dot of another to connect them — or select a node, tap “Connect mode” in the toolbar flow: tap a source node, then tap the target.</p></div>;
  const def = DEF_MAP[node.data.kind];
  return (<div className="p-4 overflow-y-auto h-full">
    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full" style={{ background: def?.color }} /><h3 className="font-semibold text-[15px]">{def?.label}</h3></div>
    <p className="text-[12px] text-neutral-400 mb-4">{def?.category} · <code className="text-neutral-300">{node.data.kind}</code></p>
    <div className="space-y-3">
      {(def?.fields ?? []).map(f => (<label key={f.key} className="block"><span className="block text-[12px] text-neutral-400 mb-1">{f.label}</span>
        {f.type === 'select' ? (<select value={node.data.config[f.key] ?? ''} onChange={e => updateConfig(node.id, f.key, e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-bg border border-line text-sm min-h-[44px]">{(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}</select>)
        : f.type === 'textarea' ? (<textarea rows={5} value={node.data.config[f.key] ?? ''} onChange={e => updateConfig(node.id, f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 rounded-lg bg-bg border border-line text-sm font-mono" />)
        : (<input value={node.data.config[f.key] ?? ''} onChange={e => updateConfig(node.id, f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2.5 rounded-lg bg-bg border border-line text-sm min-h-[44px]" />)}
      </label>))}
      {!(def?.fields?.length) && <p className="text-sm text-neutral-400">This node has no editable fields — its behaviour comes from its connections.</p>}
    </div>
    <div className="flex gap-2 mt-4"><button onClick={duplicateSelected} className="flex-1 py-2.5 rounded-lg bg-node border border-line text-sm min-h-[44px]">Duplicate</button><button onClick={removeSelected} className="flex-1 py-2.5 rounded-lg bg-err/15 border border-err/40 text-err text-sm min-h-[44px]">Delete node</button></div>
    {def && (<div className="mt-5 rounded-xl bg-bg border border-line p-3 space-y-2 text-[13px] leading-relaxed">
      <p><b className="text-accent">What:</b> <span className="text-neutral-300">{def.doc.what}</span></p>
      <p><b className="text-accent">Why:</b> <span className="text-neutral-300">{def.doc.why}</span></p>
      <p><b className="text-accent">Example:</b></p><pre className="bg-panel rounded-lg p-2 overflow-x-auto text-[12px] text-emerald-300">{def.doc.example}</pre>
      <p><b className="text-err">Common mistake:</b> <span className="text-neutral-300">{def.doc.mistakes}</span></p>
    </div>)}
  </div>);
}
