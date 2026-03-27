/**
 * Drops de Nightmare Terror — wiki:
 * https://wiki.pokexgames.com/index.php?title=Nightmare_Terror
 *
 * TMs Tank / OTDD (aba “TM D.P.S” na wiki):
 * https://wiki.pokexgames.com/index.php/Technical_Machine_(TM)
 *
 * Ícones em `public/nightmare-terror-items/` (assets estáticos alinhados à wiki).
 *
 * Giants: uma linha (mesmo preço NPC 1 KK). Shards: uma linha (150 K NPC cada).
 */
export const NIGHTMARE_TERROR_PRESET_KEY = "nightmare_terror";

/** Slug único p/ giant exclusivo + Ptera's Head (mesmo “slot” de boss). */
export const TERROR_GIANT_SLUG = "terror-giant-exclusive";

/** Slug único p/ qualquer shard de terror (cores variam por boss). */
export const TERROR_SHARD_SLUG = "terror-shard";

const TM_TANK_ICON_CYCLE = [
  "/items/tm-tank-random.gif",
] as const;

const TM_OTDD_ICON_CYCLE = [
  "/items/tm-otdd-random.gif",
] as const;

const GIANT_EXCLUSIVE_CYCLE = [
  "/items/giant-belt.png",
  "/items/giant-shell.png",
  "/items/giant-bulb.png",
  "/items/giant-fire-tail.png",
  "/items/giant-electric-remains.png",
  "/items/giant-red-gyarados-tail.png",
  "/items/giant-corrupted-hair.png",
  "/items/giant-creepy-remains.png",
  "/items/pteras-head.png",
] as const;

const SHARD_CYCLE = [
  "/items/kermes-shard.png",
  "/items/indigo-shard.png",
  "/items/shell-shard.png",
  "/items/azure-shard.png",
  "/items/damson-shard.png",
  "/items/sunflower-shard.png",
  "/items/scarlet-shard.png",
  "/items/harlequin-shard.png",
  "/items/cerise-shard.png",
] as const;

const LEGACY_GIANT_SLUGS = new Set<string>([
  "giant-belt",
  "giant-shell",
  "giant-bulb",
  "giant-fire-tail",
  "giant-electric-remains",
  "giant-red-gyarados-tail",
  "giant-corrupted-hair",
  "giant-creepy-remains",
  "pteras-head",
]);

const LEGACY_SHARD_SLUGS = new Set<string>([
  "kermes-shard",
  "indigo-shard",
  "shell-shard",
  "azure-shard",
  "damson-shard",
  "sunflower-shard",
  "scarlet-shard",
  "harlequin-shard",
  "cerise-shard",
]);

/** Lista wiki (aba TM Tank), ordem da tabela. */
export const NIGHTMARE_WIKI_TM_TANK_NAMES = [
  "Mega Ampharos Electric",
  "Tangrowth",
  "Mega Ampharos Dragon",
  "Shiny Copperajah",
  "Shiny Granbull",
  "Shiny Torkoal",
  "Mega Sableye",
  "Rhyperior",
  "Conkeldurr",
  "Shiny Blastoise",
] as const;

/** Lista wiki (aba TM D.P.S = OTDD / DPS noturno). */
export const NIGHTMARE_WIKI_TM_OTDD_NAMES = [
  "Shiny Raichu",
  "Shiny Venusaur",
  "Shiny Venomoth",
  "Shiny Pidgeot",
  "Mega Altaria Dragon",
  "Mega Lucario Steel",
  "Mega Gardevoir",
  "Mega Alakazam",
  "Shiny Charizard",
  "Shiny Honchkrow",
  "Shiny Tentacruel",
  "Shiny Marowak",
  "Shiny Magcargo",
  "Shiny Machamp",
  "Shiny Feraligatr",
  "Alolan Ninetales",
] as const;

function slugifyTmName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type NightmareTmKind = "tank" | "otdd";

/** Tamanho do ícone no diálogo de loot (`md` = padrão wiki). */
export type NightmareLootIconSize = "md" | "sm" | "xs";

export type NightmareTerrorItem = {
  slug: string;
  name: string;
  icon: string;
  /** Ícones que a UI pode alternar (giant / shards unificados). */
  cycleIcons?: readonly string[];
  npcPriceDollars: number;
  /** Presente só nas linhas de TM concretas. */
  tmKind?: NightmareTmKind;
  /** `sm` / `xs` quando o sprite é maior que a média (omitir = `md`). */
  lootIconSize?: NightmareLootIconSize;
};

function tmLootItems(
  kind: NightmareTmKind,
  names: readonly string[],
  icon: string,
): NightmareTerrorItem[] {
  const prefix = kind === "tank" ? "tm-tank" : "tm-otdd";
  const cycle = kind === "tank" ? TM_TANK_ICON_CYCLE : TM_OTDD_ICON_CYCLE;
  return names.map((name) => ({
    slug: `${prefix}-${slugifyTmName(name)}`,
    name,
    icon,
    npcPriceDollars: 0,
    tmKind: kind,
    cycleIcons: cycle,
    lootIconSize: "xs",
  }));
}

/** Materiais e itens fixos (sem TMs individuais). */
export const NIGHTMARE_TERROR_ITEMS: readonly NightmareTerrorItem[] = [
  {
    slug: "star-dust",
    name: "Star Dust",
    icon: "/items/star-dust.png",
    npcPriceDollars: 10_000,
  },
  {
    slug: "technological-crystal-tier-7",
    name: "Technological Crystal (Tier: 7)",
    icon: "/items/technological-crystal-tier-7.png",
    npcPriceDollars: 0,
    lootIconSize: "xs",
  },
  {
    slug: "technological-crystal-tier-8",
    name: "Technological Crystal (Tier: 8)",
    icon: "/items/technological-crystal-tier-8.png",
    npcPriceDollars: 0,
    lootIconSize: "xs",
  },
  {
    slug: "rough-gemstone",
    name: "Rough Gemstone",
    icon: "/items/rough-gemstone.png",
    npcPriceDollars: 0,
    lootIconSize: "sm",
  },
  {
    slug: TERROR_SHARD_SLUG,
    name: "Shard",
    icon: SHARD_CYCLE[0],
    cycleIcons: SHARD_CYCLE,
    npcPriceDollars: 150_000,
    lootIconSize: "xs",
  },
  {
    slug: TERROR_GIANT_SLUG,
    name: "Giant Item (Terror)",
    icon: GIANT_EXCLUSIVE_CYCLE[0],
    cycleIcons: GIANT_EXCLUSIVE_CYCLE,
    npcPriceDollars: 1_000_000,
  },
  {
    slug: "cosmic-addons-recipe",
    name: "Cosmic Addons Recipe",
    icon: "/items/cosmic-addons-recipe.png",
    npcPriceDollars: 0,
  },
  {
    slug: "yellow-star-piece",
    name: "Yellow Star Piece",
    icon: "/items/yellow-star-piece.gif",
    npcPriceDollars: 0,
  },
  {
    slug: "red-star-piece",
    name: "Red Star Piece",
    icon: "/items/red-star-piece.gif",
    npcPriceDollars: 0,
  },
  {
    slug: "green-star-piece",
    name: "Green Star Piece",
    icon: "/items/green-star-piece.gif",
    npcPriceDollars: 0,
  },
  {
    slug: "tm-tank-random",
    name: "TM Tank",
    icon: TM_TANK_ICON_CYCLE[0],
    cycleIcons: TM_TANK_ICON_CYCLE,
    npcPriceDollars: 0,
    tmKind: "tank",
    lootIconSize: "xs",
  },
  {
    slug: "tm-otdd-random",
    name: "TM OTDD",
    icon: TM_OTDD_ICON_CYCLE[0],
    cycleIcons: TM_OTDD_ICON_CYCLE,
    npcPriceDollars: 0,
    tmKind: "otdd",
    lootIconSize: "xs",
  },
] as const;

const NIGHTMARE_TM_TANK_ITEMS = tmLootItems(
  "tank",
  NIGHTMARE_WIKI_TM_TANK_NAMES,
  "/items/tm-tank-random.gif",
);

const NIGHTMARE_TM_OTDD_ITEMS = tmLootItems(
  "otdd",
  NIGHTMARE_WIKI_TM_OTDD_NAMES,
  "/items/tm-otdd-random.gif",
);

/** Catálogo completo para quantidades / PATCH loot (materiais + cada TM). */
export const ALL_NIGHTMARE_LOOT_ITEMS: readonly NightmareTerrorItem[] = [
  ...NIGHTMARE_TERROR_ITEMS,
  ...NIGHTMARE_TM_TANK_ITEMS,
  ...NIGHTMARE_TM_OTDD_ITEMS,
];

const LOOT_BY_SLUG = new Map<string, NightmareTerrorItem>(
  ALL_NIGHTMARE_LOOT_ITEMS.map((i) => [i.slug, i]),
);

/** Rótulo para linhas antigas salvas com slugs separados. */
export function nightmareLootDisplayName(slug: string): string {
  const item = LOOT_BY_SLUG.get(slug);
  if (item) {
    if (item.tmKind === "tank") return `TM Tank: ${item.name}`;
    if (item.tmKind === "otdd") return `TM OTDD: ${item.name}`;
    return item.name;
  }
  if (slug === "rough-stone")
    return "Rough Gemstone (slug antigo: rough-stone)";
  if (slug === "tm-tank-random") return "TM Tank (aleatório — registro antigo)";
  if (slug === "tm-otdd-random") return "TM OTDD (aleatório — registro antigo)";
  if (LEGACY_GIANT_SLUGS.has(slug))
    return "Giant / exclusivo (registro antigo)";
  if (LEGACY_SHARD_SLUGS.has(slug)) return "Shard (registro antigo)";
  return slug;
}

export function nightmareTerrorItemBySlug(
  slug: string,
): NightmareTerrorItem | undefined {
  return LOOT_BY_SLUG.get(slug);
}

/**
 * Ciclo de ícones para slugs atuais e também legados
 * (antes da unificação de giant/shard em um único slug).
 */
export function nightmareCycleIconsBySlug(
  slug: string,
): readonly string[] | undefined {
  const current = LOOT_BY_SLUG.get(slug)?.cycleIcons;
  if (current?.length) return current;
  if (LEGACY_GIANT_SLUGS.has(slug)) return GIANT_EXCLUSIVE_CYCLE;
  if (LEGACY_SHARD_SLUGS.has(slug)) return SHARD_CYCLE;
  return undefined;
}
