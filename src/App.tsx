import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  Archive,
  Boxes,
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
  LoaderCircle,
  LogOut,
  Minus,
  PackagePlus,
  Plus,
  Refrigerator,
  Search,
  Settings,
  Snowflake,
  Trash2,
  Users,
  WifiOff,
  X
} from "lucide-react";
import {
  clearSupabaseConfig,
  loadSupabaseConfig,
  makeSupabaseClient,
  saveSupabaseConfig,
  validateSupabaseConfig
} from "./lib/supabase";
import type { Household, InventoryItem, StorageZone, SupabaseConfig } from "./types";

const DEFAULT_TAGS = [
  "小宝",
  "新鲜食物",
  "预制菜",
  "调味料",
  "饮料",
  "主食",
  "零食",
  "烘焙",
  "乳制品",
  "日用品"
];

const ZONES: Array<{ key: StorageZone; label: string; icon: typeof Archive; color: string }> = [
  { key: "pantry", label: "常温", icon: Archive, color: "amber" },
  { key: "chilled", label: "冷藏", icon: Refrigerator, color: "blue" },
  { key: "frozen", label: "冷冻", icon: Snowflake, color: "indigo" }
];

type Tab = "dashboard" | "add" | "inventory";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const loadItems = useCallback(async () => {
    const { data, error: queryError } = await client
      .from("inventory_items")
      .select("*")
      .eq("household_id", household.id)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    setLoading(false);
    if (queryError) setError(queryError.message);
    else setItems((data ?? []) as InventoryItem[]);
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
    { id: "inventory", label: "库存", icon: Boxes }
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
          <Dashboard items={items} onChangeQuantity={changeQuantity} onGoInventory={() => setTab("inventory")} />
        ) : tab === "add" ? (
          <AddInventory client={client} household={household} items={items} onSaved={() => { void loadItems(); setToast("已放进库存"); setTab("inventory"); }} />
        ) : (
          <Inventory items={items} onChangeQuantity={changeQuantity} onDelete={deleteItem} />
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
      {toast && <div className="toast" role="status"><Check size={17} /> {toast}</div>}
    </div>
  );
}

function ContentLoader() {
  return <div className="content-loader"><LoaderCircle className="spin" /><span>正在整理库存…</span></div>;
}

function Dashboard({ items, onChangeQuantity, onGoInventory }: { items: InventoryItem[]; onChangeQuantity: (item: InventoryItem, delta: number) => void; onGoInventory: () => void }) {
  const urgent = items.filter((item) => Number(item.quantity) > 0 && item.expires_on && daysUntil(item.expires_on) <= 7).slice(0, 5);
  const low = items.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold)).slice(0, 5);
  const stocked = items.filter((item) => Number(item.quantity) > 0).length;

  return (
    <div className="page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div><span className="eyebrow">今天先看这些</span><h1>家里还有什么？</h1></div>
        <div className="summary-pill"><strong>{stocked}</strong><span>种有库存</span></div>
      </div>

      <section className="zone-summary" aria-label="储存区域概览">
        {ZONES.map(({ key, label, icon: Icon, color }) => {
          const zoneItems = items.filter((item) => item.storage_zone === key && Number(item.quantity) > 0);
          return <button key={key} className={`zone-card ${color}`} onClick={onGoInventory}><span className="zone-icon"><Icon size={24} /></span><span><strong>{zoneItems.length}</strong><small>{label}</small></span><ChevronRight size={17} /></button>;
        })}
      </section>

      <div className="dashboard-grid">
        <DashboardList
          title="快到期了"
          subtitle="7 天内优先吃掉"
          icon={<CircleAlert size={20} />}
          tone="urgent"
          items={urgent}
          empty="最近没有要到期的东西"
          onChangeQuantity={onChangeQuantity}
        />
        <DashboardList
          title="该补货了"
          subtitle="用完或低于提醒数量"
          icon={<Archive size={20} />}
          tone="low"
          items={low}
          empty="库存都很充足"
          onChangeQuantity={onChangeQuantity}
        />
      </div>
    </div>
  );
}

function DashboardList({ title, subtitle, icon, tone, items, empty, onChangeQuantity }: { title: string; subtitle: string; icon: React.ReactNode; tone: string; items: InventoryItem[]; empty: string; onChangeQuantity: (item: InventoryItem, delta: number) => void }) {
  return (
    <section className={`dashboard-list ${tone}`}>
      <header><span className="list-title-icon">{icon}</span><span><h2>{title}</h2><p>{subtitle}</p></span><strong>{items.length}</strong></header>
      {items.length === 0 ? <div className="empty-state"><Check size={21} /><span>{empty}</span></div> : (
        <div className="compact-items">
          {items.map((item) => (
            <div className="compact-item" key={item.id}>
              <div className="item-main"><span className={`storage-dot ${item.storage_zone}`} /><span><strong>{item.name}</strong><small>{item.expires_on ? expiryLabel(item.expires_on) : Number(item.quantity) === 0 ? "已经用完" : `低于 ${formatQuantity(item.low_stock_threshold)} ${item.unit}`}</small></span></div>
              <QuantityControl item={item} onChange={onChangeQuantity} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddInventory({ client, household, items, onSaved }: { client: SupabaseClient; household: Household; items: InventoryItem[]; onSaved: () => void }) {
  const [existingId, setExistingId] = useState("");
  const [zone, setZone] = useState<StorageZone>("pantry");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);

  const existing = items.find((item) => item.id === existingId);

  useEffect(() => {
    if (!existing) return;
    setZone(existing.storage_zone);
    setTags(existing.tags ?? []);
  }, [existing]);

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
    const expiresOn = String(form.get("expires_on") || "") || null;
    setLoading(true);
    setError("");
    let saveError;
    if (existing) {
      const result = await client.from("inventory_items").update({
        quantity: Number(existing.quantity) + amount,
        storage_zone: zone,
        unit: String(form.get("unit")),
        low_stock_threshold: Number(form.get("low_stock_threshold")) || 0,
        expires_on: expiresOn ?? existing.expires_on,
        tags,
        notes: String(form.get("notes") || "") || null
      }).eq("id", existing.id);
      saveError = result.error;
    } else {
      const result = await client.from("inventory_items").insert({
        household_id: household.id,
        name: String(form.get("name")).trim(),
        storage_zone: zone,
        quantity: amount,
        unit: String(form.get("unit")),
        low_stock_threshold: Number(form.get("low_stock_threshold")) || 0,
        expires_on: expiresOn,
        tags,
        notes: String(form.get("notes") || "") || null
      });
      saveError = result.error;
    }
    setLoading(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setExistingId("");
    setTags([]);
    setZone("pantry");
    setFormKey((value) => value + 1);
    onSaved();
  }

  return (
    <div className="page add-page">
      <div className="page-heading"><div><span className="eyebrow">添进家里的清单</span><h1>添加库存</h1></div><p>常买的东西，直接选已有记录补数量。</p></div>
      <form className="inventory-form" onSubmit={submit} key={formKey}>
        <section className="form-section quick-existing">
          <div className="section-number">01</div>
          <div className="section-content">
            <h2>这是什么？</h2>
            <label>快速选择已有记录
              <select value={existingId} onChange={(event) => setExistingId(event.target.value)}>
                <option value="">＋ 新的库存记录</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name} · 现在 {formatQuantity(item.quantity)} {item.unit}</option>)}
              </select>
            </label>
            {!existing && <label>名称<input name="name" placeholder="例如：燕麦奶" maxLength={80} required /></label>}
            {existing && <div className="selected-existing"><Check size={17} /><span>将在「{existing.name}」现有的 {formatQuantity(existing.quantity)} {existing.unit} 上增加</span></div>}
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
            <div className="form-grid three">
              <label>{existing ? "增加数量" : "当前数量"}<input type="number" name="quantity" defaultValue="1" min="0" step="0.1" required /></label>
              <label>单位<select name="unit" defaultValue={existing?.unit ?? "件"}><option>件</option><option>包</option><option>盒</option><option>瓶</option><option>罐</option><option>袋</option><option>个</option><option>克</option><option>毫升</option></select></label>
              <label>低库存提醒<input type="number" name="low_stock_threshold" defaultValue={existing?.low_stock_threshold ?? 1} min="0" step="0.1" /></label>
            </div>
            <label>保质期 / 最佳食用日期<input type="date" name="expires_on" defaultValue={existing?.expires_on ?? ""} /></label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">04</div>
          <div className="section-content">
            <h2>贴上标签 <small>可以多选</small></h2>
            <div className="tag-picker">
              {DEFAULT_TAGS.map((tag) => <button type="button" key={tag} className={tags.includes(tag) ? "selected" : ""} onClick={() => toggleTag(tag)}>{tag === "小宝" && <Cat size={15} />}{tag}{tags.includes(tag) && <Check size={14} />}</button>)}
              {tags.filter((tag) => !DEFAULT_TAGS.includes(tag)).map((tag) => <button type="button" key={tag} className="selected" onClick={() => toggleTag(tag)}>{tag}<X size={14} /></button>)}
            </div>
            <div className="custom-tag"><input value={customTag} onChange={(event) => setCustomTag(event.target.value)} placeholder="自定义标签" maxLength={20} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} /><button type="button" onClick={addCustomTag}>添加</button></div>
            <label>备注 <span className="optional">可选</span><textarea name="notes" rows={3} placeholder="例如：开封后需要冷藏" defaultValue={existing?.notes ?? ""} /></label>
          </div>
        </section>
        {error && <p className="form-error"><CircleAlert size={16} /> {error}</p>}
        <div className="form-actions"><button className="primary-button save-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <PackagePlus size={18} />}{existing ? "增加库存" : "保存库存"}</button></div>
      </form>
    </div>
  );
}

function Inventory({ items, onChangeQuantity, onDelete }: { items: InventoryItem[]; onChangeQuantity: (item: InventoryItem, delta: number) => void; onDelete: (item: InventoryItem) => void }) {
  const [zone, setZone] = useState<StorageZone | "all">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const allTags = Array.from(new Set(items.flatMap((item) => item.tags ?? []))).sort((a, b) => {
    const aIndex = DEFAULT_TAGS.indexOf(a);
    const bIndex = DEFAULT_TAGS.indexOf(b);
    return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.localeCompare(b, "zh-CN");
  });
  const filtered = items.filter((item) => {
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
          {filtered.map((item) => <InventoryRow key={item.id} item={item} onChangeQuantity={onChangeQuantity} onDelete={onDelete} />)}
        </div>
      )}
      <p className="retention-note"><Archive size={16} /> 数量归零后记录仍会保留，只有手动删除才会消失。</p>
    </div>
  );
}

function InventoryRow({ item, onChangeQuantity, onDelete }: { item: InventoryItem; onChangeQuantity: (item: InventoryItem, delta: number) => void; onDelete: (item: InventoryItem) => void }) {
  const zone = ZONES.find((entry) => entry.key === item.storage_zone)!;
  const Icon = zone.icon;
  const expiry = item.expires_on ? daysUntil(item.expires_on) : null;
  return (
    <article className={`inventory-row ${Number(item.quantity) === 0 ? "out" : ""}`}>
      <div className={`row-zone ${zone.color}`}><Icon size={21} /><span>{zone.label}</span></div>
      <div className="row-info">
        <div className="row-name-line"><h2>{item.name}</h2>{Number(item.quantity) === 0 && <span className="status-chip out">已用完</span>}{expiry !== null && expiry < 0 && <span className="status-chip expired">已过期</span>}{expiry !== null && expiry >= 0 && expiry <= 7 && <span className="status-chip soon">{expiry === 0 ? "今天到期" : `${expiry} 天后到期`}</span>}</div>
        <div className="row-meta"><span>{item.expires_on ? formatDate(item.expires_on) : "未设置保质期"}</span>{item.tags?.map((tag) => <span className="mini-tag" key={tag}>{tag}</span>)}</div>
      </div>
      <QuantityControl item={item} onChange={onChangeQuantity} large />
      <button className="delete-button" onClick={() => onDelete(item)} aria-label={`删除 ${item.name}`}><Trash2 size={17} /></button>
    </article>
  );
}

function QuantityControl({ item, onChange, large = false }: { item: InventoryItem; onChange: (item: InventoryItem, delta: number) => void; large?: boolean }) {
  return (
    <div className={`quantity-control ${large ? "large" : ""}`} aria-label={`${item.name}数量`}>
      <button onClick={() => onChange(item, -1)} disabled={Number(item.quantity) <= 0} aria-label="减少一个"><Minus size={16} /></button>
      <span><strong>{formatQuantity(item.quantity)}</strong><small>{item.unit}</small></span>
      <button onClick={() => onChange(item, 1)} aria-label="增加一个"><Plus size={16} /></button>
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
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
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

export default App;
