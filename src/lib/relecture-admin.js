import { timingSafeEqual } from "node:crypto";

// Actions du comité sur /relectures (chronos, envoi en révision) : en-tête
// x-relecture-admin-code, comparé à RELECTURE_ADMIN_CODE.
export function isAdmin(request) {
  const expected = process.env.RELECTURE_ADMIN_CODE;
  const given = request.headers.get("x-relecture-admin-code");
  // Même règle que TEST_EDIT_CODE : un code trop court désactive les actions.
  if (!expected || expected.length < 12 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
