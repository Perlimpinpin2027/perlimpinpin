import Header from "@/components/Header";
import SectionHeading from "@/components/SectionHeading";

export const metadata = {
  title: "Politique de confidentialité — Perlimpinpin",
  description: "Comment Perlimpinpin collecte, utilise et protège vos données personnelles.",
};

const CONTACT_EMAIL = "perlimpinpin.admin@gmail.com";

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

// Intertitre en gras en tête de paragraphe ou d'item de liste.
function Lead({ children }) {
  return <strong className="font-semibold text-zinc-900">{children}</strong>;
}

// Contenu statique : l'index suffit comme clé.
function List({ items }) {
  return (
    <ul className="flex flex-col gap-2 pl-5 text-base leading-relaxed text-zinc-600">
      {items.map((item, index) => (
        <li key={index} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

function TextLink({ href, children }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-blue-600 transition-colors hover:text-blue-800"
    >
      {children}
    </a>
  );
}

function ContactLink() {
  return <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>;
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
              Dernière mise à jour : <time dateTime="2026-09-23">23/09/2026</time>
            </p>
          </div>

          <hr className="mt-10 border-zinc-200" />

          <div className="mx-auto mt-2 mb-16 flex max-w-[68ch] flex-col gap-4">
            <Section title="1. Qui sommes-nous">
              <Paragraph>
                Perlimpinpin est un projet porté par l&apos;association Perlimpinpin, dont le
                siège social est situé au 31, rue Camille Mouquet, 94220 Charenton-le-Pont,
                accessible à l&apos;adresse perlimpinpin.ai. Pour toute question relative à vos
                données personnelles, vous pouvez nous contacter à l&apos;adresse :{" "}
                <ContactLink />.
              </Paragraph>
            </Section>

            <Section title="2. Données que nous collectons">
              <Paragraph>
                <Lead>Cookies et données de navigation.</Lead> Lors de votre première visite, un
                bandeau vous permet d&apos;accepter ou de refuser les cookies non essentiels
                (mesure d&apos;audience). Si vous acceptez, nous utilisons un outil de mesure
                d&apos;audience (Vercel Analytics) qui collecte des données de navigation
                anonymisées ou pseudonymisées (pages visitées, provenance, type d&apos;appareil).
                Aucun cookie de ce type n&apos;est déposé si vous refusez ou avant que vous ayez
                fait un choix.
              </Paragraph>
              <Paragraph>
                <Lead>Données techniques d&apos;hébergement.</Lead> Comme tout site web,
                l&apos;hébergeur du site (Vercel) collecte des données techniques de connexion
                (adresse IP, horodatage, user-agent) nécessaires au fonctionnement et à la
                sécurité du service, selon sa propre politique de confidentialité.
              </Paragraph>
              <Paragraph>
                <Lead>Newsletter.</Lead> Si vous vous inscrivez à notre newsletter, nous
                collectons votre adresse e-mail, sur la base de votre consentement,
                exclusivement pour vous envoyer cette newsletter. Vous pouvez vous désinscrire à
                tout moment via un lien présent dans chaque e-mail.
              </Paragraph>
              <Paragraph>
                <Lead>Formulaire de contact.</Lead> Si vous nous contactez via le formulaire du
                site, nous collectons votre nom et votre adresse e-mail afin de pouvoir vous
                répondre. Ces données sont conservées le temps nécessaire au traitement de votre
                demande, puis supprimées dans un délai raisonnable (12 mois maximum sans nouvel
                échange).
              </Paragraph>
              <Paragraph>
                <Lead>Accès journalistes (&laquo;&nbsp;/live&nbsp;&raquo;).</Lead> Certaines
                pages du site sont protégées par un accès restreint réservé à des journalistes
                partenaires. L&apos;accès à ces pages ne collecte pas de données personnelles
                au-delà de ce qui est strictement nécessaire à l&apos;authentification.
              </Paragraph>
              <Paragraph>
                Nous ne collectons aucune autre donnée personnelle : pas de compte utilisateur
                public, pas de formulaire de contact collectant des données au-delà de ce qui
                précède, à ce jour.
              </Paragraph>
            </Section>

            <Section title="3. Pourquoi nous utilisons ces données">
              <List
                items={[
                  "Mesurer la fréquentation du site pour l'améliorer (uniquement avec votre consentement).",
                  "Assurer la sécurité et le bon fonctionnement technique du site.",
                  "Vous envoyer la newsletter, une fois active, si vous vous y êtes inscrit(e).",
                ]}
              />
            </Section>

            <Section title="4. Base légale">
              <List
                items={[
                  <>
                    <Lead>Cookies de mesure d&apos;audience et newsletter :</Lead> votre
                    consentement, que vous pouvez retirer à tout moment.
                  </>,
                  <>
                    <Lead>Données techniques d&apos;hébergement :</Lead> intérêt légitime à
                    assurer la sécurité et le fonctionnement du site.
                  </>,
                ]}
              />
            </Section>

            <Section title="5. Durée de conservation">
              <List
                items={[
                  <>
                    <Lead>Consentement aux cookies :</Lead> conservé 6 mois, à l&apos;issue
                    desquels le bandeau vous sera à nouveau présenté.
                  </>,
                  <>
                    <Lead>Données de mesure d&apos;audience :</Lead> conservées 13 mois maximum,
                    conformément aux recommandations de la CNIL.
                  </>,
                  <>
                    <Lead>Données de connexion techniques (hébergeur) :</Lead> conservées selon la
                    politique de Vercel, non déterminée par Perlimpinpin.
                  </>,
                  <>
                    <Lead>Adresse e-mail newsletter :</Lead> conservée jusqu&apos;à votre
                    désinscription.
                  </>,
                  <>
                    <Lead>Données du formulaire de contact :</Lead> conservées 12 mois maximum
                    après le traitement de votre demande, sauf échange en cours.
                  </>,
                ]}
              />
            </Section>

            <Section title="6. Qui a accès à vos données">
              <Paragraph>
                Vos données ne sont jamais vendues. Elles peuvent être traitées par nos
                prestataires techniques dans la stricte mesure nécessaire au fonctionnement du
                site : Vercel (hébergement), Neon (base de données, hébergée dans l&apos;Union
                européenne — Francfort, Allemagne), et, une fois choisi, notre futur prestataire
                d&apos;envoi de newsletter. Vercel étant une société américaine, certaines données
                techniques peuvent être traitées hors de l&apos;Union européenne ; dans ce cas,
                des garanties contractuelles conformes au RGPD s&apos;appliquent (clauses
                contractuelles types).
              </Paragraph>
            </Section>

            <Section title="7. Vos droits">
              <Paragraph>
                Conformément au Règlement général sur la protection des données (RGPD), vous
                disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
                limitation, d&apos;opposition et de portabilité de vos données. Vous pouvez
                exercer ces droits en nous écrivant à <ContactLink />. Vous pouvez également
                gérer votre consentement aux cookies à tout moment via le lien &laquo;&nbsp;Gérer
                les cookies&nbsp;&raquo; en bas de page. Si vous estimez que vos droits ne sont
                pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (
                <TextLink href="https://www.cnil.fr">www.cnil.fr</TextLink>).
              </Paragraph>
            </Section>

            <Section title="8. Sécurité">
              <Paragraph>
                Nous mettons en œuvre les mesures techniques raisonnables pour protéger vos
                données contre l&apos;accès non autorisé, la perte ou l&apos;altération.
              </Paragraph>
            </Section>

            <Section title="9. Modifications">
              <Paragraph>
                Cette politique peut être mise à jour, notamment lors de l&apos;activation de
                nouvelles fonctionnalités (comme la newsletter). La date de dernière mise à jour
                figure en haut de cette page.
              </Paragraph>
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
}
