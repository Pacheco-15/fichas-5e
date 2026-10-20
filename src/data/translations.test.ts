// Cobertura da tradução: magias, equipamento, ferramentas e idiomas aparecem em português (pt/GLOSSARIO.md).
import { describe, expect, it } from 'vitest';
import rawSpells from './srd/spells.json';
import { SPELLS } from './rules';
import { ITEMS, RARE_LANGUAGES, STANDARD_LANGUAGES, TOOLS, itemName } from './equipment';
import { castingTimePt, rangePt, spellText } from './terms';
import { translatedKeys, translation, type Translation } from './translations';
import especies from './pt/especies.json';
import feats from './pt/feats.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = rawSpells as any[];

// No JSON do Open5e estas magias perderam o trecho de "Using a Higher-Level Spell Slot"; a tradução vem do PDF.
const HIGHER_LEVEL_FROM_PDF = new Set(['srd-2024_chain-lightning', 'srd-2024_dissonant-whispers']);

describe('Tradução das magias', () => {
  it('toda magia tem nome e descrição em português', () => {
    const missing = SPELLS.filter((s) => !translation(s.key)?.name || !translation(s.key)?.desc).map((s) => s.name);
    expect(missing).toEqual([]);
  });

  it('o componente material é traduzido quando a magia tem um', () => {
    for (const s of raw) {
      const pt = translation(s.key)!;
      expect(!!pt.material, s.name).toBe(!!s.material_specified);
    }
  });

  it('"círculos superiores" e "melhoria de truque" são traduzidos quando o SRD tem', () => {
    for (const s of raw) {
      const pt = translation(s.key)!;
      expect(!!pt.higherLevel, s.name).toBe(!!s.higher_level || HIGHER_LEVEL_FROM_PDF.has(s.key));
    }
  });

  it('não há duas magias com o mesmo nome em português', () => {
    const names = SPELLS.map((s) => translation(s.key)!.name);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup).toEqual([]);
  });

  it('tempo de conjuração, alcance e duração saem sem inglês', () => {
    const english = /\b(feet|foot|mile|minute|hour|day|round|action|until|instantaneous|self|touch|special|sight)\b/i;
    for (const s of SPELLS) {
      const t = spellText(s);
      expect(`${t.castingTime} | ${t.range} | ${t.duration}`, s.name).not.toMatch(english);
    }
    expect(castingTimePt('bonus-action')).toBe('Ação Bônus');
    expect(rangePt('1 mile')).toBe('1 milha');
  });

  it('as descrições não ficaram em inglês nem em metros', () => {
    const englishWords = /\b(the|you|creature|damage|saving throw|spell slot)\b/i;
    for (const s of SPELLS) {
      const pt = translation(s.key)!;
      const text = `${pt.desc} ${pt.higherLevel ?? ''} ${pt.material ?? ''}`;
      expect(text, s.name).not.toMatch(englishWords);
      // "diâmetro" é permitido; "6 metros" não (o app usa pés).
      expect(text, s.name).not.toMatch(/\d+ metros?\b/);
    }
  });
});

describe('Magias citadas nos textos traduzidos', () => {
  const texts = {
    ...import.meta.glob<Record<string, Translation>>('./pt/classes/*.json', { eager: true, import: 'default' }),
    './pt/especies.json': especies as Record<string, Translation>,
    './pt/feats.json': feats as Record<string, Translation>,
  };
  // Mesma grafia de magias, mas são termos de regra: a propriedade de arma Light (Leve) e a maestria Slow (Lentidão).
  const NOT_SPELLS = /\b(?:Light \(Leve\)|Slow \(Lentidão\))/g;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const english = new RegExp(`\\b(?:${raw.map((s) => escape(s.name)).join('|')})\\b`, 'g');

  it('classes, espécies e feats citam magias pelo nome em português', () => {
    const found: string[] = [];
    for (const [file, entries] of Object.entries(texts)) {
      for (const [key, t] of Object.entries(entries)) {
        const text = `${t.name} ${t.desc ?? ''}`.replace(NOT_SPELLS, '');
        for (const m of text.match(english) ?? []) found.push(`${file} ${key}: ${m}`);
      }
    }
    expect(found).toEqual([]);
  });
});

describe('Tradução do equipamento', () => {
  it('todo item da loja e dos pacotes tem nome em português', () => {
    expect(ITEMS.filter((i) => !translation(`item/${i.key}`)?.name).map((i) => i.name)).toEqual([]);
  });

  it('item e magia com a mesma chave no SRD têm nomes separados (Shield)', () => {
    expect(itemName(ITEMS.find((i) => i.name === 'Shield')!)).toBe('Escudo');
    expect(translation('srd-2024_shield')?.name).toBe('Escudo Arcano');
  });

  it('toda ferramenta e todo idioma têm nome em português', () => {
    expect(TOOLS.filter((t) => !translation(`tool/${t.key}`)).map((t) => t.key)).toEqual([]);
    expect(['Common', ...STANDARD_LANGUAGES, ...RARE_LANGUAGES].filter((l) => !translation(`language/${l}`))).toEqual([]);
  });

  it('as chaves traduzidas existem nos dados (sem chave errada)', () => {
    const known = new Set([
      ...SPELLS.map((s) => s.key), ...ITEMS.map((i) => `item/${i.key}`),
      ...TOOLS.map((t) => `tool/${t.key}`), ...['Common', ...STANDARD_LANGUAGES, ...RARE_LANGUAGES].map((l) => `language/${l}`),
    ]);
    const stray = translatedKeys().filter((k) => /^(tool|language|item)\//.test(k) && !known.has(k));
    expect(stray).toEqual([]);
  });
});
