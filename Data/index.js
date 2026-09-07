import { toc, flatToc } from "./toc.js";

// Carica automaticamente tutti i file di categoria in questa cartella.
// Aggiungere una nuova categoria è automatico: basta creare il file .js
// e aggiungerlo al sommario in toc.js.
const modules = import.meta.glob("./*.js", { eager: true });

const contentByCategory = {};
for (const path in modules) {
  const match = path.match(/\.\/(.+)\.js$/);
  if (!match) continue;
  const key = match[1];
  if (key === "toc" || key === "index") continue;
  contentByCategory[key] = modules[path].content || {};
}

// Restituisce la voce completa (dati del sommario + contenuto), o null se
// la pagina non è ancora stata scritta.
export function getVoce(id) {
  const tocEntry = flatToc.find((v) => v.id === id);
  if (!tocEntry) return null;
  const categoryContent = contentByCategory[tocEntry.category] || {};
  const body = categoryContent[id] || null;
  return { ...tocEntry, body };
}

export { toc, flatToc };
