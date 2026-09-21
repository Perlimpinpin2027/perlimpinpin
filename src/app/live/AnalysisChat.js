"use client";

import { useEffect, useRef, useState } from "react";
import { loginUrl } from "@/lib/live-redirect";
import ProgressBar from "./ProgressBar";
import { Icon } from "./ui";

// « Posez une question sur cette analyse… » : fil de discussion avec l'analyse. La
// réponse vient de l'API (route /chat) et s'appuie uniquement sur le contenu de
// l'analyse. Les échanges sont enregistrés côté serveur et rechargés à la réouverture
// de la page. Un échec s'affiche dans le fil (avec « Réessayer »), jamais en plantage.

const QUESTION_MAX_LENGTH = 1000;
// La route s'arrête à 60 s : au-delà de 65 s côté navigateur, plus rien à attendre.
const CHAT_TIMEOUT_MS = 65_000;

// Puces : le texte affiché est court ; la question envoyée est complète.
const SUGGESTIONS = [
  { label: "Quel est le coût estimé ?", question: "Quel est le coût estimé de cette mesure ?" },
  { label: "Est-ce légal ?", question: "Cette mesure est-elle légale ? Quelle est sa base juridique ?" },
  { label: "Comparez avec d'autres pays", question: "Peut-on comparer cette mesure avec ce qui se fait dans d'autres pays ?" },
  { label: "Trouvez les faiblesses", question: "Quelles sont les principales faiblesses de cette proposition ?" },
];

const CHAT_PROGRESS_MESSAGES = [
  "Relecture de l'analyse…",
  "Recherche dans les éléments de l'analyse…",
  "Rédaction de la réponse…",
];

let localKey = 0;
const nextKey = (prefix) => `${prefix}-${(localKey += 1)}`;

function Thread({ items, onRetry }) {
  return (
    <ol role="log" aria-live="polite" aria-label="Conversation sur cette analyse" className="flex flex-col gap-3">
      {items.map((item) => {
        if (item.role === "user") {
          return (
            <li key={item.key} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-sm leading-relaxed text-white">
                {item.content}
              </p>
            </li>
          );
        }
        if (item.role === "error") {
          return (
            <li key={item.key} className="flex justify-start">
              <div role="alert" className="max-w-[92%] rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                <p>{item.content}</p>
                {item.canRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(item)}
                    className="mt-1.5 text-xs font-semibold text-red-700 underline hover:text-red-900"
                  >
                    Réessayer
                  </button>
                )}
              </div>
            </li>
          );
        }
        return (
          <li key={item.key} className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-3">
              <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">PerlimpinpinGo</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{item.content}</p>
              {item.unsaved && (
                <p className="mt-1.5 text-[11px] text-amber-700">Cette réponse n&apos;a pas pu être enregistrée dans l&apos;historique.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function AnalysisChat({ analyseId, initialMessages }) {
  const [items, setItems] = useState(() =>
    initialMessages.map((message) => ({ key: `db-${message.id}`, role: message.role, content: message.content })),
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [arrived, setArrived] = useState(null); // réponse reçue, ajoutée une fois la barre à 100 %
  const textareaRef = useRef(null);
  const endRef = useRef(null);
  const interacted = useRef(false);

  // Fait défiler jusqu'au dernier message après une interaction (pas au chargement de la page)
  useEffect(() => {
    if (interacted.current) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [items, pending]);

  function resizeTextarea() {
    const area = textareaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 112)}px`;
  }

  async function send(question, { retry = false } = {}) {
    if (pending) return;
    interacted.current = true;
    setPending(true);
    setArrived(null);
    // Sur une nouvelle question, elle s'affiche tout de suite ; sur « Réessayer », elle y est déjà
    if (!retry) setItems((current) => [...current, { key: nextKey("q"), role: "user", content: question }]);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
    try {
      const response = await fetch(`/api/live/analyses/${analyseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      if (response.status === 401) {
        window.location.assign(loginUrl(window.location.pathname + window.location.search));
        return;
      }
      const data = await response.json().catch(() => null);
      const answer = data?.messages?.find((message) => message.role === "assistant");
      if (!response.ok || !answer) {
        // 400, 404 et 422 ne s'arrangent pas en réessayant ; le reste, si
        failWith(data?.error ?? "La réponse n'a pas pu être obtenue.", question, ![400, 404, 422].includes(response.status));
        return;
      }
      // Réponse arrivée : la barre se complète à 100 %, puis handleFinished l'affiche
      setArrived({ content: answer.content, unsaved: data.saved === false });
    } catch (caught) {
      failWith(
        caught?.name === "AbortError"
          ? "La réponse prend trop de temps."
          : "Connexion impossible. Vérifiez votre réseau.",
        question,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  function failWith(message, question, canRetry) {
    setItems((current) => [...current, { key: nextKey("e"), role: "error", content: message, question, canRetry }]);
    setPending(false);
  }

  function handleFinished() {
    setItems((current) => [
      ...current,
      { key: nextKey("a"), role: "assistant", content: arrived.content, unsaved: arrived.unsaved },
    ]);
    setArrived(null);
    setPending(false);
  }

  function retry(errorItem) {
    setItems((current) => current.filter((item) => item.key !== errorItem.key));
    send(errorItem.question, { retry: true });
  }

  function submit(event) {
    event.preventDefault();
    const question = draft.trim();
    if (question.length < 2 || pending) return;
    setDraft("");
    requestAnimationFrame(resizeTextarea);
    send(question);
  }

  return (
    <section aria-label="Poser une question sur cette analyse" className="mt-10">
      {(items.length > 0 || pending) && (
        <div className="mb-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Conversation</h2>
          <Thread items={items} onRetry={retry} />
          {pending && (
            <div className="mt-3 max-w-[92%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-3">
              <ProgressBar
                label="Réponse en cours"
                messages={CHAT_PROGRESS_MESSAGES}
                finished={arrived !== null}
                onFinished={handleFinished}
              />
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-blue-200">
        <textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          maxLength={QUESTION_MAX_LENGTH}
          disabled={pending}
          onChange={(event) => {
            setDraft(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={(event) => {
            // Entrée envoie ; Maj+Entrée saute une ligne
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
          placeholder="Posez une question sur cette analyse…"
          aria-label="Poser une question sur cette analyse"
          className="max-h-28 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length < 2}
          aria-label="Envoyer la question"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          <Icon name="arrowUp" className="h-4 w-4" />
        </button>
      </form>

      <ul className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.label}>
            <button
              type="button"
              disabled={pending}
              onClick={() => send(suggestion.question)}
              title={suggestion.question}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {suggestion.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-zinc-400">
        Les réponses s&apos;appuient uniquement sur le contenu de cette analyse (estimation préliminaire, sans recherche externe).
      </p>
    </section>
  );
}
