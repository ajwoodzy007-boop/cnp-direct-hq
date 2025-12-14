import React, { useState } from "react";
import { Cog6ToothIcon, MoonIcon, SunIcon, BellIcon, BellSlashIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowPathIcon, Squares2X2Icon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/contexts/SettingsContext";
import { Separator } from "@/components/ui/separator";

interface StreamlitLayoutProps {
  children: React.ReactNode;
}

export function StreamlitLayout({ children }: StreamlitLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, updateSetting } = useSettings();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Main Content */}
      <main className="flex-1 min-w-0 relative flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-6 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/logo.jpg" 
              alt="CNP Direct" 
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <span className="text-lg font-bold">CNP DIRECT</span>
              <p className="text-[10px] text-muted-foreground tracking-wide hidden sm:block">Capital. Net Profit. Direct.</p>
            </div>
          </div>
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
              {settings.notificationsEnabled ? <BellIcon className="h-4 w-4" /> : <BellSlashIcon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${settings.soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => updateSetting("soundEnabled", !settings.soundEnabled)}
              title={settings.soundEnabled ? "Sound On" : "Sound Off"}
              data-testid="button-header-sound"
            >
              {settings.soundEnabled ? <SpeakerWaveIcon className="h-4 w-4" /> : <SpeakerXMarkIcon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground ml-1"
              onClick={() => setSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </header>

        {/* Content Container */}
        <div className={cn(
          "max-w-6xl mx-auto px-6 pb-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1"
        )}>
          {children}
        </div>

        {/* Legal Disclaimer Footer */}
        <footer className="mt-auto border-t border-border bg-muted/30 py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Important Disclaimer
              </p>
              <div className="text-xs text-muted-foreground leading-relaxed max-w-4xl mx-auto space-y-2">
                <p>
                  <strong>For Educational Purposes Only.</strong> CNP Direct and The Market Sentinel are software tools designed for educational and informational purposes only. 
                  The signals, predictions, and analysis provided (including but not limited to "BUY," "SELL," or "MOMENTUM" indicators) do not constitute financial advice, 
                  investment recommendations, or solicitation to buy or sell any securities.
                </p>
                <p>
                  CNP Direct is not a registered investment advisor, broker-dealer, or financial planner. Past performance is not indicative of future results. 
                  All investments involve risk, including the potential loss of principal. You should consult with a qualified financial advisor before making any investment decisions.
                </p>
                <p>
                  By using this software, you acknowledge that you understand these risks and agree that CNP Direct bears no responsibility for any financial losses 
                  or damages resulting from your use of or reliance on the information provided.
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground pt-2">
                &copy; {new Date().getFullYear()} CNP Direct. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5" />
              Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Alert Preferences */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Alert Preferences</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.notificationsEnabled ? <BellIcon className="h-4 w-4" /> : <BellSlashIcon className="h-4 w-4 text-muted-foreground" />}
                  <Label htmlFor="notifications" className="cursor-pointer">
                    <div>Browser Notifications</div>
                    <p className="text-xs text-muted-foreground font-normal">Get alerts for buy signals</p>
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
                  {settings.soundEnabled ? <SpeakerWaveIcon className="h-4 w-4" /> : <SpeakerXMarkIcon className="h-4 w-4 text-muted-foreground" />}
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
                  {settings.darkMode ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
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
                  <ArrowsPointingInIcon className="h-4 w-4" />
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
                  <ArrowPathIcon className="h-4 w-4" />
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
                  <Squares2X2Icon className="h-4 w-4" />
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
