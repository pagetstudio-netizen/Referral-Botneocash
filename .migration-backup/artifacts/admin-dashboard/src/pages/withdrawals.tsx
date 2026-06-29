import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWithdrawals,
  useApproveWithdrawal,
  useRejectWithdrawal,
  getListWithdrawalsQueryKey,
} from "@workspace/api-client-react";

function fmt(n: number) {
  return n?.toLocaleString("fr-FR") ?? "0";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

type StatusFilter = "pending" | "approved" | "rejected";

export default function Withdrawals() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: "approve" | "reject" } | null>(null);
  const limit = 20;

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useListWithdrawals({ status, page, limit });
  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListWithdrawalsQueryKey({ status, page, limit }) });

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const approveMutation = useApproveWithdrawal({
    mutation: {
      onSuccess(d) { showMsg("success", d.message); setConfirmAction(null); setNote(""); invalidate(); },
      onError(e: any) { showMsg("error", e?.data?.error || "Erreur"); },
    },
  });

  const rejectMutation = useRejectWithdrawal({
    mutation: {
      onSuccess(d) { showMsg("success", d.message); setConfirmAction(null); setNote(""); invalidate(); },
      onError(e: any) { showMsg("error", e?.data?.error || "Erreur"); },
    },
  });

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: "pending",  label: "En attente" },
    { value: "approved", label: "Valides"    },
    { value: "rejected", label: "Refuses"    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Retraits</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {data ? `${fmt(data.total)} resultats` : "Chargement..."}
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Modal confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              {confirmAction.type === "approve" ? "Approuver ce retrait ?" : "Refuser ce retrait ?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmAction.type === "approve"
                ? "Le statut sera marque comme valide."
                : "Le montant sera rembourse a l'utilisateur."}
            </p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note admin (optionnel)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmAction(null); setNote(""); }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const id = String(confirmAction.id);
                  if (confirmAction.type === "approve") {
                    approveMutation.mutate({ id, data: { note: note || undefined } });
                  } else {
                    rejectMutation.mutate({ id, data: { note: note || undefined } });
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={`flex-1 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 ${
                  confirmAction.type === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {approveMutation.isPending || rejectMutation.isPending ? "En cours..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-full sm:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              status === tab.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Chargement...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">Erreur de chargement</div>
        ) : data?.withdrawals.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Aucun retrait dans cette categorie</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pays / Operateur</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telephone</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    {status === "pending"
                      ? <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      : <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.withdrawals.map((wd) => (
                    <tr key={wd.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">{wd.beneficiaryName || wd.firstName}</div>
                        <div className="text-xs text-gray-500 font-mono">{wd.telegramId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{wd.countryName}</div>
                        <div className="text-xs text-gray-500">{wd.operator}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{wd.phone}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">{fmt(wd.amount)} FCFA</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(wd.createdAt)}</td>
                      {status === "pending" ? (
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmAction({ id: wd.id, type: "approve" })}
                              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => setConfirmAction({ id: wd.id, type: "reject" })}
                              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Refuser
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="px-4 py-3 text-xs text-gray-500">{wd.adminNote || "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {data?.withdrawals.map((wd) => (
                <div key={wd.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{wd.beneficiaryName || wd.firstName}</p>
                      <p className="text-xs text-gray-400 font-mono">{wd.telegramId}</p>
                    </div>
                    <span className="text-base font-bold text-gray-900 shrink-0">{fmt(wd.amount)} FCFA</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>{wd.countryName} · {wd.operator}</span>
                    <span className="font-mono">{wd.phone}</span>
                    <span>{fmtDate(wd.createdAt)}</span>
                  </div>
                  {status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setConfirmAction({ id: wd.id, type: "approve" })}
                        className="flex-1 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: wd.id, type: "reject" })}
                        className="flex-1 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                  {status !== "pending" && wd.adminNote && (
                    <p className="text-xs text-gray-500 italic">Note : {wd.adminNote}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-xs sm:text-sm text-gray-500">Page {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Precedent
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
