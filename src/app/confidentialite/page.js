import Header from "@/components/Header";
import SectionHeading from "@/components/SectionHeading";

export const metadata = {
  title: "Politique de confidentialité — Perlimpinpin",
  description: "Comment Perlimpinpin collecte, utilise et protège vos données personnelles.",
};

// Même structure que les sections de /a-propos (séparateur + SectionHeading)
// pour rester cohérent avec les autres pages de contenu du site, plutôt que
// de réinventer un style propre à cette page.
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

function List({ items }) {
  return (
    <ul className="flex flex-col gap-2 pl-5 text-base leading-relaxed text-zinc-600">
      {items.map((item) => (
        <li key={item.slice(0, 24)} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

// Repère visuel pour les points que la rédaction doit encore trancher (durée
// de conservation, date de mise en ligne réelle...) — ce document est un
// brouillon, voir la demande d'origine : mieux vaut que ces trous restent
// visibles sur la page plutôt que remplis par une valeur inventée.
function AValider({ children }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
      {children}
    </span>
  );
}

export default function ConfidentialitePage() {
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
              Politique de confidentialité
            </h1>
            <p className="mt-4 text-sm text-zinc-500">
              Dernière mise à jour : <AValider>22 septembre 2026 — à confirmer avant publication</AValider>
            </p>
          </div>

          <hr className="mt-10 border-zinc-200" />

          <div className="mx-auto mt-2 mb-16 flex max-w-[68ch] flex-col gap-4">
            <Section title="Responsable du traitement">
              <Paragraph>
                Association Perlimpinpin est responsable du traitement des données personnelles
                collectées sur ce site.
              </Paragraph>
              <Paragraph>
                Contact :{" "}
                <a
                  href="mailto:perlimpinpin.admin@gmail.com"
                  className="text-blue-600 transition-colors hover:text-blue-800"
                >
                  perlimpinpin.admin@gmail.com
                </a>
              </Paragraph>
            </Section>

            <Section title="Données collectées">
              <List
                items={[
                  "Adresse e-mail, lors de l'inscription à la newsletter (formulaire dédié).",
                  "Données de navigation anonymisées, via les cookies de mesure d'audience Vercel Analytics et Vercel Speed Insights — voir la section Cookies ci-dessous.",
                ]}
              />
            </Section>

            <Section title="Finalités">
              <List
                items={[
                  "Envoi de la newsletter Perlimpinpin (analyses, nouvelles déclarations, actualités du projet).",
                  "Mesure d'audience du site, pour comprendre son utilisation et l'améliorer (Vercel Analytics, Vercel Speed Insights).",
                ]}
              />
            </Section>

            <Section title="Base légale">
              <Paragraph>
                Le traitement de l&apos;adresse e-mail pour la newsletter repose sur votre
                consentement exprès (case à cocher lors de l&apos;inscription), conformément à
                l&apos;article 6.1.a du RGPD. Vous pouvez retirer ce consentement à tout moment.
              </Paragraph>
            </Section>

            <Section title="Durée de conservation">
              <Paragraph>
                Votre adresse e-mail est conservée tant que vous êtes inscrit·e à la newsletter,
                et supprimée <AValider>[durée à valider]</AValider> après la dernière ouverture
                d&apos;un e-mail ou sur demande de désinscription.
              </Paragraph>
            </Section>

            <Section title="Destinataires des données">
              <Paragraph>
                Vos données ne sont pas vendues ni cédées à des tiers à des fins commerciales.
                Elles peuvent être traitées par nos sous-traitants techniques dans le cadre de
                l&apos;hébergement et du fonctionnement du site :
              </Paragraph>
              <List items={["Vercel (hébergement)", "Neon (base de données)"]} />
              <Paragraph>
                <AValider>
                  À compléter si un outil d&apos;envoi d&apos;e-mails tiers est ajouté
                  ultérieurement — aucun n&apos;est utilisé à ce jour.
                </AValider>
              </Paragraph>
            </Section>

            <Section title="Vos droits">
              <Paragraph>
                Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
                rectification, d&apos;effacement, de limitation, d&apos;opposition et de
                portabilité de vos données. Vous pouvez exercer ces droits en nous contactant à :{" "}
                <a
                  href="mailto:perlimpinpin.admin@gmail.com"
                  className="text-blue-600 transition-colors hover:text-blue-800"
                >
                  perlimpinpin.admin@gmail.com
                </a>
              </Paragraph>
              <Paragraph>
                Vous disposez également du droit d&apos;introduire une réclamation auprès de la
                CNIL (
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 transition-colors hover:text-blue-800"
                >
                  www.cnil.fr
                </a>
                ).
              </Paragraph>
            </Section>

            <Section title="Cookies">
              <Paragraph>
                Le bandeau de consentement affiché sur le site distingue deux catégories de
                cookies :
              </Paragraph>
              <List
                items={[
                  "Cookies strictement nécessaires : toujours actifs, indispensables au fonctionnement du site.",
                  "Cookies de mesure d'audience (Vercel Analytics, Vercel Speed Insights) : statistiques de visite anonymisées, déposés uniquement si vous les acceptez.",
                ]}
              />
              <Paragraph>
                Vous pouvez modifier votre choix à tout moment depuis le bandeau de consentement.
              </Paragraph>
            </Section>

            <Section title="Sécurité">
              <Paragraph>
                Nous mettons en œuvre des mesures techniques raisonnables pour protéger vos
                données contre l&apos;accès non autorisé, la perte ou l&apos;altération.
              </Paragraph>
            </Section>

            <Section title="Modification de cette politique">
              <Paragraph>
                Cette politique peut être mise à jour. La date de dernière modification est
                indiquée en haut de cette page.
              </Paragraph>
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
}
