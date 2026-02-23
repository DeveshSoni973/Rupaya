"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AddBillModal } from "@/components/bills/AddBillModal";
import { UsersAPI } from "@/lib/api/users";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
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
    const handleOpenBill = () => setIsAddBillOpen(true);

    window.addEventListener('sidebar-toggle', handleToggle);
    window.addEventListener('open-add-bill', handleOpenBill);

    return () => {
      window.removeEventListener('sidebar-toggle', handleToggle);
      window.removeEventListener('open-add-bill', handleOpenBill);
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
      <Sidebar onAddBill={() => setIsAddBillOpen(true)} />

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-8 relative transition-all duration-300",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        currentUser={currentUser}
        onSuccess={() => {
          setIsAddBillOpen(false);
          // Refreshes are handled via events or page-specific logic
          window.dispatchEvent(new Event("refresh-summary"));
          window.dispatchEvent(new Event("refresh-bills"));
        }}
      />
    </div>
  );
}
