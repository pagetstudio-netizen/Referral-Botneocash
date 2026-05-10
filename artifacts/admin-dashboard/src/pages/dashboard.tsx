import { useGetAdminStats } from "@workspace/api-client-react";

function fmt(n: number) {
  return n?.toLocaleString("fr-FR") ?? "0";
}

function fmtFcfa(n: number) {
  return `${fmt(n)} FCFA`;
}

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ title, value, sub, color = "blue" }: StatCardProps) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
    gray: "bg-gray-50 text-gray-700",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${color === "blue" ? "text-gray-900" : colors[color]?.split(" ")[1] || "text-gray-900"}`}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetAdminStats();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Erreur de chargement des statistiques
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble de NeoCash Bot</p>
      </div>

      <div className="space-y-6">
        {/* Users */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Utilisateurs</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Total" value={stats?.users.total ?? 0} />
            <StatCard title="Aujourd'hui" value={stats?.users.today ?? 0} color="green" />
            <StatCard title="Cette semaine" value={stats?.users.week ?? 0} color="blue" />
            <StatCard title="Ce mois" value={stats?.users.month ?? 0} color="purple" />
            <StatCard title="Actifs (7j)" value={stats?.users.active ?? 0} color="amber" />
            <StatCard title="Bannis" value={stats?.users.banned ?? 0} color="red" />
          </div>
        </div>

        {/* Withdrawals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Retraits</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard title="Total demandes" value={stats?.withdrawals.total ?? 0} />
            <StatCard title="En attente" value={stats?.withdrawals.pending ?? 0} color="amber" />
            <StatCard title="Valides" value={stats?.withdrawals.approved ?? 0} color="green" />
            <StatCard title="Refuses" value={stats?.withdrawals.rejected ?? 0} color="red" />
            <StatCard title="Montant paye" value={fmtFcfa(stats?.withdrawals.totalApprovedAmount ?? 0)} color="green" />
          </div>
        </div>

        {/* Bonuses */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Bonus distribues</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard title="Total bonus payes" value={fmtFcfa(stats?.bonuses.total ?? 0)} color="purple" />
          </div>
        </div>
      </div>
    </div>
  );
}
