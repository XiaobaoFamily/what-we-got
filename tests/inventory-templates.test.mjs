// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite dist/index.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("depleted batches become bounded templates without losing dates or active stock", { skip: !process.env.PGLITE_MODULE && "Set PGLITE_MODULE to run the PostgreSQL integration test" }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE ?? "@electric-sql/pglite");
  const db = new PGlite();
  const user = "00000000-0000-0000-0000-000000000001";
  const household = "00000000-0000-0000-0000-000000000002";
  const migration = async (name) => {
    const sql = await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  };
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select '${user}'::uuid $$;
      -- Test-only stand-in for pgcrypto, used only by invite-code defaults.
      create function gen_random_bytes(n integer) returns bytea language sql as $$ select decode(repeat('ab', n), 'hex') $$;
      create publication supabase_realtime;
      insert into auth.users values ('${user}');
    `);
    for (const name of ["202609140001_initial_inventory", "202609220001_shopping_lists_and_optional_low_stock", "202609300001_inventory_batches", "202610020001_purchase_dates_and_stocking"]) await migration(name);
    await db.exec(`insert into households(id,name,created_by) values ('${household}','Test','${user}');
      insert into household_members(household_id,user_id,role) values ('${household}','${user}','owner');`);
    const add = async (name, zone, unit, qty, purchase, expiry, created = "2026-10-01") => {
      const { rows } = await db.query(`insert into inventory_items(household_id,name,storage_zone,unit,quantity,purchased_on,expires_on,created_at,updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id`, [household,name,zone,unit,qty,purchase,expiry,created]);
      return rows[0].id;
    };
    const query = async (sql) => (await db.query(sql)).rows;
    await add("牛奶", "chilled", "盒", 0, "2026-09-01", "2026-09-08", "2026-09-01");
    await add("牛奶", "chilled", "升", 0, null, null, "2026-09-02");
    await add("牛奶", "frozen", "盒", 0, "2026-09-01", "2026-10-01", "2026-09-03");
    const active = await add("鸡肉", "chilled", "克", 500, "2026-10-01", "2026-10-04");
    await migration("202610100001_inventory_templates");
    assert.equal((await query("select * from inventory_items")).length, 1);
    assert.equal((await query("select * from inventory_templates")).length, 2);
    let template = (await query("select * from inventory_templates where storage_zone='chilled'"))[0];
    assert.equal(template.snapshot.unit, "升");
    assert.equal(template.shelf_life_days, 7);

    // +/- RPC still returns zero although the row has been archived.
    const rpc = await db.query("select adjust_inventory_quantity($1,-500) as quantity", [active]);
    assert.equal(Number(rpc.rows[0].quantity), 0);
    assert.equal((await query("select * from inventory_items")).length, 0);
    assert.equal((await query("select * from inventory_templates")).length, 3);

    // Changed units reuse one template; newest consumption wins even for older batches.
    const laterConsumed = await add("牛奶", "chilled", "瓶", 1, "2026-09-01", "2026-09-11", "2026-08-01");
    await db.query("update inventory_items set quantity=0 where id=$1", [laterConsumed]);
    template = (await query("select * from inventory_templates where normalized_name='牛奶' and storage_zone='chilled'"))[0];
    assert.equal(template.snapshot.unit, "瓶");
    assert.equal(template.shelf_life_days, 10);
    const missingDates = await add(" 牛奶 ", "chilled", "件", 1, null, null);
    await db.query("update inventory_items set quantity=0 where id=$1", [missingDates]);
    template = (await query("select * from inventory_templates where normalized_name='牛奶' and storage_zone='chilled'"))[0];
    assert.equal(template.shelf_life_days, 10);
    assert.equal((await query("select * from inventory_templates")).length, 3);

    // A new batch can use the archived product; partial opening still preserves quantities.
    const restored = await db.query(`insert into inventory_items(household_id,product_id,name,storage_zone,unit,quantity)
      values ($1,$2,'牛奶','chilled','件',2) returning id`, [household, template.snapshot.product_id]);
    await db.query("select open_inventory_batch($1,1,'2026-10-10',3)", [restored.rows[0].id]);
    assert.equal(Number((await query("select sum(quantity) as total from inventory_items"))[0].total), 2);
    assert.equal((await query("select * from inventory_items")).length, 2);

    // Trigger failure must not destroy the source batch.
    await db.exec("alter table inventory_templates add constraint reject_templates check (false) not valid;");
    await assert.rejects(db.query("update inventory_items set quantity=0 where id=$1", [restored.rows[0].id]));
    assert.equal(Number((await query("select sum(quantity) as total from inventory_items"))[0].total), 2);
  } finally { await db.close(); }
});
