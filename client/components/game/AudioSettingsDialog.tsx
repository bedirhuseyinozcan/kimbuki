import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl } from '@mui/material';
import { toast } from 'react-toastify';

interface AudioSettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

const DARK_MENU_PROPS = {
    slotProps: {
        paper: {
            sx: {
                bgcolor: '#1A1D24',
                color: '#F6F5F2',
                border: '2px solid #3E4659',
                boxShadow: '5px 5px 0px #090A0D',
                borderRadius: '4px',
                '& .MuiMenuItem-root': {
                    fontSize: '0.875rem',
                    '&:hover': { bgcolor: '#222630' },
                    '&.Mui-selected': { bgcolor: '#FFBE0B', color: '#111318', fontWeight: 700 },
                    '&.Mui-selected:hover': { bgcolor: '#FFD043' },
                },
            },
        },
    },
};

export default function AudioSettingsDialog({ open, onClose }: AudioSettingsDialogProps) {
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    
    const [selectedInput, setSelectedInput] = useState<string>('');
    const [selectedOutput, setSelectedOutput] = useState<string>('');
    const [invertCamera, setInvertCamera] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('kimbuki_invert_camera') === '1';
    });
    const [permissionError, setPermissionError] = useState<string | null>(null);
    
    const [volume, setVolume] = useState<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const testRunIdRef = useRef<number>(0);

    const stopTest = useCallback(() => {
        testRunIdRef.current += 1;
        if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        analyserRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {});
            }
            audioContextRef.current = null;
        }
        setVolume(0);
    }, []);

    const startTest = useCallback(async (deviceId: string) => {
        stopTest();
        const runId = testRunIdRef.current;

        try {
            const constraints: MediaStreamConstraints = {
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true,
                },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // If dialog closed or another test started while awaiting permission, release immediately
            if (runId !== testRunIdRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            streamRef.current = stream;

            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
                if (runId !== testRunIdRef.current || !analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setVolume(avg);
                animationRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        } catch (err) {
            console.error("Test stream error", err);
        }
    }, [stopTest]);

    useEffect(() => {
        if (!open) {
            queueMicrotask(() => stopTest());
            return;
        }

        let cancelled = false;
        queueMicrotask(() => setPermissionError(null));

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(t => t.stop());
                if (cancelled) return null;
                return navigator.mediaDevices.enumerateDevices();
            })
            .then(deviceInfos => {
                if (cancelled || !deviceInfos) return;
                const audioInputs = deviceInfos.filter(d => d.kind === 'audioinput');
                const audioOutputs = deviceInfos.filter(d => d.kind === 'audiooutput');
                
                setInputDevices(audioInputs);
                setOutputDevices(audioOutputs);
                
                const savedMic = localStorage.getItem("preferredMic");
                if (savedMic && audioInputs.find(d => d.deviceId === savedMic)) {
                    setSelectedInput(savedMic);
                } else if (audioInputs.length > 0) {
                    setSelectedInput(audioInputs[0].deviceId);
                }

                const savedSpeaker = localStorage.getItem("preferredSpeaker");
                if (savedSpeaker && audioOutputs.find(d => d.deviceId === savedSpeaker)) {
                    setSelectedOutput(savedSpeaker);
                } else if (audioOutputs.length > 0) {
                    setSelectedOutput(audioOutputs[0].deviceId);
                }
            })
            .catch(err => {
                console.error("Audio permission error in settings:", err);
                if (!cancelled) {
                    setPermissionError("Mikrofon izni reddedildi veya cihaz bulunamadı. Tarayıcı izinlerini kontrol edin.");
                }
            });

        return () => {
            cancelled = true;
            stopTest();
        };
    }, [open, stopTest]);

    useEffect(() => {
        if (open && selectedInput) {
            queueMicrotask(() => {
                startTest(selectedInput);
            });
        }
        return () => stopTest();
    }, [selectedInput, open, startTest, stopTest]);

    const playTestSound = async () => {
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) {
                toast.error("Tarayıcınız Web Audio API desteklemiyor.");
                return;
            }
            const ctx = new AudioCtx();
            const ctxWithSink = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
            if (selectedOutput && typeof ctxWithSink.setSinkId === 'function') {
                await ctxWithSink.setSinkId(selectedOutput).catch(() => {});
            }
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
                gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + i * 0.12 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.12);
                osc.stop(ctx.currentTime + i * 0.12 + 0.28);
            });

            setTimeout(() => {
                if (ctx.state !== 'closed') ctx.close().catch(() => {});
            }, 900);
        } catch (err) {
            console.error("Speaker test error", err);
            toast.error("Hoparlör test edilemedi. Tarayıcınız desteklemiyor olabilir.");
        }
    };

    const handleSave = () => {
        if (selectedInput) localStorage.setItem("preferredMic", selectedInput);
        if (selectedOutput) localStorage.setItem("preferredSpeaker", selectedOutput);
        localStorage.setItem("kimbuki_invert_camera", invertCamera ? "1" : "0");
        stopTest();
        window.dispatchEvent(
            new CustomEvent("kimbuki:audio-device-changed", {
                detail: { inputId: selectedInput, outputId: selectedOutput },
            })
        );
        window.dispatchEvent(
            new CustomEvent("kimbuki:camera-settings-changed", {
                detail: { invertCamera },
            })
        );
        toast.success("Ses ve kamera ayarları canlı olarak güncellendi!");
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="sm" 
            slotProps={{ 
                paper: { 
                    className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D]" 
                } 
            }}
        >
            <DialogTitle className="font-display font-bold uppercase tracking-wider text-lg text-[#F6F5F2] border-b-2 border-[#2D3342] py-4 px-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#FFBE0B] inline-block" />
                SES & DONANIM AYARLARI
            </DialogTitle>
            <DialogContent className="flex flex-col gap-6 pt-6 px-6">
                {permissionError && (
                    <div className="text-xs font-mono text-[#FF334B] bg-[#FF334B]/10 p-3 rounded-[4px] border-l-4 border-[#FF334B] mt-2">
                        {permissionError}
                    </div>
                )}
                
                <div className="flex flex-col gap-3 mt-2">
                    <span className="swiss-label">GİRİŞ CİHAZI (MİKROFON)</span>
                    <FormControl fullWidth variant="outlined" size="small">
                        <Select
                            value={selectedInput}
                            onChange={(e) => setSelectedInput(e.target.value)}
                            MenuProps={DARK_MENU_PROPS}
                            className="!text-[#F6F5F2] !bg-[#111318] !rounded-[4px]"
                            sx={{
                                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3E4659' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFBE0B' },
                                '.MuiSvgIcon-root ': { fill: "#F6F5F2 !important" },
                            }}
                        >
                            {inputDevices.map((d, i) => (
                                <MenuItem key={d.deviceId || i} value={d.deviceId}>{d.label || `Mikrofon ${i + 1}`}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <div className="flex flex-col gap-2 bg-[#111318] p-3.5 rounded-[4px] border-2 border-[#2D3342]">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-[#A0A8B8]">SİNYAL SEVİYESİ TESTİ</span>
                            <span className="font-mono text-[11px] font-bold text-[#00E5A3] tnum">{Math.round(Math.min(100, (volume / 128) * 100))}%</span>
                        </div>
                        <div className="w-full h-3 bg-[#1A1D24] rounded-[2px] overflow-hidden border border-[#2D3342]">
                            <div 
                                className="h-full bg-[#00E5A3] transition-all duration-75"
                                style={{ width: `${Math.min(100, (volume / 128) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full h-[2px] bg-[#2D3342]" />

                <div className="flex flex-col gap-3">
                    <span className="swiss-label">ÇIKIŞ CİHAZI (HOPARLÖR)</span>
                    <FormControl fullWidth variant="outlined" size="small">
                        <Select
                            value={selectedOutput}
                            onChange={(e) => setSelectedOutput(e.target.value)}
                            MenuProps={DARK_MENU_PROPS}
                            className="!text-[#F6F5F2] !bg-[#111318] !rounded-[4px]"
                            sx={{
                                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3E4659' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFBE0B' },
                                '.MuiSvgIcon-root ': { fill: "#F6F5F2 !important" },
                            }}
                        >
                            {outputDevices.map((d, i) => (
                                <MenuItem key={d.deviceId || i} value={d.deviceId}>{d.label || `Hoparlör ${i + 1}`}</MenuItem>
                            ))}
                            {outputDevices.length === 0 && <MenuItem value="">Tarayıcınız çıkış cihazlarını listeleyemiyor</MenuItem>}
                        </Select>
                    </FormControl>
                    <Button 
                        variant="outlined" 
                        onClick={playTestSound}
                        className="swiss-btn-secondary self-start !px-4 !py-1.5 !text-xs"
                    >
                        🔊 HOPARLÖRÜ TEST ET
                    </Button>
                </div>

                <div className="w-full h-[2px] bg-[#2D3342]" />

                <div className="flex flex-col gap-3">
                    <span className="swiss-label">3D KAMERA & FARE YÖNÜ</span>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setInvertCamera(false)}
                            className={`p-3 rounded-[4px] border-2 font-mono text-xs font-bold uppercase tracking-wider text-left transition-colors cursor-pointer ${
                                !invertCamera
                                    ? 'bg-[#FFBE0B] text-[#111318] border-[#090A0D] shadow-[3px_3px_0px_#090A0D]'
                                    : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342] hover:border-[#3E4659]'
                            }`}
                        >
                            <div>NORMAL (VARSAYILAN)</div>
                            <div className={`text-[10px] mt-1 font-normal normal-case ${!invertCamera ? 'text-[#111318]/80' : 'text-[#8B94A7]'}`}>
                                Standart kafa çevirme yönü
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setInvertCamera(true)}
                            className={`p-3 rounded-[4px] border-2 font-mono text-xs font-bold uppercase tracking-wider text-left transition-colors cursor-pointer ${
                                invertCamera
                                    ? 'bg-[#00E5A3] text-[#111318] border-[#090A0D] shadow-[3px_3px_0px_#090A0D]'
                                    : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342] hover:border-[#3E4659]'
                            }`}
                        >
                            <div>TERS FARE (INVERT)</div>
                            <div className={`text-[10px] mt-1 font-normal normal-case ${invertCamera ? 'text-[#111318]/80' : 'text-[#8B94A7]'}`}>
                                Sağa çevirince ters yöne döner
                            </div>
                        </button>
                    </div>
                </div>

                <div className="text-xs font-mono text-[#00E5A3] bg-[#00E5A3]/10 p-3 rounded-[4px] border-l-4 border-[#00E5A3]">
                    BİLGİ: Değişiklikler sayfa yenilenmeden ve oyundan kopmadan anında uygulanır.
                </div>
            </DialogContent>
            <DialogActions className="justify-between px-6 py-4 border-t-2 border-[#2D3342] bg-[#111318]">
                <Button onClick={onClose} className="swiss-btn-secondary !px-5 !py-2">İPTAL</Button>
                <Button onClick={handleSave} className="swiss-btn-primary !px-6 !py-2">KAYDET & UYGULA</Button>
            </DialogActions>
        </Dialog>
    );
}
