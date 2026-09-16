import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, useGLTF, Clone } from '@react-three/drei';
import { User, GameState, AVATARS } from './types';
import * as THREE from 'three';
import { Avatar as MuiAvatar } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';

const PLAYER_CENTER = [2, 0, -1]; 
const MAP_POSITION = [0, -1.2, 0]; 
const MAP_SCALE = 0.5;

const PLAYER_CIRCLE_RADIUS_SMALL = 3.5;
const PLAYER_CIRCLE_RADIUS_LARGE = 4.5;
// -----------------------------------

function CameraController({ currentTurnUserId, users, radius }: any) {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (!controlsRef.current) return;

        const currentIndex = users.findIndex((u: any) => u.id === currentTurnUserId);
        
        if (currentIndex !== -1) {
            const angle = (currentIndex / users.length) * (2 * Math.PI) - (Math.PI / 2);
            
            const playerX = PLAYER_CENTER[0] + Math.cos(angle) * radius;
            const playerZ = PLAYER_CENTER[2] + Math.sin(angle) * radius;
            const playerY = PLAYER_CENTER[1] + 1; 

            const targetCamX = PLAYER_CENTER[0] + Math.cos(angle) * (radius + 4);
            const targetCamY = PLAYER_CENTER[1] + 3;
            const targetCamZ = PLAYER_CENTER[2] + Math.sin(angle) * (radius + 4);

            camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 2 * delta);
            controlsRef.current.target.lerp(new THREE.Vector3(playerX, playerY, playerZ), 2 * delta);
        } else {
            camera.position.lerp(new THREE.Vector3(PLAYER_CENTER[0], 5, PLAYER_CENTER[2] + 8), 2 * delta);
            controlsRef.current.target.lerp(new THREE.Vector3(PLAYER_CENTER[0], 0, PLAYER_CENTER[2]), 2 * delta);
        }
        
        controlsRef.current.update();
    });

    return <OrbitControls ref={controlsRef} enablePan={false} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0} maxDistance={15} minDistance={2} />;
}

function AvatarModel({ url, isWinner }: { url: string, isWinner: boolean }) {
    const { scene } = useGLTF(`/avatars/${url}`);
    return (
        <group position={[0, 0.5, 0]} scale={0.6}>
            <Clone object={scene} castShadow receiveShadow />
        </group>
    );
}

function PlayerNode({ u, index, totalUsers, isCurrentTurn, isMe, isWinner, activeBubble, gameState }: any) {
    const radius = totalUsers > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL;
    const angle = (index / totalUsers) * (2 * Math.PI) - (Math.PI / 2);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const userAvatar = AVATARS.find(a => a.id === u.avatar) || AVATARS[0];
    const groupRef = useRef<THREE.Group>(null);

    return (
        <group ref={groupRef} position={[x, 0, z]} rotation={[0, -angle - Math.PI / 2, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.8, 1, 0.5, 32]} />
                <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.2} />
            </mesh>
            
            {userAvatar.model ? (
                <Suspense fallback={
                    <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 1, 0.5]}/><meshStandardMaterial color="gray"/></mesh>
                }>
                    <AvatarModel url={userAvatar.model} isWinner={isWinner} />
                </Suspense>
            ) : (
                <mesh position={[0, 1, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                    <meshStandardMaterial color="gray" />
                </mesh>
            )}

            <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div className='flex flex-col items-center select-none'>
                    {activeBubble && (
                        <div className='absolute -top-14 bg-white text-black px-3 py-1.5 rounded-2xl rounded-bl-none text-xs font-bold shadow-xl z-50 text-center whitespace-normal break-words' style={{ minWidth: 'max-content', maxWidth: '140px' }}>
                            {activeBubble}
                        </div>
                    )}
                    {!isWinner && (
                        <div className={`mb-1 px-3 py-1 rounded-lg border shadow-lg font-bold text-center text-xs max-w-[100px] break-words z-20 ${isMe ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-yellow-100 border-yellow-400 text-black transform -rotate-2'}`}>
                            {isMe && gameState.gameState !== 'ROUND_END' ? (
                                <span className='flex items-center justify-center gap-1'><HelpIcon style={{fontSize: '14px'}} /> KİMİM BEN?</span>
                            ) : (
                                u.assignedWord
                            )}
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

export default function Scene3D({ gameState, myId, activeBubbles }: any) {
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
                    />
                ))}
            </group>

            <ContactShadows position={[PLAYER_CENTER[0], PLAYER_CENTER[1] - 0.05, PLAYER_CENTER[2]]} opacity={0.5} scale={15} blur={2.5} far={4} />
            <CameraController 
                currentTurnUserId={gameState.currentTurnUserId} 
                users={gameState.users} 
                radius={gameState.users.length > 4 ? PLAYER_CIRCLE_RADIUS_LARGE : PLAYER_CIRCLE_RADIUS_SMALL} 
            />
        </Canvas>
    </div>
);
}