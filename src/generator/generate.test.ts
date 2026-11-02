import { describe, it, expect } from 'vitest';
import { generateProject, parseGraph, validateGraph, type GNode, type GEdge } from './generate';
import { validateConnection, NODE_DEFS } from '../nodes/definitions';
import { applyVars } from '../utils/apiExecutor';

const N = (id: string, kind: string, cfg: Record<string,string> = {}): GNode => ({ id, data: { kind, label: kind, config: cfg } });
const E = (s: string, t: string): GEdge => ({ id: s + t, source: s, target: t });

describe('node library', () => { it('has 60+ typed nodes with docs', () => { expect(NODE_DEFS.length).toBeGreaterThanOrEqual(60); for (const d of NODE_DEFS) { expect(d.doc.example.length).toBeGreaterThan(3); expect(d.fields).toBeDefined(); } }); });
describe('connection validation', () => {
  it('rejects DTO -> Bootstrap', () => { expect(validateConnection('dto', 'bootstrap')).toBeTruthy(); });
  it('rejects Controller -> Prisma Model', () => { expect(validateConnection('controller', 'prismaModel')).toBeTruthy(); });
  it('allows Module -> Controller and Controller -> Route', () => { expect(validateConnection('module', 'controller')).toBeNull(); expect(validateConnection('controller', 'route')).toBeNull(); });
});
describe('code generation: Users API fixture', () => {
  const nodes = [N('b','bootstrap',{port:'3000'}), N('app','mainModule'), N('m','module',{name:'Users'}), N('c','controller',{name:'Users',path:'users'}), N('s','service',{name:'Users'}), N('d','createDto',{name:'CreateUser',fields:'name:string\nemail:email'}), N('pm','prismaModule'), N('ps','prismaService'), N('model','prismaModel',{name:'User',fields:'id:String @id @default(cuid())\nname:String\nemail:String @unique'}), N('r1','route',{method:'POST',path:'',handler:'create'}), N('r2','route',{method:'GET',path:'',handler:'findAll'}), N('r3','route',{method:'GET',path:':id',handler:'findOne'}), N('r4','route',{method:'PATCH',path:':id',handler:'update'}), N('r5','route',{method:'DELETE',path:':id',handler:'remove'})];
  const edges = [E('b','app'),E('app','m'),E('m','c'),E('m','s'),E('c','s'),E('c','r1'),E('c','r2'),E('c','r3'),E('c','r4'),E('c','r5'),E('r1','d'),E('s','ps'),E('s','model'),E('m','pm')];
  it('parses the semantic model', () => { const sem = parseGraph(nodes, edges); expect(sem.hasPrisma).toBe(true); expect(sem.controllers.get('c')?.routes.length).toBe(5); });
  it('generates the expected files & endpoints', () => { const files = generateProject('users-api', nodes, edges); const paths = files.map(f => f.path); for (const p of ['package.json','src/main.ts','src/app.module.ts','src/users/users.module.ts','src/users/users.controller.ts','src/users/users.service.ts','src/users/dto/create-user.dto.ts','prisma/schema.prisma','test/app.e2e-spec.ts']) expect(paths).toContain(p); const ctrl = files.find(f => f.path.endsWith('users.controller.ts'))!.content; for (const frag of ['@Post()','@Get()','@Get(\':id\')','@Patch(\':id\')','@Delete(\':id\')',"@Controller('users')"]) expect(ctrl).toContain(frag); const dto = files.find(f => f.path.endsWith('create-user.dto.ts'))!.content; expect(dto).toContain('@IsEmail()'); const schema = files.find(f => f.path === 'prisma/schema.prisma')!.content; expect(schema).toContain('model User'); });
  it('is deterministic', () => { expect(JSON.stringify(generateProject('users-api', nodes, edges))).toBe(JSON.stringify(generateProject('users-api', nodes, edges))); });
  it('validates missing module/controller', () => { expect(validateGraph([], []).length).toBeGreaterThan(0); });
});
describe('api executor vars', () => { it('substitutes {{vars}}', () => { expect(applyVars('{{baseUrl}}/users', { baseUrl: 'http://localhost:3000' })).toBe('http://localhost:3000/users'); }); });
