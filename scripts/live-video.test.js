import test from "node:test";
import assert from "node:assert/strict";
import { detectVideoSource, normalizeSourceUrl, sourceLabel } from "../src/lib/live-video.js";

// Lien de la source et lecteurs vidéo intégrés : reconnaissance stricte, adresse
// d'intégration toujours reconstruite à partir d'un identifiant validé.

const embed = (url) => detectVideoSource(url)?.embedUrl ?? null;
const platform = (url) => detectVideoSource(url)?.platform ?? null;

test("normalizeSourceUrl : http(s) uniquement, sans identifiants", () => {
  assert.equal(normalizeSourceUrl("  https://www.lemonde.fr/a  "), "https://www.lemonde.fr/a");
  assert.equal(normalizeSourceUrl("http://exemple.fr"), "http://exemple.fr/");
  for (const invalide of [
    "", "   ", "pas une url", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
    "ftp://exemple.fr/x", "file:///etc/passwd", "//exemple.fr", "https://user:pw@exemple.fr/", null, undefined, 42,
    "https://" + "a".repeat(600) + ".fr",
  ]) {
    assert.equal(normalizeSourceUrl(invalide), null, String(invalide).slice(0, 40));
  }
});

test("sourceLabel : nom de domaine sans www", () => {
  assert.equal(sourceLabel("https://www.lemonde.fr/politique/article"), "lemonde.fr");
  assert.equal(sourceLabel("https://exemple.fr:443/x"), "exemple.fr");
  assert.equal(sourceLabel("pas une url"), null);
});

test("YouTube : toutes les formes d'adresse donnent le même lecteur (nocookie)", () => {
  const attendu = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ]) {
    assert.equal(embed(url), attendu, url);
    assert.equal(platform(url), "youtube");
  }
  assert.equal(detectVideoSource("https://youtu.be/dQw4w9WgXcQ").label, "YouTube");
});

test("YouTube : point de départ conservé (secondes, 1m30s), ignoré s'il est illisible", () => {
  assert.equal(embed("https://youtu.be/dQw4w9WgXcQ?t=90"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
  assert.equal(embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
  assert.equal(embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=5"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=5");
  assert.equal(embed("https://youtu.be/dQw4w9WgXcQ?t=abc"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(embed("https://youtu.be/dQw4w9WgXcQ?t=\"><script>"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
});

test("YouTube : identifiants invalides et pages sans vidéo refusés", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=court",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload%3Dalert(1)",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQtropLong",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/",
    "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
    "https://www.youtube.com/results?search_query=dQw4w9WgXcQ",
    "https://youtu.be/",
  ]) {
    assert.equal(detectVideoSource(url), null, url);
  }
});

test("faux domaines : aucune reconnaissance (frontière de point)", () => {
  for (const url of [
    "https://youtube.com.evil.fr/watch?v=dQw4w9WgXcQ",
    "https://evilyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://notyoutu.be/dQw4w9WgXcQ",
    "https://exemple.fr/?u=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://dailymotion.com.evil.fr/video/x8abcde",
    "https://fakex.com/user/status/1234567890123",
    "https://x.com.evil.fr/user/status/1234567890123",
    "https://france.tv.evil.fr/a/b.html",
  ]) {
    assert.equal(detectVideoSource(url), null, url);
  }
});

test("Dailymotion : formes d'adresse courantes", () => {
  const attendu = "https://www.dailymotion.com/embed/video/x8abc12";
  for (const url of [
    "https://www.dailymotion.com/video/x8abc12",
    "https://dailymotion.com/video/x8abc12?playlist=x6hn",
    "https://dai.ly/x8abc12",
    "https://www.dailymotion.com/embed/video/x8abc12",
    "https://www.dailymotion.com/video/x8abc12_titre-de-la-video_news",
  ]) {
    assert.equal(embed(url), attendu, url);
    assert.equal(platform(url), "dailymotion");
  }
  assert.equal(detectVideoSource("https://www.dailymotion.com/video/x8/../../evil"), null);
  assert.equal(detectVideoSource("https://www.dailymotion.com/video/x8"), null);
  assert.equal(detectVideoSource("https://www.dailymotion.com/"), null);
});

test("X / Twitter : publications reconnues, lecteur officiel", () => {
  const attendu = "https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789&dnt=true";
  for (const url of [
    "https://x.com/jeanluc/status/1234567890123456789",
    "https://twitter.com/jeanluc/status/1234567890123456789?s=20",
    "https://mobile.twitter.com/jeanluc/status/1234567890123456789",
    "https://x.com/i/status/1234567890123456789",
    "https://x.com/jeanluc/status/1234567890123456789/video/1",
  ]) {
    assert.equal(embed(url), attendu, url);
    assert.equal(platform(url), "x");
    assert.equal(detectVideoSource(url).label, "X");
  }
  for (const url of ["https://x.com/jeanluc", "https://x.com/jeanluc/status/abc", "https://x.com/home", "https://x.com/jeanluc/status/1"]) {
    assert.equal(detectVideoSource(url), null, url);
  }
});

test("France TV : reconnue comme vidéo mais sans lecteur intégré", () => {
  const a = detectVideoSource("https://www.france.tv/france-2/journal-20h00/1234567-journal.html");
  assert.equal(a.platform, "francetv");
  assert.equal(a.embedUrl, null);
  assert.equal(a.label, "France TV");
  assert.equal(platform("https://www.france.tv/"), "francetv");
  assert.equal(platform("https://www.francetvinfo.fr/replay-jt/france-2/20-heures/jt-de-20h_1.html"), "francetv");
  assert.equal(platform("https://www.francetvinfo.fr/videos/une-video_1.html"), "francetv");
  // Un article de francetvinfo.fr n'est pas une vidéo
  assert.equal(detectVideoSource("https://www.francetvinfo.fr/politique/article-sur-le-budget_1234.html"), null);
});

test("autres sources (article, PDF, réseau social sans vidéo) : aucun lecteur", () => {
  for (const url of [
    "https://www.lemonde.fr/politique/article/2026/09/12/gel-des-prix.html",
    "https://exemple.fr/declaration.pdf",
    "https://www.facebook.com/watch/?v=123456",
    "https://vimeo.com/123456789",
  ]) {
    assert.equal(detectVideoSource(url), null, url);
  }
  assert.equal(detectVideoSource("javascript:alert(1)"), null);
  assert.equal(detectVideoSource(""), null);
  assert.equal(detectVideoSource(null), null);
});

test("l'adresse d'intégration ne reprend jamais la saisie brute", () => {
  const entree = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s&autoplay=1&evil=%22%3E%3Cscript%3E";
  const { embedUrl } = detectVideoSource(entree);
  assert.equal(embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
  assert.equal(embedUrl.includes("evil"), false);
  assert.equal(embedUrl.includes("autoplay"), false);
  assert.match(embedUrl, /^https:\/\/(www\.youtube-nocookie\.com|www\.dailymotion\.com|platform\.twitter\.com)\//);
});
