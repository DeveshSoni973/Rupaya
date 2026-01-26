"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupsAPI, UsersAPI, type GroupMember } from "@/lib/api";
import { Trash2, Shield, ShieldAlert, UserPlus, Loader2, ArrowLeft, Settings, Users, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserSearchInput } from "@/components/ui/UserSearchInput";

export default function GroupSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { toast } = useToast();

    const [group, setGroup] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Settings States
    const [groupName, setGroupName] = useState("");
    const [isUpdatingName, setIsUpdatingName] = useState(false);

    const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const [memberToChangeRole, setMemberToChangeRole] = useState<any | null>(null);
    const [isChangingRole, setIsChangingRole] = useState(false);

    const [isAddingMember, setIsAddingMember] = useState(false);


    // Group Deletion States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);

    const fetchDetails = React.useCallback(async () => {
        try {
            const [groupData, userData] = await Promise.all([
                GroupsAPI.getDetail(id),
                UsersAPI.getCurrentUser(),
            ]);
            setGroup(groupData);
            setGroupName(groupData.name);
            setCurrentUser(userData);
        } catch (error) {
            console.error("Failed to fetch settings data:", error);
            toast("Failed to load settings", "error");
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        if (id) fetchDetails();
    }, [id, fetchDetails]);

    const isAdmin = React.useMemo(() => {
        if (!group || !currentUser) return false;
        const membership = group.members.find((m: any) => m.user.id === currentUser.id);
        return membership?.role === "ADMIN";
    }, [group, currentUser]);

    const handleDeleteGroup = async () => {
        setIsDeletingGroup(true);
        try {
            await GroupsAPI.delete(id);
            toast("Group deleted successfully", "success");
            router.push("/groups");
            window.dispatchEvent(new Event("refresh-summary"));
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to delete group", "error");
        } finally {
            setIsDeletingGroup(false);
            setIsDeleteModalOpen(false);
        }
    };


    const handleUpdateName = async () => {
        if (!groupName || groupName === group.name) return;
        setIsUpdatingName(true);
        try {
            await GroupsAPI.update(id, { name: groupName });
            toast("Group name updated!", "success");
            fetchDetails();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to update name", "error");
        } finally {
            setIsUpdatingName(false);
        }
    };

    const handleToggleRole = (member: any) => {
        if (!isAdmin) return;
        setMemberToChangeRole(member);
    };

    const confirmRoleChange = async () => {
        if (!memberToChangeRole) return;
        const newRole = memberToChangeRole.role === "ADMIN" ? "MEMBER" : "ADMIN";
        setIsChangingRole(true);
        try {
            await GroupsAPI.updateMemberRole(id, memberToChangeRole.id, newRole);
            toast(`Role changed to ${newRole}`, "success");
            fetchDetails();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to change role", "error");
        } finally {
            setIsChangingRole(false);
            setMemberToChangeRole(null);
        }
    };


    const handleRemoveMember = async () => {
        if (!memberToRemove) return;
        setIsRemoving(true);
        try {
            await GroupsAPI.removeMember(id, memberToRemove.id);
            toast("Member removed from group", "success");
            fetchDetails();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to remove member", "error");
        } finally {
            setIsRemoving(false);
            setMemberToRemove(null);
        }
    };

    const handleInviteUser = async (user: any) => {
        setIsAddingMember(true);
        try {
            await GroupsAPI.addMember(id, {
                email: user.email,
                user_id: user.id,
                role: "MEMBER"
            });
            toast(`${user.name} added successfully!`, "success");
            fetchDetails();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to add member", "error");
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleInviteByEmail = async (email: string) => {
        setIsAddingMember(true);
        try {
            await GroupsAPI.addMember(id, { email: email, role: "MEMBER" });
            toast("Invitation sent successfully!", "success");
            fetchDetails();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to add member", "error");
        } finally {
            setIsAddingMember(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-10 w-48 bg-card rounded-xl" />
                <div className="h-64 bg-card rounded-3xl" />
                <div className="h-96 bg-card rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/groups/${id}`}>
                    <Button variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Settings className="w-6 h-6 text-primary" /> Group Settings
                    </h1>
                    <p className="text-muted-foreground text-sm">Manage preferences and members for {group?.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: General */}
                <div className="md:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-card border border-border rounded-3xl p-6 shadow-sm"
                    >
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                            General
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Group Name</label>
                                <Input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="rounded-xl bg-secondary/20 border-transparent focus:border-primary"
                                />
                            </div>
                            <Button
                                onClick={handleUpdateName}
                                disabled={isUpdatingName || !groupName || groupName === group?.name}
                                className="w-full rounded-xl gap-2 shadow-lg shadow-primary/20"
                            >
                                {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                            </Button>
                        </div>
                    </motion.div>

                    {isAdmin && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6"
                        >
                            <h3 className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-2 flex items-center gap-2">
                                Danger Zone
                            </h3>
                            <p className="text-[11px] text-muted-foreground mb-4">Actions here are permanent and affect all members.</p>
                            <Button
                                variant="destructive"
                                className="w-full rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                                onClick={() => setIsDeleteModalOpen(true)}
                            >
                                Delete Group
                            </Button>
                        </motion.div>
                    )}
                </div>

                {/* Right Column: Members */}
                <div className="md:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-border rounded-3xl p-6 shadow-sm overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4" /> Members ({group?.members?.length})
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {/* Add Member Bar */}
                            <UserSearchInput
                                onSelectUser={handleInviteUser}
                                onInviteByEmail={handleInviteByEmail}
                                isLoading={isAddingMember}
                                placeholder="Search by name or invite by email..."
                            />

                            {/* Members List */}
                            <div className="divide-y divide-border/40">
                                {group?.members?.map((m: any) => (
                                    <div key={m.id} className="flex items-center justify-between py-4 group/item transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-lg border border-primary/10">
                                                {m.user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{m.user?.name}</span>
                                                    {m.user?.id === currentUser?.id && (
                                                        <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-black uppercase">You</span>
                                                    )}
                                                    {m.role === "ADMIN" && (
                                                        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                                            <Shield className="w-2.5 h-2.5" /> Admin
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            {isAdmin && m.user?.id !== currentUser?.id && (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleToggleRole(m)}
                                                        className={cn(
                                                            "h-9 px-3 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-wider transition-all",
                                                            m.role === "ADMIN"
                                                                ? "text-amber-500 hover:text-amber-600 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/10"
                                                                : "text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 border-primary/10"
                                                        )}
                                                    >
                                                        <ShieldAlert className="w-3.5 h-3.5" />
                                                        {m.role === "ADMIN" ? "Make Member" : "Make Admin"}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setMemberToRemove(m)}
                                                        className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all border border-transparent hover:border-rose-500/20"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Confirmation for Removal */}
            <ConfirmationModal
                isOpen={!!memberToRemove}
                onClose={() => setMemberToRemove(null)}
                onConfirm={handleRemoveMember}
                title="Remove Member"
                description={`Are you sure you want to remove ${memberToRemove?.user?.name} from the group?`}
                confirmText="Remove Member"
                variant="destructive"
                isLoading={isRemoving}
            />

            {/* Confirmation for Role Change */}
            <ConfirmationModal
                isOpen={!!memberToChangeRole}
                onClose={() => setMemberToChangeRole(null)}
                onConfirm={confirmRoleChange}
                title="Change Member Role"
                description={`Are you sure you want to change ${memberToChangeRole?.user?.name}'s role to ${memberToChangeRole?.role === "ADMIN" ? "Member" : "Admin"}?`}
                confirmText="Confirm Change"
                variant={memberToChangeRole?.role === "ADMIN" ? "destructive" : "default"}
                isLoading={isChangingRole}
            />

            {/* Confirmation for Deletion */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteGroup}
                title="Delete Group"
                description={`Are you sure you want to delete "${group?.name}"? This action cannot be undone and all expenses associated with this group will be lost.`}
                confirmText="Delete Group"
                variant="destructive"
                isLoading={isDeletingGroup}
            />


        </div>
    );
}
