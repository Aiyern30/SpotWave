import { useEffect, useState } from "react";

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent || "";
        const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);
        const isTouchAndNarrow =
            "ontouchstart" in window && window.matchMedia("(max-width: 768px)").matches;
        const hasNativeShare = typeof navigator.share === "function";

        setIsMobile((isMobileUA || isTouchAndNarrow) && hasNativeShare);
    }, []);

    return isMobile;
}