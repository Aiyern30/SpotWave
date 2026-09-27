"use client";

import { useEffect, useRef, useState } from "react";
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
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input } from "@/components/ui/";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ShareCardData } from "@/types/shareToInstagram";
import { shareTemplates } from ".";

interface ShareToInstagramProps {
    data: ShareCardData;
}

const proxyImage = (url: string) =>
    url.startsWith("data:") || url.startsWith("/")
        ? url
        : `/api/image-proxy?url=${encodeURIComponent(url)}`;

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
        ),
    ]);

const waitForImages = async (container: HTMLElement) => {
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
        imgs.map((img) =>
            withTimeout(
                img.complete && img.naturalWidth > 0
                    ? Promise.resolve()
                    : new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                    }),
                6000,
                "image load",
            ).catch((err) => console.warn(err.message)),
        ),
    );
};

export default function ShareToInstagram({ data }: ShareToInstagramProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [templateId, setTemplateId] = useState(shareTemplates[0].id);
    const [copied, setCopied] = useState<"link" | "embed" | null>(null);
    const [preparing, setPreparing] = useState(false);
    const [readyFile, setReadyFile] = useState<File | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const activeTemplate =
        shareTemplates.find((t) => t.id === templateId) ?? shareTemplates[0];
    const ActiveComponent = activeTemplate.Component;

    const proxiedData: ShareCardData = {
        ...data,
        coverImage: proxyImage(data.coverImage),
        ownerAvatar: data.ownerAvatar ? proxyImage(data.ownerAvatar) : undefined,
    };

    const embedCode = `<iframe src="${data.shareUrl.replace(
        "open.spotify.com",
        "open.spotify.com/embed",
    )}" width="100%" height="352" frameborder="0" allow="encrypted-media"></iframe>`;

    // Pre-render the image the moment the dialog opens or the template changes,
    // so by the time the user taps "Share", the file is already sitting ready
    // and navigator.share() fires within the same gesture window.
    useEffect(() => {
        if (!isMobile || !open) return;

        let cancelled = false;
        setReadyFile(null);
        setPreparing(true);

        (async () => {
            // let the off-screen node paint with the new template first
            await new Promise((r) => setTimeout(r, 50));
            if (!cardRef.current) return;

            await waitForImages(cardRef.current);
            try {
                const blob = await withTimeout(
                    toBlob(cardRef.current, { pixelRatio: 1, cacheBust: true }),
                    10000,
                    "toBlob render",
                );
                if (cancelled) return;
                if (blob) {
                    setReadyFile(new File([blob], `${data.name}-story.png`, { type: "image/png" }));
                } else {
                    toast.error("Couldn't generate the preview image");
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error(err);
                    toast.error(err?.message || "Couldn't generate the preview image");
                }
            } finally {
                if (!cancelled) setPreparing(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isMobile, open, templateId, data.name]);

    // This runs synchronously off the click — no awaits before navigator.share,
    // so the user gesture is still "fresh" and the browser allows it.
    const handleNativeShare = () => {
        if (!readyFile) {
            toast.error("Image isn't ready yet — try again in a second");
            return;
        }

        if (navigator.canShare?.({ files: [readyFile] })) {
            navigator
                .share({
                    files: [readyFile],
                    title: data.name,
                    text: `Check out "${data.name}" 🎵 ${data.shareUrl}`,
                })
                .then(() => {
                    toast.success("Shared!");
                    setOpen(false);
                })
                .catch((err: any) => {
                    if (err?.name === "AbortError") return;
                    console.warn("File share failed, falling back to link:", err);
                    shareLinkOnly();
                });
        } else {
            shareLinkOnly();
        }
    };

    const shareLinkOnly = () => {
        if (navigator.share) {
            navigator
                .share({ title: data.name, text: `Check out "${data.name}" 🎵`, url: data.shareUrl })
                .catch((err: any) => {
                    if (err?.name !== "AbortError") {
                        console.error(err);
                        toast.error("Couldn't open the share sheet");
                    }
                });
        } else {
            navigator.clipboard.writeText(data.shareUrl);
            toast.info("Link copied to clipboard");
        }
    };

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
                        <DialogTitle className="text-white">Share "{data.name}"</DialogTitle>
                    </DialogHeader>

                    {isMobile ? (
                        <>
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

                            <div
                                className="mx-auto overflow-hidden rounded-xl border border-zinc-800 shadow-2xl"
                                style={{ width: 240, height: 427 }}
                            >
                                <div style={{ transform: "scale(0.2222)", transformOrigin: "top left" }}>
                                    <ActiveComponent data={proxiedData} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    onClick={handleNativeShare}
                                    disabled={preparing || !readyFile}
                                    className="w-full h-12 bg-brand hover:bg-brand/90 text-brand-foreground font-bold rounded-xl"
                                >
                                    {preparing ? (
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
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-300">Playlist link</label>
                                <Input readOnly value={data.shareUrl} className="bg-zinc-900/60 border-brand/20 text-zinc-300 text-sm" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-300">Embed</label>
                                <Input readOnly value={embedCode} className="bg-zinc-900/60 border-brand/20 text-zinc-500 text-xs font-mono" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-300">Share to</label>
                                <div className="flex gap-1">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-400 hover:text-brand hover:bg-zinc-800 transition-all">
                                                    <a href={whatsappWebUrl} target="_blank" rel="noopener noreferrer">
                                                        <MessageCircle className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Share on WhatsApp</p></TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-400 hover:text-brand hover:bg-zinc-800 transition-all">
                                                    <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
                                                        <Facebook className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Share on Facebook</p></TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 transition-all ${copied === "link" ? "text-brand bg-zinc-800" : "text-zinc-400 hover:text-brand hover:bg-zinc-800"}`}
                                                    onClick={() => copyToClipboard(data.shareUrl, "link")}
                                                >
                                                    {copied === "link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Copy link</p></TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 transition-all ${copied === "embed" ? "text-brand bg-zinc-800" : "text-zinc-400 hover:text-brand hover:bg-zinc-800"}`}
                                                    onClick={() => copyToClipboard(embedCode, "embed")}
                                                >
                                                    {copied === "embed" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Copy embed code</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-xs text-zinc-500 pt-1">
                                    Instagram doesn't support sharing from desktop browsers — open this on your phone to share directly.
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {isMobile && (
                <div style={{ position: "fixed", top: -99999, left: -99999 }}>
                    <div ref={cardRef}>
                        <ActiveComponent data={proxiedData} />
                    </div>
                </div>
            )}
        </>
    );
}