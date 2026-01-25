"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  History,
  Settings,
  LogOut,
  Wallet,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { SummaryAPI } from "@/lib/api";



const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Activity", href: "/activity", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SummaryData {
  total_owed: number;
  total_owe: number;
}

interface SidebarProps {
  onAddExpense?: () => void;
}

export function Sidebar({ onAddExpense }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: isCollapsed }));
  }, [isCollapsed]);

  const pathname = usePathname();
  const router = useRouter();
  const [summary, setSummary] = React.useState<SummaryData | null>(null);

  React.useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await SummaryAPI.getDashboard();
        setSummary(data);
      } catch (error) {
        console.error("Sidebar summary fetch failed:", error);
      }
    };
    fetchSummary();

    window.addEventListener("refresh-summary", fetchSummary);
    return () => window.removeEventListener("refresh-summary", fetchSummary);
  }, [pathname]); // Refresh on navigation or when triggered

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  };


  const totalBalance = (summary?.total_owed || 0) - (summary?.total_owe || 0);

  return (
    <>
      <aside className={cn(

        "fixed left-0 top-0 h-screen border-r border-border bg-card flex flex-col z-40 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Wallet className="text-white w-5 h-5" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
                Rupaya
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </button>
        </div>

        {/* Balance Card */}
        <div className="px-4 mb-6">
          <div className={cn(
            "bg-primary/5 border border-primary/10 rounded-2xl transition-all duration-300 overflow-hidden",
            isCollapsed ? "p-2" : "p-4"
          )}>
            {!isCollapsed && (
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Total Balance
              </p>
            )}
            <div className="flex items-center justify-between">
              {!isCollapsed ? (
                <h3 className={cn(
                  "text-xl font-bold",
                  totalBalance > 0 ? "text-emerald-500" : totalBalance < 0 ? "text-rose-500" : "text-foreground",
                )}>
                  {totalBalance > 0 ? "+" : ""}₹{totalBalance.toLocaleString()}
                </h3>
              ) : (
                <div className={cn(
                  "p-2 rounded-lg",
                  totalBalance > 0 ? "text-emerald-500 bg-emerald-500/10" : totalBalance < 0 ? "text-rose-500 bg-rose-500/10" : "text-primary bg-primary/10"
                )}>
                  <Wallet className="w-5 h-5" />
                </div>
              )}

              {!isCollapsed && (
                totalBalance > 0 ? (
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : totalBalance < 0 ? (
                  <div className="bg-rose-500/10 p-1.5 rounded-lg">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  </div>
                ) : (
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                )
              )}
            </div>
            {!isCollapsed && (
              <div className="mt-3 flex gap-2">
                <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground font-medium">Owed</span>
                  <span className="text-sm font-bold text-emerald-500">
                    ₹{(summary?.total_owed || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground font-medium">Owe</span>
                  <span className="text-sm font-bold text-rose-500">
                    ₹{(summary?.total_owe || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden",
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      isActive ? "text-white" : "group-hover:text-primary",
                    )}
                  />
                  {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>}
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="activeNav"
                      className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Actions & Footer */}
        <div className="p-4 mt-auto border-t border-border">
          <Button
            className={cn(
              "w-full flex items-center gap-2 mb-4 bg-foreground text-background hover:bg-foreground/90 rounded-xl overflow-hidden",
              isCollapsed && "justify-center px-0"
            )}
            size="md"
            onClick={onAddExpense}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Add Expense</span>}
          </Button>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/5 text-sm font-medium overflow-hidden",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Sign Out"
        description="Are you sure you want to log out of your account? You will need to sign in again to access your data."
        confirmText="Sign Out"
        variant="destructive"
      />
    </>
  );
}


