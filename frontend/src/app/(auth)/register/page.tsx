"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wallet, Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        console.log("Registering with:", formData);

        setTimeout(() => {
            setIsLoading(false);
        }, 1500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-border p-8 rounded-2xl shadow-xl auth-card-shadow"
        >
            <div className="flex flex-col items-center mb-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                    <Wallet className="text-white w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Start managing your shared expenses today
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="name">
                        Full Name
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="name"
                            placeholder="John Doe"
                            type="text"
                            className="pl-10"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="email">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            className="pl-10"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="password"
                            placeholder="••••••••"
                            type="password"
                            className="pl-10"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full group mt-2"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <span className="flex items-center">
                            Create Account
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                    )}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link href="/login" className="text-primary hover:underline font-semibold">
                    Sign in
                </Link>
            </div>
        </motion.div>
    );
}
