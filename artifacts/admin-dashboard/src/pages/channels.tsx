import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Edit2, Check, X, Users, Radio, Globe, Hash } from "lucide-react";

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("neocash_token");
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || "Erreur"), { data: json });
  return json as T;
}

type ChannelType = "channel" | "group" | "website";

interface Channel {
  id: number;
  label: string;
  type: ChannelType;
  chatIdOrUrl: string;
  displayOrder: number;
  isActive: boolean;
  subscribers: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<ChannelType, { icon: React.ReactNode; label: string; placeholder: string; color: string }> = {
  channel: { icon: <Radio size={14} />, label: "Canal Telegram", placeholder: "@mon_canal ou -100123456789", color: "bg-blue-100 text-blue-700" },
  group:   { icon: <Hash size={14} />, label: "Groupe Telegram", placeholder: "@mon_groupe ou -100123456789", color: "bg-purple-100 text-purple-700" },
  website: { icon: <Globe size={14} />, label: "Site web",        placeholder: "https://mon-site.com",         color: "bg-green-100 text-green-700"  },
};

function useChannels() {
  return useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: () => apiFetch("/api/admin/channels"),
  });
}

export default function Channels() {
  const qc = useQueryClient();
  const { data: channels = [], isLoading } = useChannels();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ label: "", type: "channel" as ChannelType, chatIdOrUrl: "", displayOrder: 0 });
  const [editForm, setEditForm] = useState<Partial<Channel>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  }

  const addMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/admin/channels", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels"] }); setShowForm(false); setForm({ label: "", type: "channel", chatIdOrUrl: "", displayOrder: 0 }); flash(true, "Canal ajouté avec succès"); },
    onError: (e: any) => flash(false, e?.data?.error || "Erreur lors de l'ajout"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Channel> }) =>
      apiFetch(`/api/admin/channels/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels"] }); setEditId(null); flash(true, "Canal mis à jour"); },
    onError: (e: any) => flash(false, e?.data?.error || "Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels"] }); flash(true, "Canal supprimé"); },
    onError: (e: any) => flash(false, e?.data?.error || "Erreur lors de la suppression"),
  });

  const totalSubscribers = channels.reduce((s, c) => s + (c.subscribers || 0), 0);
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Canaux obligatoires</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Les utilisateurs doivent rejoindre tous ces canaux pour accéder au bot.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Ajouter un canal
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <Check size={15} /> : <X size={15} />} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Canaux actifs</p>
          <p className="text-2xl font-bold text-gray-900">{channels.filter(c => c.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total abonnés via bot</p>
          <p className="text-2xl font-bold text-blue-600">{totalSubscribers.toLocaleString("fr-FR")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Types configurés</p>
          <p className="text-2xl font-bold text-gray-900">{new Set(channels.map(c => c.type)).size}</p>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600" /> Nouveau canal obligatoire</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du bouton <span className="text-red-500">*</span></label>
              <input
                className={inputCls} value={form.label} placeholder="Ex: 📢 Rejoindre NeoCash"
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">Texte visible par l'utilisateur sur le bouton</p>
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
              <input
                className={inputCls} value={form.chatIdOrUrl}
                placeholder={TYPE_CONFIG[form.type].placeholder}
                onChange={e => setForm(f => ({ ...f, chatIdOrUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordre d'affichage</label>
              <input type="number" className={inputCls} value={form.displayOrder} min={0}
                onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending || !form.label || !form.chatIdOrUrl}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des canaux */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : channels.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Radio size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Aucun canal configuré</p>
          <p className="text-sm text-gray-400 mt-1">Ajoutez un canal pour que les utilisateurs doivent le rejoindre avant d'accéder au bot.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map(ch => (
            <div key={ch.id} className={`bg-white rounded-xl border p-5 ${ch.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
              {editId === ch.id ? (
                /* Mode édition */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nom du bouton</label>
                      <input className={inputCls} value={editForm.label ?? ch.label}
                        onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select className={inputCls} value={editForm.type ?? ch.type}
                        onChange={e => setEditForm(f => ({ ...f, type: e.target.value as ChannelType }))}>
                        <option value="channel">📢 Canal Telegram</option>
                        <option value="group">👥 Groupe Telegram</option>
                        <option value="website">🌐 Site web</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">ID / URL</label>
                      <input className={inputCls} value={editForm.chatIdOrUrl ?? ch.chatIdOrUrl}
                        onChange={e => setEditForm(f => ({ ...f, chatIdOrUrl: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ordre</label>
                      <input type="number" className={inputCls} value={editForm.displayOrder ?? ch.displayOrder}
                        onChange={e => setEditForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative" onClick={() => setEditForm(f => ({ ...f, isActive: !(f.isActive ?? ch.isActive) }))}>
                          <div className={`w-9 h-5 rounded-full transition-colors ${(editForm.isActive ?? ch.isActive) ? "bg-blue-600" : "bg-gray-300"}`} />
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(editForm.isActive ?? ch.isActive) ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                        <span className="text-xs text-gray-600">Actif</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate({ id: ch.id, data: { label: editForm.label ?? ch.label, type: editForm.type ?? ch.type, chatIdOrUrl: editForm.chatIdOrUrl ?? ch.chatIdOrUrl, displayOrder: editForm.displayOrder ?? ch.displayOrder, isActive: editForm.isActive ?? ch.isActive } })}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {updateMutation.isPending ? "..." : "Enregistrer"}
                    </button>
                    <button onClick={() => { setEditId(null); setEditForm({}); }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode affichage */
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[ch.type].color}`}>
                        {TYPE_CONFIG[ch.type].icon} {TYPE_CONFIG[ch.type].label}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{ch.label}</p>
                      <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{ch.chatIdOrUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Users size={13} />
                        <span className="text-sm font-bold">{(ch.subscribers || 0).toLocaleString("fr-FR")}</span>
                      </div>
                      <p className="text-xs text-gray-400">abonnés via bot</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditId(ch.id); setEditForm({}); setShowForm(false); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { if (confirm(`Supprimer "${ch.label}" ?`)) deleteMutation.mutate(ch.id); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {channels.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          💡 Le bot vérifie que l'utilisateur est membre de tous les canaux actifs avant de lui donner accès.
        </p>
      )}
    </div>
  );
}
