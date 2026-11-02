import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NFNodeData } from '../types';
import { DEF_MAP } from '../nodes/definitions';

export const NestNode = memo(function NestNode({ data, selected }: NodeProps) {
  const d = data as unknown as NFNodeData; const def = DEF_MAP[d.kind];
  const color = def?.color ?? '#8B5CF6';
  const summary = d.config.name || d.config.path || d.config.handler || '';
  return (
    <div className={`rounded-xl border bg-node shadow-lg min-w-[168px] max-w-[220px] ${selected ? 'ring-2 ring-accent border-accent' : 'border-line'}`}>
      <Handle type="target" position={Position.Left} className="!w-5 !h-5 !bg-[#555] !border-2 !border-white/40" />
      <div className="px-3 py-2 rounded-t-xl text-white text-[13px] font-semibold flex justify-between gap-2" style={{ background: color }}>
        <span className="truncate">{def?.label ?? d.label}</span><span className="opacity-70 text-[10px]">{def?.category?.split(' ')[0]}</span>
      </div>
      <div className="px-3 py-2">
        <div className="text-[13px] text-neutral-100 font-medium truncate">{summary || d.label}</div>
        <div className="text-[11px] text-neutral-400 line-clamp-2 leading-snug">{def?.description}</div>
        {(d.config.method || d.config.path !== undefined) && d.kind.startsWith('route') ? <div className="mt-1 text-[11px]"><span className="px-1.5 py-0.5 rounded bg-info/20 text-info font-bold">{d.config.method || (d.kind === 'routeGet' ? 'GET' : d.kind === 'routePost' ? 'POST' : d.kind === 'routePatch' ? 'PATCH' : d.kind === 'routeDelete' ? 'DELETE' : 'GET')}</span> <span className="text-neutral-300">/{d.config.path || ''}</span></div> : null}
      </div>
      <Handle type="source" position={Position.Right} className="!w-5 !h-5 !bg-[#555] !border-2 !border-white/40" />
    </div>
  );
});
