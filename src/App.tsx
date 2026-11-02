import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Connection, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore, starterGraph, type NFNode } from './store/useStore';
import { NestNode } from './components/NestNode';
import { Library } from './components/Library';
import { Inspector } from './components/Inspector';
import { CodePreview } from './components/CodePreview';
import { ApiClient } from './components/ApiClient';
import { validateConnection, DEF_MAP } from './nodes/definitions';
import { loadProjects, deleteProject } from './db';
import { uid } from './types';
import type { ProjectData } from './types';

const nodeTypes = { nest: NestNode };
type Tab = 'code' | 'api' | 'logs';

function Canvas() {
  const nodes = useStore(s => s.nodes); const edges = useStore(s => s.edges);
  const setNodes = useStore(s => s.setNodes); const setEdges = useStore(s => s.setEdges);
  const select = useStore(s => s.select); const selectedId = useStore(s => s.selectedId);
  const pushHistory = useStore(s => s.pushHistory); const persist = useStore(s => s.persist); const setToast = useStore(s => s.setToast);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const rf = useReactFlow();
  const onNodesChange = useCallback((ch: NodeChange[]) => { setNodes(applyNodeChanges(ch, useStore.getState().nodes) as NFNode[]); }, [setNodes]);
  const onEdgesChange = useCallback((ch: EdgeChange[]) => { setEdges(applyEdgeChanges(ch, useStore.getState().edges)); persist(); }, [setEdges, persist]);
  const onConnect = useCallback((c: Connection) => {
    const sn = useStore.getState().nodes.find(n => n.id === c.source); const tn = useStore.getState().nodes.find(n => n.id === c.target);
    if (!sn || !tn) return;
    const err = validateConnection(sn.data.kind, tn.data.kind);
    if (err) { setToast('⚠ ' + err + ' (connection not added — fix the architecture or connect the right nodes)'); return; }
    pushHistory(); setEdges(addEdge({ ...c, style: { stroke: '#8B5CF6', strokeWidth: 2 } }, useStore.getState().edges)); persist(); setToast(`Connected ${DEF_MAP[sn.data.kind]?.label} → ${DEF_MAP[tn.data.kind]?.label}`);
  }, [setEdges, persist, pushHistory, setToast]);
  const onNodeClick = useCallback((_e: unknown, n: NFNode) => {
    if (connectFrom && connectFrom !== n.id) {
      const sn = useStore.getState().nodes.find(x => x.id === connectFrom)!;
      const err = validateConnection(sn.data.kind, n.data.kind);
      if (err) { setToast('⚠ ' + err); setConnectFrom(null); return; }
      pushHistory(); setEdges(addEdge({ source: connectFrom, target: n.id, sourceHandle: null, targetHandle: null, style: { stroke: '#8B5CF6', strokeWidth: 2 } }, useStore.getState().edges)); persist(); setToast('Connected via tap-to-connect ✓'); setConnectFrom(null); select(n.id); return;
    }
    select(n.id);
  }, [connectFrom, pushHistory, setEdges, persist, select, setToast]);
  return (<div className="relative w-full h-full">
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={() => select(null)} nodeTypes={nodeTypes} fitView snapToGrid snapGrid={[16, 16]} minZoom={0.2} maxZoom={2.5} proOptions={{ hideAttribution: false }} colorMode="dark">
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#333" />
      <Controls className="!bg-panel [&>button]:!bg-panel [&>button]:!border-line" showInteractive={false} />
      <MiniMap className="!bg-panel hidden md:block" nodeColor={(n) => DEF_MAP[(n.data as NFNode['data']).kind]?.color ?? '#666'} maskColor="rgba(0,0,0,.55)" />
    </ReactFlow>
    <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
      <button onClick={() => { if (selectedId) { setConnectFrom(selectedId); setToast('Tap-to-connect: now tap the target node.'); } else setToast('Select a node first, then use Connect.'); }} className={`px-3 py-2 rounded-lg text-[12px] font-medium border min-h-[40px] ${connectFrom ? 'bg-accent text-white border-accent' : 'bg-panel/95 border-line'}`}>🔗 {connectFrom ? 'Tap target…' : 'Connect'}</button>
      {connectFrom && <button onClick={() => setConnectFrom(null)} className="px-3 py-2 rounded-lg text-[12px] bg-panel/95 border border-line min-h-[40px]">Cancel</button>}
      <button onClick={() => rf.fitView({ padding: 0.15 })} className="px-3 py-2 rounded-lg text-[12px] bg-panel/95 border border-line min-h-[40px]">⛶ Fit</button>
    </div>
  </div>);
}

function Shell() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'lib' | 'inspector' | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const projectName = useStore(s => s.projectName); const setProjectName = useStore(s => s.setProjectName);
  const toast = useStore(s => s.toast); const setToast = useStore(s => s.setToast);
  const undo = useStore(s => s.undo); const redo = useStore(s => s.redo); const autoLayout = useStore(s => s.autoLayout);
  const loadProject = useStore(s => s.loadProject); const persist = useStore(s => s.persist);
  const nodes = useStore(s => s.nodes); const edges = useStore(s => s.edges);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { if (!toast) return; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(''), 4200); }, [toast, setToast]);
  useEffect(() => { void (async () => { const all = await loadProjects(); const last = localStorage.getItem('nf:last'); const p = all.find(x => x.id === last) ?? all.sort((a, b) => b.updatedAt - a.updatedAt)[0]; if (p && p.nodes?.length) loadProject({ id: p.id, name: p.name, nodes: p.nodes as never, edges: p.edges as never, collections: p.collections ?? [], environments: p.environments ?? [], activeEnvId: p.activeEnvId }); })(); }, [loadProject]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); persist(); setToast('Project saved ✓ (IndexedDB, autosave is also on)'); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [undo, redo, persist, setToast]);
  async function openProjects() { setProjects(await loadProjects()); setShowProjects(true); }
  function newProject() { const st = starterGraph(); loadProject({ id: uid(), name: 'my-api', nodes: st.nodes, edges: st.edges, collections: useStore.getState().collections, environments: useStore.getState().environments, activeEnvId: 'env-local' }); persist(); setShowProjects(false); setToast('New project created from the Users API starter graph.'); }
  function exportProjectJson() { const s = useStore.getState(); const blob = new Blob([JSON.stringify({ id: s.projectId, name: s.projectName, nodes: s.nodes, edges: s.edges, collections: s.collections, environments: s.environments, activeEnvId: s.activeEnvId }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = s.projectName + '.nestflow.json'; a.click(); }
  function importProjectJson(f: File) { void f.text().then(t => { try { const p = JSON.parse(t) as ProjectData & { nodes: never; edges: never }; loadProject({ id: p.id || uid(), name: p.name || 'imported', nodes: p.nodes, edges: p.edges, collections: p.collections ?? [], environments: p.environments ?? [], activeEnvId: p.activeEnvId ?? 'env-local' }); persist(); setShowProjects(false); setToast('Project imported ✓'); } catch { setToast('⚠ Invalid project file.'); } }); }
  const logs = useMemo(() => [`NestFlow ready — ${nodes.length} nodes, ${edges.length} connections.`, 'Autosave: IndexedDB (Dexie) + localStorage fallback. Ctrl/Cmd+S saves, Ctrl/Cmd+Z undo, Shift+Z redo.', 'Code generation is deterministic: the same graph always produces the same files.', 'Generated code is real NestJS — export the ZIP from the Code tab and run npm install && npm run start:dev.'], [nodes.length, edges.length]);
  return (<div className="flex flex-col h-full bg-bg text-neutral-100">
    <header className="flex items-center gap-2 px-3 py-2 bg-panel border-b border-line shrink-0">
      <span className="text-lg">🪺</span><span className="font-bold tracking-tight">Nest<span className="text-accent">Flow</span></span>
      <input value={projectName} onChange={e => setProjectName(e.target.value)} className="w-[130px] sm:w-[180px] px-2 py-1.5 rounded-lg bg-bg border border-line text-[13px]" title="Project name" />
      <span className="hidden lg:inline text-[11px] text-neutral-500">{nodes.length} nodes · {edges.length} links</span>
      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={undo} title="Undo (Ctrl+Z)" className="px-2.5 py-2 rounded-lg bg-node border border-line text-sm min-h-[40px]">↩</button>
        <button onClick={redo} title="Redo" className="px-2.5 py-2 rounded-lg bg-node border border-line text-sm min-h-[40px]">↪</button>
        <button onClick={autoLayout} className="hidden sm:block px-2.5 py-2 rounded-lg bg-node border border-line text-[12px] min-h-[40px]">Auto-layout</button>
        <button onClick={() => { persist(); setToast('Project saved ✓'); }} className="px-2.5 py-2 rounded-lg bg-node border border-line text-[12px] min-h-[40px]">Save</button>
        <button onClick={() => void openProjects()} className="px-2.5 py-2 rounded-lg bg-accent text-white text-[12px] font-semibold min-h-[40px]">Projects</button>
      </div>
    </header>
    {toast && <div className="px-3 py-2 text-[13px] bg-accent/15 border-b border-accent/30 text-neutral-100">{toast}</div>}
    <div className="flex flex-1 min-h-0">
      <aside className="hidden md:flex w-[270px] shrink-0 bg-panel border-r border-line flex-col"><div className="px-3 pt-3 text-[12px] font-semibold text-neutral-300">Node Library <span className="text-neutral-500 font-normal">— tap to add</span></div><Library /></aside>
      <main className="flex-1 min-w-0 relative bg-canvas"><Canvas /></main>
      <aside className="hidden lg:block w-[300px] shrink-0 bg-panel border-l border-line overflow-hidden"><Inspector /></aside>
    </div>
    {tab && (<section className="shrink-0 h-[46vh] md:h-[38vh] bg-panel border-t border-line flex flex-col">
      <div className="flex items-center gap-1 px-2 pt-2">{(['code','api','logs'] as Tab[]).map(t => (<button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-t-lg text-[13px] min-h-[40px] ${tab === t ? 'bg-bg text-white border border-b-0 border-line' : 'text-neutral-400'}`}>{t === 'code' ? '💻 Code + ZIP export' : t === 'api' ? '🧪 API Client' : '📜 Logs & help'}</button>))}<button onClick={() => setTab(null)} className="ml-auto px-3 py-2 text-neutral-400 min-h-[40px]">✕ Close</button></div>
      <div className="flex-1 min-h-0 bg-bg border-t border-line">{tab === 'code' && <CodePreview />}{tab === 'api' && <ApiClient />}{tab === 'logs' && (<div className="p-4 overflow-y-auto h-full text-[13px] leading-relaxed text-neutral-300 space-y-1.5">{logs.map((l, i) => <p key={i}>• {l}</p>)}<p className="pt-2 text-neutral-400">How to run your generated backend: Code tab → Export ZIP → unzip → <code>cp .env.example .env</code> → <code>npm install</code> → <code>npx prisma generate</code> (if Prisma) → <code>npm run start:dev</code> → API tab → Send to <code>{'{{baseUrl}}'}</code>/users.</p><p className="text-neutral-400">PWA limits, honestly: a browser app cannot run a Node/NestJS server or write to your filesystem, and HTTPS pages may be blocked from calling http://localhost. NestFlow therefore exports a real project + really sends HTTP requests; it never fakes a running backend.</p></div>)}</div>
    </section>)}
    <nav className="md:hidden shrink-0 bg-panel border-t border-line grid grid-cols-5 text-[11px]">
      <button onClick={() => setMobilePanel(mobilePanel === 'lib' ? null : 'lib')} className="py-2.5 min-h-[52px]">＋<br />Nodes</button>
      <button onClick={() => setMobilePanel(mobilePanel === 'inspector' ? null : 'inspector')} className="py-2.5 min-h-[52px]">⚙️<br />Inspector</button>
      <button onClick={() => setTab(tab === 'code' ? null : 'code')} className="py-2.5 min-h-[52px]">💻<br />Code</button>
      <button onClick={() => setTab(tab === 'api' ? null : 'api')} className="py-2.5 min-h-[52px]">🧪<br />API</button>
      <button onClick={() => void openProjects()} className="py-2.5 min-h-[52px]">📁<br />Projects</button>
    </nav>
    {mobilePanel && (<div className="md:hidden fixed inset-x-0 bottom-[52px] top-[18%] z-40 bg-panel border-t border-line rounded-t-2xl shadow-2xl flex flex-col"><div className="flex items-center px-4 py-3 border-b border-line"><b className="text-sm">{mobilePanel === 'lib' ? 'Node Library' : 'Inspector'}</b><button onClick={() => setMobilePanel(null)} className="ml-auto px-3 py-2 min-h-[40px]">✕</button></div><div className="flex-1 min-h-0 overflow-hidden">{mobilePanel === 'lib' ? <Library onAdded={() => setMobilePanel(null)} /> : <Inspector />}</div></div>)}
    <div className="hidden md:flex shrink-0 bg-panel border-t border-line px-2 py-1.5 gap-1.5">{(['code','api','logs'] as Tab[]).map(t => (<button key={t} onClick={() => setTab(tab === t ? null : t)} className="px-3 py-1.5 rounded-lg bg-node border border-line text-[12px]">{t === 'code' ? '💻 Code / Export' : t === 'api' ? '🧪 API Client' : '📜 Logs'}</button>))}<span className="ml-auto text-[11px] text-neutral-500 self-center hidden lg:inline">Drag right-dot → left-dot to connect · pinch to zoom · two-finger / drag background to pan</span></div>
    {showProjects && (<div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"><div className="bg-panel border border-line rounded-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto p-4">
      <div className="flex items-center mb-3"><h3 className="font-bold">Projects</h3><button onClick={() => setShowProjects(false)} className="ml-auto px-3 py-2 min-h-[40px]">✕</button></div>
      <div className="flex flex-wrap gap-2 mb-3"><button onClick={newProject} className="px-3 py-2.5 rounded-lg bg-accent text-white text-[13px] font-semibold min-h-[44px]">＋ New project</button><button onClick={exportProjectJson} className="px-3 py-2.5 rounded-lg bg-node border border-line text-[13px] min-h-[44px]">Export project JSON</button><label className="px-3 py-2.5 rounded-lg bg-node border border-line text-[13px] min-h-[44px] cursor-pointer">Import JSON<input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importProjectJson(f); }} /></label></div>
      {!projects.length && <p className="text-sm text-neutral-400">No saved projects yet — your current project autosaves as you work.</p>}
      {projects.map(p => (<div key={p.id} className="flex items-center gap-2 rounded-xl bg-bg border border-line px-3 py-2.5 mb-2"><div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{p.name}</div><div className="text-[11px] text-neutral-500">{new Date(p.updatedAt).toLocaleString()} · {(p.nodes as unknown[])?.length ?? 0} nodes</div></div><button onClick={() => { loadProject({ id: p.id, name: p.name, nodes: p.nodes as never, edges: p.edges as never, collections: p.collections ?? [], environments: p.environments ?? [], activeEnvId: p.activeEnvId }); setShowProjects(false); }} className="px-3 py-2 rounded-lg bg-accent text-white text-[12px] min-h-[40px]">Open</button><button onClick={() => { const st = starterGraph(); void st; loadProject({ id: uid(), name: p.name + ' copy', nodes: p.nodes as never, edges: p.edges as never, collections: p.collections ?? [], environments: p.environments ?? [], activeEnvId: p.activeEnvId }); persist(); setShowProjects(false); }} className="px-3 py-2 rounded-lg bg-node border border-line text-[12px] min-h-[40px]">Duplicate</button><button onClick={() => { if (confirm('Delete this project?')) void deleteProject(p.id).then(openProjects); }} className="px-3 py-2 rounded-lg bg-err/15 border border-err/40 text-err text-[12px] min-h-[40px]">Delete</button></div>))}
      <p className="text-[12px] text-neutral-500 leading-relaxed">Workspaces = projects. Each project stores its graph, API collections and environments in IndexedDB on this device. Rename: edit the name in the top toolbar.</p>
    </div></div>)}
  </div>);
}
export function App() { return (<ReactFlowProvider><Shell /></ReactFlowProvider>); }
