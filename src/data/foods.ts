import type { Macros } from "../domain/nutrition";

export interface Food {
  id: string;
  name: string;
  /** Macros per 100 g (USDA-style reference values, rounded). */
  per100g: Macros;
  /** A typical serving in grams, with a label. */
  serving: { grams: number; label: string };
}

const f = (id: string, name: string, calories: number, protein: number, carbs: number, fat: number, grams: number, label: string): Food => ({
  id,
  name,
  per100g: { calories, protein, carbs, fat },
  serving: { grams, label },
});

/** Built-in foods so search works offline. Barcode and online search add the rest. */
export const FOODS: Food[] = [
  f("chicken-breast", "Chicken breast, cooked", 165, 31, 0, 3.6, 150, "1 fillet"),
  f("chicken-thigh", "Chicken thigh, cooked", 209, 26, 0, 10.9, 120, "1 thigh"),
  f("beef-lean", "Ground beef 90% lean, cooked", 217, 26, 0, 11.7, 120, "1 patty"),
  f("salmon", "Salmon, cooked", 206, 22, 0, 12.4, 150, "1 fillet"),
  f("tuna-can", "Tuna, canned in water", 116, 25.5, 0, 0.8, 120, "1 can"),
  f("egg", "Egg, whole", 143, 12.6, 0.7, 9.5, 50, "1 large egg"),
  f("egg-white", "Egg white", 52, 10.9, 0.7, 0.2, 33, "1 white"),
  f("whey", "Whey protein powder", 400, 80, 8, 6, 30, "1 scoop"),
  f("greek-yogurt", "Greek yogurt, plain nonfat", 59, 10.3, 3.6, 0.4, 170, "1 cup"),
  f("cottage-cheese", "Cottage cheese, low fat", 81, 10.5, 4.3, 2.3, 113, "½ cup"),
  f("milk", "Milk, 2%", 50, 3.3, 4.8, 2, 244, "1 cup"),
  f("cheddar", "Cheddar cheese", 403, 23, 3.1, 33, 28, "1 slice"),
  f("white-rice", "White rice, cooked", 130, 2.7, 28.2, 0.3, 158, "1 cup"),
  f("brown-rice", "Brown rice, cooked", 123, 2.7, 25.6, 1, 195, "1 cup"),
  f("quinoa", "Quinoa, cooked", 120, 4.4, 21.3, 1.9, 185, "1 cup"),
  f("oats", "Rolled oats, dry", 379, 13.2, 67.7, 6.5, 40, "½ cup"),
  f("pasta", "Pasta, cooked", 158, 5.8, 30.9, 0.9, 140, "1 cup"),
  f("bread-wholewheat", "Whole wheat bread", 252, 12.4, 42.7, 3.5, 32, "1 slice"),
  f("tortilla", "Flour tortilla", 304, 8.2, 49.4, 7.6, 45, "1 medium"),
  f("potato", "Potato, boiled", 87, 1.9, 20.1, 0.1, 170, "1 medium"),
  f("sweet-potato", "Sweet potato, baked", 90, 2, 20.7, 0.2, 150, "1 medium"),
  f("black-beans", "Black beans, cooked", 132, 8.9, 23.7, 0.5, 172, "1 cup"),
  f("lentils", "Lentils, cooked", 116, 9, 20.1, 0.4, 198, "1 cup"),
  f("banana", "Banana", 89, 1.1, 22.8, 0.3, 118, "1 medium"),
  f("apple", "Apple", 52, 0.3, 13.8, 0.2, 182, "1 medium"),
  f("orange", "Orange", 47, 0.9, 11.8, 0.1, 131, "1 medium"),
  f("blueberries", "Blueberries", 57, 0.7, 14.5, 0.3, 148, "1 cup"),
  f("broccoli", "Broccoli, cooked", 35, 2.4, 7.2, 0.4, 156, "1 cup"),
  f("spinach", "Spinach, raw", 23, 2.9, 3.6, 0.4, 30, "1 cup"),
  f("avocado", "Avocado", 160, 2, 8.5, 14.7, 75, "½ avocado"),
  f("olive-oil", "Olive oil", 884, 0, 0, 100, 14, "1 tbsp"),
  f("butter", "Butter", 717, 0.9, 0.1, 81, 14, "1 tbsp"),
  f("peanut-butter", "Peanut butter", 588, 25, 20, 50, 32, "2 tbsp"),
  f("almonds", "Almonds", 579, 21.2, 21.6, 49.9, 28, "1 handful"),
  f("dark-chocolate", "Dark chocolate 70%", 598, 7.8, 45.9, 42.6, 20, "2 squares"),
  f("honey", "Honey", 304, 0.3, 82.4, 0, 21, "1 tbsp"),
];

export function searchFoods(query: string, limit = 12): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOODS.slice(0, limit);
  return FOODS.filter((food) => food.name.toLowerCase().includes(q)).slice(0, limit);
}
