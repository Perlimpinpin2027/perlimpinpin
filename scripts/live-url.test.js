import test from "node:test";
import assert from "node:assert/strict";
import { ExtractError, assertPublicUrl, isPrivateAddress } from "../src/lib/live-url.js";
import { extractArticleText, extractFromFile, normalizeText } from "../src/lib/live-extract.js";

// Protection SSRF de la fonctionnalité URL de /live (aucun accès réseau).

test("isPrivateAddress : adresses privées, locales et réservées refusées", () => {
  const privees = [
    "127.0.0.1", "127.1.2.3", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255",
    "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:192.168.0.1",
    "64:ff9b::7f00:1", "2002:7f00:1::",
  ];
  for (const ip of privees) assert.equal(isPrivateAddress(ip), true, ip);
});

test("isPrivateAddress : adresses publiques acceptées", () => {
  const publiques = [
    "8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1",
    "2606:4700:4700::1111", "2a00:1450:4007:80f::200e", "::ffff:8.8.8.8",
  ];
  for (const ip of publiques) assert.equal(isPrivateAddress(ip), false, ip);
});

test("assertPublicUrl : URLs dangereuses ou invalides refusées", () => {
  const refusees = [
    "http://localhost/x", "http://foo.localhost/", "http://127.0.0.1/", "http://127.1/",
    "http://2130706433/", "http://0x7f.0.0.1/", "http://[::1]/", "http://[::ffff:127.0.0.1]/",
    "http://10.1.2.3/", "http://192.168.0.1/", "http://169.254.169.254/latest/meta-data/",
    "http://exemple.local/", "http://service.internal/", "ftp://exemple.fr/", "file:///etc/passwd",
    "javascript:alert(1)", "http://user:pw@exemple.fr/", "http://exemple.fr:8080/",
    "http://exemple.fr:22/", "pas une url", "",
  ];
  for (const url of refusees) {
    assert.throws(() => assertPublicUrl(url), ExtractError, url);
  }
});

test("assertPublicUrl : URLs publiques http/https acceptées", () => {
  for (const url of ["https://www.lemonde.fr/a", "http://exemple.fr/", "https://exemple.fr:443/x"]) {
    assert.doesNotThrow(() => assertPublicUrl(url), url);
  }
});

// Extraction de texte

test("normalizeText : nettoie et tronque au plafond", () => {
  const brut = ["a", "\r\n\r\n\r\n\r\n", "b", String.fromCharCode(160, 160), "c\t d", String.fromCharCode(0)].join("");
  assert.equal(normalizeText(brut).texte, "a\n\nb c d");
  const long = normalizeText("x".repeat(25000));
  assert.equal(long.texte.length, 20000);
  assert.equal(long.tronque, true);
});

test("extractFromFile : refuse type inconnu, .doc, faux PDF/DOCX, binaire et fichier vide", async () => {
  const cas = [
    ["photo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2])],
    ["ancien.doc", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 1])],
    ["faux.pdf", Buffer.from("du texte déguisé en pdf")],
    ["faux.docx", Buffer.from("du texte déguisé en docx")],
    ["binaire.txt", Buffer.from([1, 2, 3, 0, 4, 5])],
    ["vide.txt", Buffer.alloc(0)],
  ];
  for (const [name, buffer] of cas) {
    await assert.rejects(() => extractFromFile({ buffer, name }), ExtractError, name);
  }
});

test("extractFromFile : lit un TXT UTF-8 et un TXT Windows-1252", async () => {
  const utf8 = await extractFromFile({ buffer: Buffer.from("Déclaration du candidat : baisse d'impôts.", "utf8"), name: "a.txt" });
  assert.match(utf8.texte, /Déclaration du candidat/);
  const win = await extractFromFile({ buffer: Buffer.from("Déclaration du candidat : é à ç.", "latin1"), name: "b.txt" });
  assert.match(win.texte, /Déclaration du candidat : é à ç\./);
});

test("extractArticleText : garde l'article, retire navigation, publicité et pied de page", () => {
  const paragraphe = (n) => `Paragraphe ${n} de l'article avec assez de texte pour être retenu comme contenu principal par l'extracteur de lisibilité, sans ambiguïté.`;
  const html = `<html><head><title>Titre de l'article - Le Journal</title></head><body>
    <header><nav><a href="/">Accueil</a><ul><li>Menu principal</li></ul></nav></header>
    <div class="ad">PUBLICITÉ</div>
    <main><article><h1>Titre de l'article</h1>${[1, 2, 3, 4].map((n) => `<p>${paragraphe(n)}</p>`).join("")}</article></main>
    <footer><p>Mentions légales</p></footer></body></html>`;
  const { corps } = extractArticleText(html);
  assert.match(corps, /Paragraphe 1/);
  assert.match(corps, /Paragraphe 4/);
  for (const parasite of ["Menu principal", "PUBLICITÉ", "Mentions légales"]) {
    assert.doesNotMatch(corps, new RegExp(parasite), parasite);
  }
});
