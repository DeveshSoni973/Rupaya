"use client";

import { Receipt, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BillShare {
    id: string;
    user_id: string;
    amount: number;
    paid: boolean;
    user: {
        id: string;
        name: string;
    };
}

interface Bill {
    id: string;
    description: string;
    total_amount: number;
    split_type: "EQUAL" | "EXACT" | "PERCENTAGE";
    created_at: string;
    payer: {
        id: string;
        name: string;
    } | null;
    shares: BillShare[];
}

interface ExpenseListProps {
    bills: Bill[];
    currentUserId: string | undefined;
    onAddExpense: () => void;
}

export function ExpenseList({ bills, currentUserId, onAddExpense }: ExpenseListProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Expenses</h2>
            </div>

            <div className="space-y-3">
                {bills.length > 0 ? (
                    bills.map((bill) => {
                        const myShare = bill.shares.find(s => s.user_id === currentUserId);
                        const isPayer = bill.payer?.id === currentUserId;

                        return (
                            <div key={bill.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:border-primary/30 transition-all hover:bg-primary/[0.01]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-secondary/80 rounded-xl flex items-center justify-center">
                                        <Receipt className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm tracking-tight">{bill.description}</h4>
                                        <p className="text-[10px] text-muted-foreground">
                                            Paid by <span className="font-semibold text-foreground/80">{isPayer ? "You" : (bill.payer?.name || 'Unknown')}</span> • {new Date(bill.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {myShare && (
                                        <div className="text-right hidden sm:block">
                                            <p className={cn(
                                                "text-xs font-bold",
                                                isPayer ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {isPayer ? (
                                                    <span className="flex items-center gap-1">
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        Owed ₹{(bill.total_amount - myShare.amount).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <ArrowDownLeft className="w-3 h-3" />
                                                        You owe ₹{myShare.amount.toLocaleString()}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                                {myShare.paid ? "Settled" : "Pending"}
                                            </p>
                                        </div>
                                    )}
                                    <div className="text-right min-w-[80px]">
                                        <p className="text-base font-black">₹{bill.total_amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase">
                                            Total
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/5">
                        <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No expenses yet.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 rounded-xl"
                            onClick={onAddExpense}
                        >
                            Add First Expense
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
