import React, { useState } from "react";
import { Menu, X, Settings, Moon, Sun, Github, Bell, BellOff, Volume2, VolumeX, RefreshCw, LayoutGrid, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/contexts/SettingsContext";
import { Separator } from "@/components/ui/separator";

interface StreamlitLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function StreamlitLayout({ children, sidebar }: StreamlitLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, updateSetting } = useSettings();

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
              <span>Pro Trader App</span>
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateSetting("darkMode", !settings.darkMode)}>
                  {settings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
          <div className="flex items-center gap-1">
            {/* Quick Alert Toggles */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${settings.notificationsEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => {
                if (settings.notificationsEnabled) {
                  updateSetting("notificationsEnabled", false);
                } else if ("Notification" in window) {
                  Notification.requestPermission().then((permission) => {
                    updateSetting("notificationsEnabled", permission === "granted");
                  });
                }
              }}
              title={settings.notificationsEnabled ? "Notifications On" : "Notifications Off"}
              data-testid="button-header-notifications"
            >
              {settings.notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${settings.soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => updateSetting("soundEnabled", !settings.soundEnabled)}
              title={settings.soundEnabled ? "Sound On" : "Sound Off"}
              data-testid="button-header-sound"
            >
              {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground ml-1"
              onClick={() => setSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </header>

        {/* Content Container */}
        <div className={cn(
          "max-w-4xl mx-auto px-6 pb-20 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
          settings.compactMode && "max-w-6xl"
        )}>
          {children}
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Alert Preferences */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Alert Preferences</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                  <Label htmlFor="notifications" className="cursor-pointer">
                    <div>Browser Notifications</div>
                    <p className="text-xs text-muted-foreground font-normal">Get alerts for rocket ships</p>
                  </Label>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => {
                    if (checked && "Notification" in window) {
                      Notification.requestPermission().then((permission) => {
                        updateSetting("notificationsEnabled", permission === "granted");
                      });
                    } else {
                      updateSetting("notificationsEnabled", false);
                    }
                  }}
                  data-testid="switch-notifications"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                  <Label htmlFor="sound" className="cursor-pointer">
                    <div>Sound Alerts</div>
                    <p className="text-xs text-muted-foreground font-normal">Play sound on detection</p>
                  </Label>
                </div>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
                  data-testid="switch-sound"
                />
              </div>
            </div>

            <Separator />

            {/* Appearance */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <Label htmlFor="darkMode" className="cursor-pointer">
                    <div>Dark Mode</div>
                    <p className="text-xs text-muted-foreground font-normal">Toggle dark theme</p>
                  </Label>
                </div>
                <Switch
                  id="darkMode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => updateSetting("darkMode", checked)}
                  data-testid="switch-darkmode"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Minimize2 className="h-4 w-4" />
                  <Label htmlFor="compactMode" className="cursor-pointer">
                    <div>Compact Mode</div>
                    <p className="text-xs text-muted-foreground font-normal">Denser layout for power users</p>
                  </Label>
                </div>
                <Switch
                  id="compactMode"
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSetting("compactMode", checked)}
                  data-testid="switch-compact"
                />
              </div>
            </div>

            <Separator />

            {/* Data Preferences */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Data Preferences</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4" />
                  <Label>
                    <div>Auto-Refresh Interval</div>
                    <p className="text-xs text-muted-foreground font-normal">How often to update data</p>
                  </Label>
                </div>
                <Select
                  value={String(settings.refreshInterval)}
                  onValueChange={(value) => updateSetting("refreshInterval", parseInt(value))}
                >
                  <SelectTrigger className="w-24" data-testid="select-refresh">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="h-4 w-4" />
                  <Label>
                    <div>Default View</div>
                    <p className="text-xs text-muted-foreground font-normal">Start with gainers or losers</p>
                  </Label>
                </div>
                <Select
                  value={settings.defaultView}
                  onValueChange={(value: "gainers" | "losers") => updateSetting("defaultView", value)}
                >
                  <SelectTrigger className="w-24" data-testid="select-defaultview">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gainers">Gainers</SelectItem>
                    <SelectItem value="losers">Losers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
