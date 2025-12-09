import React, { useState, useEffect } from "react";
import { Menu, X, Settings, Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StreamlitLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function StreamlitLayout({ children, sidebar }: StreamlitLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: 0, width: 336 }}
        animate={{
          x: isSidebarOpen ? 0 : -336,
          width: 336,
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="fixed lg:sticky top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border z-50 overflow-hidden shrink-0 shadow-xl lg:shadow-none"
      >
        <div className="h-full flex flex-col w-[336px]">
          {/* Sidebar Header */}
          <div className="p-6 flex items-center justify-between">
            <div className="font-bold text-xl tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span>Streamlit</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Sidebar Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
            {sidebar}
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-sidebar-border mt-auto">
            <div className="flex items-center justify-between text-muted-foreground text-sm">
              <span>v1.28.0</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsDarkMode(!isDarkMode)}>
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Github className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-w-0 transition-all duration-300 relative",
        isSidebarOpen ? "lg:ml-0" : "lg:-ml-[336px]"
      )}>
        {/* Top Navigation / Toggle */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-6 bg-background/80 backdrop-blur-md">
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="mr-4 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </header>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto px-6 pb-20 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
