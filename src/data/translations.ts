// Traduções para o português feitas pelo projeto: não existe SRD 5.2 oficial em português.
// Ficam fora de src/data/srd/ para o `npm run fetch-srd` não apagá-las. Chaves e glossário: pt/GLOSSARIO.md.

export interface Translation {
  name: string;
  desc?: string;
}

// Junta todos os arquivos de pt/ (uma classe por arquivo, espécies, feats).
const files = import.meta.glob<Record<string, Translation>>('./pt/**/*.json', { eager: true, import: 'default' });
const PT: Record<string, Translation> = Object.assign({}, ...Object.values(files));

/** Tradução de um item do SRD; sem tradução, o app mostra o texto original em inglês. */
export const translation = (key: string): Translation | undefined => PT[key];

/** "Alerta (Alert)" quando há tradução; senão só o nome original. */
export function labelPt(key: string, original: string): string {
  const pt = PT[key]?.name;
  return pt && pt !== original ? `${pt} (${original})` : original;
}
