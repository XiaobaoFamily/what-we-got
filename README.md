# 家里有啥

一个给家庭使用的库存管理 PWA。它把物品分为常温、冷藏、冷冻三类，支持到期提醒、可选低库存提醒、多标签筛选、买菜单、快速增减数量，以及通过邀请码共享家庭库存。

## 运行方式

需要 Node.js 24 和 pnpm 11。

```bash
pnpm install
pnpm dev
```

## 初始化 Supabase

1. 新建一个 Supabase 项目。
2. 打开 SQL Editor，按文件名顺序运行 [`supabase/migrations`](supabase/migrations) 中的 SQL 文件。已经初始化过的家庭只需要运行尚未执行的新 migration。
3. 在 Authentication → Providers 中启用 Email；按需要决定是否要求邮箱验证。
4. 如果启用了邮箱验证，在 Authentication → URL Configuration 中把 Site URL 设为部署后的 GitHub Pages 地址，并把 `http://localhost:5173` 加入本地开发的 Redirect URLs。
5. 打开 PWA，填写项目的 Project URL 和 anon / publishable key。不要填写 `service_role` key。
6. 创建账号，然后创建家庭；其他成员连接同一个 Supabase 项目后，可注册账号并输入家庭邀请码。

连接信息保存在各自设备的浏览器存储中。anon key 本身是公开客户端密钥，真正的数据隔离由 Supabase Auth 和 Row Level Security 完成。

## 部署到 GitHub Pages

仓库已包含 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)。推送到 `main` 后，工作流会构建并部署 `dist`。

首次部署前，在 GitHub 仓库的 Settings → Pages 中，将 Source 设为 **GitHub Actions**。由于 Supabase 配置由使用者在 App 内填写，不需要把任何 Supabase 密钥放进 GitHub Secrets。

## 当前数据模型

更新到多批次版本前，请在 Supabase SQL Editor 运行 `202609300001_inventory_batches.sql`（先完成之前的 migrations）。旧记录会保留为批次；同一家庭中同名、同单位的旧记录会归到同一种物品，公共设置采用最近修改的一条。不同单位不合并或自动换算。

- 物品保存名称、单位、标签和补货提醒；库存批次分别保存数量、储存区、包装日期、开封日期及备注。
- 每次添加库存（包括从买菜单入库）都会新增未开封批次，不再累加到旧批次。
- 补货提醒根据该物品所有批次的总剩余数量判断。编辑公共设置会应用到该物品全部批次。
- 点击“开封”可以选择本批中开封的数量；部分开封会原子拆分成两批，总数量保持不变。开封日期与用完天数可修改或撤销，撤销不会自动合并批次。
- 到期提醒取包装日期与开封后期限中的较早值。库存按该日期排序，没日期的随后显示，数量为零的批次统一沉底。

- 一个账号只能加入一个家庭。
- 每个家庭有一个邀请码；家庭成员可以查看并修改该家庭的库存。
- 库存数量归零后仍然保留，只有手动删除才会消失。
- 每项库存可以单独关闭低库存提醒，关闭后不会出现在看板的补货区域。
- 快速增减使用数据库函数原子更新，避免家庭成员同时操作时互相覆盖。
- 每个家庭默认有 Costco、H-Mart、H-E-B 和 Target 四个买菜单，也可以建立自定义买菜单；勾选买到的项目时可以直接记录库存。
- PWA 外壳可以离线打开；库存读取和修改仍需要网络连接 Supabase。

## 本地保质期规则库

[`src/data/shelfLifeRules.ts`](src/data/shelfLifeRules.ts) 包含第一版常见食物规则、中文别名、常温/冷藏/冷冻期限、保存建议、风险等级和来源链接。添加库存时，应用会按名称和储存区域匹配规则，展示保存建议，并允许用户一键采用按较短期限计算出的建议日期。

规则主要参考 USDA FoodKeeper、FoodSafety.gov 冷藏冷冻表和 FDA 保存建议。冷藏期限同时涉及食品安全和品质；冷冻期限通常表示最佳品质。包装上的保存说明和明确日期始终优先，无法确认安全时应丢弃而不是品尝。

“规则”Tab 中的修改会写入 `household_shelf_life_rules`，供同一家庭的所有成员同步使用。修改内置规则会创建家庭覆盖版本，可以随时恢复默认；新增的规则则只属于当前家庭。
