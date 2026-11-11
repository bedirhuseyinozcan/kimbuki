import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl } from '@mui/material';
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
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                stream.getTracks().forEach(t => t.stop()); // İzni aldık, akışı kapatabiliriz
                return navigator.mediaDevices.enumerateDevices();
            }).then(deviceInfos => {
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
            }).catch(err => {
                console.error("Audio permission error in settings:", err);
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
            const constraints = { audio: { deviceId: { exact: deviceId }, echoCancellation: true, autoGainControl: true, noiseSuppression: true } };
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
                
                <div className="flex flex-col gap-3 mt-2">
                    <span className="swiss-label">GİRİŞ CİHAZI (MİKROFON)</span>
                    <FormControl fullWidth variant="outlined" size="small">
                        <Select
                            value={selectedInput}
                            onChange={(e) => setSelectedInput(e.target.value)}
                            className="!text-[#F6F5F2] !bg-[#111318] !rounded-[4px]"
                            sx={{
                                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3E4659' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFBE0B' },
                                '.MuiSvgIcon-root ': { fill: "#F6F5F2 !important" },
                            }}
                        >
                            {inputDevices.map((d, i) => (
                                <MenuItem key={i} value={d.deviceId}>{d.label || `Mikrofon ${i + 1}`}</MenuItem>
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
                            className="!text-[#F6F5F2] !bg-[#111318] !rounded-[4px]"
                            sx={{
                                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2D3342', borderWidth: '2px' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3E4659' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFBE0B' },
                                '.MuiSvgIcon-root ': { fill: "#F6F5F2 !important" },
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
                        className="swiss-btn-secondary self-start !px-4 !py-1.5 !text-xs"
                    >
                        🔊 HOPARLÖRÜ TEST ET
                    </Button>
                </div>

                <div className="text-xs font-mono text-[#FFBE0B] bg-[#FFBE0B]/10 p-3 rounded-[4px] border-l-4 border-[#FFBE0B]">
                    NOT: Kaydettikten sonra ses kanallarının güncellenmesi için sayfa yenilenecektir.
                </div>
            </DialogContent>
            <DialogActions className="justify-between px-6 py-4 border-t-2 border-[#2D3342] bg-[#111318]">
                <Button onClick={onClose} className="swiss-btn-secondary !px-5 !py-2">İPTAL</Button>
                <Button onClick={handleSave} className="swiss-btn-primary !px-6 !py-2">KAYDET & YENİLE</Button>
            </DialogActions>
        </Dialog>
    );
}
