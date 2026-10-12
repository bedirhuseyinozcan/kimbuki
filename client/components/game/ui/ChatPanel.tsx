import React, { useRef, useEffect } from "react";
import { TextField, IconButton } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import { NAME_COLORS } from "../types";

interface ChatPanelProps {
    chatHistory: any[];
    chatInput: string;
    setChatInput: (val: string) => void;
    handleChat: (e?: React.FormEvent) => void;
    isChatOpen: boolean;
    onToggle: () => void;
    isPlayer: boolean;
}

export default function ChatPanel({
    chatHistory,
    chatInput,
    setChatInput,
    handleChat,
    isChatOpen,
    onToggle,
    isPlayer
}: ChatPanelProps) {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    return (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl transition-all duration-300 flex flex-col z-10 relative pointer-events-auto shadow-2xl">
            <div onClick={onToggle} className="p-3 flex justify-between items-center cursor-pointer border-b border-slate-700/50">
                <span className="font-bold text-sm text-violet-400 flex items-center gap-2">💬 Sohbet</span>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded-lg text-slate-300">{isChatOpen ? '▼ Gizle' : '▲ Aç'}</span>
            </div>

            <div className={`group ${isChatOpen ? 'flex flex-col' : 'hidden'}`}>
                <div className="h-40 group-focus-within:h-64 md:group-focus-within:h-72 transition-all duration-300 ease-in-out overflow-y-auto p-4 space-y-2 custom-scrollbar pointer-events-auto">
                    {chatHistory.map((msg: any, i: number) => {
                        let colorClass = "text-violet-400";
                        if (!msg.system && msg.nameColor) {
                            const found = NAME_COLORS.find(c => c.id === msg.nameColor);
                            if (found) colorClass = found.className;
                        }
                        return (
                            <div key={i} className={`text-sm ${msg.system ? (msg.message.includes('Sistem (Özel)') ? 'text-fuchsia-400 font-bold' : 'text-cyan-400 text-center italic my-2') : ''}`}>
                                {!msg.system && <strong className={colorClass}>{msg.name}: </strong>}
                                <span className={`break-words break-all ${msg.system ? (msg.message.includes('Sistem (Özel)') ? '' : 'font-bold') : 'text-slate-200'}`}>{msg.message}</span>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChat} className="p-2 border-t border-slate-700 flex gap-2 pointer-events-auto">
                    <TextField 
                        fullWidth 
                        size="small" 
                        slotProps={{ htmlInput: { maxLength: 120 } }} 
                        placeholder={isPlayer ? "Soru sor veya cevapla..." : "İzleyici sohbeti..."} 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        sx={{ 
                            input: { color: 'white' }, 
                            '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#475569' }, 
                                '&:hover fieldset': { borderColor: '#94a3b8' }, 
                                '&.Mui-focused fieldset': { borderColor: '#06b6d4' } 
                            } 
                        }} 
                    />
                    <IconButton type="submit" color="primary" className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-4">
                        <SendIcon />
                    </IconButton>
                </form>
            </div>
        </div>
    );
}
