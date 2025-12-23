"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { api } from "@/lib/api";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    React.useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const fetchUser = async () => {
            try {
                const user = await api.get<{ id: string }>("/users/me");
                setCurrentUser(user);
                setIsCheckingAuth(false);
            } catch (error) {
                console.error("Auth check failed:", error);
                localStorage.removeItem("token");
                router.push("/login");
            }
        };
        fetchUser();
    }, [router]);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <Sidebar onAddExpense={() => setIsAddExpenseOpen(true)} />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 relative">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>

            <AddExpenseModal
                isOpen={isAddExpenseOpen}
                onClose={() => setIsAddExpenseOpen(false)}
                currentUser={currentUser}
                onSuccess={() => {
                    setIsAddExpenseOpen(false);
                    // We might want a way to refresh the current page's data
                    window.location.reload(); // Simple way for now, or use context/event bus
                }}
            />
        </div>
    );
}
