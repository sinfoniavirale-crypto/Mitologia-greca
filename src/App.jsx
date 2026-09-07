import { useState } from "react";
import { toc, flatToc, getVoce } from "./data/index.js";
import "./App.css";

function Cover({ onOpen }) {
  return (
    <div className="cover">
      <div className="cover-frame">
        <div className="cover-ornament" aria-hidden="true">
          ⚜
        </div>
        <p className="cover-eyebrow">Il grande libro dei miti, degli dèi e degli eroi</p>
        <h1 className="cover-title">
          MITOLOGIA
          <br />
          GRECA
        </h1>
        <div className="cover-rule" aria-hidden="true" />
        <button className="cover-button" onClick={onOpen}>
          Apri il libro
        </button>
      </div>
    </div>
  );
}

function Sommario({ onSelect }) {
  return (
    <div className="page-shell">
      <header className="toc-header">
        <p className="toc-eyebrow">Sommario</p>
        <h1 className="toc-title">Indice del libro</h1>
      </header>
      <div className="toc-body">
        {toc.map((parte) => (
          <section key={parte.part} className="toc-part">
            <p className="toc-part-label">{parte.part}</p>
            <h2 className="toc-part-title">{parte.title}</h2>
            <ul className="toc-list">
              {parte.voci.map((voce) => (
                <li key={voce.id}>
                  <button className="toc-entry" onClick={() => onSelect(voce.id)}>
                    <span className="toc-entry-title">{voce.title}</span>
                    <span className="toc-entry-dots" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Voce({ id, onSelect, onSommario }) {
  const voce = getVoce(id);
  const index = flatToc.findIndex((v) => v.id === id);
  const prev = index > 0 ? flatToc[index - 1] : null;
  const next = index < flatToc.length - 1 ? flatToc[index + 1] : null;

  if (!voce) {
    return (
      <div className="page-shell">
        <p>Voce non trovata.</p>
        <button className="nav-link" onClick={onSommario}>
          Torna al Sommario
        </button>
      </div>
    );
  }

  return (
    <article className="page-shell voce-page" key={id}>
      <p className="voce-kicker">
        {voce.part} — {voce.partTitle}
      </p>

      <h1 className="voce-title">{voce.title}</h1>

      {voce.body ? (
        <>
          {voce.body.subtitle && <p className="voce-subtitle">{voce.body.subtitle}</p>}
          <div className="voce-divider" aria-hidden="true" />
          {voce.body.intro && <p className="voce-intro">{voce.body.intro}</p>}

          {voce.body.sections?.map((sec) => (
            <section className="voce-section" key={sec.heading}>
              <h2 className="voce-heading">{sec.heading}</h2>
              {sec.heading === "Simboli" ? (
                <ul className="voce-symbols">
                  {sec.text.split("\n").map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                sec.text.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
              )}
            </section>
          ))}
        </>
      ) : (
        <div className="voce-empty">
          <p>Questa pagina è ancora in preparazione.</p>
          <p className="voce-empty-sub">Tornerà presto, con il suo racconto completo.</p>
        </div>
      )}

      <nav className="page-nav">
        <button
          className="page-nav-link"
          disabled={!prev}
          onClick={() => prev && onSelect(prev.id)}
        >
          ← Pagina precedente
        </button>
        <button className="page-nav-link page-nav-center" onClick={onSommario}>
          Sommario
        </button>
        <button
          className="page-nav-link"
          disabled={!next}
          onClick={() => next && onSelect(next.id)}
        >
          Pagina successiva →
        </button>
      </nav>
    </article>
  );
}

export default function App() {
  const [view, setView] = useState("cover"); // cover | toc | voce
  const [currentId, setCurrentId] = useState(null);

  const goToSommario = () => setView("toc");
  const openVoce = (id) => {
    setCurrentId(id);
    setView("voce");
  };

  return (
    <div className="book-app">
      {view === "cover" && <Cover onOpen={goToSommario} />}
      {view === "toc" && <Sommario onSelect={openVoce} />}
      {view === "voce" && (
        <Voce id={currentId} onSelect={openVoce} onSommario={goToSommario} />
      )}
    </div>
  );
}
