"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    ArrowUpRight,
    ArrowDownLeft,
    Users,
    Receipt,
    Plus,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
    { label: "You are owed", value: "₹2,500", icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "You owe", value: "₹840", icon: ArrowDownLeft, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Total Groups", value: "4 Active", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Expenses", value: "12 This Month", icon: Receipt, color: "text-purple-500", bg: "bg-purple-500/10" },
];

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Good afternoon, Devesh. Here&apos;s your expense summary.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search activity..."
                            className="pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
                        />
                    </div>
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        New Expense
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition-shadow"
                    >
                        <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Recent Activity</h2>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">View all</Button>
                    </div>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        {[1, 2, 3, 4].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                        <Receipt className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">Dinner at Olive Garden</h4>
                                        <p className="text-xs text-muted-foreground">In Food & Drinks • Yesterday</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">₹1,240</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">You lent ₹620</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Contacts */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Friends</h2>
                    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    DS
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold">Devesh Soni</h4>
                                    <p className="text-xs text-rose-500 font-medium">owes you ₹250</p>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs">Remind</Button>
                            </div>
                        ))}
                        <Button variant="secondary" className="w-full rounded-xl text-xs h-9">
                            See more friends
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
