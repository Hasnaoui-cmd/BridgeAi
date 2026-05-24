"use client"

import { motion } from "framer-motion"
import { MessageSquare, Database, LineChart, ArrowDown } from "lucide-react"

const steps = [
  {
    icon: MessageSquare,
    title: "Intelligent Data Capture",
    description: "Our AI extracts your shipment details and operational requirements automatically from natural conversation.",
    highlight: "Natural Language Processing",
  },
  {
    icon: Database,
    title: "Real-Time Legal & Environmental Scanning",
    description: "Instantly cross-reference Moroccan laws while fetching live weather and port congestion data.",
    highlight: "Real-time Intelligence",
  },
  {
    icon: LineChart,
    title: "Actionable Predictive Analytics",
    description: "Our AI engine outputs precise delay timelines and identifies exact root causes for full operational transparency.",
    highlight: "Explainable AI",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24">
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
            How It Works
          </span>
          <h2 className="mt-6 font-serif text-3xl font-medium text-[#1c1917] md:text-4xl lg:text-5xl">
            <span className="text-balance">Zero-Friction Logistics Intelligence</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#78716c]">
            From conversation to prediction in three seamless steps
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative mt-20">
          {/* Connecting line */}
          <div className="absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-[#e07a5f]/50 via-[#e07a5f]/20 to-transparent lg:block" />

          <div className="flex flex-col gap-12 lg:gap-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className={`relative flex flex-col items-center gap-8 lg:flex-row ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content Card */}
                <div className="flex-1 lg:pr-16 lg:pl-0">
                  <div
                    className={`glass rounded-2xl p-6 shadow-sm transition-all duration-300 hover:border-[#e07a5f]/30 hover:shadow-md ${
                      index % 2 === 1 ? "lg:ml-auto lg:mr-16" : "lg:mr-auto lg:ml-16"
                    } lg:max-w-md`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e07a5f]/10">
                        <step.icon className="h-6 w-6 text-[#e07a5f]" />
                      </div>
                      <span className="rounded-full bg-[#e07a5f]/10 px-3 py-1 text-xs text-[#e07a5f]">
                        {step.highlight}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-[#1c1917]">{step.title}</h3>
                    <p className="mt-2 text-[#78716c]">{step.description}</p>
                  </div>
                </div>

                {/* Center Icon */}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-[#e07a5f]/30 bg-white shadow-sm">
                  <span className="text-2xl font-bold text-[#e07a5f]">{index + 1}</span>
                  {index < steps.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      className="absolute -bottom-10 text-[#e07a5f]/50 lg:hidden"
                    >
                      <ArrowDown className="h-6 w-6" />
                    </motion.div>
                  )}
                </div>

                {/* Empty space for alternating layout */}
                <div className="hidden flex-1 lg:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
