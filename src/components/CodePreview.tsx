import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { useStore } from '../store/useStore';
import { generateProject, validateGraph, type GNode, type GEdge } from '../generator/generate';
export function useGenerated() { const nodes = useStore(s => s.nodes); const edges = useStore(s => s.edges); const name = useStore(s => s.projectName); return useMemo(() => generateProject(name, nodes as unknown as GNode[], edges as unknown as GEdge[]), [nodes, edges, name]); }
export function CodePreview() {
  const files = useGenerated(); const name = useStore(s => s.projectName); const nodes = useStore(s => s.nodes); const edges = useStore(s => s.edges);
  const [sel, setSel] = useState('src/app.module.ts'); const [msg, setMsg] = useState('');
  const file = files.find(f => f.path === sel) ?? files[0];
  const warnings = useMemo(() => validateGraph(nodes as unknown as GNode[], edges as unknown as GEdge[]), [nodes, edges]);
  async function exportZip() { const zip = new JSZip(); for (const f of files) zip.file(f.path, f.content); const blob = await zip.generateAsync({ type: 'blob' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name || 'nestflow-app'}.zip`; a.click(); URL.revokeObjectURL(a.href); setMsg(`Exported ${files.length} files as ZIP. Unzip, then: npm install → npm run start:dev.`); }
  function downloadOne() { if (!file) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([file.content])); a.download = file.path.split('/').pop()!; a.click(); }
  return (<div className="flex h-full min-h-0">
    <div className="w-[210px] shrink-0 border-r border-line overflow-y-auto p-2 hidden sm:block">{files.map(f => (<button key={f.path} onClick={() => setSel(f.path)} className={`block w-full text-left px-2 py-1.5 rounded text-[12px] truncate ${f.path === file?.path ? 'bg-accent/20 text-white' : 'text-neutral-400 hover:bg-node'}`}>{f.path}</button>))}</div>
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-line">
        <select value={file?.path} onChange={e => setSel(e.target.value)} className="sm:hidden bg-bg border border-line rounded px-2 py-2 text-[12px] max-w-[170px]">{files.map(f => <option key={f.path} value={f.path}>{f.path}</option>)}</select>
        <span className="text-[12px] text-neutral-400 truncate">{file?.path} · {files.length} files</span>
        <span className="ml-auto flex gap-2"><button onClick={() => { if (file) void navigator.clipboard.writeText(file.content); setMsg('Copied file to clipboard.'); }} className="px-3 py-2 rounded-lg bg-node border border-line text-[12px] min-h-[40px]">Copy</button><button onClick={downloadOne} className="px-3 py-2 rounded-lg bg-node border border-line text-[12px] min-h-[40px]">Download file</button><button onClick={() => void exportZip()} className="px-3 py-2 rounded-lg bg-accent text-white text-[12px] font-semibold min-h-[40px]">⬇ Export ZIP</button></span>
      </div>
      {warnings.length > 0 && <div className="px-3 py-1.5 text-[12px] text-amber-300 bg-amber-500/10">⚠ {warnings.join(' ')}</div>}
      {msg && <div className="px-3 py-1.5 text-[12px] text-emerald-300 bg-emerald-500/10">{msg}</div>}
      <pre className="flex-1 overflow-auto p-3 text-[12.5px] leading-relaxed text-neutral-200 font-mono whitespace-pre">{file?.content}</pre>
      <p className="px-3 py-1.5 text-[11px] text-neutral-500 border-t border-line">Run the exported project: unzip → <code>cp .env.example .env</code> → <code>npm install</code> → (Prisma: <code>npx prisma generate</code>) → <code>npm run start:dev</code>. Then test it in the API tab. NestFlow itself is a static PWA, so it cannot run Node servers in the browser — no fake “Run” button.</p>
    </div></div>);
}
