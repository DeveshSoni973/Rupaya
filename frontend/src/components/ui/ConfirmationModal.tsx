"use client";

import React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive" | "warning";
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    isLoading = false,
}: ConfirmationModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
        >
            <div className="flex flex-col gap-3 pt-2">
                <Button
                    variant={variant === "destructive" ? "destructive" : "primary"}
                    className={cn(
                        "w-full h-11 rounded-xl font-bold transition-all duration-200",
                        variant === "destructive" ? "shadow-lg shadow-destructive/20" : "shadow-lg shadow-primary/20",
                        variant === "warning" && "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                    )}
                    onClick={onConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing...</span>
                        </div>
                    ) : (
                        confirmText
                    )}
                </Button>
                <Button
                    variant="ghost"
                    className="w-full h-11 rounded-xl font-medium text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    {cancelText}
                </Button>
            </div>
        </Modal>
    );
}
