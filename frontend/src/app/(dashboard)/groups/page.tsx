"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Plus,
    MoreVertical,
    Users,
    ChevronRight,
    UserPlus,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils"; // Assuming cn utility is available here

import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

import { api } from "@/lib/api";

interface Group {
    id: string;
    name: string;
    owner_id: string;
    members?: any[];
    user_balance?: number;
}

export default function GroupsPage() {
    const [groupStep, setGroupStep] = React.useState<"info" | "members">("info");
    const [groups, setGroups] = React.useState<Group[]>([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState("");
    const [memberEmail, setMemberEmail] = React.useState("");

    interface SearchUser {
        id: string;
        name: string;
        email: string;
    }
    const [searchResults, setSearchResults] = React.useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);

    const [addedMembers, setAddedMembers] = React.useState<SearchUser[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        fetchGroups();
    }, []);

    // Search logic
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (memberEmail.length > 1) {
                handleSearch(memberEmail);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [memberEmail]);

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

    const fetchGroups = async () => {
        try {
            const data = await api.get<Group[]>("/groups/");
            setGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setGroupStep("info");
        setNewGroupName("");
        setMemberEmail("");
        setAddedMembers([]);
        setSearchResults([]);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post("/groups/", {
                name: newGroupName,
                initial_members: addedMembers.map(m => m.email)
            });
            resetModal();
            fetchGroups();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to create group");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addMemberAction = (user: SearchUser) => {
        if (!addedMembers.find(m => m.id === user.id)) {
            setAddedMembers([...addedMembers, user]);
            setMemberEmail("");
            setSearchResults([]);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Groups</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage your shared expenses with friends and family.
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-xl shadow-lg shadow-primary/20"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Group
                </Button>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    // Loading skeletons
                    [1, 2, 3].map((i) => (
                        <div key={i} className="h-64 bg-card/50 border border-border animate-pulse rounded-2xl" />
                    ))
                ) : groups.length > 0 ? (
                    groups.map((group, i) => (
                        <motion.div
                            key={group.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <Users className="w-6 h-6" />
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-bold tracking-tight">{group.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{group.members?.length || 0} members</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance</p>
                                    <p className={cn(
                                        "text-lg font-bold",
                                        (group as any).user_balance > 0 ? "text-emerald-500" : (group as any).user_balance < 0 ? "text-rose-500" : "text-muted-foreground"
                                    )}>
                                        {(group as any).user_balance > 0 ? '+' : ''}₹{((group as any).user_balance || 0).toLocaleString()}
                                    </p>
                                </div>
                                <Link href={`/groups/${group.id}`}>
                                    <Button size="sm" variant="secondary" className="rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                        View <ChevronRight className="ml-1 w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    /* Empty State */
                    <motion.div
                        onClick={() => setIsModalOpen(true)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="col-span-full border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                            <UserPlus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold">No groups found</h4>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Create your first group to start splitting expenses with friends.</p>
                        </div>
                        <Button variant="outline" className="rounded-xl">Create Group</Button>
                    </motion.div>
                )}

                {!isLoading && groups.length > 0 && (
                    <motion.div
                        onClick={() => setIsModalOpen(true)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groups.length * 0.1 }}
                        className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer min-h-[220px]"
                    >
                        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <h4 className="font-bold">New Group</h4>
                            <p className="text-sm text-muted-foreground">Add a new group</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Create Group Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={resetModal}
                title={groupStep === "info" ? "Create New Group" : "Add Members"}
                description={groupStep === "info" ? "Give your group a name to get started." : `Adding members to "${newGroupName}"`}
            >
                <div className="space-y-6 pt-4">
                    {groupStep === "info" ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Group Name</label>
                                <Input
                                    placeholder="e.g. Flatmates, Goa Trip"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="h-12 text-lg font-medium rounded-xl"
                                    autoFocus
                                />
                            </div>
                            <Button
                                className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20"
                                disabled={!newGroupName.trim()}
                                onClick={() => setGroupStep("members")}
                            >
                                Next: Add Members
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2 relative">
                                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Search Member</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            placeholder="Search by name or email..."
                                            value={memberEmail}
                                            onChange={(e) => setMemberEmail(e.target.value)}
                                            className="h-11 rounded-xl pr-10"
                                            autoFocus
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                                        {searchResults.map((user) => (
                                            <button
                                                key={user.id}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-border last:border-0"
                                                onClick={() => addMemberAction(user)}
                                            >
                                                <div>
                                                    <p className="text-sm font-bold">{user.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{user.email}</p>
                                                </div>
                                                <Plus className="w-4 h-4 text-primary" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {memberEmail.length > 1 && !isSearching && searchResults.length === 0 && (
                                    <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground shadow-xl">
                                        No users found for "{memberEmail}"
                                    </div>
                                )}
                            </div>

                            {addedMembers.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Selected Members ({addedMembers.length})</label>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                        {addedMembers.map(member => (
                                            <div key={member.id} className="flex items-center gap-2 bg-primary/5 text-primary px-3 py-1.5 rounded-full text-xs font-bold border border-border group">
                                                <span className="truncate max-w-[120px]">{member.name}</span>
                                                <button
                                                    onClick={() => setAddedMembers(addedMembers.filter(m => m.id !== member.id))}
                                                    className="hover:text-destructive transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="ghost"
                                    className="flex-1 h-11 rounded-xl"
                                    onClick={() => setGroupStep("info")}
                                >
                                    Back
                                </Button>
                                <Button
                                    className="flex-[2] h-11 rounded-xl font-bold shadow-lg shadow-primary/20"
                                    onClick={handleCreateGroup}
                                    disabled={addedMembers.length === 0 || isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create Group"}
                                </Button>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground">Note: Search and select at least one friend to continue.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
