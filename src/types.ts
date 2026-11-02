export interface FieldDef { key: string; label: string; type: 'text'|'select'|'number'|'boolean'|'textarea'; options?: string[]; placeholder?: string; }
export interface NodeDef {
  kind: string; label: string; category: string; color: string;
  description: string; inputs: string[]; outputs: string[];
  fields: FieldDef[]; defaults: Record<string, string>;
  doc: { what: string; why: string; example: string; mistakes: string };
}
export interface NFNodeData extends Record<string, unknown> { kind: string; label: string; config: Record<string, string>; }
export interface GenFile { path: string; content: string; }
export interface ApiRequest { id: string; name: string; method: string; url: string; headers: string; body: string; folder: string; }
export interface Env { id: string; name: string; vars: Record<string, string>; }
export interface ProjectData { id: string; name: string; nodes: unknown[]; edges: unknown[]; collections: ApiRequest[]; environments: Env[]; activeEnvId: string; updatedAt: number; }
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
export const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
export const pascal = (s: string) => s.replace(/(^|[\s\-_])(\w)/g, (_m, _a, c: string) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');
