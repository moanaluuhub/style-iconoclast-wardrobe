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

export type OutfitSlot = "head" | "top" | "outerwear" | "bottom" | "shoes" | "accessory" | "bag" | "jewelry" | "other";

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

export const OUTFIT_SLOTS: { slot: OutfitSlot; label: string; icon: string; categories: Category[]; optional: boolean }[] = [
  { slot: "head", label: "Head", icon: "hat", categories: ["accessories", "other"], optional: false },
  { slot: "top", label: "Top", icon: "shirt", categories: ["tops", "outerwear", "dresses", "suits", "activewear"], optional: false },
  { slot: "bottom", label: "Bottom", icon: "scissors", categories: ["bottoms", "dresses", "suits", "activewear"], optional: false },
  { slot: "outerwear", label: "Outerwear", icon: "wind", categories: ["outerwear"], optional: true },
  { slot: "shoes", label: "Shoes", icon: "footprints", categories: ["shoes"], optional: false },
  { slot: "accessory", label: "Accessory", icon: "watch", categories: ["accessories"], optional: false },
  { slot: "bag", label: "Bag", icon: "briefcase", categories: ["bags", "accessories"], optional: true },
  { slot: "jewelry", label: "Jewelry", icon: "gem", categories: ["accessories", "other"], optional: true },
  { slot: "other", label: "Other", icon: "plus-circle", categories: ["accessories", "other", "activewear"], optional: true },
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
