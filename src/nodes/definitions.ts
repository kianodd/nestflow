import type { NodeDef } from '../types';

const F = {
  name: { key: 'name', label: 'Class / Name', type: 'text' as const, placeholder: 'Users' },
  path: { key: 'path', label: 'Route path', type: 'text' as const, placeholder: 'users' },
  method: { key: 'method', label: 'HTTP method', type: 'select' as const, options: ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'] },
};
function d(kind: string, label: string, category: string, color: string, description: string, inputs: string[], outputs: string[], fields: NodeDef['fields'], defaults: Record<string,string>, ex: string, mistakes: string): NodeDef {
  return { kind, label, category, color, description, inputs, outputs, fields, defaults,
    doc: { what: description, why: `Used to structure a real NestJS application: ${label} maps 1:1 to generated TypeScript code.`, example: ex, mistakes } };
}
export const CATEGORIES = ['Application','HTTP & Routing','Dependency Injection','DTO & Validation','Database (Prisma)','Auth','Architecture','Integrations','Testing'] as const;

export const NODE_DEFS: NodeDef[] = [
  d('app','Nest Application','Application','#8B5CF6','Root application created by NestFactory.create().',['bootstrap'],['module'],[],{},'NestFactory.create(AppModule)','Forgetting await app.listen().'),
  d('bootstrap','Bootstrap','Application','#8B5CF6','main.ts bootstrap: global prefix, CORS, ValidationPipe.',['app'],['module'],[{key:'port',label:'Port',type:'text',placeholder:'3000'},{key:'prefix',label:'Global prefix',type:'text',placeholder:'api'}],{port:'3000',prefix:''},'app.setGlobalPrefix("api")','Hardcoding port instead of process.env.PORT.'),
  d('module','Feature Module','Application','#7C3AED','@Module() grouping controllers, providers and exports.',['module'],['module','controller','service'],[F.name],{name:'Users'},'@Module({ controllers:[UsersController], providers:[UsersService] })','Not exporting a provider other modules need.'),
  d('mainModule','Main Module','Application','#7C3AED','Root AppModule importing feature modules.',[],['module'],[F.name],{name:'App'},'@Module({ imports:[UsersModule] })','Putting controllers directly in AppModule.'),
  d('globalModule','Global Module','Application','#7C3AED','@Global() module whose providers are app-wide.',['module'],['module'],[F.name],{name:'Config'},'@Global() @Module({})','Making everything global hides dependencies.'),
  d('dynamicModule','Dynamic Module','Application','#7C3AED','Module with forRoot()/forRootAsync() configuration.',['module'],['module'],[F.name],{name:'Config'},'ConfigModule.forRoot({ isGlobal:true })','Forgetting to return DynamicModule.'),
  d('middleware','Middleware','Application','#6D28D9','Function/class applied to routes in configure().',['module'],['module'],[F.name],{name:'Logger'},'consumer.apply(LoggerMiddleware).forRoutes("*")','Using middleware where a Guard/Interceptor fits better.'),
  d('config','App Configuration','Application','#6D28D9','ConfigModule + typed configuration.',['module'],['module'],[],{},'ConfigModule.forRoot()','Reading process.env scattered everywhere.'),
  d('env','Environment Variables','Application','#6D28D9','.env variables documented into .env.example.',['app'],[],[{key:'vars',label:'Variables (one per line KEY=default)',type:'textarea'}],{vars:'PORT=3000\nDATABASE_URL=postgresql://user:pass@localhost:5432/app'},'DATABASE_URL=...','Committing real secrets to git.'),
  d('cors','CORS','Application','#6D28D9','Enables CORS in main.ts.',['bootstrap'],['bootstrap'],[],{},'app.enableCors()','Enabling CORS with credentials + wildcard origin.'),
  d('validationPipe','Validation Pipe (Global)','Application','#6D28D9','Global ValidationPipe with whitelist + transform.',['bootstrap'],['bootstrap'],[],{},'app.useGlobalPipes(new ValidationPipe({ whitelist:true, transform:true }))','Missing transform:true so DTO types are not coerced.'),
  d('exceptionFilter','Global Exception Filter','Application','#6D28D9','@Catch() filter handling exceptions globally.',['module'],['module'],[F.name],{name:'AllExceptions'},'app.useGlobalFilters(new AllExceptionsFilter())','Swallowing stack traces in production logs.'),
  d('globalInterceptor','Global Interceptor','Application','#6D28D9','Interceptor applied to every route.',['module'],['module'],[F.name],{name:'Logging'},'app.useGlobalInterceptors(new LoggingInterceptor())','Heavy sync work inside interceptors.'),

  d('controller','Controller','HTTP & Routing','#2563EB','@Controller() handling incoming requests.',['module'],['service','route','dto','guard'],[F.name,F.path],{name:'Users',path:'users'},'@Controller("users") class UsersController {}','Putting business logic in controllers.'),
  d('restController','REST Controller','HTTP & Routing','#2563EB','Controller pre-wired with full CRUD routes.',['module'],['service','route'],[F.name,F.path],{name:'Users',path:'users'},'@Controller("users") // CRUD','Duplicating CRUD by hand per resource.'),
  d('route','Route','HTTP & Routing','#3B82F6','Single HTTP handler method on a controller.',['controller'],['dto','guard'],[F.method,F.path,{key:'handler',label:'Handler name',type:'text',placeholder:'findAll'},{key:'status',label:'Status code',type:'text',placeholder:'200'}],{method:'GET',path:'',handler:'handle',status:'200'},'@Get(":id") findOne(@Param("id") id:string){}','Using @Req() everywhere instead of typed decorators.'),
  d('routeGet','GET Route','HTTP & Routing','#3B82F6','@Get() handler.',['controller'],['dto'],[F.path,{key:'handler',label:'Handler name',type:'text'}],{path:'',handler:'findAll'},'@Get() findAll(){}','Returning DB entities directly.'),
  d('routePost','POST Route','HTTP & Routing','#3B82F6','@Post() handler, usually with a body DTO.',['controller'],['dto'],[F.path,{key:'handler',label:'Handler name',type:'text'}],{path:'',handler:'create'},'@Post() create(@Body() dto: CreateDto){}','Missing @HttpCode on 201 expectations.'),
  d('routePut','PUT Route','HTTP & Routing','#3B82F6','@Put() full-update handler.',['controller'],['dto'],[F.path,{key:'handler',label:'Handler name',type:'text'}],{path:':id',handler:'replace'},'@Put(":id")','Using PUT for partial updates (use PATCH).'),
  d('routePatch','PATCH Route','HTTP & Routing','#3B82F6','@Patch() partial-update handler.',['controller'],['dto'],[F.path,{key:'handler',label:'Handler name',type:'text'}],{path:':id',handler:'update'},'@Patch(":id")','Requiring all fields in an update DTO.'),
  d('routeDelete','DELETE Route','HTTP & Routing','#3B82F6','@Delete() handler.',['controller'],['dto'],[F.path,{key:'handler',label:'Handler name',type:'text'}],{path:':id',handler:'remove'},'@Delete(":id")','Hard-deleting without checking existence.'),
  d('routeParams','Route Parameters','HTTP & Routing','#60A5FA','@Param() typed route parameters.',['route'],['route'],[{key:'params',label:'Params (name:type, comma sep.)',type:'text',placeholder:'id:string'}],{params:'id:string'},'@Param("id") id: string','Treating numeric ids as string in Prisma queries.'),
  d('queryParams','Query Parameters','HTTP & Routing','#60A5FA','@Query() parameters, usually a query DTO.',['route'],['dto'],[{key:'params',label:'Params (name:type)',type:'text'}],{params:'page:number'},'@Query("page") page: string','No pagination limits.'),
  d('requestBody','Request Body','HTTP & Routing','#60A5FA','@Body() bound to a DTO.',['route'],['dto'],[],{},'@Body() dto: CreateUserDto','Using an interface instead of a class DTO (validation will not run).'),
  d('headersNode','Headers','HTTP & Routing','#60A5FA','@Headers() access.',['route'],['route'],[{key:'header',label:'Header name',type:'text'}],{header:'authorization'},'@Headers("authorization")','Trusting client headers for auth.'),
  d('fileUpload','File Upload','HTTP & Routing','#60A5FA','FileInterceptor + @UploadedFile().',['route'],['route'],[{key:'field',label:'Form field',type:'text'}],{field:'file'},'@UseInterceptors(FileInterceptor("file"))','No file size/type validation.'),
  d('statusCode','Status Code','HTTP & Routing','#60A5FA','@HttpCode() override.',['route'],['route'],[{key:'code',label:'Code',type:'text'}],{code:'201'},'@HttpCode(201)','Returning 200 for created resources.'),

  d('service','Injectable Service','Dependency Injection','#059669','@Injectable() provider holding business logic.',['module'],['prisma','service','external'],[F.name],{name:'Users'},'@Injectable() class UsersService {}','Injecting a controller into a service (circular).'),
  d('provider','Provider','Dependency Injection','#059669','Generic provider registered in a module.',['module'],['module'],[F.name],{name:'Custom'},'providers: [CustomProvider]','Forgetting to add it to providers array.'),
  d('factoryProvider','Factory Provider','Dependency Injection','#059669','useFactory provider for computed values.',['module'],['module'],[F.name,{key:'token',label:'Token',type:'text'}],{name:'Factory',token:'CONFIG'},'{ provide:"CONFIG", useFactory: () => ({}) }','Async factory without inject.'),
  d('valueProvider','Value Provider','Dependency Injection','#059669','useValue provider.',['module'],['module'],[{key:'token',label:'Token',type:'text'}],{token:'API_KEY'},'{ provide:"API_KEY", useValue: process.env.API_KEY }','Hardcoding secrets as values.'),
  d('classProvider','Class Provider','Dependency Injection','#059669','useClass provider (swap implementations).',['module'],['module'],[F.name],{name:'Impl'},'{ provide: TOKEN, useClass: Impl }','Token mismatch.'),
  d('token','Injection Token','Dependency Injection','#10B981','String/symbol token for non-class providers.',['provider'],['service'],[{key:'token',label:'Token',type:'text'}],{token:'MY_TOKEN'},'export const MY_TOKEN = "MY_TOKEN"','Stringly-typed tokens with typos.'),
  d('repository','Repository Provider','Dependency Injection','#10B981','Repository abstraction over the data layer.',['module'],['prisma'],[F.name],{name:'Users'},'class UsersRepository {}','Leaking Prisma types into controllers.'),
  d('di','Constructor Injection','Dependency Injection','#10B981','Documents a constructor injection edge (Service → dependency).',['service'],['service'],[],{},'constructor(private users: UsersService){}','Property injection (not supported idiomatically).'),

  d('dto','DTO','DTO & Validation','#D97706','Data Transfer Object class with validation decorators.',['controller','route'],['validation'],[F.name,{key:'fields',label:'Fields (name:type per line)',type:'textarea',placeholder:'name:string'}],{name:'CreateUser',fields:'name:string\nemail:string'},'export class CreateUserDto {}','Using interfaces — class-validator needs classes.'),
  d('createDto','Create DTO','DTO & Validation','#D97706','DTO for POST bodies; all required fields.',['route'],['validation'],[F.name,{key:'fields',label:'Fields (name:type per line)',type:'textarea'}],{name:'CreateUser',fields:'name:string\nemail:string'},'export class CreateUserDto {}','Allowing id/createdAt from the client.'),
  d('updateDto','Update DTO','DTO & Validation','#D97706','DTO for PATCH bodies (PartialType).',['route'],['validation'],[F.name,{key:'base',label:'Extends Create DTO (name)',type:'text'}],{name:'UpdateUser',base:'CreateUser'},'export class UpdateUserDto extends PartialType(CreateUserDto){}','Copy-pasting all fields as optional manually.'),
  d('responseDto','Response DTO','DTO & Validation','#D97706','Shape returned to clients.',['route'],[],[F.name,{key:'fields',label:'Fields (name:type per line)',type:'textarea'}],{name:'UserResponse',fields:'id:string\nname:string'},'export class UserResponseDto {}','Returning password hashes in responses.'),
  d('vIsString','IsString','DTO & Validation','#F59E0B','@IsString() validator.',['dto'],['dto'],[],{},'@IsString() name: string','Missing decorator entirely.'),
  d('vIsEmail','IsEmail','DTO & Validation','#F59E0B','@IsEmail() validator.',['dto'],['dto'],[],{},'@IsEmail() email: string','Validating email with a hand regex.'),
  d('vIsNumber','IsNumber','DTO & Validation','#F59E0B','@IsNumber() validator.',['dto'],['dto'],[],{},'@IsNumber() age: number','JSON numbers arriving as strings without @Type.'),
  d('vIsBoolean','IsBoolean','DTO & Validation','#F59E0B','@IsBoolean() validator.',['dto'],['dto'],[],{},'@IsBoolean() active: boolean','"true" string is not boolean.'),
  d('vIsOptional','IsOptional','DTO & Validation','#F59E0B','@IsOptional() — skip validation when absent.',['dto'],['dto'],[],{},'@IsOptional()','Marking required creation fields optional.'),
  d('vIsNotEmpty','IsNotEmpty','DTO & Validation','#F59E0B','@IsNotEmpty() validator.',['dto'],['dto'],[],{},'@IsNotEmpty()','Empty string passes IsString but not IsNotEmpty.'),
  d('vLength','Min/Max Length','DTO & Validation','#F59E0B','@MinLength()/@MaxLength() validators.',['dto'],['dto'],[{key:'min',label:'Min length',type:'text'},{key:'max',label:'Max length',type:'text'}],{min:'2',max:'50'},'@MinLength(2) @MaxLength(50)','Length rules only in the DB.'),
  d('vMinMax','Min / Max','DTO & Validation','#F59E0B','@Min()/@Max() numeric bounds.',['dto'],['dto'],[{key:'min',label:'Min',type:'text'},{key:'max',label:'Max',type:'text'}],{min:'0',max:'100'},'@Min(0) @Max(100)','No bounds on pagination size.'),

  d('prismaModule','Prisma Module','Database (Prisma)','#0891B2','Global module providing PrismaService.',['module'],['prisma'],[],{},'@Global() @Module({ providers:[PrismaService], exports:[PrismaService] })','Importing PrismaModule in every feature module when global.'),
  d('prismaService','Prisma Service','Database (Prisma)','#0891B2','PrismaClient wrapper with lifecycle hooks.',['prisma','module'],['service'],[],{},'class PrismaService extends PrismaClient implements OnModuleInit {}','Creating new PrismaClient per request.'),
  d('prismaModel','Prisma Model','Database (Prisma)','#0E7490','A model in schema.prisma.',['prisma'],['service','repository'],[F.name,{key:'fields',label:'Fields (name:Type per line, add ? / @unique / @id)',type:'textarea'}],{name:'User',fields:'id:String @id @default(cuid())\nname:String\nemail:String @unique'},'model User { id String @id }','Missing @unique on email.'),
  d('crud','CRUD Operation','Database (Prisma)','#0E7490','Marks a service as CRUD over a Prisma model.',['service'],['prisma'],[{key:'model',label:'Prisma model name',type:'text'}],{model:'User'},'prisma.user.findMany()','Building CRUD in the controller.'),
  d('pagination','Pagination','Database (Prisma)','#22D3EE','skip/take pagination on findMany.',['service'],['service'],[],{},'findMany({ skip:(page-1)*limit, take:limit })','Unbounded take.'),
  d('transaction','Transaction','Database (Prisma)','#22D3EE','prisma.$transaction([...]).',['service'],['prisma'],[],{},'await prisma.$transaction([...])','Multi-write without a transaction.'),
  d('dbConfig','Database Configuration','Database (Prisma)','#22D3EE','DATABASE_URL + Prisma datasource (PostgreSQL).',['prisma'],['prisma'],[{key:'provider',label:'Provider',type:'select',options:['postgresql','mysql','sqlite','mongodb']}],{provider:'postgresql'},'datasource db { provider = "postgresql" }','SQLite in production for concurrent writes.'),

  d('authModule','Auth Module','Auth','#DB2777','Module wiring JWT strategy, guard and service.',['module'],['module','controller'],[F.name],{name:'Auth'},'@Module({ imports:[JwtModule.register({})] })','Secret hardcoded in register().'),
  d('jwtAuth','JWT Authentication','Auth','#DB2777','JwtModule + token issuing on login.',['module'],['guard'],[],{},'JwtModule.register({ secret: process.env.JWT_SECRET })','Never expiring tokens.'),
  d('login','Login Route','Auth','#EC4899','POST /auth/login issuing a JWT.',['controller'],['dto'],[F.path],{path:'login'},'@Post("login")','Returning the user entity with the token.'),
  d('register','Register Route','Auth','#EC4899','POST /auth/register with hashed password.',['controller'],['dto'],[F.path],{path:'register'},'@Post("register")','Storing plaintext passwords.'),
  d('jwtStrategy','JWT Strategy','Auth','#EC4899','PassportStrategy validating bearer tokens.',['module'],['guard'],[],{},'class JwtStrategy extends PassportStrategy(Strategy) {}','validate() returning the raw payload with secrets.'),
  d('jwtGuard','JWT Guard','Auth','#BE185D','AuthGuard("jwt") protecting routes.',['guard','route','controller'],['route','controller'],[],{},'@UseGuards(JwtAuthGuard)','Guard that never returns false/throws.'),
  d('authGuard','Auth Guard','Auth','#BE185D','Generic CanActivate guard.',['module'],['route','controller'],[F.name],{name:'Auth'},'class AuthGuard implements CanActivate {}','Reading body in a guard for auth decisions.'),
  d('rolesGuard','Roles Guard','Auth','#BE185D','Guard checking @Roles() metadata.',['guard'],['route'],[],{},'@UseGuards(RolesGuard) @Roles("admin")','Roles stored only on the client.'),
  d('roles','Roles Decorator','Auth','#F472B6','@Roles(...roles) SetMetadata decorator.',['route'],['guard'],[{key:'roles',label:'Roles (comma sep.)',type:'text'}],{roles:'admin'},'export const Roles = (...r:string[]) => SetMetadata("roles", r)','Checking roles inside every handler.'),
  d('hashing','Password Hashing','Auth','#F472B6','bcrypt hashing in the auth service.',['service'],['service'],[{key:'rounds',label:'Salt rounds',type:'text'}],{rounds:'10'},'bcrypt.hash(pw, 10)','Fast hashes (md5/sha) for passwords.'),
  d('currentUser','Current User','Auth','#F472B6','@CurrentUser() param decorator reading req.user.',['route'],['route'],[],{},'createParamDecorator((d, ctx) => ctx.switchToHttp().getRequest().user)','Trusting a userId from the body.'),
  d('publicRoute','Public Route','Auth','#F472B6','@Public() metadata bypassing the global guard.',['route'],['guard'],[],{},'export const Public = () => SetMetadata("isPublic", true)','Forgetting the guard must check isPublic first.'),

  d('guard','Guard','Architecture','#7C3AED','CanActivate class.',['module'],['route','controller'],[F.name],{name:'Custom'},'class CustomGuard implements CanActivate {}','Throwing generic Error instead of 403.'),
  d('interceptor','Interceptor','Architecture','#7C3AED','NestInterceptor for logging/transform/caching.',['module'],['route','controller'],[F.name],{name:'Transform'},'class TransformInterceptor implements NestInterceptor {}','Mutating the response shape inconsistently.'),
  d('pipe','Pipe','Architecture','#8B5CF6','PipeTransform for parsing/validation.',['module'],['route'],[F.name],{name:'ParseInt'},'class ParseIntPipe implements PipeTransform {}','Re-implementing built-in ParseIntPipe badly.'),
  d('filter','Exception Filter','Architecture','#8B5CF6','@Catch() exception filter.',['module'],['module'],[F.name],{name:'Http'},'@Catch(HttpException)','Catching everything and returning 200.'),
  d('decorator','Custom Decorator','Architecture','#A78BFA','SetMetadata / param decorator.',['module'],['route'],[F.name],{name:'Custom'},'export const Custom = () => SetMetadata("custom", true)','Decorators with side effects.'),
  d('gateway','WebSocket Gateway','Architecture','#A78BFA','@WebSocketGateway() realtime gateway.',['module'],['module'],[F.name,{key:'port',label:'Port (blank = same)',type:'text'}],{name:'Events',port:''},'@WebSocketGateway()','No auth on socket handshake.'),
  d('graphql','GraphQL Resolver','Architecture','#A78BFA','@Resolver() for GraphQL APIs.',['module'],['module'],[F.name],{name:'Users'},'@Resolver(() => User)','N+1 queries in resolvers.'),
  d('micro','Microservice Controller','Architecture','#A78BFA','@MessagePattern() microservice handler.',['module'],['module'],[F.name],{name:'Math'},'@MessagePattern({ cmd:"sum" })','HTTP decorators in a microservice controller.'),
  d('queue','Queue Processor','Architecture','#A78BFA','BullMQ @Processor() consumer.',['module'],['module'],[F.name,{key:'queue',label:'Queue name',type:'text'}],{name:'Mail',queue:'mail'},'@Processor("mail")','No retry/backoff config.'),
  d('events','Event Emitter','Architecture','#A78BFA','@OnEvent() listener / EventEmitter2.',['service'],['service'],[{key:'event',label:'Event name',type:'text'}],{event:'user.created'},'@OnEvent("user.created")','Tight coupling disguised as events for core flows.'),

  d('httpModule','HttpModule / Axios','Integrations','#EA580C','@nestjs/axios HttpModule for external calls.',['module'],['service'],[],{},'imports: [HttpModule]','Calling axios directly without timeout.'),
  d('externalApi','External API','Integrations','#EA580C','Typed client for a third-party API.',['service'],['service'],[F.name,{key:'baseUrl',label:'Base URL',type:'text'}],{name:'Stripe',baseUrl:'https://api.stripe.com'},'firstValueFrom(http.get(url))','No timeout / retry on external calls.'),
  d('webhook','Webhook','Integrations','#F97316','Inbound webhook endpoint (raw body).',['controller'],['route'],[F.path],{path:'webhooks/stripe'},'@Post("webhooks/stripe")','Verifying signatures after parsing JSON (need raw body).'),
  d('redis','Redis','Integrations','#F97316','Redis provider (cache / queues).',['module'],['service'],[],{},'CacheModule.register({ store: redisStore })','Using Redis as the primary database.'),
  d('bullmq','BullMQ Queue','Integrations','#F97316','BullModule queue registration.',['module'],['queue'],[{key:'queue',label:'Queue name',type:'text'}],{queue:'mail'},'BullModule.registerQueue({ name:"mail" })','Jobs without ids → duplicates.'),
  d('email','Email Service','Integrations','#FB923C','Transactional email provider service.',['module'],['service'],[F.name],{name:'Mail'},'class MailService { async send(){} }','Sending email synchronously in the request path.'),
  d('storage','File Storage','Integrations','#FB923C','S3-compatible storage service.',['module'],['service'],[F.name],{name:'Storage'},'class StorageService {}','Public buckets for private files.'),

  d('unitTest','Unit Test','Testing','#65A30D','Jest unit spec for a service/controller.',['service','controller'],[],[F.name],{name:'Users'},'describe("UsersService", () => {})','Testing implementation details, not behaviour.'),
  d('e2eTest','E2E Test','Testing','#65A30D','supertest e2e spec against the app.',['app'],[],[],{},'request(app.getHttpServer()).get("/users").expect(200)','E2E tests sharing mutable DB state.'),
  d('mock','Mock Provider','Testing','#84CC16','useValue mock for a dependency in tests.',['service'],['unitTest'],[F.name],{name:'Users'},'{ provide: UsersService, useValue: { findAll: jest.fn() } }','Mocks that drift from the real interface.'),
  d('testDb','Test Database','Testing','#84CC16','Isolated test DB / Test module setup.',['e2eTest'],[],[],{},'Test.createTestingModule({ imports:[AppModule] })','Running e2e against the dev database.'),
];
export const DEF_MAP: Record<string, NodeDef> = Object.fromEntries(NODE_DEFS.map(x => [x.kind, x]));

/** Typed connection rules: returns error string or null when valid. */
export function validateConnection(sourceKind: string, targetKind: string): string | null {
  const s = DEF_MAP[sourceKind]; const t = DEF_MAP[targetKind];
  if (!s || !t) return 'Unknown node type.';
  if (sourceKind === targetKind && sourceKind !== 'module' && sourceKind !== 'service') return 'A node cannot connect to itself.';
  if (t.kind === 'dto' || t.kind === 'createDto' || t.kind === 'updateDto') {
    if (!['controller','route','routeGet','routePost','routePut','routePatch','routeDelete','requestBody'].includes(s.kind) && s.category !== 'HTTP & Routing')
      return `A DTO should be connected from a Controller or Route, not from ${s.label}. Connect: Route → DTO.`;
  }
  if (t.kind === 'bootstrap') return 'Bootstrap is the entry point — nothing connects into it. Connect Bootstrap → Main Module.';
  if (s.kind === 'dto' && t.kind === 'bootstrap') return 'Invalid: a DTO cannot connect directly to Bootstrap.';
  if (s.kind === 'controller' && t.kind === 'prismaModel') return 'Invalid: Controller → Prisma Model skips the Service/Repository layer. Add a Service in between.';
  if (s.kind === 'requestBody' && t.category === 'Application') return 'Invalid: Request Body cannot connect to a Module/Application node.';
  if (s.kind === 'prismaModel' && !['service','repository','crud'].includes(t.kind)) return 'A Prisma Model should connect to a Service, Repository or CRUD node.';
  if (t.kind === 'controller' && !['module','mainModule','globalModule'].includes(s.kind) && s.kind !== 'guard' && s.kind !== 'jwtGuard' && s.kind !== 'interceptor')
    return `Controllers are registered by a Module. Connect a Module → Controller (got ${s.label} → Controller).`;
  if (t.kind === 'route' || ['routeGet','routePost','routePut','routePatch','routeDelete'].includes(t.kind)) {
    if (!['controller','restController'].includes(s.kind)) return 'Routes belong to a Controller. Connect Controller → Route.';
  }
  return null;
}
