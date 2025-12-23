"use client";

import { Users, UserPlus, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
    id: string;
    name: string;
    email: string;
}

interface Member {
    id: string;
    role: "ADMIN" | "MEMBER";
    user: User;
}

interface MemberListProps {
    members: Member[];
    onInviteMember: () => void;
    onRemoveMember?: (memberId: string) => void;
    currentUserId?: string;
}

export function MemberList({ members, onInviteMember, onRemoveMember, currentUserId }: MemberListProps) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Group Members</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-secondary/50 text-primary"
                    onClick={onInviteMember}
                >
                    <UserPlus className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-3">
                {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-[10px]">
                                {member.user?.name ? member.user.name.substring(0, 2).toUpperCase() : '??'}
                            </div>
                            <div>
                                <p className="text-sm font-semibold leading-none">
                                    {member.user?.name || 'Invited User'}
                                    {member.user?.id === currentUserId && <span className="ml-1 text-[10px] text-primary">(You)</span>}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">{member.user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {member.role === 'ADMIN' && (
                                <Shield className="w-3 h-3 text-primary" />
                            )}
                            {onRemoveMember && member.user?.id !== currentUserId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                    onClick={() => onRemoveMember(member.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Button
                variant="secondary"
                className="w-full mt-6 rounded-xl text-xs h-9 bg-primary/5 text-primary hover:bg-primary/10 border-none"
                onClick={onInviteMember}
            >
                Add New Member
            </Button>
        </div>
    );
}
