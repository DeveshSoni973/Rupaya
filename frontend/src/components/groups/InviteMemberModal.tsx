"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { UsersAPI, GroupsAPI } from "@/lib/api";
import { UserSearchInput } from "@/components/ui/UserSearchInput";

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
  onSuccess,
}: InviteMemberModalProps) {
  const [loading, setLoading] = useState(false);

  const handleInviteUser = async (user: SearchUser) => {
    setLoading(true);
    try {
      await GroupsAPI.addMember(groupId, {
        email: user.email,
        user_id: user.id,
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberByEmail = async (email: string) => {
    setLoading(true);
    try {
      await GroupsAPI.addMember(groupId, {
        email: email,
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Member"
      description="Share the group and split expenses with someone new."
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Search by name or email
          </label>
          <UserSearchInput
            onSelectUser={handleInviteUser}
            onInviteByEmail={handleAddMemberByEmail}
            isLoading={loading}
          />
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase font-black mb-3 tracking-[0.2em] opacity-60">
            How to invite
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Type your friend&apos;s name or email address. If they are already on
            Rupaya, you can select them from the list. If not, you can still add
            them by typing their full email and clicking invite.
          </p>
        </div>
      </div>
    </Modal>
  );
}
