"use client";

import { useEffect, useRef, useState } from "react";
import { COULEURS_ORIENTATION } from "./couleurs-orientation";

// Triangle des trois leviers : chaque candidat est placé selon la part de ses
// mesures retenues dans chaque levier (`parts`, calculées côté serveur par
// src/lib/releve-securite.js), et coloré selon l'orientation de ses mesures
// du levier 3. Le tracé est en SVG ; ronds, libellés et bulle sont en HTML
// par-dessus (positions en %), pour garder une taille de texte lisible sur
// téléphone.

// Coins du triangle dans un repère 100 × 100 : levier 1 en haut, levier 2 en
// bas à gauche, levier 3 en bas à droite.
const COINS = { moyens: [50, 13], responsabilite: [10, 82], methodes: [90, 82] };

function position(parts) {
  const x = parts.moyens * COINS.moyens[0] + parts.responsabilite * COINS.responsabilite[0] + parts.methodes * COINS.methodes[0];
  const y = parts.moyens * COINS.moyens[1] + parts.responsabilite * COINS.responsabilite[1] + parts.methodes * COINS.methodes[1];
  return { x, y };
}

// Ronds placés au même endroit (ex. deux candidats 100 % levier 3) : décalés
// côte à côte, en pixels, pour rester tous visibles.
function decalerSuperposes(points) {
  const groupes = [];
  for (const point of points) {
    const groupe = groupes.find((g) => Math.hypot(g[0].x - point.x, g[0].y - point.y) < 1.5);
    if (groupe) groupe.push(point);
    else groupes.push([point]);
  }
  return groupes.flatMap((groupe) =>
    groupe.map((point, i) => ({ ...point, decalage: (i - (groupe.length - 1) / 2) * 14 })),
  );
}

const texteLibelle = (points) => points.map((p) => `${p.nomTri} (${p.total})`).join(" · ");

// Cadre trop étroit (téléphone) pour écrire les libellés dans le triangle :
// ils passent alors en liste sous le graphique.
const petitCadre = (largeur) => largeur < 480;

// Boîtes possibles d'un libellé en pixels (cadre carré de `largeur` px de
// côté), par ordre de préférence : au-dessus du point, en dessous, à droite,
// à gauche (près du coin du haut : à droite d'abord). Toujours ramenées dans
// le cadre. Largeur du texte estimée d'après son nombre de caractères.
function boitesPossibles(groupe, largeur) {
  const px = (groupe.x / 100) * largeur;
  const py = (groupe.y / 100) * largeur;
  const l = texteLibelle(groupe.points).length * 6.8 + 8;
  const h = 18;
  const centre = groupe.x > 75 ? px + 10 - l : groupe.x < 25 ? px - 10 : px - l / 2;
  const dessus = { gauche: centre, haut: py - 13 - h };
  const dessous = { gauche: centre, haut: py + 13 };
  const droite = { gauche: px + 13, haut: py - h / 2 };
  const gauche = { gauche: px - 13 - l, haut: py - h / 2 };
  const ordre = groupe.y < 25 ? [droite, gauche, dessous] : [dessus, dessous, droite, gauche];
  return ordre.map((b) => ({ ...b, gauche: Math.min(Math.max(b.gauche, 0), largeur - l), l, h }));
}

const chevauche = (a, b) =>
  a.gauche < b.gauche + b.l + 3 && b.gauche < a.gauche + a.l + 3 && a.haut < b.haut + b.h && b.haut < a.haut + a.h;

// Place chaque libellé à la première position libre (ni sur un autre
// libellé, ni sur un rond). Si aucune ne l'est, le libellé est réuni avec le
// plus proche déjà placé (au centre du groupe) et on recommence, jusqu'à ce
// qu'aucun ne chevauche plus rien.
function placerLibelles(points, largeur) {
  const ronds = points.map((p) => ({
    gauche: (p.x / 100) * largeur + p.decalage - 10,
    haut: (p.y / 100) * largeur - 10,
    l: 20,
    h: 20,
  }));
  let groupes = points.map((p) => ({ x: p.x, y: p.y, points: [p] })).sort((a, b) => a.x - b.x);
  for (;;) {
    const places = [];
    let conflit = null;
    for (let i = 0; i < groupes.length && !conflit; i++) {
      const g = groupes[i];
      const libre = boitesPossibles(g, largeur).find(
        (b) => !places.some((p) => chevauche(p.boite, b)) && !ronds.some((r) => chevauche(r, b)),
      );
      if (libre) {
        places.push({ ...g, boite: libre, rang: i });
      } else {
        const proche = places.reduce(
          (meilleur, p) => (!meilleur || Math.hypot(p.x - g.x, p.y - g.y) < Math.hypot(meilleur.x - g.x, meilleur.y - g.y) ? p : meilleur),
          null,
        );
        // Premier libellé sans place libre : on le garde au-dessus.
        if (!proche) places.push({ ...g, boite: boitesPossibles(g, largeur)[0], rang: i });
        else conflit = [proche.rang, i];
      }
    }
    if (!conflit) return places;
    const fusion = [...groupes[conflit[0]].points, ...groupes[conflit[1]].points].sort((a, b) => a.x - b.x);
    groupes = groupes
      .filter((_, k) => !conflit.includes(k))
      .concat({
        x: fusion.reduce((s, p) => s + p.x, 0) / fusion.length,
        y: fusion.reduce((s, p) => s + p.y, 0) / fusion.length,
        points: fusion,
      })
      .sort((a, b) => a.x - b.x);
  }
}

// Placement de la bulle par rapport à son point : à droite près du coin du
// haut (en dessous sur téléphone, faute de place), au-dessus ailleurs,
// alignée sur le bord près des côtés pour ne pas sortir du cadre.
function styleAncre(x, y, ecart, petit) {
  if (y < 25 && petit) return { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, ${ecart}px)` };
  if (y < 25) return { left: `${x}%`, top: `${y}%`, transform: `translate(${ecart}px, -50%)` };
  const tx = x > 75 ? "calc(-100% + 10px)" : x < 25 ? "-10px" : "-50%";
  return { left: `${x}%`, top: `${y}%`, transform: `translate(${tx}, calc(-100% - ${ecart}px))` };
}

function NumeroLevier({ numero }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-zinc-100 text-[11px] font-extrabold text-zinc-600"
    >
      {numero}
    </span>
  );
}

export default function TriangleLeviers({ candidats, onglets, legende }) {
  const [actif, setActif] = useState(null);
  // Largeur du cadre en pixels, pour savoir quels libellés se chevauchent.
  const cadre = useRef(null);
  const [largeur, setLargeur] = useState(640);
  useEffect(() => {
    const element = cadre.current;
    if (!element) return undefined;
    setLargeur(element.clientWidth);
    const observateur = new ResizeObserver(([entree]) => setLargeur(entree.contentRect.width));
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);
  const titreOnglet = (id) => onglets.find((o) => o.id === id)?.titre ?? "";
  const libelleCouleur = (id) => legende.find((l) => l.id === id)?.label ?? "";

  const points = decalerSuperposes(
    candidats.filter((c) => c.parts).map((c) => ({ ...c, ...position(c.parts) })),
  );
  const petit = petitCadre(largeur);
  const libelles = petit ? [] : placerLibelles(points, largeur);
  const pointActif = points.find((p) => p.candidat === actif);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div ref={cadre} className="relative mb-14 aspect-square w-full sm:mb-10">
        <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 h-full w-full">
          <polygon
            points={[COINS.moyens, COINS.responsabilite, COINS.methodes].map((c) => c.join(",")).join(" ")}
            className="fill-white stroke-zinc-300"
            strokeWidth="0.4"
            strokeLinejoin="round"
          />
        </svg>

        {/* Coins : titre de chaque levier (onglets du JSON). */}
        <div className="absolute left-1/2 top-0 flex w-[60%] -translate-x-1/2 items-start justify-center gap-1.5 text-center text-xs font-semibold leading-snug text-zinc-700 sm:text-sm">
          <NumeroLevier numero={1} />
          <span>{titreOnglet(1)}</span>
        </div>
        <div className="absolute left-0 top-[91%] flex w-[46%] items-start gap-1.5 text-xs font-semibold leading-snug text-zinc-700 sm:text-sm">
          <NumeroLevier numero={2} />
          <span>{titreOnglet(2)}</span>
        </div>
        <div className="absolute right-0 top-[91%] flex w-[46%] flex-row-reverse items-start gap-1.5 text-right text-xs font-semibold leading-snug text-zinc-700 sm:text-sm">
          <NumeroLevier numero={3} />
          <span>{titreOnglet(3)}</span>
        </div>

        {points.map((point) => (
          <button
            key={point.candidat}
            type="button"
            aria-label={`${point.candidat} (${point.total})`}
            aria-describedby={actif === point.candidat ? "bulle-triangle" : undefined}
            onMouseEnter={() => setActif(point.candidat)}
            onMouseLeave={() => setActif(null)}
            onFocus={() => setActif(point.candidat)}
            onBlur={() => setActif(null)}
            onClick={() => setActif((a) => (a === point.candidat ? null : point.candidat))}
            className={`absolute h-4 w-4 rounded-full shadow-[0_0_0_2px_white] transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ms-noir) ${COULEURS_ORIENTATION[point.couleur]}`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: `translate(calc(-50% + ${point.decalage}px), -50%)`,
            }}
          />
        ))}

        {libelles.map((groupe) => (
          <span
            key={groupe.points.map((p) => p.candidat).join("|")}
            aria-hidden="true"
            className="pointer-events-none absolute flex items-center whitespace-nowrap rounded bg-white/85 px-1 text-xs font-semibold text-zinc-800"
            style={{ left: groupe.boite.gauche, top: groupe.boite.haut, height: groupe.boite.h }}
          >
            {texteLibelle(groupe.points)}
          </span>
        ))}

        {pointActif ? (
          <div
            id="bulle-triangle"
            role="tooltip"
            className="pointer-events-none absolute z-10 flex w-64 flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-lg"
            style={styleAncre(pointActif.x, pointActif.y, 16, petit)}
          >
            <div>
              <p className="text-sm font-bold text-zinc-950">{pointActif.candidat}</p>
              <p className="text-xs text-zinc-500">{pointActif.parti}</p>
            </div>
            <ul className="flex flex-col gap-1.5 text-xs leading-snug text-zinc-700">
              {[
                [1, pointActif.moyens],
                [2, pointActif.responsabilite],
                [3, pointActif.methodes],
              ].map(([numero, nombre]) => (
                <li key={numero} className="flex items-start gap-2">
                  <NumeroLevier numero={numero} />
                  <span className="flex-1">{titreOnglet(numero)}</span>
                  <strong className="text-zinc-950">{nombre}</strong>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
              <span aria-hidden="true" className={`h-3 w-3 flex-none rounded-full ${COULEURS_ORIENTATION[pointActif.couleur]}`} />
              {libelleCouleur(pointActif.couleur)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Téléphone : libellés « Nom (total) » en liste, chacun ouvre la
          bulle de son point. */}
      {petit ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {points
            .slice()
            .sort((a, b) => a.nomTri.localeCompare(b.nomTri, "fr"))
            .map((point) => (
              <li key={point.candidat}>
                <button
                  type="button"
                  aria-pressed={actif === point.candidat}
                  onClick={() => setActif((a) => (a === point.candidat ? null : point.candidat))}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-semibold text-zinc-800 ${
                    actif === point.candidat ? "bg-zinc-100" : ""
                  }`}
                >
                  <span aria-hidden="true" className={`h-3 w-3 flex-none rounded-full ${COULEURS_ORIENTATION[point.couleur]}`} />
                  {point.nomTri} ({point.total})
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
