import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ROLE_QUEUES } from "@/lib/roleQueueConfig";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  Package,
  Factory,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const coreNavItems = [
  { label: "Orders", icon: Package, path: "/" },
  { label: "Production", icon: Factory, path: "/production" },
];

const adminNavItems = [
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { roles, hasRole } = useUserRoles();
  const location = useLocation();

  const isAdmin = hasRole("admin") || hasRole("management");

  // Build role-specific queue links
  const queueLinks = ROLE_QUEUES.filter((q) => hasRole(q.role) || isAdmin);

  const renderLink = (path: string, label: string, Icon: any) => {
    const active = location.pathname === path;
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
          <span className="font-semibold text-sm tracking-tight">Window Ops</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-auto p-2">
          {coreNavItems.map((item) => renderLink(item.path, item.label, item.icon))}

          {queueLinks.length > 0 && (
            <>
              <Separator className="my-2 bg-sidebar-border" />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                My Queues
              </div>
              {queueLinks.map((q) =>
                renderLink(`/queue/${q.role}`, q.label.replace(" Queue", ""), ClipboardList)
              )}
            </>
          )}

          {isAdmin && (
            <>
              <Separator className="my-2 bg-sidebar-border" />
              {adminNavItems.map((item) => renderLink(item.path, item.label, item.icon))}
            </>
          )}
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
