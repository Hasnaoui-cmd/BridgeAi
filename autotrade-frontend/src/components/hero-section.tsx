"use client"

import { motion } from "framer-motion"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen overflow-hidden px-6 pt-32 pb-20">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#e07a5f]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[#e07a5f]/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-[#e07a5f] animate-pulse" />
            <span className="text-sm text-[#78716c]">B2B Logistics Intelligence</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl font-serif text-4xl font-medium leading-tight text-[#1c1917] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="text-balance">Seamless Global Trade & Moroccan Customs </span>
            <span className="text-[#e07a5f]">Intelligence.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-balance text-lg text-[#78716c] md:text-xl"
          >
            BridgeAI empowers logistics teams to predict delays, optimize shipping routes, and automate legal compliance—saving time, reducing costs, and eliminating border friction.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              className="group bg-[#e07a5f] text-white hover:bg-[#e07a5f]/90"
              onClick={() => navigate("/prediction")}
            >
              Try Delay Prediction
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-[#1c1917]/20 bg-transparent text-[#1c1917] hover:bg-[#1c1917]/5 hover:text-[#1c1917]"
              onClick={() => navigate("/routes")}
            >
              <Play className="mr-2 h-4 w-4" />
              Explore Route Optimizer
            </Button>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative mt-20 w-full max-w-5xl"
          >
            <div className="glass overflow-hidden rounded-2xl p-1 shadow-xl">
              <div className="rounded-xl bg-white p-6">
                {/* Dashboard mockup */}
                <div className="flex items-center gap-2 border-b border-black/5 pb-4">
                  <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
                  <div className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                  <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
                  <span className="ml-4 text-xs text-[#78716c]">BridgeAI Dashboard</span>
                </div>
                
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Stats cards */}
                  {[
                    { label: "Shipments Tracked", value: "2,847", change: "+12.5%" },
                    { label: "Compliance Rate", value: "99.2%", change: "+2.1%" },
                    { label: "Avg. Delay Prediction", value: "3.2 days", change: "-18%" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                      className="rounded-lg border border-black/5 bg-[#fafaf9] p-4"
                    >
                      <p className="text-sm text-[#78716c]">{stat.label}</p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-[#1c1917]">{stat.value}</span>
                        <span className="text-xs text-[#22c55e]">{stat.change}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="mt-6 h-48 rounded-lg border border-black/5 bg-gradient-to-br from-[#e07a5f]/10 to-transparent p-4">
                  <div className="flex h-full items-end justify-between gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: 1 + i * 0.05 }}
                        className="flex-1 rounded-t bg-gradient-to-t from-[#e07a5f]/50 to-[#e07a5f]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect behind dashboard */}
            <div className="absolute inset-0 -z-10 bg-[#e07a5f]/10 blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
