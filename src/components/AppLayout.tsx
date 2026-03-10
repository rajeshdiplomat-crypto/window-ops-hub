import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Package,
  Factory,
  Eye,
  DollarSign,
  Paintbrush,
  ShoppingCart,
  ClipboardCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Sales", icon: Package, path: "/sales" },
  { label: "Survey", icon: Eye, path: "/survey" },
  { label: "Finance", icon: DollarSign, path: "/finance" },
  { label: "Design", icon: Paintbrush, path: "/design" },
  { label: "Procurement", icon: ShoppingCart, path: "/procurement" },
  { label: "Production", icon: Factory, path: "/production" },
  { label: "Quality", icon: ClipboardCheck, path: "/quality" },
  { label: "Dispatch", icon: Truck, path: "/dispatch" },
  { label: "Installation", icon: Wrench, path: "/installation" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const renderLink = (path: string, label: string, Icon: any) => {
    const active = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return (
      <Link
        key={path}
        to={path}
        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
          <span className="flex-1 font-semibold text-sm tracking-tight">Window Ops</span>
          <NotificationBell />
        </div>
        <nav className="flex-1 space-y-1 overflow-auto p-2">
          {navItems.map((item) => renderLink(item.path, item.label, item.icon))}
          <Separator className="my-2 bg-sidebar-border" />
          {renderLink("/settings", "Settings", Settings)}
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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
