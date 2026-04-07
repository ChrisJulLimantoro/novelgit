import type { LoreType } from "@/types/lore";

/** Visual / IA clusters for the lore library (types stay as stored in repo). */
export const LORE_CLUSTERS: {
  id: string;
  label: string;
  blurb: string;
  types: readonly LoreType[];
}[] = [
  {
    id:         "characters",
    label:      "Characters",
    blurb:      "People, personas, and voices in your story.",
    types:      ["character"],
  },
  {
    id:         "world",
    label:      "World",
    blurb:      "Places you visit and objects that matter.",
    types:      ["location", "item"],
  },
  {
    id:         "factions",
    label:      "Factions",
    blurb:      "Groups, orders, and organizations.",
    types:      ["faction"],
  },
  {
    id:         "events",
    label:      "Events",
    blurb:      "Plot beats, incidents, and turning points.",
    types:      ["event"],
  },
] as const;

export const LORE_TYPE_LABELS: Record<LoreType, string> = {
  character: "Character",
  location:  "Location",
  faction:   "Faction",
  event:     "Event",
  item:      "Item",
};

export type LoreClusterFilter = "all" | (typeof LORE_CLUSTERS)[number]["id"];

export function clusterForType(type: LoreType): (typeof LORE_CLUSTERS)[number] {
  const c = LORE_CLUSTERS.find((x) => x.types.includes(type));
  return c ?? LORE_CLUSTERS[0];
}

export function typesInCluster(clusterId: LoreClusterFilter): readonly LoreType[] | null {
  if (clusterId === "all") return null;
  const c = LORE_CLUSTERS.find((x) => x.id === clusterId);
  return c?.types ?? null;
}
