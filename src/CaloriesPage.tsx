import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Pencil, Search, X } from "lucide-react";
import type { CalorieEntry, Household, InventoryItem } from "./types";
import { buildCalorieRows, filterCalorieRows, shortCalorieState, type CalorieRow } from "./lib/calories";
import { calorieNameKey } from "./data/calorieReferences";

export function CaloriesPage({ client, household, items, onToast }: {
  client: SupabaseClient; household: Household; items: InventoryItem[]; onToast: (message: string) => void;
}) {
  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlyBlank, setOnlyBlank] = useState(false);
  const [preparation, setPreparation] = useState<"raw" | "cooked">("raw");
  const [editing, setEditing] = useState<CalorieRow | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await client.from("calorie_entries").select("*").eq("household_id", household.id);
    setLoading(false);
    if (error) setError(error.message);
    else { setError(""); setEntries((data ?? []) as CalorieEntry[]); }
  }, [client, household.id]);
  useEffect(() => {
    void load();
    const channel = client.channel(`calories-${household.id}`).on("postgres_changes", {
      event: "*", schema: "public", table: "calorie_entries", filter: `household_id=eq.${household.id}`
    }, () => void load()).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, household.id, load]);
  const rows = buildCalorieRows(items, entries, preparation);
  const tags = [...new Set(["蔬菜", "肉类", "瓜果", "乳制品", ...rows.flatMap((row) => row.tags)])];
  const filtered = filterCalorieRows(rows, query, selectedTags, onlyBlank);
  const format = (n: number) => Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  return <div className="page calories-page">
    <div className="page-heading"><div><span className="eyebrow">常用食材，随时查阅</span><h1>热量表</h1></div><button className="primary-button" disabled={loading || Boolean(error)} onClick={() => setEditing({ preparation, tags: [], name: "", kcal: null, amount: 100, unit: "克", notes: "", source_url: "", origin: "blank" })}><Plus size={17} />新增食物</button></div>
    <div className="overview-tags" role="group" aria-label="生熟重量切换">{(["raw", "cooked"] as const).map((value) => <button key={value} aria-pressed={preparation === value} className={preparation === value ? "active" : ""} onClick={() => setPreparation(value)}>{value === "raw" ? "生重（默认）" : "熟重"}</button>)}</div>
    <div className="calorie-controls"><div className="search-field"><Search size={18} /><input aria-label="搜索热量表" placeholder="搜索食物名称" value={query} onChange={(e) => setQuery(e.target.value)} /></div><label><input type="checkbox" checked={onlyBlank} onChange={(e) => setOnlyBlank(e.target.checked)} />只看待填写（{rows.filter((row) => row.kcal === null).length}）</label></div>
    <div className="overview-tags" role="group" aria-label="热量表标签筛选">
      <button aria-pressed={selectedTags.length === 0} className={!selectedTags.length ? "active" : ""} onClick={() => setSelectedTags([])}>全部标签</button>
      {tags.map((tag) => <button key={tag} aria-pressed={selectedTags.includes(tag)} className={selectedTags.includes(tag) ? "active" : ""} onClick={() => setSelectedTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag])}>{tag}</button>)}
      {(query || selectedTags.length || onlyBlank) ? <button onClick={() => { setQuery(""); setSelectedTags([]); setOnlyBlank(false); }}>清除筛选</button> : null}
    </div>
    {selectedTags.length > 1 && <p className="muted">匹配任意一个所选标签，同时满足名称及待填写筛选。</p>}
    {error ? <div className="inline-error"><span>热量表加载失败。首次使用请执行 202610150001_calorie_entries.sql。{error}</span><button onClick={() => void load()}>重试</button></div> : loading ? <p role="status">正在加载热量表…</p> : <>
      <div className="calorie-list">{filtered.map((row) => <article className="calorie-row" key={calorieNameKey(row.name)}>
        <div className="calorie-description"><strong>{row.name}</strong><small>{row.kcal === null ? "待填写" : shortCalorieState(row.notes, row.preparation)}{row.tags.length > 0 ? ` · ${row.tags.join("、")}` : ""}</small></div>
        <div className="calorie-value"><strong>{row.kcal === null ? "—" : `${format(row.kcal)} 千卡`}</strong><small>每 {format(row.amount)} {row.unit}</small></div>
        <button className="icon-button" aria-label={`编辑${row.name}热量`} onClick={() => setEditing(row)}><Pencil size={17} /></button>
      </article>)}</div>
      {!filtered.length && <div className="inventory-empty"><h2>{rows.length ? "没有匹配的食物" : "还没有食物记录"}</h2><p>可从库存自动带入，也可以点击“新增食物”。</p></div>}
    </>}
    {editing && <CalorieEditor key={editing.name} row={editing} client={client} household={household} rows={rows} onClose={() => setEditing(null)} onSaved={(saved) => {
      setEntries((current) => [...current.filter((entry) => entry.preparation !== saved.preparation || calorieNameKey(entry.name) !== calorieNameKey(saved.name)), saved]);
      setEditing(null); onToast("热量表已保存");
    }} />}
  </div>;
}

function CalorieEditor({ row, client, household, rows, onClose, onSaved }: {
  row: CalorieRow; client: SupabaseClient; household: Household; rows: CalorieRow[];
  onClose: () => void; onSaved: (entry: CalorieEntry) => void;
}) {
  const [name, setName] = useState(row.name);
  const [kcal, setKcal] = useState(row.kcal === null ? "" : String(row.kcal));
  const [amount, setAmount] = useState(String(row.amount));
  const [unit, setUnit] = useState(row.unit);
  const [notes, setNotes] = useState(shortCalorieState(row.notes, row.preparation));
  const source = row.source_url;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const calories = kcal.trim() === "" ? null : Number(kcal);
    if (!name.trim() || !unit.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || (calories !== null && (!Number.isFinite(calories) || calories < 0))) { setError("请填写名称、有效份量和非负热量；未知热量可留空。"); return; }
    if (!row.name && rows.some((entry) => calorieNameKey(entry.name) === calorieNameKey(name))) { setError("已有同名食物，请在列表中编辑。"); return; }
    if (source.trim() && !/^https?:\/\//i.test(source.trim())) { setError("来源请填写 http 或 https 链接，也可以留空。"); return; }
    setSaving(true); setError("");
    const payload = { household_id: household.id, preparation: row.preparation, name: name.trim(), kcal: calories, amount: Number(amount), unit: unit.trim(), notes: notes.trim(), source_url: source.trim() };
    // An explicit null overrides the reference value, so clearing a value stays blank.
    const { data, error: saveError } = await client.from("calorie_entries").upsert(payload, { onConflict: "household_id,normalized_name,preparation" }).select("*").single();
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    onSaved(data as CalorieEntry);
  }
  return <div className="modal-backdrop edit-inventory-backdrop"><form className="edit-inventory-panel" role="dialog" aria-modal="true" aria-label="编辑热量" onSubmit={submit}>
    <header><h2>{row.name ? "编辑热量" : "新增食物"}</h2><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
    <div className="edit-inventory-fields">
      <p className="muted">正在填写：{row.preparation === "raw" ? "生重 / 烹饪前" : "熟重 / 烹饪后"}</p>
      <label>食物名称<input required maxLength={80} value={name} readOnly={Boolean(row.name)} onChange={(e) => setName(e.target.value)} placeholder="例如：鸡蛋、某品牌酸奶" /></label>
      <label>热量（千卡 / kcal，可留空）<input type="number" min="0" max="9999999999.99" step="0.01" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="未知则留空" /></label>
      <div className="form-grid two"><label>每多少<input type="number" required min="0.01" max="9999999999.99" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><label>计量单位<select value={unit} onChange={(e) => setUnit(e.target.value)}>{["克", "毫升", "个", "份", "片", "包", "盒", "瓶"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <label>食物状态<textarea maxLength={500} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：生、去皮去骨；或水煮、去壳" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "正在保存…" : "保存"}</button></footer>
  </form></div>;
}
