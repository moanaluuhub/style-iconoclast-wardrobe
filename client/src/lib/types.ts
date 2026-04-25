export type Category =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "shoes"
  | "accessories"
  | "bags"
  | "dresses"
  | "suits"
  | "activewear"
  | "other";

export type OutfitSlot = "head" | "top" | "bottom" | "shoes" | "accessory";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
  { value: "bags", label: "Bags" },
  { value: "dresses", label: "Dresses" },
  { value: "suits", label: "Suits" },
  { value: "activewear", label: "Activewear" },
  { value: "other", label: "Other" },
];

export const OUTFIT_SLOTS: { slot: OutfitSlot; label: string; categories: Category[] }[] = [
  { slot: "head", label: "Head", categories: ["accessories", "other"] },
  { slot: "top", label: "Top", categories: ["tops", "outerwear", "dresses", "suits"] },
  { slot: "bottom", label: "Bottom", categories: ["bottoms", "dresses", "suits"] },
  { slot: "shoes", label: "Shoes", categories: ["shoes"] },
  { slot: "accessory", label: "Accessory", categories: ["accessories", "bags"] },
];

export const SUGGESTED_TAGS = [
  "capsule",
  "workwear",
  "archive",
  "investment",
  "seasonal",
  "vintage",
  "designer",
  "casual",
  "formal",
  "travel",
  "resort",
  "evening",
];

export const COLORS = [
  "black", "white", "cream", "navy", "grey", "brown", "tan",
  "olive", "burgundy", "blue", "red", "pink", "green", "yellow",
  "orange", "purple", "camel", "ecru",
];
