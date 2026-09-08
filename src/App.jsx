import { useState, useEffect } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
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
                  <button className="toc-entry" onClick={() => onSelect(voce.id, "start")}>
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

// Rende il contenuto "vecchio formato" (intro + sections) su un'unica pagina.
function LegacyBody({ body }) {
  return (
    <>
      {body.subtitle && <p className="voce-subtitle">{body.subtitle}</p>}
      <div className="voce-divider" aria-hidden="true" />
      {body.intro && <p className="voce-intro">{body.intro}</p>}
      {body.sections?.map((sec) => (
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
  );
}

// Rende una singola pagina del "nuovo formato" (capitolo lungo, pages: [...]).
function ChapterPage({ body, pageIndex }) {
  const page = body.pages[pageIndex];
  return (
    <>
      {pageIndex === 0 && body.subtitle && (
        <>
          <p className="voce-subtitle">{body.subtitle}</p>
          <div className="voce-divider" aria-hidden="true" />
        </>
      )}
      {page.heading && <h2 className="voce-heading">{page.heading}</h2>}
      {page.paragraphs?.map((para, i) => (
        <p key={i} className="voce-page-paragraph">
          {para}
        </p>
      ))}
    </>
  );
}

// Estrae il testo semplice della pagina/voce corrente, da leggere ad alta voce.
function getReadableText(voce, isChapter, pageIndex) {
  if (!voce.body) return "";
  if (isChapter) {
    const page = voce.body.pages[pageIndex];
    const parts = [];
    if (pageIndex === 0 && voce.body.subtitle) parts.push(voce.body.subtitle);
    if (page.heading) parts.push(page.heading);
    if (page.paragraphs) parts.push(...page.paragraphs);
    return parts.join(". ");
  }
  const parts = [];
  if (voce.body.subtitle) parts.push(voce.body.subtitle);
  if (voce.body.intro) parts.push(voce.body.intro);
  voce.body.sections?.forEach((sec) => {
    parts.push(sec.heading);
    parts.push(sec.text.replace(/\n/g, ". "));
  });
  return parts.join(". ");
}

function Voce({ id, startAt, onSelect, onSommario }) {
  const voce = getVoce(id);
  const isChapter = Array.isArray(voce?.body?.pages);
  const totalPages = isChapter ? voce.body.pages.length : 1;

  const [pageIndex, setPageIndex] = useState(
    isChapter && startAt === "end" ? totalPages - 1 : 0
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  const index = flatToc.findIndex((v) => v.id === id);
  const prevVoce = index > 0 ? flatToc[index - 1] : null;
  const nextVoce = index < flatToc.length - 1 ? flatToc[index + 1] : null;

  // Ferma la lettura ogni volta che si cambia pagina o si esce dalla voce.
  useEffect(() => {
    return () => {
      TextToSpeech.stop().catch(() => {});
    };
  }, [id, pageIndex]);

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

  const canGoPrevPage = isChapter && pageIndex > 0;
  const canGoNextPage = isChapter && pageIndex < totalPages - 1;

  const handlePrev = () => {
    if (canGoPrevPage) {
      setPageIndex((p) => p - 1);
    } else if (prevVoce) {
      onSelect(prevVoce.id, "end");
    }
  };

  const handleNext = () => {
    if (canGoNextPage) {
      setPageIndex((p) => p + 1);
    } else if (nextVoce) {
      onSelect(nextVoce.id, "start");
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      await TextToSpeech.stop();
      setIsSpeaking(false);
      return;
    }
    const text = getReadableText(voce, isChapter, pageIndex);
    if (!text) return;
    setIsSpeaking(true);
    try {
      await TextToSpeech.speak({
        text,
        lang: "it-IT",
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: "ambient",
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <article className="page-shell voce-page">
      <p className="voce-kicker">
        {voce.part} — {voce.partTitle}
      </p>

      <h1 className="voce-title">{voce.title}</h1>

      {isChapter && (
        <p className="voce-progress">
          Pagina {pageIndex + 1} di {totalPages}
        </p>
      )}

      {voce.body ? (
        isChapter ? (
          <ChapterPage body={voce.body} pageIndex={pageIndex} />
        ) : (
          <LegacyBody body={voce.body} />
        )
      ) : (
        <div className="voce-empty">
          <p>Questa pagina è ancora in preparazione.</p>
          <p className="voce-empty-sub">Tornerà presto, con il suo racconto completo.</p>
        </div>
      )}

      <div className={voce.body ? "speak-bar-spacer" : "nav-only-spacer"} />

      <div className="page-footer">
        {voce.body && (
          <button className="speak-button" onClick={handleSpeak}>
            {isSpeaking ? "⏹ Ferma lettura" : "🔊 Ascolta questa pagina"}
          </button>
        )}
        <nav className="page-nav">
          <button
            className="page-nav-link"
            disabled={!canGoPrevPage && !prevVoce}
            onClick={handlePrev}
          >
            ← Pagina precedente
          </button>
          <button className="page-nav-link page-nav-center" onClick={onSommario}>
            Sommario
          </button>
          <button
            className="page-nav-link"
            disabled={!canGoNextPage && !nextVoce}
            onClick={handleNext}
          >
            Pagina successiva →
          </button>
        </nav>
      </div>
    </article>
  );
}

export default function App() {
  const [view, setView] = useState("cover"); // cover | toc | voce
  const [currentId, setCurrentId] = useState(null);
  const [startAt, setStartAt] = useState("start");

  const goToSommario = () => setView("toc");
  const openVoce = (id, edge = "start") => {
    setCurrentId(id);
    setStartAt(edge);
    setView("voce");
  };

  return (
    <div className="book-app">
      {view === "cover" && <Cover onOpen={goToSommario} />}
      {view === "toc" && <Sommario onSelect={openVoce} />}
      {view === "voce" && (
        <Voce
          key={currentId}
          id={currentId}
          startAt={startAt}
          onSelect={openVoce}
          onSommario={goToSommario}
        />
      )}
    </div>
  );
}
