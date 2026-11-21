import { GameState, User } from "@/components/game/types";

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 1 && ctx.measureText(out + "...").width > maxWidth) {
        out = out.slice(0, -1);
    }
    return out + "...";
}

function renderMatchPoster(gameState: GameState): HTMLCanvasElement {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let x = 24; x < W; x += 32) {
        for (let y = 24; y < H; y += 32) {
            ctx.fillRect(x, y, 2, 2);
        }
    }

    ctx.fillStyle = "#FFBE0B";
    ctx.fillRect(0, 0, W, 16);

    const padX = 72;
    const cardW = W - padX * 2;

    ctx.fillStyle = "#090A0D";
    drawRoundedRect(ctx, padX + 12, 76, cardW, H - 152, 12);
    ctx.fill();

    ctx.fillStyle = "#1A1D24";
    ctx.strokeStyle = "#3E4659";
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, padX, 64, cardW, H - 152, 12);
    ctx.fill();
    ctx.stroke();

    const innerX = padX + 56;
    const innerW = cardW - 112;

    ctx.fillStyle = "#FFBE0B";
    ctx.fillRect(innerX, 122, 18, 18);
    ctx.fillStyle = "#A0A8B8";
    ctx.font = "700 22px 'IBM Plex Mono', monospace";
    ctx.fillText("MAÇ SONU RAPORU", innerX + 32, 139);

    ctx.fillStyle = "#F6F5F2";
    ctx.font = "700 76px 'Space Grotesk', sans-serif";
    ctx.fillText("KİMBUKİ", innerX, 224);

    const modeLabel = gameState.gameMode === "blitz" ? "⚡ BLITZ (20SN)" : "KLASİK (60SN)";
    const metaPills = [
        `KATEGORİ: ${(gameState.category || "KARIŞIK").toLocaleUpperCase("tr-TR")}`,
        `TUR #${gameState.roundCount || 1}`,
        modeLabel
    ];

    let pillX = innerX;
    const pillY = 256;
    ctx.font = "700 20px 'IBM Plex Mono', monospace";
    for (const text of metaPills) {
        const tw = ctx.measureText(text).width + 34;
        ctx.fillStyle = "#111318";
        ctx.strokeStyle = text.includes("BLITZ") ? "#FFBE0B" : "#2D3342";
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, pillX, pillY, tw, 44, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = text.includes("BLITZ") ? "#FFBE0B" : "#F6F5F2";
        ctx.fillText(text, pillX + 17, pillY + 29);
        pillX += tw + 14;
    }

    ctx.fillStyle = "#2D3342";
    ctx.fillRect(innerX, 326, innerW, 3);

    const winners = (gameState.users || []).filter((u: User) => gameState.winners.includes(u.id));
    const winnerNames = winners.length > 0 ? winners.map((u) => u.name).join(", ") : "BERABERE";

    ctx.fillStyle = "#090A0D";
    drawRoundedRect(ctx, innerX + 6, 360, innerW, 118, 8);
    ctx.fill();

    ctx.fillStyle = "#00E5A3";
    ctx.strokeStyle = "#090A0D";
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, innerX, 354, innerW, 118, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111318";
    ctx.font = "700 20px 'IBM Plex Mono', monospace";
    ctx.fillText("🏆 MAÇIN KAZANANI", innerX + 28, 392);

    ctx.font = "700 44px 'Space Grotesk', sans-serif";
    ctx.fillText(truncateText(ctx, winnerNames.toLocaleUpperCase("tr-TR"), innerW - 56), innerX + 28, 446);

    ctx.fillStyle = "#8B94A7";
    ctx.font = "700 20px 'IBM Plex Mono', monospace";
    ctx.fillText("KİMLİK TABLOSU", innerX, 520);

    const users = (gameState.users || []).slice(0, 8);
    const listTop = 542;
    const availableH = 590;
    const rowGap = 14;
    const rowH = Math.min(72, Math.floor((availableH - rowGap * Math.max(0, users.length - 1)) / Math.max(1, users.length)));

    users.forEach((u, idx) => {
        const y = listTop + idx * (rowH + rowGap);
        const isWinner = gameState.winners.includes(u.id);

        ctx.fillStyle = isWinner ? "rgba(0, 229, 163, 0.12)" : "#111318";
        ctx.strokeStyle = isWinner ? "#00E5A3" : "#2D3342";
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, innerX, y, innerW, rowH, 6);
        ctx.fill();
        ctx.stroke();

        const centerY = y + rowH / 2 + 8;

        ctx.fillStyle = "#687082";
        ctx.font = "700 22px 'IBM Plex Mono', monospace";
        ctx.fillText(`#${String(idx + 1).padStart(2, "0")}`, innerX + 20, centerY);

        ctx.fillStyle = "#F6F5F2";
        ctx.font = "700 28px 'Space Grotesk', sans-serif";
        ctx.fillText(truncateText(ctx, u.name, innerW * 0.42), innerX + 86, centerY);

        const wordText = (u.assignedWord || "—").toLocaleUpperCase("tr-TR");
        const badgeText = isWinner ? `✓ ${wordText}` : `✗ ${wordText}`;
        ctx.font = "700 20px 'IBM Plex Mono', monospace";
        const badgeW = Math.min(innerW * 0.42, ctx.measureText(badgeText).width + 32);
        const badgeH = Math.min(42, rowH - 16);
        const badgeX = innerX + innerW - badgeW - 18;
        const badgeY = y + (rowH - badgeH) / 2;

        ctx.fillStyle = isWinner ? "#00E5A3" : "rgba(255, 51, 75, 0.18)";
        ctx.strokeStyle = isWinner ? "#090A0D" : "#FF334B";
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isWinner ? "#111318" : "#FF334B";
        ctx.fillText(
            truncateText(ctx, badgeText, badgeW - 20),
            badgeX + 14,
            badgeY + badgeH / 2 + 7
        );
    });

    ctx.fillStyle = "#2D3342";
    ctx.fillRect(innerX, 1170, innerW, 3);

    const today = new Date().toLocaleDateString("tr-TR");
    ctx.fillStyle = "#A0A8B8";
    ctx.font = "700 20px 'IBM Plex Mono', monospace";
    ctx.fillText("KİMBUKİ — SOSYAL DEDÜKSİYON ARENASI", innerX, 1218);

    ctx.fillStyle = "#FFBE0B";
    const dateW = ctx.measureText(today).width;
    ctx.fillText(today, innerX + innerW - dateW, 1218);

    return canvas;
}

export async function shareOrDownloadMatchCard(gameState: GameState): Promise<"shared" | "downloaded"> {
    const canvas = renderMatchPoster(gameState);
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Poster oluşturulamadı."));
        }, "image/png");
    });

    const filename = `kimbuki-mac-ozeti-${Date.now()}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
    ) {
        try {
            await navigator.share({
                title: "Kimbuki Maç Özeti",
                text: "Kimbuki maç sonucumuz!",
                files: [file]
            });
            return "shared";
        } catch (err) {
            if ((err as Error)?.name === "AbortError") {
                return "shared";
            }
        }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
}
