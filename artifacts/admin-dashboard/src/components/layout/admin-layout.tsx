import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Menu, X, LayoutDashboard, Users, CreditCard, Radio, Settings, Megaphone, LogOut } from "lucide-react";

const navItems = [
  { href: "/",            label: "Tableau de bord",    icon: LayoutDashboard },
  { href: "/users",       label: "Utilisateurs",       icon: Users           },
  { href: "/withdrawals", label: "Retraits",           icon: CreditCard      },
  { href: "/channels",    label: "Canaux obligatoires",icon: Radio           },
  { href: "/settings",    label: "Parametres",         icon: Settings        },
  { href: "/broadcast",   label: "Diffusion",          icon: Megaphone       },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("moon_crypto_token");
    if (!token) navigate("/login");
  }, [navigate]);

  // Ferme le sidebar quand on change de page (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location]);

  // Ferme le sidebar si la fenêtre devient large
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setSidebarOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  function handleLogout() {
    localStorage.removeItem("moon_crypto_token");
    localStorage.removeItem("moon_crypto_admin");
    window.location.href = "/login";
  }

  const admin = (() => {
    try { return JSON.parse(localStorage.getItem("moon_crypto_admin") || "{}"); }
    catch { return {}; }
  })();

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Moon Crypto" className="w-10 h-10 object-contain rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Moon Crypto</h1>
            <p className="text-xs text-gray-500 truncate max-w-[120px]">{admin.email || "Administrateur"}</p>
          </div>
        </div>
        {/* Fermer drawer sur mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon size={17} className={isActive ? "text-blue-600" : "text-gray-400"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Deconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Overlay mobile ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (fixe) ───────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-20">
        <SidebarContent />
      </aside>

      {/* ── Sidebar mobile (drawer) ──────────────────────────── */}
      <aside
        className={cn(
          "flex md:hidden flex-col fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-200 z-40 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Top bar mobile ───────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-bold text-gray-900 text-base">Moon Crypto Admin</span>
        <div className="w-9" />
      </header>

      {/* ── Contenu principal ────────────────────────────────── */}
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
