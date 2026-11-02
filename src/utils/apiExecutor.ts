export interface ExecResult { status: number; statusText: string; timeMs: number; size: number; headers: Record<string,string>; body: string; error?: string; }
export function applyVars(text: string, vars: Record<string,string>): string { return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, k) => vars[k] ?? `{{${k}}}`); }
export async function executeRequest(opts: { method: string; url: string; headers: string; body: string; vars: Record<string,string>; timeoutMs?: number }): Promise<ExecResult> {
  const url = applyVars(opts.url.trim(), opts.vars);
  const started = performance.now();
  if (!url || !/^https?:\/\//i.test(url)) return { status: 0, statusText: '', timeMs: 0, size: 0, headers: {}, body: '', error: 'Invalid URL. Use a full http(s) URL, e.g. {{baseUrl}}/users with baseUrl = http://localhost:3000.' };
  const headers: Record<string,string> = {};
  for (const line of applyVars(opts.headers, opts.vars).split('\n')) { const i = line.indexOf(':'); if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    const hasBody = !['GET','HEAD'].includes(opts.method.toUpperCase());
    const res = await fetch(url, { method: opts.method.toUpperCase(), headers, body: hasBody && opts.body ? applyVars(opts.body, opts.vars) : undefined, signal: ctrl.signal });
    const text = await res.text(); const hdrs: Record<string,string> = {}; res.headers.forEach((v, k) => { hdrs[k] = v; });
    return { status: res.status, statusText: res.statusText, timeMs: Math.round(performance.now() - started), size: new Blob([text]).size, headers: hdrs, body: text };
  } catch (e) {
    const msg = e instanceof DOMException && e.name === 'AbortError' ? 'Request timed out / aborted.' : 'Network/CORS error: the browser blocked or could not reach this URL. If you are testing a local NestJS server, make sure it is running and CORS is enabled (app.enableCors()). Hosted (https) pages cannot call http://localhost in some browsers — run NestFlow locally or use a tunnel.';
    return { status: 0, statusText: '', timeMs: Math.round(performance.now() - started), size: 0, headers: {}, body: '', error: `${msg} (${e instanceof Error ? e.message : String(e)})` };
  } finally { clearTimeout(timer); }
}
export function prettyBody(body: string): string { try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; } }
