import { useLocation } from "wouter";
import { useEffect } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Tableau de bord" },
  { href: "/users", label: "Utilisateurs" },
  { href: "/withdrawals", label: "Retraits" },
  { href: "/channels", label: "Canaux obligatoires" },
  { href: "/settings", label: "Parametres" },
  { href: "/broadcast", label: "Diffusion" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("neocash_token");
    if (!token) navigate("/login");
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("neocash_token");
    localStorage.removeItem("neocash_admin");
    window.location.href = "/login";
  }

  const admin = (() => {
    try {
      return JSON.parse(localStorage.getItem("neocash_admin") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">NeoCash Admin</h1>
          <p className="text-xs text-gray-500 mt-1">{admin.email || "Administrateur"}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
          >
            Deconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
