import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface AudioSettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AudioSettingsDialog({ open, onClose }: AudioSettingsDialogProps) {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [volume, setVolume] = useState<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (open) {
            navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
                const audioInputs = deviceInfos.filter(d => d.kind === 'audioinput');
                setDevices(audioInputs);
                const saved = localStorage.getItem("preferredMic");
                if (saved && audioInputs.find(d => d.deviceId === saved)) {
                    setSelectedDevice(saved);
                } else if (audioInputs.length > 0) {
                    setSelectedDevice(audioInputs[0].deviceId);
                }
            });
        } else {
            stopTest();
        }
    }, [open]);

    useEffect(() => {
        if (open && selectedDevice) {
            startTest(selectedDevice);
        }
        return () => stopTest();
    }, [selectedDevice, open]);

    const startTest = async (deviceId: string) => {
        stopTest();
        try {
            const constraints = { audio: { deviceId: { exact: deviceId } } };
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
        setVolume(0);
    };

    const handleSave = () => {
        if (selectedDevice) {
            localStorage.setItem("preferredMic", selectedDevice);
            window.location.reload(); 
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { className: "!bg-slate-900 !text-white !rounded-2xl" } }}>
            <DialogTitle className="text-center font-bold text-cyan-400">Mikrofon Ayarları</DialogTitle>
            <DialogContent className="flex flex-col gap-6 pt-4">
                <FormControl fullWidth variant="outlined" className="mt-2">
                    <InputLabel className="!text-slate-300">Mikrofon Seç</InputLabel>
                    <Select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        label="Mikrofon Seç"
                        className="!text-white !border-slate-600"
                        sx={{
                            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                            '.MuiSvgIcon-root ': { fill: "white !important" },
                        }}
                    >
                        {devices.map((d, i) => (
                            <MenuItem key={i} value={d.deviceId}>{d.label || `Mikrofon ${i + 1}`}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-400 text-center">Ses Testi (Konuşarak deneyin)</p>
                    <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div 
                            className="h-full bg-cyan-400 transition-all duration-75"
                            style={{ width: `${Math.min(100, (volume / 128) * 100)}%` }}
                        />
                    </div>
                </div>
                <p className="text-xs text-center text-slate-500 mt-2">Kaydettikten sonra değişikliklerin uygulanması için sayfa yenilenecektir.</p>
            </DialogContent>
            <DialogActions className="justify-center pb-4">
                <Button onClick={onClose} color="inherit" className="!text-slate-400">İptal</Button>
                <Button onClick={handleSave} variant="contained" className="!bg-cyan-500 !text-white !font-bold">Kaydet & Yenile</Button>
            </DialogActions>
        </Dialog>
    );
}
