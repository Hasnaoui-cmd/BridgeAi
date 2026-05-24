"use client"

import { motion } from "framer-motion"
import { Cpu, Layers, Shield, Zap } from "lucide-react"

const architectureFeatures = [
  {
    icon: Cpu,
    title: "Multi-Agent Orchestrator",
    description: "Central AI coordinator that routes tasks to specialized agents based on query analysis.",
  },
  {
    icon: Layers,
    title: "RAG Pipeline",
    description: "Vector embeddings of Moroccan trade laws for precise legal document retrieval.",
  },
  {
    icon: Shield,
    title: "Compliance Engine",
    description: "Real-time validation against IMANOR, ONSSA, and customs regulations.",
  },
  {
    icon: Zap,
    title: "Prediction Service",
    description: "Hybrid ML models delivering accurate delay forecasts with explainability.",
  },
]

export function ArchitectureSection() {
  return (
    <section id="architecture" className="relative px-6 py-24">
      {/* Background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e07a5f]/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-sm text-[#e07a5f] shadow-sm">
            Architecture
          </span>
          <h2 className="mt-6 font-serif text-3xl font-medium text-[#1c1917] md:text-4xl lg:text-5xl">
            <span className="text-balance">Enterprise-Grade Infrastructure</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#78716c]">
            Built for scale, security, and seamless integration with your existing systems
          </p>
        </motion.div>

        {/* Architecture Diagram */}
        <div className="mt-16">
          <div className="glass relative rounded-3xl p-8 shadow-lg lg:p-12">
            {/* Central Node */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mx-auto mb-12 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#e07a5f]/30 bg-[#e07a5f]/10"
            >
              <Cpu className="h-12 w-12 text-[#e07a5f]" />
            </motion.div>

            {/* Connection lines (visual only) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="hidden h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-[#e07a5f]/30 to-transparent lg:block" />
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {architectureFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#e07a5f]/30 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e07a5f]/10 transition-colors group-hover:bg-[#e07a5f]/20">
                    <feature.icon className="h-5 w-5 text-[#e07a5f]" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#1c1917]">{feature.title}</h3>
                  <p className="mt-2 text-sm text-[#78716c]">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Trusted By / Integrated With Banner */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12 border-t border-black/5 pt-8"
            >
              <p className="text-center text-sm font-medium tracking-wide text-[#78716c] uppercase mb-6">
                Trusted by Global Trade & Industrial Leaders
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
                {[
                  { name: "Tanger Med", label: "Global Logistics Hub" },
                  { name: "PortNet", label: "Moroccan National Single Window" },
                  { name: "CMA CGM", label: "Global Shipping" },
                  { name: "Maersk", label: "Global Shipping" },
                  { name: "Renault Group", label: "Major Industrial Exporter" }
                ].map((company) => (
                  <div
                    key={company.name}
                    className="group flex flex-col items-center justify-center opacity-70 transition-opacity hover:opacity-100"
                    title={company.label}
                  >
                    <svg
                      width="140"
                      height="40"
                      viewBox="0 0 140 40"
                      className="text-[#a8a29e] fill-current transition-colors duration-300 group-hover:text-[#1c1917]"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <text
                        x="50%"
                        y="50%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        fontFamily="Inter, system-ui, sans-serif"
                        fontWeight="bold"
                        fontSize="18"
                        letterSpacing="-0.02em"
                      >
                        {company.name}
                      </text>
                    </svg>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
