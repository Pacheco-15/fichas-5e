// Termos curtos que se repetem nos dados (tempo de conjuração, alcance, duração, escola, dano, propriedades de arma).
// Traduzidos por regra em vez de um a um. Os nomes seguem o glossário em pt/GLOSSARIO.md.
import type { SpellDef } from './rules';
import { translation } from './translations';

const CASTING: Record<string, string> = {
  action: 'Ação', 'bonus-action': 'Ação Bônus', reaction: 'Reação',
  '1minute': '1 minuto', '10minutes': '10 minutos', '1hour': '1 hora', '8hours': '8 horas', '12hours': '12 horas', '24hours': '24 horas',
};

export const SCHOOL_PT: Record<string, string> = {
  Abjuration: 'Abjuração', Conjuration: 'Conjuração', Divination: 'Adivinhação', Enchantment: 'Encantamento',
  Evocation: 'Evocação', Illusion: 'Ilusão', Necromancy: 'Necromancia', Transmutation: 'Transmutação',
};

export const DAMAGE_PT: Record<string, string> = {
  acid: 'ácido', bludgeoning: 'contundente', cold: 'frio', fire: 'fogo', force: 'energia', lightning: 'elétrico',
  necrotic: 'necrótico', piercing: 'perfurante', poison: 'veneno', psychic: 'psíquico', radiant: 'radiante',
  slashing: 'cortante', thunder: 'trovão',
};

/** Propriedades de arma (inclusive as de maestria, que seguem o glossário). */
export const PROPERTY_PT: Record<string, string> = {
  Ammunition: 'Munição', Finesse: 'Acuidade', Heavy: 'Pesada', Light: 'Leve', Loading: 'Recarga', Range: 'Alcance',
  Reach: 'Alcance Estendido', Thrown: 'Arremesso', 'Two-Handed': 'Duas Mãos', Versatile: 'Versátil',
  Cleave: 'Trespassar', Graze: 'Raspão', Nick: 'Talho', Push: 'Empurrar', Sap: 'Enfraquecer', Slow: 'Lentidão',
  Topple: 'Derrubar', Vex: 'Atormentar',
};

/** Munição citada no alcance das armas ("Range 150/600; Arrow"). */
const AMMO_PT: Record<string, string> = { Arrow: 'Flecha', Bolt: 'Virote', Bullet: 'Bala', Needle: 'Agulha' };

const WEAPON_PROF_PT: Record<string, string> = {
  'Simple and Martial weapons': 'Armas Simples e Marciais',
  'Simple weapons': 'Armas Simples',
  'Simple weapons and Martial weapons that have the Light property': 'Armas Simples e armas Marciais com a propriedade Leve',
  'Simple weapons and Martial weapons that have the Finesse or Light property': 'Armas Simples e armas Marciais com a propriedade Acuidade ou Leve',
};
export const weaponProfPt = (raw: string) => WEAPON_PROF_PT[raw] ?? raw;

export const ARMOR_CATEGORY_PT: Record<string, string> = { light: 'leve', medium: 'média', heavy: 'pesada', shield: 'escudo' };

const units = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 minute" → "1 minuto", "10 days" → "10 dias", "until dispelled" → "até ser dissipada". */
function durationPt(raw: string): string {
  const r = raw.trim().toLowerCase();
  if (r === 'instantaneous') return 'Instantânea';
  if (r === 'special') return 'Especial';
  if (r === 'until dispelled') return 'Até ser dissipada';
  if (r === 'until dispelled or triggered') return 'Até ser dissipada ou ativada';
  const m = r.match(/^(\d+) (round|minute|hour|day)s?$/);
  if (!m) return raw;
  const n = Number(m[1]);
  return {
    round: units(n, 'rodada', 'rodadas'),
    minute: units(n, 'minuto', 'minutos'),
    hour: units(n, 'hora', 'horas'),
    day: units(n, 'dia', 'dias'),
  }[m[2]]!;
}

/** "60 feet" → "60 pés", "Self" → "Pessoal". */
export function rangePt(raw: string): string {
  const fixed: Record<string, string> = { Self: 'Pessoal', Touch: 'Toque', Special: 'Especial', Sight: 'Visão', Unlimited: 'Ilimitado' };
  if (fixed[raw]) return fixed[raw];
  return raw
    .replace(/(\d+) feet/g, '$1 pés')
    .replace(/(\d+) foot/g, '$1 pé')
    .replace(/(\d+) miles?/g, (_, n) => units(Number(n), 'milha', 'milhas'))
    .replace(/^Self \((.+)\)$/, 'Pessoal ($1)');
}

/** "Range 150/600; Arrow" → "Alcance 150/600; Flecha". */
export function weaponRangePt(raw: string): string {
  return raw.replace(/^Range/, 'Alcance').replace(/; (\w+)$/, (_, a) => `; ${AMMO_PT[a] ?? a}`);
}

export const castingTimePt = (raw: string) => CASTING[raw] ?? raw;
export const schoolPt = (raw: string) => SCHOOL_PT[raw] ?? raw;
export const damagePt = (raw: string) => DAMAGE_PT[raw.toLowerCase()] ?? raw.toLowerCase();
export const propertyPt = (raw: string) => PROPERTY_PT[raw] ?? raw;

/** Texto de uma magia pronto para a tela, em português quando houver tradução. */
export interface SpellText {
  name: string;
  /** Nome original quando houve tradução. */
  original?: string;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  components: string;
  desc: string;
  higherLevel: string;
  levelLabel: string;
}

export function spellText(s: SpellDef): SpellText {
  const pt = translation(s.key);
  const material = s.components.match(/M \((.*)\)$/)?.[1];
  const components = s.components
    .replace(/M \(.*\)$/, material ? `M (${pt?.material ?? material})` : 'M');
  return {
    name: pt?.name ?? s.name,
    original: pt && pt.name !== s.name ? s.name : undefined,
    school: schoolPt(s.school),
    castingTime: `${castingTimePt(s.castingTime)}${s.ritual ? ' ou Ritual' : ''}`,
    range: rangePt(s.range),
    duration: `${s.concentration ? 'Concentração, até ' : ''}${s.concentration ? durationPt(s.duration).toLowerCase() : durationPt(s.duration)}`,
    components,
    desc: pt?.desc ?? s.desc,
    higherLevel: pt?.higherLevel ?? s.higherLevel,
    levelLabel: s.level === 0 ? 'Truque' : `${s.level}º círculo`,
  };
}

/** "Bola de Fogo (Fireball)" para seletores, como os feats. */
export function spellLabel(s: SpellDef): string {
  const t = spellText(s);
  return t.original ? `${t.name} (${t.original})` : t.name;
}
