import Link from "next/link";
import Header from "@/components/Header";
import SectionHeading from "@/components/SectionHeading";

export const metadata = {
  title: "Mentions légales — Perlimpinpin",
  description: "Éditeur, hébergeur et conditions d'utilisation du site perlimpinpin.ai.",
};

const CONTACT_EMAIL = "perlimpinpin.admin@gmail.com";
const LINK_CLASS = "text-blue-600 transition-colors hover:text-blue-800";

// Même structure que /confidentialite et /a-propos (séparateur +
// SectionHeading) pour rester cohérent avec les autres pages de contenu.
function Section({ title, children }) {
  return (
    <div className="pt-6">
      <hr className="border-zinc-200" />
      <div className="mt-6 flex flex-col gap-4">
        <SectionHeading>{title}</SectionHeading>
        {children}
      </div>
    </div>
  );
}

function Paragraph({ children }) {
  return <p className="text-base leading-relaxed text-zinc-600">{children}</p>;
}

function Lead({ children }) {
  return <strong className="font-semibold text-zinc-900">{children}</strong>;
}

export default function MentionsLegalesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Perlimpinpin
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
              Mentions légales
            </h1>
          </div>

          <hr className="mt-10 border-zinc-200" />

          <div className="mx-auto mt-2 mb-16 flex max-w-[68ch] flex-col gap-4">
            <Section title="Éditeur du site">
              <Paragraph>
                Le site perlimpinpin.ai est édité par l&apos;association Perlimpinpin,
                association régie par la loi du 1er juillet 1901, déclarée le 25 mai 2026
                (numéro RNA : W941021332), dont le siège social est situé au 31, rue Camille
                Mouquet, 94220 Charenton-le-Pont.
              </Paragraph>
              <Paragraph>
                <Lead>Directeur de la publication :</Lead> Matis Brasca, président de
                l&apos;association Perlimpinpin.
              </Paragraph>
              <Paragraph>
                <Lead>Contact :</Lead>{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
                  {CONTACT_EMAIL}
                </a>
              </Paragraph>
              <Paragraph>
                <Lead>Objet de l&apos;association :</Lead> conception, développement et
                exploitation d&apos;une plateforme éditoriale et technologique dédiée à
                l&apos;analyse, à l&apos;évaluation, à la contextualisation et à la pédagogie
                des propositions, promesses et déclarations politiques, notamment au moyen de
                méthodes humaines, documentaires, algorithmiques et d&apos;intelligence
                artificielle.
              </Paragraph>
            </Section>

            <Section title="Hébergement">
              <Paragraph>Le site est hébergé par :</Paragraph>
              <address className="text-base not-italic leading-relaxed text-zinc-600">
                Vercel Inc.
                <br />
                440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis
              </address>
            </Section>

            <Section title="Propriété intellectuelle">
              <Paragraph>
                L&apos;ensemble des contenus présents sur le site perlimpinpin.ai (textes,
                analyses, méthodologie, notation, mise en forme graphique, logo) est protégé par
                le droit de la propriété intellectuelle. Toute reproduction, représentation, ou
                réutilisation, totale ou partielle, sans autorisation préalable de
                l&apos;association Perlimpinpin, est interdite, sous réserve des exceptions
                prévues par la loi (notamment le droit de citation).
              </Paragraph>
            </Section>

            <Section title="Données personnelles et cookies">
              <Paragraph>
                Le traitement des données personnelles et l&apos;utilisation des cookies sur ce
                site sont décrits dans notre{" "}
                <Link href="/confidentialite" className={LINK_CLASS}>
                  politique de confidentialité
                </Link>
                .
              </Paragraph>
            </Section>

            <Section title="Nature du contenu éditorial">
              <Paragraph>
                Les analyses et notations publiées sur Perlimpinpin reposent sur une
                méthodologie publique et documentée, appliquée avec la volonté d&apos;une
                neutralité politique et d&apos;une rigueur méthodologique. Elles constituent un
                travail d&apos;analyse et non une prise de position partisane. Malgré le soin
                apporté à leur élaboration, l&apos;association Perlimpinpin ne saurait être
                tenue responsable d&apos;éventuelles erreurs ou omissions ; toute suggestion de
                correction peut être adressée via le formulaire de contact du site.
              </Paragraph>
            </Section>

            <Section title="Droit applicable">
              <Paragraph>
                Les présentes mentions légales sont soumises au droit français. Tout litige
                relatif à l&apos;utilisation du site relève de la compétence des tribunaux
                français.
              </Paragraph>
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
}
