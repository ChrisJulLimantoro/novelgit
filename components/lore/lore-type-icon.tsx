import { User, MapPin, Users, Zap, Package } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { LoreType } from "@/types/lore";

const ICONS: Record<LoreType, React.ElementType> = {
  character: User,
  location:  MapPin,
  faction:   Users,
  event:     Zap,
  item:      Package,
};

export function LoreTypeIcon({ type, ...props }: { type: LoreType } & LucideProps) {
  const Icon = ICONS[type];
  return <Icon {...props} />;
}
