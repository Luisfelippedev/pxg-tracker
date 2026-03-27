export interface LootSnapshotItem {
  slug: string;
  name: string;
  spritePath: string;
  quantity: number;
  /** Preço unitário NPC em dollars. 0 para itens raros. */
  npcUnitPrice: number;
  /** quantity × npcUnitPrice. 0 para itens raros. */
  npcTotal: number;
  isRare: boolean;
  templateName: string;
}

export interface LootSnapshotData {
  npcTotal: number;
  items: LootSnapshotItem[];
}
