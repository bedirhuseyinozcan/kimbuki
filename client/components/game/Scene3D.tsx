import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, useGLTF, Clone } from '@react-three/drei';
import { User, GameState, AVATARS } from './types';
import * as THREE from 'three';
import { Avatar as MuiAvatar } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';

const PLAYER_CENTER = [2, 0, -1]; 
const MAP_POSITION = [0, -1.70, 0]; 
const MAP_SCALE = 0.5;

const PLAYER_CIRCLE_RADIUS_SMALL = 3.5;
const PLAYER_CIRCLE_RADIUS_LARGE = 4.5;
// -----------------------------------

function FirstPersonCamera({ myId, users, radius, onHeadRotation }: any) {
    const { camera } = useThree();
    const lastEmitTime = useRef(0);
    const lastEmittedRot = useRef({ pitch: 0, yaw: 0 });
    const isDragging = useRef(false);
    const currentLook = useRef({ yaw: 0, pitch: 0 });

    React.useEffect(() => {
        const handleDown = (e: MouseEvent) => { 
            if(e.button === 0 && (e.target as HTMLElement).tagName.toUpperCase() === 'CANVAS') {
                isDragging.current = true; 
            }
        };
        const handleUp = (e: MouseEvent) => { if(e.button === 0) isDragging.current = false; };
        window.addEventListener('mousedown', handleDown);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousedown', handleDown);
            window.removeEventListener('mouseup', handleUp);
        }
    }, []);

    useFrame((state, delta) => {
        const myIndex = users.findIndex((u: any) => u.id === myId);
        if (myIndex === -1) {
            
            camera.position.lerp(new THREE.Vector3(PLAYER_CENTER[0], 5, PLAYER_CENTER[2] + 8), 2 * delta);
            camera.lookAt(PLAYER_CENTER[0], 0, PLAYER_CENTER[2]);
            return;
        }

        const angle = (myIndex / users.length) * (2 * Math.PI) - (Math.PI / 2);
        
        const headX = PLAYER_CENTER[0] + Math.cos(angle) * radius;
        const headZ = PLAYER_CENTER[2] + Math.sin(angle) * radius;
        const headY = PLAYER_CENTER[1] + 1.2; 

        camera.position.lerp(new THREE.Vector3(headX, headY, headZ), 5 * delta);

        const targetX = PLAYER_CENTER[0];
        const targetY = PLAYER_CENTER[1] + 0.8;
        const targetZ = PLAYER_CENTER[2];

        camera.lookAt(targetX, targetY, targetZ);
        
        const maxYaw = Math.PI / 3; 
        const maxPitch = Math.PI / 4; 
        
        let targetYaw = 0;
        let targetPitch = 0;

        if (isDragging.current) {
            targetYaw = -state.pointer.x * maxYaw;
            targetPitch = state.pointer.y * maxPitch;
        }

        currentLook.current.yaw = THREE.MathUtils.lerp(currentLook.current.yaw, targetYaw, 10 * delta);
        currentLook.current.pitch = THREE.MathUtils.lerp(currentLook.current.pitch, targetPitch, 10 * delta);

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
    }, [scene]);

    useFrame((state, delta) => {
        if (targetRot) {
            if (headBone.current) {
                const bone = headBone.current as any;
                if (!bone.userData.initialRotation) {
                    bone.userData.initialRotation = bone.rotation.clone();
                }
                const initRot = bone.userData.initialRotation;
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initRot.y + targetRot.yaw, 5 * delta);
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initRot.x + targetRot.pitch, 5 * delta);
            } else if (groupRef.current) {
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.yaw, 5 * delta);
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, 0.5, 0]} scale={0.6}>
            <Clone object={scene} castShadow receiveShadow />
        </group>
    );
}

function PlayerNode({ u, index, totalUsers, isCurrentTurn, isMe, isWinner, activeBubble, gameState, headRotations }: any) {
    const radius = totalUsers > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL;
    const angle = (index / totalUsers) * (2 * Math.PI) - (Math.PI / 2);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);

    const targetRot = headRotations?.[u.id];
    
    return (
        <group ref={groupRef} position={[x, 0, z]} rotation={[0, -angle - Math.PI / 2, 0]}>
            
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.7, 0.75, 0.5, 8]} />
                <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.1} />
            </mesh>

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
                        <span className={`mt-2 font-bold text-[11px] bg-black/80 px-2 py-0.5 rounded-full whitespace-nowrap ${u.status === 'spectator' ? 'line-through text-slate-500' : ''} ${u.disconnected ? 'text-red-400' : ''}`}>
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
    return (
        <group position={MAP_POSITION as [number, number, number]} scale={MAP_SCALE}>
            <primitive object={scene} castShadow receiveShadow />
        </group>
    );
}

export default function Scene3D({ gameState, myId, activeBubbles, headRotations, onHeadRotation }: any) {
    return (
        <div className='absolute inset-0 w-full h-full z-0 pointer-events-auto'>
            <Canvas shadows camera={{ position: [0, 4.5, 8], fov: 45 }}>
                <color attach='background' args={['#0f172a']} />
                <fog attach='fog' args={['#0f172a', 8, 30]} />
                <ambientLight intensity={0.5} />
                <directionalLight castShadow position={[5, 10, 5]} intensity={1.5} shadow-mapSize={[2048, 2048]} />
                <pointLight position={[0, 4, 0]} intensity={1.2} color='#eab308' distance={10} />
                
                <Suspense fallback={
                    <mesh position={[0, -0.1, 0]} receiveShadow>
                        <cylinderGeometry args={[2.8, 3.2, 0.2, 64]} />
                        <meshStandardMaterial color='#334155' roughness={0.7} />
                    </mesh>
                }>
                <MapModel url="floating_island__low_poly_vr.glb" />
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