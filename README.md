# 众诚合 · 产品展示与管理网站

源码仓库：[keep306/keep](https://github.com/keep306/keep)。完整网站使用 Sites / Cloudflare Worker / D1 运行，GitHub 保存可维护的完整源码与产品资料。

官网：[众诚合](https://zhongchenghe-surfaces.earnestreed8.chatgpt.site/)。管理后台：同一网址的 `/admin`，需管理员登录。

前台：独立首页、产品中心、SPC花色库、空间应用、检测资料；24款花色直接展示并按纹理分类，支持本机选样清单、商务询盘和四份完整材料的站内逐页阅读。

前台默认英文，顶部 EN / 中文可即时切换，并在本设备记住选择。切换不会清空表单或选样；产品信息、询盘提示及资料阅读器控件均随语言切换。品牌和报告中的法定公司名称保留原名，原始 PDF 保持原文。翻译字典在 `public/i18n.js` 与 `public/i18n-content.js`。

后台 `/admin`：询盘统计、搜索/筛选/分页、状态与备注、CSV导出、现有产品与花色编辑和隐藏、品牌首页及邮箱/社媒设置。

## 技术与数据

Sites Vinext / Cloudflare Worker / D1。源码在 `app/`、`content/`、`public/`、`lib/backend/`；数据库结构在 `db/schema.ts`，迁移在 `drizzle/`。真实初始产品与24款花色来自用户画册，数据库保存管理覆盖内容与询盘。

`content/home.html` 和其余HTML是页面源；`public/document-viewer.js` 原位打开材料阅读器；`public/documents/` 保留PDF及逐页图。PDF与渲染页属于用户提供的资料，不应修改检测结论。

## 本机运行

要求Node.js >=22.13。

1. `npm ci`（若当前网络无法连接npm，可为单次安装配置可用镜像）。
2. 建立不提交的 `.dev.vars`：`ADMIN_EMAILS=seedy@sites.test`。
3. `npm run build`，生成本机D1配置。
4. 按顺序应用尚未在本机执行的SQL：
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_misty_kinsey_walden.sql`
5. `npm run dev -- --hostname 127.0.0.1`，打开输出地址；管理页使用starter内置本机登录模拟身份。该模拟登录不会进入生产构建。

`npm test`：真实SQLite行为测试。
`npm run typecheck`：TypeScript检查。
`npm run test:integration`：开发服务启动后，对本机D1进行完整API联调（生成仅本机的测试询盘）。

## 发布与管理权限

保留 `.openai/hosting.json` 的原站点ID。通过Sites配置生产环境 `ADMIN_EMAILS` 为被授权管理员邮箱；不要把真实配置或令牌写入源码。官网允许公开访问；后台每个API都检查平台登录身份和邮箱白名单，并对写入校验同源请求。

发布源码与部署产物不包含 `.dev.vars`、`.wrangler`、本机数据库及测试询盘。生产数据由独立D1数据库保存。GitHub源码更新与线上发布是分别执行的，不会因为仓库修改而自动更新线上版本。

Facebook 已使用用户提供的主页分享链接；WhatsApp 使用 +86 15215986929；TikTok 使用 @hastings.oliver。邮箱继续留空，可在后台站点设置中填写。前台不展示 Instagram。询盘保存到后台，不发送自动邮件。已有询盘的选样名称会保存为提交时快照，后续改名不会改变历史记录。处理记录使用版本号避免覆盖并发更新。

网站品牌使用用户提供的公司标识“众诚合”，英文拼写 Zhongchenghe 取自公司照片。蓝色标志依照片通过内置 imagegen 提取整理，网页使用透明 PNG；原始产品与检测文件保持原文。检测结果只对报告所载“碳晶大板”送检样品有效。

询盘填写内容在同一标签页的 sessionStorage 暂存，最长2小时，提交成功后清除；不自动恢复同意复选框。未确认提交结果的请求编号随草稿保留，重试继续使用后端幂等校验。
