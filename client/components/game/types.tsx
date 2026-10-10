import React from 'react';
import { GiBroadsword, GiWizardStaff, GiDaggers, GiBowArrow, GiHighKick, GiHolySymbol, GiFootprint, GiEyeTarget, GiMagnifyingGlass, GiCrystalBall, GiCrown } from 'react-icons/gi';

export type User = {
    id: string;
    dbId: string;
    name: string;
    isHost: boolean;
    avatar: string;
    pedestal?: string;
    nameColor?: string;
    title?: string;
    reputation?: number;
    status: string;
    targetId: string | null;
    hasSubmittedWord: boolean;
    hasPlacedBet?: boolean;
    isVoiceEnabled: boolean;
    joker?: number | null;
    jokerChoices?: number[];
    hasDrafted?: boolean;
    hasUsedJoker?: boolean;
    russianRouletteActive?: boolean;
    bloodTieTarget?: string | null;
    timeBomb?: { casterId: string, roundsLeft: number } | null;
    mirrorRoundsLeft?: number;
    shieldActive?: boolean;
    extraQuestionChain?: boolean;
    silencedTurns?: number;
    extraQuestions?: number;
    lastQuestion?: any;
    questionsAskedThisTurn?: number;
    assignedWord: string | null;
    lives: number;
    disconnected?: boolean;
    detectiveUses?: number;
    lastDetectiveRound?: number;
};

export type GameState = {
    gameState: "LOBBY" | "BETTING" | "WORD_SELECTION" | "JOKER_DRAFT" | "PLAYING" | "ROUND_END";
    bettingEndTime?: number;
    jokerDraftEndTime?: number;
    roundCount?: number;
    objection?: {
        initiator: string;
        votes: { [userId: string]: boolean };
        endTime: number;
    } | null;
    roundLogs?: string[];
    category?: string;
    isBettingEnabled?: boolean;
    betAmount?: number;
    isJokersEnabled?: boolean;
    theme?: "day" | "night";
    map?: string;
    activeQuestion?: {
        askerId: string;
        question: string;
        votes: { [userId: string]: string };
        endTime?: number;
    } | null;
    resolvedQuestionsThisTurn?: { askerId: string; question: string; votes: { [userId: string]: string }; }[];
    users: User[];
    currentTurnUserId: string | null;
    turnEndsAt: number | null;
    chatHistory: any[];
    winners: string[];
    hasObjectionUsed?: boolean;
};

export const JOKERS = [
    { id: 0, name: "Zaman Bükücü", rarity: "silver", desc: "Sıran geldiğinde sürene +1 Dakika ekler.", requiresTarget: false, requiresWord: false },
    { id: 1, name: "Harf Açıcı", rarity: "silver", desc: "Kelimenin kaç harf olduğunu gizler, içinden 1 harf ve adedini söyler.", requiresTarget: false, requiresWord: false },
    { id: 2, name: "Çift Şarjör", rarity: "gold", desc: "+1 soru hakkı verir. Sorduğun soru 'Evet' alırsa sonsuz +1 hak kazanmaya devam edersin.", requiresTarget: false, requiresWord: false },
    { id: 3, name: "Susturucu", rarity: "gold", desc: "Seçtiğin bir oyuncuyu 2 tur susturur.", requiresTarget: true, requiresWord: false },
    { id: 4, name: "Hafıza Silici", rarity: "prismatic", desc: "Seçtiğin kişinin kelimesini değiştirir. Tüm emeği çöp olur.", requiresTarget: true, requiresWord: true },
    { id: 5, name: "Kan Bağı", rarity: "prismatic", desc: "Biriyle bağlan. O 'Evet' alırsa harfin açılır, 'Hayır' alırsa canın gider.", requiresTarget: true, requiresWord: false },
    { id: 6, name: "Rus Ruleti", rarity: "prismatic", desc: "Hemen tahmin zorunlu olur. Bilirsen tüm kasayı alırsın, bilemezsen elenirsin!", requiresTarget: false, requiresWord: false },
    { id: 7, name: "Saatli Bomba", rarity: "prismatic", desc: "Birine bomba kur. 3 tur içinde bilemezse 2 canı gider. Bilirse sana döner!", requiresTarget: true, requiresWord: false },
    { id: 8, name: "Ayna (Kalkan)", rarity: "gold", desc: "Gizlice basılır. 3 tur boyunca sana atılan kötü jokerleri atan kişiye geri yansıtır.", requiresTarget: false, requiresWord: false },
    { id: 9, name: "Gizli Kalkan", rarity: "silver", desc: "Gizlice basılır. Bir sonraki can kaybını (tahmin/bomba) engeller.", requiresTarget: false, requiresWord: false },
    { id: 10, name: "İpucu Tartısı", rarity: "silver", desc: "Gizlice bir hedef seç. Senin kelimenin onun kelimesinden UZUN/KISA olduğunu söyler.", requiresTarget: true, requiresWord: false },
    { id: 11, name: "Sürpriz Kutu (Gümüş)", rarity: "silver", desc: "Kullandığında sana anında rastgele bir ALTIN joker verir.", requiresTarget: false, requiresWord: false },
    { id: 12, name: "Sürpriz Kutu (Altın)", rarity: "gold", desc: "Kullandığında sana anında rastgele bir PRİZMATİK joker verir.", requiresTarget: false, requiresWord: false },
    { id: 13, name: "Can Takası", rarity: "prismatic", desc: "Seçtiğin oyuncuyla canlarınızı (❤️) takas edersin. Masayı birbirine katar!", requiresTarget: true, requiresWord: false },
    { id: 14, name: "Harf Dedektifi", rarity: "silver", desc: "Kelimende belirlediğin bir harfin olup olmadığını sorgular. Toplam 3 kez kullanılabilir (Üst üste kullanılamaz, 1 tur beklemelisin).", requiresTarget: false, requiresWord: true },
    { id: 15, name: "Amnezi", rarity: "gold", desc: "Seçtiğin bir oyuncunun Not Defterindeki tüm yazıları anında siler! (Kalkan engeller)", requiresTarget: true, requiresWord: false },
    { id: 16, name: "Telepati", rarity: "silver", desc: "Seçtiğin oyuncuyla kelimelerinizdeki tüm ortak harfleri ikinize de bildirir. (Kalkan/Ayna engellemez)", requiresTarget: true, requiresWord: false }
];

export const AVATARS = [
    { id: 'Warrior', color: "bg-red-600", icon: <GiBroadsword />, label: "Savaşçı", model: "Warrior.gltf" },
    { id: 'Wizard', color: "bg-blue-600", icon: <GiWizardStaff />, label: "Büyücü", model: "Wizard.gltf" },
    { id: 'Rogue', color: "bg-purple-600", icon: <GiDaggers />, label: "Suikastçi", model: "Rogue.gltf" },
    { id: 'Ranger', color: "bg-green-600", icon: <GiBowArrow />, label: "Okçu", model: "Ranger.gltf" },
    { id: 'Monk', color: "bg-orange-600", icon: <GiHighKick />, label: "Keşiş", model: "Monk.gltf" },
    { id: 'Cleric', color: "bg-yellow-500", icon: <GiHolySymbol />, label: "Şifacı", model: "Cleric.gltf" }
];

export const getRankInfo = (reputation: number) => {
    let title = "Çaylak";
    let color = "text-amber-600";
    let icon = <GiFootprint />;
    if (reputation >= 5000) { title = "Kimbuki Üstadı"; color = "text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"; icon = <GiCrown />; }
    else if (reputation >= 2500) { title = "Zihin Okuyucu"; color = "text-cyan-300"; icon = <GiCrystalBall />; }
    else if (reputation >= 1000) { title = "Dedektif"; color = "text-yellow-500"; icon = <GiMagnifyingGlass />; }
    else if (reputation >= 400) { title = "Gözlemci"; color = "text-slate-300"; icon = <GiEyeTarget />; }
    return { title, color, icon };
};

export const PEDESTALS = [
    { id: 'default_stone', label: 'Taş Zemin' },
    { id: 'gold_pedestal', label: 'Altın Kaide' },
    { id: 'lava_ring', label: 'Lav Halkası' },
    { id: 'ice_block', label: 'Buz Kütlesi' },
    { id: 'cloud_base', label: 'Uçan Bulut' },
];

export const NAME_COLORS = [
    { id: 'text-white', label: 'Standart Beyaz', className: 'text-white' },
    { id: 'color_neon_pink', label: 'Neon Pembe', className: 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]' },
    { id: 'color_electric_blue', label: 'Elektrik Mavisi', className: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' },
    { id: 'color_gold', label: 'Saf Altın', className: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' }
];

export const TITLES = [
    { id: '', label: 'Ünvansız' },
    { id: 'title_rich', label: '👑 Zengin' },
    { id: 'title_troll', label: '🤡 Trol' },
    { id: 'title_collector', label: '💎 Koleksiyoncu' }
];
