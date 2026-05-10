import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetSettings();
  const [form, setForm] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        referralBonus: data.referralBonus,
        dailyBonus: data.dailyBonus,
        minWithdraw: data.minWithdraw,
        requiredChannel: data.requiredChannel || "",
        requiredGroup: data.requiredGroup || "",
        supportLink: data.supportLink || "",
        supportMessage: data.supportMessage || "",
        maintenanceMode: data.maintenanceMode,
        botName: data.botName || "",
        withdrawalChannel: data.withdrawalChannel || "",
        adminGroupId: data.adminGroupId || "",
      });
    }
  }, [data]);

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess(d) {
        setMessage({ type: "success", text: d.message });
        setTimeout(() => setMessage(null), 4000);
        queryClient.invalidateQueries();
      },
      onError(e: any) {
        setMessage({ type: "error", text: e?.data?.error || "Erreur" });
        setTimeout(() => setMessage(null), 4000);
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      data: {
        ...form,
        referralBonus: Number(form.referralBonus),
        dailyBonus: Number(form.dailyBonus),
        minWithdraw: Number(form.minWithdraw),
      },
    });
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Erreur de chargement des parametres
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Parametres du bot</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configurez les regles et parametres de NeoCash</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bonuses */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Montants et limites</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bonus parrainage (FCFA)
              </label>
              <input
                type="number"
                value={form.referralBonus ?? ""}
                onChange={(e) => setForm(f => ({ ...f, referralBonus: e.target.value }))}
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bonus quotidien (FCFA)
              </label>
              <input
                type="number"
                value={form.dailyBonus ?? ""}
                onChange={(e) => setForm(f => ({ ...f, dailyBonus: e.target.value }))}
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retrait minimum (FCFA)
              </label>
              <input
                type="number"
                value={form.minWithdraw ?? ""}
                onChange={(e) => setForm(f => ({ ...f, minWithdraw: e.target.value }))}
                min="0"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Bot config */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Configuration du bot</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du bot</label>
              <input
                type="text"
                value={form.botName ?? ""}
                onChange={(e) => setForm(f => ({ ...f, botName: e.target.value }))}
                className={inputClass}
                placeholder="NeoCash"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal de retrait</label>
              <input
                type="text"
                value={form.withdrawalChannel ?? ""}
                onChange={(e) => setForm(f => ({ ...f, withdrawalChannel: e.target.value }))}
                className={inputClass}
                placeholder="@canal_retraits"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groupe admin (ID)</label>
              <input
                type="text"
                value={form.adminGroupId ?? ""}
                onChange={(e) => setForm(f => ({ ...f, adminGroupId: e.target.value }))}
                className={inputClass}
                placeholder="-100123456789"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Les canaux obligatoires sont geres depuis la page <a href="/channels" className="text-blue-600 hover:underline">Canaux obligatoires</a>.
          </p>
        </div>

        {/* Support */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien support Telegram</label>
              <input
                type="text"
                value={form.supportLink ?? ""}
                onChange={(e) => setForm(f => ({ ...f, supportLink: e.target.value }))}
                className={inputClass}
                placeholder="https://t.me/mon_support"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message support personnalise</label>
              <textarea
                value={form.supportMessage ?? ""}
                onChange={(e) => setForm(f => ({ ...f, supportMessage: e.target.value }))}
                rows={3}
                className={inputClass}
                placeholder="Message qui s'affichera dans la section Support du bot..."
              />
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Mode maintenance</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={!!form.maintenanceMode}
                onChange={(e) => setForm(f => ({ ...f, maintenanceMode: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={() => setForm(f => ({ ...f, maintenanceMode: !f.maintenanceMode }))}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  form.maintenanceMode ? "bg-red-500" : "bg-gray-300"
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.maintenanceMode ? "translate-x-5" : "translate-x-0"
                }`} />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {form.maintenanceMode ? "Maintenance activee — Bot inaccessible" : "Bot en ligne"}
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full py-3 px-6 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les parametres"}
        </button>
      </form>
    </div>
  );
}
