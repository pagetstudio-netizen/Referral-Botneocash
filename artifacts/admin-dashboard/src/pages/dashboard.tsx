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
  const textColors: Record<string, string> = {
    blue: "text-gray-900",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
    purple: "text-purple-700",
    gray: "text-gray-700",
  };
  const bgColors: Record<string, string> = {
    blue: "border-gray-200",
    green: "border-green-100",
    amber: "border-amber-100",
    red: "border-red-100",
    purple: "border-purple-100",
    gray: "border-gray-200",
  };
  return (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 ${bgColors[color] ?? "border-gray-200"}`}>
      <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{title}</div>
      <div className={`text-xl sm:text-2xl font-bold ${textColors[color] ?? "text-gray-900"}`}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetAdminStats();

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-7 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          Erreur de chargement des statistiques
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble de NeoCash Bot</p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* Utilisateurs */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Utilisateurs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard title="Total"        value={stats?.users.total ?? 0} />
            <StatCard title="Aujourd'hui"  value={stats?.users.today ?? 0}  color="green"  />
            <StatCard title="Cette semaine"value={stats?.users.week ?? 0}   color="blue"   />
            <StatCard title="Ce mois"      value={stats?.users.month ?? 0}  color="purple" />
            <StatCard title="Actifs (7j)"  value={stats?.users.active ?? 0} color="amber"  />
            <StatCard title="Bannis"       value={stats?.users.banned ?? 0} color="red"    />
          </div>
        </div>

        {/* Retraits */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Retraits</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard title="Total demandes" value={stats?.withdrawals.total ?? 0} />
            <StatCard title="En attente"     value={stats?.withdrawals.pending ?? 0}  color="amber" />
            <StatCard title="Valides"        value={stats?.withdrawals.approved ?? 0} color="green" />
            <StatCard title="Refuses"        value={stats?.withdrawals.rejected ?? 0} color="red"   />
            <StatCard title="Montant paye"   value={fmtFcfa(stats?.withdrawals.totalApprovedAmount ?? 0)} color="green" />
          </div>
        </div>

        {/* Bonus */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bonus distribues</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Total bonus payes" value={fmtFcfa(stats?.bonuses.total ?? 0)} color="purple" />
          </div>
        </div>
      </div>
    </div>
  );
}
