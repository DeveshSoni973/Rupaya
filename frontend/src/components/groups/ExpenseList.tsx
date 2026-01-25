"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Receipt, ArrowUpRight, ArrowDownLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BillsAPI, type Bill } from "@/lib/api";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface ExpenseListProps {
  groupId: string;
  currentUserId: string | undefined;
  onAddExpense: () => void;
  refreshTrigger?: number;
}

export function ExpenseList({
  groupId,
  currentUserId,
  onAddExpense,
  refreshTrigger = 0,
}: ExpenseListProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(
    async (skip: number, limit: number) => {
      return await BillsAPI.getGroupBills(groupId, skip, limit, debouncedSearch);
    },
    [groupId, debouncedSearch]
  );

  const {
    items: bills,
    loading,
    hasMore,
    loaderRef,
    reset,
  } = useInfiniteScroll<Bill>({
    fetchData,
    limit: 10,
  });

  // Reset when group, search, or refresh trigger changes
  useEffect(() => {
    reset();
  }, [groupId, debouncedSearch, refreshTrigger, reset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Expenses</h2>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            className="pl-9 bg-secondary/20 border-border/50 rounded-xl h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar overscroll-contain">
        {bills.map((bill) => {
          const myShare = bill.shares.find(
            (s) => s.user_id === currentUserId
          );
          const isPayer = bill.paid_by === currentUserId;

          return (
            <div
              key={bill.id}
              className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:border-primary/30 transition-all hover:bg-primary/[0.01]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-secondary/80 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight">
                    {bill.description}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Paid by{" "}
                    <span className="font-semibold text-foreground/80">
                      {isPayer ? "You" : (bill.payer?.name || bill.payer?.email || "Unknown")}
                    </span>{" "}
                    • {new Date(bill.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {(isPayer || myShare) && (
                  <div className="text-right hidden sm:block">
                    <p
                      className={cn(
                        "text-xs font-bold",
                        isPayer ? "text-emerald-500" : "text-rose-500"
                      )}
                    >
                      {isPayer ? (
                        <span className="flex items-center gap-1">
                          {myShare ? (
                            // Payer has a share
                            bill.total_amount - myShare.amount > 0 ? (
                              <>
                                <ArrowUpRight className="w-3 h-3" />
                                You lent ₹{(bill.total_amount - myShare.amount).toLocaleString()}
                              </>
                            ) : (
                              <>
                                <Receipt className="w-3 h-3 text-muted-foreground/50" />
                                You spent ₹{myShare.amount.toLocaleString()}
                              </>
                            )
                          ) : (
                            // Payer has no share - lent full amount
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              You lent ₹{bill.total_amount.toLocaleString()}
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" />
                          You owe ₹{myShare!.amount.toLocaleString()}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">
                      {isPayer ? (
                        myShare ? (
                          // Check if all OTHER shares are paid
                          bill.shares.filter(s => s.user_id !== currentUserId).every(s => s.paid) ? "Settled" : "Pending"
                        ) : (
                          // Check if all shares are paid
                          bill.shares.every(s => s.paid) ? "Settled" : "Pending"
                        )
                      ) : (
                        myShare!.paid ? "Settled" : "Pending"
                      )}
                    </p>
                  </div>
                )}
                <div className="text-right min-w-[80px]">
                  <p className="text-base font-black">
                    ₹{bill.total_amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">
                    Total
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Scroll Sentinel */}
        <div ref={loaderRef} className="h-4" />

        {/* Loading / Status UI */}
        <div className="py-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-secondary/10 animate-pulse rounded-2xl border border-border/20" />
              ))}
            </div>
          ) : hasMore ? (
            <div className="flex justify-center py-4 opacity-50">
              <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
            </div>
          ) : bills.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/5">
              <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                {debouncedSearch ? "No balances match your search." : "No expenses yet."}
              </p>
              {!debouncedSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={onAddExpense}
                >
                  Add First Expense
                </Button>
              )}
            </div>
          ) : (
            <p className="text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest py-8 opacity-40">
              You&apos;ve reached the end
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
