import {
  Banknote,
  Briefcase,
  Car,
  CircleDollarSign,
  CircleHelp,
  CreditCard,
  Droplets,
  FileText,
  Fuel,
  Hammer,
  HardHat,
  House,
  Landmark,
  Megaphone,
  PackageOpen,
  Phone,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { colorStyle, findCategory, type CategoryIconKey, type ExpenseCategoryData } from "@/lib/expense-categories";
import type { IconTone } from "./ui";

/*
 * Peças visuais do Financeiro (sem "use client": servem para o servidor e para as folhas).
 */

/** Chave gravada no banco → ícone lucide (importados um a um). */
export const CATEGORY_ICONS: Record<CategoryIconKey, LucideIcon> = {
  truck: Truck,
  package: PackageOpen,
  fuel: Fuel,
  wrench: Wrench,
  cart: ShoppingCart,
  tag: Tag,
  hammer: Hammer,
  hardhat: HardHat,
  car: Car,
  zap: Zap,
  droplet: Droplets,
  phone: Phone,
  wifi: Wifi,
  home: House,
  users: Users,
  utensils: UtensilsCrossed,
  receipt: Receipt,
  landmark: Landmark,
  briefcase: Briefcase,
  shield: ShieldCheck,
  file: FileText,
  wallet: Wallet,
  megaphone: Megaphone,
};

export function iconFor(key: string): LucideIcon {
  return CATEGORY_ICONS[key as CategoryIconKey] ?? Tag;
}

const tileSizes = {
  sm: "size-8 rounded-[10px] [&>svg]:size-4",
  md: "size-10 rounded-xl [&>svg]:size-[18px]",
  lg: "size-11 rounded-full [&>svg]:size-5",
};

/** Ícone da categoria num quadrado (ou círculo, `lg`) tingido com a cor dela. */
export function CategoryTile({ category, size = "md", className = "" }: { category: Pick<ExpenseCategoryData, "color" | "icon">; size?: keyof typeof tileSizes; className?: string }) {
  const Icon = iconFor(category.icon);
  return (
    <span className={`flex shrink-0 items-center justify-center ${tileSizes[size]} ${colorStyle(category.color).tile} ${className}`} aria-hidden>
      <Icon strokeWidth={1.9} />
    </span>
  );
}

/** Pílula com ícone + nome da categoria. */
export function CategoryChip({ categories, id }: { categories: readonly ExpenseCategoryData[]; id: string }) {
  const c = findCategory(categories, id);
  const Icon = iconFor(c.icon);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${colorStyle(c.color).chip}`}>
      <Icon className="size-3" strokeWidth={2.2} aria-hidden />
      {c.name}
    </span>
  );
}

/** Ícone para a forma de pagamento. */
export function methodIcon(method: string): LucideIcon {
  const m = method.toLowerCase();
  if (m === "pix") return QrCode;
  if (m === "dinheiro") return Banknote;
  if (m.startsWith("cart")) return CreditCard;
  if (m.startsWith("transf")) return ArrowLeftRight;
  if (m === "sem forma") return CircleHelp;
  return CircleDollarSign;
}

/** Cor da categoria → tom do <IconBox>/<ProgressRow> do design system. */
const TONE_BY_COLOR: Record<string, IconTone> = {
  sky: "sky",
  indigo: "indigo",
  amber: "amber",
  rose: "rose",
  emerald: "green",
  slate: "slate",
  violet: "violet",
  teal: "teal",
  orange: "orange",
  navy: "brand",
};
export function categoryTone(color: string): IconTone {
  return TONE_BY_COLOR[color] ?? "slate";
}

