import { test } from "node:test";
import assert from "node:assert/strict";
import { vignettePhoto } from "../src/lib/photo-vignette.js";

const DISPONIBLES = ["marine-le-pen.jpg"];

test("photo avec vignette : adresse de la vignette webp", () => {
  assert.equal(
    vignettePhoto("/photos/marine-le-pen.jpg", DISPONIBLES),
    "/photos/vignettes/marine-le-pen.webp",
  );
});

test("photo sans vignette (nouveau candidat) : adresse d'origine", () => {
  assert.equal(vignettePhoto("/photos/nouveau.jpg", DISPONIBLES), "/photos/nouveau.jpg");
});

test("placeholder, adresse externe, vide : inchangés", () => {
  assert.equal(vignettePhoto("/avatar-placeholder.svg", DISPONIBLES), "/avatar-placeholder.svg");
  assert.equal(
    vignettePhoto("https://exemple.fr/photos/marine-le-pen.jpg", DISPONIBLES),
    "https://exemple.fr/photos/marine-le-pen.jpg",
  );
  assert.equal(vignettePhoto(null, DISPONIBLES), null);
  assert.equal(vignettePhoto(undefined, DISPONIBLES), undefined);
});
