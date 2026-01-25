"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Settings, Trash2, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GroupsAPI, UsersAPI, type GroupMember, SummaryAPI, type Bill } from "@/lib/api";

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

interface GroupDetail {
  id: string;
  name: string;
  type: string;
  members: Member[];
  bills: Bill[];
}

interface GroupSummary {
  total_owed: number;
  total_owe: number;
}

export default function GroupDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [groupSummary, setGroupSummary] = useState<GroupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

  const fetchGroupDetail = React.useCallback(async () => {
    try {
      const [data, summary] = await Promise.all([
        GroupsAPI.getDetail(id),
        SummaryAPI.getDashboard(id),
      ]);

      const transformedMembers: Member[] = data.members.map((m: GroupMember) => ({
        id: m.id,
        role: (m.role as "ADMIN" | "MEMBER") || "MEMBER",
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email
        }
      }));

      const fullGroup: GroupDetail = {
        id: data.id,
        name: data.name,
        type: "SHARED",
        members: transformedMembers,
        bills: [],
      };

      setGroup(fullGroup);
      setGroupSummary({
        total_owed: summary.total_owed,
        total_owe: summary.total_owe,
      });
    } catch (error) {
      console.error("Failed to fetch group:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await UsersAPI.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };

    if (id) {
      fetchGroupDetail();
      fetchCurrentUser();
    }
  }, [id, fetchGroupDetail]);

  const handleExpenseAdded = () => {
    setIsAddExpenseOpen(false);
    setBillToEdit(null);
    setRefreshTrigger((prev) => prev + 1);
    fetchGroupDetail();
  };

  const handleEditExpense = (bill: Bill) => {
    setBillToEdit(bill);
    setIsAddExpenseOpen(true);
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await GroupsAPI.removeMember(id, memberId);
      fetchGroupDetail();
      window.dispatchEvent(new Event("refresh-summary"));
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

  if (!group)
    return (
      <div className="p-8 text-center py-20 bg-card rounded-3xl border border-border">
        Group not found
      </div>
    );

  return (
    <div className="space-y-8 pb-20">
      <GroupHeader
        group={group}
        onAddExpense={() => {
          setBillToEdit(null);
          setIsAddExpenseOpen(true);
        }}
        onInviteMember={() => setIsAddMemberOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Balance</p>
            <div className={cn(
              "p-2 rounded-xl",
              ((groupSummary?.total_owed || 0) - (groupSummary?.total_owe || 0)) > 0 ? "bg-emerald-500/10 text-emerald-500" : ((groupSummary?.total_owed || 0) - (groupSummary?.total_owe || 0)) < 0 ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
            )}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={cn(
            "text-3xl font-black",
            ((groupSummary?.total_owed || 0) - (groupSummary?.total_owe || 0)) > 0 ? "text-emerald-500" : ((groupSummary?.total_owed || 0) - (groupSummary?.total_owe || 0)) < 0 ? "text-rose-500" : "text-foreground"
          )}>
            {((groupSummary?.total_owed || 0) - (groupSummary?.total_owe || 0)) > 0 ? "+" : ""}₹{((groupSummary?.total_owed || 0) - (groupSummary?.total_owe || 0)).toLocaleString()}
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Owed</p>
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-500">
            ₹{(groupSummary?.total_owed || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">People owe you this much in this group</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Owe</p>
            <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-500">
            ₹{(groupSummary?.total_owe || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">You owe this much in this group</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          <MemberList
            members={group.members}
            currentUserId={currentUser?.id}
            onInviteMember={() => setIsAddMemberOpen(true)}
            onRemoveMember={removeMember}
          />

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Group Settings
            </h2>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-10 rounded-xl"
              >
                <Settings className="w-4 h-4 mr-3" /> Group Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-10 rounded-xl text-rose-500 hover:bg-rose-500/5 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4 mr-3" /> Leave Group
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <ExpenseList
            groupId={id}
            currentUserId={currentUser?.id}
            onAddExpense={() => {
              setBillToEdit(null);
              setIsAddExpenseOpen(true);
            }}
            onEditExpense={handleEditExpense}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setBillToEdit(null);
        }}
        onSuccess={handleExpenseAdded}
        currentUser={currentUser}
        initialGroupId={id}
        billToEdit={billToEdit}
        members={group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          user_id: m.user.id,
          role: "MEMBER",
          user: m.user
        } as unknown as GroupMember))}
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
