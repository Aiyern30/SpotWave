"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone, Monitor, Smartphone, Speaker, Check, Loader2, RefreshCw } from "lucide-react";
import { Button, Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui";
import { usePlayer } from "@/contexts/PlayerContext";
import { getSpotifyDevices, type SpotifyDevice } from "@/lib/spotify-devices";

export default function DevicePicker() {
  const { activeDevice, deviceId, selectDevice } = usePlayer();
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setMessage("");
    getSpotifyDevices(controller.signal).then(setDevices).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load devices.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, refresh]);

  const connect = async (device: SpotifyDevice) => {
    if (pending || !device.id) return;
    setPending(device.id); setError(""); setMessage("");
    try {
      await selectDevice(device);
      setDevices(list => list.map(item => ({ ...item, is_active: item.id === device.id })));
      setMessage(`Playback transferred to ${device.name}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not transfer playback."); }
    finally { setPending(null); }
  };

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Connect to a device" title={activeDevice ? `Device: ${activeDevice.name}` : "Connect to a device"}
        onClick={event => event.stopPropagation()}
        className={`h-9 w-9 shrink-0 hover:bg-brand/15 hover:text-brand ${activeDevice && activeDevice.id !== deviceId ? "text-brand" : "text-zinc-400"}`}>
        <MonitorSmartphone className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent aria-describedby="device-help" overlayClassName="z-[70]" className="z-[70] flex w-full flex-col border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-sm" onClick={event => event.stopPropagation()}>
      <SheetHeader><SheetTitle className="text-zinc-100">Connect to a device</SheetTitle></SheetHeader>
      <p id="device-help" className="text-sm leading-relaxed text-zinc-400">Open Spotify on another phone, computer, or speaker using the same account, then refresh.</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-400">Available devices</span>
        <Button variant="ghost" size="sm" disabled={loading || !!pending} onClick={() => setRefresh(value => value + 1)} className="text-zinc-300 hover:bg-brand/15 hover:text-zinc-100"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {loading ? <p role="status" className="py-6 text-sm text-zinc-400">Finding devices…</p> : devices.length === 0 && !error ? <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">No devices found. Start Spotify on your device and try again.</p> : devices.map((device, index) => {
          const selected = device.id === activeDevice?.id || (!activeDevice && device.is_active);
          const Icon = device.type.toLowerCase() === "computer" ? Monitor : device.type.toLowerCase() === "smartphone" ? Smartphone : Speaker;
          return <button key={device.id || index} disabled={!!pending || device.is_restricted || !device.id || selected} onClick={() => connect(device)}
            className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default ${selected ? "border-brand/30 bg-brand/10" : "border-white/10 hover:border-brand/30 hover:bg-brand/10"} ${device.is_restricted || !device.id ? "opacity-50" : ""}`}>
            <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-brand" : "text-zinc-400"}`} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{device.name}</span><span className="mt-1 block text-xs text-zinc-400">{pending === device.id ? "Connecting…" : selected ? "Current device" : device.is_restricted || !device.id ? "Unavailable for remote control" : device.id === deviceId ? "This browser" : device.type}</span></span>
            {pending === device.id ? <Loader2 className="h-4 w-4 animate-spin" /> : selected ? <Check className="h-4 w-4 text-brand" /> : null}
          </button>;
        })}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
    </SheetContent>
  </Sheet>;
}
