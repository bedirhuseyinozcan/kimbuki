import React, { useRef, useEffect } from "react";
import { TextField, IconButton } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import { ChatMessage, NAME_COLORS } from "../types";
import { useGameChat } from "@/context/GameContext";

interface ChatPanelProps {
    chatHistory?: ChatMessage[];
    chatInput?: string;
    setChatInput?: (val: string) => void;
    handleChat?: (e?: React.FormEvent) => void;
    isChatOpen: boolean;
    onToggle: () => void;
    isPlayer?: boolean;
}

export default function ChatPanel(props: ChatPanelProps) {
    const ctx = useGameChat();
    const chatHistory = props.chatHistory ?? ctx.chatHistory;
    const chatInput = props.chatInput ?? ctx.chatInput;
    const setChatInput = props.setChatInput ?? ctx.setChatInput;
    const handleChat = props.handleChat ?? ctx.handleChat;
    const isPlayer = props.isPlayer ?? ctx.isPlayer;
    const { isChatOpen, onToggle } = props;

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    return (
        <div className="swiss-panel transition-all duration-150 flex flex-col z-10 relative pointer-events-auto overflow-hidden">
            <div 
                onClick={onToggle} 
                className="px-3.5 py-2.5 flex justify-between items-center cursor-pointer border-b-2 border-[#2D3342] bg-[#1A1D24] select-none group"
            >
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#00E5A3] inline-block" />
                    <span className="font-display font-bold text-sm uppercase tracking-wider text-[#F6F5F2] group-hover:text-[#00E5A3] transition-colors">
                        MASA SOHBETİ
                    </span>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-[#222630] border border-[#3E4659] px-2 py-0.5 rounded-[4px] text-[#A0A8B8]">
                    {isChatOpen ? 'GİZLE' : 'AÇ'}
                </span>
            </div>

            <div className={`group ${isChatOpen ? 'flex flex-col' : 'hidden'}`}>
                <div className="h-36 group-focus-within:h-56 md:group-focus-within:h-64 transition-all duration-200 ease-out overflow-y-auto p-3.5 space-y-2 custom-scrollbar pointer-events-auto bg-[#111318]/90">
                    {chatHistory.length === 0 && (
                        <div className="text-xs font-mono text-[#687082] uppercase tracking-wider text-center py-6">
                            HENÜZ MESAJ YOK. SOHBETİ BAŞLAT!
                        </div>
                    )}
                    {chatHistory.map((msg: ChatMessage, i: number) => {
                        let colorClass = "text-[#FFBE0B]";
                        if (!msg.system && msg.nameColor) {
                            const found = NAME_COLORS.find(c => c.id === msg.nameColor);
                            if (found) colorClass = found.className;
                        }
                        if (msg.system) {
                            const isSpecial = msg.message.includes('Sistem (Özel)');
                            return (
                                <div 
                                    key={i} 
                                    className={`text-xs font-mono py-1.5 px-2.5 rounded-[4px] border-l-4 my-1.5 ${
                                        isSpecial 
                                            ? 'bg-[#FF5938]/15 border-[#FF5938] text-[#FF5938] font-bold' 
                                            : 'bg-[#222630] border-[#FFBE0B] text-[#F6F5F2]'
                                    }`}
                                >
                                    {msg.message}
                                </div>
                            );
                        }
                        return (
                            <div key={i} className="text-xs md:text-sm leading-snug">
                                <strong className={`font-display uppercase tracking-wide text-xs mr-1.5 ${colorClass}`}>
                                    {msg.name}:
                                </strong>
                                <span className="break-words text-[#F6F5F2]">{msg.message}</span>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChat} className="p-2.5 border-t-2 border-[#2D3342] bg-[#1A1D24] flex gap-2 pointer-events-auto">
                    <TextField 
                        fullWidth 
                        size="small" 
                        slotProps={{ htmlInput: { maxLength: 120 } }} 
                        placeholder={isPlayer ? "Mesaj yaz veya ipucu sor..." : "İzleyici sohbeti..."} 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        sx={{ 
                            input: { 
                                color: '#F6F5F2', 
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.875rem',
                                py: 1
                            }, 
                            '& .MuiOutlinedInput-root': { 
                                backgroundColor: '#111318',
                                borderRadius: '4px',
                                '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' }, 
                                '&:hover fieldset': { borderColor: '#3E4659' }, 
                                '&.Mui-focused fieldset': { borderColor: '#FFBE0B', borderWidth: '2px' } 
                            } 
                        }} 
                    />
                    <IconButton 
                        type="submit" 
                        className="!bg-[#FFBE0B] hover:!bg-[#FFD043] !text-[#111318] !rounded-[4px] !border-2 !border-[#090A0D] !shadow-[2px_2px_0px_#090A0D] !px-3.5 transition-transform active:translate-y-0.5"
                    >
                        <SendIcon fontSize="small" />
                    </IconButton>
                </form>
            </div>
        </div>
    );
}
