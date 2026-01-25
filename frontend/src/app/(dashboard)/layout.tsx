"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { UsersAPI } from "@/lib/api/users";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    // ... logic same ...
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const user = await UsersAPI.getCurrentUser();
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

  // Handle sidebar toggle and open expense modal via custom events
  React.useEffect(() => {
    const handleToggle = (e: Event) => setIsSidebarCollapsed((e as CustomEvent).detail);
    const handleOpenExpense = () => setIsAddExpenseOpen(true);

    window.addEventListener('sidebar-toggle', handleToggle);
    window.addEventListener('open-add-expense', handleOpenExpense);

    return () => {
      window.removeEventListener('sidebar-toggle', handleToggle);
      window.removeEventListener('open-add-expense', handleOpenExpense);
    };
  }, []);


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
      <main className={cn(
        "flex-1 p-8 relative transition-all duration-300",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        <div className="max-w-6xl mx-auto">{children}</div>
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
