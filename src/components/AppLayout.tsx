import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
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
  Truck,
  Wrench,
  Warehouse,
  RefreshCw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Map each nav item to the roles that can see it. Empty = visible to all.
const navItems = [
  { label: "Operations Hub", icon: LayoutDashboard, path: "/", group: 0, roles: [] as string[] },
  { label: "Orders", icon: Package, path: "/orders", group: 0, roles: [] },
  { label: "Sales", icon: Package, path: "/sales", group: 1, roles: ["sales"] },
  { label: "Finance", icon: DollarSign, path: "/finance", group: 1, roles: ["finance"] },
  { label: "Survey", icon: Eye, path: "/survey", group: 2, roles: ["survey"] },
  { label: "Design", icon: Paintbrush, path: "/design", group: 2, roles: ["design"] },
  { label: "Procurement", icon: ShoppingCart, path: "/procurement", group: 3, roles: ["procurement"] },
  { label: "Store", icon: Warehouse, path: "/store", group: 3, roles: ["stores"] },
  { label: "Production", icon: Factory, path: "/production", group: 4, roles: ["production"] },
  { label: "Dispatch", icon: Truck, path: "/dispatch", group: 5, roles: ["dispatch"] },
  { label: "Installation", icon: Wrench, path: "/installation", group: 5, roles: ["installation"] },
  { label: "Rework", icon: RefreshCw, path: "/rework", group: 6, roles: [] },
  { label: "Settings", icon: Settings, path: "/settings", group: 7, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { roles: userRoles } = useUserRoles();
  const location = useLocation();
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setProfileName(data.name);
      });
  }, [user]);

  const isAdmin = userRoles.includes("admin");
  const isManagement = userRoles.includes("management");

  // Filter nav items based on user roles
  const visibleItems = navItems.filter((item) => {
    // Admin and management see everything
    if (isAdmin || isManagement) return true;
    // Items with no role restriction are visible to all
    if (item.roles.length === 0) return true;
    // Check if user has any of the required roles
    return item.roles.some((r) => userRoles.includes(r as any));
  });

  const initials = profileName
    ? profileName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() || "U");

  const renderLink = (path: string, label: string, Icon: any) => {
    const active = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return (
      <Link
        key={path}
        to={path}
        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${active
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
        </div>
        <nav className="flex-1 overflow-auto p-2 space-y-0.5">
          {visibleItems.map((item, i) => {
            const prevGroup = i > 0 ? visibleItems[i - 1].group : item.group;
            return (
              <div key={item.path}>
                {i > 0 && item.group !== prevGroup && (
                  <Separator className="my-1.5 bg-sidebar-border" />
                )}
                {renderLink(item.path, item.label, item.icon)}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-4 bg-card shrink-0">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{profileName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
