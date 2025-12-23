"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

// Extracted Components
import { GroupHeader } from "@/components/groups/GroupHeader";
import { MemberList } from "@/components/groups/MemberList";
import { ExpenseList } from "@/components/groups/ExpenseList";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { InviteMemberModal } from "@/components/groups/InviteMemberModal";

interface Member {
    id: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    role: "ADMIN" | "MEMBER";
}

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

interface GroupDetail {
    id: string;
    name: string;
    type: string;
    members: Member[];
    bills: Bill[];
    total_spent: number;
    user_balance: number;
}

export default function GroupDetailPage() {
    const params = useParams();
    const id = params?.id as string;

    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchGroupDetail();
            fetchCurrentUser();
        }
    }, [id]);

    const fetchCurrentUser = async () => {
        try {
            const user = await api.get<{ id: string }>("/users/me");
            setCurrentUser(user);
        } catch (error) {
            console.error("Failed to fetch current user:", error);
        }
    };

    const fetchGroupDetail = async () => {
        try {
            const data = await api.get<GroupDetail>(`/groups/${id}`);
            setGroup(data);
        } catch (error) {
            console.error("Failed to fetch group:", error);
        } finally {
            setLoading(false);
        }
    };

    const removeMember = async (memberId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`/groups/${id}/members/${memberId}`);
            fetchGroupDetail();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to remove member");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-8 animate-pulse p-8">
                <div className="h-48 bg-card rounded-3xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="h-96 bg-card rounded-2xl" />
                    <div className="lg:col-span-2 h-96 bg-card rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!group) return <div className="p-8 text-center py-20 bg-card rounded-3xl border border-border">Group not found</div>;

    return (
        <div className="space-y-8 pb-20">
            <GroupHeader
                group={group}
                onAddExpense={() => setIsAddExpenseOpen(true)}
                onInviteMember={() => setIsAddMemberOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Members & Management */}
                <div className="lg:col-span-1 space-y-6">
                    <MemberList
                        members={group.members}
                        currentUserId={currentUser?.id}
                        onInviteMember={() => setIsAddMemberOpen(true)}
                        onRemoveMember={removeMember}
                    />

                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Group Settings</h2>
                        <div className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start text-sm h-10 rounded-xl">
                                <Settings className="w-4 h-4 mr-3" /> Group Settings
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm h-10 rounded-xl text-rose-500 hover:bg-rose-500/5 hover:text-rose-600">
                                <Trash2 className="w-4 h-4 mr-3" /> Leave Group
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Bills/Expenses */}
                <div className="lg:col-span-2">
                    <ExpenseList
                        bills={group.bills}
                        currentUserId={currentUser?.id}
                        onAddExpense={() => setIsAddExpenseOpen(true)}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddExpenseModal
                isOpen={isAddExpenseOpen}
                onClose={() => setIsAddExpenseOpen(false)}
                onSuccess={fetchGroupDetail}
                currentUser={currentUser}
                initialGroupId={id}
                members={group.members}
            />

            <InviteMemberModal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                groupId={id}
                onSuccess={fetchGroupDetail}
            />
        </div>
    );
}
