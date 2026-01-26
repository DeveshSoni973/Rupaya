"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UsersAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SearchUser {
    id: string;
    name: string;
    email: string;
}

interface UserSearchInputProps {
    onSelectUser: (user: SearchUser) => void;
    onInviteByEmail: (email: string) => void;
    placeholder?: string;
    className?: string;
    isLoading?: boolean;
}

export function UserSearchInput({
    onSelectUser,
    onInviteByEmail,
    placeholder = "Search by name or email...",
    className,
    isLoading: externalLoading = false,
}: UserSearchInputProps) {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 1) {
                handleSearch(query);
            } else {
                setSearchResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (searchQuery: string) => {
        setIsSearching(true);
        try {
            const results = await UsersAPI.search(searchQuery);
            setSearchResults(results);
            setIsOpen(results.length > 0);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelect = (user: SearchUser) => {
        onSelectUser(user);
        setQuery("");
        setSearchResults([]);
        setIsOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query) {
            onInviteByEmail(query);
            setQuery("");
            setSearchResults([]);
            setIsOpen(false);
        }
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <form onSubmit={handleSubmit} className="relative flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => query.length > 1 && setIsOpen(true)}
                        className="pl-10 pr-10 h-11 rounded-2xl bg-secondary/10 border-border/50 focus:border-primary/50 transition-all font-medium"
                    />
                    {(isSearching || externalLoading) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                    )}
                </div>
                <Button
                    type="submit"
                    disabled={!query || isSearching || externalLoading}
                    className="rounded-2xl px-6 gap-2 shadow-lg shadow-primary/20"
                >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Invite</span>
                </Button>
            </form>

            {/* Results Dropdown */}
            {isOpen && (searchResults.length > 0 || (query.length > 1 && !isSearching)) && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-border last:border-0"
                                    onClick={() => handleSelect(user)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{user.name}</p>
                                            <p className="text-[10px] text-muted-foreground tracking-tight">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Plus className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">No users found</p>
                            <p className="text-[10px] text-muted-foreground/60">Press enter to invite &quot;{query}&quot; by email</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
