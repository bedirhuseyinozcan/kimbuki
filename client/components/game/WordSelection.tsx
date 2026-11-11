import { Button, TextField } from "@mui/material";
import { User, GameState } from "./types";

interface WordSelectionProps {
    gameState: GameState;
    me: User;
    wordInput: string;
    setWordInput: (val: string) => void;
    onSetWord: () => void;
    onEditWord: () => void;
    onShuffleTargets: () => void;
    onLeaveRoom: () => void;
}

export default function WordSelection({
    gameState, me, wordInput, setWordInput, onSetWord, onEditWord, onShuffleTargets, onLeaveRoom
}: WordSelectionProps) {
    const targetUser = gameState.users.find((u: User) => u.id === me?.targetId);

    return (
        <main className="min-h-screen text-[#F6F5F2] flex flex-col items-center justify-center p-4 md:p-8 relative gap-8">
            <div className="swiss-panel max-w-xl w-full p-6 md:p-8 relative overflow-hidden">
                {gameState.isBettingEnabled && (
                    <div className="mb-6 bg-[#FFBE0B]/15 border-2 border-[#FFBE0B] px-4 py-2 rounded-[4px] flex justify-between items-center">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFBE0B]">
                            💰 BAHİSLİ MAÇ AKTİF
                        </span>
                        <span className="font-mono text-xs font-bold text-[#FFBE0B] tnum">
                            GİRİŞ: -{gameState.betAmount || 50} ALTIN
                        </span>
                    </div>
                )}

                <div className="flex items-center justify-between border-b-2 border-[#2D3342] pb-4 mb-6">
                    <div>
                        <span className="swiss-label block mb-1">GİZLİ KİMLİK ATAMASI</span>
                        <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight text-[#F6F5F2]">
                            KELİME BELİRLE
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {gameState.category && (
                            <span className="swiss-badge !border-[#FF5938] !text-[#FF5938]">
                                {gameState.category}
                            </span>
                        )}
                        {me?.isHost && (
                            <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={onShuffleTargets} 
                                className="swiss-btn-secondary !min-w-0 !px-3 !py-1.5" 
                                title="Hedef Eşleşmelerini Karıştır"
                            >
                                🎲 KARIŞTIR
                            </Button>
                        )}
                    </div>
                </div>

                {me?.hasSubmittedWord ? (
                    <div className="py-6 text-center space-y-5">
                        <div className="swiss-postit p-6 max-w-sm mx-auto transform -rotate-1">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#111318]/70 block mb-1">
                                {targetUser?.name} İÇİN YAZDIĞIN KART:
                            </span>
                            <p className="font-display text-2xl md:text-3xl font-bold text-[#111318] uppercase tracking-wider break-words">
                                {targetUser?.assignedWord}
                            </p>
                        </div>

                        <div>
                            <Button 
                                variant="outlined" 
                                onClick={onEditWord} 
                                className="swiss-btn-secondary !px-6 !py-2.5"
                            >
                                ✏️ KELİMEYİ DÜZENLE
                            </Button>
                        </div>

                        <p className="font-mono text-xs uppercase tracking-wider text-[#A0A8B8] animate-pulse">
                            DİĞER OYUNCULARIN KARTLARINI YAZMASI BEKLENİYOR...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 text-left">
                        {/* Target Dossier Box */}
                        <div className="bg-[#111318] p-4 rounded-[4px] border-2 border-[#2D3342] flex items-center justify-between">
                            <div>
                                <span className="swiss-label block mb-1">HEDEF OYUNCU</span>
                                <p className="font-display text-2xl font-bold text-[#FFBE0B] uppercase">
                                    {targetUser?.name}
                                </p>
                            </div>
                            <span className="font-mono text-xs uppercase px-2.5 py-1 bg-[#222630] border border-[#3E4659] rounded-[2px] text-[#A0A8B8]">
                                ALNINA YAPIŞACAK
                            </span>
                        </div>

                        <div>
                            <label className="swiss-label block mb-2">KAFASINDAKİ KAĞITTA NE YAZSIN?</label>
                            <TextField 
                                fullWidth
                                placeholder="Örn: Sherlock Holmes, Cristiano Ronaldo, Penguen..."
                                variant="outlined"
                                value={wordInput}
                                onChange={(e) => setWordInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && wordInput.trim()) onSetWord(); }}
                                sx={{
                                    input: { 
                                        color: '#111318', 
                                        fontFamily: 'var(--font-display)', 
                                        fontWeight: 700,
                                        fontSize: '1.125rem'
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: '#F4F1EA',
                                        borderRadius: '4px',
                                        boxShadow: '3px 3px 0px #090A0D',
                                        '& fieldset': { borderColor: '#090A0D', borderWidth: '2px' },
                                        '&:hover fieldset': { borderColor: '#090A0D' },
                                        '&.Mui-focused fieldset': { borderColor: '#FFBE0B', borderWidth: '3px' }
                                    }
                                }}
                            />
                        </div>

                        <Button 
                            variant="contained" 
                            fullWidth 
                            size="large" 
                            onClick={onSetWord} 
                            className="swiss-btn-primary !py-3.5 !text-base"
                        >
                            📌 KARTI ALNINA YAPIŞTIR
                        </Button>
                    </div>
                )}

                {/* Player Readiness Status Bar */}
                <div className="mt-8 pt-5 border-t-2 border-[#2D3342] text-left">
                    <span className="swiss-label block mb-3">MASA HAZIRLIK DURUMU</span>
                    <div className="flex flex-wrap gap-2">
                        {gameState.users.map((u: User) => (
                            <span 
                                key={u.id} 
                                className={`font-mono text-xs font-bold uppercase px-3 py-1 rounded-[4px] border-2 ${
                                    u.hasSubmittedWord 
                                        ? 'bg-[#00E5A3]/15 border-[#00E5A3] text-[#00E5A3]' 
                                        : 'bg-[#111318] border-[#2D3342] text-[#687082]'
                                }`}
                            >
                                {u.hasSubmittedWord ? '✓ ' : '○ '}{u.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
            <Button 
                variant="outlined" 
                size="small" 
                onClick={onLeaveRoom} 
                className="swiss-btn-secondary !px-5 !py-2 !text-xs"
            >
                ODADAN AYRIL
            </Button>
        </main>
    );
}
