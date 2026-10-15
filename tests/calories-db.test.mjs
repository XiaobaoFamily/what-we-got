import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("calorie migration supports upserts, null/zero, independent states and household access", { skip: !process.env.PGLITE_MODULE && "Set PGLITE_MODULE for PostgreSQL tests" }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  const own = "00000000-0000-0000-0000-000000000001";
  const other = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated;
      create table households(id uuid primary key); insert into households values ('${own}'),('${other}');
      create function is_household_member(id uuid) returns boolean language sql as $$ select id='${own}'::uuid $$;
      create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
      create publication supabase_realtime;
      grant usage on schema public to authenticated;`);
    await db.exec(await readFile(new URL("../supabase/migrations/202610150001_calorie_entries.sql", import.meta.url), "utf8"));
    await db.exec("set role authenticated;");
    const upsert = async (name, state, kcal) => db.query(`insert into calorie_entries(household_id,name,preparation,kcal,amount,unit)
      values ($1,$2,$3,$4,100,'克') on conflict(household_id,normalized_name,preparation) do update set kcal=excluded.kcal returning *`, [own,name,state,kcal]);
    await upsert("鸡胸肉", "raw", 120);
    await upsert(" 鸡胸肉 ", "raw", null);
    await upsert("鸡胸肉", "cooked", 165);
    let rows = (await db.query("select * from calorie_entries order by preparation")).rows;
    assert.equal(rows.length, 2);
    assert.equal(rows.find((row) => row.preparation === "raw").kcal, null);
    await upsert("鸡胸肉", "raw", 0);
    rows = (await db.query("select * from calorie_entries where preparation='raw'")).rows;
    assert.equal(Number(rows[0].kcal), 0);
    await assert.rejects(upsert("不合法", "raw", -1));
    await assert.rejects(db.query("insert into calorie_entries(household_id,name,amount) values ($1,'食物',0)", [own]));
    await assert.rejects(db.query("insert into calorie_entries(household_id,name) values ($1,'其他家庭')", [other]));
    assert.equal((await db.query("select * from calorie_entries where household_id=$1", [other])).rows.length, 0);
  } finally { await db.close(); }
});
