import { toc, flatToc } from "./toc.js";

// Carica automaticamente:
// 1) i file di categoria in questa cartella (origini.js, dei-olimpici.js, ecc.)
//    → contenuto breve, il primo che abbiamo scritto
// 2) i file dentro voci/ (uno per personaggio/voce, es. voci/zeus.js)
//    → capitoli lunghi (decine di pagine), hanno SEMPRE la precedenza se
//      esiste una voce con lo stesso id in entrambi i posti
//
// Per aggiungere un capitolo lungo: crea src/data/voci/nome-voce.js con
//   export const content = { "id-della-voce": { subtitle, pages: [...] } };
// L'id deve essere identico a quello in toc.js.

const categoryModules = import.meta.glob("./*.js", { eager: true });
const vociModules = import.meta.glob("./voci/*.js", { eager: true });

const allContent = {};

for (const path in categoryModules) {
  const match = path.match(/^\.\/(.+)\.js$/);
  if (!match) continue;
  const key = match[1];
  if (key === "toc" || key === "index") continue;
  Object.assign(allContent, categoryModules[path].content || {});
}

for (const path in vociModules) {
  Object.assign(allContent, vociModules[path].content || {});
}

// Restituisce la voce completa (dati del sommario + contenuto), o null se
// la pagina non è ancora stata scritta.
export function getVoce(id) {
  const tocEntry = flatToc.find((v) => v.id === id);
  if (!tocEntry) return null;
  return { ...tocEntry, body: allContent[id] || null };
}

export { toc, flatToc };
