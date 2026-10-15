import type { CalorieReference } from "./calorieReferences";

// Checked against USDA's official SR Legacy April 2018 JSON download, 2026-10-15.
// Generic meat names use the explicitly stated representative cut/fat content.
// https://fdc.nal.usda.gov/download-datasets/
type UsdaFood = [id: number, names: string[], kcal: number, state: string];
function usda(rows: UsdaFood[], preparation: "raw" | "cooked"): CalorieReference[] {
  return rows.map(([id, names, kcal, notes]) => ({ names, kcal, notes, preparation, amount: 100, unit: "克", source_url: `https://fdc.nal.usda.gov/food-details/${id}/nutrients` }));
}
const cfsSource = "https://www.cfs.gov.hk/sc_chi/nutrient/files/RA_FruitVeg_c.pdf";
export const FRESH_CALORIE_REFERENCES: CalorieReference[] = [
  ...usda([
    [169979,["白菜", "大白菜", "娃娃菜", "napa cabbage"],16,"生、可食部分"],
    [168451,["白萝卜", "白蘿蔔", "daikon"],18,"生、可食部分"],
    [172476,["豆腐", "普通豆腐", "tofu"],76,"烹饪前、普通石膏豆腐"],
    [169957,["豆芽", "绿豆芽", "mung bean sprouts"],30,"生、绿豆芽"],
    [175142,["海鲈鱼", "海鲈", "sea bass"],97,"生、去骨鱼肉"],
    [168580,["蚝菇", "蠔菇", "平菇", "oyster mushroom"],33,"生、鲜菇"],
    [170106,["红辣椒", "红尖椒", "red chili pepper"],40,"生、鲜红辣椒"],
    [171052,["鸡肉", "chicken"],119,"生、去皮去骨、混合部位参考"],
    [169231,["姜", "生姜", "ginger"],80,"生、可食部分"],
    [169404,["芥蓝", "芥兰", "芥蘭", "gai lan"],26,"生、可食部分"],
    [169382,["金针菇", "金針菇", "enoki"],37,"生重、去根鲜菇"],
    [167843,["猪梅花肉", "梅花肉", "梅花肉（整块）", "梅花肉(整块)", "pork shoulder"],236,"生、肩肉肥瘦相间参考"],
    [170826,["牛肋条", "牛肋條", "beef short ribs"],235,"生、去骨、肥瘦相间参考"],
    [174760,["牛肉", "beef"],138,"生、去除可见肥肉的瘦肉参考"],
    [174030,["牛肉馅", "牛绞肉", "ground beef"],176,"生、90% 瘦肉 / 10% 脂肪参考"],
    [170390,["上海青", "小白菜", "青江菜", "bok choy"],13,"生、可食部分"],
    [168414,["丝瓜", "絲瓜", "loofah"],20,"生、去皮"],
    [169256,["雪里蕻", "雪里红", "鲜雪菜", "mustard greens"],27,"生、鲜叶，非腌制"],
    [174223,["鱿鱼", "魷魚", "squid"],92,"生、去内脏可食部分"],
    [168249,["猪肉丝", "猪里脊", "pork tenderloin"],109,"生、瘦里脊参考"],
    [167902,["猪肉馅", "猪绞肉", "ground pork"],263,"生、普通肥瘦混合肉馅参考"],
    [167812,["猪五花", "五花肉", "猪五花肉", "pork belly"],518,"生、肥瘦相间五花肉"],
    [169210,["鲜竹笋", "竹笋", "bamboo shoots"],27,"生、去壳鲜笋"]
  ], "raw"),
  ...usda([
    [169980,["白菜", "大白菜", "娃娃菜", "napa cabbage"],14,"水煮、沥干、未加油"],
    [168452,["白萝卜", "白蘿蔔", "daikon"],17,"水煮、沥干、未加油"],
    [169137,["豆芽", "绿豆芽", "mung bean sprouts"],21,"绿豆芽、水煮、沥干"],
    [173694,["海鲈鱼", "海鲈", "sea bass"],124,"烤熟、去骨鱼肉"],
    [171451,["鸡肉", "chicken"],177,"炖熟、去皮去骨、混合部位参考"],
    [169392,["芥蓝", "芥兰", "芥蘭", "gai lan"],22,"煮熟、未加油"],
    [167844,["猪梅花肉", "梅花肉", "梅花肉（整块）", "梅花肉(整块)", "pork shoulder"],292,"烤熟、肩肉肥瘦相间参考"],
    [171222,["牛肋条", "牛肋條", "beef short ribs"],305,"炖熟、去骨、肥瘦相间参考"],
    [171794,["牛肉馅", "牛绞肉", "ground beef"],230,"炒熟肉碎、90% 瘦肉参考"],
    [170391,["上海青", "小白菜", "青江菜", "bok choy"],12,"水煮、沥干、未加油"],
    [169257,["雪里蕻", "雪里红", "鲜雪菜", "mustard greens"],26,"鲜叶水煮、沥干，非腌制"],
    [168250,["猪肉丝", "猪里脊", "pork tenderloin"],143,"烤熟、瘦里脊参考"],
    [167903,["猪肉馅", "猪绞肉", "ground pork"],297,"熟、普通肥瘦混合肉馅参考"],
    [169211,["鲜竹笋", "竹笋", "bamboo shoots"],12,"水煮、沥干、未加油"]
  ], "cooked"),
  { names: ["豆苗", "豌豆苗", "pea shoots"], preparation: "raw", kcal: 38, amount: 100, unit: "克", notes: "生、鲜嫩叶梢", source_url: cfsSource },
  { names: ["韭菜", "Chinese chives", "garlic chives"], preparation: "raw", kcal: 30, amount: 100, unit: "克", notes: "生、韭菜叶", source_url: cfsSource },
  { names: ["杏鲍菇", "杏鮑菇", "king oyster mushroom"], preparation: "raw", kcal: 41, amount: 100, unit: "克", notes: "生、鲜菇", source_url: "https://tools.vege.club/food-calories/king-oyster-mushroom/" }
];
