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

### 热量表

先在 Supabase SQL Editor 执行 `202610150001_calorie_entries.sql`，再部署前端。热量记录独立保存在 `calorie_entries`，按家庭、名称、生熟状态唯一；家庭成员可新增和修改，不改动库存数量、模板或保质期。

“热量表”自动列出已有库存和添加模板里的物品（同名只显示一项，排除小宝、日用品标签），也支持独立新增食物。默认按生重显示，可切换熟重；两种状态分别填写和保存。热量单位为千卡（kcal），基准份量可填写 100 克、100 毫升、1 个、1 份等。未知值留空，0 千卡是有效数值；主动清空会覆盖参考值，不会重新自动填回。

内置参考库位于 `src/data/calorieReferences.ts` 和 `src/data/freshCalorieReferences.ts`，2026-10-15 查证，共 90 条食物/状态参考记录（含别名）。已通过打开的家庭热量表读取实际食材名称，补充白菜、白萝卜、豆芽、豆苗、菇类、上海青、鲜肉鱼类等缺项。新补充的 37 条 USDA 记录已逐项与官方 SR Legacy JSON 下载数据的 kcal 字段核对；另补充豆苗、韭菜、杏鲍菇 3 条。通用肉名采用明确标注的代表性部位或肥瘦比例参考，不能代表全部部位。

精确匹配名称和状态，不对品牌、加工方式做模糊推断。关东煮、虾滑、品牌混合海鲜、香肠、品牌乳制品及状态不明的糯米笋等继续留空；不能把生熟值或克/毫升直接互换。用户保存的值优先于参考值。App 运行时不调用营养 API，也不使用 AI/API 密钥。页面只显示名称、标签、简短状态及热量，不显示来源链接或长注释；来源元数据保留在代码及已有数据库记录中，旧注释在列表中只显示首段。

参考来源（代码中保留来源地址，页面不显示）：

- [FDA 生蔬菜](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/nutrition-information-raw-vegetables)、[FDA 生水果](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/raw-fruits-poster-text-version-accessible-version)：按原表可食份量换算每 100 克并取整，属于估算参考值。
- [FDA 熟海鲜](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/nutrition-information-cooked-seafood-purchased-raw)：未加配料、按熟重计，原表 84 克换算每 100 克。
- USDA FoodData Central：生去皮去骨鸡胸肉 171077、烤熟鸡胸肉 171477、生全蛋 171287、水煮全蛋 173424、全脂牛奶 171265。牛奶以克计，不等同于毫升；具体品牌仍以包装为准。
- 新鲜食材扩充：[USDA SR Legacy 官方下载](https://fdc.nal.usda.gov/download-datasets/)、[香港食物安全中心蔬果营养表](https://www.cfs.gov.hk/sc_chi/nutrient/files/RA_FruitVeg_c.pdf)、[台湾 TFDA 开放数据的杏鲍菇条目展示](https://tools.vege.club/food-calories/king-oyster-mushroom/)。杏鲍菇条目说明样品状态为生；豆苗指鲜嫩叶梢，不能使用高热量的豌豆发芽种子数据替代。

添加模板功能需先在 Supabase SQL Editor 执行 `202610100001_inventory_templates.sql`，再部署前端。迁移会将已耗尽批次归并为每个家庭、同名物品、同储存条件的一条模板（不按单位拆分），随后删除数量为 0 的原始批次；旧批次完整历史不再保留，若需要可先导出 `inventory_items`。数量大于 0 的批次不会删除。

旧记录没有用完时间，首次迁移按 `updated_at` 选取最近的模板，保质期时长取最近创建且日期有效的同名同储存条件记录。此后每次归零都会在同一事务里更新模板并删除耗尽批次，以实际归零时间更新 `learned_at`；新批次没有有效日期时保留模板已有时长。模板用于再次添加时复用信息，不参与库存数量或提醒。保质期时长为购买日到包装到期日，不使用开封后的缩短期限。

本地数据库集成测试：临时安装 `@electric-sql/pglite` 后，通过 `PGLITE_MODULE=/绝对路径/node_modules/@electric-sql/pglite/dist/index.js node --test tests/inventory-templates.test.mjs` 运行，不连接真实 Supabase。

购买日期与稍后入库功能需执行 `202610020001_purchase_dates_and_stocking.sql`。购买日期独立于保质期起算日期，旧数据不会自动补日期；部分开封保留原购买日期及备注。开封窗口优先匹配家庭开封规则并填入较短建议天数，仍可手动调整。

买菜单顶部提供可折叠的“补货建议”，按同名同单位汇总剩余库存，也包含开启提醒但已用完的模板物品。点击可直接加入当前清单；已有未勾选的同名项目时显示“已在清单”。已购买项目可稍后点击“记录库存”，保存成功后显示“已入库”。旧买菜单没有入库历史，升级后无法推断它们是否曾入库，请勿重复记录。清空前会提示未入库数量。

更新到多批次版本前，请在 Supabase SQL Editor 运行 `202609300001_inventory_batches.sql`（先完成之前的 migrations）。旧记录会保留为批次；同一家庭中同名、同单位的旧记录会归到同一种物品，公共设置采用最近修改的一条。不同单位不合并或自动换算。

- 物品保存名称、单位、标签和补货提醒；库存批次分别保存数量、储存区、包装日期、开封日期及备注。
- 每次添加库存（包括从买菜单入库）都会新增未开封批次，不再累加到旧批次。
- 补货提醒根据该物品所有批次的总剩余数量判断。编辑公共设置会应用到该物品全部批次。
- 点击“开封”可以选择本批中开封的数量；部分开封会原子拆分成两批，总数量保持不变。开封日期与用完天数可修改或撤销，撤销不会自动合并批次。
- 到期提醒取包装日期与开封后期限中的较早值。库存按该日期排序，没日期的随后显示；已耗尽批次不显示。

- 一个账号只能加入一个家庭。
- 每个家庭有一个邀请码；家庭成员可以查看并修改该家庭的库存。
- 库存数量归零后更新添加模板并清理原批次，同名同储存条件只保留一份模板。
- 每项库存可以单独关闭低库存提醒，关闭后不会出现在买菜单的补货建议。
- 快速增减使用数据库函数原子更新，避免家庭成员同时操作时互相覆盖。
- 每个家庭默认有 Costco、H-Mart、H-E-B 和 Target 四个买菜单，也可以建立自定义买菜单；勾选买到的项目时可以直接记录库存。
- PWA 外壳可以离线打开；库存读取和修改仍需要网络连接 Supabase。

## 本地保质期规则库

[`src/data/shelfLifeRules.ts`](src/data/shelfLifeRules.ts) 包含第一版常见食物规则、中文别名、常温/冷藏/冷冻期限、保存建议、风险等级和来源链接。添加库存时，应用会按名称和储存区域匹配规则，展示保存建议，并允许用户一键采用按较短期限计算出的建议日期。

规则主要参考 USDA FoodKeeper、FoodSafety.gov 冷藏冷冻表和 FDA 保存建议。冷藏期限同时涉及食品安全和品质；冷冻期限通常表示最佳品质。包装上的保存说明和明确日期始终优先，无法确认安全时应丢弃而不是品尝。

“规则”Tab 中的修改会写入 `household_shelf_life_rules`，供同一家庭的所有成员同步使用。修改内置规则会创建家庭覆盖版本，可以随时恢复默认；新增的规则则只属于当前家庭。
