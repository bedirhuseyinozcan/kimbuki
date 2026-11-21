export type QuestItem = {
    id: string;
    type: string;
    target: number;
    progress: number;
    rewardGold: number;
    rewardRep: number;
    title: string;
    isClaimed: boolean;
};

export type ShopItem = {
    id: string;
    price: number;
    label: string;
    icon: string;
    type: string;
};

export type LeaderboardEntry = {
    _id?: string;
    username: string;
    gold: number;
    reputation?: number;
    avatar?: string;
    nameColor?: string;
    title?: string;
};

export type HomeUser = {
    id: string;
    username: string;
    isGuest?: boolean;
    avatar: string;
    pedestal?: string;
    nameColor?: string;
    title?: string;
    gold: number;
    unlockedAvatars: string[];
    unlockedPedestals?: string[];
    unlockedNameColors?: string[];
    unlockedTitles?: string[];
    rankInfo?: { title: string; reputation: number; nextThreshold: number | null };
    quests?: QuestItem[];
    canClaimDaily?: boolean;
    loginStreak?: number;
};

export const inputFieldSx = {
    input: { color: '#F6F5F2', fontWeight: 600, fontFamily: 'var(--font-sans)' },
    label: { color: '#A0A8B8' },
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#111318',
        borderRadius: '4px',
        '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' },
        '&:hover fieldset': { borderColor: '#3E4659' },
        '&.Mui-focused fieldset': { borderColor: '#FFBE0B', borderWidth: '2px' }
    }
};
