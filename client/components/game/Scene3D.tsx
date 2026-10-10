import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, useGLTF } from '@react-three/drei';
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

function FirstPersonCamera({ myId, users, radius, onHeadRotation }: any) {
    const { camera } = useThree();
    const lastEmitTime = useRef(0);
    const lastEmittedRot = useRef({ pitch: 0, yaw: 0 });
    const isDragging = useRef(false);
    const currentLook = useRef({ yaw: 0, pitch: 0 });
    const lastTargetLook = useRef({ yaw: 0, pitch: 0 });

    const lastPos = useRef({ x: 0, y: 0 });

    React.useEffect(() => {
        const handleDown = (e: PointerEvent) => { 
            if(e.isPrimary && (e.target as HTMLElement).tagName.toUpperCase() === 'CANVAS') {
                isDragging.current = true; 
                lastPos.current = { x: e.screenX, y: e.screenY };
            }
        };
        const handleUp = (e: PointerEvent) => { if(e.isPrimary) isDragging.current = false; };
        const handleMove = (e: PointerEvent) => {
            if (isDragging.current && e.isPrimary) {
                const maxYaw = Math.PI / 2.5; 
                const maxPitch = Math.PI / 4; 
                
                const deltaX = e.screenX - lastPos.current.x;
                const deltaY = e.screenY - lastPos.current.y;
                lastPos.current = { x: e.screenX, y: e.screenY };

                const deltaYaw = -(deltaX / window.innerWidth) * Math.PI * 1.5;
                const deltaPitch = -(deltaY / window.innerHeight) * Math.PI * 1.5;
                
                lastTargetLook.current.yaw = Math.max(-maxYaw, Math.min(maxYaw, lastTargetLook.current.yaw + deltaYaw));
                lastTargetLook.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, lastTargetLook.current.pitch + deltaPitch));
            }
        };

        window.addEventListener('pointerdown', handleDown as EventListener);
        window.addEventListener('pointerup', handleUp as EventListener);
        window.addEventListener('pointercancel', handleUp as EventListener);
        window.addEventListener('pointermove', handleMove as EventListener);
        return () => {
            window.removeEventListener('pointerdown', handleDown as EventListener);
            window.removeEventListener('pointerup', handleUp as EventListener);
            window.removeEventListener('pointercancel', handleUp as EventListener);
            window.removeEventListener('pointermove', handleMove as EventListener);
        }
    }, []);

    useFrame((state, delta) => {
        const myIndex = users.findIndex((u: any) => u.id === myId);
        if (myIndex === -1) {
            camera.position.lerp(new THREE.Vector3(PLAYER_CENTER[0], 5, PLAYER_CENTER[2] + 8), 2 * delta);
            camera.lookAt(PLAYER_CENTER[0], 0, PLAYER_CENTER[2]);
            return;
        }

        const angleOffset = users.length === 3 ? (Math.PI / 2) : -(Math.PI / 2);
        const angle = (myIndex / users.length) * (2 * Math.PI) + angleOffset;
        
        const headX = PLAYER_CENTER[0] + Math.cos(angle) * radius;
        const headZ = PLAYER_CENTER[2] + Math.sin(angle) * radius;
        const headY = PLAYER_CENTER[1] + 1.2; 

        camera.position.lerp(new THREE.Vector3(headX, headY, headZ), 5 * delta);

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

function AvatarModel({ url, isWinner, targetRot }: { url: string, isWinner: boolean, targetRot?: { pitch: number, yaw: number } }) {
    const { scene } = useGLTF(`/avatars/${url}`);
    const groupRef = useRef<THREE.Group>(null);
    const headBone = useRef<THREE.Object3D | null>(null);

    const clonedScene = React.useMemo(() => {
        const clone = SkeletonUtils.clone(scene);
        clone.traverse((child: any) => {
            if (child.isMesh || child.isSkinnedMesh) {
                child.frustumCulled = false;
            }
        });
        return clone;
    }, [scene]);

    React.useEffect(() => {
        if (!groupRef.current) return;
        headBone.current = null;
        groupRef.current.traverse((child) => {
            if ((child as any).isBone) {
                const name = child.name.toLowerCase();
                if (name.includes('head') || name.includes('neck')) {
                    if (!headBone.current) headBone.current = child; 
                }
            }
        });
    }, [clonedScene]);

    useFrame((state, delta) => {
        if (targetRot) {
            if (headBone.current) {
                const bone = headBone.current as any;
                if (!bone.userData.initialRotation) {
                    bone.userData.initialRotation = bone.rotation.clone();
                }
                const initRot = bone.userData.initialRotation;
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initRot.y + targetRot.yaw, 5 * delta);
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initRot.x - targetRot.pitch, 5 * delta);
            } else if (groupRef.current) {
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.yaw, 5 * delta);
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, 0.5, 0]} scale={0.6}>
            <primitive object={clonedScene} castShadow receiveShadow />
        </group>
    );
}

function PedestalNode({ type }: { type: string }) {
    switch (type) {
        case 'gold_pedestal':
            return (
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.8, 0.9, 0.5, 32]} />
                    <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.8} />
                </mesh>
            );
        case 'lava_ring':
            return (
                <group position={[0, 0.25, 0]}>
                    <mesh castShadow receiveShadow>
                        <cylinderGeometry args={[0.7, 0.8, 0.4, 16]} />
                        <meshStandardMaterial color="#1c1917" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.65, 0.12, 16, 32]} />
                        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} toneMapped={false} />
                    </mesh>
                </group>
            );
        case 'ice_block':
            return (
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.5, 0.5, 1.5]} />
                    <meshPhysicalMaterial color="#bae6fd" transmission={0.9} opacity={1} transparent roughness={0.1} thickness={0.5} />
                </mesh>
            );
        case 'cloud_base':
            return (
                <group position={[0, 0.25, 0]}>
                    <mesh position={[0, 0, 0]} castShadow receiveShadow><sphereGeometry args={[0.6, 16, 16]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                    <mesh position={[0.4, -0.1, 0.3]} castShadow receiveShadow><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                    <mesh position={[-0.4, -0.1, 0.3]} castShadow receiveShadow><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                    <mesh position={[0.2, -0.1, -0.4]} castShadow receiveShadow><sphereGeometry args={[0.45, 16, 16]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
                </group>
            );
        default:
            return (
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.7, 0.75, 0.5, 8]} />
                    <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.1} />
                </mesh>
            );
    }
}

function ParticleBurst({ color }: { color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.scale.addScalar(delta * 20);
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity = Math.max(0, mat.opacity - delta * 2);
        }
    });
    return (
        <mesh ref={meshRef} position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color={color} transparent opacity={0.8} emissive={color} emissiveIntensity={2} />
        </mesh>
    );
}

function RingBurst({ color }: { color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.scale.addScalar(delta * 10);
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity = Math.max(0, mat.opacity - delta * 1.5);
        }
    });
    return (
        <mesh ref={meshRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1, 0.1, 16, 32]} />
            <meshStandardMaterial color={color} transparent opacity={1} emissive={color} emissiveIntensity={2} />
        </mesh>
    );
}

function PlayerNode({ u, index, totalUsers, isCurrentTurn, isMe, isWinner, activeBubble, gameState, headRotations, taunt, visualEffects }: any) {
    const radius = totalUsers > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL;
    const angleOffset = totalUsers === 3 ? (Math.PI / 2) : -(Math.PI / 2);
    const angle = (index / totalUsers) * (2 * Math.PI) + angleOffset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);

    const targetRot = headRotations?.[u.id];
    
    const bomb = u.timeBomb;
    const hasMirror = isMe && (u.mirrorRoundsLeft && u.mirrorRoundsLeft > 0);
    
    const myEffects = visualEffects?.filter((e: any) => e.targetId === u.id || e.userId === u.id) || [];
    
    return (
        <group ref={groupRef} position={[x, 0, z]} rotation={[0, -angle - Math.PI / 2, 0]}>
            
            <PedestalNode type={u.pedestal || 'default_stone'} />

            {myEffects.map((eff: any) => {
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
                <mesh position={[0, 1.2, 0]}>
                    <sphereGeometry args={[1.5, 32, 32]} />
                    <meshPhysicalMaterial color="#38bdf8" transmission={0.9} opacity={0.3} transparent roughness={0.1} />
                </mesh>
            )}

            {!isMe && (
                <group ref={bodyRef}>
                    {userAvatar.model || u.avatar.includes('default') ? (
                        <Suspense fallback={
                            <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 1, 0.5]}/><meshStandardMaterial color="gray"/></mesh>
                        }>
                            <AvatarModel url={userAvatar.model || "Warrior.gltf"} isWinner={isWinner} targetRot={targetRot} />
                        </Suspense>
                    ) : (
                        <mesh position={[0, 1, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                            <meshStandardMaterial color="gray" />
                        </mesh>
                    )}
                </group>
            )}
            
            {bomb && (
                <Html position={[0, 3.2, 0]} center zIndexRange={[95, 0]} style={{ pointerEvents: 'none' }}>
                    <div className="flex flex-col items-center animate-bounce">
                        <span className="text-4xl drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">💣</span>
                        <span className="text-[10px] font-black text-red-400 bg-black/80 px-2 py-0.5 rounded-full mt-1 border border-red-500/50">
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
                <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                    <div className='flex flex-col items-center select-none'>
                        {activeBubble && (
                            <div className='absolute -top-14 bg-white text-black px-3 py-1.5 rounded-2xl rounded-bl-none text-xs font-bold shadow-xl z-50 text-center whitespace-normal break-words' style={{ minWidth: 'max-content', maxWidth: '140px' }}>
                                {activeBubble}
                            </div>
                        )}
                        {!isWinner && (
                            <div className={`mb-1 px-3 py-1 rounded-lg border shadow-lg font-bold text-center text-xs max-w-[100px] break-words z-20 bg-yellow-100 border-yellow-400 text-black transform -rotate-2`}>
                                {u.assignedWord}
                            </div>
                        )}
                        <span className={`mt-1 font-bold text-[11px] bg-black/80 px-2.5 py-1 rounded-full whitespace-nowrap shadow-lg flex items-center gap-1.5 ${u.status === 'spectator' ? 'line-through text-slate-500' : (u.nameColor ? (NAME_COLORS.find(c => c.id === u.nameColor)?.className || 'text-white') : 'text-white')} ${u.disconnected ? 'text-red-400' : ''}`}>
                            <span className={`flex items-center gap-1 ${getRankInfo(u.reputation || 0).color}`}>
                                <span className="text-[13px]">{getRankInfo(u.reputation || 0).icon}</span>
                                <span className="text-[9px] uppercase tracking-wider font-black">{getRankInfo(u.reputation || 0).title}</span>
                            </span>
                            {u.title && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-slate-700/50 text-white border border-slate-600">
                                    {TITLES.find(t => t.id === u.title)?.label || u.title}
                                </span>
                            )}
                            <span className="text-slate-500 mx-0.5">|</span>
                            {u.name} {u.disconnected && '(Koptu)'}
                        </span>
                        {u.status !== 'spectator' && !isWinner && (
                            <div className='flex gap-1 mt-1 bg-black/40 px-1.5 py-0.5 rounded-full'>
                                {[...Array(3)].map((_, i) => (
                                    <span key={i} className='drop-shadow-md text-[8px]'>{i < (u.lives ?? 3) ? '❤️' : '🖤'}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </Html>
            )}
        </group>
    );
}

function MapModel({ url }: { url: string }) {
    const { scene } = useGLTF(`/maps/${url}`);
    const config = MAP_CONFIGS[url] || { position: [0, 0, 0], scale: 1 };
    
    return (
        <group position={config.position} scale={config.scale}>
            <primitive object={scene} castShadow receiveShadow />
        </group>
    );
}

export default function Scene3D({ gameState, myId, activeBubbles, headRotations, onHeadRotation, taunts, visualEffects }: any) {
    const isDay = gameState?.theme !== "night";

    return (
        <div className='absolute inset-0 w-full h-full z-0 pointer-events-auto'>
            <Canvas shadows camera={{ position: [0, 4.5, 8], fov: 45 }}>
                <color attach='background' args={[isDay ? '#38bdf8' : '#0f172a']} />
                <fog attach='fog' args={[isDay ? '#38bdf8' : '#0f172a', isDay ? 15 : 8, isDay ? 40 : 30]} />
                <ambientLight intensity={isDay ? 0.9 : 0.4} />
                <directionalLight castShadow position={[10, 15, 5]} intensity={isDay ? 2.2 : 1.2} color={isDay ? "#ffedd5" : "#e0f2fe"} shadow-mapSize={[2048, 2048]} />
                <pointLight position={[0, 4, 0]} intensity={isDay ? 0.5 : 1.5} color={isDay ? '#eab308' : '#38bdf8'} distance={10} />
                
                <Suspense fallback={
                    <mesh position={[0, -0.1, 0]} receiveShadow>
                        <cylinderGeometry args={[2.8, 3.2, 0.2, 64]} />
                        <meshStandardMaterial color='#334155' roughness={0.7} />
                    </mesh>
                }>
                <MapModel url={gameState?.map || "floating_island__low_poly_vr.glb"} />
            </Suspense>

            <group position={PLAYER_CENTER as [number, number, number]}>
                {gameState.users.map((u: any, i: number) => (
                    <PlayerNode 
                        key={u.id} 
                        u={u} 
                        index={i} 
                        totalUsers={gameState.users.length} 
                        isCurrentTurn={u.id === gameState.currentTurnUserId} 
                        isMe={u.id === myId} 
                        isWinner={gameState.winners.includes(u.id)} 
                        activeBubble={activeBubbles[u.id]}
                        gameState={gameState}
                        headRotations={headRotations}
                        taunt={taunts?.[u.id]}
                        visualEffects={visualEffects}
                    />
                ))}
            </group>

            <ContactShadows position={[PLAYER_CENTER[0], PLAYER_CENTER[1] - 0.05, PLAYER_CENTER[2]]} opacity={0.5} scale={15} blur={2.5} far={4} />
            <FirstPersonCamera 
                myId={myId} 
                users={gameState.users} 
                radius={gameState.users.length > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL} 
                onHeadRotation={onHeadRotation}
            />
        </Canvas>
    </div>
);
}

useGLTF.preload('/avatars/Warrior.gltf');
useGLTF.preload('/avatars/Wizard.gltf');
useGLTF.preload('/avatars/Rogue.gltf');
useGLTF.preload('/avatars/Ranger.gltf');
useGLTF.preload('/avatars/Monk.gltf');
useGLTF.preload('/avatars/Cleric.gltf');
useGLTF.preload('/maps/floating_island__low_poly_vr.glb');
useGLTF.preload('/maps/snow.glb');
useGLTF.preload('/maps/desert.glb');