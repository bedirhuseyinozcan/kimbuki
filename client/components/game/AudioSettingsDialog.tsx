import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { toast } from 'react-toastify';

interface AudioSettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AudioSettingsDialog({ open, onClose }: AudioSettingsDialogProps) {
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    
    const [selectedInput, setSelectedInput] = useState<string>('');
    const [selectedOutput, setSelectedOutput] = useState<string>('');
    
    const [volume, setVolume] = useState<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const testAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (open) {
            navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
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
            });
        } else {
            stopTest();
        }
    }, [open]);

    useEffect(() => {
        if (open && selectedInput) {
            startTest(selectedInput);
        }
        return () => stopTest();
    }, [selectedInput, open]);

    const startTest = async (deviceId: string) => {
        stopTest();
        try {
            const constraints = { audio: { deviceId: { exact: deviceId }, echoCancellation: false, autoGainControl: false, noiseSuppression: false } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
                if (!analyserRef.current) return;
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
    };

    const stopTest = () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (testAudioRef.current) {
            testAudioRef.current.pause();
            testAudioRef.current.currentTime = 0;
        }
        setVolume(0);
    };

    const playTestSound = async () => {
        if (!testAudioRef.current) {
            testAudioRef.current = new Audio('/sounds/turn.mp3');
        }
        try {
            if ('setSinkId' in testAudioRef.current && selectedOutput) {
                await (testAudioRef.current as any).setSinkId(selectedOutput);
            }
            testAudioRef.current.currentTime = 0;
            testAudioRef.current.play();
        } catch (err) {
            console.error("Speaker test error", err);
            toast.error("Hoparlör test edilemedi. Tarayıcınız desteklemiyor olabilir.");
        }
    };

    const handleSave = () => {
        if (selectedInput) localStorage.setItem("preferredMic", selectedInput);
        if (selectedOutput) localStorage.setItem("preferredSpeaker", selectedOutput);
        window.location.reload(); 
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { className: "!bg-slate-900 !text-white !rounded-2xl" } }}>
            <DialogTitle className="text-center font-bold text-cyan-400 border-b border-slate-700/50 pb-4">Ses Ayarları</DialogTitle>
            <DialogContent className="flex flex-col gap-8 pt-6">
                
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm uppercase tracking-widest text-slate-400 font-bold">Giriş Cihazı (Mikrofon)</h3>
                    <FormControl fullWidth variant="outlined">
                        <Select
                            value={selectedInput}
                            onChange={(e) => setSelectedInput(e.target.value)}
                            className="!text-white !border-slate-600 bg-slate-800/50"
                            sx={{
                                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                                '.MuiSvgIcon-root ': { fill: "white !important" },
                            }}
                        >
                            {inputDevices.map((d, i) => (
                                <MenuItem key={i} value={d.deviceId}>{d.label || `Mikrofon ${i + 1}`}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <div className="flex flex-col gap-2 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-slate-400">Giriş Seviyesi Testi (Konuşarak deneyin)</p>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div 
                                className="h-full bg-green-500 transition-all duration-75"
                                style={{ width: `${Math.min(100, (volume / 128) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-700/50" />

                <div className="flex flex-col gap-4">
                    <h3 className="text-sm uppercase tracking-widest text-slate-400 font-bold">Çıkış Cihazı (Hoparlör)</h3>
                    <FormControl fullWidth variant="outlined">
                        <Select
                            value={selectedOutput}
                            onChange={(e) => setSelectedOutput(e.target.value)}
                            className="!text-white !border-slate-600 bg-slate-800/50"
                            sx={{
                                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                                '.MuiSvgIcon-root ': { fill: "white !important" },
                            }}
                        >
                            {outputDevices.map((d, i) => (
                                <MenuItem key={i} value={d.deviceId}>{d.label || `Hoparlör ${i + 1}`}</MenuItem>
                            ))}
                            {outputDevices.length === 0 && <MenuItem value="">Tarayıcınız çıkış cihazlarını listeleyemiyor</MenuItem>}
                        </Select>
                    </FormControl>
                    <Button 
                        variant="outlined" 
                        onClick={playTestSound}
                        className="!border-slate-600 !text-slate-300 hover:!bg-slate-800 self-start"
                    >
                        Hoparlörü Test Et
                    </Button>
                </div>

                <p className="text-xs text-center text-amber-500/80 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    Kaydettikten sonra değişikliklerin uygulanması için sayfa yenilenecektir.
                </p>
            </DialogContent>
            <DialogActions className="justify-center pb-6 pt-2 border-t border-slate-700/50 mt-2">
                <Button onClick={onClose} color="inherit" className="!text-slate-400 px-6">İptal</Button>
                <Button onClick={handleSave} variant="contained" className="!bg-cyan-500 !text-white !font-bold px-8">Kaydet & Yenile</Button>
            </DialogActions>
        </Dialog>
    );
}
