import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { NFNodeData, ApiRequest, Env } from '../types';
import { DEF_MAP } from '../nodes/definitions';
import { uid } from '../types';
import { saveProject } from '../db';

export type NFNode = Node<NFNodeData>;
interface Snapshot { nodes: NFNode[]; edges: Edge[]; }
interface State {
  projectId: string; projectName: string;
  nodes: NFNode[]; edges: Edge[];
  selectedId: string | null;
  past: Snapshot[]; future: Snapshot[];
  collections: ApiRequest[]; environments: Env[]; activeEnvId: string;
  toast: string;
  setNodes: (n: NFNode[]) => void; setEdges: (e: Edge[]) => void;
  addNode: (kind: string, pos?: { x: number; y: number }) => void;
  updateConfig: (id: string, key: string, value: string) => void;
  removeSelected: () => void; duplicateSelected: () => void;
  select: (id: string | null) => void;
  pushHistory: () => void; undo: () => void; redo: () => void;
  loadProject: (p: { id: string; name: string; nodes: NFNode[]; edges: Edge[]; collections: ApiRequest[]; environments: Env[]; activeEnvId: string }) => void;
  setProjectName: (n: string) => void; setToast: (t: string) => void;
  setCollections: (c: ApiRequest[]) => void; setEnvironments: (e: Env[], active?: string) => void;
  persist: () => void; autoLayout: () => void;
}
export function starterGraph(): { nodes: NFNode[]; edges: Edge[] } {
  const mk = (id: string, kind: string, x: number, y: number, cfg: Record<string,string> = {}): NFNode => { const def = DEF_MAP[kind]; return { id, type: 'nest', position: { x, y }, data: { kind, label: def.label, config: { ...def.defaults, ...cfg } } }; };
  const nodes: NFNode[] = [
    mk('n-boot','bootstrap',40,40), mk('n-app','mainModule',40,220,{name:'App'}),
    mk('n-mod','module',320,220,{name:'Users'}), mk('n-prismaM','prismaModule',320,420),
    mk('n-prismaS','prismaService',600,420), mk('n-model','prismaModel',880,420,{name:'User',fields:'id:String @id @default(cuid())\nname:String\nemail:String @unique\ncreatedAt:DateTime @default(now())'}),
    mk('n-ctrl','controller',600,60,{name:'Users',path:'users'}), mk('n-svc','service',880,60,{name:'Users'}),
    mk('n-create','createDto',880,220,{name:'CreateUser',fields:'name:string\nemail:email'}), mk('n-update','updateDto',1140,220,{name:'UpdateUser',base:'CreateUser'}),
    mk('n-r1','routePost',1140,20,{path:'',handler:'create'}), mk('n-r2','routeGet',1140,120,{path:'',handler:'findAll'}),
    mk('n-r3','routeGet',1400,20,{path:':id',handler:'findOne'}), mk('n-r4','routePatch',1400,120,{path:':id',handler:'update'}), mk('n-r5','routeDelete',1400,220,{path:':id',handler:'remove'}),
  ];
  const E = (s: string, t: string): Edge => ({ id: uid(), source: s, target: t, animated: false, style: { stroke: '#8B5CF6', strokeWidth: 2 } });
  const edges: Edge[] = [E('n-boot','n-app'),E('n-app','n-mod'),E('n-mod','n-ctrl'),E('n-mod','n-svc'),E('n-mod','n-prismaM'),E('n-prismaM','n-prismaS'),E('n-svc','n-prismaS'),E('n-svc','n-model'),E('n-ctrl','n-svc'),E('n-ctrl','n-r1'),E('n-ctrl','n-r2'),E('n-ctrl','n-r3'),E('n-ctrl','n-r4'),E('n-ctrl','n-r5'),E('n-r1','n-create'),E('n-r4','n-update')];
  return { nodes, edges };
}
const starter = starterGraph();
export const useStore = create<State>((set, get) => ({
  projectId: uid(), projectName: 'users-api',
  nodes: starter.nodes, edges: starter.edges, selectedId: null, past: [], future: [],
  collections: [{ id: uid(), name: 'List users', method: 'GET', url: '{{baseUrl}}/users', headers: '', body: '', folder: 'Users' }, { id: uid(), name: 'Create user', method: 'POST', url: '{{baseUrl}}/users', headers: 'Content-Type: application/json', body: '{\n  "name": "Ada",\n  "email": "ada@example.com"\n}', folder: 'Users' }],
  environments: [{ id: 'env-local', name: 'Local', vars: { baseUrl: 'http://localhost:3000', token: '' } }],
  activeEnvId: 'env-local', toast: '',
  setNodes: (nodes) => set({ nodes }), setEdges: (edges) => set({ edges }),
  pushHistory: () => set(s => ({ past: [...s.past.slice(-40), { nodes: s.nodes, edges: s.edges }], future: [] })),
  addNode: (kind, pos) => { const def = DEF_MAP[kind]; if (!def) return; get().pushHistory(); const n: NFNode = { id: uid(), type: 'nest', position: pos ?? { x: 120 + Math.random() * 300, y: 120 + Math.random() * 200 }, data: { kind, label: def.label, config: { ...def.defaults } } }; set(s => ({ nodes: [...s.nodes, n], selectedId: n.id })); get().persist(); },
  updateConfig: (id, key, value) => { set(s => ({ nodes: s.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n) })); get().persist(); },
  removeSelected: () => { const id = get().selectedId; if (!id) return; get().pushHistory(); set(s => ({ nodes: s.nodes.filter(n => n.id !== id), edges: s.edges.filter(e => e.source !== id && e.target !== id), selectedId: null })); get().persist(); },
  duplicateSelected: () => { const n = get().nodes.find(x => x.id === get().selectedId); if (!n) return; get().pushHistory(); const c: NFNode = { ...n, id: uid(), position: { x: n.position.x + 40, y: n.position.y + 40 }, data: JSON.parse(JSON.stringify(n.data)) }; set(s => ({ nodes: [...s.nodes, c], selectedId: c.id })); get().persist(); },
  select: (id) => set({ selectedId: id }),
  undo: () => { const s = get(); const prev = s.past[s.past.length - 1]; if (!prev) return; set({ past: s.past.slice(0, -1), future: [{ nodes: s.nodes, edges: s.edges }, ...s.future], nodes: prev.nodes, edges: prev.edges }); },
  redo: () => { const s = get(); const nxt = s.future[0]; if (!nxt) return; set({ future: s.future.slice(1), past: [...s.past, { nodes: s.nodes, edges: s.edges }], nodes: nxt.nodes, edges: nxt.edges }); },
  loadProject: (p) => set({ projectId: p.id, projectName: p.name, nodes: p.nodes as NFNode[], edges: p.edges as Edge[], collections: p.collections, environments: p.environments, activeEnvId: p.activeEnvId, past: [], future: [], selectedId: null }),
  setProjectName: (projectName) => { set({ projectName }); get().persist(); },
  setToast: (toast) => set({ toast }),
  setCollections: (collections) => { set({ collections }); get().persist(); },
  setEnvironments: (environments, active) => { set({ environments, ...(active ? { activeEnvId: active } : {}) }); get().persist(); },
  persist: () => { const s = get(); void saveProject({ id: s.projectId, name: s.projectName, nodes: s.nodes as unknown[], edges: s.edges as unknown[], collections: s.collections, environments: s.environments, activeEnvId: s.activeEnvId, updatedAt: Date.now() }); },
  autoLayout: () => { get().pushHistory(); set(s => ({ nodes: s.nodes.map((n, i) => ({ ...n, position: { x: 60 + (i % 4) * 300, y: 60 + Math.floor(i / 4) * 190 } })) })); get().persist(); },
}));
