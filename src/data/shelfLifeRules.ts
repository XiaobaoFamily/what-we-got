import type { StorageZone } from "../types";

export type FoodCategory =
  | "prepared"
  | "meat"
  | "seafood"
  | "eggs-dairy"
  | "produce"
  | "pantry"
  | "pet-food";

export type FoodCondition =
  | "unopened"
  | "opened"
  | "raw"
  | "cooked"
  | "prepared"
  | "whole"
  | "cut"
  | "ripe"
  | "homemade"
  | "thawed";

export type ShelfLifeStartPoint =
  | "purchased"
  | "opened"
  | "prepared"
  | "cooked"
  | "ripe"
  | "thawed"
  | "package-date";

export type FoodRiskLevel = "low" | "medium" | "high";

export interface ShelfLifeGuidance {
  /** null means that the package or manufacturer instructions must supply the date. */
  minDays: number | null;
  maxDays: number | null;
  startFrom: ShelfLifeStartPoint;
  /** Frozen durations are generally quality recommendations, not safety limits. */
  qualityOnly?: boolean;
  /** Prefer the printed date/instructions whenever they are available. */
  labelFirst?: boolean;
  advice: string[];
  warning?: string;
}

export interface ShelfLifeRule {
  id: string;
  name: string;
  aliases: string[];
  category: FoodCategory;
  conditions: FoodCondition[];
  riskLevel: FoodRiskLevel;
  storage: Partial<Record<StorageZone, ShelfLifeGuidance>>;
  sourceIds: ShelfLifeSourceId[];
}

export const SHELF_LIFE_SOURCES = {
  "foodsafety-cold-chart": {
    name: "FoodSafety.gov Cold Food Storage Chart",
    url: "https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts"
  },
  "usda-foodkeeper": {
    name: "USDA FSIS FoodKeeper Data",
    url: "https://catalog.data.gov/dataset/fsis-foodkeeper-data"
  },
  "usda-shelf-stable": {
    name: "USDA FSIS Shelf-Stable Food Safety",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/shelf-stable-food"
  },
  "fda-safe-storage": {
    name: "FDA Are You Storing Food Safely?",
    url: "https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely"
  },
  "fda-pet-food": {
    name: "FDA Proper Storage of Pet Food & Treats",
    url: "https://www.fda.gov/animal-veterinary/animal-health-literacy/proper-storage-pet-food-treats"
  },
  "fda-raw-pet-food": {
    name: "FDA Raw Pet Food Safety",
    url: "https://www.fda.gov/animal-veterinary/animal-health-literacy/get-facts-raw-pet-food-diets-can-be-dangerous-you-and-your-pet"
  }
} as const;

export type ShelfLifeSourceId = keyof typeof SHELF_LIFE_SOURCES;

const COVER_AND_CHILL = "放入带盖容器或密封袋，并尽快冷藏。";
const SHALLOW_CONTAINER = "大份食物先分成小份，使用浅容器帮助快速降温。";
const RAW_BOTTOM_SHELF = "密封后放在冰箱底层，避免汁液滴到即食食物上。";
const AIRTIGHT_FREEZE = "按一次用量分装、排出空气并标注日期后冷冻。";
const THAW_SAFELY = "在冷藏室、冷水或微波炉中解冻，不要放在室温下解冻。";
const KEEP_DRY = "放在阴凉、干燥、避光处，开封后密封并使用干燥工具取用。";
const LABEL_FIRST = "包装上的保存方式和明确日期优先于本应用建议。";

/**
 * A conservative, offline starter library for common household foods.
 *
 * Refrigerator guidance assumes 4°C or below. Freezer guidance assumes
 * -18°C or below. Frozen durations describe best quality unless noted.
 */
export const SHELF_LIFE_RULES: ShelfLifeRule[] = [
  {
    id: "prepared-leftovers",
    name: "熟食剩菜",
    aliases: ["剩菜", "外卖剩菜", "熟肉", "熟鸡肉", "熟牛肉", "熟猪肉", "熟羊肉"],
    category: "prepared",
    conditions: ["cooked"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "cooked", advice: [SHALLOW_CONTAINER, COVER_AND_CHILL, "食用前彻底加热；反复加热过的食物不要继续久存。"], warning: "烹调或购买后在室温放置超过 2 小时（高温环境超过 1 小时）应丢弃。" },
      frozen: { minDays: 60, maxDays: 180, startFrom: "cooked", qualityOnly: true, advice: [SHALLOW_CONTAINER, AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "prepared-soup-stew",
    name: "汤和炖菜",
    aliases: ["汤", "炖菜", "火锅汤", "肉汤", "高汤", "咖喱"],
    category: "prepared",
    conditions: ["cooked"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "cooked", advice: [SHALLOW_CONTAINER, COVER_AND_CHILL, "再次食用时加热至中心滚烫。"] },
      frozen: { minDays: 60, maxDays: 90, startFrom: "cooked", qualityOnly: true, advice: ["冷却后按一餐份量分装，容器留少量膨胀空间。", AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "prepared-rice",
    name: "熟米饭",
    aliases: ["米饭", "剩饭", "炒饭", "杂粮饭", "粥"],
    category: "prepared",
    conditions: ["cooked"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "cooked", advice: ["煮好后尽快摊开或分成小份降温。", COVER_AND_CHILL, "再次食用时彻底加热。"], warning: "不要让熟米饭在室温长时间缓慢冷却。" },
      frozen: { minDays: 30, maxDays: 60, startFrom: "cooked", qualityOnly: true, advice: ["趁新鲜按一餐份量密封冷冻。", "食用时直接彻底加热，避免反复解冻。"] }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "prepared-pasta",
    name: "熟面食",
    aliases: ["熟面条", "意大利面", "炒面", "煮面", "熟饺子", "熟馄饨"],
    category: "prepared",
    conditions: ["cooked"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "cooked", advice: [SHALLOW_CONTAINER, COVER_AND_CHILL] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "cooked", qualityOnly: true, advice: [AIRTIGHT_FREEZE, "酱汁和面可以分开冷冻，以减少口感变化。"] }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "prepared-pizza",
    name: "披萨",
    aliases: ["pizza", "比萨"],
    category: "prepared",
    conditions: ["cooked"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "prepared", advice: [COVER_AND_CHILL, "不要连同外卖纸盒长期放入冰箱。"] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "prepared", qualityOnly: true, advice: ["每片单独包好后放入密封袋冷冻。"] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "prepared-mixed-salad",
    name: "蛋肉类沙拉",
    aliases: ["鸡蛋沙拉", "鸡肉沙拉", "金枪鱼沙拉", "火腿沙拉", "通心粉沙拉", "土豆沙拉"],
    category: "prepared",
    conditions: ["prepared"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "prepared", advice: [COVER_AND_CHILL, "使用干净餐具取用，不建议反复回温。"], warning: "此类沙拉通常不适合冷冻。" }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "meat-poultry-whole-raw",
    name: "整只生禽",
    aliases: ["整鸡", "整鸭", "整只火鸡", "整鹅"],
    category: "meat",
    conditions: ["raw", "whole"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 1, maxDays: 2, startFrom: "purchased", advice: [RAW_BOTTOM_SHELF, "若两天内不烹调，尽早冷冻。"] },
      frozen: { minDays: 365, maxDays: 365, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "meat-poultry-pieces-raw",
    name: "生禽肉块",
    aliases: ["鸡肉", "鸡胸肉", "鸡腿", "鸡翅", "鸭肉", "火鸡肉", "生鸡肉"],
    category: "meat",
    conditions: ["raw", "cut"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 1, maxDays: 2, startFrom: "purchased", advice: [RAW_BOTTOM_SHELF, "若两天内不烹调，尽早冷冻。"] },
      frozen: { minDays: 270, maxDays: 270, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "meat-ground-raw",
    name: "生绞肉",
    aliases: ["肉末", "肉馅", "牛肉馅", "猪肉馅", "鸡肉馅", "火鸡肉馅", "汉堡肉", "碎牛肉"],
    category: "meat",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 1, maxDays: 2, startFrom: "purchased", advice: [RAW_BOTTOM_SHELF, "绞肉表面积大，应优先烹调或冷冻。"] },
      frozen: { minDays: 90, maxDays: 120, startFrom: "purchased", qualityOnly: true, advice: ["压成薄片、按一次用量密封冷冻，解冻更均匀。", THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "meat-fresh-cuts-raw",
    name: "生鲜肉排或肉块",
    aliases: ["牛排", "猪排", "羊排", "牛肉块", "猪肉块", "羊肉块", "烤肉块", "牛腩", "里脊"],
    category: "meat",
    conditions: ["raw", "cut"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 5, startFrom: "purchased", advice: [RAW_BOTTOM_SHELF, "接近期限但暂时不用时，立即冷冻。"] },
      frozen: { minDays: 120, maxDays: 365, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "meat-bacon",
    name: "培根",
    aliases: ["烟肉", "bacon"],
    category: "meat",
    conditions: ["opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 7, maxDays: 7, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "开封后包紧或放入密封盒，避免汁液污染其他食物。"] },
      frozen: { minDays: 30, maxDays: 30, startFrom: "opened", qualityOnly: true, advice: ["按每次使用量分装并密封冷冻。"] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "meat-sausage-raw",
    name: "生香肠",
    aliases: ["生腊肠", "生肉肠", "生肉香肠"],
    category: "meat",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 1, maxDays: 2, startFrom: "purchased", labelFirst: true, advice: [LABEL_FIRST, RAW_BOTTOM_SHELF] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "meat-sausage-cooked",
    name: "熟香肠",
    aliases: ["熟肉肠", "即食香肠"],
    category: "meat",
    conditions: ["cooked", "opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 7, maxDays: 7, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, COVER_AND_CHILL] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "opened", qualityOnly: true, advice: [AIRTIGHT_FREEZE] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "meat-hotdog-opened",
    name: "开封热狗肠",
    aliases: ["开封热狗", "开封火腿肠", "开封法兰克福肠"],
    category: "meat",
    conditions: ["cooked", "opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 7, maxDays: 7, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, COVER_AND_CHILL] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "opened", qualityOnly: true, advice: [AIRTIGHT_FREEZE] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "meat-hotdog-unopened",
    name: "未开封热狗肠",
    aliases: ["未开封热狗", "未开封火腿肠"],
    category: "meat",
    conditions: ["cooked", "unopened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 14, maxDays: 14, startFrom: "purchased", labelFirst: true, advice: [LABEL_FIRST, "保持原包装冷藏，包装破损或鼓包时丢弃。"] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "purchased", qualityOnly: true, advice: ["保持密封，长期冷冻时再加一层防冻包装。"] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "meat-deli-opened",
    name: "开封午餐肉和熟食肉片",
    aliases: ["开封午餐肉", "熟食肉片", "火腿片", "切片火腿", "deli meat"],
    category: "meat",
    conditions: ["cooked", "opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 5, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, COVER_AND_CHILL, "即食肉类应尽早吃完，不要仅凭气味判断安全。"] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "opened", qualityOnly: true, advice: ["分成小份并隔层包装，减少反复解冻。"] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "meat-deli-unopened",
    name: "未开封午餐肉和熟食肉",
    aliases: ["未开封午餐肉", "未开封火腿片", "未开封熟食肉"],
    category: "meat",
    conditions: ["cooked", "unopened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 14, maxDays: 14, startFrom: "purchased", labelFirst: true, advice: [LABEL_FIRST, "保持原包装冷藏；开封后改用开封规则。"] },
      frozen: { minDays: 30, maxDays: 60, startFrom: "purchased", qualityOnly: true, advice: ["保持密封冷冻并标注日期。"] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "seafood-fatty-fish-raw",
    name: "生鲜高脂鱼",
    aliases: ["三文鱼", "鲑鱼", "金枪鱼", "鲭鱼", "青花鱼", "鲶鱼"],
    category: "seafood",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 1, maxDays: 3, startFrom: "purchased", advice: ["保持在冰箱最冷处并密封，最好放在装有冰袋的容器内。", "若近期不烹调，购买后尽早冷冻。"] },
      frozen: { minDays: 60, maxDays: 90, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "seafood-lean-fish-raw",
    name: "生鲜低脂鱼",
    aliases: ["鳕鱼", "比目鱼", "黑线鳕", "大比目鱼", "龙利鱼", "鲷鱼"],
    category: "seafood",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 1, maxDays: 3, startFrom: "purchased", advice: ["保持在冰箱最冷处并密封。", "若近期不烹调，购买后尽早冷冻。"] },
      frozen: { minDays: 180, maxDays: 240, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "seafood-shrimp-raw",
    name: "生虾",
    aliases: ["虾", "大虾", "明虾", "小龙虾", "去壳虾"],
    category: "seafood",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 5, startFrom: "purchased", advice: ["放在冰箱最冷处的密封容器内，避免汁液外漏。"] },
      frozen: { minDays: 180, maxDays: 540, startFrom: "purchased", qualityOnly: true, advice: ["擦去多余水分后密封冷冻。", THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "seafood-shellfish-shucked",
    name: "去壳贝类",
    aliases: ["去壳蛤蜊", "去壳牡蛎", "生蚝肉", "扇贝肉", "淡菜肉", "青口肉"],
    category: "seafood",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 10, startFrom: "purchased", labelFirst: true, advice: [LABEL_FIRST, "用有盖容器放在冰箱最冷处；液体浑浊或有异味时丢弃。"] },
      frozen: { minDays: 90, maxDays: 120, startFrom: "purchased", qualityOnly: true, advice: [AIRTIGHT_FREEZE, THAW_SAFELY] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "eggs-shell-raw",
    name: "带壳鸡蛋",
    aliases: ["鸡蛋", "蛋", "鲜蛋", "生鸡蛋"],
    category: "eggs-dairy",
    conditions: ["raw", "whole"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 21, maxDays: 35, startFrom: "purchased", labelFirst: true, advice: [LABEL_FIRST, "保留在原纸盒中，放在冰箱内部而不是温度波动较大的门架。"], warning: "带壳鸡蛋不建议直接冷冻；壳破裂的蛋应丢弃。" }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-safe-storage"]
  },
  {
    id: "eggs-hard-boiled",
    name: "水煮蛋",
    aliases: ["熟鸡蛋", "白煮蛋", "卤蛋", "茶叶蛋"],
    category: "eggs-dairy",
    conditions: ["cooked"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 7, maxDays: 7, startFrom: "cooked", advice: [COVER_AND_CHILL, "连壳保存通常更不易干燥；不建议冷冻。"] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "eggs-raw-beaten",
    name: "去壳生蛋液",
    aliases: ["蛋液", "蛋白", "蛋黄", "打散鸡蛋"],
    category: "eggs-dairy",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 2, maxDays: 4, startFrom: "prepared", advice: ["立即放入干净密封容器冷藏。"] },
      frozen: { minDays: 365, maxDays: 365, startFrom: "prepared", qualityOnly: true, advice: ["蛋白和蛋黄混合后密封冷冻；蛋黄单独冷冻口感会明显改变。"] }
    },
    sourceIds: ["foodsafety-cold-chart"]
  },
  {
    id: "dairy-milk-opened",
    name: "开封巴氏奶",
    aliases: ["开封牛奶", "鲜奶", "巴氏奶", "开封羊奶"],
    category: "eggs-dairy",
    conditions: ["opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 5, maxDays: 7, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "放在冰箱内部而不是门架，并在每次取用后立即盖紧。"], warning: "曾在 4°C 以上放置超过 4 小时的奶应丢弃。" }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "dairy-yogurt-opened",
    name: "开封酸奶",
    aliases: ["酸奶", "希腊酸奶", "优格", "yogurt"],
    category: "eggs-dairy",
    conditions: ["opened"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 7, maxDays: 14, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "用干净勺子取用并立即盖好；发现霉点时整盒丢弃。"] }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "dairy-soft-cheese-opened",
    name: "开封软质奶酪",
    aliases: ["奶油奶酪", "茅屋奶酪", "菲达奶酪", "马苏里拉", "鲜奶酪", "软奶酪"],
    category: "eggs-dairy",
    conditions: ["opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 7, maxDays: 14, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "保持原包装或密封保存，使用干净餐具取用。"], warning: "软质奶酪出现霉点时应整份丢弃，不要只切除霉变部分。" }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "dairy-hard-cheese-opened",
    name: "开封硬质奶酪",
    aliases: ["切达奶酪", "帕玛森", "瑞士奶酪", "硬奶酪", "芝士块"],
    category: "eggs-dairy",
    conditions: ["opened"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 21, maxDays: 42, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "先用烘焙纸或奶酪纸包裹，再放入非完全密闭的保鲜袋中冷藏。"] },
      frozen: { minDays: 180, maxDays: 240, startFrom: "opened", qualityOnly: true, advice: ["切小块或刨丝后密封冷冻；解冻后更适合烹饪，质地可能变碎。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "plant-tofu-opened",
    name: "开封豆腐",
    aliases: ["豆腐", "嫩豆腐", "老豆腐", "内酯豆腐"],
    category: "eggs-dairy",
    conditions: ["opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 5, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "换入干净有盖容器并完全冷藏；如用清水浸泡，应每天换干净的水。"] },
      frozen: { minDays: 90, maxDays: 150, startFrom: "opened", qualityOnly: true, advice: ["沥干并分块密封冷冻；解冻后会形成孔洞，更适合炖煮。"] }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "produce-cut-fruit",
    name: "切开的水果",
    aliases: ["切水果", "水果拼盘", "切西瓜", "切哈密瓜", "切菠萝", "切苹果"],
    category: "produce",
    conditions: ["cut"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "prepared", advice: ["切开后立即放入干净密封容器冷藏。", "出水、发黏、发酵或有霉点时丢弃。"], warning: "切开的水果属于易腐食品，室温放置超过 2 小时应丢弃。" }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "produce-berries",
    name: "浆果",
    aliases: ["草莓", "蓝莓", "树莓", "覆盆子", "黑莓", "桑葚"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 3, maxDays: 7, startFrom: "purchased", advice: ["保持干燥、不要提前清洗；食用前再洗。", "及时挑出破损或发霉果实。"] },
      frozen: { minDays: 240, maxDays: 360, startFrom: "purchased", qualityOnly: true, advice: ["洗净并完全沥干，先平铺冻硬再装密封袋。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-leafy-greens",
    name: "叶菜",
    aliases: ["生菜", "菠菜", "油麦菜", "小白菜", "青菜", "羽衣甘蓝", "芝麻菜", "蔬菜沙拉"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 3, maxDays: 7, startFrom: "purchased", advice: ["保持干燥，用厨房纸吸收多余水分后放入保鲜盒或有孔袋。", "发黏、腐烂或大面积发黄时丢弃。"] }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "produce-broccoli",
    name: "西兰花和花椰菜",
    aliases: ["西兰花", "花椰菜", "菜花", "西蓝花"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 3, maxDays: 5, startFrom: "purchased", advice: ["不要提前清洗，放入有孔袋冷藏并保持干燥。"] },
      frozen: { minDays: 240, maxDays: 360, startFrom: "prepared", qualityOnly: true, advice: ["切小朵并焯水、冷却、沥干后密封冷冻。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-mushrooms",
    name: "鲜蘑菇",
    aliases: ["蘑菇", "香菇", "口蘑", "白蘑菇", "平菇", "杏鲍菇", "金针菇"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 3, maxDays: 7, startFrom: "purchased", advice: ["用纸袋或透气包装冷藏，不要在密闭塑料袋内积水。", "食用前再清洗；发黏或有异味时丢弃。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-fresh-herbs",
    name: "新鲜香草",
    aliases: ["香菜", "欧芹", "薄荷", "罗勒", "莳萝", "葱", "青葱"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 5, maxDays: 10, startFrom: "purchased", advice: ["去除坏叶，用微湿厨房纸包裹后放入保鲜袋或保鲜盒。", "罗勒怕冷，可插水并放在阴凉处短期保存。"] },
      frozen: { minDays: 120, maxDays: 180, startFrom: "prepared", qualityOnly: true, advice: ["洗净擦干后切碎冷冻，解冻后适合烹饪而非生食装饰。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-carrots",
    name: "胡萝卜",
    aliases: ["胡萝卜", "红萝卜"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 21, maxDays: 28, startFrom: "purchased", advice: ["去掉叶缨，保持干燥后装袋冷藏。", "切开后改用密封盒并尽快食用。"] },
      frozen: { minDays: 240, maxDays: 360, startFrom: "prepared", qualityOnly: true, advice: ["切块并焯水、冷却、沥干后密封冷冻。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-peppers",
    name: "甜椒和辣椒",
    aliases: ["彩椒", "甜椒", "青椒", "红椒", "辣椒"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 7, maxDays: 10, startFrom: "purchased", advice: ["保持完整和干燥，放入蔬果抽屉；切开后密封并尽快食用。"] },
      frozen: { minDays: 180, maxDays: 240, startFrom: "prepared", qualityOnly: true, advice: ["去籽切块后平铺冻硬，再转入密封袋。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-cucumber",
    name: "黄瓜",
    aliases: ["黄瓜", "青瓜"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 5, maxDays: 7, startFrom: "purchased", advice: ["擦干水分后放入蔬果抽屉，避免紧贴冰箱后壁冻伤。", "切开后包紧切面并尽快食用。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-tomato-ripe",
    name: "成熟番茄",
    aliases: ["番茄", "西红柿", "小番茄", "圣女果"],
    category: "produce",
    conditions: ["ripe", "whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 2, maxDays: 3, startFrom: "ripe", qualityOnly: true, advice: ["尚未切开的成熟番茄可短期放在阴凉处，避免阳光直射。"] },
      chilled: { minDays: 5, maxDays: 7, startFrom: "ripe", qualityOnly: true, advice: ["完全成熟后再冷藏；食用前回温有助于恢复风味。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-apples",
    name: "苹果",
    aliases: ["苹果", "青苹果", "红苹果"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 5, maxDays: 7, startFrom: "purchased", qualityOnly: true, advice: ["放在阴凉处并远离容易受乙烯影响的蔬菜。"] },
      chilled: { minDays: 28, maxDays: 42, startFrom: "purchased", qualityOnly: true, advice: ["装入有孔袋放在蔬果抽屉，及时取出碰伤或腐烂的苹果。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-citrus",
    name: "柑橘类",
    aliases: ["橙子", "橘子", "柑橘", "柠檬", "青柠", "葡萄柚", "柚子"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 5, maxDays: 7, startFrom: "purchased", qualityOnly: true, advice: ["短期放在阴凉通风处，避免堆得太密。"] },
      chilled: { minDays: 14, maxDays: 21, startFrom: "purchased", qualityOnly: true, advice: ["保持干燥后装入有孔袋冷藏，及时丢弃发霉果实。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-grapes",
    name: "葡萄",
    aliases: ["葡萄", "提子"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 7, maxDays: 14, startFrom: "purchased", advice: ["保持未清洗和干燥，使用透气包装；吃之前再洗。"] },
      frozen: { minDays: 240, maxDays: 360, startFrom: "prepared", qualityOnly: true, advice: ["洗净擦干、去梗后平铺冻硬，再装密封袋。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-avocado-ripe",
    name: "成熟牛油果",
    aliases: ["牛油果", "鳄梨"],
    category: "produce",
    conditions: ["ripe", "whole"],
    riskLevel: "low",
    storage: {
      chilled: { minDays: 3, maxDays: 5, startFrom: "ripe", qualityOnly: true, advice: ["成熟后立即冷藏以减慢软化。", "切开后压紧保鲜膜隔绝空气并尽快食用。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-bananas",
    name: "香蕉",
    aliases: ["香蕉", "芭蕉"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 2, maxDays: 5, startFrom: "purchased", qualityOnly: true, advice: ["放在阴凉通风处并与其他易熟水果分开；成熟后可冷藏，果皮会变黑但果肉仍可食用。"] },
      frozen: { minDays: 60, maxDays: 90, startFrom: "ripe", qualityOnly: true, advice: ["去皮切块后密封冷冻，适合奶昔和烘焙。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-potatoes",
    name: "土豆",
    aliases: ["土豆", "马铃薯", "洋芋"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 14, maxDays: 30, startFrom: "purchased", qualityOnly: true, advice: ["放在阴凉、黑暗、通风处，不要与洋葱放在一起。", "明显发绿、腐烂或大量发芽时丢弃。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-onions",
    name: "整颗洋葱",
    aliases: ["洋葱", "红洋葱", "白洋葱", "黄洋葱"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 30, maxDays: 60, startFrom: "purchased", qualityOnly: true, advice: ["放在阴凉、干燥、通风处，不要装入密闭塑料袋，也不要与土豆混放。"] },
      chilled: { minDays: 7, maxDays: 10, startFrom: "prepared", advice: ["切开的洋葱应密封冷藏并标注切开日期。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "produce-garlic",
    name: "整头大蒜",
    aliases: ["大蒜", "蒜头", "蒜"],
    category: "produce",
    conditions: ["whole"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 90, maxDays: 180, startFrom: "purchased", qualityOnly: true, advice: ["整头放在阴凉、干燥、通风处，避免密闭和潮湿。", "自制油浸蒜不可在室温存放。"] }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "pantry-bread",
    name: "面包",
    aliases: ["吐司", "餐包", "法棍", "贝果", "馒头"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 3, maxDays: 7, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, "密封后放在阴凉干燥处；出现霉点时整份丢弃。"] },
      frozen: { minDays: 60, maxDays: 90, startFrom: "opened", qualityOnly: true, advice: ["切片后分装密封冷冻，可按需直接复热。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-rice-dry",
    name: "干燥大米",
    aliases: ["大米", "白米", "糙米", "杂粮米", "生米"],
    category: "pantry",
    conditions: ["opened", "raw"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 365, maxDays: 730, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, KEEP_DRY, "糙米含油较多，开封后应更早使用；炎热环境可冷藏。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-pasta-dry",
    name: "干面和意面",
    aliases: ["挂面", "意面", "意大利面干", "干面条", "米粉干", "粉丝"],
    category: "pantry",
    conditions: ["opened", "raw"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 365, maxDays: 730, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, KEEP_DRY] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-flour",
    name: "面粉",
    aliases: ["中筋面粉", "高筋面粉", "低筋面粉", "全麦粉", "玉米粉"],
    category: "pantry",
    conditions: ["opened", "raw"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 180, maxDays: 365, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, KEEP_DRY, "全麦粉更容易氧化，炎热环境建议密封冷藏或冷冻。"], warning: "生面粉不是即食食品，制作过程中不要品尝生面团。" }
    },
    sourceIds: ["usda-foodkeeper", "fda-safe-storage"]
  },
  {
    id: "pantry-oats",
    name: "燕麦",
    aliases: ["燕麦片", "快熟燕麦", "钢切燕麦", "麦片"],
    category: "pantry",
    conditions: ["opened", "raw"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 180, maxDays: 365, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, KEEP_DRY] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-beans-dry",
    name: "干豆",
    aliases: ["红豆", "绿豆", "黑豆", "鹰嘴豆", "芸豆", "干豆子"],
    category: "pantry",
    conditions: ["opened", "raw"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 365, maxDays: 730, startFrom: "opened", qualityOnly: true, advice: [KEEP_DRY, "存放越久越难煮软；发现虫害、霉味或受潮结块时丢弃。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-nuts",
    name: "坚果",
    aliases: ["花生", "核桃", "杏仁", "腰果", "开心果", "榛子", "松子"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 90, maxDays: 180, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, "密封、避光并远离热源；有油耗味时丢弃。"] },
      chilled: { minDays: 180, maxDays: 365, startFrom: "opened", qualityOnly: true, advice: ["使用密封容器防止吸收冰箱异味。"] },
      frozen: { minDays: 365, maxDays: 730, startFrom: "opened", qualityOnly: true, advice: ["分装密封冷冻，取用后立即封回。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-cooking-oil-opened",
    name: "开封食用油",
    aliases: ["食用油", "橄榄油", "菜籽油", "花生油", "芝麻油", "香油"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 90, maxDays: 180, startFrom: "opened", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, "盖紧后放在阴凉避光处，远离灶台热源。", "出现明显油耗味时丢弃。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-canned-low-acid-unopened",
    name: "未开封低酸罐头",
    aliases: ["肉罐头", "鱼罐头", "蔬菜罐头", "豆罐头", "汤罐头", "玉米罐头"],
    category: "pantry",
    conditions: ["unopened"],
    riskLevel: "medium",
    storage: {
      pantry: { minDays: 730, maxDays: 1825, startFrom: "purchased", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, "放在阴凉干燥处；罐体鼓包、渗漏、严重锈蚀或接缝处深凹时直接丢弃。"], warning: "可疑罐头不要打开品尝。" }
    },
    sourceIds: ["usda-shelf-stable", "fda-safe-storage"]
  },
  {
    id: "pantry-canned-low-acid-opened",
    name: "开封低酸罐头",
    aliases: ["开封肉罐头", "开封鱼罐头", "开封蔬菜罐头", "开封豆罐头", "开封汤罐头"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "opened", advice: ["开封后转移到干净的玻璃或食品级容器中，加盖冷藏。"] }
    },
    sourceIds: ["usda-shelf-stable"]
  },
  {
    id: "pantry-canned-high-acid-unopened",
    name: "未开封高酸罐头",
    aliases: ["番茄罐头", "水果罐头", "菠萝罐头", "橘子罐头", "泡菜罐头"],
    category: "pantry",
    conditions: ["unopened"],
    riskLevel: "medium",
    storage: {
      pantry: { minDays: 365, maxDays: 548, startFrom: "purchased", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, "放在阴凉干燥处；罐体鼓包、渗漏、严重锈蚀或接缝处深凹时直接丢弃。"] }
    },
    sourceIds: ["usda-shelf-stable", "fda-safe-storage"]
  },
  {
    id: "pantry-canned-high-acid-opened",
    name: "开封高酸罐头",
    aliases: ["开封番茄罐头", "开封水果罐头", "开封菠萝罐头", "开封泡菜罐头"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "medium",
    storage: {
      chilled: { minDays: 5, maxDays: 7, startFrom: "opened", advice: ["开封后转移到干净的玻璃或食品级容器中，加盖冷藏。"] }
    },
    sourceIds: ["usda-shelf-stable"]
  },
  {
    id: "pantry-spices-ground",
    name: "研磨香料",
    aliases: ["香料", "胡椒粉", "辣椒粉", "孜然粉", "五香粉", "咖喱粉", "肉桂粉"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 365, maxDays: 730, startFrom: "opened", qualityOnly: true, advice: [KEEP_DRY, "远离灶台蒸汽和阳光；香气明显变弱时更换。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pantry-coffee-opened",
    name: "开封咖啡",
    aliases: ["咖啡豆", "咖啡粉", "研磨咖啡"],
    category: "pantry",
    conditions: ["opened"],
    riskLevel: "low",
    storage: {
      pantry: { minDays: 14, maxDays: 28, startFrom: "opened", qualityOnly: true, advice: ["使用不透光密封容器，放在阴凉干燥处；不要频繁进出冰箱造成结露。"] }
    },
    sourceIds: ["usda-foodkeeper"]
  },
  {
    id: "pet-dry-food",
    name: "干猫粮",
    aliases: ["猫干粮", "干粮", "猫粮干粮", "猫饼干"],
    category: "pet-food",
    conditions: ["opened"],
    riskLevel: "medium",
    storage: {
      pantry: { minDays: null, maxDays: null, startFrom: "package-date", labelFirst: true, qualityOnly: true, advice: [LABEL_FIRST, "尽量保留在原包装内，再把整袋放入有盖容器；每次取用后挤出空气并封紧。", "存放在低于约 27°C 的阴凉干燥处，并记录批号以便召回核对。"] }
    },
    sourceIds: ["fda-pet-food"]
  },
  {
    id: "pet-wet-food-opened",
    name: "开封猫罐头和湿粮",
    aliases: ["猫罐头", "主食罐", "零食罐", "湿粮", "猫餐包", "猫条"],
    category: "pet-food",
    conditions: ["opened"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: null, maxDays: null, startFrom: "opened", labelFirst: true, advice: [LABEL_FIRST, "未吃完的罐装或袋装宠物食品应立即加盖冷藏，或直接丢弃。", "使用干净的专用勺子和食盆；食盆每次使用后清洗并彻底晾干。"], warning: "FDA 未给出适用于所有品牌的统一开封天数，因此不要用通用日期覆盖包装说明。" }
    },
    sourceIds: ["fda-pet-food"]
  },
  {
    id: "pet-raw-food",
    name: "生骨肉和生宠物食品",
    aliases: ["生骨肉", "生猫饭", "冷冻生肉猫粮", "raw pet food"],
    category: "pet-food",
    conditions: ["raw"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: null, maxDays: null, startFrom: "thawed", labelFirst: true, advice: [LABEL_FIRST, "只能在冷藏室或微波炉中解冻，并与人食、餐具和操作台严格分开。", "宠物没吃完的部分应立即盖好冷藏或丢弃。"], warning: "FDA 提醒生宠物食品更容易受到致病菌污染；本规则不自动生成食用期限。" },
      frozen: { minDays: null, maxDays: null, startFrom: "package-date", labelFirst: true, advice: [LABEL_FIRST, "保持原包装冷冻，使用独立容器防止渗漏；处理后清洁并消毒接触表面。"] }
    },
    sourceIds: ["fda-raw-pet-food", "fda-pet-food"]
  },
  {
    id: "pet-homemade-cooked-food",
    name: "熟制自制猫饭",
    aliases: ["自制猫饭", "熟猫饭", "猫咪鲜食", "宠物熟食"],
    category: "pet-food",
    conditions: ["cooked", "homemade"],
    riskLevel: "high",
    storage: {
      chilled: { minDays: 3, maxDays: 4, startFrom: "cooked", advice: [SHALLOW_CONTAINER, "按每餐份量密封冷藏，取用后不要把吃剩的部分倒回原容器。"], warning: "保存建议只涉及食品安全；长期自制配方应由兽医营养师确认营养完整性。" },
      frozen: { minDays: 30, maxDays: 60, startFrom: "cooked", qualityOnly: true, advice: [AIRTIGHT_FREEZE, "在冷藏室解冻并彻底回温；已解冻的份量不要反复冷冻。"] }
    },
    sourceIds: ["foodsafety-cold-chart", "fda-pet-food"]
  }
];

export const GENERAL_STORAGE_ADVICE = [
  "冷藏室保持在 4°C 或以下，冷冻室保持在 -18°C 或以下。",
  "易腐食品应在购买或烹调后 2 小时内冷藏；环境高于 32°C 时缩短为 1 小时。",
  "包装上的保存说明和明确的日期优先；婴儿配方食品必须遵守包装上的 use-by 日期。",
  "冷冻期限通常代表最佳品质而非安全上限，但食物必须持续保持在 -18°C 或以下。",
  "外观和气味正常不能证明食物安全；拿不准时不要品尝，直接丢弃。"
] as const;

const CONDITION_OPPOSITES: Partial<Record<FoodCondition, FoodCondition[]>> = {
  opened: ["unopened"],
  unopened: ["opened"],
  raw: ["cooked"],
  cooked: ["raw"],
  whole: ["cut"],
  cut: ["whole"]
};

export interface ShelfLifeSearchOptions {
  storageZone?: StorageZone;
  conditions?: FoodCondition[];
  limit?: number;
}

export interface ShelfLifeMatch {
  rule: ShelfLifeRule;
  guidance: ShelfLifeGuidance | null;
  score: number;
}

export function normalizeFoodName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\-_/.,，。()（）·]+/g, "");
}

function nameMatchScore(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (query === candidate) return 1000 + candidate.length;
  if (query.length >= 2 && query.includes(candidate)) return 700 + candidate.length;
  if (query.length >= 2 && candidate.includes(query)) return 500 + query.length;
  return 0;
}

/** Find likely rules using Chinese aliases, storage zone, and optional food state. */
export function searchShelfLifeRules(query: string, options: ShelfLifeSearchOptions = {}): ShelfLifeMatch[] {
  const normalizedQuery = normalizeFoodName(query);
  if (!normalizedQuery) return [];

  const requestedConditions = options.conditions ?? [];
  const matches: ShelfLifeMatch[] = [];

  for (const rule of SHELF_LIFE_RULES) {
    const guidance = options.storageZone ? rule.storage[options.storageZone] ?? null : null;
    if (options.storageZone && !guidance) continue;

    const hasConflict = requestedConditions.some((condition) =>
      CONDITION_OPPOSITES[condition]?.some((opposite) => rule.conditions.includes(opposite))
    );
    if (hasConflict) continue;

    const score = Math.max(
      ...[rule.name, ...rule.aliases].map((candidate) =>
        nameMatchScore(normalizedQuery, normalizeFoodName(candidate))
      )
    );
    if (score === 0) continue;

    const conditionScore = requestedConditions.filter((condition) => rule.conditions.includes(condition)).length * 40;
    const zoneScore = options.storageZone ? 25 : 0;
    matches.push({ rule, guidance, score: score + conditionScore + zoneScore });
  }

  return matches
    .sort((a, b) => b.score - a.score || a.rule.name.localeCompare(b.rule.name, "zh-CN"))
    .slice(0, options.limit ?? 8);
}

export function getShelfLifeGuidance(rule: ShelfLifeRule, storageZone: StorageZone): ShelfLifeGuidance | null {
  return rule.storage[storageZone] ?? null;
}

export function formatShelfLife(guidance: ShelfLifeGuidance): string {
  if (guidance.minDays === null || guidance.maxDays === null) return "请按包装说明设置";
  const { minDays, maxDays } = guidance;

  if (minDays === maxDays) {
    if (minDays >= 365 && minDays % 365 === 0) return `${minDays / 365} 年`;
    if (minDays >= 28 && minDays % 30 === 0) return `${minDays / 30} 个月`;
    if (minDays >= 14 && minDays % 7 === 0) return `${minDays / 7} 周`;
    return `${minDays} 天`;
  }

  if (minDays >= 14 && maxDays <= 42 && minDays % 7 === 0 && maxDays % 7 === 0) {
    return `${minDays / 7}–${maxDays / 7} 周`;
  }
  if (minDays >= 28) {
    const minMonths = Math.max(1, Math.round(minDays / 30.44));
    const maxMonths = Math.max(minMonths, Math.round(maxDays / 30.44));
    return `${minMonths}–${maxMonths} 个月`;
  }
  return `${minDays}–${maxDays} 天`;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns a local YYYY-MM-DD date, using the conservative (minimum) duration by default. */
export function calculateSuggestedExpiry(
  guidance: ShelfLifeGuidance,
  startDate: Date | string = new Date(),
  conservative = true
): string | null {
  if (guidance.minDays === null || guidance.maxDays === null) return null;
  const date = typeof startDate === "string" ? new Date(`${startDate}T12:00:00`) : new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + (conservative ? guidance.minDays : guidance.maxDays));
  return toLocalDateString(date);
}
