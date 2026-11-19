# 公开网站与源码仓库

用户已授权将完整源码保存到 `https://github.com/keep306/keep`，并将官网公开。完整站点由 Sites 托管 Cloudflare Worker 与 D1；GitHub Pages 不承载后端。

- 官网：`https://zhongchenghe-surfaces.earnestreed8.chatgpt.site/`
- 后台：`https://zhongchenghe-surfaces.earnestreed8.chatgpt.site/admin`
- 数据：产品默认内容与静态资料保存在仓库；线上修改与询盘保存在生产D1中。
- 权限：公开前台允许匿名浏览及提交询盘，后台API使用平台身份与 `ADMIN_EMAILS` 白名单。
- 配置：生产管理员邮箱通过托管平台环境变量设置，不写入仓库；本机模拟登录仅用于开发。
- 发布：通过 Sites 的来源仓库与部署包发布经验证的同一提交；GitHub仓库保存相同版本的源码快照。后续修改不会自动部署。

只同步Git跟踪及未忽略的源文件，不同步依赖目录、构建缓存、本机环境变量、本机数据库或测试询盘。原始产品画册和检测文件随源码保留。
