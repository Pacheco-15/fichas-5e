// Itens do SRD com preço, ferramentas, idiomas e os pacotes de equipamento inicial de classe e antecedente.
import rawItems from './srd/items.json';
import { ARMOR, BACKGROUNDS, CLASSES, WEAPONS, byKey } from './rules';
import { namePt } from './translations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* ---------- Itens ---------- */

export interface ItemDef {
  key: string;
  name: string;
  /** Preço em peças de ouro (GP). */
  cost: number;
  weight: number;
  category: string;
  weaponKey?: string;
  armorKey?: string;
}

/** Categorias que se compram numa loja comum (sem itens mágicos, veículos e montarias). */
const SHOP_CATEGORIES = new Set([
  'weapon', 'armor', 'shield', 'adventuring-gear', 'tools', 'ammunition', 'equipment-pack', 'spellcasting-focus',
]);

// Nos dados, ferramentas vêm como "Smith's Tools (20 GP)" e de novo sem o preço no nome; ficamos com uma de cada.
// Alguns nomes têm um ")" sobrando, como "Holy Symbol, Amulet)".
const cleanName = (name: string) => {
  const n = name.replace(/\s*\(\d+ GP\)$/, '');
  return n.endsWith(')') && !n.includes('(') ? n.slice(0, -1) : n;
};

export const ITEMS: ItemDef[] = (() => {
  const seen = new Set<string>();
  const list: ItemDef[] = [];
  for (const it of rawItems as Raw[]) {
    // A API também devolve os itens do SRD 5.1 ("srd_…"); ficamos só com os de 2024.
    if (!String(it.key).startsWith('srd-2024_') || !SHOP_CATEGORIES.has(it.category?.key)) continue;
    const name = cleanName(it.name);
    const id = squash(name);
    if (seen.has(id)) continue;
    seen.add(id);
    const weaponKey = it.weapon?.key && byKey(WEAPONS, it.weapon.key) ? it.weapon.key : undefined;
    const armorKey = it.armor?.key && byKey(ARMOR, it.armor.key) ? it.armor.key : undefined;
    list.push({
      key: it.key,
      name,
      cost: Number(it.cost) || 0,
      weight: Number(it.weight) || 0,
      category: it.category.key,
      weaponKey,
      armorKey: armorKey ?? (name === 'Shield' ? byKey(ARMOR, 'srd-2024_shield')?.key : undefined),
    });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
})();

// "Traveler's Clothes" e "Clothes, Traveler's" são o mesmo item: compara as palavras sem ordem.
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');

export const itemByName = (name: string): ItemDef | undefined => {
  const n = squash(name);
  const w = words(name);
  return (
    ITEMS.find((i) => squash(i.name) === n) ??
    ITEMS.find((i) => words(i.name) === w) ??
    // "Holy Symbol" sem dizer qual: fica com a primeira variante ("Holy Symbol, Amulet").
    ITEMS.find((i) => squash(i.name.split(',')[0]) === n && i.name.includes(','))
  );
};

/* ---------- Ferramentas (SRD p. 94–95) ---------- */

export type ToolCategory = 'artisan' | 'gaming' | 'instrument' | 'other';

export interface ToolDef {
  /** Valor salvo na ficha. */
  key: string;
  name: string;
  category: ToolCategory;
}

const ARTISAN = [
  "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools",
  "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools", "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools",
  "Painter's Supplies", "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools",
];
const GAMING = ['Dice', 'Dragonchess', 'Playing Cards', 'Three-Dragon Ante'];
const INSTRUMENTS = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan Flute', 'Shawm', 'Viol'];
const OTHER_TOOLS = ['Disguise Kit', 'Forgery Kit', 'Herbalism Kit', "Navigator's Tools", "Poisoner's Kit", "Thieves' Tools"];

export const TOOLS: ToolDef[] = [
  ...ARTISAN.map((name) => ({ key: name, name, category: 'artisan' as const })),
  ...GAMING.map((name) => ({ key: `Gaming Set (${name})`, name: `Gaming Set (${name})`, category: 'gaming' as const })),
  ...INSTRUMENTS.map((name) => ({ key: name, name, category: 'instrument' as const })),
  ...OTHER_TOOLS.map((name) => ({ key: name, name, category: 'other' as const })),
];

export const toolsOf = (...cats: ToolCategory[]) => TOOLS.filter((t) => cats.includes(t.category)).map((t) => t.key);

/** Nome em português de um item, ferramenta ou idioma (chaves em pt/GLOSSARIO.md). */
// Itens usam o prefixo "item/" porque algumas chaves do SRD se repetem entre itens e magias (Shield).
export const gearName = (key: string, original: string) => namePt(`item/${key}`, original);
export const gearLabel = (key: string, original: string) => {
  const pt = gearName(key, original);
  return pt === original ? original : `${pt} (${original})`;
};
export const itemName = (item: ItemDef) => gearName(item.key, item.name);
export const toolName = (key: string) => namePt(`tool/${key}`, TOOLS.find((t) => t.key === key)?.name ?? key);
export const languageName = (name: string) => namePt(`language/${name}`, name);

/* ---------- Idiomas (SRD p. 20) ---------- */

export const STANDARD_LANGUAGES = [
  'Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
];
export const RARE_LANGUAGES = [
  'Abyssal', 'Celestial', 'Deep Speech', 'Druidic', 'Infernal', 'Primordial', 'Sylvan', "Thieves' Cant", 'Undercommon',
];

/* ---------- Pacotes de equipamento inicial ---------- */

/** "8× Azagaia", "Instrumento (escolha)". */
export function entryLabel(e: PackageEntry): string {
  const name = e.item ? itemName(e.item) : e.pick === 'instrument' ? 'Instrumento musical à escolha'
    : e.pick === 'class-tool' ? 'A ferramenta escolhida na proficiência da classe'
    : e.pick === 'gaming-set' ? 'O Gaming Set escolhido na proficiência' : e.text;
  return e.qty > 1 && (e.item || e.pick) ? `${e.qty}× ${name}` : name;
}

export interface PackageEntry {
  /** Texto como está no SRD, ex.: "8 Javelins". */
  text: string;
  qty: number;
  item?: ItemDef;
  /** O pacote pede uma escolha que vem de outro lugar, ex.: o instrumento do Bardo. */
  pick?: 'instrument' | 'class-tool' | 'gaming-set';
}

export interface EquipmentOption {
  id: string;
  label: string;
  entries: PackageEntry[];
  gold: number;
}

function parseEntry(raw: string): PackageEntry {
  const text = raw.trim().replace(/\s+/g, ' ');
  const m = text.match(/^(\d+)\s+(.*)$/);
  const qty = m ? Number(m[1]) : 1;
  const name = m ? m[2] : text;
  if (/Musical Instrument of your choice/i.test(name)) return { text, qty, pick: 'instrument' };
  if (/chosen for the tool proficiency/i.test(name)) return { text, qty, pick: 'class-tool' };
  if (/^Gaming Set/i.test(name)) return { text, qty, pick: 'gaming-set' };
  // "Druidic Focus (Quarterstaff)" e "Arcane Focus (Quarterstaff)" são o bordão, que também é arma.
  const inner = name.match(/\(([^)]+)\)$/)?.[1];
  const candidates = [
    inner && itemByName(inner)?.weaponKey ? inner : null,
    name,
    name.replace(/\s*\(.*\)$/, ''),
    // "Arrows" → "Arrows (20)"; "Javelins" → "Javelin"; "Handaxes" → "Handaxe"
    `${name} (${qty})`,
    name.replace(/es$/, ''),
    name.replace(/s$/, ''),
  ].filter((x): x is string => !!x);
  for (const cand of candidates) {
    const item = itemByName(cand);
    if (item) return { text, qty: cand === `${name} (${qty})` ? 1 : qty, item };
  }
  return { text, qty };
}

/** "Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP" */
export function parseEquipmentOptions(text: string): EquipmentOption[] {
  const parts = [...text.replace(/\*/g, '').matchAll(/\(([A-C])\)\s*([^;]+)/g)];
  return parts.map(([, id, body]) => {
    const pieces = body.replace(/\s+/g, ' ').replace(/^or\s+/, '').split(/,\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);
    let gold = 0;
    const entries: PackageEntry[] = [];
    for (const p of pieces) {
      const gp = p.trim().match(/^(\d+)\s*GP$/i);
      if (gp) gold += Number(gp[1]);
      else entries.push(parseEntry(p));
    }
    return { id, label: `Opção ${id}`, entries, gold };
  });
}

export const CLASS_EQUIPMENT: Record<string, EquipmentOption[]> = Object.fromEntries(
  CLASSES.map((c) => [c.key, parseEquipmentOptions(c.equipmentText)]),
);

export const BACKGROUND_EQUIPMENT: Record<string, EquipmentOption[]> = Object.fromEntries(
  BACKGROUNDS.map((b) => [b.key, parseEquipmentOptions(b.equipmentText)]),
);
