"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Ship, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Architecture", href: "#architecture" },
]

export function Navbar() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass shadow-sm" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2">
          <Ship className="h-7 w-7 text-[#e07a5f]" />
          <span className="text-xl font-semibold text-[#1c1917]">BridgeAI</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm text-[#78716c] transition-colors hover:text-[#1c1917]"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <Button 
            className="bg-[#e07a5f] text-white hover:bg-[#e07a5f]/90"
            onClick={() => navigate("/login")}
          >
            Login / Access System
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="text-[#1c1917] md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass border-t border-black/5 md:hidden"
        >
          <div className="flex flex-col gap-4 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[#78716c] transition-colors hover:text-[#1c1917]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <Button 
              className="mt-2 w-full bg-[#e07a5f] text-white hover:bg-[#e07a5f]/90"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/login");
              }}
            >
              Login / Access System
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
