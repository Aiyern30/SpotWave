"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import {
    Instagram,
    Loader2,
    Link2,
    Check,
    Code2,
    MessageCircle,
    Facebook,
} from "lucide-react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
} from "@/components/ui/";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ShareCardData } from "@/types/shareToInstagram";
import { shareTemplates } from ".";

interface ShareToInstagramProps {
    data: ShareCardData;
}

export default function ShareToInstagram({ data }: ShareToInstagramProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [templateId, setTemplateId] = useState(shareTemplates[0].id);
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState<"link" | "embed" | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const activeTemplate =
        shareTemplates.find((t) => t.id === templateId) ?? shareTemplates[0];
    const ActiveComponent = activeTemplate.Component;

    const embedCode = `<iframe src="${data.shareUrl.replace(
        "open.spotify.com",
        "open.spotify.com/embed",
    )}" width="100%" height="352" frameborder="0" allow="encrypted-media"></iframe>`;

    const generateImage = async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;
        return toBlob(cardRef.current, { pixelRatio: 1, cacheBust: true });
    };

    // ---- Mobile: native share sheet (Instagram, WhatsApp, Messages, etc.) ----
    const handleNativeShare = async () => {
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
                        text: `Check out "${data.name}" 🎵 ${data.shareUrl}`,
                    });
                    toast.success("Shared!");
                    setOpen(false);
                    return;
                } catch (err: any) {
                    if (err?.name === "AbortError") return; // user cancelled, do nothing
                }
            }

            // image sharing unsupported on this device — share the link instead
            if (navigator.share) {
                await navigator.share({
                    title: data.name,
                    text: `Check out "${data.name}" 🎵`,
                    url: data.shareUrl,
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("Couldn't open the share sheet");
        } finally {
            setSharing(false);
        }
    };

    // ---- Desktop: copy link / embed / quick web share links ----
    const copyToClipboard = async (text: string, type: "link" | "embed") => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        toast.success(type === "link" ? "Link copied!" : "Embed code copied!");
        setTimeout(() => setCopied(null), 2000);
    };

    const whatsappWebUrl = `https://wa.me/?text=${encodeURIComponent(
        `Check out "${data.name}" 🎵 ${data.shareUrl}`,
    )}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        data.shareUrl,
    )}`;

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Share"
                            onClick={() => setOpen(true)}
                            className="h-12 w-12 cursor-pointer rounded-full bg-brand text-black hover:bg-brand/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-brand/20 border-none"
                        >
                            <Instagram className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Share</p>
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

                    {isMobile ? (
                        <>
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

                            {/* Live preview */}
                            <div
                                className="mx-auto overflow-hidden rounded-xl border border-zinc-800 shadow-2xl"
                                style={{ width: 240, height: 427 }}
                            >
                                <div style={{ transform: "scale(0.2222)", transformOrigin: "top left" }}>
                                    <ActiveComponent data={data} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    onClick={handleNativeShare}
                                    disabled={sharing}
                                    className="w-full h-12 bg-brand hover:bg-brand/90 text-brand-foreground font-bold rounded-xl"
                                >
                                    {sharing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            Preparing...
                                        </>
                                    ) : (
                                        "Share"
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <div className="space-y-5">
                                {/* Copy link */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-300">
                                        Playlist link
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={data.shareUrl}
                                            className="bg-zinc-900/60 border-brand/20 text-zinc-300 text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(data.shareUrl, "link")}
                                            className="border-brand/30 shrink-0"
                                        >
                                            {copied === "link" ? (
                                                <Check className="h-4 w-4 text-brand" />
                                            ) : (
                                                <Link2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Embed code */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                        <Code2 className="h-4 w-4" />
                                        Embed
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={embedCode}
                                            className="bg-zinc-900/60 border-brand/20 text-zinc-500 text-xs font-mono"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(embedCode, "embed")}
                                            className="border-brand/30 shrink-0"
                                        >
                                            {copied === "embed" ? (
                                                <Check className="h-4 w-4 text-brand" />
                                            ) : (
                                                <Code2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Quick web share targets that DO have a desktop web intent */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-300">
                                        Share to
                                    </label>
                                    <div className="flex gap-3">
                                        <a
                                            href={whatsappWebUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-brand/20 bg-zinc-900/50 text-white hover:bg-brand/10 transition-colors"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            <span className="text-sm font-medium">WhatsApp</span>
                                        </a>
                                        <a
                                            href={facebookShareUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-brand/20 bg-zinc-900/50 text-white hover:bg-brand/10 transition-colors"
                                        >
                                            <Facebook className="h-4 w-4" />
                                            <span className="text-sm font-medium">Facebook</span>
                                        </a>
                                    </div>
                                    <p className="text-xs text-zinc-500 pt-1">
                                        Instagram doesn't support sharing from desktop browsers — open this on
                                        your phone to share directly to Instagram.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Full-res off-screen card, only needed for mobile image capture */}
            {isMobile && (
                <div style={{ position: "fixed", top: -99999, left: -99999 }}>
                    <div ref={cardRef}>
                        <ActiveComponent data={data} />
                    </div>
                </div>
            )}
        </>
    );
}