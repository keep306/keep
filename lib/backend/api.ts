export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database { prepare(query: string): Statement }
export type Product = { id: string; title: string; kicker: string; image: string; alt: string; description: string; details: [string, string][]; action: string; actionLabel: string; visible: boolean; sortOrder: number };
export type Swatch = { id: string; name: string; code: string | null; category: string; image: string; page: number; visible: boolean; sortOrder: number };
export type Settings = { brandName: string; heroTitle: string; heroSubtitle: string; email: string; socials: { instagram: string; facebook: string; tiktok: string; whatsapp: string } };
export type Catalog = { products: Product[]; swatches: Swatch[]; settings: Settings };
export interface Dependencies {
  db?: Database;
  defaults: Catalog;
  user: { userId: string; email: string; displayName?: string } | null;
  adminEmails?: string;
  now?: () => Date;
}
type RecordValue = Record<string, unknown>;
type InquiryRow = { id: string; request_id: string; request_hash: string; name: string; email: string; company: string; country: string; project_type: string; message: string; selected_swatches: string; created_at: string; updated_at: string; status: string; notes: string; version: number };
const STATUS = ['new', 'read', 'replied', 'archived'];
const CATEGORIES = ['wood', 'stone', 'fabric', 'solid'];
const JSON_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
class ApiError extends Error {
  status: number; code: string; fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message); this.status = status; this.code = code; this.fields = fields;
  }
}
function failField(field: string, message: string): never { throw new ApiError(400, 'validation_error', '请检查填写的信息。', { [field]: message }); }
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'invalid_body', '请求内容必须是 JSON 对象。');
  return value as RecordValue;
}
function text(data: RecordValue, key: string, min: number, max: number): string {
  const value = data[key];
  if (typeof value !== 'string' || value.length > max || value.trim().length < min || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) failField(key, `请输入 ${min} 至 ${max} 个字符。`);
  return value.trim();
}
function integer(data: RecordValue, key: string, min: number, max: number): number {
  const value = data[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) failField(key, `请输入 ${min} 至 ${max} 的整数。`);
  return value;
}
function bool(data: RecordValue, key: string): boolean { if (typeof data[key] !== 'boolean') failField(key, '请输入布尔值。'); return data[key] as boolean; }
function email(data: RecordValue, key: string, optional = false): string {
  const value = text(data, key, optional ? 0 : 3, 254).toLowerCase();
  if (value === '' && optional) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) failField(key, '请输入有效邮箱地址。');
  return value;
}
function enumeration(data: RecordValue, key: string, allowed: string[]): string {
  const value = text(data, key, 1, 80); if (!allowed.includes(value)) failField(key, '请选择有效选项。'); return value;
}
function authorize(deps: Dependencies) {
  const user = deps.user;
  if (!user?.userId?.trim() || !user?.email?.trim()) throw new ApiError(401, 'unauthorized', '请先登录。');
  const allowed = (deps.adminEmails || '').split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.trim().toLowerCase())) throw new ApiError(403, 'forbidden', '当前账号没有管理权限。');
  return { email: user.email.trim().toLowerCase(), displayName: user.displayName || user.email };
}
async function readBody(request: Request): Promise<RecordValue> {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) throw new ApiError(403, 'invalid_origin', '请求来源无效，请从本站重新提交。');
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ApiError(415, 'unsupported_media_type', '请使用 JSON 提交。');
  const maximum = 65536;
  if (Number(request.headers.get('Content-Length')) > maximum) throw new ApiError(413, 'body_too_large', '提交内容过大。');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'invalid_body', '提交内容不能为空。');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > maximum) { await reader.cancel(); throw new ApiError(413, 'body_too_large', '提交内容过大。'); }
    chunks.push(value);
  }
  const combined = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(combined)); } catch { throw new ApiError(400, 'invalid_json', 'JSON 格式无效。'); }
  return record(parsed);
}
function response(value: unknown, status = 200) { return Response.json(value, { status, headers: JSON_HEADERS }); }
function database(deps: Dependencies): Database { if (!deps.db) throw new ApiError(503, 'database_unavailable', '服务暂时不可用，请稍后重试。'); return deps.db; }
async function catalog(db: Database, defaults: Catalog, includeHidden: boolean): Promise<Catalog> {
  const rows = (await db.prepare('SELECT kind, id, value FROM content_overrides').all<{ kind: string; id: string; value: string }>()).results;
  const overrides = new Map(rows.map(row => [`${row.kind}/${row.id}`, JSON.parse(row.value)]));
  const merged = <T extends { id: string; visible: boolean; sortOrder: number }>(kind: string, items: T[]): T[] => items.map(item => overrides.get(`${kind}/${item.id}`) ?? item).filter(item => includeHidden || item.visible).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  return { products: merged('product', defaults.products), swatches: merged('swatch', defaults.swatches), settings: overrides.get('settings/site') ?? defaults.settings };
}
function imagePath(data: RecordValue, defaults: Catalog): string {
  const image = text(data, 'image', 1, 200);
  if (![...defaults.products, ...defaults.swatches].some(item => item.image === image)) failField('image', '请选择现有图片。');
  return image;
}
function actionPath(data: RecordValue): string {
  const action = text(data, 'action', 1, 200);
  if (['#finishes', '#contact', '#collections', '#spaces', '#quality'].includes(action)) return action;
  const match = /^documents\/(product-catalog|finish-catalog|fire-report|formaldehyde-report)\.pdf(?:#page=(\d+))?$/.exec(action);
  const pageLimits: Record<string, number> = { 'product-catalog': 83, 'finish-catalog': 11, 'fire-report': 5, 'formaldehyde-report': 3 };
  if (!match || (match[2] && (Number(match[2]) < 1 || Number(match[2]) > pageLimits[match[1]]))) failField('action', '请选择现有画册及有效页码或页面锚点。');
  return action;
}
function validateProduct(body: RecordValue, id: string, defaults: Catalog): Product {
  if (!defaults.products.some(p => p.id === id)) throw new ApiError(404, 'not_found', '产品不存在。');
  if (body.id !== id) failField('id', '产品 ID 不可更改。');
  if (!Array.isArray(body.details) || body.details.length > 8) failField('details', '产品参数最多 8 项。');
  const details = body.details.map(row => {
    if (!Array.isArray(row) || row.length !== 2) failField('details', '每项参数需包含名称和值。');
    const fields = { label: row[0], value: row[1] }; return [text(fields, 'label', 1, 80), text(fields, 'value', 1, 250)] as [string, string];
  });
  return { id, title: text(body, 'title', 1, 100), kicker: text(body, 'kicker', 1, 160), image: imagePath(body, defaults), alt: text(body, 'alt', 1, 240), description: text(body, 'description', 1, 1500), details, action: actionPath(body), actionLabel: text(body, 'actionLabel', 1, 100), visible: bool(body, 'visible'), sortOrder: integer(body, 'sortOrder', 0, 10000) };
}
function validateSwatch(body: RecordValue, id: string, defaults: Catalog): Swatch {
  if (!defaults.swatches.some(p => p.id === id)) throw new ApiError(404, 'not_found', '花色不存在。');
  if (body.id !== id) failField('id', '花色 ID 不可更改。');
  return { id, name: text(body, 'name', 1, 100), code: body.code === null ? null : text(body, 'code', 0, 80), category: enumeration(body, 'category', CATEGORIES), image: imagePath(body, defaults), page: integer(body, 'page', 1, 11), visible: bool(body, 'visible'), sortOrder: integer(body, 'sortOrder', 0, 10000) };
}
function validateSettings(body: RecordValue): Settings {
  const socialsBody = record(body.socials); const socials = {} as Settings['socials'];
  for (const key of ['instagram', 'facebook', 'tiktok', 'whatsapp'] as const) {
    const value = text(socialsBody, key, 0, 500);
    if (value) {
      let url: URL; try { url = new URL(value); } catch { failField(`socials.${key}`, '请输入有效 HTTPS 链接。'); }
      const host = url.hostname.toLowerCase();
      const validHost = key === 'whatsapp' ? ['wa.me', 'api.whatsapp.com'].includes(host) : host === `${key}.com` || host.endsWith(`.${key}.com`);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !validHost) failField(`socials.${key}`, '链接需使用对应社媒平台的 HTTPS 地址。');
    }
    socials[key] = value;
  }
  return { brandName: text(body, 'brandName', 1, 80), heroTitle: text(body, 'heroTitle', 1, 120), heroSubtitle: text(body, 'heroSubtitle', 1, 300), email: email(body, 'email', true), socials };
}
async function saveOverride(db: Database, kind: string, id: string, value: unknown, now: string) {
  await db.prepare('INSERT INTO content_overrides(kind,id,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(kind, id, JSON.stringify(value), now).run();
}
function inquiry(row: InquiryRow) { return { id: row.id, name: row.name, email: row.email, company: row.company, country: row.country, projectType: row.project_type, message: row.message, selectedSwatches: JSON.parse(row.selected_swatches), createdAt: row.created_at, updatedAt: row.updated_at, status: row.status, notes: row.notes, version: row.version }; }
async function counts(db: Database) {
  const rows = (await db.prepare('SELECT status, COUNT(*) AS count FROM inquiries GROUP BY status').all<{ status: string; count: number }>()).results;
  const result: Record<string, number> = { total: 0, new: 0, read: 0, replied: 0, archived: 0 };
  for (const row of rows) { result.total += Number(row.count); if (STATUS.includes(row.status)) result[row.status] = Number(row.count); }
  return result;
}
async function getInquiry(db: Database, id: string) {
  const row = await db.prepare('SELECT * FROM inquiries WHERE id=?').bind(id).first<InquiryRow>();
  if (!row) throw new ApiError(404, 'not_found', '询盘不存在。'); return row;
}
function filters(url: URL) {
  const status = url.searchParams.get('status') || 'all';
  if (!['all', ...STATUS].includes(status)) failField('status', '筛选状态无效。');
  const q = text({ q: url.searchParams.get('q') || '' }, 'q', 0, 120);
  const rawPage = url.searchParams.get('page') || '1';
  if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > 500000) failField('page', '页码无效。');
  const clauses: string[] = []; const values: string[] = [];
  if (status !== 'all') { clauses.push('status=?'); values.push(status); }
  if (q) { clauses.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')"); const query = `%${q.replace(/[\\%_]/g, '\\$&')}%`; values.push(query, query, query, query); }
  return { where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', values, page: Number(rawPage) };
}
function csvCell(value: unknown) {
  let cell = String(value ?? '');
  // Leading whitespace/control characters can hide a spreadsheet formula trigger.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(cell) || /^[\t\r\n]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}
function csv(rows: InquiryRow[]) {
  const columns = ['ID', '姓名', '邮箱', '公司', '国家或地区', '项目类型', '留言', '选样', '状态', '备注', '创建时间', '更新时间'];
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push([row.id, row.name, row.email, row.company, row.country, row.project_type, row.message, JSON.parse(row.selected_swatches).map((s: { name: string; id: string }) => `${s.name} (${s.id})`).join('; '), row.status, row.notes, row.created_at, row.updated_at].map(csvCell).join(','));
  return new Response('\uFEFF' + lines.join('\r\n') + '\r\n', { headers: { ...JSON_HEADERS, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inquiries.csv"' } });
}
async function createInquiry(db: Database, body: RecordValue, deps: Dependencies, now: string): Promise<Response> {
  const data = { name: text(body, 'name', 2, 80), email: email(body, 'email'), company: text(body, 'company', 0, 120), country: text(body, 'country', 0, 80), projectType: enumeration(body, 'projectType', ['residential', 'commercial', 'hospitality', 'other']), message: text(body, 'message', 10, 3000), selectedSwatches: [] as string[] };
  if (body.consent !== true) failField('consent', '请同意为处理询盘使用以上信息。');
  if (body.website !== '') failField('website', '提交内容无效。');
  const requestId = text(body, 'requestId', 36, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) failField('requestId', '提交标识无效，请刷新后重试。');
  if (!Array.isArray(body.selectedSwatches) || body.selectedSwatches.length > 24 || body.selectedSwatches.some(id => typeof id !== 'string' || id.length > 80) || new Set(body.selectedSwatches).size !== body.selectedSwatches.length) failField('selectedSwatches', '最多选择 24 个不重复的花色。');
  data.selectedSwatches = body.selectedSwatches as string[];
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const replay = (row: InquiryRow) => {
    if (row.request_hash !== hash) throw new ApiError(409, 'idempotency_conflict', '该提交标识已用于不同内容，请重新提交。');
    return response({ inquiry: { id: row.id, createdAt: row.created_at }, duplicate: true });
  };
  const existing = await db.prepare('SELECT * FROM inquiries WHERE request_id=?').bind(requestId).first<InquiryRow>();
  if (existing) return replay(existing);
  const visible = (await catalog(db, deps.defaults, false)).swatches;
  const selected = data.selectedSwatches.map(id => { const swatch = visible.find(s => s.id === id); if (!swatch) failField('selectedSwatches', '所选花色已不可用，请重新选择。'); return { id: swatch.id, name: swatch.name }; });
  const id = crypto.randomUUID(); const cutoff = new Date(new Date(now).getTime() - 600000).toISOString();
  const result = await db.prepare(`INSERT INTO inquiries(id,request_id,request_hash,name,email,company,country,project_type,message,selected_swatches,created_at,updated_at,status,notes,version)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'new','',1 WHERE (SELECT COUNT(*) FROM inquiries WHERE email=? AND created_at>?)<3
    ON CONFLICT(request_id) DO NOTHING`).bind(id, requestId, hash, data.name, data.email, data.company, data.country, data.projectType, data.message, JSON.stringify(selected), now, now, data.email, cutoff).run();
  if (result.meta.changes === 0) {
    const concurrent = await db.prepare('SELECT * FROM inquiries WHERE request_id=?').bind(requestId).first<InquiryRow>();
    if (concurrent) return replay(concurrent);
    throw new ApiError(429, 'rate_limited', '提交过于频繁，请十分钟后再试。');
  }
  return response({ inquiry: { id, createdAt: now }, duplicate: false }, 201);
}
export async function handleApi(request: Request, deps: Dependencies): Promise<Response> {
  try {
    const url = new URL(request.url); const path = url.pathname.replace(/^\/api/, ''); const method = request.method;
    const admin = path === '/admin' || path.startsWith('/admin/');
    const adminUser = admin ? authorize(deps) : null;
    const db = database(deps);
    const now = (deps.now?.() ?? new Date()).toISOString();
    if (method === 'GET' && path === '/catalog') return response(await catalog(db, deps.defaults, false));
    if (method === 'GET' && path === '/admin/session') return response({ user: adminUser, counts: await counts(db) });
    if (method === 'GET' && path === '/admin/catalog') return response(await catalog(db, deps.defaults, true));
    if (method === 'POST' && path === '/inquiries') return await createInquiry(db, await readBody(request), deps, now);
    if (method === 'PUT' && path === '/admin/settings') {
      const settings = validateSettings(await readBody(request)); await saveOverride(db, 'settings', 'site', settings, now); return response({ settings });
    }
    const contentMatch = /^\/admin\/(products|swatches)\/([^/]+)$/.exec(path);
    if (method === 'PUT' && contentMatch) {
      const body = await readBody(request); const id = decodeURIComponent(contentMatch[2]);
      const item = contentMatch[1] === 'products' ? validateProduct(body, id, deps.defaults) : validateSwatch(body, id, deps.defaults);
      await saveOverride(db, contentMatch[1] === 'products' ? 'product' : 'swatch', id, item, now); return response({ item });
    }
    if (method === 'GET' && (path === '/admin/inquiries' || path === '/admin/inquiries/export')) {
      const { where, values, page } = filters(url);
      if (path.endsWith('/export')) {
        const rows = (await db.prepare(`SELECT * FROM inquiries${where} ORDER BY created_at DESC,id DESC LIMIT 10000`).bind(...values).all<InquiryRow>()).results;
        return csv(rows);
      }
      const [records, total, totals] = await Promise.all([
        db.prepare(`SELECT * FROM inquiries${where} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?`).bind(...values, (page - 1) * 20).all<InquiryRow>(),
        db.prepare(`SELECT COUNT(*) AS total FROM inquiries${where}`).bind(...values).first<{ total: number }>(), counts(db),
      ]);
      return response({ items: records.results.map(inquiry), total: total?.total ?? 0, page, pageSize: 20, counts: totals });
    }
    const itemMatch = /^\/admin\/inquiries\/([^/]+)$/.exec(path);
    if (itemMatch && method === 'GET') return response({ inquiry: inquiry(await getInquiry(db, decodeURIComponent(itemMatch[1]))) });
    if (itemMatch && method === 'PATCH') {
      const id = decodeURIComponent(itemMatch[1]); const body = await readBody(request);
      const status = enumeration(body, 'status', STATUS); const notes = text(body, 'notes', 0, 3000); const version = integer(body, 'version', 1, 2147483646);
      await getInquiry(db, id);
      const result = await db.prepare('UPDATE inquiries SET status=?,notes=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(status, notes, now, id, version).run();
      if (!result.meta.changes) throw new ApiError(409, 'version_conflict', '询盘已被其他操作更新，请刷新后重试。');
      return response({ inquiry: inquiry(await getInquiry(db, id)) });
    }
    throw new ApiError(404, 'not_found', '接口不存在。');
  } catch (error) {
    const expected = error instanceof ApiError;
    return response({ error: { code: expected ? error.code : 'internal_error', message: expected ? error.message : '服务暂时不可用，请稍后重试。', ...(expected && error.fields ? { fields: error.fields } : {}) } }, expected ? error.status : 500);
  }
}
