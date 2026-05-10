import { useState } from "react";
import { useSendBroadcast } from "@workspace/api-client-react";

export default function Broadcast() {
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const broadcastMutation = useSendBroadcast({
    mutation: {
      onSuccess(data) {
        setFeedback({ type: "success", text: data.message });
        setMessage("");
        setButtonLabel("");
        setButtonUrl("");
        setTimeout(() => setFeedback(null), 6000);
      },
      onError(e: any) {
        setFeedback({ type: "error", text: e?.data?.error || "Erreur lors de la diffusion" });
        setTimeout(() => setFeedback(null), 6000);
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    broadcastMutation.mutate({
      data: {
        message: message.trim(),
        buttonLabel: buttonLabel.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
      },
    });
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Diffusion globale</h2>
        <p className="text-sm text-gray-500 mt-0.5">Envoyez un message a tous les utilisateurs actifs</p>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
            <span className="text-gray-400 font-normal ml-1 text-xs">(Markdown : *gras*, _italique_)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            required
            placeholder="Bonjour a tous ! Nous avons une annonce importante..."
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-gray-400 mt-1">{message.length} caracteres</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Bouton (optionnel)</h3>
          <p className="text-xs text-gray-500 mb-4">Ajoutez un bouton cliquable sous votre message</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texte du bouton</label>
              <input
                type="text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Cliquez ici"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL du bouton</label>
              <input
                type="url"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {message && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Apercu</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
              {buttonLabel && buttonUrl && (
                <div className="mt-3">
                  <span className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg">
                    {buttonLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Attention :</strong> Ce message sera envoye a tous les utilisateurs non bannis. Cette action ne peut pas etre annulee.
          </p>
        </div>

        <button
          type="submit"
          disabled={broadcastMutation.isPending || !message.trim()}
          className="w-full py-3 px-6 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {broadcastMutation.isPending ? "Diffusion en cours..." : "Envoyer la diffusion"}
        </button>
      </form>
    </div>
  );
}
