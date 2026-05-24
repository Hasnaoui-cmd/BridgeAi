"use client"

import { motion } from "framer-motion"
import { ShieldCheck, TrendingDown, Route, FileCheck, ArrowUpRight } from "lucide-react"

const features = [
  {
    icon: ShieldCheck,
    title: "Instant Legal Compliance",
    description: "Navigate complex Moroccan customs regulations instantly. Our AI provides real-time, verified legal guidance to ensure complete compliance before your shipment leaves the warehouse.",
    size: "large",
    gradient: "from-[#e07a5f]/10 to-transparent",
  },
  {
    icon: TrendingDown,
    title: "Predictive Supply Chain",
    description: "Anticipate bottlenecks before they happen. Get precise, AI-driven ETA predictions with deep root-cause analysis factoring in live weather, port congestion, and customs channels.",
    size: "small",
    gradient: "from-[#81b29a]/10 to-transparent",
  },
  {
    icon: Route,
    title: "Multi-Factor Route Optimizer",
    description: "Balance efficiency and sustainability. Visually compare global shipping routes based on transit time, operational costs, and CO2 emissions to make profitable, data-backed decisions.",
    size: "small",
    gradient: "from-[#f4e285]/10 to-transparent",
  },
  {
    icon: FileCheck,
    title: "Frictionless Documentation",
    description: "Eliminate administrative hold-ups. Instantly verify IMANOR, ONSSA, and required customs declarations to ensure your paperwork is flawless and border-ready.",
    size: "large",
    gradient: "from-[#e07a5f]/10 to-transparent",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="relative px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-sm text-[#e07a5f] shadow-sm">
            Features
          </span>
          <h2 className="mt-6 font-serif text-3xl font-medium text-[#1c1917] md:text-4xl lg:text-5xl">
            <span className="text-balance">Business Value Proposition</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#78716c]">
            A coordinated system of specialized AI agents working together for optimal trade compliance
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#e07a5f]/30 hover:shadow-md ${
                feature.size === "large" ? "lg:col-span-2" : ""
              }`}
            >
              {/* Gradient background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e07a5f]/10 transition-colors group-hover:bg-[#e07a5f]/20">
                    <feature.icon className="h-6 w-6 text-[#e07a5f]" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-[#78716c] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>

                <h3 className="mt-4 text-xl font-semibold text-[#1c1917]">{feature.title}</h3>
                <p className="mt-2 text-[#78716c]">{feature.description}</p>

                {/* Feature-specific visual elements */}
                {feature.title === "Frictionless Documentation" && (
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[#78716c]">Accuracy Rate</span>
                        <span className="text-[#e07a5f]">99.8%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/5">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "99.8%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full bg-[#e07a5f]"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[#78716c]">Processing Speed</span>
                        <span className="text-[#81b29a]">Instant</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/5">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.6 }}
                          className="h-full rounded-full bg-[#81b29a]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hover glow effect */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-[#e07a5f]/5 blur-3xl" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
