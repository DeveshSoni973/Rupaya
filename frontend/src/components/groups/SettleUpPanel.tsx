"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, HandCoins } from "lucide-react";
import { SummaryAPI, type DebtTransaction } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface SettleUpPanelProps {
    groupId: string;
    currentUserId?: string;
}

export function SettleUpPanel({ groupId, currentUserId }: SettleUpPanelProps) {
    const [debts, setDebts] = useState<DebtTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSettling, setIsSettling] = useState(false);
    const { subscribe } = useWebSocket();
    const { toast } = useToast();

    const fetchDebts = useCallback(async () => {
        try {
            const data = await SummaryAPI.getDebts(groupId);
            setDebts(data);
        } catch (err) {
            console.error("Failed to fetch debts:", err);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    // Initial load
    useEffect(() => {
        fetchDebts();
    }, [fetchDebts]);

    // Real-time refresh on any bill or settle event
    useEffect(() => {
        const unsub = subscribe(groupId, (msg) => {
            if (
                msg.type === "NEW_BILL" ||
                msg.type === "UPDATE_BILL" ||
                msg.type === "SETTLE_UP" ||
                msg.type === "PAYMENT_UPDATE"
            ) {
                fetchDebts();
            }
        });
        return unsub;
    }, [groupId, subscribe, fetchDebts]);

    const handleSettleEverything = async () => {
        setIsSettling(true);
        try {
            const result = await SummaryAPI.settleUp(groupId);
            toast(
                `Successfully recorded ${result.settled_count} settlement transactions!`,
                "success"
            );
            await fetchDebts();
        } catch (err) {
            toast(
                err instanceof Error ? err.message : "Failed to settle up",
                "error"
            );
        } finally {
            setIsSettling(false);
        }
    };

    // Split debts into: what I owe (from = me) vs what others owe me (to = me)
    const iOwe = debts.filter((d) => d.from.id === currentUserId);
    const owedToMe = debts.filter((d) => d.to.id === currentUserId);
    const otherDebts = debts.filter(
        (d) => d.from.id !== currentUserId && d.to.id !== currentUserId
    );

    const isInvolved = iOwe.length > 0 || owedToMe.length > 0;
    const isEmpty = debts.length === 0;

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-secondary/20">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <HandCoins className="w-4 h-4" />
                </div>
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
                        Settle Up
                    </h2>
                    <p className="text-[10px] text-muted-foreground">
                        Simplified debts for this group
                    </p>
                </div>
                {loading && (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-auto" />
                )}
            </div>

            <div className="p-4 space-y-3">
                <AnimatePresence mode="popLayout">
                    {isEmpty && !loading ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-8 text-center gap-2"
                        >
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            <p className="font-bold text-sm">All settled up!</p>
                            <p className="text-xs text-muted-foreground">
                                No outstanding debts in this group.
                            </p>
                        </motion.div>
                    ) : (
                        <>
                            {/* I owe someone */}
                            {iOwe.map((debt) => (
                                <DebtRow
                                    key={`${debt.from.id}-${debt.to.id}`}
                                    debt={debt}
                                    highlight="owe"
                                />
                            ))}

                            {/* Someone owes me */}
                            {owedToMe.map((debt) => (
                                <DebtRow
                                    key={`${debt.from.id}-${debt.to.id}`}
                                    debt={debt}
                                    highlight="owed"
                                />
                            ))}

                            {/* Other group members' debts (not involving current user) */}
                            {otherDebts.map((debt) => (
                                <DebtRow
                                    key={`${debt.from.id}-${debt.to.id}`}
                                    debt={debt}
                                    highlight="neutral"
                                />
                            ))}

                            {isInvolved && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="pt-2"
                                >
                                    <Button
                                        className="w-full rounded-xl font-bold h-11 shadow-lg shadow-primary/20"
                                        onClick={handleSettleEverything}
                                        disabled={isSettling}
                                    >
                                        {isSettling ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                        )}
                                        {isSettling ? "Recording Settlements..." : "Settle My Debts"}
                                    </Button>
                                    <p className="text-[9px] text-center text-muted-foreground mt-2 px-4 italic">
                                        This will mark your shared bills as paid and record your final settlements in history.
                                    </p>
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

interface DebtRowProps {
    debt: DebtTransaction;
    highlight: "owe" | "owed" | "neutral";
}

function DebtRow({ debt, highlight }: DebtRowProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-sm transition-all",
                highlight === "owe"
                    ? "bg-rose-500/5 border-rose-500/20"
                    : highlight === "owed"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-secondary/30 border-border"
            )}
        >
            {/* From */}
            <div className="flex-1 min-w-0">
                <span
                    className={cn(
                        "font-bold truncate block",
                        highlight === "owe" ? "text-rose-500" : highlight === "owed" ? "text-emerald-500" : "text-foreground"
                    )}
                >
                    {debt.from.name}
                </span>
            </div>

            {/* Arrow + amount */}
            <div className="flex items-center gap-1.5 shrink-0">
                <ArrowRight
                    className={cn(
                        "w-3.5 h-3.5",
                        highlight === "owe"
                            ? "text-rose-400"
                            : highlight === "owed"
                                ? "text-emerald-400"
                                : "text-muted-foreground"
                    )}
                />
                <span
                    className={cn(
                        "font-black text-sm tabular-nums",
                        highlight === "owe"
                            ? "text-rose-500"
                            : highlight === "owed"
                                ? "text-emerald-500"
                                : "text-foreground"
                    )}
                >
                    ₹{debt.amount.toLocaleString()}
                </span>
                <ArrowRight
                    className={cn(
                        "w-3.5 h-3.5",
                        highlight === "owe"
                            ? "text-rose-400"
                            : highlight === "owed"
                                ? "text-emerald-400"
                                : "text-muted-foreground"
                    )}
                />
            </div>

            {/* To */}
            <div className="flex-1 min-w-0 text-right">
                <span className="font-bold truncate block text-foreground">
                    {debt.to.name}
                </span>
            </div>
        </motion.div>
    );
}
