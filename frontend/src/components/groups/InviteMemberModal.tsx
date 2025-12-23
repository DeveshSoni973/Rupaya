"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface SearchUser {
    id: string;
    name: string;
    email: string;
}

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    onSuccess?: () => void;
}

export function InviteMemberModal({
    isOpen,
    onClose,
    groupId,
    onSuccess
}: InviteMemberModalProps) {
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Search logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (newMemberEmail.length > 1) {
                handleSearch(newMemberEmail);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [newMemberEmail]);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const results = await api.get<SearchUser[]>(`/users/search?q=${query}`);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInviteUser = async (user: SearchUser) => {
        try {
            await api.post(`/groups/${groupId}/members`, {
                email: user.email
            });
            onClose();
            setNewMemberEmail("");
            setSearchResults([]);
            if (onSuccess) onSuccess();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to add member");
        }
    };

    const handleAddMemberByEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/groups/${groupId}/members`, {
                email: newMemberEmail
            });
            onClose();
            setNewMemberEmail("");
            setSearchResults([]);
            if (onSuccess) onSuccess();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to add member");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Invite Member"
            description="Share the group and split expenses with someone new."
        >
            <form onSubmit={handleAddMemberByEmail} className="space-y-6">
                <div className="space-y-2 relative">
                    <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Search by name or email</label>
                    <div className="relative">
                        <Input
                            placeholder="e.g. root@root.com"
                            type="text"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="pr-12 h-12 rounded-xl"
                            autoFocus
                        />
                        {isSearching ? (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg text-primary"
                                disabled={!newMemberEmail}
                                type="submit"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-border last:border-0"
                                    onClick={() => handleInviteUser(user)}
                                >
                                    <div>
                                        <p className="text-sm font-bold">{user.name}</p>
                                        <p className="text-[10px] text-muted-foreground tracking-tight">{user.email}</p>
                                    </div>
                                    <div className="bg-primary/10 p-1.5 rounded-lg">
                                        <Plus className="w-3 h-3 text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {newMemberEmail.length > 1 && !isSearching && searchResults.length === 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground shadow-xl">
                            No users found for "{newMemberEmail}"
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-black mb-3 tracking-[0.2em] opacity-60">How to invite</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Type your friend's name or email address. If they are already on Rupaya, you can select them from the list. If not, you can still add them by typing their full email.
                    </p>
                </div>
            </form>
        </Modal>
    );
}
