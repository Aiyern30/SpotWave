"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Instagram, Loader2 } from "lucide-react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/";
import { toast } from "sonner";
import { shareTemplates } from ".";
import { ShareCardData } from "@/types/shareToInstagram";

interface ShareToInstagramProps {
    data: ShareCardData;
}

export default function ShareToInstagram({ data }: ShareToInstagramProps) {
    const [open, setOpen] = useState(false);
    const [templateId, setTemplateId] = useState(shareTemplates[0].id);
    const [sharing, setSharing] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const activeTemplate =
        shareTemplates.find((t) => t.id === templateId) ?? shareTemplates[0];
    const ActiveComponent = activeTemplate.Component;

    const generateImage = async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;
        return toBlob(cardRef.current, { pixelRatio: 1, cacheBust: true });
    };

    const handleShare = async () => {
        setSharing(true);
        try {
            const blob = await generateImage();
            if (!blob) throw new Error("Failed to render image");

            const file = new File([blob], `${data.name}-story.png`, {
                type: "image/png",
            });

            if (navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: data.name,
                        text: `Check out "${data.name}" 🎵`,
                    });
                    toast.success("Shared!");
                    setOpen(false);
                    return;
                } catch (err: any) {
                    // user cancelled the native sheet — don't fall through to download
                    if (err?.name === "AbortError") return;
                }
            }

            // Fallback: desktop / unsupported browsers
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
            toast.info("Image saved — open Instagram and add it to your Story!");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't generate the share image");
        } finally {
            setSharing(false);
        }
    };

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Share to Instagram"
                            onClick={() => setOpen(true)}
                            className="h-12 w-12 cursor-pointer rounded-full bg-brand text-black hover:bg-brand/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-brand/20 border-none"
                        >
                            <Instagram className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Share to Instagram</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-zinc-950 border-brand/20 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            Share "{data.name}"
                        </DialogTitle>
                    </DialogHeader>

                    {/* Layout picker */}
                    <div className="flex gap-2">
                        {shareTemplates.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTemplateId(t.id)}
                                className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${templateId === t.id
                                    ? "border-brand bg-brand/20 text-white"
                                    : "border-zinc-700 text-zinc-400 hover:border-brand/40"
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Live preview (scaled down) */}
                    <div className="mx-auto overflow-hidden rounded-xl border border-zinc-800 shadow-2xl" style={{ width: 240, height: 427 }}>
                        <div style={{ transform: "scale(0.2222)", transformOrigin: "top left" }}>
                            <ActiveComponent data={data} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleShare}
                            disabled={sharing}
                            className="w-full h-12 bg-brand hover:bg-brand/90 text-brand-foreground font-bold rounded-xl"
                        >
                            {sharing ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Preparing...
                                </>
                            ) : (
                                <>
                                    <Instagram className="h-5 w-5 mr-2" />
                                    Share
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Full-res off-screen card used for actual capture */}
            <div style={{ position: "fixed", top: -99999, left: -99999 }}>
                <div ref={cardRef}>
                    <ActiveComponent data={data} />
                </div>
            </div>
        </>
    );
}