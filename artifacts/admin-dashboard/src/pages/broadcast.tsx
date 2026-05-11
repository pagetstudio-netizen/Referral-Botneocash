import { useState, useRef } from "react";

export default function Broadcast() {
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "Fichier invalide. Choisissez une image (JPG, PNG, etc.)" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Image trop lourde. Maximum 10 Mo." });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setIsPending(true);
    setFeedback(null);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (imageFile) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const result = ev.target?.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        imageMimeType = imageFile.type;
      }

      const token = localStorage.getItem("neocash_token");
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: message.trim(),
          buttonLabel: buttonLabel.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la diffusion");

      setFeedback({ type: "success", text: data.message || "Diffusion lancée !" });
      setMessage("");
      setButtonLabel("");
      setButtonUrl("");
      removeImage();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Erreur lors de la diffusion" });
      setTimeout(() => setFeedback(null), 6000);
    } finally {
      setIsPending(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Diffusion globale</h2>
        <p className="text-sm text-gray-500 mt-0.5">Envoyez un message à tous les utilisateurs actifs</p>
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
            placeholder="Bonjour à tous ! Nous avons une annonce importante..."
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-gray-400 mt-1">{message.length} caractères</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Image (optionnel)</h3>
          <p className="text-xs text-gray-500 mb-3">Le message sera envoyé avec cette image en haut (JPG, PNG — max 10 Mo)</p>

          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="h-36 w-auto rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow"
              >
                ✕
              </button>
              <p className="text-xs text-gray-500 mt-1">{imageFile?.name}</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <p className="text-2xl mb-1">🖼️</p>
              <p className="text-sm text-gray-600 font-medium">Cliquez pour importer une image</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, GIF, WebP — max 10 Mo</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
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

        {(message || imagePreview) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Aperçu</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full max-h-48 object-cover rounded-lg mb-3"
                />
              )}
              {message && (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
              )}
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
            <strong>Attention :</strong> Ce message sera envoyé à tous les utilisateurs non bannis. Cette action ne peut pas être annulée.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="w-full py-3 px-6 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Diffusion en cours..." : `Envoyer la diffusion${imageFile ? " avec image" : ""}`}
        </button>
      </form>
    </div>
  );
}
