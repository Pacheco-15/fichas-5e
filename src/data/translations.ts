// Traduções para o português feitas pelo projeto: não existe SRD 5.2 oficial em português.
// Ficam fora de src/data/srd/ para o `npm run fetch-srd` não apagá-las. Chaves e glossário: pt/GLOSSARIO.md.

export interface Translation {
  name: string;
  desc?: string;
  /** Magias: o texto de "Using a Higher-Level Spell Slot" / "Cantrip Upgrade". */
  higherLevel?: string;
  /** Magias: o componente material, ex.: "uma pitada de enxofre". */
  material?: string;
}

// Junta todos os arquivos de pt/ (uma classe por arquivo, espécies, feats, magias, equipamento).
const files = import.meta.glob<Record<string, Translation>>('./pt/**/*.json', { eager: true, import: 'default' });
const PT: Record<string, Translation> = Object.assign({}, ...Object.values(files));

/** Tradução de um item do SRD; sem tradução, o app mostra o texto original em inglês. */
export const translation = (key: string): Translation | undefined => PT[key];

/** Todas as chaves traduzidas (para os testes de cobertura). */
export const translatedKeys = () => Object.keys(PT);

/** "Alerta (Alert)" quando há tradução; senão só o nome original. */
export function labelPt(key: string, original: string): string {
  const pt = PT[key]?.name;
  return pt && pt !== original ? `${pt} (${original})` : original;
}

/** Só o nome em português, ou o original sem tradução. */
export const namePt = (key: string, original: string): string => PT[key]?.name ?? original;
