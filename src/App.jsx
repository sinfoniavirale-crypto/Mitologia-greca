import { useState, useEffect, useRef } from "react";
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

// Contenuto "puro" di una pagina (titolo, kicker, progresso, corpo), usato sia
// per la pagina corrente sia per l'anteprima della pagina sotto durante lo swipe.
function PageView({ voce, isChapter, pageIndex, totalPages }) {
  return (
    <>
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
    </>
  );
}

// Ombra dinamica sulla pagina che si sta girando, per dare profondità 3D.
function flipShadow(angle) {
  const progress = Math.min(1, Math.abs(angle) / 180);
  return `0 ${10 + 20 * progress}px ${30 + 40 * progress}px rgba(0,0,0,${0.15 + 0.3 * progress})`;
}

function Voce({ id, startAt, onSelect, onSommario }) {
  const voce = getVoce(id);
  const isChapter = Array.isArray(voce?.body?.pages);
  const totalPages = isChapter ? voce.body.pages.length : 1;

  const [pageIndex, setPageIndex] = useState(
    isChapter && startAt === "end" ? totalPages - 1 : 0
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const autoPlayRef = useRef(false);

  // Stato dello swipe/flip: { active, dir: 'next'|'prev'|null, angle, committing }
  const [flip, setFlip] = useState({ active: false, dir: null, angle: 0, committing: false });
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const containerRef = useRef(null);

  const index = flatToc.findIndex((v) => v.id === id);
  const prevVoce = index > 0 ? flatToc[index - 1] : null;
  const nextVoce = index < flatToc.length - 1 ? flatToc[index + 1] : null;

  // Ferma la lettura quando si esce del tutto da questa voce.
  useEffect(() => {
    return () => {
      autoPlayRef.current = false;
      TextToSpeech.stop().catch(() => {});
    };
  }, [id]);

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

  // Cosa mostrare sotto la pagina che sta girando, se si va avanti.
  let nextTarget = null;
  if (canGoNextPage) {
    nextTarget = { voce, isChapter, pageIndex: pageIndex + 1, totalPages };
  } else if (nextVoce) {
    const nv = getVoce(nextVoce.id);
    const nvIsChapter = Array.isArray(nv?.body?.pages);
    const nvTotal = nvIsChapter ? nv.body.pages.length : 1;
    nextTarget = { voce: nv, isChapter: nvIsChapter, pageIndex: 0, totalPages: nvTotal };
  }

  // Cosa mostrare sotto la pagina che sta girando, se si torna indietro.
  let prevTarget = null;
  if (canGoPrevPage) {
    prevTarget = { voce, isChapter, pageIndex: pageIndex - 1, totalPages };
  } else if (prevVoce) {
    const pv = getVoce(prevVoce.id);
    const pvIsChapter = Array.isArray(pv?.body?.pages);
    const pvTotal = pvIsChapter ? pv.body.pages.length : 1;
    prevTarget = {
      voce: pv,
      isChapter: pvIsChapter,
      pageIndex: pvIsChapter ? pvTotal - 1 : 0,
      totalPages: pvTotal,
    };
  }

  const stopSpeaking = async () => {
    autoPlayRef.current = false;
    await TextToSpeech.stop().catch(() => {});
    setIsSpeaking(false);
  };

  const handlePrev = async () => {
    if (isSpeaking) await stopSpeaking();
    if (canGoPrevPage) {
      setPageIndex((p) => p - 1);
    } else if (prevVoce) {
      onSelect(prevVoce.id, "end");
    }
  };

  const handleNext = async () => {
    if (isSpeaking) await stopSpeaking();
    if (canGoNextPage) {
      setPageIndex((p) => p + 1);
    } else if (nextVoce) {
      onSelect(nextVoce.id, "start");
    }
  };

  // Legge una pagina e, se siamo in modalità lettura continua, passa da
  // sola alla pagina successiva finché non finisce il capitolo.
  const speakPage = async (pIndex) => {
    const text = getReadableText(voce, isChapter, pIndex);
    if (!text) {
      autoPlayRef.current = false;
      return;
    }
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
    } catch (e) {
      // interrotta manualmente o errore: nessuna azione necessaria
    }
    setIsSpeaking(false);

    if (autoPlayRef.current && isChapter && pIndex < totalPages - 1) {
      const next = pIndex + 1;
      setPageIndex(next);
      speakPage(next);
    } else {
      autoPlayRef.current = false;
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      await stopSpeaking();
      return;
    }
    autoPlayRef.current = true;
    speakPage(pageIndex);
  };

  // --- Gestione dello swipe con effetto pagina che si piega in 3D ---

  const onPointerDown = (e) => {
    if (flip.committing) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const width = containerRef.current?.offsetWidth || window.innerWidth;
    const deltaX = e.clientX - startXRef.current;
    if (deltaX < -2) {
      if (!nextTarget) return;
      const angle = Math.max(-180, (deltaX / width) * 180);
      setFlip({ active: true, dir: "next", angle, committing: false });
    } else if (deltaX > 2) {
      if (!prevTarget) return;
      const angle = Math.min(180, (deltaX / width) * 180);
      setFlip({ active: true, dir: "prev", angle, committing: false });
    }
  };

  const finishFlip = (dir) => {
    setTimeout(async () => {
      if (dir === "next") await handleNext();
      else await handlePrev();
      setFlip({ active: false, dir: null, angle: 0, committing: false });
    }, 280);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!flip.dir) return;

    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const absAngle = Math.abs(flip.angle);
    const velocity = absAngle / elapsed;
    const shouldCommit = absAngle >= 90 || (absAngle >= 18 && velocity > 0.5);

    if (shouldCommit) {
      const dir = flip.dir;
      setFlip((f) => ({ ...f, committing: true, angle: dir === "next" ? -180 : 180 }));
      finishFlip(dir);
    } else {
      setFlip((f) => ({ ...f, committing: true, angle: 0 }));
      setTimeout(() => setFlip({ active: false, dir: null, angle: 0, committing: false }), 280);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", perspective: "1500px", touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {flip.active && flip.dir === "next" && nextTarget && (
        <article
          className="page-shell voce-page"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <PageView
            voce={nextTarget.voce}
            isChapter={nextTarget.isChapter}
            pageIndex={nextTarget.pageIndex}
            totalPages={nextTarget.totalPages}
          />
        </article>
      )}
      {flip.active && flip.dir === "prev" && prevTarget && (
        <article
          className="page-shell voce-page"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <PageView
            voce={prevTarget.voce}
            isChapter={prevTarget.isChapter}
            pageIndex={prevTarget.pageIndex}
            totalPages={prevTarget.totalPages}
          />
        </article>
      )}

      <article
        className="page-shell voce-page"
        style={{
          position: flip.active ? "absolute" : "relative",
          inset: 0,
          zIndex: 2,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          transformOrigin: flip.dir === "prev" ? "100% 50%" : "0% 50%",
          transform: flip.active ? `rotateY(${flip.angle}deg)` : "none",
          transition: flip.committing ? "transform 280ms ease" : "none",
          boxShadow: flip.active ? flipShadow(flip.angle) : "none",
        }}
      >
        <PageView voce={voce} isChapter={isChapter} pageIndex={pageIndex} totalPages={totalPages} />

        <div className={voce.body ? "speak-bar-spacer" : "nav-only-spacer"} />

        <div className="page-footer">
          {voce.body && (
            <button className="speak-button" onClick={handleSpeak}>
              {isSpeaking ? "⏹ Ferma lettura" : "🔊 Ascolta (avanza da sola)"}
            </button>
          )}
          <nav className="page-nav">
            <button
              className="page-nav-link page-nav-center"
              onClick={onSommario}
              style={{ margin: "0 auto" }}
            >
              Sommario
            </button>
          </nav>
        </div>
      </article>
    </div>
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
