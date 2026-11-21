export type GraphicsMode = "hd" | "low" | "2d";

const STORAGE_KEY = "kimbuki_graphics_mode";
const LEGACY_LOW_KEY = "kimbuki_low_graphics";
const SOFTWARE_RENDERER_REGEX = /SwiftShader|llvmpipe|Software|Basic Render|WARP|Mesa OffScreen/i;

export function detectSoftwareRenderer(): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    try {
        const canvas = document.createElement("canvas");
        const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
        if (!gl) return true;

        let renderer = "";
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
            renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "");
        }
        if (!renderer) {
            renderer = String(gl.getParameter(gl.RENDERER) || "");
        }

        const loseContext = gl.getExtension("WEBGL_lose_context");
        if (loseContext) loseContext.loseContext();

        return SOFTWARE_RENDERER_REGEX.test(renderer);
    } catch {
        return true;
    }
}

export function getInitialGraphicsMode(): { mode: GraphicsMode; autoSwitched: boolean } {
    if (typeof window === "undefined") {
        return { mode: "hd", autoSwitched: false };
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "hd" || saved === "low" || saved === "2d") {
        return { mode: saved, autoSwitched: false };
    }

    if (localStorage.getItem(LEGACY_LOW_KEY) === "1") {
        return { mode: "low", autoSwitched: false };
    }

    if (detectSoftwareRenderer()) {
        return { mode: "2d", autoSwitched: true };
    }

    return { mode: "hd", autoSwitched: false };
}

export function saveGraphicsMode(mode: GraphicsMode): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.setItem(LEGACY_LOW_KEY, mode === "low" ? "1" : "0");
}
