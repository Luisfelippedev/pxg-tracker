import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Trash2,
  Pencil,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  useAdminGlobalTemplates,
  useAdminGlobalTemplateItems,
  useCreateAdminGlobalTemplate,
  useDeleteAdminGlobalTemplate,
  useReplaceAdminGlobalTemplateItems,
  useUpdateAdminGlobalTemplate,
} from "@/hooks/useAdminTemplates";
import * as api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SkeletonTable } from "@/components/Skeletons";
import { TaskTemplate, TemplateItem } from "@/types";
import {
  cn,
  formatMoneyInput,
  formatNpcDollars,
  parseMaskedMoneyToInt,
} from "@/lib/utils";
import {
  NIGHTMARE_TERROR_ITEMS,
  TERROR_GIANT_SLUG,
  TERROR_SHARD_SLUG,
  nightmareCycleIconsBySlug,
} from "@/data/nightmareTerrorItems";

const ITEM_PICKER_PAGE_SIZE = 80;
const LEGENDARY_DOG_BOSS_DROP_OPTIONS: Array<{
  slug: string;
  name: string;
  defaultSpritePath: string;
}> = [
  { slug: "raikou-loot-bag", name: "Raikou Loot Bag", defaultSpritePath: "/items/raikou-loot-bag.png" },
  { slug: "thunder-essence", name: "Thunder Essence", defaultSpritePath: "/items/thunder-essence.gif" },
  { slug: "raikou-legendary-sewing-thread", name: "Raikou Sewing Kit", defaultSpritePath: "/items/raikou-legendary-sewing-thread.png" },
  { slug: "raikou-tv-cam", name: "Raikou TV Camera", defaultSpritePath: "/items/raikou-tv-cam.gif" },
  { slug: "raikou-backpack", name: "Raikou Backpack", defaultSpritePath: "/items/raikou-backpack.gif" },
  { slug: "raikou-amulet", name: "Raikou Amulet", defaultSpritePath: "/items/raikou-amulet.png" },
  { slug: "raikous-legendary-tail", name: "Raikou's Legendary Tail", defaultSpritePath: "/items/raikous-legendary-tail.png" },
  { slug: "raibolt-urn", name: "Raibolt Urn", defaultSpritePath: "/items/raibolt-urn.png" },
  { slug: "entei-loot-bag", name: "Entei Loot Bag", defaultSpritePath: "/items/entei-loot-bag.png" },
  { slug: "flame-essence", name: "Flame Essence", defaultSpritePath: "/items/flame-essence.gif" },
  { slug: "entei-legendary-sewing-thread", name: "Entei Sewing Kit", defaultSpritePath: "/items/entei-legendary-sewing-thread.png" },
  { slug: "entei-tv-cam", name: "Entei TV Camera", defaultSpritePath: "/items/entei-tv-cam.gif" },
  { slug: "entei-backpack", name: "Entei Backpack", defaultSpritePath: "/items/entei-backpack.gif" },
  { slug: "entei-amulet", name: "Entei Amulet", defaultSpritePath: "/items/entei-amulet.png" },
  { slug: "enteis-legendary-fur", name: "Entei's Legendary Fur", defaultSpritePath: "/items/enteis-legendary-fur.png" },
  { slug: "volcanic-urn", name: "Volcanic Urn", defaultSpritePath: "/items/volcanic-urn.png" },
  { slug: "suicune-loot-bag", name: "Suicune Loot Bag", defaultSpritePath: "/items/suicune-loot-bag.png" },
  { slug: "water-essence", name: "Water Essence", defaultSpritePath: "/items/water-essence.gif" },
  { slug: "suicune-legendary-sewing-thread", name: "Suicune Sewing Kit", defaultSpritePath: "/items/suicune-legendary-sewing-thread.png" },
  { slug: "suicune-tv-cam", name: "Suicune TV Camera", defaultSpritePath: "/items/suicune-tv-cam.gif" },
  { slug: "suicune-backpack", name: "Suicune Backpack", defaultSpritePath: "/items/suicune-backpack.gif" },
  { slug: "suicune-amulet", name: "Suicune Amulet", defaultSpritePath: "/items/suicune-amulet.png" },
  { slug: "suicunes-legendary-tail", name: "Suicune's Legendary Tail", defaultSpritePath: "/items/suicunes-legendary-tail.png" },
  { slug: "seavell-urn", name: "Seavell Urn", defaultSpritePath: "/items/seavell-urn.png" },
];

function CyclingSprite({
  slug,
  src,
  className,
}: {
  slug: string;
  src: string;
  className?: string;
}) {
  const cycle = nightmareCycleIconsBySlug(slug);
  const frames = cycle?.length ? [...cycle] : [src];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [slug, src]);

  useEffect(() => {
    if (frames.length < 2) return;
    const timer = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % frames.length);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [frames.length, slug, src]);

  return <img src={frames[idx]} alt="" className={className} />;
}

function GlobalTemplateForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Partial<TaskTemplate>;
  onSubmit: (body: { name: string; frequency: "weekly" | "monthly" }) => void;
  submitting?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">(
    (initial?.frequency as any) ?? "weekly",
  );

  return (
    <form
      className="space-y-4 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, frequency });
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-muted border-border"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Frequência</label>
        <select
          className="w-full h-9 rounded-md bg-muted border border-border px-3 text-sm"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as any)}
        >
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
        </select>
      </div>
      <Button
        type="submit"
        disabled={submitting || name.trim().length < 2}
        className="w-full gradient-primary text-primary-foreground font-semibold shadow-primary"
      >
        Salvar
      </Button>
    </form>
  );
}

function normalizeItemDraft(i: TemplateItem): TemplateItem {
  const isRare = Boolean(i.isRare);
  const npc =
    i.npcPriceDollars === null || i.npcPriceDollars === undefined
      ? null
      : Number(i.npcPriceDollars);
  return {
    ...i,
    isRare,
    npcPriceDollars: isRare ? null : npc,
    spritePath: i.spritePath?.trim() ?? "",
    itemName: i.itemName?.trim() ?? "",
    itemSlug: i.itemSlug?.trim() ?? "",
  };
}

export default function AdminTemplatesPage() {
  const { data: templates, isLoading } = useAdminGlobalTemplates();
  const createTpl = useCreateAdminGlobalTemplate();
  const updateTpl = useUpdateAdminGlobalTemplate();
  const deleteTpl = useDeleteAdminGlobalTemplate();

  const [editingTpl, setEditingTpl] = useState<TaskTemplate | null>(null);
  const [itemsTplId, setItemsTplId] = useState<string | null>(null);

  const itemsQuery = useAdminGlobalTemplateItems(itemsTplId);
  const replaceItems = useReplaceAdminGlobalTemplateItems();

  const [itemDraft, setItemDraft] = useState<TemplateItem[]>([]);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);

  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemSlug, setSelectedItemSlug] = useState("");
  const [visibleItemCount, setVisibleItemCount] = useState(ITEM_PICKER_PAGE_SIZE);
  const [itemOptions, setItemOptions] = useState<
    Array<{ slug: string; name: string; defaultSpritePath: string }>
  >([]);
  const deferredItemSearch = useDeferredValue(itemSearch);

  const extraNightmareOptions = useMemo(() => {
    const giant = NIGHTMARE_TERROR_ITEMS.find(
      (item) => item.slug === TERROR_GIANT_SLUG,
    );
    const shard = NIGHTMARE_TERROR_ITEMS.find(
      (item) => item.slug === TERROR_SHARD_SLUG,
    );
    const tmTank = NIGHTMARE_TERROR_ITEMS.find(
      (item) => item.slug === "tm-tank-random",
    );
    const tmOtdd = NIGHTMARE_TERROR_ITEMS.find(
      (item) => item.slug === "tm-otdd-random",
    );

    return [
      giant
        ? {
            slug: giant.slug,
            name: "Giant Item (Terror)",
            defaultSpritePath: giant.icon,
          }
        : null,
      shard
        ? {
            slug: shard.slug,
            name: "Shard",
            defaultSpritePath: shard.icon,
          }
        : null,
      tmTank
        ? {
            slug: tmTank.slug,
            name: "TM Tank",
            defaultSpritePath: tmTank.icon,
          }
        : null,
      tmOtdd
        ? {
            slug: tmOtdd.slug,
            name: "TM OTDD",
            defaultSpritePath: tmOtdd.icon,
          }
        : null,
      ...LEGENDARY_DOG_BOSS_DROP_OPTIONS,
    ].filter(Boolean) as Array<{
      slug: string;
      name: string;
      defaultSpritePath: string;
    }>;
  }, []);

  const totalNpc = useMemo(() => {
    return itemDraft.reduce(
      (s, i) => s + (i.npcPriceDollars ? i.npcPriceDollars : 0),
      0,
    );
  }, [itemDraft]);

  const openItemsEditor = (tpl: TaskTemplate) => {
    setItemsTplId(tpl.id);
    setItemsDialogOpen(true);
    setSelectedItemSlug("");
    setItemSearch("");
    setVisibleItemCount(ITEM_PICKER_PAGE_SIZE);
  };

  const loadItemsIntoDraft = () => {
    const src = itemsQuery.data ?? [];
    setItemDraft(src.map(normalizeItemDraft));
  };

  useEffect(() => {
    if (!itemsDialogOpen) return;
    setItemDraft((itemsQuery.data ?? []).map(normalizeItemDraft));
  }, [itemsDialogOpen, itemsQuery.data]);

  useEffect(() => {
    if (!itemsDialogOpen) return;
    let mounted = true;
    api
      .adminListItems({ q: "", hasRealSprite: true })
      .then((rows) => {
        if (!mounted) return;
        const apiOptions = rows.slice(0, 500).map((r) => ({
          slug: r.slug,
          name: r.name,
          defaultSpritePath: r.defaultSpritePath,
        }));
        const bySlug = new Map<
          string,
          { slug: string; name: string; defaultSpritePath: string }
        >();
        for (const option of [...extraNightmareOptions, ...apiOptions]) {
          if (!bySlug.has(option.slug)) bySlug.set(option.slug, option);
        }
        setItemOptions(Array.from(bySlug.values()));
      })
      .catch(() => {
        toast.error("Não foi possível carregar catálogo de itens.");
      });
    return () => {
      mounted = false;
    };
  }, [itemsDialogOpen, extraNightmareOptions]);

  const addItemToDraft = (it: {
    slug: string;
    name: string;
    defaultSpritePath: string;
  }) => {
    setItemDraft((prev) => {
      if (prev.some((p) => p.itemSlug === it.slug)) return prev;
      return [
        ...prev,
        {
          id: `draft-${it.slug}`,
          templateId: itemsTplId ?? "",
          itemSlug: it.slug,
          itemName: it.name,
          spritePath: it.defaultSpritePath,
          isRare: false,
          npcPriceDollars: 0,
        },
      ];
    });
  };

  const selectedItemOption =
    itemOptions.find((o) => o.slug === selectedItemSlug) ?? null;

  const filteredItemOptions = useMemo(() => {
    const q = deferredItemSearch.trim().toLowerCase();
    if (!q) return itemOptions;
    return itemOptions.filter((o) =>
      `${o.name} ${o.slug}`.toLowerCase().includes(q),
    );
  }, [itemOptions, deferredItemSearch]);

  const visibleItemOptions = useMemo(
    () => filteredItemOptions.slice(0, visibleItemCount),
    [filteredItemOptions, visibleItemCount],
  );

  const hasMoreVisibleOptions = visibleItemCount < filteredItemOptions.length;

  useEffect(() => {
    setVisibleItemCount(ITEM_PICKER_PAGE_SIZE);
  }, [deferredItemSearch, itemPickerOpen]);

  const removeItem = (slug: string) => {
    setItemDraft((prev) => prev.filter((p) => p.itemSlug !== slug));
  };

  const saveItems = async () => {
    if (!itemsTplId) return;
    const payload = itemDraft.map((i) => ({
      itemSlug: i.itemSlug,
      itemName: i.itemName,
      spritePath: i.spritePath,
      isRare: i.isRare,
      npcPriceDollars: i.isRare ? null : (i.npcPriceDollars ?? 0),
    }));
    replaceItems.mutate(
      { templateId: itemsTplId, items: payload },
      {
        onSuccess: () => {
          const tpl = templates?.find((t) => t.id === itemsTplId);
          if (!tpl) {
            toast.success("Itens do template salvos!");
            setItemsDialogOpen(false);
            return;
          }

          const inferredKind: "standard" | "loot" =
            payload.length > 0 ? "loot" : "standard";
          if (tpl.kind === inferredKind) {
            toast.success("Itens do template salvos!");
            setItemsDialogOpen(false);
            return;
          }

          updateTpl.mutate(
            {
              id: tpl.id,
              body: {
                name: tpl.name,
                frequency: tpl.frequency,
                kind: inferredKind,
                presetKey: tpl.presetKey,
              },
            },
            {
              onSuccess: () => {
                toast.success("Itens do template salvos!");
                setItemsDialogOpen(false);
              },
              onError: (e: any) => {
                toast.error(
                  e?.response?.data?.message ??
                    "Itens salvos, mas não foi possível atualizar o tipo.",
                );
              },
            },
          );
        },
        onError: (e: any) => {
          toast.error(
            e?.response?.data?.message ?? "Não foi possível salvar itens.",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Templates Globais
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Administração de templates disponíveis para todos os usuários.
          </p>
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Templates Globais
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Admin pode criar/editar/remover. Usuários comuns: somente leitura.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Criar template global
              </DialogTitle>
            </DialogHeader>
            <GlobalTemplateForm
              submitting={createTpl.isPending}
              onSubmit={(body) =>
                createTpl.mutate(
                  { ...body, kind: "standard" },
                  {
                    onSuccess: () => toast.success("Template global criado!"),
                    onError: (e: any) =>
                      toast.error(
                        e?.response?.data?.message ?? "Não foi possível criar.",
                      ),
                  },
                )
              }
            />
          </DialogContent>
        </Dialog>
      </div>

      {!templates || templates.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum template global.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card gradient-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Nome
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Frequência
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Tipo
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 last:border-0 hover:bg-primary/[0.03]"
                >
                  <td className="px-5 py-3.5 text-sm font-medium">
                    <span>{t.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {t.frequency === "weekly" ? "Semanal" : "Mensal"}
                  </td>
                  <td className="px-5 py-3.5 text-sm">
                    {t.kind === "loot" ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        Loot
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Padrão
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openItemsEditor(t)}
                        className="h-8"
                      >
                        Itens
                      </Button>
                      <Dialog
                        open={editingTpl?.id === t.id}
                        onOpenChange={(o) => !o && setEditingTpl(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTpl(t)}
                            className="h-8"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="font-display text-xl">
                              Editar template
                            </DialogTitle>
                          </DialogHeader>
                          <GlobalTemplateForm
                            initial={t}
                            submitting={updateTpl.isPending}
                            onSubmit={(body) =>
                              updateTpl.mutate(
                                {
                                  id: t.id,
                                  body: {
                                    ...body,
                                    kind: t.kind,
                                    presetKey: t.presetKey,
                                  },
                                },
                                {
                                  onSuccess: () => {
                                    toast.success("Template atualizado!");
                                    setEditingTpl(null);
                                  },
                                  onError: (e: any) =>
                                    toast.error(
                                      e?.response?.data?.message ??
                                        "Não foi possível atualizar.",
                                    ),
                                },
                              )
                            }
                          />
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteTpl.isPending}
                        title="Excluir"
                        onClick={() =>
                          deleteTpl.mutate(t.id, {
                            onSuccess: () =>
                              toast.success("Template removido!"),
                            onError: (e: any) =>
                              toast.error(
                                e?.response?.data?.message ??
                                  "Não foi possível remover.",
                              ),
                          })
                        }
                        className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={itemsDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setItemsDialogOpen(false);
            setItemsTplId(null);
            setItemDraft([]);
          }
        }}
      >
        <DialogContent className="bg-card border-border max-h-[92vh] flex flex-col gap-0 p-6 sm:max-w-3xl">
          <DialogHeader className="space-y-1 shrink-0">
            <DialogTitle className="font-display text-lg">
              Itens do template
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-snug">
              Defina valor NPC ou marque como raro. Raros não podem ter valor
              NPC.
            </p>
          </DialogHeader>

          <div className="pt-3 flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Popover
                open={itemPickerOpen}
                onOpenChange={(open) => {
                  setItemPickerOpen(open);
                  if (!open) {
                    setItemSearch("");
                    setVisibleItemCount(ITEM_PICKER_PAGE_SIZE);
                  }
                }}
                modal={false}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={itemPickerOpen}
                    className="h-9 w-full justify-between bg-background border-border"
                  >
                    {selectedItemOption ? (
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <CyclingSprite
                          slug={selectedItemOption.slug}
                          src={selectedItemOption.defaultSpritePath}
                          className="h-4 w-4 object-contain shrink-0"
                        />
                        <span className="truncate">
                          {selectedItemOption.name} ({selectedItemOption.slug})
                        </span>
                      </span>
                    ) : (
                      "Selecionar item para adicionar..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[560px] p-0" align="start">
                  <Command className="max-h-[320px]" shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar item por nome, slug, tipo..."
                      value={itemSearch}
                      onValueChange={setItemSearch}
                      className="focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <CommandList
                      className="max-h-[260px] overflow-y-auto overscroll-contain"
                      onWheel={(e) => {
                        e.stopPropagation();
                      }}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const nearBottom =
                          el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
                        if (!nearBottom || !hasMoreVisibleOptions) return;
                        setVisibleItemCount((prev) =>
                          Math.min(
                            prev + ITEM_PICKER_PAGE_SIZE,
                            filteredItemOptions.length,
                          ),
                        );
                      }}
                    >
                      <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                      <CommandGroup>
                        {visibleItemOptions.map((o) => (
                          <CommandItem
                            key={o.slug}
                            value={`${o.name} ${o.slug}`}
                            className="cursor-pointer"
                            onSelect={() => {
                              setSelectedItemSlug(o.slug);
                              setItemPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedItemSlug === o.slug
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <CyclingSprite
                              slug={o.slug}
                              src={o.defaultSpritePath}
                              className="mr-2 h-4 w-4 object-contain shrink-0"
                            />
                            <span className="truncate">{o.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({o.slug})
                            </span>
                          </CommandItem>
                        ))}
                        {hasMoreVisibleOptions ? (
                          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                            Role para carregar mais itens...
                          </div>
                        ) : null}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                className="h-9"
                disabled={!selectedItemOption}
                onClick={() =>
                  selectedItemOption && addItemToDraft(selectedItemOption)
                }
              >
                Adicionar
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
              {itemsQuery.isLoading && itemDraft.length === 0 ? (
                <div className="text-sm text-muted-foreground">Carregando…</div>
              ) : itemDraft.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Sem itens no draft. Adicione itens via busca.
                </div>
              ) : (
                itemDraft.map((it) => (
                  <div
                    key={it.itemSlug}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 shrink-0">
                      <CyclingSprite
                        slug={it.itemSlug}
                        src={it.spritePath}
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0 self-center">
                      <p className="text-xs font-medium truncate">
                        {it.itemName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {it.itemSlug}
                      </p>
                    </div>

                    <div className="flex items-end gap-4">
                      <div className="grid grid-rows-[auto_2rem] justify-items-center min-w-10">
                        <span className="text-[10px] font-semibold tracking-wide text-amber-300 leading-none mb-1">
                          RARO
                        </span>
                        <div className="h-8 flex items-center justify-center">
                          <Switch
                            checked={it.isRare}
                            onCheckedChange={(checked) =>
                              setItemDraft((prev) =>
                                prev.map((p) =>
                                  p.itemSlug === it.itemSlug
                                    ? {
                                        ...p,
                                        isRare: checked,
                                        npcPriceDollars: checked
                                          ? null
                                          : (p.npcPriceDollars ?? 0),
                                      }
                                    : p,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="w-36 grid grid-rows-[auto_2rem]">
                        <p className="text-[10px] text-muted-foreground mb-1 leading-none">
                          <span>
                            NPC {formatNpcDollars(it.npcPriceDollars ?? 0)}/un.
                          </span>
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={
                            it.isRare
                              ? "—"
                              : formatMoneyInput(it.npcPriceDollars ?? 0)
                          }
                          disabled={it.isRare}
                          onChange={(e) =>
                            setItemDraft((prev) =>
                              prev.map((p) =>
                                p.itemSlug === it.itemSlug
                                  ? {
                                      ...p,
                                      npcPriceDollars: parseMaskedMoneyToInt(
                                        e.target.value,
                                      ),
                                      isRare: false,
                                    }
                                  : p,
                              ),
                            )
                          }
                          placeholder="NPC"
                          className={cn(
                            "h-8 text-xs bg-muted/20 border-border",
                            it.isRare && "opacity-60 text-center font-semibold",
                          )}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 self-end text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(it.itemSlug)}
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              Total NPC (somente itens com NPC):{" "}
              <span className="text-primary font-semibold">
                {formatNpcDollars(totalNpc)}
              </span>
            </p>
            <Button
              onClick={saveItems}
              disabled={replaceItems.isPending || !itemsTplId}
              className="gradient-primary text-primary-foreground font-semibold shadow-primary"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Salvar itens
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
