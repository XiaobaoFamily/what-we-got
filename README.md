# 家里有啥

一个给家庭使用的库存管理 PWA。它把物品分为常温、冷藏、冷冻三类，支持到期提醒、低库存看板、多标签筛选、快速增减数量，以及通过邀请码共享家庭库存。

## 运行方式

需要 Node.js 24 和 pnpm 11。

```bash
pnpm install
pnpm dev
```

## 初始化 Supabase

1. 新建一个 Supabase 项目。
2. 打开 SQL Editor，运行 [`supabase/migrations/202609140001_initial_inventory.sql`](supabase/migrations/202609140001_initial_inventory.sql)。
3. 在 Authentication → Providers 中启用 Email；按需要决定是否要求邮箱验证。
4. 如果启用了邮箱验证，在 Authentication → URL Configuration 中把 Site URL 设为部署后的 GitHub Pages 地址，并把 `http://localhost:5173` 加入本地开发的 Redirect URLs。
5. 打开 PWA，填写项目的 Project URL 和 anon / publishable key。不要填写 `service_role` key。
6. 创建账号，然后创建家庭；其他成员连接同一个 Supabase 项目后，可注册账号并输入家庭邀请码。

连接信息保存在各自设备的浏览器存储中。anon key 本身是公开客户端密钥，真正的数据隔离由 Supabase Auth 和 Row Level Security 完成。

## 部署到 GitHub Pages

仓库已包含 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)。推送到 `main` 后，工作流会构建并部署 `dist`。

首次部署前，在 GitHub 仓库的 Settings → Pages 中，将 Source 设为 **GitHub Actions**。由于 Supabase 配置由使用者在 App 内填写，不需要把任何 Supabase 密钥放进 GitHub Secrets。

## 当前数据模型

- 一个账号只能加入一个家庭。
- 每个家庭有一个邀请码；家庭成员可以查看并修改该家庭的库存。
- 库存数量归零后仍然保留，只有手动删除才会消失。
- 快速增减使用数据库函数原子更新，避免家庭成员同时操作时互相覆盖。
- PWA 外壳可以离线打开；库存读取和修改仍需要网络连接 Supabase。
