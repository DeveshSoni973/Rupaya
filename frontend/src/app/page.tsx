"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, Shield, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Rupaya</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-6 inline-block">
              Splitting bills made simple
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              Manage expenses <br /> without the stress.
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Track, split, and settle group expenses effortlessly.
              Beautifully designed for modern teams and friends.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full group">
                  Start for free
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full">
                  Try Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32"
          >
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Add expenses in seconds with our intuitive interface." },
              { icon: Shield, title: "Secure", desc: "Your financial data is encrypted and private." },
              { icon: Heart, title: "Fair Splitting", desc: "Multiple splitting methods for every situation." }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl border border-border/50 bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
