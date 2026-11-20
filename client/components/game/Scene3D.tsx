import React, { useRef, Suspense, useMemo, useEffect, Component, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, ContactShadows, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { User, GameState, AVATARS, getRankInfo, NAME_COLORS, TITLES } from './types';
import * as THREE from 'three';
import { motion, AnimatePresence } from "framer-motion";

const PLAYER_CENTER = [2, 0, -1];
const MAP_CONFIGS: { [key: string]: { position: [number, number, number], scale: number } } = {
    "floating_island__low_poly_vr.glb": { position: [0, -1.70, 0], scale: 0.5 },
    "snow.glb": { position: [2, -0.1, -1], scale: 1.5 },
    "desert.glb": { position: [4.0, 4.5, -1], scale: 7.5 }
};
const PLAYER_CIRCLE_RADIUS_SMALL = 3.5;
const PLAYER_CIRCLE_RADIUS_LARGE = 4.5;

type HeadRotationMap = { [key: string]: { pitch: number; yaw: number } };

class WebGLErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error("[Scene3D] WebGL render error:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#111318] text-[#F6F5F2] p-6 text-center">
                    <div className="swiss-panel p-6 max-w-sm">
                        <p className="font-display text-lg font-bold uppercase text-[#FFBE0B] mb-2">
                            3D SAHNE YÜKLENEMEDİ
                        </p>
                        <p className="font-mono text-xs text-[#A0A8B8]">
                            WebGL bağlamı başlatılamadı. Oyun sohbet ve aksiyon paneliyle devam edebilir.
                        </p>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function FirstPersonCamera({ myId, users, radius, onHeadRotation }: {
    myId: string;
    users: User[];
    radius: number;
    onHeadRotation?: (pitch: number, yaw: number) => void;
}) {
    const { camera, gl } = useThree();
    const lastEmitTime = useRef(0);
    const lastEmittedRot = useRef({ pitch: 0, yaw: 0 });
    const isDragging = useRef(false);
    const currentLook = useRef({ yaw: 0, pitch: 0 });
    const lastTargetLook = useRef({ yaw: 0, pitch: 0 });
    const lastPos = useRef({ x: 0, y: 0 });
    const tempTargetPos = useRef(new THREE.Vector3());

    useEffect(() => {
        const handleDown = (e: PointerEvent) => {
            if (e.isPrimary) {
                isDragging.current = true;
                lastPos.current = { x: e.clientX, y: e.clientY };
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }
        };
        const handleUp = (e: PointerEvent) => {
            if (e.isPrimary) {
                isDragging.current = false;
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
            }
        };
        const handleMove = (e: PointerEvent) => {
            if (isDragging.current && e.isPrimary) {
                const maxYaw = Math.PI / 2.5;
                const maxPitch = Math.PI / 4;

                const deltaX = e.clientX - lastPos.current.x;
                const deltaY = e.clientY - lastPos.current.y;
                lastPos.current = { x: e.clientX, y: e.clientY };

                const deltaYaw = -(deltaX / window.innerWidth) * Math.PI * 1.5;
                const deltaPitch = -(deltaY / window.innerHeight) * Math.PI * 1.5;

                lastTargetLook.current.yaw = Math.max(-maxYaw, Math.min(maxYaw, lastTargetLook.current.yaw + deltaYaw));
                lastTargetLook.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, lastTargetLook.current.pitch + deltaPitch));
            }
        };

        const target = gl.domElement;
        target.addEventListener('pointerdown', handleDown as EventListener);
        target.addEventListener('pointerup', handleUp as EventListener);
        target.addEventListener('pointercancel', handleUp as EventListener);
        target.addEventListener('pointermove', handleMove as EventListener);
        return () => {
            target.removeEventListener('pointerdown', handleDown as EventListener);
            target.removeEventListener('pointerup', handleUp as EventListener);
            target.removeEventListener('pointercancel', handleUp as EventListener);
            target.removeEventListener('pointermove', handleMove as EventListener);
        };
    }, [gl.domElement]);

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        const myIndex = users.findIndex((u) => u.id === myId);
        if (myIndex === -1) {
            tempTargetPos.current.set(PLAYER_CENTER[0], 5, PLAYER_CENTER[2] + 8);
            camera.position.lerp(tempTargetPos.current, 2 * delta);
            camera.lookAt(PLAYER_CENTER[0], 0, PLAYER_CENTER[2]);
            return;
        }

        const angleOffset = users.length === 3 ? (Math.PI / 2) : -(Math.PI / 2);
        const angle = (myIndex / users.length) * (2 * Math.PI) + angleOffset;

        const headX = PLAYER_CENTER[0] + Math.cos(angle) * radius;
        const headZ = PLAYER_CENTER[2] + Math.sin(angle) * radius;
        const headY = PLAYER_CENTER[1] + 1.2;

        tempTargetPos.current.set(headX, headY, headZ);
        camera.position.lerp(tempTargetPos.current, 5 * delta);

        const targetX = PLAYER_CENTER[0];
        const targetY = PLAYER_CENTER[1] + 0.8;
        const targetZ = PLAYER_CENTER[2];

        camera.lookAt(targetX, targetY, targetZ);

        currentLook.current.yaw = THREE.MathUtils.lerp(currentLook.current.yaw, lastTargetLook.current.yaw, 10 * delta);
        currentLook.current.pitch = THREE.MathUtils.lerp(currentLook.current.pitch, lastTargetLook.current.pitch, 10 * delta);

        camera.rotateY(currentLook.current.yaw);
        camera.rotateX(currentLook.current.pitch);

        const pitch = currentLook.current.pitch;
        const yaw = currentLook.current.yaw;

        const now = Date.now();
        if (now - lastEmitTime.current > 100) {
            const pitchDeg = Math.round(pitch * 180 / Math.PI);
            const yawDeg = Math.round(yaw * 180 / Math.PI);
            if (lastEmittedRot.current.pitch !== pitchDeg || lastEmittedRot.current.yaw !== yawDeg) {
                lastEmittedRot.current = { pitch: pitchDeg, yaw: yawDeg };
                lastEmitTime.current = now;
                if (onHeadRotation) onHeadRotation(pitch, yaw);
            }
        }
    });

    return null;
}

function AvatarModel({ url, userId, headRotationsRef }: {
    url: string;
    userId: string;
    headRotationsRef?: React.MutableRefObject<HeadRotationMap>;
}) {
    const { scene } = useGLTF(`/avatars/${url}`);
    const groupRef = useRef<THREE.Group>(null);
    const headBone = useRef<THREE.Object3D | null>(null);

    const clonedScene = useMemo(() => {
        const clone = SkeletonUtils.clone(scene);
        clone.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
                child.frustumCulled = false;
            }
        });
        return clone;
    }, [scene]);

    useEffect(() => {
        if (!groupRef.current) return;
        headBone.current = null;
        groupRef.current.traverse((child) => {
            if ((child as THREE.Bone).isBone) {
                const name = child.name.toLowerCase();
                if ((name.includes('head') || name.includes('neck')) && !headBone.current) {
                    headBone.current = child;
                }
            }
        });
    }, [clonedScene]);

    useEffect(() => {
        return () => {
            clonedScene.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (mesh.isMesh) {
                    if (mesh.geometry && mesh.geometry !== (scene as unknown as THREE.Mesh).geometry) {
                        mesh.geometry.dispose?.();
                    }
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m) => m.dispose?.());
                    } else if (mesh.material) {
                        mesh.material.dispose?.();
                    }
                }
            });
        };
    }, [clonedScene, scene]);

    useFrame((_, rawDelta) => {
        const targetRot = headRotationsRef?.current?.[userId];
        if (!targetRot) return;
        const delta = Math.min(rawDelta, 0.05);
        if (headBone.current) {
            const bone = headBone.current;
            if (!bone.userData.initialRotation) {
                bone.userData.initialRotation = bone.rotation.clone();
            }
            const initRot = bone.userData.initialRotation as THREE.Euler;
            bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initRot.y + targetRot.yaw, 5 * delta);
            bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initRot.x - targetRot.pitch, 5 * delta);
        } else if (groupRef.current) {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.yaw, 5 * delta);
        }
    });

    return (
        <group ref={groupRef} position={[0, 0.5, 0]} scale={0.6}>
            <primitive object={clonedScene} castShadow receiveShadow />
        </group>
    );
}

const sharedParticleSphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
const sharedRingTorusGeo = new THREE.TorusGeometry(1, 0.1, 16, 32);
const sharedMirrorSphereGeo = new THREE.SphereGeometry(1.5, 24, 24);
const sharedFallbackCylinderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
const sharedFallbackBoxGeo = new THREE.BoxGeometry(0.5, 1, 0.5);

const sharedGoldPedestalGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.5, 24);
const sharedLavaPedestalCylinderGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.4, 16);
const sharedLavaPedestalTorusGeo = new THREE.TorusGeometry(0.65, 0.12, 12, 24);
const sharedIcePedestalBoxGeo = new THREE.BoxGeometry(1.5, 0.5, 1.5);
const sharedCloudPedestalSphere1 = new THREE.SphereGeometry(0.6, 12, 12);
const sharedCloudPedestalSphere2 = new THREE.SphereGeometry(0.5, 12, 12);
const sharedCloudPedestalSphere3 = new THREE.SphereGeometry(0.45, 12, 12);
const sharedDefaultPedestalGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.5, 8);
const sharedTurnRingGeo = new THREE.TorusGeometry(1.05, 0.055, 10, 36);

const PedestalNode = React.memo(function PedestalNode({ type }: { type: string }) {
    switch (type) {
        case 'gold_pedestal':
            return (
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow geometry={sharedGoldPedestalGeo}>
                    <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.8} />
                </mesh>
            );
        case 'lava_ring':
            return (
                <group position={[0, 0.25, 0]}>
                    <mesh castShadow receiveShadow geometry={sharedLavaPedestalCylinderGeo}>
                        <meshStandardMaterial color="#1c1917" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedLavaPedestalTorusGeo}>
                        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} toneMapped={false} />
                    </mesh>
                </group>
            );
        case 'ice_block':
            return (
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow geometry={sharedIcePedestalBoxGeo}>
                    <meshStandardMaterial color="#bae6fd" transparent opacity={0.65} roughness={0.15} metalness={0.1} />
                </mesh>
            );
        case 'cloud_base':
            return (
                <group position={[0, 0.25, 0]}>
                    <mesh position={[0, 0, 0]} castShadow receiveShadow geometry={sharedCloudPedestalSphere1}><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                    <mesh position={[0.4, -0.1, 0.3]} castShadow receiveShadow geometry={sharedCloudPedestalSphere2}><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                    <mesh position={[-0.4, -0.1, 0.3]} castShadow receiveShadow geometry={sharedCloudPedestalSphere2}><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                    <mesh position={[0.2, -0.1, -0.4]} castShadow receiveShadow geometry={sharedCloudPedestalSphere3}><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                </group>
            );
        default:
            return (
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow geometry={sharedDefaultPedestalGeo}>
                    <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.1} />
                </mesh>
            );
    }
});

function ParticleBurst({ color }: { color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame((_, rawDelta) => {
        if (!materialRef.current || materialRef.current.opacity <= 0) return;
        const delta = Math.min(rawDelta, 0.05);
        if (meshRef.current) {
            meshRef.current.scale.addScalar(delta * 20);
        }
        materialRef.current.opacity = Math.max(0, materialRef.current.opacity - delta * 2);
        if (materialRef.current.opacity <= 0 && meshRef.current) {
            meshRef.current.visible = false;
        }
    });

    useEffect(() => {
        return () => {
            materialRef.current?.dispose();
        };
    }, []);

    return (
        <mesh ref={meshRef} position={[0, 1.5, 0]} geometry={sharedParticleSphereGeo}>
            <meshStandardMaterial
                ref={materialRef}
                color={color}
                transparent
                opacity={0.8}
                emissive={color}
                emissiveIntensity={2}
            />
        </mesh>
    );
}

function RingBurst({ color }: { color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame((_, rawDelta) => {
        if (!materialRef.current || materialRef.current.opacity <= 0) return;
        const delta = Math.min(rawDelta, 0.05);
        if (meshRef.current) {
            meshRef.current.scale.addScalar(delta * 10);
        }
        materialRef.current.opacity = Math.max(0, materialRef.current.opacity - delta * 1.5);
        if (materialRef.current.opacity <= 0 && meshRef.current) {
            meshRef.current.visible = false;
        }
    });

    useEffect(() => {
        return () => {
            materialRef.current?.dispose();
        };
    }, []);

    return (
        <mesh ref={meshRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={sharedRingTorusGeo}>
            <meshStandardMaterial
                ref={materialRef}
                color={color}
                transparent
                opacity={1}
                emissive={color}
                emissiveIntensity={2}
            />
        </mesh>
    );
}

interface PlayerNodeProps {
    u: User;
    index: number;
    totalUsers: number;
    isCurrentTurn: boolean;
    isMe: boolean;
    isWinner: boolean;
    activeBubble?: string;
    headRotationsRef?: React.MutableRefObject<HeadRotationMap>;
    taunt?: { type: string; id: number };
    visualEffects?: Array<{ id: number; type: string; targetId?: string; userId?: string }>;
}

const PlayerNode = React.memo(function PlayerNode({
    u, index, totalUsers, isCurrentTurn, isMe, isWinner, activeBubble, headRotationsRef, taunt, visualEffects
}: PlayerNodeProps) {
    const radius = totalUsers > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL;
    const angleOffset = totalUsers === 3 ? (Math.PI / 2) : -(Math.PI / 2);
    const angle = (index / totalUsers) * (2 * Math.PI) + angleOffset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
    const rankInfo = useMemo(() => getRankInfo(u.reputation || 0), [u.reputation]);

    const bomb = u.timeBomb;
    const hasMirror = isMe && (u.mirrorRoundsLeft && u.mirrorRoundsLeft > 0);

    const myEffects = useMemo(() => {
        return visualEffects?.filter((e) => e.targetId === u.id || e.userId === u.id) || [];
    }, [visualEffects, u.id]);

    return (
        <group position={[x, 0, z]} rotation={[0, -angle - Math.PI / 2, 0]}>
            <PedestalNode type={u.pedestal || 'default_stone'} />

            {isCurrentTurn && !isWinner && (
                <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedTurnRingGeo}>
                    <meshStandardMaterial color="#FFBE0B" emissive="#FFBE0B" emissiveIntensity={1.6} toneMapped={false} />
                </mesh>
            )}

            {myEffects.map((eff) => {
                if (eff.type === 'bomb_explode') return <ParticleBurst key={eff.id} color="#ef4444" />;
                if (eff.type === 'roulette_die') return <ParticleBurst key={eff.id} color="#000000" />;
                if (eff.type === 'mind_wipe') return <ParticleBurst key={eff.id} color="#a855f7" />;
                if (eff.type === 'mirror_cast' || eff.type === 'shield_cast') return <ParticleBurst key={eff.id} color="#06b6d4" />;
                if (eff.type === 'time_bend') return <RingBurst key={eff.id} color="#eab308" />;
                if (eff.type === 'roulette_start') return <RingBurst key={eff.id} color="#dc2626" />;
                if (eff.type === 'blood_tie') return <RingBurst key={eff.id} color="#ef4444" />;
                if (eff.type === 'silence_cast') return <RingBurst key={eff.id} color="#71717a" />;
                if (eff.type === 'extra_ammo') return <ParticleBurst key={eff.id} color="#eab308" />;
                if (eff.type === 'letter_reveal') return <RingBurst key={eff.id} color="#22c55e" />;
                return null;
            })}

            {hasMirror && (
                <mesh position={[0, 1.2, 0]} geometry={sharedMirrorSphereGeo}>
                    <meshStandardMaterial color="#38bdf8" transparent opacity={0.28} roughness={0.15} metalness={0.3} depthWrite={false} />
                </mesh>
            )}

            {!isMe && (
                <group>
                    {userAvatar.model || u.avatar.includes('default') ? (
                        <Suspense fallback={
                            <mesh position={[0, 1, 0]} geometry={sharedFallbackBoxGeo}><meshStandardMaterial color="gray" /></mesh>
                        }>
                            <AvatarModel url={userAvatar.model || "Warrior.gltf"} userId={u.id} headRotationsRef={headRotationsRef} />
                        </Suspense>
                    ) : (
                        <mesh position={[0, 1, 0]} castShadow receiveShadow geometry={sharedFallbackCylinderGeo}>
                            <meshStandardMaterial color="gray" />
                        </mesh>
                    )}
                </group>
            )}

            {bomb && (
                <Html position={[0, 2.90, 0]} center zIndexRange={[95, 0]} style={{ pointerEvents: 'none' }}>
                    <div className="flex flex-col items-center animate-bounce">
                        <span className="text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">💣</span>
                        <span className="text-[10px] font-mono font-bold text-white bg-[#FF334B] px-2 py-0.5 rounded-[2px] mt-1 border-2 border-[#090A0D] shadow-[2px_2px_0px_#090A0D] tnum">
                            {bomb.roundsLeft} TUR
                        </span>
                    </div>
                </Html>
            )}

            {taunt && (
                <Html position={[0, 3.5, 0]} center zIndexRange={[95, 0]} style={{ pointerEvents: 'none' }}>
                    <AnimatePresence>
                        <motion.div
                            key={taunt.id}
                            initial={{ opacity: 1, y: 0, scale: 0.5 }}
                            animate={{ opacity: 0, y: -80, scale: 2 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="text-5xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] whitespace-nowrap"
                        >
                            {taunt.type === 'fire' && '🔥🔥🔥'}
                            {taunt.type === 'party' && '🎉✨🎉'}
                            {taunt.type === 'laugh' && '😂😂😂'}
                            {taunt.type === 'cry' && '😭😭💦'}
                        </motion.div>
                    </AnimatePresence>
                </Html>
            )}

            {!isMe && (
                <Html position={[0, 2.25, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                    <div className='flex flex-col items-center select-none'>
                        {activeBubble && (
                            <div className='absolute -top-14 bg-[#F4F1EA] text-[#111318] px-3 py-1.5 rounded-[4px] border-2 border-[#090A0D] shadow-[3px_3px_0px_#090A0D] text-xs font-bold z-50 text-center whitespace-normal break-words' style={{ minWidth: 'max-content', maxWidth: '150px' }}>
                                {activeBubble}
                            </div>
                        )}
                        {!isWinner && (
                            <div className="mb-1.5 px-3 py-1 rounded-[3px] border-2 border-[#090A0D] shadow-[3px_3px_0px_#090A0D] font-display font-bold uppercase tracking-wide text-center text-xs max-w-[120px] break-words z-20 bg-[#FFBE0B] text-[#111318] transform -rotate-2">
                                {u.assignedWord}
                            </div>
                        )}
                        <span className={`mt-0.5 font-display font-bold text-[11px] bg-[#111318] border-2 ${isCurrentTurn && !isWinner ? 'border-[#FFBE0B] shadow-[0_0_12px_rgba(255,190,11,0.5)]' : 'border-[#090A0D] shadow-[2px_2px_0px_#090A0D]'} px-2.5 py-0.5 rounded-[3px] whitespace-nowrap flex items-center gap-1.5 ${u.status === 'spectator' ? 'line-through text-[#687082]' : (u.nameColor ? (NAME_COLORS.find(c => c.id === u.nameColor)?.className || 'text-[#F6F5F2]') : 'text-[#F6F5F2]')} ${u.disconnected ? 'text-[#FF334B]' : ''}`}>
                            <span className={`flex items-center gap-1 ${rankInfo.color}`}>
                                <span className="text-[13px]">{rankInfo.icon}</span>
                                <span className="text-[9px] font-mono uppercase tracking-wider font-bold">{rankInfo.title}</span>
                            </span>
                            {u.title && (
                                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#222630] text-[#F6F5F2] border border-[#3E4659]">
                                    {TITLES.find(t => t.id === u.title)?.label || u.title}
                                </span>
                            )}
                            <span className="text-[#3E4659] mx-0.5">|</span>
                            {u.name} {u.disconnected && '(KOPTU)'}
                        </span>
                        {u.status !== 'spectator' && !isWinner && (
                            <div className='flex gap-1 mt-1 bg-[#111318] border border-[#2D3342] px-2 py-0.5 rounded-[3px] shadow-[2px_2px_0px_#090A0D]'>
                                {[...Array(3)].map((_, i) => (
                                    <span key={i} className='text-[9px]'>{i < (u.lives ?? 3) ? '❤️' : '🖤'}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </Html>
            )}
        </group>
    );
});

const MapModel = React.memo(function MapModel({ url }: { url: string }) {
    const { scene } = useGLTF(`/maps/${url}`);
    const config = MAP_CONFIGS[url] || { position: [0, 0, 0], scale: 1 };

    return (
        <group position={config.position} scale={config.scale}>
            <primitive object={scene} castShadow receiveShadow />
        </group>
    );
});

interface Scene3DProps {
    gameState: GameState;
    myId: string;
    activeBubbles: { [key: string]: { text: string; id: string } };
    headRotationsRef?: React.MutableRefObject<HeadRotationMap>;
    onHeadRotation?: (pitch: number, yaw: number) => void;
    taunts?: { [key: string]: { type: string; id: number } };
    visualEffects?: Array<{ id: number; type: string; targetId?: string; userId?: string }>;
}

const Scene3D = React.memo(function Scene3D({
    gameState, myId, activeBubbles, headRotationsRef, onHeadRotation, taunts, visualEffects
}: Scene3DProps) {
    const isDay = gameState?.theme !== "night";

    return (
        <div className='absolute inset-0 w-full h-full z-0 pointer-events-auto touch-none'>
            <WebGLErrorBoundary>
                <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 4.5, 8], fov: 45 }}>
                    <color attach='background' args={[isDay ? '#38bdf8' : '#0f172a']} />
                    <fog attach='fog' args={[isDay ? '#38bdf8' : '#0f172a', isDay ? 15 : 8, isDay ? 40 : 30]} />
                    <ambientLight intensity={isDay ? 0.9 : 0.4} />
                    <directionalLight castShadow position={[10, 15, 5]} intensity={isDay ? 2.2 : 1.2} color={isDay ? "#ffedd5" : "#e0f2fe"} shadow-mapSize={[1024, 1024]} />
                    <pointLight position={[0, 4, 0]} intensity={isDay ? 0.5 : 1.5} color={isDay ? '#eab308' : '#38bdf8'} distance={10} />

                    <Suspense fallback={
                        <mesh position={[0, -0.1, 0]} receiveShadow>
                            <cylinderGeometry args={[2.8, 3.2, 0.2, 32]} />
                            <meshStandardMaterial color='#334155' roughness={0.7} />
                        </mesh>
                    }>
                        <MapModel url={gameState?.map || "floating_island__low_poly_vr.glb"} />
                    </Suspense>

                    <group position={PLAYER_CENTER as [number, number, number]}>
                        {gameState.users.map((u, i) => (
                            <PlayerNode
                                key={u.id}
                                u={u}
                                index={i}
                                totalUsers={gameState.users.length}
                                isCurrentTurn={u.id === gameState.currentTurnUserId}
                                isMe={u.id === myId}
                                isWinner={gameState.winners.includes(u.id)}
                                activeBubble={activeBubbles[u.id]?.text}
                                headRotationsRef={headRotationsRef}
                                taunt={taunts?.[u.id]}
                                visualEffects={visualEffects}
                            />
                        ))}
                    </group>

                    <ContactShadows frames={1} position={[PLAYER_CENTER[0], PLAYER_CENTER[1] - 0.05, PLAYER_CENTER[2]]} opacity={0.5} scale={15} blur={2.5} far={4} />
                    <FirstPersonCamera
                        myId={myId}
                        users={gameState.users}
                        radius={gameState.users.length > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL}
                        onHeadRotation={onHeadRotation}
                    />
                </Canvas>
            </WebGLErrorBoundary>
        </div>
    );
});

export default Scene3D;
