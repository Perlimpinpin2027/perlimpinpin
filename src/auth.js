import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { LIVE_COOKIE_NAME, LIVE_SESSION_MAX_AGE_SECONDS } from "@/lib/live-auth-config";
import { authenticateLiveUser } from "@/lib/live-users";

// Authentification de /live : Auth.js (next-auth v5) avec le fournisseur « Credentials »
// (e-mail + mot de passe, comptes LiveUser). Session en JWT chiffré dans un cookie, sans
// état côté serveur ; AUTH_SECRET (obligatoire) sert à le chiffrer. Sans AUTH_SECRET,
// Auth.js refuse d'émettre ou de lire une session (fail closed).
//
// Les routes /api/auth/* d'Auth.js ne sont PAS exposées : la connexion et la
// déconnexion passent uniquement par les actions serveur de /live/login, ce qui réduit
// la surface d'attaque.
export const { auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Retourne le compte, ou null : Auth.js répond alors « CredentialsSignin ».
      async authorize(credentials) {
        const user = await authenticateLiveUser(credentials?.email, credentials?.password);
        return user ? { id: String(user.id), name: user.nom, email: user.email } : null;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: LIVE_SESSION_MAX_AGE_SECONDS },
  // Un mauvais mot de passe est un cas normal : une ligne suffit (pas de pile d'erreur)
  logger: {
    error(error) {
      if (error?.type === "CredentialsSignin") console.warn("[live] connexion refusée : identifiants incorrects");
      else console.error("[live] erreur d'authentification :", error);
    },
  },
  callbacks: {
    // Identifiant du compte (LiveUser.id) dans la session : par défaut, Auth.js n'expose
    // que le nom et l'e-mail
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/live/login" },
  trustHost: true,
  // Même rigueur que l'ancien cookie signé : httpOnly, secure, sameSite strict
  cookies: {
    sessionToken: {
      name: LIVE_COOKIE_NAME,
      options: { httpOnly: true, sameSite: "strict", path: "/", secure: true },
    },
  },
});
