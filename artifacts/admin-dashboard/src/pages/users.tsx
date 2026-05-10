import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Link } from "wouter";

function fmt(n: number) {
  return n?.toLocaleString("fr-FR") ?? "0";
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"" | "true" | "false">("");
  const limit = 20;

  const { data, isLoading, error, refetch } = useListUsers({
    search: search || undefined,
    page,
    limit,
    banned: filter || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    refetch();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Utilisateurs</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {data ? `${fmt(data.total)} utilisateurs au total` : "Chargement..."}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Rechercher par ID Telegram, username ou prenom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les comptes</option>
            <option value="false">Actifs</option>
            <option value="true">Bannis</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Rechercher
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Erreur de chargement</div>
        ) : data?.users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun utilisateur trouve</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Telegram</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Solde</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Filleuls</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retrait</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.users.map((user) => (
                <tr key={user.telegramId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-gray-900">
                      {user.firstName} {user.lastName || ""}
                    </div>
                    {user.username && (
                      <div className="text-xs text-gray-500">@{user.username}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.telegramId}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {fmt(user.balance)} FCFA
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{user.referralCount}</td>
                  <td className="px-4 py-3 text-center">
                    {user.banned ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Banni
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.withdrawalUnlocked ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Debloque
                      </span>
                    ) : user.referralCount >= 15 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {user.referralCount}/15
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/users/${user.telegramId}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Precedent
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
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
