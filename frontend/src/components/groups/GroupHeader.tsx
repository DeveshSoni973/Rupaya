"use client";

import Link from "next/link";
import { ArrowLeft, Users, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupHeaderProps {
    group: {
        id: string;
        name: string;
        members: any[];
    };
    onAddExpense: () => void;
    onInviteMember: () => void;
}

export function GroupHeader({ group, onAddExpense, onInviteMember }: GroupHeaderProps) {
    return (
        <div className="space-y-8">
            {/* Breadcrumbs / Back */}
            <Link href="/groups" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Groups
            </Link>

            {/* Group Header Card */}
            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Users className="w-32 h-32" />
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-extrabold tracking-tight italic uppercase">{group.name}</h1>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" /> {group.members.length} members
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            className="rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 gap-2 font-bold"
                            onClick={onAddExpense}
                        >
                            <Plus className="w-4 h-4" /> Add Expense
                        </Button>
                        <Button
                            variant="secondary"
                            className="rounded-2xl h-12 px-6 gap-2 font-bold"
                            onClick={onInviteMember}
                        >
                            <UserPlus className="w-4 h-4" /> Invite
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
