import { useGetAdminStats } from "@workspace/api-client-react";
import type { AdminStatsLanguage } from "@workspace/api-client-react";

function fmt(n: number) {
  return n?.toLocaleString("fr-FR") ?? "0";
}

function fmtUsdt(n: number) {
  return `${fmt(n)} USDT`;
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

const LANG_META: Record<string, { flag: string; label: string; bar: string }> = {
  fr: { flag: "🇫🇷", label: "Français",  bar: "bg-blue-500"   },
  en: { flag: "🇬🇧", label: "English",   bar: "bg-green-500"  },
  de: { flag: "🇩🇪", label: "Deutsch",   bar: "bg-yellow-500" },
  zh: { flag: "🇨🇳", label: "中文",      bar: "bg-red-500"    },
  ar: { flag: "🇸🇦", label: "العربية",   bar: "bg-orange-500" },
  es: { flag: "🇪🇸", label: "Español",   bar: "bg-pink-500"   },
  pt: { flag: "🇧🇷", label: "Português", bar: "bg-teal-500"   },
  ru: { flag: "🇷🇺", label: "Русский",   bar: "bg-indigo-500" },
};

function LanguageBar({ lang, count, percent }: AdminStatsLanguage) {
  const meta = LANG_META[lang] ?? { flag: "🌐", label: lang.toUpperCase(), bar: "bg-gray-400" };
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-6 text-center flex-shrink-0">{meta.flag}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 truncate">{meta.label}</span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{fmt(count)} · {percent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>
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

  const languages = stats?.languages ?? [];
  const topLang = languages[0];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble de Moon Crypto Bot</p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* Utilisateurs */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Utilisateurs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard title="Total"         value={stats?.users.total ?? 0} />
            <StatCard title="Aujourd'hui"   value={stats?.users.today ?? 0}  color="green"  />
            <StatCard title="Cette semaine" value={stats?.users.week ?? 0}   color="blue"   />
            <StatCard title="Ce mois"       value={stats?.users.month ?? 0}  color="purple" />
            <StatCard title="Actifs (7j)"   value={stats?.users.active ?? 0} color="amber"  />
            <StatCard title="Bannis"        value={stats?.users.banned ?? 0} color="red"    />
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
            <StatCard title="Montant paye"   value={fmtUsdt(stats?.withdrawals.totalApprovedAmount ?? 0)} color="green" />
          </div>
        </div>

        {/* Bonus */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bonus distribues</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Total bonus payes" value={fmtUsdt(stats?.bonuses.total ?? 0)} color="purple" />
          </div>
        </div>

        {/* Langues */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Repartition par langue</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Barres de progression */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-800">Distribution des utilisateurs</p>
                {topLang && (
                  <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                    {LANG_META[topLang.lang]?.flag ?? "🌐"} {topLang.percent}% dominant
                  </span>
                )}
              </div>
              {languages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucune donnee disponible</p>
              ) : (
                <div className="space-y-3">
                  {languages.map((l) => (
                    <LanguageBar key={l.lang} {...l} />
                  ))}
                </div>
              )}
            </div>

            {/* Tableau recap */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">Detail par langue</p>
              {languages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucune donnee disponible</p>
              ) : (
                <div className="space-y-2">
                  {languages.map((l, i) => {
                    const meta = LANG_META[l.lang] ?? { flag: "🌐", label: l.lang.toUpperCase(), bar: "bg-gray-400" };
                    return (
                      <div key={l.lang} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                          <span className="text-base">{meta.flag}</span>
                          <span className="text-sm font-medium text-gray-700">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">{fmt(l.count)} users</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${meta.bar}`}>
                            {l.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {languages.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                  <span>{languages.length} langue{languages.length > 1 ? "s" : ""} detectee{languages.length > 1 ? "s" : ""}</span>
                  <span>{fmt(languages.reduce((s, l) => s + l.count, 0))} utilisateurs total</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
