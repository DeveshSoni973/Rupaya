"use client";

import React, { useState, useEffect } from "react";
import { Plus, Receipt, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface User {
    id: string;
    name: string;
    email: string;
}

interface Member {
    id: string;
    user: User;
    role: string;
}

interface GroupOption {
    id: string;
    name: string;
}

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    currentUser: { id: string } | null;
    initialGroupId?: string;
    // If not on a group page, we might want to pass these or let the component fetch them
    members?: Member[];
    groups?: GroupOption[];
}

export function AddExpenseModal({
    isOpen,
    onClose,
    onSuccess,
    currentUser,
    initialGroupId,
    members: providedMembers,
    groups: providedGroups
}: AddExpenseModalProps) {
    const [billTitle, setBillTitle] = useState("");
    const [billAmount, setBillAmount] = useState("");
    const [payerId, setPayerId] = useState<string>("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [splitType, setSplitType] = useState<"EQUAL" | "EXACT">("EQUAL");
    const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
    const [isSubmittingBill, setIsSubmittingBill] = useState(false);

    // For when we use this outside a specific group
    const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
    const [groupMembers, setGroupMembers] = useState<Member[]>(providedMembers || []);
    const [availableGroups, setAvailableGroups] = useState<GroupOption[]>(providedGroups || []);

    // Sync with props
    useEffect(() => {
        if (initialGroupId) setSelectedGroupId(initialGroupId);
    }, [initialGroupId]);

    useEffect(() => {
        if (providedMembers) setGroupMembers(providedMembers);
        if (providedGroups) setAvailableGroups(providedGroups);
    }, [providedMembers, providedGroups]);

    // Fetch members if group changes and we don't have them
    useEffect(() => {
        if (selectedGroupId && !providedMembers) {
            fetchGroupMembers(selectedGroupId);
        }
    }, [selectedGroupId, providedMembers]);

    // Fetch groups if not provided
    useEffect(() => {
        if (isOpen && !initialGroupId && !providedGroups) {
            fetchGroups();
        }
    }, [isOpen, initialGroupId, providedGroups]);

    const fetchGroups = async () => {
        try {
            const data = await api.get<any[]>("/groups/");
            setAvailableGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        }
    };

    const fetchGroupMembers = async (gid: string) => {
        try {
            const data = await api.get<any>(`/groups/${gid}`);
            setGroupMembers(data.members || []);
            // Default select all members
            setSelectedMemberIds((data.members || []).map((m: any) => m.user.id));
        } catch (error) {
            console.error("Failed to fetch members", error);
        }
    };

    // Default payer to current user
    useEffect(() => {
        if (currentUser && !payerId) {
            setPayerId(currentUser.id);
        }
    }, [currentUser, payerId]);

    // Default select all members when group members are loaded
    useEffect(() => {
        if (groupMembers.length > 0 && selectedMemberIds.length === 0) {
            setSelectedMemberIds(groupMembers.map(m => m.user.id));
        }
    }, [groupMembers]);

    const handleAddBill = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingBill(true);

        if (!selectedGroupId) {
            alert("Please select a group");
            setIsSubmittingBill(false);
            return;
        }

        if (selectedMemberIds.length === 0) {
            alert("Please select at least one person to split with.");
            setIsSubmittingBill(false);
            return;
        }

        if (splitType === "EXACT") {
            const total = Object.values(exactAmounts).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
            if (Math.abs(total - parseFloat(billAmount)) > 0.01) {
                alert(`The total of all shares (₹${total}) must equal the bill amount (₹${billAmount})`);
                setIsSubmittingBill(false);
                return;
            }
        }

        try {
            await api.post("/bills/", {
                group_id: selectedGroupId,
                description: billTitle,
                total_amount: parseFloat(billAmount),
                paid_by: payerId,
                split_type: splitType,
                shares: selectedMemberIds.map(uid => ({
                    user_id: uid,
                    amount: splitType === "EXACT" ? parseFloat(exactAmounts[uid] || "0") : undefined
                }))
            });

            onClose();
            // Reset form
            setBillTitle("");
            setBillAmount("");
            setExactAmounts({});

            if (onSuccess) onSuccess();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to add expense");
        } finally {
            setIsSubmittingBill(false);
        }
    };

    const totalExactAmount = Object.values(exactAmounts).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    const remainingAmount = parseFloat(billAmount || "0") - totalExactAmount;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Expense"
            description="Fill in the details to split a new bill."
        >
            <form onSubmit={handleAddBill} className="space-y-6">
                <div className="space-y-4">
                    {/* Group Selection (only if not fixed) */}
                    {!initialGroupId && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Group</label>
                            <div className="relative">
                                <select
                                    className="w-full h-11 bg-secondary/50 border border-border rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Choose a group...</option>
                                    {availableGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">What was this for?</label>
                        <Input
                            placeholder="e.g. Dinner, Rent, Movie"
                            value={billTitle}
                            onChange={(e) => setBillTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                            <Input
                                type="number"
                                placeholder="0.00"
                                className="pl-8"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Who paid?</label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {groupMembers.length === 0 && selectedGroupId && <p className="text-xs text-muted-foreground col-span-2 py-2">Loading members...</p>}
                                {groupMembers.map((member) => (
                                    <button
                                        key={member.user.id}
                                        type="button"
                                        onClick={() => setPayerId(member.user.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-xl border text-sm transition-all text-left",
                                            payerId === member.user.id
                                                ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                                                : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/40"
                                        )}
                                    >
                                        <div className="w-6 h-6 shrink-0 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                                            {member.user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="truncate">{member.user.id === currentUser?.id ? "You" : member.user.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Split Logic</label>
                                <div className="flex bg-secondary/50 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setSplitType("EQUAL")}
                                        className={cn(
                                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                            splitType === "EQUAL" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                                        )}
                                    >
                                        Equally
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSplitType("EXACT")}
                                        className={cn(
                                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                            splitType === "EXACT" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                                        )}
                                    >
                                        Exactly
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex justify-between items-center">
                                    <span>{splitType === "EQUAL" ? "Split with whom?" : "Amount per person"}</span>
                                    {splitType === "EQUAL" && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMemberIds(groupMembers.map(m => m.user.id))}
                                            className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline"
                                        >
                                            Select All
                                        </button>
                                    )}
                                </label>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {groupMembers.map((member) => (
                                        <div key={member.user.id} className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedMemberIds.includes(member.user.id)) {
                                                        setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.user.id));
                                                    } else {
                                                        setSelectedMemberIds([...selectedMemberIds, member.user.id]);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex-1 flex items-center gap-2 p-3 rounded-xl border text-sm transition-all text-left",
                                                    selectedMemberIds.includes(member.user.id)
                                                        ? "bg-primary/5 border-primary/30 text-foreground"
                                                        : "bg-secondary/20 border-border text-muted-foreground opacity-60"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                                    selectedMemberIds.includes(member.user.id)
                                                        ? "bg-primary border-primary text-white"
                                                        : "border-muted-foreground"
                                                )}>
                                                    {selectedMemberIds.includes(member.user.id) && <Plus className="w-2.5 h-2.5" />}
                                                </div>
                                                <span className="truncate">{member.user.id === currentUser?.id ? "You" : member.user.name}</span>
                                            </button>

                                            {splitType === "EXACT" && selectedMemberIds.includes(member.user.id) && (
                                                <div className="relative w-32">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        className="pl-7 h-full rounded-xl"
                                                        value={exactAmounts[member.user.id] || ""}
                                                        onChange={(e) => setExactAmounts({
                                                            ...exactAmounts,
                                                            [member.user.id]: e.target.value
                                                        })}
                                                        required
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {splitType === "EXACT" && (
                                    <div className={cn(
                                        "mt-4 p-3 rounded-xl text-xs font-medium flex justify-between items-center",
                                        Math.abs(remainingAmount) < 0.01
                                            ? "bg-emerald-500/10 text-emerald-600"
                                            : "bg-rose-500/10 text-rose-600"
                                    )}>
                                        <span>Matched: ₹{totalExactAmount}</span>
                                        <span>Remaining: ₹{remainingAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button type="submit" className="flex-1 rounded-xl shadow-lg shadow-primary/20" disabled={isSubmittingBill}>
                        {isSubmittingBill ? "Saving..." : "Split Expense"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
