import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Orders", icon: Package, path: "/" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
          <span className="font-semibold text-sm tracking-tight">Window Ops</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
