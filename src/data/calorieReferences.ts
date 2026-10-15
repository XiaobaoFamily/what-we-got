// Checked 2026-10-15. FDA values are rounded per listed edible serving.
// Per-100g values below are estimates derived from that serving, not lab precision.
export interface CalorieReference {
  preparation: "raw" | "cooked";
  names: string[];
  kcal: number;
  amount: number;
  unit: string;
  notes: string;
  source_url: string;
}
const vegetableSource = "https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/nutrition-information-raw-vegetables";
const fruitSource = "https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/raw-fruits-poster-text-version-accessible-version";
const seafoodSource = "https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/nutrition-information-cooked-seafood-purchased-raw";
type Serving = [names: string[], calories: number, grams: number];
function fromServings(rows: Serving[], source_url: string, state: string, preparation: "raw" | "cooked" = "raw"): CalorieReference[] {
  return rows.map(([names, calories, grams]) => ({ preparation, names, kcal: Math.round(calories / grams * 100), amount: 100, unit: "克", source_url,
    notes: `${state}，可食部分；FDA ${grams} 克约 ${calories} 千卡，换算每 100 克参考值。` }));
}
export const CALORIE_REFERENCES: CalorieReference[] = [
  { names: ["鸡胸肉", "去皮鸡胸肉", "chicken breast"], preparation: "raw", kcal: 120, amount: 100, unit: "克", notes: "生、去皮去骨鸡胸肉；USDA FDC 171077，每 100 克可食部分。", source_url: "https://fdc.nal.usda.gov/food-details/171077/nutrients" },
  { names: ["鸡胸肉", "去皮鸡胸肉", "chicken breast", "烤鸡胸肉"], preparation: "cooked", kcal: 165, amount: 100, unit: "克", notes: "烤熟、去皮去骨鸡胸肉；USDA FDC 171477。其他做法请按实际调整。", source_url: "https://fdc.nal.usda.gov/food-details/171477/nutrients" },
  { names: ["鸡蛋", "egg", "eggs"], preparation: "raw", kcal: 143, amount: 100, unit: "克", notes: "生全蛋、去壳；USDA FDC 171287。大号蛋可食部分约 50 克，每个约 72 千卡。", source_url: "https://fdc.nal.usda.gov/food-details/171287/nutrients" },
  { names: ["鸡蛋", "egg", "eggs", "水煮蛋"], preparation: "cooked", kcal: 155, amount: 100, unit: "克", notes: "水煮全蛋、去壳；USDA FDC 173424。大号蛋约 50 克，每个约 78 千卡；不适用于煎蛋。", source_url: "https://fdc.nal.usda.gov/food-details/173424/nutrients" },
  { names: ["全脂牛奶", "whole milk"], preparation: "raw", kcal: 61, amount: 100, unit: "克", notes: "烹饪前的全脂牛奶（3.25% 乳脂、添加维生素 D），不是生乳。USDA FDC 171265。按克计，不能直接当成每 100 毫升。", source_url: "https://fdc.nal.usda.gov/food-details/171265/nutrients" },
  ...fromServings([
    [["芦笋", "asparagus"],20,93], [["甜椒", "彩椒", "bell pepper"],25,148],
    [["西兰花", "绿花椰菜", "broccoli"],45,148], [["胡萝卜", "红萝卜", "carrot"],30,78],
    [["花椰菜", "菜花", "cauliflower"],25,99], [["西芹", "celery"],15,110],
    [["黄瓜", "青瓜", "cucumber"],10,99], [["四季豆", "green beans"],20,83],
    [["圆白菜", "卷心菜", "包菜", "green cabbage"],25,84], [["小葱", "香葱", "green onion"],10,25],
    [["冰山生菜", "球生菜", "iceberg lettuce"],10,89], [["叶生菜", "leaf lettuce"],15,85],
    [["白蘑菇", "mushrooms"],20,84], [["洋葱", "onion"],45,148],
    [["土豆", "马铃薯", "potato"],110,148], [["樱桃萝卜", "radishes"],10,85],
    [["夏南瓜", "summer squash"],20,98], [["甜玉米", "sweet corn"],90,90],
    [["红薯", "地瓜", "sweet potato"],100,130], [["番茄", "西红柿", "tomato"],25,148]
  ], vegetableSource, "生鲜、未加调料"),
  ...fromServings([
    [["苹果", "apple"],130,242], [["牛油果", "鳄梨", "avocado"],50,30],
    [["香蕉", "banana"],110,126], [["坎塔卢普甜瓜", "cantaloupe"],50,134],
    [["西柚", "葡萄柚", "grapefruit"],60,154], [["葡萄", "grapes"],90,126],
    [["蜜露瓜", "honeydew melon"],50,134], [["猕猴桃", "奇异果", "kiwifruit"],90,148],
    [["柠檬", "lemon"],15,58], [["青柠", "lime"],20,67], [["油桃", "nectarine"],60,140],
    [["橙子", "orange"],80,154], [["桃子", "peach"],60,147], [["梨", "pear"],100,166],
    [["菠萝", "凤梨", "pineapple"],50,112], [["李子", "plums"],70,151],
    [["草莓", "strawberries"],50,147], [["甜樱桃", "车厘子", "sweet cherries"],100,140],
    [["橘子", "柑橘", "tangerine"],50,109], [["西瓜", "watermelon"],80,280]
  ], fruitSource, "生鲜"),
  ...fromServings([
    [["鳕鱼", "熟鳕鱼", "cod", "cooked cod"],90,84], [["虾", "熟虾", "shrimp", "cooked shrimp"],100,84],
    [["罗非鱼", "熟罗非鱼", "tilapia", "cooked tilapia"],110,84], [["扇贝", "熟扇贝", "scallops", "cooked scallops"],140,84],
    [["龙虾", "熟龙虾", "lobster", "cooked lobster"],80,84]
  ], seafoodSource, "熟制、未添加油或其他配料", "cooked")
];

export const calorieNameKey = (name: string) => name.trim().toLocaleLowerCase();
export function findCalorieReference(name: string, preparation: "raw" | "cooked" = "raw"): CalorieReference | undefined {
  const key = calorieNameKey(name);
  // Exact aliases only: branded, seasoned and cooked variants must not inherit raw values.
  return CALORIE_REFERENCES.find((reference) => reference.preparation === preparation && reference.names.some((alias) => calorieNameKey(alias) === key));
}
