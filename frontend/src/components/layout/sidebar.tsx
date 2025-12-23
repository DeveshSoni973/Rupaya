"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    ArrowUpRight,
    ArrowDownLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Groups", href: "/groups", icon: Users },
    { name: "Activity", href: "/activity", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col z-40">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Wallet className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">Rupaya</span>
            </div>

            {/* Balance Card */}
            <div className="px-4 mb-6">
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Total Balance</p>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">₹2,450.00</h3>
                        <div className="bg-primary/10 p-1.5 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-lg p-2 flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-medium">Owed</span>
                            <span className="text-sm font-bold text-emerald-500">₹850</span>
                        </div>
                        <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-lg p-2 flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-medium">Owe</span>
                            <span className="text-sm font-bold text-rose-500">₹250</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer",
                                isActive
                                    ? "bg-primary text-white shadow-md shadow-primary/10"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}>
                                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-primary")} />
                                <span className="font-medium text-sm">{item.name}</span>
                                {isActive && (
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
                <Button className="w-full justify-start gap-2 mb-4 bg-foreground text-background hover:bg-foreground/90 rounded-xl" size="md">
                    <PlusCircle className="w-4 h-4" />
                    Add Expense
                </Button>
                <button className="flex items-center gap-3 w-full px-3 py-2.5 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/5 text-sm font-medium">
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
