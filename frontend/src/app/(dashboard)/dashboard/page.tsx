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
import { cn } from "@/lib/utils";

import { api } from "@/lib/api";

interface SummaryData {
    total_owed: number;
    total_owe: number;
    group_count: number;
    recent_activity: {
        id: string;
        description: string;
        amount: number;
        date: string;
        payer_name: string;
        group_name: string;
        type: 'lent' | 'borrowed';
    }[];
    friends: {
        id: string;
        name: string;
        email: string;
    }[];
}

export default function DashboardPage() {
    const [data, setData] = React.useState<SummaryData | null>(null);
    const [user, setUser] = React.useState<{ name: string } | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [summary, userData] = await Promise.all([
                    api.get<SummaryData>("/summary/"),
                    api.get<{ name: string }>("/users/me")
                ]);
                setData(summary);
                setUser(userData);
            } catch (error) {
                console.error("Dashboard fetch failed:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const stats = [
        { label: "You are owed", value: `₹${(data?.total_owed || 0).toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "You owe", value: `₹${(data?.total_owe || 0).toLocaleString()}`, icon: ArrowDownLeft, color: "text-rose-500", bg: "bg-rose-500/10" },
        { label: "Total Groups", value: `${data?.group_count || 0} Active`, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Total Expenses", value: `${data?.recent_activity.length || 0} Recent`, icon: Receipt, color: "text-purple-500", bg: "bg-purple-500/10" },
    ];

    if (loading) {
        return <div className="p-8 animate-pulse space-y-8">
            <div className="h-8 bg-card rounded w-1/4" />
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 h-96 bg-card rounded-2xl" />
                <div className="h-96 bg-card rounded-2xl" />
            </div>
        </div>;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {user?.name.split(' ')[0] || 'User'}. Here&apos;s your expense summary.</p>
                </div>
                <div className="flex items-center gap-3">
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
                    </div>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        {data?.recent_activity.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">No recent activity</div>
                        ) : data?.recent_activity.map((item, i) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                        <Receipt className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">{item.description}</h4>
                                        <p className="text-xs text-muted-foreground">{item.group_name} • {new Date(item.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">₹{item.amount.toLocaleString()}</p>
                                    <p className={cn("text-[10px] font-medium", item.type === 'lent' ? 'text-emerald-500' : 'text-rose-500')}>
                                        {item.type === 'lent' ? 'You lent' : 'You borrowed'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Contacts */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Friends</h2>
                    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                        {data?.friends.length === 0 ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">No friends added yet</div>
                        ) : data?.friends.map((friend) => (
                            <div key={friend.id} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    {friend.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold">{friend.name}</h4>
                                    <p className="text-[10px] text-muted-foreground truncate">{friend.email}</p>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs">View</Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
