# API contract

Base same-origin /api. JSON successes; errors: {error:{code,message,fields?}} with proper HTTP status. Mutations require application/json and same-origin Origin. No email is sent.

GET /api/catalog -> {products:Product[],swatches:Swatch[],settings:Settings}; only visible products/swatches. Content defaults from content/products.json,swatches.json,settings.json, merged with DB override records.
GET /api/admin/session -> {user:{email,displayName},counts:{total,new,read,replied,archived}}; 401 if unsigned,403 if not administrator. ADMIN_EMAILS configured runtime. Require both platform identity id and email; email case-insensitive allowlist. Local built-in dev user uses seedy@sites.test through untracked .dev.vars.
GET /api/admin/catalog -> same as catalog, includes hidden items.
PUT /api/admin/products/:id -> complete Product object, returns {item:Product}.
PUT /api/admin/swatches/:id -> complete Swatch object, returns {item:Swatch}.
PUT /api/admin/settings -> Settings, returns {settings:Settings}.

Product: existing content/products.json fields {id,title,kicker,image,alt,description,details:[[label,value]],action,actionLabel,visible,sortOrder}. Editing only existing IDs. Keep action and image inside existing documents/assets. Swatch: {id,name,code:string|null,category:wood|stone|fabric|solid,image,page:number,visible,sortOrder}. Only existing IDs/images, page1-11. Settings: {brandName,heroTitle,heroSubtitle,email,socials:{instagram,facebook,tiktok,whatsapp}}; optional contacts empty string. Require valid email if set; socials HTTPS URL if set, matching selected platform hostname; WhatsApp wa.me or api.whatsapp.com.

POST /api/inquiries -> {name,email,company,country,projectType,message,selectedSwatches:string[],consent:true,requestId:UUID,website:''}; name2-80,email<=254,company<=120,country<=80,projectType in residential|commercial|hospitality|other,message10-3000,selectedSwatches valid visible IDs <=24. requestId idempotent (same body -> same record; changed body same id ->409). Honeypot website populated ->400. Per-email limit 3 new inquiries in 10min ->429. Persist selected swatch id + original display name snapshot. Response201 {inquiry:{id,createdAt},duplicate:false}; duplicate200 {inquiry:{id,createdAt},duplicate:true}. No invented confirmation email.

GET /api/admin/inquiries?status=all|new|read|replied|archived&q=&page=1 -> {items:Inquiry[],total,page,pageSize:20,counts:{total,new,read,replied,archived}}. Search on name/email/company/message. Order newest first. q<=120. Pagination enforced.
GET /api/admin/inquiries/:id -> {inquiry:Inquiry}; same admin authorization, 404 when absent.
PATCH /api/admin/inquiries/:id -> {status,notes,version}; status enum above; notes<=3000. Optimistic version starts1, conflict409, returns {inquiry:Inquiry}. Inquiry has {id,name,email,company,country,projectType,message,selectedSwatches:[{id,name}],createdAt,updatedAt,status,notes,version}.
GET /api/admin/inquiries/export?status=...&q=... -> UTF8 BOM CSV attachment matching filters, max10000 rows; neutralize formula-leading cell characters.

Admin page served /admin (shell; API authorizes every read/write). Public page / uses the same original HTML/vanillaJS structure. Sign in normal anchor /signin-with-chatgpt?return_to=/admin target=_top, sign out equivalent. Production authentication remains platform-owned.
