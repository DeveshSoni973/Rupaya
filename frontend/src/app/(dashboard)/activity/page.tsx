"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    History,
    Receipt,
    ArrowUpRight,
    ArrowDownLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BillsAPI, type Bill } from "@/lib/api";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { UsersAPI } from "@/lib/api/users";
import { motion } from "framer-motion";

export default function ActivityPage() {
    const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await UsersAPI.getCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to fetch current user:", error);
            }
        };
        fetchUser();
    }, []);

    const fetchData = useCallback(
        async (skip: number, limit: number) => {
            return await BillsAPI.getUserBills(skip, limit);
        },
        []
    );

    const {
        items: bills,
        loading,
        hasMore,
        loaderRef,
    } = useInfiniteScroll<Bill>({
        fetchData,
        limit: 15,
    });

    return (
        <motion.div
            initial={{ opacity: 0, rotateX: -20, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, rotateX: 0, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-8 pb-20 max-w-4xl mx-auto [perspective:1200px]"
        >
            {/* Header */}
            <div className="bg-card border border-border rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
                            <History className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-widest text-primary/60">Transaction History</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight mb-2">Recent <span className="text-primary">Activity</span></h1>
                    <p className="text-muted-foreground text-lg max-w-md">Track every rupee you spend, lend, or owe across all your groups.</p>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-4">
                {bills.map((item) => {
                    const myShare = item.shares.find(
                        (s) => s.user_id === currentUser?.id
                    );
                    const isPayer = item.paid_by === currentUser?.id;

                    // Don't show bills where user has no relationship
                    if (!isPayer && !myShare) return null;

                    return (
                        <div
                            key={item.id}
                            className="bg-card border border-border rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-primary/40 transition-all hover:translate-x-1 group"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-secondary/50 rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Receipt className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg tracking-tight mb-1">
                                        {item.description}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                        <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter">{item.group?.name}</span>
                                        <span>•</span>
                                        <span>
                                            Paid by{" "}
                                            <span className="font-semibold text-foreground/80">
                                                {isPayer ? "You" : (item.payer?.name || item.payer?.email || "Unknown")}
                                            </span>
                                        </span>
                                        <span>•</span>
                                        <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-border/50">
                                <div className="text-right">
                                    {isPayer ? (
                                        // User is the payer
                                        myShare ? (
                                            // Payer has a share
                                            item.total_amount - myShare.amount > 0 ? (
                                                <>
                                                    <div className="text-sm font-black flex items-center gap-1 justify-end text-emerald-500">
                                                        <ArrowUpRight className="w-4 h-4" />
                                                        Lent ₹{(item.total_amount - myShare.amount).toLocaleString()}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                                                        {/* Check if all OTHER shares are paid */}
                                                        {item.shares.filter(s => s.user_id !== currentUser?.id).every(s => s.paid) ? "Settled" : "Pending"}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-sm font-black flex items-center gap-1 justify-end text-muted-foreground">
                                                        <Receipt className="w-4 h-4 text-muted-foreground/40" />
                                                        Spent ₹{myShare.amount.toLocaleString()}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                                                        Settled
                                                    </p>
                                                </>
                                            )
                                        ) : (
                                            // Payer has no share - lent full amount
                                            <>
                                                <div className="text-sm font-black flex items-center gap-1 justify-end text-emerald-500">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                    Lent ₹{item.total_amount.toLocaleString()}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                                                    {/* Check if all shares are paid */}
                                                    {item.shares.every(s => s.paid) ? "Settled" : "Pending"}
                                                </p>
                                            </>
                                        )
                                    ) : myShare ? (
                                        // User is not payer but has a share
                                        <>
                                            <div className="text-sm font-black flex items-center gap-1 justify-end text-rose-500">
                                                <ArrowDownLeft className="w-4 h-4" />
                                                Owe ₹{myShare.amount.toLocaleString()}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                                                {myShare.paid ? "Settled" : "Pending"}
                                            </p>
                                        </>
                                    ) : null}
                                </div>
                                <div className="text-right min-w-[100px]">
                                    <p className="text-xl font-black">
                                        ₹{item.total_amount.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                        Total Bill
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Scroll Sentinel */}
                <div ref={loaderRef} className="h-4" />

                {/* Loading / Status UI */}
                <div className="py-10">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-card border border-border/20 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : hasMore ? (
                        <div className="flex flex-col items-center gap-4 py-10 opacity-50">
                            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Checking for more</p>
                        </div>
                    ) : bills.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-border/50 rounded-[3rem] bg-secondary/5">
                            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Receipt className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">No activity yet</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                Start adding expenses in your groups to see your financial journey unfold here.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-40 py-10">
                            <div className="w-px h-12 bg-gradient-to-b from-transparent to-border mb-4" />
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">End of activity</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
