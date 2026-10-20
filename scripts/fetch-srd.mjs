// Baixa os dados do SRD 5.2 (System Reference Document 5.2, CC-BY-4.0)
// da API do Open5e e salva em src/data/srd/*.json.
// Uso: npm run fetch-srd
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'srd');
const BASE = 'https://api.open5e.com/v2';
const ENDPOINTS = ['classes', 'species', 'backgrounds', 'feats', 'spells', 'weapons', 'armor', 'items'];

// Campos que não usamos e só incham os arquivos.
const DROP = new Set(['document', 'crossreferences', 'url']);

function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (!DROP.has(k)) out[k] = strip(v);
    return out;
  }
  return value;
}

async function fetchAll(endpoint) {
  const results = [];
  let url = `${BASE}/${endpoint}/?document__key=srd-2024&limit=100&format=json`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
    const page = await res.json();
    results.push(...page.results);
    url = page.next;
  }
  return results.map(strip).sort((a, b) => a.key.localeCompare(b.key));
}

await mkdir(OUT, { recursive: true });
for (const endpoint of ENDPOINTS) {
  const data = await fetchAll(endpoint);
  await writeFile(join(OUT, `${endpoint}.json`), JSON.stringify(data, null, 1));
  console.log(`${endpoint}: ${data.length}`);
}
await writeFile(
  join(OUT, 'LICENSE.md'),
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, ' +
    'available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 ' +
    'International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.\n\n' +
    'Data obtained via the Open5e API (https://open5e.com).\n',
);
