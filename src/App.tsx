import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  Archive,
  BookOpenText,
  Boxes,
  CalendarDays,
  Cat,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  DoorOpen,
  Eye,
  EyeOff,
  IceCreamBowl,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Refrigerator,
  RotateCcw,
  Search,
  Settings,
  ShoppingBasket,
  Snowflake,
  Trash2,
  Users,
  WifiOff,
  X
} from "lucide-react";
import {
  calculateSuggestedExpiry,
  formatShelfLife,
  searchShelfLifeRules,
  searchOpeningRules,
  openingSuggestedDays,
  SHELF_LIFE_RULES,
  type FoodCategory,
  type FoodCondition,
  type FoodRiskLevel,
  type ShelfLifeGuidance,
  type ShelfLifeRule,
  type ShelfLifeStartPoint
} from "./data/shelfLifeRules";
import {
  clearSupabaseConfig,
  loadSupabaseConfig,
  makeSupabaseClient,
  saveSupabaseConfig,
  validateSupabaseConfig
} from "./lib/supabase";
import type { Household, HouseholdShelfLifeRule, InventoryItem, ShoppingList, ShoppingListItem, StorageZone, SupabaseConfig } from "./types";
import { effectiveExpiry, productTotals, sortBatches } from "./lib/inventory";

const DEFAULT_TAGS = [
  "小宝",
  "新鲜食物",
  "蔬菜",
  "瓜果",
  "肉类",
  "预制菜",
  "调味料",
  "饮料",
  "主食",
  "零食",
  "烘焙",
  "乳制品",
  "日用品"
];

const UNIT_OPTIONS = ["件", "包", "盒", "瓶", "罐", "袋", "个", "克", "千克", "毫升", "升"];
const QUICK_EXPIRY_DAYS = [7, 30, 90, 180, 360] as const;

const ZONES: Array<{ key: StorageZone; label: string; icon: typeof Archive; color: string }> = [
  { key: "pantry", label: "常温", icon: Archive, color: "amber" },
  { key: "chilled", label: "冷藏", icon: Refrigerator, color: "blue" },
  { key: "frozen", label: "冷冻", icon: Snowflake, color: "indigo" }
];

type Tab = "dashboard" | "add" | "inventory" | "shopping" | "rules";

function App() {
  const [config, setConfig] = useState<SupabaseConfig | null>(() => loadSupabaseConfig());
  const client = useMemo(() => (config ? makeSupabaseClient(config) : null), [config]);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setAuthReady(true);
      return;
    }
    setAuthReady(false);
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  if (!config) {
    return (
      <ConnectionScreen
        onConnect={(nextConfig) => {
          saveSupabaseConfig(nextConfig);
          setConfig(nextConfig);
        }}
      />
    );
  }

  if (!authReady || !client) return <FullPageLoader label="正在打开家里的清单…" />;

  if (!session) {
    return (
      <AuthScreen
        client={client}
        projectUrl={config.url}
        onChangeConnection={() => {
          clearSupabaseConfig();
          setConfig(null);
        }}
      />
    );
  }

  return (
    <HouseholdRouter
      client={client}
      session={session}
      onDisconnect={async () => {
        await client.auth.signOut();
        clearSupabaseConfig();
        setConfig(null);
      }}
    />
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="家里有啥">
      <span className="brand-mark"><IceCreamBowl size={22} strokeWidth={2.4} /></span>
      <span>家里有啥</span>
    </div>
  );
}

function FullPageLoader({ label }: { label: string }) {
  return (
    <main className="center-page">
      <div className="loader-card">
        <Brand />
        <LoaderCircle className="spin" size={28} />
        <p>{label}</p>
      </div>
    </main>
  );
}

function ConnectionScreen({ onConnect }: { onConnect: (config: SupabaseConfig) => void }) {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = { url: url.trim(), anonKey: anonKey.trim() };
    const validationError = validateSupabaseConfig(next);
    if (validationError) {
      setError(validationError);
      return;
    }
    onConnect(next);
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-intro">
        <Brand />
        <div className="intro-copy">
          <span className="eyebrow">你的数据，你保管</span>
          <h1>先连接家庭的<br />Supabase</h1>
          <p>同一个家庭的所有成员，需要使用同一组 Project URL 和 anon key。</p>
        </div>
        <div className="storage-orbit" aria-hidden="true">
          {ZONES.map(({ key, label, icon: Icon, color }) => (
            <div className={`orbit-card ${color}`} key={key}>
              <Icon size={22} />
              <span>{label}</span>
            </div>
          ))}
          <span className="orbit-cat"><Cat size={27} /></span>
        </div>
      </section>

      <section className="onboarding-panel">
        <form className="setup-card" onSubmit={submit}>
          <div className="step-label"><span>1</span> 连接数据库</div>
          <h2>填写公开连接信息</h2>
          <p className="muted">在 Supabase 项目的 Settings → API 中可以找到。请勿填写 service_role key。</p>
          <label>
            Project URL
            <input
              type="url"
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoComplete="url"
              required
            />
          </label>
          <label>
            Anon / publishable key
            <div className="password-field">
              <input
                type={showKey ? "text" : "password"}
                placeholder="eyJhbGciOi…"
                value={anonKey}
                onChange={(event) => setAnonKey(event.target.value)}
                autoComplete="off"
                required
              />
              <button type="button" className="icon-button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? "隐藏密钥" : "显示密钥"}>
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p className="form-error"><CircleAlert size={16} /> {error}</p>}
          <button className="primary-button" type="submit">连接并继续 <ChevronRight size={18} /></button>
          <div className="security-note"><Check size={15} /> 配置只保存在这台设备上</div>
        </form>
      </section>
    </main>
  );
}

function AuthScreen({ client, projectUrl, onChangeConnection }: { client: SupabaseClient; projectUrl: string; onChangeConnection: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const result = mode === "signin"
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message === "Invalid login credentials" ? "邮箱或密码不正确" : result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("账号已创建，请先到邮箱里完成验证。验证后再回来登录。");
      setMode("signin");
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header"><Brand /></header>
      <section className="auth-card">
        <div className="auth-illustration" aria-hidden="true"><Boxes size={42} /><span><Cat size={22} /></span></div>
        <div className="segmented auth-switch">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>登录</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>创建账号</button>
        </div>
        <h1>{mode === "signin" ? "欢迎回家" : "创建你的账号"}</h1>
        <p className="muted">{mode === "signin" ? "登录后查看家庭库存" : "之后可以创建家庭，或者用邀请码加入"}</p>
        <form onSubmit={submit}>
          <label>邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required /></label>
          {error && <p className="form-error"><CircleAlert size={16} /> {error}</p>}
          {message && <p className="form-success"><Check size={16} /> {message}</p>}
          <button className="primary-button" disabled={loading}>{loading && <LoaderCircle className="spin" size={17} />}{mode === "signin" ? "登录" : "创建账号"}</button>
        </form>
        <button className="text-button connection-link" onClick={onChangeConnection}>切换 Supabase 项目 · {new URL(projectUrl).hostname}</button>
      </section>
    </main>
  );
}

function HouseholdRouter({ client, session, onDisconnect }: { client: SupabaseClient; session: Session; onDisconnect: () => void }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHousehold = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await client
      .from("household_members")
      .select("household_id, households!inner(id,name,invite_code,created_by)")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();
    setLoading(false);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    const joined = data?.households as unknown as Household | undefined;
    setHousehold(joined ?? null);
  }, [client, session.user.id]);

  useEffect(() => { void loadHousehold(); }, [loadHousehold]);

  if (loading) return <FullPageLoader label="正在找你的家庭…" />;
  if (error) return <DatabaseError error={error} onRetry={loadHousehold} onDisconnect={onDisconnect} />;
  if (!household) return <HouseholdSetup client={client} onComplete={loadHousehold} onDisconnect={onDisconnect} />;
  return <InventoryApp client={client} household={household} email={session.user.email ?? "家庭成员"} onDisconnect={onDisconnect} />;
}

function DatabaseError({ error, onRetry, onDisconnect }: { error: string; onRetry: () => void; onDisconnect: () => void }) {
  return (
    <main className="center-page">
      <section className="error-card">
        <WifiOff size={34} />
        <h1>还没准备好数据库</h1>
        <p>请先在这个 Supabase 项目的 SQL Editor 运行仓库里的初始化脚本，然后再试一次。</p>
        <details><summary>查看错误</summary><code>{error}</code></details>
        <button className="primary-button" onClick={onRetry}>再试一次</button>
        <button className="text-button" onClick={onDisconnect}>更换连接</button>
      </section>
    </main>
  );
}

function HouseholdSetup({ client, onComplete, onDisconnect }: { client: SupabaseClient; onComplete: () => void; onDisconnect: () => void }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = mode === "create"
      ? await client.rpc("create_household", { household_name: name.trim() })
      : await client.rpc("join_household", { code: inviteCode.trim().toUpperCase() });
    setLoading(false);
    if (result.error) {
      setError(mode === "join" && result.error.message.includes("Invalid") ? "邀请码无效，请检查后重试" : result.error.message);
      return;
    }
    onComplete();
  }

  return (
    <main className="household-page">
      <header><Brand /><button className="icon-button" onClick={onDisconnect} aria-label="退出登录"><LogOut size={18} /></button></header>
      <section className="household-card">
        <div className="member-stack" aria-hidden="true"><span>你</span><span><Cat size={22} /></span><span>+</span></div>
        <h1>你要去哪个家？</h1>
        <p className="muted">创建一个新的家庭，或者输入家人发给你的邀请码。</p>
        <div className="segmented household-switch">
          <button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>创建家庭</button>
          <button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>输入邀请码</button>
        </div>
        <form onSubmit={submit}>
          {mode === "create" ? (
            <label>家庭名称<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：小宝的家" maxLength={40} required /></label>
          ) : (
            <label>家庭邀请码<input className="invite-input" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="例如：A3F9C2D8" maxLength={10} required /></label>
          )}
          {error && <p className="form-error"><CircleAlert size={16} /> {error}</p>}
          <button className="primary-button" disabled={loading}>{loading && <LoaderCircle className="spin" size={17} />}{mode === "create" ? "创建并开始" : "加入这个家"}</button>
        </form>
      </section>
    </main>
  );
}

function InventoryApp({ client, household, email, onDisconnect }: { client: SupabaseClient; household: Household; email: string; onDisconnect: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ruleOverrides, setRuleOverrides] = useState<HouseholdShelfLifeRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [openingItem, setOpeningItem] = useState<InventoryItem | null>(null);
  const [shoppingCandidate, setShoppingCandidate] = useState<InventoryItem | null>(null);

  const loadItems = useCallback(async () => {
    const { data, error: queryError } = await client
      .from("inventory_items")
      .select("*")
      .eq("household_id", household.id)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    setLoading(false);
    if (queryError) setError(queryError.message);
    else setItems(sortBatches((data ?? []) as InventoryItem[]));
  }, [client, household.id]);

  const loadRuleOverrides = useCallback(async () => {
    const { data, error: queryError } = await client
      .from("household_shelf_life_rules")
      .select("*")
      .eq("household_id", household.id)
      .order("name", { ascending: true });
    setRulesLoading(false);
    if (queryError) {
      setRulesError(queryError.message);
      setRuleOverrides([]);
    } else {
      setRulesError("");
      setRuleOverrides((data ?? []) as HouseholdShelfLifeRule[]);
    }
  }, [client, household.id]);

  useEffect(() => {
    void loadItems();
    const channel = client
      .channel(`inventory-${household.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items", filter: `household_id=eq.${household.id}` }, () => void loadItems())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, household.id, loadItems]);

  useEffect(() => {
    void loadRuleOverrides();
    const channel = client
      .channel(`shelf-life-rules-${household.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "household_shelf_life_rules", filter: `household_id=eq.${household.id}` }, () => void loadRuleOverrides())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, household.id, loadRuleOverrides]);

  const effectiveShelfLifeRules = useMemo(
    () => buildEffectiveShelfLifeRules(ruleOverrides),
    [ruleOverrides]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function changeQuantity(item: InventoryItem, delta: number) {
    const next = Math.max(0, Number(item.quantity) + delta);
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: next } : entry));
    const { data: savedQuantity, error: updateError } = await client.rpc("adjust_inventory_quantity", { item_id: item.id, amount: delta });
    if (updateError) {
      setToast("没能更新数量，请重试");
      void loadItems();
    } else if (savedQuantity !== null) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: Number(savedQuantity) } : entry));
    }
  }

  async function setQuantity(item: InventoryItem, value: number) {
    const next = Math.max(0, value);
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: next } : entry));
    const { error: updateError } = await client.from("inventory_items").update({ quantity: next }).eq("id", item.id);
    if (updateError) {
      setToast("没能更新数量，请重试");
      void loadItems();
    }
  }

  async function deleteItem(item: InventoryItem) {
    if (!window.confirm(`确认删除「${item.name}」？库存为 0 时不用删除，它会自动保留。`)) return;
    const { error: deleteError } = await client.from("inventory_items").delete().eq("id", item.id);
    if (deleteError) setToast("删除失败，请重试");
    else {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setToast("已删除库存记录");
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Archive }> = [
    { id: "dashboard", label: "看板", icon: LayoutDashboard },
    { id: "add", label: "添加", icon: PackagePlus },
    { id: "inventory", label: "库存", icon: Boxes },
    { id: "shopping", label: "买菜单", icon: ShoppingBasket },
    { id: "rules", label: "规则", icon: BookOpenText }
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <nav className="desktop-tabs" aria-label="主要页面">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={18} /> {label}</button>
          ))}
        </nav>
        <button className="household-button" onClick={() => setShowSettings(true)}><span><Users size={17} /></span><span className="household-button-name">{household.name}</span><Settings size={17} /></button>
      </header>

      <main className="app-main">
        {error && <div className="inline-error"><CircleAlert size={18} /> {error}<button onClick={loadItems}>重试</button></div>}
        {loading ? <ContentLoader /> : tab === "dashboard" ? (
          <Dashboard items={items} onAddShopping={setShoppingCandidate} />
        ) : tab === "add" ? (
          <AddInventory client={client} household={household} items={items} shelfLifeRules={effectiveShelfLifeRules} onSaved={() => { void loadItems(); setToast("已放进库存"); setTab("inventory"); }} />
        ) : tab === "inventory" ? (
          <Inventory items={items} onChangeQuantity={changeQuantity} onSetQuantity={setQuantity} onEdit={setEditingItem} onOpen={setOpeningItem} onDelete={deleteItem} />
        ) : tab === "shopping" ? (
          <ShoppingPage
            client={client}
            household={household}
            inventoryItems={items}
            shelfLifeRules={effectiveShelfLifeRules}
            onInventorySaved={() => {
              void loadItems();
              setToast("已记录到库存");
            }}
            onToast={setToast}
          />
        ) : (
          <RulesManager
            client={client}
            household={household}
            overrides={ruleOverrides}
            loading={rulesLoading}
            loadError={rulesError}
            onChanged={loadRuleOverrides}
            onToast={setToast}
          />
        )}
      </main>

      <nav className="mobile-tabs" aria-label="主要页面">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={21} /><span>{label}</span></button>
        ))}
      </nav>

      {showSettings && (
        <SettingsPanel household={household} email={email} onClose={() => setShowSettings(false)} onDisconnect={onDisconnect} onToast={setToast} />
      )}
      {editingItem && (
        <EditInventoryPanel
          key={editingItem.id}
          client={client}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            void loadItems();
            setToast("库存记录已更新");
          }}
        />
      )}
      {openingItem && <OpenBatchPanel client={client} item={openingItem} shelfLifeRules={effectiveShelfLifeRules} onClose={() => setOpeningItem(null)} onSaved={() => { setOpeningItem(null); void loadItems(); setToast("已记录开封信息"); }} />}
      {shoppingCandidate && <AddToShoppingPanel client={client} household={household} item={shoppingCandidate} onClose={() => setShoppingCandidate(null)} onSaved={(message) => { setShoppingCandidate(null); setToast(message); }} />}
      {toast && <div className="toast" role="status"><Check size={17} /> {toast}</div>}
    </div>
  );
}

function ContentLoader() {
  return <div className="content-loader"><LoaderCircle className="spin" /><span>正在整理库存…</span></div>;
}

function Dashboard({ items, onAddShopping }: { items: InventoryItem[]; onAddShopping: (item: InventoryItem) => void }) {
  const totals = productTotals(items);
  const low = totals.filter((item) => item.low_stock_enabled !== false && Number(item.quantity) <= Number(item.low_stock_threshold)).slice(0, 5);

  return (
    <div className="page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div><span className="eyebrow">今天先看这些</span><h1>家里还有什么？</h1></div>
      </div>

      <div className="dashboard-grid">
        <DashboardInventory items={items} />
        <DashboardList
          title="该补货了"
          onAddShopping={onAddShopping}
          subtitle="用完或低于提醒数量"
          icon={<Archive size={20} />}
          tone="low"
          items={low}
          empty="库存都很充足"
        />
      </div>
    </div>
  );
}

function DashboardInventory({ items }: { items: InventoryItem[] }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [zone, setZone] = useState<StorageZone | "all">("all");
  const [showMoreTags, setShowMoreTags] = useState(false);
  const quickTags = ["蔬菜", "瓜果", "肉类", "乳制品"];
  const tags = Array.from(new Set([...DEFAULT_TAGS, ...items.flatMap((item) => item.tags ?? [])]));
  const moreTags = tags.filter((tag) => !quickTags.includes(tag));
  const moreSelectedCount = selectedTags.filter((tag) => !quickTags.includes(tag)).length;
  const filtered = sortBatches(items).filter((item) =>
    (zone === "all" || item.storage_zone === zone)
    && (selectedTags.length === 0 || selectedTags.some((tag) => item.tags?.includes(tag)))
  );
  const toggleTag = (tag: string) => setSelectedTags((current) => current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]);
  return <section className="dashboard-list stock-overview">
    <header><span className="list-title-icon"><Boxes size={19} /></span><span><h2>库存总览</h2><p>到期近的在前 · 用完的在底部</p></span><strong aria-label="批次数量">{filtered.length}</strong></header>
    <div className="overview-tags overview-zones" role="group" aria-label="储存位置筛选">
      <button aria-pressed={zone === "all"} className={zone === "all" ? "active" : ""} onClick={() => setZone("all")}>全部位置</button>
      {ZONES.map((entry) => <button key={entry.key} aria-pressed={zone === entry.key} className={zone === entry.key ? "active" : ""} onClick={() => setZone(entry.key)}>{entry.label}</button>)}
    </div>
    <div className="overview-tags" role="group" aria-label="库存标签筛选">
      {quickTags.map((tag) => <button key={tag} aria-pressed={selectedTags.includes(tag)} className={selectedTags.includes(tag) ? "active" : ""} onClick={() => toggleTag(tag)}>{tag}</button>)}
      <button aria-expanded={showMoreTags} aria-controls="overview-more-tags" className={moreSelectedCount ? "active" : ""} onClick={() => setShowMoreTags((current) => !current)}>更多标签{moreSelectedCount > 0 ? ` · ${moreSelectedCount}` : ""} {showMoreTags ? "▴" : "▾"}</button>
    </div>
    {showMoreTags && <div id="overview-more-tags" className="overview-more-tags" role="group" aria-label="更多库存标签">
      {moreTags.map((tag) => <label key={tag}><input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />{tag}</label>)}
      <button className="text-button" onClick={() => setShowMoreTags(false)}>收起</button>
    </div>}
    {(zone !== "all" || selectedTags.length > 0) && <div className="overview-tags overview-selected" aria-label="当前筛选条件">
      {zone !== "all" && <button onClick={() => setZone("all")} aria-label="移除储存位置筛选">{ZONES.find((entry) => entry.key === zone)?.label} ×</button>}
      {selectedTags.map((tag) => <button key={tag} onClick={() => toggleTag(tag)} aria-label={`移除标签 ${tag}`}>{tag} ×</button>)}
      <button onClick={() => { setZone("all"); setSelectedTags([]); setShowMoreTags(false); }}>清除筛选</button>
    </div>}
    {selectedTags.length > 1 && <p className="overview-filter-note">所选位置内，匹配任意一个标签</p>}
    {!filtered.length ? <div className="empty-state">{items.length ? "没有符合条件的库存，试试其他位置或标签。" : "还没有库存记录。"}</div> : <div className="overview-rows">{filtered.map((item) => {
      const date = effectiveExpiry(item);
      const days = date ? daysUntil(date) : null;
      const empty = Number(item.quantity) === 0;
      const tone = empty ? "out" : days !== null && days < 0 ? "expired" : days !== null && days <= 7 ? "soon" : "";
      return <article key={item.id} className={`overview-row ${tone}`}>
        <div className="overview-name"><strong>{item.name}</strong><small>{ZONES.find((zone) => zone.key === item.storage_zone)?.label} · {item.opened_on ? "已开封" : "未开封"}{item.purchased_on && ` · ${formatDate(item.purchased_on)} 购买`}</small></div>
        <span className="overview-amount">{formatQuantity(item.quantity)} {item.unit}</span>
        <div className="overview-expiry"><strong>{empty ? "已用完" : date ? expiryLabel(date) : "未设置日期"}</strong>{date && <small>{formatDate(date)}</small>}</div>
      </article>;
    })}</div>}
  </section>;
}

function DashboardList({ title, subtitle, icon, tone, items, empty, onAddShopping }: { title: string; subtitle: string; icon: React.ReactNode; tone: string; items: InventoryItem[]; empty: string; onAddShopping?: (item: InventoryItem) => void }) {
  return (
    <section className={`dashboard-list ${tone}`}>
      <header><span className="list-title-icon">{icon}</span><span><h2>{title}</h2><p>{subtitle}</p></span><strong>{items.length}</strong></header>
      {items.length === 0 ? <div className="empty-state"><Check size={21} /><span>{empty}</span></div> : (
        <div className="compact-items">
          {items.map((item) => (
            <div className="compact-item" key={item.id}>
              <div className="item-main"><span className={`storage-dot ${item.storage_zone}`} /><span><strong>{item.name}</strong><small>{tone === "low" ? `总剩余 ≤ ${formatQuantity(item.low_stock_threshold)} ${item.unit}` : `${item.opened_on ? "已开封 · " : ""}${effectiveExpiry(item) ? expiryLabel(effectiveExpiry(item)!) : "未设置日期"}`}</small></span></div>
              <div className="dashboard-item-actions"><span className="dashboard-quantity"><strong>{formatQuantity(item.quantity)}</strong>{item.unit}</span>{onAddShopping && <button className="batch-open-button" onClick={() => onAddShopping(item)}>加入买菜单</button>}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddInventory({ client, household, items, shelfLifeRules, onSaved, initialName = "", embedded = false, shoppingItemId }: { client: SupabaseClient; household: Household; items: InventoryItem[]; shelfLifeRules: ShelfLifeRule[]; onSaved: () => void; initialName?: string; embedded?: boolean; shoppingItemId?: string }) {
  const suggestedExisting = initialName
    ? items.find((item) => item.name.trim().toLocaleLowerCase() === initialName.trim().toLocaleLowerCase())
    : undefined;
  const [existingId, setExistingId] = useState(suggestedExisting?.product_id ?? "");
  const [itemName, setItemName] = useState(suggestedExisting?.name ?? initialName);
  const [zone, setZone] = useState<StorageZone>(suggestedExisting?.storage_zone ?? "pantry");
  const [tags, setTags] = useState<string[]>(suggestedExisting?.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [shelfLifeStartDate, setShelfLifeStartDate] = useState(() => todayDateValue());
  const [purchasedOn, setPurchasedOn] = useState(todayDateValue());
  const [expiresOn, setExpiresOn] = useState("");
  const [lowStockEnabled, setLowStockEnabled] = useState(suggestedExisting?.low_stock_enabled !== false);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);

  const existing = items.find((item) => item.product_id === existingId);

  const shelfLifeMatches = useMemo(
    () => searchShelfLifeRules(itemName, { storageZone: zone, limit: 4, rules: shelfLifeRules }),
    [itemName, shelfLifeRules, zone]
  );
  const selectedMatch = shelfLifeMatches.find((match) => match.rule.id === selectedRuleId) ?? shelfLifeMatches[0];
  const selectedGuidance = selectedMatch?.guidance ?? null;
  const suggestedExpiry = selectedGuidance
    ? calculateSuggestedExpiry(selectedGuidance, shelfLifeStartDate)
    : null;

  function chooseExisting(nextId: string) {
    setExistingId(nextId);
    setShelfLifeStartDate(todayDateValue());
    setSelectedRuleId("");
    const selected = items.find((item) => item.product_id === nextId);
    setItemName(selected?.name ?? initialName);
    setZone(selected?.storage_zone ?? "pantry");
    setTags(selected?.tags ?? []);
    setExpiresOn("");
    setLowStockEnabled(selected?.low_stock_enabled !== false);
  }

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  }

  function addCustomTag() {
    const next = customTag.trim();
    if (next && !tags.includes(next)) setTags((current) => [...current, next]);
    setCustomTag("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("quantity")) || 0;
    if (loading) return;
    if (!itemName.trim() || itemName.trim().length > 80 || !Number.isFinite(amount) || amount < 0) {
      setError("请填写 1–80 字的名称和有效数量。");
      return;
    }
    const savedExpiresOn = String(form.get("expires_on") || "") || null;
    setLoading(true);
    setError("");
    const batch = {
        household_id: household.id,
        product_id: existing?.product_id,
        name: existing?.name ?? itemName.trim(),
        storage_zone: zone,
        quantity: amount,
        unit: existing?.unit ?? String(form.get("unit")),
        low_stock_enabled: lowStockEnabled,
        low_stock_threshold: Number(form.get("low_stock_threshold")) || 0,
        expires_on: savedExpiresOn,
        purchased_on: purchasedOn || null,
        tags,
        notes: String(form.get("notes") || "") || null
      };
    const result = shoppingItemId
      ? await client.rpc("stock_shopping_item", { shopping_item_id: shoppingItemId, batch })
      : await client.from("inventory_items").insert(batch);
    const saveError = result.error;
    setLoading(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setExistingId("");
    setItemName("");
    setTags([]);
    setZone("pantry");
    setShelfLifeStartDate(todayDateValue());
    setPurchasedOn(todayDateValue());
    setExpiresOn("");
    setLowStockEnabled(true);
    setSelectedRuleId("");
    setFormKey((value) => value + 1);
    onSaved();
  }

  return (
    <div className={`page add-page ${embedded ? "embedded-add-page" : ""}`}>
      {!embedded && <div className="page-heading"><div><span className="eyebrow">每次购买，独立记录日期</span><h1>添加库存批次</h1></div><p>选择常用物品，新建一批库存。</p></div>}
      <form className="inventory-form" onSubmit={submit} key={`${formKey}-${existingId}`}>
        <section className="form-section quick-existing">
          <div className="section-number">01</div>
          <div className="section-content">
            <h2>这是什么？</h2>
            <label>快速选择已有物品
              <select value={existingId} onChange={(event) => chooseExisting(event.target.value)}>
                <option value="">＋ 新物品（同名同单位自动归为同一种）</option>
                {productTotals(items).map((item) => <option key={item.product_id} value={item.product_id}>{item.name} · 总剩余 {formatQuantity(item.quantity)} {item.unit}</option>)}
              </select>
            </label>
            {!existing && <label>名称<input name="name" value={itemName} onChange={(event) => { setItemName(event.target.value); setSelectedRuleId(""); }} placeholder="例如：鸡胸肉、草莓、猫罐头" maxLength={80} required /></label>}
            {existing && <div className="selected-existing"><Check size={17} /><span>为「{existing.name}」新建未开封批次，请填写本批保质期。物品标签和补货设置沿用已有设置。</span></div>}
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">02</div>
          <div className="section-content">
            <h2>放在哪里？</h2>
            <div className="zone-picker">
              {ZONES.map(({ key, label, icon: Icon, color }) => (
                <button type="button" key={key} className={`${color} ${zone === key ? "selected" : ""}`} onClick={() => setZone(key)}><Icon size={22} /><span>{label}</span>{zone === key && <Check size={15} />}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">03</div>
          <div className="section-content">
            <h2>数量和日期</h2>
            <div className="form-grid two">
              <label>本批数量<input type="number" name="quantity" defaultValue="1" min="0" step="0.01" required /></label>
              <label>单位<select name="unit" disabled={Boolean(existing)} defaultValue={existing?.unit ?? "件"}>{existing && !UNIT_OPTIONS.includes(existing.unit) && <option>{existing.unit}</option>}{UNIT_OPTIONS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            </div>
            <fieldset className="stock-reminder-setting shared-product-fields" disabled={Boolean(existing)}>
              <label className="checkbox-setting"><input type="checkbox" checked={lowStockEnabled} onChange={(event) => setLowStockEnabled(event.target.checked)} /><span><strong>需要低库存提醒</strong><small>数量不足时显示在看板的“该补货了”</small></span></label>
              {lowStockEnabled ? <label>提醒阈值数量<input type="number" name="low_stock_threshold" defaultValue={existing?.low_stock_threshold ?? 1} min="0" step="0.1" required /></label> : <input type="hidden" name="low_stock_threshold" value={existing?.low_stock_threshold ?? 1} />}
            </fieldset>
            <div className="date-grid">
              <label>购买日期<span className="native-date-shell"><input type="date" value={purchasedOn} max={todayDateValue()} onChange={(event) => setPurchasedOn(event.target.value)} /></span><small className="muted">与下面的保质期起算日期分别记录</small></label>
              <label>{selectedGuidance ? `${shelfLifeStartLabel(selectedGuidance.startFrom)}日期` : "购买 / 制作日期"}<span className="native-date-shell"><input type="date" value={shelfLifeStartDate} onChange={(event) => setShelfLifeStartDate(event.target.value)} /></span></label>
              <label>保质期 / 最佳食用日期<span className="native-date-shell"><input type="date" name="expires_on" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} /></span></label>
            </div>
            <QuickExpiryOptions startDate={shelfLifeStartDate} value={expiresOn} onChange={setExpiresOn} />

            {itemName.trim() && selectedMatch && selectedGuidance ? (
              <section className={`shelf-life-suggestion risk-${selectedMatch.rule.riskLevel}`} aria-live="polite">
                <header>
                  <span className="suggestion-icon"><Lightbulb size={19} /></span>
                  <span><small>规则库建议</small><strong>{selectedMatch.rule.name} · {formatShelfLife(selectedGuidance)}</strong></span>
                  <span className="risk-label">{riskLevelLabel(selectedMatch.rule.riskLevel)}</span>
                </header>

                {shelfLifeMatches.length > 1 && (
                  <div className="rule-choices" aria-label="选择匹配的食品类型">
                    <span>更准确地选择：</span>
                    {shelfLifeMatches.map((match) => (
                      <button
                        type="button"
                        key={match.rule.id}
                        className={match.rule.id === selectedMatch.rule.id ? "selected" : ""}
                        onClick={() => setSelectedRuleId(match.rule.id)}
                      >
                        {match.rule.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="suggestion-summary">
                  <span>从{shelfLifeStartLabel(selectedGuidance.startFrom)}日期开始，按较短期限计算。</span>
                  {selectedGuidance.labelFirst && <span className="suggestion-chip">包装日期优先</span>}
                  {selectedGuidance.qualityOnly && <span className="suggestion-chip">最佳品质建议</span>}
                </div>

                {suggestedExpiry ? (
                  <button
                    type="button"
                    className={`use-suggested-date ${expiresOn === suggestedExpiry ? "used" : ""}`}
                    onClick={() => setExpiresOn(suggestedExpiry)}
                  >
                    {expiresOn === suggestedExpiry ? <Check size={17} /> : <CalendarDays size={17} />}
                    {expiresOn === suggestedExpiry ? "已使用建议日期" : `使用建议日期 · ${formatDate(suggestedExpiry)}`}
                  </button>
                ) : (
                  <p className="label-date-required">该食品没有统一天数，请查看包装后手动填写日期。</p>
                )}

                <ul className="storage-advice">
                  {selectedGuidance.advice.map((advice) => <li key={advice}>{advice}</li>)}
                </ul>
                {selectedGuidance.warning && <p className="shelf-life-warning"><CircleAlert size={16} />{selectedGuidance.warning}</p>}
              </section>
            ) : itemName.trim().length >= 2 ? (
              <p className="no-shelf-life-match"><Lightbulb size={16} />规则库暂时没有匹配项，请手动填写日期。</p>
            ) : null}
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">04</div>
          <div className="section-content">
            <h2>贴上标签 <small>可以多选</small></h2>
            <fieldset className="shared-product-fields" disabled={Boolean(existing)}>
            <div className="tag-picker">
              {DEFAULT_TAGS.map((tag) => <button type="button" key={tag} className={tags.includes(tag) ? "selected" : ""} onClick={() => toggleTag(tag)}>{tag === "小宝" && <Cat size={15} />}{tag}{tags.includes(tag) && <Check size={14} />}</button>)}
              {tags.filter((tag) => !DEFAULT_TAGS.includes(tag)).map((tag) => <button type="button" key={tag} className="selected" onClick={() => toggleTag(tag)}>{tag}<X size={14} /></button>)}
            </div>
            <div className="custom-tag"><input value={customTag} onChange={(event) => setCustomTag(event.target.value)} placeholder="自定义标签" maxLength={20} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} /><button type="button" onClick={addCustomTag}>添加</button></div>
            </fieldset>
            {existing && <small className="muted">物品标签和补货提醒可在库存编辑中统一修改。</small>}
            <label>本批备注 <span className="optional">可选</span><textarea name="notes" rows={3} maxLength={500} placeholder="例如：本次购买的包装规格" /></label>
          </div>
        </section>
        {error && <p className="form-error"><CircleAlert size={16} /> {error}</p>}
        <div className="form-actions"><button className="primary-button save-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <PackagePlus size={18} />}保存新批次</button></div>
      </form>
    </div>
  );
}

function QuickExpiryOptions({ startDate, value, onChange }: { startDate: string; value: string; onChange: (date: string) => void }) {
  return (
    <div className="quick-expiry-options">
      <span>快速保质期</span>
      <div>
        {QUICK_EXPIRY_DAYS.map((days) => {
          const date = dateAfterDays(startDate, days);
          return (
            <button
              type="button"
              key={days}
              className={date && value === date ? "selected" : ""}
              disabled={!date}
              onClick={() => { if (date) onChange(date); }}
              aria-label={`设置为从起算日起 ${days} 天`}
            >
              {days} 天
              {date && value === date && <Check size={13} />}
            </button>
          );
        })}
      </div>
      <small>从上方的起算日期开始计算</small>
    </div>
  );
}

function AddToShoppingPanel({ client, household, item, onClose, onSaved }: { client: SupabaseClient; household: Household; item: InventoryItem; onClose: () => void; onSaved: (message: string) => void }) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [listId, setListId] = useState("");
  const [name, setName] = useState(item.name);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const preferenceKey = `home-stock:last-shopping-list:${household.id}`;
  useEffect(() => {
    let cancelled = false;
    void client.from("shopping_lists").select("*").eq("household_id", household.id).order("sort_order").order("created_at").then(({ data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (error) { setError("无法加载买菜单，请稍后再试。"); return; }
      const available = (data ?? []) as ShoppingList[];
      setLists(available);
      let remembered = "";
      try { remembered = localStorage.getItem(preferenceKey) ?? ""; } catch { /* Optional preference. */ }
      setListId(available.find((list) => list.id === remembered)?.id ?? available[0]?.id ?? "");
    });
    return () => { cancelled = true; };
  }, [client, household.id, preferenceKey]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !listId || !name.trim()) return;
    setSaving(true);
    setError("");
    const { data, error: queryError } = await client.from("shopping_list_items").select("name").eq("household_id", household.id).eq("shopping_list_id", listId).eq("checked", false);
    if (queryError) { setSaving(false); setError("无法检查买菜单，请重试。"); return; }
    const duplicate = data?.some((entry) => entry.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
    if (!duplicate) {
      const { error } = await client.from("shopping_list_items").insert({ household_id: household.id, shopping_list_id: listId, name: name.trim() });
      if (error) { setSaving(false); setError("添加失败，请重试。"); return; }
    }
    try { localStorage.setItem(preferenceKey, listId); } catch { /* Optional preference. */ }
    onSaved(duplicate ? "已在这个买菜单里" : `已加入 ${lists.find((list) => list.id === listId)?.name}`);
  }
  return <div className="modal-backdrop edit-inventory-backdrop"><form className="edit-inventory-panel" role="dialog" aria-modal="true" aria-label="加入买菜单" onSubmit={submit}>
    <header><h2>加入买菜单</h2><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
    <div className="edit-inventory-fields">
      <label>要购买的物品<input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>买菜单<select required value={listId} disabled={loading || !lists.length} onChange={(e) => setListId(e.target.value)}>{!lists.length && <option value="">{loading ? "正在加载…" : "暂无买菜单"}</option>}{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
      {!loading && !lists.length && !error && <p className="muted">请先到“买菜单”Tab 新增清单。</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
    <footer><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>取消</button><button className="primary-button" disabled={saving || loading || !listId}>{saving ? "正在添加…" : "加入买菜单"}</button></footer>
  </form></div>;
}

type CheckedPurchase = {
  item: ShoppingListItem;
  listComplete: boolean;
};

function ShoppingPage({ client, household, inventoryItems, shelfLifeRules, onInventorySaved, onToast }: { client: SupabaseClient; household: Household; inventoryItems: InventoryItem[]; shelfLifeRules: ShelfLifeRule[]; onInventorySaved: () => void; onToast: (message: string) => void }) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [listItems, setListItems] = useState<ShoppingListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pendingPurchase, setPendingPurchase] = useState<CheckedPurchase | null>(null);
  const [inventoryCandidate, setInventoryCandidate] = useState<CheckedPurchase | null>(null);
  const [pendingClearList, setPendingClearList] = useState<ShoppingList | null>(null);

  const loadShopping = useCallback(async () => {
    const [listsResult, itemsResult] = await Promise.all([
      client.from("shopping_lists").select("*").eq("household_id", household.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      client.from("shopping_list_items").select("*").eq("household_id", household.id).order("created_at", { ascending: true })
    ]);
    setLoading(false);
    const queryError = listsResult.error ?? itemsResult.error;
    if (queryError) {
      setLoadError(queryError.message);
      return;
    }
    const nextLists = (listsResult.data ?? []) as ShoppingList[];
    setLoadError("");
    setLists(nextLists);
    setListItems((itemsResult.data ?? []) as ShoppingListItem[]);
    setSelectedListId((current) => nextLists.some((list) => list.id === current) ? current : nextLists[0]?.id ?? "");
  }, [client, household.id]);

  useEffect(() => {
    void loadShopping();
    const channel = client
      .channel(`shopping-${household.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_lists", filter: `household_id=eq.${household.id}` }, () => void loadShopping())
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_list_items", filter: `household_id=eq.${household.id}` }, () => void loadShopping())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, household.id, loadShopping]);

  const activeList = lists.find((list) => list.id === selectedListId) ?? null;
  const activeItems = listItems
    .filter((item) => item.shopping_list_id === selectedListId)
    .sort((a, b) => Number(a.checked) - Number(b.checked) || a.created_at.localeCompare(b.created_at));
  const remainingCount = activeItems.filter((item) => !item.checked).length;

  async function addList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setSaving(true);
    const nextOrder = Math.max(0, ...lists.map((list) => Number(list.sort_order))) + 10;
    const { data, error } = await client.from("shopping_lists").insert({ household_id: household.id, name, sort_order: nextOrder }).select("*").single();
    setSaving(false);
    if (error) {
      onToast(error.code === "23505" ? "已经有同名买菜单" : "新增买菜单失败，请重试");
      return;
    }
    const created = data as ShoppingList;
    setLists((current) => [...current, created]);
    setSelectedListId(created.id);
    setNewListName("");
    setShowNewList(false);
  }

  async function deleteList() {
    if (!activeList || !window.confirm(`确认删除「${activeList.name}」买菜单和其中所有项目？`)) return;
    const { error } = await client.from("shopping_lists").delete().eq("id", activeList.id).eq("household_id", household.id);
    if (error) {
      onToast("删除买菜单失败，请重试");
      return;
    }
    setLists((current) => current.filter((list) => list.id !== activeList.id));
    setListItems((current) => current.filter((item) => item.shopping_list_id !== activeList.id));
    setSelectedListId(lists.find((list) => list.id !== activeList.id)?.id ?? "");
    onToast("买菜单已删除");
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newItemName.trim();
    if (!name || !activeList) return;
    setSaving(true);
    const { data, error } = await client.from("shopping_list_items").insert({ household_id: household.id, shopping_list_id: activeList.id, name }).select("*").single();
    setSaving(false);
    if (error) {
      onToast("添加购买项目失败，请重试");
      return;
    }
    setListItems((current) => [...current, data as ShoppingListItem]);
    setNewItemName("");
  }

  async function deleteItem(item: ShoppingListItem) {
    const { error } = await client.from("shopping_list_items").delete().eq("id", item.id).eq("household_id", household.id);
    if (error) {
      onToast("删除购买项目失败，请重试");
      return;
    }
    setListItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  async function toggleItem(item: ShoppingListItem) {
    const checked = !item.checked;
    const updatedItem = { ...item, checked };
    const nextItems = listItems.map((entry) => entry.id === item.id ? updatedItem : entry);
    setListItems(nextItems);
    const { error } = await client.from("shopping_list_items").update({ checked }).eq("id", item.id).eq("household_id", household.id);
    if (error) {
      onToast("更新购买项目失败，请重试");
      void loadShopping();
      return;
    }
    if (checked) {
      const siblings = nextItems.filter((entry) => entry.shopping_list_id === item.shopping_list_id);
      const listComplete = siblings.length > 0 && siblings.every((entry) => entry.checked);
      if (!item.stocked_at) setPendingPurchase({ item: updatedItem, listComplete });
      else if (listComplete) setPendingClearList(lists.find((list) => list.id === item.shopping_list_id) ?? null);
    }
  }

  function finishPurchasePrompt(recordInventory: boolean) {
    if (!pendingPurchase) return;
    const completed = pendingPurchase;
    setPendingPurchase(null);
    if (recordInventory) {
      setInventoryCandidate(completed);
      return;
    }
    if (completed.listComplete) setPendingClearList(lists.find((list) => list.id === completed.item.shopping_list_id) ?? null);
  }

  function finishInventoryRecord(saved: boolean) {
    if (!inventoryCandidate) return;
    const completed = inventoryCandidate;
    setInventoryCandidate(null);
    if (saved) {
      setListItems((current) => current.map((entry) => entry.id === completed.item.id ? { ...entry, stocked_at: new Date().toISOString() } : entry));
      void loadShopping();
      onInventorySaved();
    }
    if (completed.listComplete) setPendingClearList(lists.find((list) => list.id === completed.item.shopping_list_id) ?? null);
  }

  async function clearCompletedList() {
    if (!pendingClearList) return;
    const list = pendingClearList;
    setPendingClearList(null);
    const { error } = await client.from("shopping_list_items").delete().eq("shopping_list_id", list.id).eq("household_id", household.id).eq("checked", true);
    if (error) {
      onToast("清空买菜单失败，请重试");
      return;
    }
    setListItems((current) => current.filter((item) => item.shopping_list_id !== list.id || !item.checked));
    onToast(`已清空「${list.name}」`);
  }

  return (
    <div className="page shopping-page">
      <div className="page-heading shopping-heading"><div><span className="eyebrow">分店记录，买到就勾掉</span><h1>买菜单</h1></div><div className="summary-pill shopping-summary"><strong>{remainingCount}</strong><span>项待购买</span></div></div>

      {loadError ? (
        <div className="rules-migration-error"><CircleAlert size={19} /><span><strong>买菜单数据库还没有准备好</strong><small>请先在 Supabase SQL Editor 运行 migration：202609220001_shopping_lists_and_optional_low_stock.sql</small><small>{loadError}</small></span></div>
      ) : loading ? <ContentLoader /> : (
        <>
          <section className="shopping-toolbar">
            <label>选择买菜单
              <select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} disabled={lists.length === 0}>
                {lists.length === 0 ? <option value="">还没有买菜单</option> : lists.map((list) => {
                  const listEntries = listItems.filter((item) => item.shopping_list_id === list.id);
                  const pending = listEntries.filter((item) => !item.checked).length;
                  return <option key={list.id} value={list.id}>{list.name} · {pending} 项未买</option>;
                })}
              </select>
            </label>
            <button className="secondary-button" onClick={() => setShowNewList((current) => !current)}><Plus size={17} />新增买菜单</button>
          </section>

          {showNewList && <form className="new-shopping-list" onSubmit={addList}><input value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="例如：Trader Joe's" maxLength={40} autoFocus /><button className="primary-button" disabled={saving || !newListName.trim()}><Plus size={17} />创建</button><button type="button" className="icon-button" onClick={() => setShowNewList(false)} aria-label="取消新增"><X size={19} /></button></form>}

          {activeList ? (
            <section className="shopping-card">
              <header><div><span className="shopping-store-icon"><ShoppingBasket size={21} /></span><span><h2>{activeList.name}</h2><p>{activeItems.length === 0 ? "还没有要买的东西" : `${remainingCount} 项未买 · ${activeItems.length - remainingCount} 项已买`}</p></span></div><button className="icon-button shopping-list-delete" onClick={deleteList} aria-label={`删除 ${activeList.name} 买菜单`}><Trash2 size={17} /></button></header>
              <form className="shopping-item-form" onSubmit={addItem}><input value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder={`添加要从 ${activeList.name} 买的东西`} maxLength={120} /><button className="primary-button" disabled={saving || !newItemName.trim()}><Plus size={18} />添加</button></form>
              {activeItems.length === 0 ? <div className="shopping-empty"><ShoppingBasket size={30} /><strong>购物清单还是空的</strong><span>在上面输入要买的菜或日用品。</span></div> : <div className="shopping-checklist">{activeItems.map((item) => <div className={`shopping-item ${item.checked ? "checked" : ""}`} key={item.id}>
                <button className="shopping-check" onClick={() => void toggleItem(item)} aria-label={item.checked ? `将 ${item.name} 标记为未买` : `将 ${item.name} 标记为已买`}>{item.checked && <Check size={17} />}</button>
                <button className="shopping-item-name" onClick={() => void toggleItem(item)}>{item.name}</button>
                <button className="icon-button shopping-item-delete" onClick={() => void deleteItem(item)} aria-label={`删除 ${item.name}`}><Trash2 size={16} /></button>
                {item.checked && <div className="shopping-stock-action">{item.stocked_at ? <span><Check size={14} />已入库</span> : <button className="batch-open-button" onClick={() => setInventoryCandidate({ item, listComplete: remainingCount === 0 })}>记录库存</button>}</div>}
              </div>)}</div>}
              {activeItems.length > 0 && remainingCount === 0 && <div className="shopping-clear-action"><button className="text-button" onClick={() => setPendingClearList(activeList)}>清空已购买项目</button></div>}
            </section>
          ) : <div className="inventory-empty"><ShoppingBasket size={34} /><h2>先建立一个买菜单</h2><p>可以按商店分别记录需要购买的东西。</p></div>}
        </>
      )}

      {pendingPurchase && <DecisionDialog title={`要把「${pendingPurchase.item.name}」记录进库存吗？`} description="这项已经标记为买到；也可以稍后从清单上的“记录库存”按钮入库。" primaryLabel="记录库存" secondaryLabel="稍后入库" onPrimary={() => finishPurchasePrompt(true)} onSecondary={() => finishPurchasePrompt(false)} onClose={() => finishPurchasePrompt(false)} />}
      {inventoryCandidate && <PurchasedInventoryPanel key={inventoryCandidate.item.id} client={client} household={household} items={inventoryItems} shelfLifeRules={shelfLifeRules} itemName={inventoryCandidate.item.name} shoppingItemId={inventoryCandidate.item.id} onClose={() => finishInventoryRecord(false)} onSaved={() => finishInventoryRecord(true)} />}
      {pendingClearList && <DecisionDialog title={`清空「${pendingClearList.name}」已购买项目？`} description={`其中还有 ${listItems.filter((entry) => entry.shopping_list_id === pendingClearList.id && entry.checked && !entry.stocked_at).length} 项未记录库存。可以先保留，稍后入库；继续清空将移除这些购买项目，不影响已有库存。`} primaryLabel="清空买菜单" secondaryLabel="先保留" onPrimary={() => void clearCompletedList()} onSecondary={() => setPendingClearList(null)} onClose={() => setPendingClearList(null)} />}
    </div>
  );
}

function DecisionDialog({ title, description, primaryLabel, secondaryLabel, onPrimary, onSecondary, onClose }: { title: string; description: string; primaryLabel: string; secondaryLabel: string; onPrimary: () => void; onSecondary: () => void; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop decision-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="decision-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <span className="decision-icon"><Check size={25} /></span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div><button className="secondary-button" onClick={onSecondary}>{secondaryLabel}</button><button className="primary-button" onClick={onPrimary}>{primaryLabel}</button></div>
      </section>
    </div>
  );
}

function PurchasedInventoryPanel({ client, household, items, shelfLifeRules, itemName, shoppingItemId, onClose, onSaved }: { client: SupabaseClient; household: Household; items: InventoryItem[]; shelfLifeRules: ShelfLifeRule[]; itemName: string; shoppingItemId: string; onClose: () => void; onSaved: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop edit-inventory-backdrop purchased-inventory-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="purchased-inventory-panel" role="dialog" aria-modal="true" aria-label={`记录 ${itemName} 的库存`}>
        <header><div><span className="eyebrow">从买菜单加入库存</span><h2>记录「{itemName}」</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭入库窗口"><X size={20} /></button></header>
        <AddInventory client={client} household={household} items={items} shelfLifeRules={shelfLifeRules} initialName={itemName} shoppingItemId={shoppingItemId} embedded onSaved={onSaved} />
      </section>
    </div>
  );
}

type RuleEntry = {
  key: string;
  baseRuleId: string | null;
  overrideId: string | null;
  rule: ShelfLifeRule;
  storageZone: StorageZone;
  guidance: ShelfLifeGuidance;
  customized: boolean;
  custom: boolean;
};

type RuleDraft = {
  overrideId: string | null;
  baseRuleId: string | null;
  name: string;
  aliases: string;
  category: FoodCategory;
  conditions: FoodCondition[];
  riskLevel: FoodRiskLevel;
  storageZone: StorageZone;
  minDays: string;
  maxDays: string;
  startFrom: ShelfLifeStartPoint;
  qualityOnly: boolean;
  labelFirst: boolean;
  advice: string;
  warning: string;
};

const FOOD_CATEGORY_OPTIONS: Array<{ value: FoodCategory; label: string }> = [
  { value: "prepared", label: "熟食 / 预制菜" },
  { value: "meat", label: "肉类" },
  { value: "seafood", label: "海鲜" },
  { value: "eggs-dairy", label: "蛋奶 / 豆制品" },
  { value: "produce", label: "果蔬" },
  { value: "pantry", label: "常温干货" },
  { value: "pet-food", label: "小宝食物" }
];

const FOOD_CONDITION_OPTIONS: Array<{ value: FoodCondition; label: string }> = [
  { value: "unopened", label: "未开封" },
  { value: "opened", label: "已开封" },
  { value: "raw", label: "生鲜" },
  { value: "cooked", label: "熟食" },
  { value: "prepared", label: "已制作" },
  { value: "whole", label: "完整" },
  { value: "cut", label: "已切开" },
  { value: "ripe", label: "已成熟" },
  { value: "homemade", label: "自制" },
  { value: "thawed", label: "已解冻" }
];

function RulesManager({ client, household, overrides, loading, loadError, onChanged, onToast }: {
  client: SupabaseClient;
  household: Household;
  overrides: HouseholdShelfLifeRule[];
  loading: boolean;
  loadError: string;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<StorageZone | "all">("all");
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const entries = useMemo(() => buildRuleManagerEntries(overrides), [overrides]);
  const filteredEntries = entries.filter((entry) => {
    const zoneMatch = zone === "all" || entry.storageZone === zone;
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const queryMatch = !normalizedQuery || [entry.rule.name, ...entry.rule.aliases]
      .some((name) => name.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
    return zoneMatch && queryMatch;
  });

  function beginAddRule() {
    setFormError("");
    setDraft({
      overrideId: null,
      baseRuleId: null,
      name: "",
      aliases: "",
      category: "pantry",
      conditions: [],
      riskLevel: "medium",
      storageZone: "pantry",
      minDays: "7",
      maxDays: "7",
      startFrom: "purchased",
      qualityOnly: false,
      labelFirst: false,
      advice: "密封保存，并标注日期。",
      warning: ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginEditRule(entry: RuleEntry) {
    setFormError("");
    setDraft({
      overrideId: entry.overrideId,
      baseRuleId: entry.baseRuleId,
      name: entry.rule.name,
      aliases: entry.rule.aliases.join("，"),
      category: entry.rule.category,
      conditions: entry.rule.conditions,
      riskLevel: entry.rule.riskLevel,
      storageZone: entry.storageZone,
      minDays: entry.guidance.minDays === null ? "" : String(entry.guidance.minDays),
      maxDays: entry.guidance.maxDays === null ? "" : String(entry.guidance.maxDays),
      startFrom: entry.guidance.startFrom,
      qualityOnly: Boolean(entry.guidance.qualityOnly),
      labelFirst: Boolean(entry.guidance.labelFirst),
      advice: entry.guidance.advice.join("\n"),
      warning: entry.guidance.warning ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleDraftCondition(condition: FoodCondition) {
    if (!draft) return;
    setDraft({
      ...draft,
      conditions: draft.conditions.includes(condition)
        ? draft.conditions.filter((value) => value !== condition)
        : [...draft.conditions, condition]
    });
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    const minBlank = draft.minDays.trim() === "";
    const maxBlank = draft.maxDays.trim() === "";
    if (!draft.name.trim()) {
      setFormError("请填写食品名称。");
      return;
    }
    if (minBlank !== maxBlank) {
      setFormError("最短和最长天数需要同时填写，或者同时留空并按包装日期。");
      return;
    }
    const minDays = minBlank ? null : Number(draft.minDays);
    const maxDays = maxBlank ? null : Number(draft.maxDays);
    if (minDays !== null && (!Number.isInteger(minDays) || !Number.isInteger(maxDays) || minDays < 0 || maxDays! < minDays)) {
      setFormError("请输入有效的整数天数，且最长天数不能短于最短天数。");
      return;
    }

    const aliases = uniqueTrimmedLines(draft.aliases, /[，,\n]/);
    const advice = uniqueTrimmedLines(draft.advice, /\n/);
    const payload = {
      household_id: household.id,
      base_rule_id: draft.baseRuleId,
      name: draft.name.trim(),
      aliases,
      category: draft.category,
      conditions: draft.conditions,
      risk_level: draft.riskLevel,
      storage_zone: draft.storageZone,
      min_days: minDays,
      max_days: maxDays,
      start_from: minDays === null ? "package-date" : draft.startFrom,
      quality_only: draft.qualityOnly,
      label_first: minDays === null ? true : draft.labelFirst,
      advice,
      warning: draft.warning.trim() || null
    };

    setSaving(true);
    setFormError("");
    const matchingOverride = draft.baseRuleId
      ? overrides.find((rule) => rule.base_rule_id === draft.baseRuleId && rule.storage_zone === draft.storageZone)
      : null;
    const targetId = draft.overrideId ?? matchingOverride?.id;
    const result = targetId
      ? await client.from("household_shelf_life_rules").update(payload).eq("id", targetId).eq("household_id", household.id)
      : await client.from("household_shelf_life_rules").insert(payload);
    setSaving(false);

    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    await onChanged();
    setDraft(null);
    onToast(draft.baseRuleId ? "家庭规则已更新" : "自定义规则已保存");
  }

  async function removeRule(entry: RuleEntry) {
    if (!entry.overrideId) return;
    const action = entry.custom ? "删除这条家庭规则" : "恢复这条内置规则的默认值";
    if (!window.confirm(`确认${action}？`)) return;
    const { error } = await client
      .from("household_shelf_life_rules")
      .delete()
      .eq("id", entry.overrideId)
      .eq("household_id", household.id);
    if (error) {
      onToast("规则更新失败，请重试");
      return;
    }
    if (draft?.overrideId === entry.overrideId) setDraft(null);
    await onChanged();
    onToast(entry.custom ? "自定义规则已删除" : "已恢复内置默认值");
  }

  return (
    <div className="page rules-page">
      <div className="page-heading rules-heading">
        <div><span className="eyebrow">家庭自己的保存习惯</span><h1>保质期规则</h1></div>
        <button className="primary-button add-rule-button" onClick={beginAddRule}><Plus size={18} />新增规则</button>
      </div>

      {loadError && (
        <div className="rules-migration-error">
          <CircleAlert size={19} />
          <span><strong>规则数据库尚未准备好</strong><small>请在 Supabase SQL Editor 运行 `202609140002_household_shelf_life_rules.sql`。{loadError}</small></span>
        </div>
      )}

      {draft && (
        <form className="rule-editor" onSubmit={saveRule}>
          <header>
            <span><small>{draft.baseRuleId ? "修改后只影响当前家庭" : "添加当前家庭专用规则"}</small><h2>{draft.baseRuleId ? "编辑规则" : "新增规则"}</h2></span>
            <button type="button" className="icon-button" onClick={() => setDraft(null)} aria-label="关闭规则编辑"><X size={19} /></button>
          </header>

          <div className="rule-editor-grid two">
            <label>食品名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：自制猫饭" maxLength={80} required /></label>
            <label>别名 <span className="optional">用逗号分隔</span><input value={draft.aliases} onChange={(event) => setDraft({ ...draft, aliases: event.target.value })} placeholder="例如：猫咪鲜食，熟猫饭" /></label>
          </div>

          <div className="rule-editor-grid three">
            <label>类别<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as FoodCategory })}>{FOOD_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>储存区域<select value={draft.storageZone} disabled={Boolean(draft.baseRuleId)} onChange={(event) => setDraft({ ...draft, storageZone: event.target.value as StorageZone })}>{ZONES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
            <label>风险提示<select value={draft.riskLevel} onChange={(event) => setDraft({ ...draft, riskLevel: event.target.value as FoodRiskLevel })}><option value="low">品质参考</option><option value="medium">注意保存</option><option value="high">需注意安全</option></select></label>
          </div>

          <fieldset className="condition-editor">
            <legend>食品状态 <span>可多选，帮助名称相近时准确匹配</span></legend>
            <div>{FOOD_CONDITION_OPTIONS.map((option) => <button type="button" key={option.value} className={draft.conditions.includes(option.value) ? "selected" : ""} onClick={() => toggleDraftCondition(option.value)}>{option.label}{draft.conditions.includes(option.value) && <Check size={13} />}</button>)}</div>
          </fieldset>

          <div className="rule-editor-grid three duration-editor">
            <label>最短天数<input type="number" min="0" step="1" value={draft.minDays} onChange={(event) => setDraft({ ...draft, minDays: event.target.value })} placeholder="留空则按包装" /></label>
            <label>最长天数<input type="number" min="0" step="1" value={draft.maxDays} onChange={(event) => setDraft({ ...draft, maxDays: event.target.value })} placeholder="留空则按包装" /></label>
            <label>从哪天开始<select value={draft.startFrom} disabled={!draft.minDays && !draft.maxDays} onChange={(event) => setDraft({ ...draft, startFrom: event.target.value as ShelfLifeStartPoint })}>{Object.entries(SHELF_LIFE_START_LABELS).map(([value, label]) => <option key={value} value={value}>{label}日期</option>)}</select></label>
          </div>

          <div className="rule-flags">
            <label><input type="checkbox" checked={draft.labelFirst} onChange={(event) => setDraft({ ...draft, labelFirst: event.target.checked })} />包装日期优先</label>
            <label><input type="checkbox" checked={draft.qualityOnly} onChange={(event) => setDraft({ ...draft, qualityOnly: event.target.checked })} />只是最佳品质建议</label>
          </div>

          <label>保存建议 <span className="optional">每行一条</span><textarea rows={4} value={draft.advice} onChange={(event) => setDraft({ ...draft, advice: event.target.value })} placeholder="密封保存，并标注日期。" /></label>
          <label>安全提醒 <span className="optional">可选</span><textarea rows={2} maxLength={500} value={draft.warning} onChange={(event) => setDraft({ ...draft, warning: event.target.value })} /></label>
          {formError && <p className="form-error"><CircleAlert size={16} />{formError}</p>}
          <div className="rule-editor-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>取消</button><button className="primary-button" disabled={saving}>{saving && <LoaderCircle className="spin" size={17} />}保存家庭规则</button></div>
        </form>
      )}

      <div className="rules-toolbar">
        <div className="search-field"><Search size={18} /><input aria-label="搜索保质期规则" placeholder="搜索名称或别名" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="zone-tabs">
          <button className={zone === "all" ? "active" : ""} onClick={() => setZone("all")}>全部 <span>{entries.length}</span></button>
          {ZONES.map((option) => <button key={option.key} className={zone === option.key ? "active" : ""} onClick={() => setZone(option.key)}>{option.label} <span>{entries.filter((entry) => entry.storageZone === option.key).length}</span></button>)}
        </div>
      </div>

      {loading ? <ContentLoader /> : filteredEntries.length === 0 ? (
        <div className="inventory-empty"><BookOpenText size={34} /><h2>没有找到规则</h2><p>换个关键词，或者新增一条家庭规则。</p></div>
      ) : (
        <div className="rules-list">
          {filteredEntries.map((entry) => {
            const zoneInfo = ZONES.find((option) => option.key === entry.storageZone)!;
            const ZoneIcon = zoneInfo.icon;
            return (
              <article className="rule-card" key={entry.key}>
                <span className={`rule-zone ${zoneInfo.color}`}><ZoneIcon size={18} />{zoneInfo.label}</span>
                <div className="rule-card-main">
                  <div className="rule-title-line"><h2>{entry.rule.name}</h2>{entry.customized && <span>{entry.custom ? "家庭新增" : "家庭已修改"}</span>}</div>
                  <div className="rule-meta"><strong>{formatShelfLife(entry.guidance)}</strong><span>{shelfLifeStartLabel(entry.guidance.startFrom)}日期起算</span><span>{riskLevelLabel(entry.rule.riskLevel)}</span>{entry.guidance.labelFirst && <span>包装优先</span>}</div>
                  {entry.rule.aliases.length > 0 && <p className="rule-aliases">别名：{entry.rule.aliases.join("、")}</p>}
                  {entry.guidance.advice.length > 0 && <p className="rule-advice">{entry.guidance.advice.slice(0, 2).join(" ")}</p>}
                </div>
                <div className="rule-card-actions">
                  <button onClick={() => beginEditRule(entry)} aria-label={`编辑${entry.rule.name}`}><Pencil size={16} />编辑</button>
                  {entry.overrideId && <button className="rule-remove" onClick={() => void removeRule(entry)}>{entry.custom ? <Trash2 size={16} /> : <RotateCcw size={16} />}{entry.custom ? "删除" : "恢复默认"}</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="retention-note"><BookOpenText size={16} />家庭规则会覆盖内置建议；包装说明仍应优先，拿不准时不要品尝。</p>
    </div>
  );
}

function Inventory({ items, onChangeQuantity, onSetQuantity, onEdit, onOpen, onDelete }: { items: InventoryItem[]; onChangeQuantity: (item: InventoryItem, delta: number) => void; onSetQuantity: (item: InventoryItem, value: number) => void; onEdit: (item: InventoryItem) => void; onOpen: (item: InventoryItem) => void; onDelete: (item: InventoryItem) => void }) {
  const [zone, setZone] = useState<StorageZone | "all">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const allTags = Array.from(new Set(items.flatMap((item) => item.tags ?? []))).sort((a, b) => {
    const aIndex = DEFAULT_TAGS.indexOf(a);
    const bIndex = DEFAULT_TAGS.indexOf(b);
    return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.localeCompare(b, "zh-CN");
  });
  const filtered = sortBatches(items).filter((item) => {
    const zoneMatch = zone === "all" || item.storage_zone === zone;
    const queryMatch = !query || item.name.toLowerCase().includes(query.toLowerCase());
    const tagMatch = activeTags.length === 0 || activeTags.every((tag) => item.tags?.includes(tag));
    return zoneMatch && queryMatch && tagMatch;
  });

  function toggleFilter(tag: string) {
    setActiveTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  }

  return (
    <div className="page inventory-page">
      <div className="page-heading inventory-heading"><div><span className="eyebrow">由近到远看保质期</span><h1>全部库存</h1></div><div className="search-field"><Search size={18} /><input aria-label="搜索库存" placeholder="搜索名称" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      <div className="inventory-controls">
        <div className="zone-tabs">
          <button className={zone === "all" ? "active" : ""} onClick={() => setZone("all")}>全部 <span>{items.length}</span></button>
          {ZONES.map(({ key, label }) => <button key={key} className={zone === key ? "active" : ""} onClick={() => setZone(key)}>{label} <span>{items.filter((item) => item.storage_zone === key).length}</span></button>)}
        </div>
        {allTags.length > 0 && <div className="filter-tags"><span>筛选</span>{allTags.map((tag) => <button key={tag} className={activeTags.includes(tag) ? "active" : ""} onClick={() => toggleFilter(tag)}>{tag === "小宝" && <Cat size={14} />}{tag}</button>)}{activeTags.length > 0 && <button className="clear-filter" onClick={() => setActiveTags([])}>清除</button>}</div>}
      </div>

      {filtered.length === 0 ? (
        <div className="inventory-empty"><Boxes size={34} /><h2>这里还没有库存</h2><p>{items.length ? "换个储存区、标签或关键词试试。" : "从“添加”开始记录家里的东西。"}</p></div>
      ) : (
        <div className="inventory-list">
          {filtered.map((item) => <InventoryRow key={item.id} item={item} onChangeQuantity={onChangeQuantity} onSetQuantity={onSetQuantity} onEdit={onEdit} onOpen={onOpen} onDelete={onDelete} />)}
        </div>
      )}
      <p className="retention-note"><Archive size={16} /> 点击数量可以直接输入克数、毫升数或小数；归零后记录仍会保留。</p>
    </div>
  );
}

function InventoryRow({ item, onChangeQuantity, onSetQuantity, onEdit, onOpen, onDelete }: { item: InventoryItem; onChangeQuantity: (item: InventoryItem, delta: number) => void; onSetQuantity: (item: InventoryItem, value: number) => void; onEdit: (item: InventoryItem) => void; onOpen: (item: InventoryItem) => void; onDelete: (item: InventoryItem) => void }) {
  const zone = ZONES.find((entry) => entry.key === item.storage_zone)!;
  const Icon = zone.icon;
  const expiry = effectiveExpiry(item) ? daysUntil(effectiveExpiry(item)!) : null;
  return (
    <article className={`inventory-row ${Number(item.quantity) === 0 ? "out" : ""}`}>
      <div className={`row-zone ${zone.color}`}><Icon size={21} /><span>{zone.label}</span></div>
      <div className="row-info">
        <div className="row-name-line"><h2>{item.name}</h2>{Number(item.quantity) === 0 && <span className="status-chip out">已用完</span>}{expiry !== null && expiry < 0 && <span className="status-chip expired">已过期</span>}{expiry !== null && expiry >= 0 && expiry <= 7 && <span className="status-chip soon">{expiry === 0 ? "今天到期" : `${expiry} 天后到期`}</span>}</div>
        <div className="row-meta"><span>{item.opened_on ? "已开封" : "未开封"} · {effectiveExpiry(item) ? `${formatDate(effectiveExpiry(item)!)} 前用完` : "未设置日期"}</span></div>
        <details className="batch-details"><summary>{item.purchased_on ? `${formatDate(item.purchased_on)} 购买` : "购买日期未填写"} · 详情</summary>
          <div className="row-meta"><span>{item.low_stock_enabled === false ? "不提醒补货" : `总剩余 ≤ ${formatQuantity(item.low_stock_threshold)} ${item.unit} 提醒`}</span>{item.tags?.map((tag) => <span className="mini-tag" key={tag}>{tag}</span>)}</div>
          {item.notes && <p className="batch-notes">{item.notes}</p>}
          {item.opened_on && <div className="row-meta">{formatDate(item.opened_on)} 开封 · {item.opened_days} 天内用完{item.expires_on && ` · 包装日期 ${formatDate(item.expires_on)}`}</div>}
        </details>
      </div>
      <div className="batch-controls"><button className="batch-open-button" disabled={Number(item.quantity) <= 0 && !item.opened_on} onClick={() => item.opened_on ? onEdit(item) : onOpen(item)}>{item.opened_on ? "修改开封" : "开封"}</button><QuantityControl item={item} onChange={onChangeQuantity} onSet={onSetQuantity} large /></div>
      <div className="row-actions">
        <button className="edit-button" onClick={() => onEdit(item)} aria-label={`编辑 ${item.name}`}><Pencil size={17} /></button>
        <button className="delete-button" onClick={() => onDelete(item)} aria-label={`删除 ${item.name}`}><Trash2 size={17} /></button>
      </div>
    </article>
  );
}

function QuantityControl({ item, onChange, onSet, large = false }: { item: InventoryItem; onChange: (item: InventoryItem, delta: number) => void; onSet?: (item: InventoryItem, value: number) => void; large?: boolean }) {
  const [draft, setDraft] = useState(() => formatQuantity(item.quantity));

  useEffect(() => {
    setDraft(formatQuantity(item.quantity));
  }, [item.quantity]);

  function parsedDraft() {
    const parsed = Number(draft);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : Number(item.quantity);
  }

  function setAbsolute(value: number) {
    const next = Math.max(0, value);
    setDraft(formatQuantity(next));
    if (next !== Number(item.quantity)) onSet?.(item, next);
  }

  function commitDraft() {
    setAbsolute(parsedDraft());
  }

  return (
    <div className={`quantity-control ${large ? "large" : ""}`} aria-label={`${item.name}数量`}>
      <button onClick={() => large && onSet ? setAbsolute(parsedDraft() - 1) : onChange(item, -1)} disabled={parsedDraft() <= 0} aria-label="减少一个单位"><Minus size={16} /></button>
      {large && onSet ? (
        <div className="quantity-input-wrap">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(formatQuantity(item.quantity));
                event.currentTarget.blur();
              }
            }}
            aria-label={`直接设置 ${item.name} 的数量`}
          />
          <small>{item.unit}</small>
        </div>
      ) : (
        <span><strong>{formatQuantity(item.quantity)}</strong><small>{item.unit}</small></span>
      )}
      <button onClick={() => large && onSet ? setAbsolute(parsedDraft() + 1) : onChange(item, 1)} aria-label="增加一个单位"><Plus size={16} /></button>
    </div>
  );
}

function OpenBatchPanel({ client, item, shelfLifeRules, onClose, onSaved }: { client: SupabaseClient; item: InventoryItem; shelfLifeRules: ShelfLifeRule[]; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(Math.min(1, Number(item.quantity))));
  const [openedOn, setOpenedOn] = useState(todayDateValue());
  const matches = useMemo(() => searchOpeningRules(item.name, item.storage_zone, shelfLifeRules), [item.name, item.storage_zone, shelfLifeRules]);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const match = matches.find((entry) => entry.rule.id === selectedRuleId) ?? matches[0];
  const [manualDays, setDays] = useState<string | null>(null);
  const days = manualDays ?? openingSuggestedDays(match?.guidance ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const preview = days && Number(days) > 0 ? effectiveExpiry({ ...item, opened_on: openedOn, opened_days: Number(days) }) : null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const { error } = await client.rpc("open_inventory_batch", { batch_id: item.id, amount: Number(amount), opened_date: openedOn, use_within_days: Number(days) });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }
  return <div className="modal-backdrop edit-inventory-backdrop">
    <form className="edit-inventory-panel" role="dialog" aria-modal="true" aria-label={`开封 ${item.name}`} onSubmit={submit}>
      <header><h2>开封「{item.name}」</h2><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
      <div className="edit-inventory-fields">
        <p className="muted">部分开封会自动拆成两批，总库存数量不变。</p>
        <label>本次开封数量（{item.unit}，本批剩余 {formatQuantity(item.quantity)}）<input type="number" min="0.01" max={Number(item.quantity)} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>开封日期<span className="native-date-shell"><input type="date" required max={todayDateValue()} value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} /></span></label>
        {match ? <section className="shelf-life-suggestion">
          <strong>{match.rule.id.startsWith("household:") ? "家庭规则" : "内置规则"}：{match.rule.name}</strong>
          {matches.length > 1 && <label>选择匹配规则<select value={match.rule.id} onChange={(e) => { setSelectedRuleId(e.target.value); setDays(null); }}>{matches.map((entry) => <option key={entry.rule.id} value={entry.rule.id}>{entry.rule.name}</option>)}</select></label>}
          <span>{openingSuggestedDays(match.guidance) ? `建议 ${formatShelfLife(match.guidance!)}，默认按较短期限填写，可手动调整。` : "请按包装上的开封后说明填写天数。"}</span>
          <ul className="storage-advice">{match.guidance?.advice.map((advice) => <li key={advice}>{advice}</li>)}</ul>
          {match.guidance?.warning && <p className="shelf-life-warning">{match.guidance.warning}</p>}
        </section> : <p className="muted">暂时没有匹配的开封规则，请按包装说明填写。</p>}
        <label>开封后多少天内用完<input type="number" min="1" max="3650" step="1" required value={days} placeholder="按包装说明填写" onChange={(e) => setDays(e.target.value)} /></label>
        <div className="quick-expiry-options"><div>{[1, 3, 5, 7, 14, 30].map((value) => <button type="button" key={value} className={Number(days) === value ? "selected" : ""} onClick={() => setDays(String(value))}>{value} 天</button>)}</div><small>快捷天数仅用于输入，请以包装上的开封后说明为准。</small></div>
        {preview && <p className="selected-existing">提醒日期：{formatDate(preview)}（与包装日期取较早值）</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
      <footer><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "正在保存…" : "确认开封"}</button></footer>
    </form>
  </div>;
}

function EditInventoryPanel({ client, item, onClose, onSaved }: { client: SupabaseClient; item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item.name);
  const [zone, setZone] = useState<StorageZone>(item.storage_zone);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [lowStockEnabled, setLowStockEnabled] = useState(item.low_stock_enabled !== false);
  const [lowStockThreshold, setLowStockThreshold] = useState(String(item.low_stock_threshold));
  const [expiryStartDate, setExpiryStartDate] = useState(() => todayDateValue());
  const [expiresOn, setExpiresOn] = useState(item.expires_on ?? "");
  const [purchasedOn, setPurchasedOn] = useState(item.purchased_on ?? "");
  const [openedOn, setOpenedOn] = useState(item.opened_on ?? "");
  const [openedDays, setOpenedDays] = useState(String(item.opened_days ?? ""));
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tagOptions = Array.from(new Set([...DEFAULT_TAGS, ...tags]));

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  }

  function addCustomTag() {
    const next = customTag.trim();
    if (next && !tags.includes(next)) setTags((current) => [...current, next]);
    setCustomTag("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedThreshold = Number(lowStockThreshold);
    if (!name.trim()) {
      setError("请填写库存名称。");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0 || (lowStockEnabled && (!Number.isFinite(parsedThreshold) || parsedThreshold < 0))) {
      setError("数量和低库存提醒必须是大于或等于 0 的数字。");
      return;
    }

    setSaving(true);
    setError("");
    const { error: updateError } = await client
      .from("inventory_items")
      .update({
        name: name.trim(),
        storage_zone: zone,
        quantity: parsedQuantity,
        unit,
        low_stock_enabled: lowStockEnabled,
        low_stock_threshold: Number.isFinite(parsedThreshold) && parsedThreshold >= 0 ? parsedThreshold : 0,
        expires_on: expiresOn || null,
        purchased_on: purchasedOn || null,
        opened_on: openedOn || null,
        opened_days: openedOn ? Number(openedDays) : null,
        tags,
        notes: notes.trim() || null
      })
      .eq("id", item.id)
      .eq("household_id", item.household_id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="modal-backdrop edit-inventory-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form className="edit-inventory-panel" onSubmit={submit} role="dialog" aria-modal="true" aria-label={`编辑 ${item.name}`}>
        <header>
          <div><span className="eyebrow">修改现有记录</span><h2>编辑库存</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="关闭编辑"><X size={20} /></button>
        </header>

        <div className="edit-inventory-fields">
          <p className="muted">名称、单位、标签和补货提醒应用于同一物品的所有批次；数量、日期和备注只修改本批。更改单位不会自动换算数量。</p>
          <label>名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
          <div className="zone-picker">
            {ZONES.map(({ key, label, icon: Icon, color }) => (
              <button type="button" key={key} className={`${color} ${zone === key ? "selected" : ""}`} onClick={() => setZone(key)}><Icon size={20} /><span>{label}</span>{zone === key && <Check size={14} />}</button>
            ))}
          </div>

          <div className="form-grid two">
            <label>当前数量<input type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
            <label>单位<select value={unit} onChange={(event) => setUnit(event.target.value)}>{!UNIT_OPTIONS.includes(unit) && <option>{unit}</option>}{UNIT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          <div className="stock-reminder-setting">
            <label className="checkbox-setting"><input type="checkbox" checked={lowStockEnabled} onChange={(event) => setLowStockEnabled(event.target.checked)} /><span><strong>需要低库存提醒</strong><small>关闭后不会出现在看板的“该补货了”</small></span></label>
            {lowStockEnabled && <label>提醒阈值数量<input type="number" inputMode="decimal" min="0" step="any" value={lowStockThreshold} onChange={(event) => setLowStockThreshold(event.target.value)} required /></label>}
          </div>

          <div className="date-grid">
            <label>购买日期<span className="native-date-shell"><input type="date" max={todayDateValue()} value={purchasedOn} onChange={(event) => setPurchasedOn(event.target.value)} /></span></label>
            <label>快捷起算日期<span className="native-date-shell"><input type="date" value={expiryStartDate} onChange={(event) => setExpiryStartDate(event.target.value)} /></span></label>
            <label>保质期 / 最佳食用日期<span className="native-date-shell"><input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} /></span></label>
          </div>
          <QuickExpiryOptions startDate={expiryStartDate} value={expiresOn} onChange={setExpiresOn} />

          {item.opened_on && <section className="stock-reminder-setting">
            {openedOn ? <><label>开封日期<span className="native-date-shell"><input type="date" required max={todayDateValue()} value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} /></span></label><label>开封后用完天数<input type="number" min="1" max="3650" step="1" required value={openedDays} onChange={(e) => setOpenedDays(e.target.value)} /></label><button type="button" className="secondary-button" onClick={() => setOpenedOn("")}>撤销开封标记</button></> : <p>保存后撤销本批开封标记，已拆分的数量仍保留为独立批次。</p>}
          </section>}

          <div>
            <span className="field-label">标签 <small>可以多选</small></span>
            <div className="tag-picker edit-tag-picker">
              {tagOptions.map((tag) => <button type="button" key={tag} className={tags.includes(tag) ? "selected" : ""} onClick={() => toggleTag(tag)}>{tag === "小宝" && <Cat size={15} />}{tag}{tags.includes(tag) && <Check size={14} />}</button>)}
            </div>
          </div>
          <div className="custom-tag"><input value={customTag} onChange={(event) => setCustomTag(event.target.value)} placeholder="自定义标签" maxLength={20} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} /><button type="button" onClick={addCustomTag}>添加</button></div>
          <label>备注 <span className="optional">可选</span><textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>

        {error && <p className="form-error"><CircleAlert size={16} />{error}</p>}
        <footer><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>取消</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}保存修改</button></footer>
      </form>
    </div>
  );
}

function SettingsPanel({ household, email, onClose, onDisconnect, onToast }: { household: Household; email: string; onClose: () => void; onDisconnect: () => void; onToast: (message: string) => void }) {
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(household.invite_code);
      onToast("邀请码已复制");
    } catch {
      onToast(`邀请码：${household.invite_code}`);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="settings-panel" role="dialog" aria-modal="true" aria-label="家庭设置">
        <header><div><span className="eyebrow">家庭设置</span><h2>{household.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
        <section className="invite-box"><span><Users size={18} /> 邀请家人</span><p>让家人连接同一个 Supabase 项目，注册登录后输入：</p><button onClick={copyCode}><strong>{household.invite_code}</strong><Copy size={17} /></button></section>
        <section className="account-box"><span className="avatar">{email.slice(0, 1).toUpperCase()}</span><span><small>当前账号</small><strong>{email}</strong></span></section>
        <button className="disconnect-button" onClick={onDisconnect}><DoorOpen size={18} /><span><strong>退出并更换连接</strong><small>同时从这台设备清除 Supabase 配置</small></span></button>
      </aside>
    </div>
  );
}

function formatQuantity(value: number) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function expiryLabel(date: string) {
  const days = daysUntil(date);
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天到期";
  return `${days} 天后到期`;
}

function uniqueTrimmedLines(value: string, separator: RegExp) {
  return Array.from(new Set(value.split(separator).map((entry) => entry.trim()).filter(Boolean)));
}

function householdRuleGuidance(row: HouseholdShelfLifeRule): ShelfLifeGuidance {
  return {
    minDays: row.min_days,
    maxDays: row.max_days,
    startFrom: row.start_from,
    qualityOnly: row.quality_only,
    labelFirst: row.label_first,
    advice: row.advice,
    warning: row.warning ?? undefined
  };
}

function householdRowToShelfLifeRule(row: HouseholdShelfLifeRule): ShelfLifeRule {
  const baseRule = row.base_rule_id
    ? SHELF_LIFE_RULES.find((rule) => rule.id === row.base_rule_id)
    : undefined;
  const sourceIds: ShelfLifeRule["sourceIds"] = baseRule
    ? Array.from(new Set([...baseRule.sourceIds, "household-custom" as const]))
    : ["household-custom"];
  return {
    id: `household:${row.id}`,
    name: row.name,
    aliases: row.aliases,
    category: row.category,
    conditions: row.conditions,
    riskLevel: row.risk_level,
    storage: { [row.storage_zone]: householdRuleGuidance(row) },
    sourceIds
  };
}

function buildEffectiveShelfLifeRules(overrides: HouseholdShelfLifeRule[]): ShelfLifeRule[] {
  const overriddenKeys = new Set(
    overrides
      .filter((row) => row.base_rule_id)
      .map((row) => `${row.base_rule_id}:${row.storage_zone}`)
  );
  const builtInRules = SHELF_LIFE_RULES.flatMap((rule) => {
    const storage: ShelfLifeRule["storage"] = {};
    for (const zone of ZONES) {
      const guidance = rule.storage[zone.key];
      if (guidance && !overriddenKeys.has(`${rule.id}:${zone.key}`)) storage[zone.key] = guidance;
    }
    return Object.keys(storage).length > 0 ? [{ ...rule, storage }] : [];
  });
  return [...builtInRules, ...overrides.map(householdRowToShelfLifeRule)];
}

function buildRuleManagerEntries(overrides: HouseholdShelfLifeRule[]): RuleEntry[] {
  const overrideMap = new Map(
    overrides
      .filter((row) => row.base_rule_id)
      .map((row) => [`${row.base_rule_id}:${row.storage_zone}`, row])
  );
  const entries: RuleEntry[] = [];

  for (const rule of SHELF_LIFE_RULES) {
    for (const zone of ZONES) {
      const guidance = rule.storage[zone.key];
      if (!guidance) continue;
      const override = overrideMap.get(`${rule.id}:${zone.key}`);
      const displayedRule = override ? householdRowToShelfLifeRule(override) : rule;
      entries.push({
        key: override ? `override:${override.id}` : `builtin:${rule.id}:${zone.key}`,
        baseRuleId: rule.id,
        overrideId: override?.id ?? null,
        rule: displayedRule,
        storageZone: zone.key,
        guidance: override ? householdRuleGuidance(override) : guidance,
        customized: Boolean(override),
        custom: false
      });
    }
  }

  for (const row of overrides.filter((override) => !override.base_rule_id)) {
    const rule = householdRowToShelfLifeRule(row);
    entries.push({
      key: `custom:${row.id}`,
      baseRuleId: null,
      overrideId: row.id,
      rule,
      storageZone: row.storage_zone,
      guidance: householdRuleGuidance(row),
      customized: true,
      custom: true
    });
  }

  const zoneOrder = new Map(ZONES.map((entry, index) => [entry.key, index]));
  return entries.sort((a, b) =>
    a.rule.name.localeCompare(b.rule.name, "zh-CN")
    || (zoneOrder.get(a.storageZone) ?? 0) - (zoneOrder.get(b.storageZone) ?? 0)
  );
}

const SHELF_LIFE_START_LABELS: Record<ShelfLifeStartPoint, string> = {
  purchased: "购买",
  opened: "开封",
  prepared: "制作",
  cooked: "烹调",
  ripe: "成熟",
  thawed: "解冻",
  "package-date": "包装标注"
};

function shelfLifeStartLabel(startFrom: ShelfLifeStartPoint) {
  return SHELF_LIFE_START_LABELS[startFrom];
}

function riskLevelLabel(level: "low" | "medium" | "high") {
  if (level === "high") return "需注意安全";
  if (level === "medium") return "注意保存";
  return "品质参考";
}

function todayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfterDays(startDate: string, days: number) {
  if (!startDate) return null;
  const date = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default App;
