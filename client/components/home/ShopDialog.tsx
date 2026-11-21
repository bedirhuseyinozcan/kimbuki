"use client";

import { Button, Dialog, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { HomeUser, ShopItem } from "./types";

interface ShopDialogProps {
    open: boolean;
    onClose: () => void;
    user: HomeUser | null;
    shopTab: number;
    setShopTab: (tab: number) => void;
    shopItems: ShopItem[];
    onBuyItem: (itemId: string) => void;
}

export default function ShopDialog({
    open,
    onClose,
    user,
    shopTab,
    setShopTab,
    shopItems,
    onBuyItem
}: ShopDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D]"
                }
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
                <span>🛒 KOZMETİK MAĞAZASI</span>
                <span className="font-mono text-xs font-bold px-3 py-1 bg-[#111318] border border-[#FFBE0B] text-[#FFBE0B] rounded-[4px] tnum">
                    🪙 {user?.gold || 0} ALTIN
                </span>
            </DialogTitle>
            <DialogContent className="p-6 custom-scrollbar">
                <Tabs
                    value={shopTab}
                    onChange={(_, newValue) => setShopTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        mb: 3, borderBottom: 2, borderColor: '#2D3342',
                        '& .MuiTab-root': { color: '#A0A8B8', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' },
                        '& .Mui-selected': { color: '#FFBE0B !important' },
                        '& .MuiTabs-indicator': { backgroundColor: '#FFBE0B', height: '3px' }
                    }}
                >
                    <Tab label="🎭 KARAKTERLER" />
                    <Tab label="🧊 KAİDELER" />
                    <Tab label="🎨 İSİM RENKLERİ" />
                    <Tab label="👑 ÜNVANLAR" />
                </Tabs>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {shopItems.filter(i => {
                        if (shopTab === 0) return i.type === 'avatar' || !i.type;
                        if (shopTab === 1) return i.type === 'pedestal';
                        if (shopTab === 2) return i.type === 'color';
                        if (shopTab === 3) return i.type === 'title';
                        return false;
                    }).map((item) => {
                        let isUnlocked = false;
                        if (shopTab === 0) isUnlocked = user?.unlockedAvatars?.includes(item.id) || false;
                        if (shopTab === 1) isUnlocked = user?.unlockedPedestals?.includes(item.id) || false;
                        if (shopTab === 2) isUnlocked = user?.unlockedNameColors?.includes(item.id) || false;
                        if (shopTab === 3) isUnlocked = user?.unlockedTitles?.includes(item.id) || false;

                        return (
                            <div key={item.id} className="bg-[#111318] p-4 rounded-[4px] border-2 border-[#2D3342] flex flex-col items-center justify-between text-center">
                                <span className="text-4xl mb-2 flex justify-center items-center h-[52px] w-[52px] bg-[#1A1D24] border border-[#2D3342] rounded-[4px]">
                                    {item.icon}
                                </span>
                                <span className="font-display font-bold text-sm uppercase text-[#F6F5F2]">{item.label}</span>
                                <div className="mt-3 w-full">
                                    {isUnlocked ? (
                                        <Button disabled fullWidth size="small" className="!bg-[#1A1D24] !text-[#687082] !border !border-[#2D3342] !font-mono !text-xs !font-bold !rounded-[4px]">
                                            ENVANTERDE
                                        </Button>
                                    ) : (
                                        <Button
                                            fullWidth
                                            size="small"
                                            onClick={() => onBuyItem(item.id)}
                                            className="swiss-btn-primary !py-1.5 !text-xs tnum"
                                            startIcon={<AttachMoneyIcon fontSize="small" />}
                                        >
                                            {item.price}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
