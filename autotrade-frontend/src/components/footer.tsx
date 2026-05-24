"use client"

import { motion } from "framer-motion"
import { Ship, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="relative px-6 py-20">
      {/* Top CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl text-center"
      >
        <div className="glass rounded-3xl p-8 shadow-lg md:p-12">
          <h2 className="font-serif text-2xl font-medium text-[#1c1917] md:text-3xl lg:text-4xl">
            <span className="text-balance">Ready to Transform Your Trade Operations?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#78716c]">
            Deploy BridgeAI for your enterprise and experience the future of AI-powered customs compliance.
          </p>
          <Button
            size="lg"
            className="group mt-8 bg-[#e07a5f] text-white hover:bg-[#e07a5f]/90"
          >
            Deploy for your Enterprise
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </motion.div>

      {/* Bottom Footer */}
      <div className="mx-auto mt-16 max-w-7xl border-t border-black/10 pt-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Ship className="h-6 w-6 text-[#e07a5f]" />
            <span className="text-lg font-semibold text-[#1c1917]">BridgeAI</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6">
            {["Features", "How It Works", "Architecture", "Pricing", "Contact"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
              >
                {link}
              </a>
            ))}
          </nav>

          <p className="text-sm text-[#78716c]">
            &copy; {new Date().getFullYear()} BridgeAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
