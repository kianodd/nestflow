import type { GenFile } from '../types';
import { kebab, pascal } from '../types';

export interface GNode { id: string; type?: string; data: { kind: string; label: string; config: Record<string, string> }; }
export interface GEdge { id: string; source: string; target: string; }

export interface Semantic {
  modules: { node: GNode; controllers: string[]; services: string[] }[];
  controllers: Map<string, { node: GNode; service?: GNode; routes: GNode[]; dtos: GNode[] }>;
  services: Map<string, { node: GNode; model?: GNode; crud: boolean }>;
  dtos: GNode[]; models: GNode[]; hasPrisma: boolean; hasAuth: boolean; prefix: string; port: string; envVars: string;
}

export function parseGraph(nodes: GNode[], edges: GEdge[]): Semantic {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const out = (id: string) => edges.filter(e => e.source === id).map(e => byId.get(e.target)).filter(Boolean) as GNode[];
  const into = (id: string) => edges.filter(e => e.target === id).map(e => byId.get(e.source)).filter(Boolean) as GNode[];
  const kind = (n: GNode) => n.data.kind;
  const sem: Semantic = { modules: [], controllers: new Map(), services: new Map(), dtos: [], models: [], hasPrisma: false, hasAuth: false, prefix: '', port: '3000', envVars: 'PORT=3000\nDATABASE_URL=postgresql://user:pass@localhost:5432/app?schema=public\nJWT_SECRET=change-me' };
  for (const n of nodes) {
    if (kind(n) === 'bootstrap') { sem.port = n.data.config.port || '3000'; sem.prefix = n.data.config.prefix || ''; }
    if (kind(n) === 'env' && n.data.config.vars) sem.envVars = n.data.config.vars;
    if (['prismaModule','prismaService','prismaModel','dbConfig'].includes(kind(n))) sem.hasPrisma = true;
    if (['authModule','jwtAuth','jwtStrategy'].includes(kind(n))) sem.hasAuth = true;
    if (['dto','createDto','updateDto','responseDto'].includes(kind(n))) sem.dtos.push(n);
    if (kind(n) === 'prismaModel') sem.models.push(n);
  }
  for (const n of nodes.filter(x => ['module','mainModule','globalModule'].includes(kind(x)))) {
    const targets = [...out(n.id), ...into(n.id).flatMap(m => out(m.id))];
    sem.modules.push({ node: n, controllers: out(n.id).filter(t => ['controller','restController'].includes(kind(t))).map(t => t.id), services: out(n.id).filter(t => ['service','prismaService','repository'].includes(kind(t))).map(t => t.id) });
    void targets;
  }
  for (const n of nodes.filter(x => ['controller','restController'].includes(kind(x)))) {
    const targets = out(n.id);
    const routes = targets.filter(t => ['route','routeGet','routePost','routePut','routePatch','routeDelete'].includes(kind(t)));
    if (kind(n) === 'restController' && routes.length === 0) {
      const mk = (method: string, path: string, handler: string): GNode => ({ id: n.id + '-' + handler, data: { kind: 'route', label: method, config: { method, path, handler, status: method === 'POST' ? '201' : '200' } } });
      routes.push(mk('POST','', 'create'), mk('GET','', 'findAll'), mk('GET',':id','findOne'), mk('PATCH',':id','update'), mk('DELETE',':id','remove'));
    }
    sem.controllers.set(n.id, { node: n, service: targets.find(t => kind(t) === 'service'), routes, dtos: targets.filter(t => ['dto','createDto','updateDto','responseDto'].includes(kind(t))) });
  }
  for (const n of nodes.filter(x => kind(x) === 'service')) {
    const targets = out(n.id);
    const modelNode = nodes.find(m => kind(m) === 'prismaModel' && (targets.some(t => t.id === m.id) || into(m.id).some(s => s.id === n.id)));
    const crudEdge = nodes.some(m => kind(m) === 'crud' && (into(m.id).some(s => s.id === n.id) || out(m.id).some(t => t.id === n.id)));
    const linkedModel = modelNode || nodes.find(m => kind(m) === 'prismaModel' && into(n.id).some(s => s.id === m.id));
    sem.services.set(n.id, { node: n, model: linkedModel, crud: crudEdge || !!linkedModel || sem.controllers.size > 0 });
  }
  // route-level DTOs
  for (const c of sem.controllers.values()) for (const r of c.routes) { const ds = out(r.id).filter(t => ['dto','createDto','updateDto','responseDto'].includes(kind(t))); for (const d0 of ds) if (!c.dtos.some(x => x.id === d0.id)) c.dtos.push(d0); }
  return sem;
}

const decFor = (type: string) => ({ string: '@IsString()', email: '@IsEmail()', number: '@IsNumber()', boolean: '@IsBoolean()', date: '@IsDateString()' } as Record<string,string>)[type.toLowerCase()] || '@IsString()';
const tsType = (t: string) => ({ string:'string', email:'string', number:'number', boolean:'boolean', date:'string', int:'number' } as Record<string,string>)[t.toLowerCase()] || 'string';

export function generateProject(projectName: string, nodes: GNode[], edges: GEdge[]): GenFile[] {
  const sem = parseGraph(nodes, edges);
  const files: GenFile[] = [];
  const name = kebab(projectName || 'nestflow-app') || 'nestflow-app';
  const deps: Record<string,string> = { '@nestjs/common':'^10.0.0','@nestjs/core':'^10.0.0','@nestjs/platform-express':'^10.0.0','@nestjs/mapped-types':'^2.0.0','class-validator':'^0.14.1','class-transformer':'^0.5.1','reflect-metadata':'^0.2.0','rxjs':'^7.8.1' };
  if (sem.hasPrisma) deps['@prisma/client'] = '^5.22.0';
  if (sem.hasAuth) { deps['@nestjs/jwt'] = '^10.2.0'; deps['@nestjs/passport'] = '^10.0.0'; deps['passport'] = '^0.7.0'; deps['passport-jwt'] = '^4.0.1'; deps['bcrypt'] = '^5.1.1'; }
  files.push({ path: 'package.json', content: JSON.stringify({ name, version: '0.0.1', private: true, scripts: { build: 'nest build', start: 'nest start', 'start:dev': 'nest start --watch', test: 'jest', 'test:e2e': 'jest --config ./test/jest-e2e.json' }, dependencies: deps, devDependencies: { '@nestjs/cli':'^10.0.0','@nestjs/testing':'^10.0.0','@types/express':'^4.17.17','@types/jest':'^29.5.2','@types/node':'^20.3.1','@types/supertest':'^6.0.0', ...(sem.hasPrisma ? { prisma:'^5.22.0' } : {}), ...(sem.hasAuth ? { '@types/bcrypt':'^5.0.2','@types/passport-jwt':'^4.0.1' } : {}), jest:'^29.5.0','supertest':'^7.0.0','ts-jest':'^29.1.0', typescript:'^5.1.3' }, jest: { moduleFileExtensions:['js','json','ts'], rootDir:'src', testRegex:'.*\\.spec\\.ts$', transform:{ '^.+\\.(t|j)s$':'ts-jest' } } }, null, 2) });
  files.push({ path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { module:'commonjs', declaration:true, removeComments:true, emitDecoratorMetadata:true, experimentalDecorators:true, allowSyntheticDefaultImports:true, target:'ES2021', sourceMap:true, outDir:'./dist', baseUrl:'./', incremental:true, skipLibCheck:true, strictNullChecks:false, noImplicitAny:false, strictBindCallApply:false, forceConsistentCasingInFileNames:false, noFallthroughCasesInSwitch:false } }, null, 2) });
  files.push({ path: 'nest-cli.json', content: JSON.stringify({ $schema:'https://json.schemastore.org/nest-cli', collection:'@nestjs/schematics', sourceRoot:'src' }, null, 2) });
  files.push({ path: '.env.example', content: sem.envVars + '\n' });
  files.push({ path: 'src/main.ts', content: `import { NestFactory } from '@nestjs/core';\nimport { ValidationPipe } from '@nestjs/common';\nimport { AppModule } from './app.module';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  app.enableCors();\n${sem.prefix ? `  app.setGlobalPrefix('${sem.prefix}');\n` : ''}  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));\n  await app.listen(process.env.PORT ?? ${sem.port});\n}\nbootstrap();\n` });

  // DTOs
  const dtoPath = (n: GNode) => { const c = [...sem.controllers.values()].find(x => x.dtos.some(d => d.id === n.id)); const folder = c ? kebab(c.node.data.config.name || 'app') : 'common'; return { folder, cls: pascal(n.data.config.name || n.data.label) + 'Dto', file: kebab(n.data.config.name || n.data.label) + '.dto' }; };
  for (const n of sem.dtos) {
    const { folder, cls, file } = dtoPath(n);
    if (n.data.kind === 'updateDto' && n.data.config.base) {
      files.push({ path: `src/${folder}/dto/${file}.ts`, content: `import { PartialType } from '@nestjs/mapped-types';\nimport { ${pascal(n.data.config.base)}Dto } from './${kebab(n.data.config.base)}.dto';\n\nexport class ${cls} extends PartialType(${pascal(n.data.config.base)}Dto) {}\n` });
    } else {
      const lines = (n.data.config.fields || 'name:string').split('\n').map(x => x.trim()).filter(Boolean).map(l => { const [fn, ft] = l.split(':').map(s => s.trim()); const opt = (ft||'').endsWith('?'); const t = (ft||'string').replace('?',''); return `  ${decFor(t)}\n  ${opt ? '@IsOptional()\n  ' : ''}${fn}${opt ? '?' : ''}: ${tsType(t)};`; });
      const needsOpt = lines.some(l => l.includes('@IsOptional'));
      files.push({ path: `src/${folder}/dto/${file}.ts`, content: `import { ${['IsString','IsEmail','IsNumber','IsBoolean','IsOptional','IsDateString'].filter((v,i,a)=>a.indexOf(v)===i).join(', ')} } from 'class-validator';\n\nexport class ${cls} {\n${lines.join('\n\n')}\n}\n`.replace(needsOpt ? '' : '', '') });
    }
  }
  // Prisma
  if (sem.hasPrisma) {
    const models = sem.models.length ? sem.models : [{ id:'m', data:{ kind:'prismaModel', label:'User', config:{ name:'User', fields:'id String @id @default(cuid())\nname String\nemail String @unique\ncreatedAt DateTime @default(now())\nupdatedAt DateTime @updatedAt' } } } as GNode];
    const schema = `generator client {\n  provider = \"prisma-client-js\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n` + models.map(m => { const flds = (m.data.config.fields || '').split('\n').map(x => x.trim()).filter(Boolean).map(l => { const parts = l.replace(':',' ').split(/\s+/); return `  ${parts.join(' ')}`; }).join('\n'); return `model ${pascal(m.data.config.name || 'Item')} {\n${flds}\n}`; }).join('\n\n') + '\n';
    files.push({ path: 'prisma/schema.prisma', content: schema });
    files.push({ path: 'src/prisma/prisma.service.ts', content: `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';\nimport { PrismaClient } from '@prisma/client';\n\n@Injectable()\nexport class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {\n  async onModuleInit() { await this.$connect(); }\n  async onModuleDestroy() { await this.$disconnect(); }\n}\n` });
    files.push({ path: 'src/prisma/prisma.module.ts', content: `import { Global, Module } from '@nestjs/common';\nimport { PrismaService } from './prisma.service';\n\n@Global()\n@Module({ providers: [PrismaService], exports: [PrismaService] })\nexport class PrismaModule {}\n` });
  }
  // Services + Controllers + Modules per controller group
  const moduleFiles: string[] = [];
  const handledModules = new Set<string>();
  for (const [, c] of sem.controllers) {
    const base = kebab(c.node.data.config.name || 'items'); const clsBase = pascal(c.node.data.config.name || 'Items');
    const svc = c.service; const svcCls = svc ? pascal(svc.data.config.name || clsBase) + 'Service' : null;
    const model = svc ? sem.services.get(svc.id)?.model : sem.models[0];
    const modelName = model ? pascal(model.data.config.name || 'User') : null;
    const delegate = modelName ? modelName.charAt(0).toLowerCase() + modelName.slice(1) : 'item';
    const createDto = c.dtos.find(d => d.data.kind === 'createDto' || d.data.kind === 'dto');
    const updateDto = c.dtos.find(d => d.data.kind === 'updateDto');
    const createCls = createDto ? pascal(createDto.data.config.name || 'Create' + clsBase) + 'Dto' : null;
    const updateCls = updateDto ? pascal(updateDto.data.config.name || 'Update' + clsBase) + 'Dto' : createCls;
    if (svc && svcCls) {
      const body = sem.hasPrisma && modelName ? `  constructor(private prisma: PrismaService) {}\n\n  create(dto: any) { return this.prisma.${delegate}.create({ data: dto }); }\n  findAll() { return this.prisma.${delegate}.findMany(); }\n  findOne(id: string) { return this.prisma.${delegate}.findUnique({ where: { id } }); }\n  update(id: string, dto: any) { return this.prisma.${delegate}.update({ where: { id }, data: dto }); }\n  remove(id: string) { return this.prisma.${delegate}.delete({ where: { id } }); }` : `  private items: any[] = [];\n  create(dto: any) { const item = { id: String(this.items.length + 1), ...dto }; this.items.push(item); return item; }\n  findAll() { return this.items; }\n  findOne(id: string) { return this.items.find(i => i.id === id); }\n  update(id: string, dto: any) { const i = this.items.findIndex(x => x.id === id); if (i >= 0) this.items[i] = { ...this.items[i], ...dto }; return this.items[i]; }\n  remove(id: string) { const i = this.items.findIndex(x => x.id === id); return i >= 0 ? this.items.splice(i, 1)[0] : undefined; }`;
      files.push({ path: `src/${base}/${base}.service.ts`, content: `import { Injectable } from '@nestjs/common';\n${sem.hasPrisma && modelName ? `import { PrismaService } from '../prisma/prisma.service';\n` : ''}\n@Injectable()\nexport class ${svcCls} {\n${body}\n}\n` });
    }
    const routeMethods = c.routes.map(r => {
      const m = (r.data.config.method || 'GET').toUpperCase(); const p = r.data.config.path || ''; const h = r.data.config.handler || 'handle';
      const dec = m.charAt(0) + m.slice(1).toLowerCase();
      let params = ''; let call = '';
      if (m === 'POST') { params = createCls ? `@Body() dto: ${createCls}` : '@Body() dto: any'; call = svcCls ? `return this.service.create(dto);` : `return { created: true };`; }
      else if (m === 'PATCH' || m === 'PUT') { params = `@Param('id') id: string, @Body() dto: ${updateCls || 'any'}`; call = svcCls ? `return this.service.update(id, dto);` : `return { id };`; }
      else if (m === 'DELETE') { params = `@Param('id') id: string`; call = svcCls ? `return this.service.remove(id);` : `return { id };`; }
      else if (p.includes(':id')) { params = `@Param('id') id: string`; call = svcCls ? `return this.service.findOne(id);` : `return { id };`; }
      else { params = ''; call = svcCls ? `return this.service.findAll();` : `return [];`; }
      return `  @${dec}(${p ? `'${p}'` : ''})\n  ${h}(${params}) { ${call} }`;
    }).join('\n\n');
    const importsDto = c.dtos.map(d0 => { const { cls, file } = dtoPath(d0); return `import { ${cls} } from './dto/${file}';`; }).join('\n');
    files.push({ path: `src/${base}/${base}.controller.ts`, content: `import { Controller, Get, Post, Patch, Put, Delete, Body, Param } from '@nestjs/common';\n${svcCls ? `import { ${svcCls} } from './${base}.service';\n` : ''}${importsDto}\n\n@Controller('${c.node.data.config.path || base}')\nexport class ${clsBase}Controller {\n${svcCls ? `  constructor(private readonly service: ${svcCls}) {}\n` : ''}\n${routeMethods}\n}\n` });
    files.push({ path: `src/${base}/${base}.module.ts`, content: `import { Module } from '@nestjs/common';\nimport { ${clsBase}Controller } from './${base}.controller';\n${svcCls ? `import { ${svcCls} } from './${base}.service';\n` : ''}\n@Module({ controllers: [${clsBase}Controller], providers: [${svcCls || ''}] })\nexport class ${clsBase}Module {}\n` });
    moduleFiles.push(base); handledModules.add(base);
  }
  if (sem.hasAuth) {
    files.push({ path: 'src/auth/auth.module.ts', content: `import { Module } from '@nestjs/common';\nimport { JwtModule } from '@nestjs/jwt';\n\n@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'change-me', signOptions: { expiresIn: '1d' } })], providers: [], exports: [JwtModule] })\nexport class AuthModule {}\n` });
    moduleFiles.push('auth');
  }
  const appImports = [...moduleFiles.map(b => `import { ${pascal(b)}Module } from './${b}/${b}.module';`), ...(sem.hasPrisma ? [`import { PrismaModule } from './prisma/prisma.module';`] : [])].join('\n');
  const appMods = [...moduleFiles.map(b => `${pascal(b)}Module`), ...(sem.hasPrisma ? ['PrismaModule'] : [])].join(', ');
  files.push({ path: 'src/app.module.ts', content: `import { Module } from '@nestjs/common';\n${appImports}\n\n@Module({ imports: [${appMods}] })\nexport class AppModule {}\n` });
  files.push({ path: 'src/app.controller.spec.ts', content: `describe('App', () => { it('sanity', () => { expect(true).toBe(true); }); });\n` });
  files.push({ path: 'test/app.e2e-spec.ts', content: `import { Test } from '@nestjs/testing';\nimport { INestApplication } from '@nestjs/common';\nimport * as request from 'supertest';\nimport { AppModule } from '../src/app.module';\n\ndescribe('App (e2e)', () => {\n  let app: INestApplication;\n  beforeAll(async () => { const m = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = m.createNestApplication(); await app.init(); });\n  afterAll(async () => { await app.close(); });\n  it('app boots', () => { expect(app).toBeDefined(); });\n  void request;\n});\n` });
  files.push({ path: 'test/jest-e2e.json', content: JSON.stringify({ moduleFileExtensions:['js','json','ts'], rootDir:'.', testEnvironment:'node', testRegex:'.e2e-spec.ts$', transform:{ '^.+\\.(t|j)s$':'ts-jest' } }, null, 2) });
  files.push({ path: 'README.md', content: `# ${name}\n\nGenerated with **NestFlow** — a visual NestJS builder.\n\n## Run locally\n\n\`\`\`bash\ncp .env.example .env\nnpm install\n${sem.hasPrisma ? 'npx prisma generate\nnpx prisma migrate dev --name init\n' : ''}npm run start:dev\n\`\`\`\n\nAPI base: http://localhost:${sem.port}${sem.prefix ? '/' + sem.prefix : ''}\n\n## Test\n\n\`\`\`bash\nnpm test\nnpm run test:e2e\n\`\`\`\n` });
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
export function validateGraph(nodes: GNode[], edges: GEdge[]): string[] {
  const errs: string[] = [];
  if (!nodes.some(n => n.data.kind === 'controller' || n.data.kind === 'restController')) errs.push('No Controller node — add one to expose HTTP endpoints.');
  if (!nodes.some(n => ['module','mainModule'].includes(n.data.kind))) errs.push('No Module node — controllers/services must belong to a module.');
  void edges; return errs;
}
