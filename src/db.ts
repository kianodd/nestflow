import Dexie, { type Table } from 'dexie';
import type { ProjectData } from './types';
class NFDB extends Dexie { projects!: Table<ProjectData, string>; constructor() { super('nestflow'); this.version(1).stores({ projects: 'id, updatedAt' }); } }
export const db = new NFDB();
export async function saveProject(p: ProjectData) { try { await db.projects.put(p); } catch { localStorage.setItem('nf:' + p.id, JSON.stringify(p)); } localStorage.setItem('nf:last', p.id); }
export async function loadProjects(): Promise<ProjectData[]> { try { const all = await db.projects.toArray(); if (all.length) return all; } catch { /* fall through */ } const out: ProjectData[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('nf:') && k !== 'nf:last') { try { out.push(JSON.parse(localStorage.getItem(k)!)); } catch { /* ignore */ } } } return out; }
export async function deleteProject(id: string) { try { await db.projects.delete(id); } catch { /* ignore */ } localStorage.removeItem('nf:' + id); }
