const FREE_DEFAULTS = {
    avatar: 'Warrior',
    pedestal: 'default_stone',
    nameColor: 'text-white',
    title: ''
};

const PREMIUM_AVATARS = [
    { id: 'Wizard', price: 200, label: 'Büyücü', icon: '🔮', type: 'avatar' },
    { id: 'Rogue', price: 300, label: 'Suikastçi', icon: '🗡️', type: 'avatar' },
    { id: 'Ranger', price: 400, label: 'Okçu', icon: '🏹', type: 'avatar' },
    { id: 'Monk', price: 500, label: 'Keşiş', icon: '🥋', type: 'avatar' },
    { id: 'Cleric', price: 600, label: 'Şifacı', icon: '✨', type: 'avatar' }
];

const PREMIUM_PEDESTALS = [
    { id: 'gold_pedestal', price: 500, label: 'Altın Kaide', icon: '🏆', type: 'pedestal' },
    { id: 'lava_ring', price: 800, label: 'Lav Halkası', icon: '🌋', type: 'pedestal' },
    { id: 'ice_block', price: 600, label: 'Buz Kütlesi', icon: '🧊', type: 'pedestal' },
    { id: 'cloud_base', price: 1000, label: 'Uçan Bulut', icon: '☁️', type: 'pedestal' }
];

const PREMIUM_COLORS = [
    { id: 'color_neon_pink', price: 1000, label: 'Sinyal Mercan', icon: '🪸', type: 'color' },
    { id: 'color_electric_blue', price: 1000, label: 'Nane Telemetri', icon: '⚡', type: 'color' },
    { id: 'color_gold', price: 2000, label: 'Saf Altın', icon: '✨', type: 'color' }
];

const PREMIUM_TITLES = [
    { id: 'title_rich', price: 5000, label: 'Ünvan: Zengin', icon: '👑', type: 'title' },
    { id: 'title_troll', price: 1500, label: 'Ünvan: Trol', icon: '🤡', type: 'title' },
    { id: 'title_collector', price: 2500, label: 'Ünvan: Koleksiyoncu', icon: '💎', type: 'title' }
];

const ALL_SHOP_ITEMS = [
    ...PREMIUM_AVATARS,
    ...PREMIUM_PEDESTALS,
    ...PREMIUM_COLORS,
    ...PREMIUM_TITLES
];

const VALID_MAPS = ["floating_island__low_poly_vr.glb", "snow.glb", "desert.glb"];
const VALID_THEMES = ["day", "night"];
const VALID_CATEGORIES = ["Karışık", "Ünlüler", "Hayvanlar", "Tarihi Kişiler", "Filmler / Diziler"];
const VALID_BET_AMOUNTS = [50, 100, 250, 500];
const VALID_GAME_MODES = ["classic", "blitz"];

module.exports = {
    FREE_DEFAULTS,
    PREMIUM_AVATARS,
    PREMIUM_PEDESTALS,
    PREMIUM_COLORS,
    PREMIUM_TITLES,
    ALL_SHOP_ITEMS,
    VALID_MAPS,
    VALID_THEMES,
    VALID_CATEGORIES,
    VALID_BET_AMOUNTS,
    VALID_GAME_MODES
};
