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
                        img.onerror = () => resolve(); // don't hang on a broken image
                    }),
                6000,
                `image load (${img.src.slice(0, 60)})`,
            ).catch((err) => {
                console.warn(err.message);
            }),
        ),
    );
};

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

    // Route remote images (Spotify CDN etc.) through our own origin so the
    // canvas isn't "tainted" by cross-origin content when we try to export it.
    const proxiedData: ShareCardData = {
        ...data,
        coverImage: proxyImage(data.coverImage),
        ownerAvatar: data.ownerAvatar ? proxyImage(data.ownerAvatar) : undefined,
    };

    const embedCode = `<iframe src="${data.shareUrl.replace(
        "open.spotify.com",
        "open.spotify.com/embed",
    )}" width="100%" height="352" frameborder="0" allow="encrypted-media"></iframe>`;

    const generateImage = async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;
        await waitForImages(cardRef.current);
        try {
            return await withTimeout(
                toBlob(cardRef.current, { pixelRatio: 1, cacheBust: true }),
                10000,
                "toBlob render",
            );
        } catch (err) {
            console.error("toBlob failed or timed out:", err);
            return null;
        }
    };

    // ---- Mobile: native share sheet ----
    const handleNativeShare = async () => {
        setSharing(true);
        try {
            const blob = await generateImage();

            if (blob) {
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
                        if (err?.name === "AbortError") return;
                        console.warn("File share failed, falling back to link:", err);
                    }
                }
            } else {
                // Now this actually fires instead of hanging silently
                toast.error("Couldn't generate the image — sharing link instead");
            }

            if (navigator.share) {
                await navigator.share({
                    title: data.name,
                    text: `Check out "${data.name}" 🎵`,
                    url: data.shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(data.shareUrl);
                toast.info("Link copied to clipboard");
            }
        } catch (err: any) {
            if (err?.name !== "AbortError") {
                console.error(err);
                toast.error(err?.message || "Couldn't open the share sheet");
            }
        } finally {
            setSharing(false);
        }
    };

    // ---- Desktop: copy link / embed / web share links ----
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

                            {/* Live preview (scaled down) */}
                            <div
                                className="mx-auto overflow-hidden rounded-xl border border-zinc-800 shadow-2xl"
                                style={{ width: 240, height: 427 }}
                            >
                                <div
                                    style={{
                                        transform: "scale(0.2222)",
                                        transformOrigin: "top left",
                                    }}
                                >
                                    <ActiveComponent data={proxiedData} />
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
                        <div className="space-y-5">
                            {/* Copy link */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-300">
                                    Playlist link
                                </label>
                                <Input
                                    readOnly
                                    value={data.shareUrl}
                                    className="bg-zinc-900/60 border-brand/20 text-zinc-300 text-sm"
                                />
                            </div>

                            {/* Embed code */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-300">
                                    Embed
                                </label>
                                <Input
                                    readOnly
                                    value={embedCode}
                                    className="bg-zinc-900/60 border-brand/20 text-zinc-500 text-xs font-mono"
                                />
                            </div>

                            {/* Quick share icon row — matches PiP button style */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-300">
                                    Share to
                                </label>
                                <div className="flex gap-1">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 text-zinc-400 hover:text-brand hover:bg-zinc-800 transition-all"
                                                >
                                                    <a
                                                        href={whatsappWebUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Share on WhatsApp</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 text-zinc-400 hover:text-brand hover:bg-zinc-800 transition-all"
                                                >
                                                    <a
                                                        href={facebookShareUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Facebook className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Share on Facebook</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 transition-all ${copied === "link"
                                                        ? "text-brand bg-zinc-800"
                                                        : "text-zinc-400 hover:text-brand hover:bg-zinc-800"
                                                        }`}
                                                    onClick={() => copyToClipboard(data.shareUrl, "link")}
                                                >
                                                    {copied === "link" ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Link2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Copy link</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 transition-all ${copied === "embed"
                                                        ? "text-brand bg-zinc-800"
                                                        : "text-zinc-400 hover:text-brand hover:bg-zinc-800"
                                                        }`}
                                                    onClick={() => copyToClipboard(embedCode, "embed")}
                                                >
                                                    {copied === "embed" ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Code2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Copy embed code</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-xs text-zinc-500 pt-1">
                                    Instagram doesn't support sharing from desktop browsers —
                                    open this on your phone to share directly to Instagram.
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Full-res off-screen card used for actual image capture (mobile only) */}
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