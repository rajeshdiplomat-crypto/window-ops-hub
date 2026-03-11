import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Orders", icon: Package, path: "/orders" },
    ],
  },
  {
    label: "COMMERCIAL",
    items: [
      { label: "Sales", icon: Package, path: "/sales" },
      { label: "Finance", icon: DollarSign, path: "/finance" },
    ],
  },
  {
    label: "ENGINEERING",
    items: [
      { label: "Survey", icon: Eye, path: "/survey" },
      { label: "Design", icon: Paintbrush, path: "/design" },
    ],
  },
  {
    label: "MATERIALS",
    items: [
      { label: "Procurement", icon: ShoppingCart, path: "/procurement" },
      { label: "Store", icon: Warehouse, path: "/store" },
    ],
  },
  {
    label: "MANUFACTURING",
    items: [
      { label: "Production", icon: Factory, path: "/production" },
    ],
  },
  {
    label: "DELIVERY",
    items: [
      { label: "Dispatch", icon: Truck, path: "/dispatch" },
      { label: "Installation", icon: Wrench, path: "/installation" },
    ],
  },
  {
    label: "ISSUES",
    items: [
      { label: "Rework", icon: RefreshCw, path: "/rework" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

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
        </div>
        <nav className="flex-1 overflow-auto p-2 space-y-3">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => renderLink(item.path, item.label, item.icon))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
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
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
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
