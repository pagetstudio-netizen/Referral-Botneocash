import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUser,
  useBanUser,
  useCreditUser,
  useToggleWithdrawalUnlock,
  getGetUserQueryKey,
} from "@workspace/api-client-react";

function fmt(n: number) {
  return n?.toLocaleString("fr-FR") ?? "0";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function UserDetail() {
  const params = useParams<{ telegramId: string }>();
  const telegramId = params.telegramId;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [creditAmount, setCreditAmount] = useState("");
  const [creditType, setCreditType] = useState<"credit" | "debit">("credit");
  const [banReason, setBanReason] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: user, isLoading, error } = useGetUser(telegramId);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(telegramId) });

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const banMutation = useBanUser({
    mutation: {
      onSuccess(data) { showMsg("success", data.message); invalidate(); },
      onError(e: any) { showMsg("error", e?.data?.error || "Erreur"); },
    },
  });

  const creditMutation = useCreditUser({
    mutation: {
      onSuccess(data) { showMsg("success", data.message); setCreditAmount(""); invalidate(); },
      onError(e: any) { showMsg("error", e?.data?.error || "Erreur"); },
    },
  });

  const unlockMutation = useToggleWithdrawalUnlock({
    mutation: {
      onSuccess(data) { showMsg("success", data.message); invalidate(); },
      onError(e: any) { showMsg("error", e?.data?.error || "Erreur"); },
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          Utilisateur introuvable
        </div>
        <button onClick={() => navigate("/users")} className="mt-4 text-sm text-blue-600 hover:underline">
          Retour aux utilisateurs
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <button onClick={() => navigate("/users")} className="text-sm text-gray-500 hover:text-gray-700">
          Utilisateurs
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">
          {user.firstName} {user.lastName || ""}
        </span>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Profile */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {user.firstName} {user.lastName || ""}
                </h2>
                {user.username && (
                  <p className="text-sm text-gray-500">@{user.username}</p>
                )}
              </div>
              <div className="flex gap-2">
                {user.banned ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Banni</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Actif</span>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 font-medium">ID Telegram</dt>
                <dd className="text-gray-900 font-mono mt-0.5">{user.telegramId}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Code parrainage</dt>
                <dd className="text-gray-900 font-mono mt-0.5">{user.referralCode}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Solde</dt>
                <dd className="text-gray-900 font-semibold mt-0.5">{fmt(user.balance)} FCFA</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Filleuls</dt>
                <dd className="text-gray-900 mt-0.5">{user.referralCount} / 15 min</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Gains parrainage</dt>
                <dd className="text-gray-900 mt-0.5">{fmt(user.referralEarnings)} FCFA</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Gains bonus</dt>
                <dd className="text-gray-900 mt-0.5">{fmt(user.bonusEarnings)} FCFA</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Total retire</dt>
                <dd className="text-gray-900 mt-0.5">{fmt(user.totalWithdrawn)} FCFA</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Retrait</dt>
                <dd className="mt-0.5">
                  {user.withdrawalUnlocked ? (
                    <span className="text-blue-600 font-medium">Debloque (admin)</span>
                  ) : user.referralCount >= 15 ? (
                    <span className="text-green-600 font-medium">Disponible</span>
                  ) : (
                    <span className="text-gray-600">Verrouille ({user.referralCount}/15)</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Inscription</dt>
                <dd className="text-gray-900 mt-0.5">{fmtDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Derniere activite</dt>
                <dd className="text-gray-900 mt-0.5">{fmtDate(user.lastActivityAt)}</dd>
              </div>
            </dl>

            {user.banned && user.bannedReason && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                <strong>Raison du ban :</strong> {user.bannedReason}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Credit/Debit */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Credit / Debit</h3>
            <div className="space-y-3">
              <select
                value={creditType}
                onChange={(e) => setCreditType(e.target.value as "credit" | "debit")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="credit">Crediter</option>
                <option value="debit">Debiter</option>
              </select>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Montant en FCFA"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const amount = parseInt(creditAmount);
                  if (!amount || amount <= 0) return;
                  creditMutation.mutate({
                    telegramId,
                    data: { amount, type: creditType },
                  });
                }}
                disabled={creditMutation.isPending || !creditAmount}
                className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  creditType === "credit"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {creditMutation.isPending ? "En cours..." : creditType === "credit" ? "Crediter" : "Debiter"}
              </button>
            </div>
          </div>

          {/* Withdrawal unlock */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Acces au retrait</h3>
            <p className="text-xs text-gray-500 mb-3">
              {user.withdrawalUnlocked ? "Le retrait est debloque par admin." : "Debloquer manuellement l'acces au retrait."}
            </p>
            <button
              onClick={() => unlockMutation.mutate({
                telegramId,
                data: { unlocked: !user.withdrawalUnlocked },
              })}
              disabled={unlockMutation.isPending}
              className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                user.withdrawalUnlocked
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {unlockMutation.isPending ? "En cours..." : user.withdrawalUnlocked ? "Verrouiller retrait" : "Debloquer retrait"}
            </button>
          </div>

          {/* Ban/Unban */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{user.banned ? "Debannir" : "Bannir"}</h3>
            {!user.banned && (
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Raison (optionnel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
            )}
            <button
              onClick={() => banMutation.mutate({
                telegramId,
                data: { banned: !user.banned, reason: banReason || undefined },
              })}
              disabled={banMutation.isPending}
              className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                user.banned
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {banMutation.isPending ? "En cours..." : user.banned ? "Debannir" : "Bannir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
