/* eslint-disable @next/next/no-img-element -- next/og (Satori) ne connaît que <img>. */
import { couperTitre, sousTitreCarte, tailleChiffre, tailleTitre } from "@/lib/carte";

// Mise en page des trois cartes 1200×1200 (JSX pour next/og : flexbox
// seulement, ni grid ni filter). Les données arrivent prêtes depuis route.js.

export const TAILLE = 1200;
const FOND = "#fbfaf8";
const NOIR = "#0d0d10";
const ENCRE = "#1c1d22";
const GRIS = "#8a8c96";
const ORANGE = "#f2552c";

// --- Éléments communs ---------------------------------------------------------

function Lueurs() {
  return (
    <>
      <div style={{ position: "absolute", left: 380, top: -200, width: 600, height: 500, borderRadius: "50%", backgroundImage: "radial-gradient(circle at center, rgba(180,160,255,.25) 0%, rgba(180,160,255,0) 70%)" }} />
      <div style={{ position: "absolute", left: 560, top: 120, width: 900, height: 1000, borderRadius: "50%", backgroundImage: "radial-gradient(circle at center, rgba(92,130,240,.55) 0%, rgba(92,130,240,0) 70%)" }} />
      <div style={{ position: "absolute", left: 380, top: 800, width: 700, height: 600, borderRadius: "50%", backgroundImage: "radial-gradient(circle at center, rgba(255,170,120,.45) 0%, rgba(255,170,120,0) 70%)" }} />
    </>
  );
}

function Logo() {
  return (
    <div style={{ position: "absolute", left: 72, top: 70, display: "flex", alignItems: "center", fontWeight: 500, fontSize: 30, letterSpacing: 9, color: ENCRE }}>
      <div style={{ width: 5, height: 46, backgroundColor: ENCRE, transform: "skewX(-22deg)", marginRight: 22 }} />
      PERLIMPINPIN
    </div>
  );
}

function Carte({ children }) {
  return (
    <div style={{ position: "relative", display: "flex", width: TAILLE, height: TAILLE, backgroundColor: FOND, overflow: "hidden", fontFamily: "Inter" }}>
      <Lueurs />
      <Logo />
      {children}
    </div>
  );
}

// Pied des cartes « chiffre » et « tient » : petit portrait rond, nom, score.
function Pied({ candidat, photo, score, appreciation }) {
  return (
    <div style={{ position: "absolute", left: 72, right: 72, bottom: 64, display: "flex", alignItems: "center" }}>
      {photo ? (
        <div style={{ display: "flex", width: 104, height: 104, borderRadius: 52, overflow: "hidden", backgroundColor: "#e3e9f7", marginRight: 26, justifyContent: "center" }}>
          <img src={photo} alt="" width={104} height={130} style={{ objectFit: "cover" }} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 800, fontSize: 36, letterSpacing: -0.5, color: NOIR }}>{candidat.nom}</div>
        <div style={{ display: "flex", marginTop: 6, fontWeight: 500, fontSize: 30, color: GRIS }}>
          Score Perlimpinpin :&nbsp;<span style={{ fontWeight: 800, color: appreciation.score }}>{score}/100</span>
        </div>
      </div>
    </div>
  );
}

// --- Les trois formats ----------------------------------------------------------

// Reprend le gabarit HTML/CSS de la skill perlimpinpin-thread-x (étape 4).
function CarteScore({ titre, candidat, photo, score, appreciation }) {
  const { noir, gris } = couperTitre(titre);
  const taille = tailleTitre(titre);
  const mots = [
    ...noir.split(" ").filter(Boolean).map((mot) => ({ mot, couleur: NOIR })),
    ...gris.split(" ").filter(Boolean).map((mot) => ({ mot, couleur: GRIS })),
  ];
  return (
    <Carte>
      {photo ? (
        <img src={photo} alt="" width={780} height={975} style={{ position: "absolute", left: 450, top: 225, objectFit: "contain" }} />
      ) : null}
      <div style={{ position: "absolute", left: 72, top: 215, width: 580, display: "flex", flexWrap: "wrap", fontWeight: 800, fontSize: taille, lineHeight: 0.98, letterSpacing: -taille * 0.04 }}>
        {mots.map(({ mot, couleur }, index) => (
          <span key={index} style={{ color: couleur, marginRight: taille * 0.22 }}>
            {mot}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: 76, top: 705, width: 44, height: 3, backgroundColor: GRIS }} />
      <div style={{ position: "absolute", left: 72, top: 740, width: 560, display: "flex", fontWeight: 500, fontSize: 36, lineHeight: 1.2, letterSpacing: -0.5, color: ENCRE }}>
        {sousTitreCarte(candidat.nom)}
      </div>
      <div style={{ position: "absolute", left: 72, top: 900, width: 430, height: 225, borderRadius: 22, backgroundColor: "rgba(255,255,255,.72)", border: "1px solid rgba(0,0,0,.06)", boxShadow: "0 10px 30px rgba(40,50,90,.08)", padding: "22px 28px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 17, letterSpacing: 4, fontWeight: 800, color: GRIS }}>SCORE PERLIMPINPIN</div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 2, fontWeight: 800, fontSize: 96, letterSpacing: -3, color: appreciation.score, lineHeight: 1 }}>
          {score}
          <span style={{ fontSize: 46, fontWeight: 500, color: GRIS, letterSpacing: -1 }}>/100</span>
        </div>
        <div style={{ position: "absolute", left: 24, bottom: 20, display: "flex", padding: "9px 22px", borderRadius: 999, backgroundColor: appreciation.pastilleFond, color: appreciation.pastilleTexte, fontWeight: 800, fontSize: 26 }}>
          {appreciation.label}
        </div>
      </div>
    </Carte>
  );
}

function CarteChiffre({ chiffre, candidat, photo, score, appreciation }) {
  return (
    <Carte>
      <div style={{ position: "absolute", left: 72, right: 72, top: 170, bottom: 230, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", fontWeight: 800, fontSize: tailleChiffre(chiffre.valeur), letterSpacing: -6, lineHeight: 1, color: ORANGE, whiteSpace: "nowrap" }}>
          {chiffre.valeur}
        </div>
        <div style={{ display: "flex", marginTop: 40, maxWidth: 960, fontWeight: 500, fontSize: 42, lineHeight: 1.25, letterSpacing: -0.5, color: ENCRE }}>
          {chiffre.explication}
        </div>
      </div>
      <Pied candidat={candidat} photo={photo} score={score} appreciation={appreciation} />
    </Carte>
  );
}

function Pictogramme({ ok }) {
  const couleur = ok ? "#1f9d55" : "#d92d20";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="22" fill={couleur} />
      {ok ? (
        <path d="M12 23 L19 30 L32 15" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M14 14 L30 30 M30 14 L14 30" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Colonne({ ok, titre, points }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 510, padding: "32px 34px", borderRadius: 22, backgroundColor: "rgba(255,255,255,.78)", border: "1px solid rgba(0,0,0,.06)", boxShadow: "0 10px 30px rgba(40,50,90,.08)" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Pictogramme ok={ok} />
        <div style={{ marginLeft: 16, fontWeight: 800, fontSize: 32, letterSpacing: -0.5, color: NOIR }}>{titre}</div>
      </div>
      {points.map((point, index) => (
        <div key={index} style={{ display: "flex", marginTop: 26, fontWeight: 500, fontSize: 31, lineHeight: 1.25, color: ENCRE }}>
          {point}
        </div>
      ))}
    </div>
  );
}

function CarteTient({ tient, candidat, photo, score, appreciation }) {
  return (
    <Carte>
      <div style={{ position: "absolute", left: 72, right: 72, top: 175, display: "flex", fontWeight: 800, fontSize: 64, lineHeight: 1.02, letterSpacing: -2.5, color: NOIR }}>
        {tient.titre}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 360, display: "flex", justifyContent: "space-between" }}>
        <Colonne ok titre="Ce qui tient" points={tient.tient} />
        <Colonne ok={false} titre="Ce qui ne tient pas" points={tient.tient_pas} />
      </div>
      <Pied candidat={candidat} photo={photo} score={score} appreciation={appreciation} />
    </Carte>
  );
}


// Élément de la carte demandée. `commun` : { candidat, photo, score, appreciation }.
export function elementCarte({ format, titre, reseaux, ...commun }) {
  if (format === "chiffre") return <CarteChiffre chiffre={reseaux.chiffre} {...commun} />;
  if (format === "tient") return <CarteTient tient={reseaux.tient} {...commun} />;
  return <CarteScore titre={titre} {...commun} />;
}
