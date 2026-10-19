// Fichas salvas no localStorage do navegador, com exportação/importação em JSON.
import { useEffect, useState } from 'react';
import { newCharacter, normalizeCharacter, type Character } from './engine/character';

const STORAGE_KEY = 'fichas-dnd-5.5e';

function load(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as Partial<Character>[]) : [];
    if (list.length) return list.map(normalizeCharacter);
  } catch {
    /* armazenamento indisponível ou corrompido: começa do zero */
  }
  return [newCharacter()];
}

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>(load);
  const [currentId, setCurrentId] = useState(characters[0].id);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch {
      /* sem armazenamento: o app funciona, mas não salva */
    }
  }, [characters]);

  const current = characters.find((c) => c.id === currentId) ?? characters[0];

  const update = (patch: Partial<Character>) =>
    setCharacters((list) => list.map((c) => (c.id === current.id ? { ...c, ...patch } : c)));

  const add = (c: Character) => {
    setCharacters((list) => [...list, c]);
    setCurrentId(c.id);
  };

  const remove = () => {
    const rest = characters.filter((c) => c.id !== current.id);
    const next = rest.length ? rest : [newCharacter()];
    setCharacters(next);
    setCurrentId(next[0].id);
  };

  const duplicate = () => add({ ...structuredClone(current), id: newCharacter().id, name: `${current.name} (cópia)` });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${current.name.replace(/[^\w\- ]+/g, '').trim() || 'ficha'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    const data = JSON.parse(await file.text()) as Partial<Character>;
    add(normalizeCharacter({ ...data, id: newCharacter().id }));
  };

  return { characters, current, setCurrentId, update, add, remove, duplicate, exportJson, importJson };
}
