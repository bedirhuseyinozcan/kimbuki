import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { User } from './types';

export function useWebRTC(socket: Socket | null, myId: string, isVoiceEnabled: boolean, users: User[]) {
    const [myStream, setMyStream] = useState<MediaStream | null>(null);
    const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
    const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({});
    useEffect(() => {
        if (!isVoiceEnabled) {
            if (myStream) {
                myStream.getTracks().forEach(t => t.stop());
                setMyStream(null);
            }
            Object.values(peersRef.current).forEach(p => p.close());
            peersRef.current = {};
            setRemoteStreams({});
            return;
        }

        if (!myStream) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                setMyStream(stream);
            }).catch(err => {
                console.error("Microphone access denied", err);
                socket?.emit("game:toggle_voice", { enabled: false });
                alert("Mikrofon izni reddedildi!");
            });
        }
    }, [isVoiceEnabled]);

    useEffect(() => {
        if (!socket || !isVoiceEnabled || !myStream) return;

        const createPeer = (targetId: string, initiator: boolean) => {
            if (peersRef.current[targetId]) return peersRef.current[targetId];

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            myStream.getTracks().forEach(track => pc.addTrack(track, myStream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc:ice-candidate', { to: targetId, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    pc.close();
                    delete peersRef.current[targetId];
                    setRemoteStreams(prev => {
                        const copy = { ...prev };
                        delete copy[targetId];
                        return copy;
                    });
                }
            };

            if (initiator) {
                pc.createOffer().then(offer => {
                    pc.setLocalDescription(offer);
                    socket.emit('webrtc:offer', { to: targetId, offer });
                });
            }

            peersRef.current[targetId] = pc;
            return pc;
        };

        const handleOffer = async ({ from, offer }: any) => {
            const pc = createPeer(from, false);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:answer', { to: from, answer });
        };

        const handleAnswer = async ({ from, answer }: any) => {
            const pc = peersRef.current[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        const handleIceCandidate = async ({ from, candidate }: any) => {
            const pc = peersRef.current[from];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };

        socket.on('webrtc:offer', handleOffer);
        socket.on('webrtc:answer', handleAnswer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);

        users.forEach(u => {
            if (u.id !== myId && u.isVoiceEnabled && !peersRef.current[u.id]) {
                if (myId < u.id) {
                    createPeer(u.id, true);
                }
            }
        });

        return () => {
            socket.off('webrtc:offer', handleOffer);
            socket.off('webrtc:answer', handleAnswer);
            socket.off('webrtc:ice-candidate', handleIceCandidate);
        };
    }, [socket, isVoiceEnabled, myStream, users, myId]);

    return { remoteStreams };
}
