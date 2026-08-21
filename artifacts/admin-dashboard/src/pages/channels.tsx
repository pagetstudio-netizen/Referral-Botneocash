import { useState, useEffect } from "react";
import { Radio, Save, Trash2, Check, X, Info, ExternalLink, Plus, Edit2, Hash, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("moon_crypto_token");
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((json as any).error || "Erreur"), { data: json });
  return json as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChannelConfig { chatId: string; label: string; }
type ChannelType = "channel" | "group" | "website";
interface ExtraChannel {
  id: number; label: string; type: ChannelType;
  chatIdOrUrl: string; displayOrder: number; isActive: boolean;
  subscribers: number; createdAt: string;
}

const TYPE_CONFIG: Record<ChannelType, { icon: React.ReactNode; label: string; placeholder: string; color: string }> = {
  channel: { icon: <Radio size={13} />,  label: "Canal Telegram",  placeholder: "@canal ou -100123456789", color: "bg-blue-100 text-blue-700" },
  group:   { icon: <Hash size={13} />,   label: "Groupe Telegram", placeholder: "@groupe ou -100123456789", color: "bg-purple-100 text-purple-700" },
  website: { icon: <Globe size={13} />,  label: "Site web",        placeholder: "https://site.com",         color: "bg-green-100 text-green-700" },
};

function channelLink(chatId: string): string {
  const s = chatId.trim();
  if (s.startsWith("http")) return s;
  if (s.startsWith("-100")) return `https://t.me/c/${s.replace("-100", "")}`;
  if (s.startsWith("-")) return `https://t.me/c/${s.slice(1)}`;
  return `https://t.me/${s.replace("@", "")}`;
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// ─── Section : chaîne officielle principale ───────────────────────────────────
function OfficialChannel() {
  const [current, setCurrent] = useState<ChannelConfig>({ chatId: "", label: "" });
  const [form, setForm] = useState<ChannelConfig>({ chatId: "", label: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  }

  useEffect(() => {
    apiFetch<ChannelConfig>("/api/admin/channel")
      .then(d => { setCurrent(d); setForm(d); })
      .catch(() => flash(false, "Impossible de charger la configuration"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(field: keyof ChannelConfig, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!form.chatId.trim()) { flash(false, "L'identifiant de la chaîne est requis"); return; }
    setSaving(true);
    try {
      await apiFetch("/api/admin/channel", { method: "PUT", body: JSON.stringify({ chatId: form.chatId.trim(), label: form.label.trim() }) });
      setCurrent({ chatId: form.chatId.trim(), label: form.label.trim() });
      setDirty(false);
      flash(true, "Chaîne officielle mise à jour ✓");
    } catch (e: any) {
      flash(false, e?.data?.error || "Erreur lors de la sauvegarde");
    } finally { setSaving(false); }
  }

  async function handleRemove() {
    if (!confirm("Retirer la chaîne obligatoire ? Les utilisateurs pourront accéder sans vérification de cette chaîne.")) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/channel", { method: "PUT", body: JSON.stringify({ chatId: "", label: "" }) });
      setCurrent({ chatId: "", label: "" });
      setForm({ chatId: "", label: "" });
      setDirty(false);
      flash(true, "Chaîne officielle retirée");
    } catch (e: any) {
      flash(false, e?.data?.error || "Erreur");
    } finally { setSaving(false); }
  }

  const isConfigured = !!current.chatId;

  if (loading) return <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {/* Header de section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Radio size={15} className="text-blue-600" /> Chaîne officielle
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Toujours obligatoire — configurée directement ici.</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isConfigured ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? "bg-green-500" : "bg-gray-400"}`} />
          {isConfigured ? "Active" : "Non configurée"}
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <Check size={13} /> : <X size={13} />} {msg.text}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Identifiant Telegram <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls} value={form.chatId}
            placeholder="@mooncrytpoofficial ou -100123456789"
            onChange={e => handleChange("chatId", e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Le bot doit être <strong>administrateur</strong> de cette chaîne.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nom affiché aux utilisateurs</label>
          <input
            className={inputCls} value={form.label}
            placeholder="Ex: Moon Crypto Officiel"
            onChange={e => handleChange("label", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        <button onClick={handleSave} disabled={saving || !dirty}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Save size={13} /> {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        {isConfigured && (
          <>
            <a href={channelLink(current.chatId)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <ExternalLink size={11} /> Voir la chaîne
            </a>
            <button onClick={handleRemove} disabled={saving}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 ml-auto">
              <Trash2 size={12} /> Retirer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section : chaînes supplémentaires (optionnelles → obligatoires si actives) ─
function ExtraChannels() {
  const qc = useQueryClient();
  const { data: channels = [], isLoading } = useQuery<ExtraChannel[]>({
    queryKey: ["extra-channels"],
    queryFn: () => apiFetch("/api/admin/channels"),
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ label: "", type: "channel" as ChannelType, chatIdOrUrl: "", displayOrder: 0 });
  const [editForm, setEditForm] = useState<Partial<ExtraChannel>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  }

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => apiFetch("/api/admin/channels", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["extra-channels"] }); setShowForm(false); setForm({ label: "", type: "channel", chatIdOrUrl: "", displayOrder: 0 }); flash(true, "Chaîne supplémentaire ajoutée ✓"); },
    onError: (e: any) => flash(false, e?.data?.error || "Erreur lors de l'ajout"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExtraChannel> }) =>
      apiFetch(`/api/admin/channels/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["extra-channels"] }); setEditId(null); flash(true, "Canal mis à jour ✓"); },
    onError: (e: any) => flash(false, e?.data?.error || "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["extra-channels"] }); flash(true, "Canal supprimé"); },
    onError: (e: any) => flash(false, e?.data?.error || "Erreur"),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Chaînes supplémentaires</h3>
          <p className="text-xs text-gray-400 mt-0.5">Optionnelles — deviennent obligatoires dès qu'elles sont ajoutées et actives.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {msg && (
        <div className={`mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <Check size={13} /> : <X size={13} />} {msg.text}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-3">Nouvelle chaîne supplémentaire</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du bouton <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.label} placeholder="Ex: 📢 Canal Actualités"
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type <span className="text-red-500">*</span></label>
              <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ChannelType }))}>
                <option value="channel">📢 Canal Telegram</option>
                <option value="group">👥 Groupe Telegram</option>
                <option value="website">🌐 Site web</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.type === "website" ? "URL du site" : "ID ou @username"} <span className="text-red-500">*</span>
              </label>
              <input className={inputCls} value={form.chatIdOrUrl}
                placeholder={TYPE_CONFIG[form.type].placeholder}
                onChange={e => setForm(f => ({ ...f, chatIdOrUrl: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => addMutation.mutate(form)}
              disabled={addMutation.isPending || !form.label || !form.chatIdOrUrl}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : channels.length === 0 ? (
        <div className="mt-4 py-8 text-center border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-400">Aucune chaîne supplémentaire</p>
          <p className="text-xs text-gray-300 mt-1">Cliquez sur "Ajouter" pour en configurer une.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {channels.map(ch => (
            <div key={ch.id} className={`rounded-lg border p-3 ${ch.isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
              {editId === ch.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className={inputCls} value={editForm.label ?? ch.label}
                      placeholder="Nom du bouton"
                      onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                    <select className={inputCls} value={editForm.type ?? ch.type}
                      onChange={e => setEditForm(f => ({ ...f, type: e.target.value as ChannelType }))}>
                      <option value="channel">📢 Canal</option>
                      <option value="group">👥 Groupe</option>
                      <option value="website">🌐 Site web</option>
                    </select>
                    <input className={`${inputCls} sm:col-span-2`} value={editForm.chatIdOrUrl ?? ch.chatIdOrUrl}
                      placeholder="ID / @username / URL"
                      onChange={e => setEditForm(f => ({ ...f, chatIdOrUrl: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer"
                      onClick={() => setEditForm(f => ({ ...f, isActive: !(f.isActive ?? ch.isActive) }))}>
                      <div className={`w-8 h-4 rounded-full transition-colors ${(editForm.isActive ?? ch.isActive) ? "bg-blue-600" : "bg-gray-300"}`}>
                        <div className={`w-3 h-3 mt-0.5 ml-0.5 bg-white rounded-full shadow transition-transform ${(editForm.isActive ?? ch.isActive) ? "translate-x-4" : ""}`} />
                      </div>
                      <span className="text-xs text-gray-600">Actif</span>
                    </label>
                    <button onClick={() => updateMutation.mutate({ id: ch.id, data: { label: editForm.label ?? ch.label, type: editForm.type ?? ch.type, chatIdOrUrl: editForm.chatIdOrUrl ?? ch.chatIdOrUrl, displayOrder: ch.displayOrder, isActive: editForm.isActive ?? ch.isActive } })}
                      disabled={updateMutation.isPending}
                      className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {updateMutation.isPending ? "..." : "Enregistrer"}
                    </button>
                    <button onClick={() => { setEditId(null); setEditForm({}); }}
                      className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${TYPE_CONFIG[ch.type].color}`}>
                      {TYPE_CONFIG[ch.type].icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ch.label}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{ch.chatIdOrUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditId(ch.id); setEditForm({}); setShowForm(false); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { if (confirm(`Supprimer "${ch.label}" ?`)) deleteMutation.mutate(ch.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function Channels() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Canaux obligatoires</h2>
        <p className="text-sm text-gray-500 mt-1">
          Les utilisateurs doivent rejoindre ces chaînes pour accéder au bot.
        </p>
      </div>

      <div className="space-y-5">
        <OfficialChannel />
        <ExtraChannels />
      </div>

      {/* Note explicative */}
      <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
        <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Règles de vérification</p>
          <ul className="space-y-0.5 list-disc list-inside text-blue-600">
            <li>La chaîne officielle est <strong>toujours vérifiée</strong> si configurée.</li>
            <li>Les chaînes supplémentaires actives sont <strong>aussi obligatoires</strong>.</li>
            <li>Si 1 seule chaîne manque → bouton ciblé. Si plusieurs → liste des boutons à rejoindre.</li>
            <li>Le bot doit être <strong>administrateur</strong> de chaque chaîne pour vérifier les membres.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
