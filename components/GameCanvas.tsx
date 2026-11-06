'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { soundManager } from '@/lib/sound';
import { Play, Pause, RotateCcw, Trophy, Volume2, VolumeX, MessageSquare, Zap, Sparkles, Wrench, Video, Sun, Radio, Eye, Flag, Shield } from 'lucide-react';
import ModManagerModal, { CarModConfig } from '@/components/ModManagerModal';

interface GameCanvasProps {
  playerColor: string;
  driverName: string;
  carNumber: number;
  topSpeedSetting: number;
  modName?: string;
  bodyStyle?: string;
  customTextureUrl?: string;
  customGlbMesh?: any;
  onReturnToMenu: () => void;
}

// Canvas texture helper for car door & roof numbers
function createNumberTexture(numStr: string, colorHex: string | number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const bg = typeof colorHex === 'string' ? colorHex : `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 256);
    
    // Racing stripe border
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(10, 10, 236, 236);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 120px Impact, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// License plate texture helper
function createLicensePlateTexture(numStr: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fef08a'; // Vintage yellow
    ctx.fillRect(0, 0, 128, 64);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(4, 4, 120, 56);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NASCAR 1950', 64, 20);

    ctx.font = 'bold 26px Impact, sans-serif';
    ctx.fillText(`#${numStr}`, 64, 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Vintage Motoramic V8 Livery Texture (No numbers, matching 1950s reference photo)
function createMotoramicLiveryTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#a2e8f5'; // Pale pastel aqua / turquoise
    ctx.fillRect(0, 0, 512, 256);

    // "MOTORAMIC" text in bold italic black
    ctx.fillStyle = '#111827';
    ctx.font = '900 italic 46px Impact, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOTORAMIC', 35, 90);

    // "V8" text
    ctx.font = '900 italic 40px Impact, Arial, sans-serif';
    ctx.fillText('V8', 55, 155);

    // Pure-Sensitized badge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(130, 125, 110, 40);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(130, 125, 110, 40);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PURE • Sensitized', 185, 150);

    // Chevrolet red box badge
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(260, 128, 140, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px Arial, sans-serif';
    ctx.fillText('CHEVROLET', 330, 152);

    // Smokey's script on front fender area
    ctx.fillStyle = '#111827';
    ctx.font = 'bold italic 22px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText("Smokey's", 410, 100);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function GameCanvas({
  playerColor,
  driverName,
  carNumber,
  topSpeedSetting = 78,
  modName = 'Stock 1950 Hornet',
  bodyStyle = 'Stock Coupe',
  customTextureUrl,
  customGlbMesh,
  onReturnToMenu,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI & Race State
  const [speed, setSpeed] = useState(0);
  const [position, setPosition] = useState(41);
  const [lap, setLap] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Countdown Traffic Light State
  const [countdownText, setCountdownText] = useState<string>('3 • ON YOUR MARK');
  const [isRaceStarted, setIsRaceStarted] = useState<boolean>(false);
  
  // Mod Manager & Drift Notification State
  const [activeModName, setActiveModName] = useState<string>(modName);
  const [activeTextureUrl, setActiveTextureUrl] = useState<string | undefined>(customTextureUrl);
  const [activeGlbMesh, setActiveGlbMesh] = useState<any>(customGlbMesh);
  const [isModModalOpen, setIsModModalOpen] = useState<boolean>(false);
  const [driftNotification, setDriftNotification] = useState<string>('');

  // Camera Mode & Dynamic Race Weather / Atmosphere State
  const [cameraMode, setCameraMode] = useState<'chase' | 'cockpit' | 'roof' | 'tv'>('chase');
  const [envPreset, setEnvPreset] = useState<'day' | 'sunset' | 'night' | 'fog'>('sunset');
  const [spotterAlert, setSpotterAlert] = useState<string>('CREW CHIEF: Radio online. Clear track ahead, push hard!');
  const [isDraftingActive, setIsDraftingActive] = useState<boolean>(false);
  const [isSideDrafting, setIsSideDrafting] = useState<boolean>(false);

  const cameraModeRef = useRef<'chase' | 'cockpit' | 'roof' | 'tv'>('chase');
  const envPresetRef = useRef<'day' | 'sunset' | 'night' | 'fog'>('sunset');

  const cycleCameraMode = useCallback(() => {
    const modes: Array<'chase' | 'cockpit' | 'roof' | 'tv'> = ['chase', 'cockpit', 'roof', 'tv'];
    const nextIdx = (modes.indexOf(cameraModeRef.current) + 1) % modes.length;
    cameraModeRef.current = modes[nextIdx];
    setCameraMode(modes[nextIdx]);
    soundManager.playOvertakeBlip();
  }, []);

  const cycleWeatherPreset = useCallback(() => {
    const presets: Array<'day' | 'sunset' | 'night' | 'fog'> = ['sunset', 'night', 'fog', 'day'];
    const nextIdx = (presets.indexOf(envPresetRef.current) + 1) % presets.length;
    envPresetRef.current = presets[nextIdx];
    setEnvPreset(presets[nextIdx]);
    soundManager.playOvertakeBlip();
  }, []);

  // NASCAR 99-Stall Pit Stop & Fresh Tires / Spark Plug Tune State
  const [isPitRequested, setIsPitRequested] = useState<boolean>(false);
  const [isInPitLane, setIsInPitLane] = useState<boolean>(false);
  const [pitWarning, setPitWarning] = useState<string>('');
  const [pitServiceStatus, setPitServiceStatus] = useState<{
    active: boolean;
    stage: string;
    progress: number;
    stallNum: number;
  } | null>(null);
  const [freshTireBuffLaps, setFreshTireBuffLaps] = useState<number>(0);
  const [sparkPlugBoostActive, setSparkPlugBoostActive] = useState<boolean>(false);

  // Vehicle Telemetry & Race Control System State
  const [tireWearPct, setTireWearPct] = useState<number>(0);
  const [engineTempDeg, setEngineTempDeg] = useState<number>(185);
  const [raceFlag, setRaceFlag] = useState<'GREEN' | 'YELLOW' | 'CHECKERED'>('GREEN');

  // Step-by-step position ticker & overtake alert
  const [overtakeNotice, setOvertakeNotice] = useState<{ pos: number; direction: 'up' | 'down' } | null>(null);
  const displayedPositionRef = useRef<number>(41);
  const lastPosStepTimeRef = useRef<number>(0);
  const overtakeNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [commentary, setCommentary] = useState<string>('Drivers, start your engines! 99 vintage stock cars ready at the grid!');
  const [isFetchingCommentary, setIsFetchingCommentary] = useState(false);

  const gameRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    trackCurve?: THREE.CatmullRomCurve3;
    cars: any[];
    playerCar?: any;
    controls: { left: boolean; right: boolean; gas: boolean; brake: boolean; pit: boolean };
    raceFinished: boolean;
    raceStarted: boolean;
    isPaused: boolean;
    trafficLights?: THREE.Mesh[];
  }>({
    cars: [],
    controls: { left: false, right: false, gas: false, brake: false, pit: false },
    raceFinished: false,
    raceStarted: false,
    isPaused: false,
  });

  const lastCommentaryTimeRef = useRef<number>(0);

  const fetchCommentary = useCallback(async (currentLap: number, currentPos: number, currentSpeed: number, eventType = 'Epic dirt trail action') => {
    const now = Date.now();
    // Enforce minimum 15 seconds between API requests to prevent 429 rate limit exceeded errors
    if (isFetchingCommentary || (now - lastCommentaryTimeRef.current < 15000)) {
      const clientFallbacks = [
        "Roaring through the mountain turn on the dirt!",
        "99 stock cars battling hard for position!",
        "Massive dust cloud behind the leaders on the canyon trail!",
        "Pitting in for 4 fresh tires and a spark plug tune!",
        "Down pit road at 45 MPH! Unbelievable teamwork by the crew chief!",
        "Holding the inside line as 99 engines scream!"
      ];
      setCommentary(clientFallbacks[Math.floor(Math.random() * clientFallbacks.length)]);
      return;
    }

    try {
      setIsFetchingCommentary(true);
      lastCommentaryTimeRef.current = now;
      const res = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lap: currentLap, position: currentPos, speed: currentSpeed, totalCars: 99, eventType }),
      });
      const data = await res.json();
      if (data.commentary) {
        setCommentary(data.commentary);
      }
    } catch (err) {
      console.error('Commentary error:', err);
    } finally {
      setIsFetchingCommentary(false);
    }
  }, [isFetchingCommentary]);

  const fetchCommentaryRef = useRef(fetchCommentary);
  useEffect(() => {
    fetchCommentaryRef.current = fetchCommentary;
  }, [fetchCommentary]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // --- 1. THREE.JS SCENE & LIGHTING ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec0ee); // Crisp Sky
    scene.fog = new THREE.FogExp2(0x7ec0ee, 0.0006);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 7000);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Direct warm sunlight
    scene.add(new THREE.AmbientLight(0xfff8ee, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(300, 600, 400);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 5000;
    const d = 2000;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    scene.add(sun);

    // --- 2. 30-40 MILE CANYON DIRT TRAIL WITH BANKED TURNS ---
    const trackControlPoints = [
      new THREE.Vector3(0, 10, 0),              // Start Line
      new THREE.Vector3(500, 32, 400),          // Climb 1
      new THREE.Vector3(1200, 85, 600),         // Mountain Peak 1
      new THREE.Vector3(1900, 135, 100),        // High Cliff Pass
      new THREE.Vector3(2200, 90, -600),        // Banked Downhill Bend
      new THREE.Vector3(1500, 45, -1500),       // Valley Loop
      new THREE.Vector3(600, 105, -2000),       // Canyon Bridge Hill
      new THREE.Vector3(-400, 145, -2200),      // Highest Crest
      new THREE.Vector3(-1400, 90, -1600),      // Winding Descent
      new THREE.Vector3(-1800, 50, -600),       // Forest Pass
      new THREE.Vector3(-1400, 22, 400),        // Valley S-Curve
      new THREE.Vector3(-600, 12, 300),         // Final Turn
    ];

    const trackCurve = new THREE.CatmullRomCurve3(trackControlPoints, true, 'centripetal', 0.5);
    gameRef.current.trackCurve = trackCurve;

    const trackPointsCount = 1500;
    const trackWidth = 24; // Wide dirt trail for 67 cars

    // Helper: Compute bank angle (inward tilt on curves)
    const getBankAngle = (u: number) => {
      const tangent = trackCurve.getTangentAt(u);
      const nextU = (u + 0.005) % 1.0;
      const nextTangent = trackCurve.getTangentAt(nextU);
      
      // Signed cross product curvature
      const crossY = tangent.x * nextTangent.z - tangent.z * nextTangent.x;
      // Inward banking up to 0.35 rad (~20 degrees)
      return THREE.MathUtils.clamp(-crossY * 12.0, -0.38, 0.38);
    };

    const trackGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i <= trackPointsCount; i++) {
      const u = i / trackPointsCount;
      const pt = trackCurve.getPointAt(u);
      const tangent = trackCurve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const bankAngle = getBankAngle(u);

      // Apply banked rotation around tangent axis
      const bankedUp = up.clone().applyAxisAngle(tangent, bankAngle);
      const bankedSide = side.clone().applyAxisAngle(tangent, bankAngle);

      const pLeft = new THREE.Vector3().copy(pt).addScaledVector(bankedSide, trackWidth / 2);
      const pRight = new THREE.Vector3().copy(pt).addScaledVector(bankedSide, -trackWidth / 2);

      positions.push(pLeft.x, pLeft.y + 0.1, pLeft.z);
      positions.push(pRight.x, pRight.y + 0.1, pRight.z);
      uvs.push(0, u * 150);
      uvs.push(1, u * 150);
    }

    const indices: number[] = [];
    for (let i = 0; i < trackPointsCount; i++) {
      const r1 = i * 2, r2 = (i + 1) * 2;
      indices.push(r1, r1 + 1, r2);
      indices.push(r1 + 1, r2 + 1, r2);
    }
    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    trackGeo.setIndex(indices);
    trackGeo.computeVertexNormals();

    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x6E4225, // Deep dirt brown
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    const trackMesh = new THREE.Mesh(trackGeo, dirtMat);
    trackMesh.position.y = 0.1;
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // --- 3. MOUNTAINS & ROLLING HILLS (RECESSED UNDER TRACK TO PREVENT CLIPPING) ---
    const groundGeo = new THREE.PlaneGeometry(8500, 8500, 140, 140);
    groundGeo.rotateX(-Math.PI / 2);

    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Procedural mountain peaks & hills
      const h1 = Math.sin(vx * 0.001) * Math.cos(vz * 0.001) * 220;
      const h2 = Math.sin(vx * 0.0028 + 1.5) * Math.cos(vz * 0.0028 + 0.5) * 80;
      const h3 = Math.sin(vx * 0.007) * Math.sin(vz * 0.007) * 25;

      let elevation = Math.max(-10, h1 + h2 + h3);

      // Recess terrain directly under track so ground NEVER glitches through hills
      const uApprox = Math.abs((vx + vz) * 0.0001) % 1.0;
      const nearestPt = trackCurve.getPointAt(uApprox);
      const distToTrack = Math.hypot(vx - nearestPt.x, vz - nearestPt.z);

      if (distToTrack < 140) {
        const factor = Math.min(1, distToTrack / 140);
        // Force ground height to be strictly below track elevation
        elevation = THREE.MathUtils.lerp(nearestPt.y - 5.0, elevation, factor);
      }

      posAttr.setY(i, elevation);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2e4714, // Mountain forest green
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- 3.5. DENSE PINE & OAK FOREST ALONG THE TRAIL ---
    const pineTrunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 4, 8);
    const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    const pineFoliageGeo = new THREE.ConeGeometry(2.8, 8, 8);
    const pineFoliageMat = new THREE.MeshStandardMaterial({ color: 0x143d1a, roughness: 0.8 });

    const oakTrunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
    const oakTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.9 });
    const oakFoliageGeo = new THREE.DodecahedronGeometry(3.5, 1);
    const oakFoliageMat = new THREE.MeshStandardMaterial({ color: 0x225518, roughness: 0.85 });

    const treeCountPerType = 800;
    const pineTrunkMesh = new THREE.InstancedMesh(pineTrunkGeo, pineTrunkMat, treeCountPerType);
    const pineFoliageMesh = new THREE.InstancedMesh(pineFoliageGeo, pineFoliageMat, treeCountPerType);
    const oakTrunkMesh = new THREE.InstancedMesh(oakTrunkGeo, oakTrunkMat, treeCountPerType);
    const oakFoliageMesh = new THREE.InstancedMesh(oakFoliageGeo, oakFoliageMat, treeCountPerType);

    pineTrunkMesh.castShadow = true;
    pineFoliageMesh.castShadow = true;
    oakTrunkMesh.castShadow = true;
    oakFoliageMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    let pineIdx = 0;
    let oakIdx = 0;

    const numSamples = 200;
    for (let s = 0; s < numSamples; s++) {
      const u = s / numSamples;
      const pt = trackCurve.getPointAt(u);
      const tan = trackCurve.getTangentAt(u);
      const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();

      [-1, 1].forEach((sideMultiplier) => {
        for (let t = 0; t < 2; t++) {
          let offsetDist = trackWidth / 2 + 5 + Math.random() * 45;
          // Clear pit road corridor on left side (sideMultiplier = 1) between u = 0.84 and 0.14
          if (sideMultiplier === 1 && (u > 0.84 || u < 0.14)) {
            offsetDist = trackWidth / 2 + 28 + Math.random() * 32; // Beautiful forest behind pit crew trailers
          }
          const treePos = new THREE.Vector3().copy(pt).addScaledVector(side, sideMultiplier * offsetDist);
          
          const uApprox = Math.abs((treePos.x + treePos.z) * 0.0001) % 1.0;
          const nearTrackPt = trackCurve.getPointAt(uApprox);
          treePos.y = nearTrackPt.y - 0.5;

          const scale = 0.8 + Math.random() * 0.7;

          if ((s + t) % 2 === 0 && pineIdx < treeCountPerType) {
            dummy.position.copy(treePos).add(new THREE.Vector3(0, 2 * scale, 0));
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();
            pineTrunkMesh.setMatrixAt(pineIdx, dummy.matrix);

            dummy.position.copy(treePos).add(new THREE.Vector3(0, 6 * scale, 0));
            dummy.updateMatrix();
            pineFoliageMesh.setMatrixAt(pineIdx, dummy.matrix);
            pineIdx++;
          } else if (oakIdx < treeCountPerType) {
            dummy.position.copy(treePos).add(new THREE.Vector3(0, 2.5 * scale, 0));
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();
            oakTrunkMesh.setMatrixAt(oakIdx, dummy.matrix);

            dummy.position.copy(treePos).add(new THREE.Vector3(0, 6 * scale, 0));
            dummy.updateMatrix();
            oakFoliageMesh.setMatrixAt(oakIdx, dummy.matrix);
            oakIdx++;
          }
        }
      });
    }

    pineTrunkMesh.instanceMatrix.needsUpdate = true;
    pineFoliageMesh.instanceMatrix.needsUpdate = true;
    oakTrunkMesh.instanceMatrix.needsUpdate = true;
    oakFoliageMesh.instanceMatrix.needsUpdate = true;

    scene.add(pineTrunkMesh);
    scene.add(pineFoliageMesh);
    scene.add(oakTrunkMesh);
    scene.add(oakFoliageMesh);

    // --- 3.6. NASCAR PIT ROAD (BREAKS OFF TRAIL -> 99 STALLS IN ONE LINE -> TURNS RIGHT BACK TO TRACK) ---
    const uPitStart = 0.865;
    const uPitEnd = 1.095; // 0.095 past Start Line
    const uPitSpan = (1.0 - uPitStart) + 0.095; // 0.230 total parametric span (~2,570m straightaway)

    const pitPointsCount = 240;
    const pitRoadGeo = new THREE.BufferGeometry();
    const pitPositions: number[] = [];
    const pitUvs: number[] = [];
    const pitWidth = 8.8; // Wide pit lane (pit stall box + drive-through lane)

    for (let i = 0; i <= pitPointsCount; i++) {
      const normT = i / pitPointsCount;
      const u = (uPitStart + normT * uPitSpan) % 1.0;
      const pt = trackCurve.getPointAt(u);
      const tan = trackCurve.getTangentAt(u).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();

      // Lateral offset profile:
      // normT < 0.12: Branches off to the left from main trail edge (+11.5m) to pit lane (+24m)
      // 0.12 to 0.88: Straight pit lane at lateral offset +24m
      // normT > 0.88: Curves and turns to the right from +24m back to +11.5m, merging smoothly into the main trail!
      let lateralOffset = 24.0;
      if (normT < 0.12) {
        const t = normT / 0.12;
        const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
        lateralOffset = THREE.MathUtils.lerp(11.5, 24.0, smooth);
      } else if (normT > 0.88) {
        const t = (normT - 0.88) / 0.12;
        // Smoothly turns right back into the main trail!
        const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
        lateralOffset = THREE.MathUtils.lerp(24.0, 11.5, smooth);
      }

      const pInner = pt.clone().addScaledVector(side, lateralOffset - pitWidth / 2);
      const pOuter = pt.clone().addScaledVector(side, lateralOffset + pitWidth / 2);

      pitPositions.push(pInner.x, pt.y + 0.14, pInner.z);
      pitPositions.push(pOuter.x, pt.y + 0.14, pOuter.z);
      pitUvs.push(0, normT * 80);
      pitUvs.push(1, normT * 80);
    }

    const pitIndices: number[] = [];
    for (let i = 0; i < pitPointsCount; i++) {
      const r1 = i * 2, r2 = (i + 1) * 2;
      pitIndices.push(r1, r1 + 1, r2);
      pitIndices.push(r1 + 1, r2 + 1, r2);
    }

    pitRoadGeo.setAttribute('position', new THREE.Float32BufferAttribute(pitPositions, 3));
    pitRoadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(pitUvs, 2));
    pitRoadGeo.setIndex(pitIndices);
    pitRoadGeo.computeVertexNormals();

    const pitMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Dark asphalt tarmac for pit lane
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const pitRoadMesh = new THREE.Mesh(pitRoadGeo, pitMat);
    pitRoadMesh.receiveShadow = true;
    scene.add(pitRoadMesh);

    // Concrete Pit Wall at lateral offset +15.8m separating trail and pit lane
    const wallPointsCount = 140;
    const wallGeo = new THREE.BufferGeometry();
    const wallPositions: number[] = [];
    const wallIndices: number[] = [];
    const wallThickness = 0.7;
    const wallHeight = 1.2;

    for (let i = 0; i <= wallPointsCount; i++) {
      const normT = 0.105 + (i / wallPointsCount) * (0.895 - 0.105);
      const u = (uPitStart + normT * uPitSpan) % 1.0;
      const pt = trackCurve.getPointAt(u);
      const tan = trackCurve.getTangentAt(u).normalize();
      const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();

      const wallCenter = pt.clone().addScaledVector(side, 15.8);
      const wInner = wallCenter.clone().addScaledVector(side, -wallThickness / 2);
      const wOuter = wallCenter.clone().addScaledVector(side, wallThickness / 2);

      wallPositions.push(wInner.x, pt.y + 0.1, wInner.z);
      wallPositions.push(wOuter.x, pt.y + 0.1, wOuter.z);
      wallPositions.push(wInner.x, pt.y + 0.1 + wallHeight, wInner.z);
      wallPositions.push(wOuter.x, pt.y + 0.1 + wallHeight, wOuter.z);
    }

    for (let i = 0; i < wallPointsCount; i++) {
      const base = i * 4;
      const next = (i + 1) * 4;
      wallIndices.push(base + 1, next + 1, base + 3);
      wallIndices.push(next + 1, next + 3, base + 3);
      wallIndices.push(base, base + 2, next);
      wallIndices.push(next, base + 2, next + 2);
      wallIndices.push(base + 2, base + 3, next + 2);
      wallIndices.push(next + 2, base + 3, next + 3);
    }

    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
    wallGeo.setIndex(wallIndices);
    wallGeo.computeVertexNormals();

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // White concrete barrier
      roughness: 0.9,
    });
    const pitWallMesh = new THREE.Mesh(wallGeo, wallMat);
    pitWallMesh.castShadow = true;
    pitWallMesh.receiveShadow = true;
    scene.add(pitWallMesh);

    // Yellow Sand Crash Barrels at pit entrance & exit noses
    const barrelGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    [-0.005, 0, 0.005].forEach((offsetT) => {
      [0.102, 0.898].forEach((noseNormT) => {
        const u = (uPitStart + (noseNormT + offsetT) * uPitSpan) % 1.0;
        const pt = trackCurve.getPointAt(u);
        const tan = trackCurve.getTangentAt(u).normalize();
        const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.copy(pt).addScaledVector(side, 15.8);
        barrel.position.y += 0.5;
        barrel.castShadow = true;
        scene.add(barrel);
      });
    });

    // --- 3.7. 99 PIT STALLS IN ONE CONTINUOUS ROW (CREW CHIEFS, TIRE CHANGERS, SPARK PLUG TECHS, EQUIPMENT) ---
    const totalStalls = 99;
    const stallMarkingGeo = new THREE.PlaneGeometry(6.4, 3.6);
    stallMarkingGeo.rotateX(-Math.PI / 2);
    const stallMarkingMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });
    const stallMarkingMesh = new THREE.InstancedMesh(stallMarkingGeo, stallMarkingMat, totalStalls);

    // Procedural 3D Character & Equipment Geometries (Pre-merged for optimal 60 FPS performance)
    const crewChiefGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.BoxGeometry(0.5, 0.9, 0.4).translate(0, 0.45, 0),
      new THREE.BoxGeometry(0.65, 0.8, 0.45).translate(0, 1.3, 0),
      new THREE.SphereGeometry(0.22, 8, 8).translate(0, 1.82, 0),
      new THREE.BoxGeometry(0.7, 0.25, 0.4).translate(0, 1.25, 0.2)
    ])!;

    const tireChangerGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.BoxGeometry(0.5, 0.45, 0.6).translate(0, 0.25, 0),
      new THREE.BoxGeometry(0.6, 0.65, 0.45).translate(0, 0.8, 0.1),
      new THREE.SphereGeometry(0.22, 8, 8).translate(0, 1.25, 0.2),
      new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8).rotateZ(Math.PI / 2).translate(0, 0.65, 0.45)
    ])!;

    const sparkTechGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.BoxGeometry(0.5, 0.9, 0.4).translate(0, 0.45, 0),
      new THREE.BoxGeometry(0.65, 0.8, 0.45).translate(0, 1.25, 0.15),
      new THREE.SphereGeometry(0.22, 8, 8).translate(0, 1.75, 0.3),
      new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8).rotateX(Math.PI / 3).translate(0, 1.15, 0.5)
    ])!;

    const toolboxGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.BoxGeometry(1.6, 1.1, 0.8).translate(0, 0.65, 0),
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8).rotateZ(Math.PI / 2).translate(0, 1.25, 0)
    ])!;

    const tireStackGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.CylinderGeometry(0.48, 0.48, 0.36, 12).translate(0, 0.18, 0),
      new THREE.CylinderGeometry(0.48, 0.48, 0.36, 12).translate(0, 0.54, 0),
      new THREE.CylinderGeometry(0.48, 0.48, 0.36, 12).translate(0, 0.90, 0),
      new THREE.CylinderGeometry(0.48, 0.48, 0.36, 12).translate(0, 1.26, 0)
    ])!;

    const jackGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.BoxGeometry(0.4, 0.22, 1.1).translate(0, 0.11, 0),
      new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8).rotateX(0.4).translate(0, 0.65, -0.4)
    ])!;

    const stallSignGeo = BufferGeometryUtils.mergeGeometries([
      new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8).translate(0, 1.8, 0),
      new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8).rotateX(Math.PI / 2).translate(0, 3.5, 0.9),
      new THREE.BoxGeometry(1.4, 0.7, 0.08).translate(0, 3.3, 1.5)
    ])!;

    const crewChiefMesh = new THREE.InstancedMesh(crewChiefGeo, new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.8 }), totalStalls);
    const tireChangerMesh = new THREE.InstancedMesh(tireChangerGeo, new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }), totalStalls * 2);
    const sparkTechMesh = new THREE.InstancedMesh(sparkTechGeo, new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 }), totalStalls);
    const toolboxMesh = new THREE.InstancedMesh(toolboxGeo, new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.25 }), totalStalls);
    const tireStackMesh = new THREE.InstancedMesh(tireStackGeo, new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }), totalStalls);
    const jackMesh = new THREE.InstancedMesh(jackGeo, new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.7 }), totalStalls);
    const stallSignMesh = new THREE.InstancedMesh(stallSignGeo, new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 }), totalStalls);

    stallMarkingMesh.receiveShadow = true;
    crewChiefMesh.castShadow = true;
    tireChangerMesh.castShadow = true;
    sparkTechMesh.castShadow = true;
    toolboxMesh.castShadow = true;
    tireStackMesh.castShadow = true;
    jackMesh.castShadow = true;
    stallSignMesh.castShadow = true;

    const stallDummy = new THREE.Object3D();
    const stallInfos: Array<{
      stallNum: number;
      normT: number;
      u: number;
      center: THREE.Vector3;
      tan: THREE.Vector3;
      side: THREE.Vector3;
      heading: number;
    }> = [];

    for (let k = 0; k < totalStalls; k++) {
      // 99 stalls arranged in one single continuous straight line along pit road
      const stallNormT = 0.135 + (k / (totalStalls - 1)) * (0.865 - 0.135);
      const stallU = (uPitStart + stallNormT * uPitSpan) % 1.0;
      const stallPt = trackCurve.getPointAt(stallU);
      const stallTan = trackCurve.getTangentAt(stallU).normalize();
      const stallUp = new THREE.Vector3(0, 1, 0);
      const stallSide = new THREE.Vector3().crossVectors(stallTan, stallUp).normalize();
      const stallHeading = Math.atan2(stallTan.x, stallTan.z);

      const stallCenter = stallPt.clone().addScaledVector(stallSide, 24.0);
      stallCenter.y = stallPt.y + 0.16;

      stallInfos.push({
        stallNum: k + 1,
        normT: stallNormT,
        u: stallU,
        center: stallCenter.clone(),
        tan: stallTan.clone(),
        side: stallSide.clone(),
        heading: stallHeading,
      });

      // 1. Stall Marking
      stallDummy.position.copy(stallCenter);
      stallDummy.rotation.set(0, stallHeading, 0);
      stallDummy.scale.set(1, 1, 1);
      stallDummy.updateMatrix();
      stallMarkingMesh.setMatrixAt(k, stallDummy.matrix);

      // 2. Sign Post
      const signPos = stallCenter.clone().addScaledVector(stallSide, 4.3);
      stallDummy.position.copy(signPos);
      stallDummy.rotation.set(0, stallHeading, 0);
      stallDummy.updateMatrix();
      stallSignMesh.setMatrixAt(k, stallDummy.matrix);

      // 3. Red Toolbox
      const boxPos = stallCenter.clone().addScaledVector(stallSide, 3.9).addScaledVector(stallTan, 2.2);
      stallDummy.position.copy(boxPos);
      stallDummy.rotation.set(0, stallHeading + Math.PI / 2, 0);
      stallDummy.updateMatrix();
      toolboxMesh.setMatrixAt(k, stallDummy.matrix);

      // 4. Tire Stack (4 Goodyear Tires)
      const tirePos = stallCenter.clone().addScaledVector(stallSide, 3.8).addScaledVector(stallTan, -2.0);
      stallDummy.position.copy(tirePos);
      stallDummy.rotation.set(0, stallHeading, 0);
      stallDummy.updateMatrix();
      tireStackMesh.setMatrixAt(k, stallDummy.matrix);

      // 5. Floor Jack
      const jackPos = stallCenter.clone().addScaledVector(stallSide, 1.8).addScaledVector(stallTan, 2.3);
      stallDummy.position.copy(jackPos);
      stallDummy.rotation.set(0, stallHeading, 0);
      stallDummy.updateMatrix();
      jackMesh.setMatrixAt(k, stallDummy.matrix);

      // 6. Crew Chief (Standing near pit wall watching stall)
      const chiefPos = stallCenter.clone().addScaledVector(stallSide, -7.2);
      stallDummy.position.copy(chiefPos);
      stallDummy.rotation.set(0, stallHeading + Math.PI / 2, 0);
      stallDummy.updateMatrix();
      crewChiefMesh.setMatrixAt(k, stallDummy.matrix);

      // 7. Tire Changers (Front and Rear)
      const frontChangerPos = stallCenter.clone().addScaledVector(stallSide, 1.7).addScaledVector(stallTan, 1.4);
      stallDummy.position.copy(frontChangerPos);
      stallDummy.rotation.set(0, stallHeading - Math.PI / 2, 0);
      stallDummy.updateMatrix();
      tireChangerMesh.setMatrixAt(k * 2, stallDummy.matrix);

      const rearChangerPos = stallCenter.clone().addScaledVector(stallSide, 1.7).addScaledVector(stallTan, -1.4);
      stallDummy.position.copy(rearChangerPos);
      stallDummy.rotation.set(0, stallHeading - Math.PI / 2, 0);
      stallDummy.updateMatrix();
      tireChangerMesh.setMatrixAt(k * 2 + 1, stallDummy.matrix);

      // 8. Spark Plug / Engine Tech (Standing at hood with wrench)
      const techPos = stallCenter.clone().addScaledVector(stallTan, 2.6);
      stallDummy.position.copy(techPos);
      stallDummy.rotation.set(0, stallHeading + Math.PI, 0);
      stallDummy.updateMatrix();
      sparkTechMesh.setMatrixAt(k, stallDummy.matrix);
    }

    stallMarkingMesh.instanceMatrix.needsUpdate = true;
    stallSignMesh.instanceMatrix.needsUpdate = true;
    toolboxMesh.instanceMatrix.needsUpdate = true;
    tireStackMesh.instanceMatrix.needsUpdate = true;
    jackMesh.instanceMatrix.needsUpdate = true;
    crewChiefMesh.instanceMatrix.needsUpdate = true;
    tireChangerMesh.instanceMatrix.needsUpdate = true;
    sparkTechMesh.instanceMatrix.needsUpdate = true;

    scene.add(stallMarkingMesh);
    scene.add(stallSignMesh);
    scene.add(toolboxMesh);
    scene.add(tireStackMesh);
    scene.add(jackMesh);
    scene.add(crewChiefMesh);
    scene.add(tireChangerMesh);
    scene.add(sparkTechMesh);

    // Floating Illuminated Beacon over player's assigned pit stall
    const playerAssignedStallIdx = (carNumber - 1) % totalStalls;
    const playerStallInfo = stallInfos[playerAssignedStallIdx];

    const beaconGroup = new THREE.Group();
    const chevronGeo = new THREE.ConeGeometry(0.8, 1.6, 4);
    chevronGeo.rotateX(Math.PI);
    const chevronMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 1.8,
    });
    const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
    chevronMesh.position.set(0, 4.2, 0);
    beaconGroup.add(chevronMesh);

    const playerSignTex = createNumberTexture(carNumber.toString(), '#facc15');
    const playerSignBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 1.2),
      new THREE.MeshBasicMaterial({ map: playerSignTex, side: THREE.DoubleSide })
    );
    playerSignBoard.position.set(0, 5.2, 0);
    beaconGroup.add(playerSignBoard);

    beaconGroup.position.copy(playerStallInfo.center);
    scene.add(beaconGroup);

    // --- 4. STARTING GANTRY WITH 3D TRAFFIC LIGHT (3..2..1..GO) ---
    const startPt0 = trackCurve.getPointAt(0);
    const startTan0 = trackCurve.getTangentAt(0);
    const startSide0 = new THREE.Vector3().crossVectors(startTan0, new THREE.Vector3(0, 1, 0)).normalize();

    const archGroup = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.6, 0.6, 14);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3d2314 });

    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.copy(startPt0).addScaledVector(startSide0, -trackWidth / 2 - 1.5);
    post1.position.y += 7;
    archGroup.add(post1);

    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.copy(startPt0).addScaledVector(startSide0, trackWidth / 2 + 1.5);
    post2.position.y += 7;
    archGroup.add(post2);

    const gantryGeo = new THREE.BoxGeometry(trackWidth + 5, 2.5, 0.6);
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const gantry = new THREE.Mesh(gantryGeo, gantryMat);
    gantry.position.copy(startPt0);
    gantry.position.y += 12;
    gantry.rotation.y = Math.atan2(startTan0.x, startTan0.z);
    archGroup.add(gantry);

    // 3D Traffic Light Box
    const lightBoxGeo = new THREE.BoxGeometry(6, 2, 0.8);
    const lightBoxMat = new THREE.MeshStandardMaterial({ color: 0x020617 });
    const lightBox = new THREE.Mesh(lightBoxGeo, lightBoxMat);
    lightBox.position.copy(startPt0);
    lightBox.position.y += 12;
    lightBox.rotation.y = Math.atan2(startTan0.x, startTan0.z);

    // 3 Red Lights + 1 Green Light Bulb
    const bulbGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const lightBulbs: THREE.Mesh[] = [];

    [-1.8, -0.6, 0.6, 1.8].forEach((xOffset, idx) => {
      const isGreenBulb = (idx === 3);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: isGreenBulb ? 0x004400 : 0x440000,
        emissive: isGreenBulb ? 0x002200 : 0x220000,
        emissiveIntensity: 0.2,
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(xOffset, 0, 0.45);
      lightBox.add(bulb);
      lightBulbs.push(bulb);
    });

    archGroup.add(lightBox);
    scene.add(archGroup);
    gameRef.current.trafficLights = lightBulbs;

    // --- 4.5. 3D DIRT SPLASHING PARTICLE SYSTEM ---
    const clumpGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const clumpMat = new THREE.MeshStandardMaterial({ color: 0x543216, roughness: 0.95 });
    const puffGeo = new THREE.SphereGeometry(0.38, 6, 6);
    const puffMat = new THREE.MeshStandardMaterial({
      color: 0x7c5432,
      transparent: true,
      opacity: 0.5,
      roughness: 1.0,
      depthWrite: false,
    });

    const maxDirtParticles = 500;
    const dirtClumpsMesh = new THREE.InstancedMesh(clumpGeo, clumpMat, 300);
    const dustPuffsMesh = new THREE.InstancedMesh(puffGeo, puffMat, 200);
    dirtClumpsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dustPuffsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(dirtClumpsMesh);
    scene.add(dustPuffsMesh);

    const dirtParticles = Array.from({ length: maxDirtParticles }, () => ({
      active: false,
      isPuff: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      scale: 1,
      life: 0,
      maxLife: 1,
      rot: new THREE.Vector3(),
      rotSpeed: new THREE.Vector3(),
    }));

    let nextDirtIdx = 0;
    const spawnDirtSplash = (
      x: number,
      y: number,
      z: number,
      forwardDir: THREE.Vector3,
      speedRatio: number,
      count = 2
    ) => {
      for (let p = 0; p < count; p++) {
        const pt = dirtParticles[nextDirtIdx];
        nextDirtIdx = (nextDirtIdx + 1) % maxDirtParticles;

        pt.active = true;
        pt.isPuff = Math.random() < 0.45;
        pt.pos.set(
          x + (Math.random() - 0.5) * 0.9,
          y + 0.12 + Math.random() * 0.15,
          z + (Math.random() - 0.5) * 0.9
        );

        const spraySpeed = (12 + speedRatio * 32) * (0.8 + Math.random() * 0.5);
        pt.vel.set(
          -forwardDir.x * spraySpeed + (Math.random() - 0.5) * 7,
          3.0 + Math.random() * 8.0 * (pt.isPuff ? 0.6 : 1.2),
          -forwardDir.z * spraySpeed + (Math.random() - 0.5) * 7
        );

        pt.scale = pt.isPuff ? 0.6 + Math.random() * 0.7 : 0.4 + Math.random() * 0.5;
        pt.life = 0;
        pt.maxLife = pt.isPuff ? 0.75 + Math.random() * 0.5 : 0.55 + Math.random() * 0.4;
        pt.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        pt.rotSpeed.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      }
    };

    // --- 5. ULTRA-DETAILED 1950s VINTAGE STOCK CAR BUILDER ---
    // Orient: Front Hood points strictly along local +Z axis!
    const createUltraDetailedNASCAR = (
      colorHex: string | number,
      numStr: string,
      isPlayerCar = false,
      textureUrl?: string,
      glbMesh?: THREE.Group | null
    ) => {
      // If custom 3D GLB model was imported via Mod Manager
      if (glbMesh) {
        const customGroup = new THREE.Group();
        const modelClone = glbMesh.clone(true);

        // Normalize scale to standard stock dimensions (~5.2 length, ~2.4 width, ~1.8 height)
        const box = new THREE.Box3().setFromObject(modelClone);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 5.2 / maxDim;
          modelClone.scale.set(scale, scale, scale);
        }
        const center = new THREE.Box3().setFromObject(modelClone).getCenter(new THREE.Vector3());
        modelClone.position.sub(center);
        modelClone.position.y += 0.9;
        modelClone.castShadow = true;
        modelClone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        customGroup.add(modelClone);

        customGroup.userData = {
          frontWheels: [],
          allWheels: [],
          brakeLightMat: null,
          body: modelClone,
          isGlb: true,
        };
        return customGroup;
      }

      const carGroup = new THREE.Group();

      const numTex = createNumberTexture(numStr, colorHex);
      const plateTex = createLicensePlateTexture(numStr);

      const handleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 });

      // Custom Livery Texture if provided by Mod
      let customTexture: THREE.Texture | null = null;
      if (textureUrl) {
        customTexture = new THREE.TextureLoader().load(textureUrl);
        customTexture.wrapS = THREE.RepeatWrapping;
        customTexture.wrapT = THREE.RepeatWrapping;
      }

      // Main Stock Coupe Body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: textureUrl ? 0xffffff : colorHex,
        roughness: 0.22,
        metalness: 0.45,
        map: customTexture || null,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 5.2), bodyMat);
      body.position.y = 0.75;
      body.castShadow = true;
      carGroup.add(body);

      // Chrome Side Body Spear Trim (running full length of car)
      [-1.22, 1.22].forEach(x => {
        const spear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 5.0), handleMat);
        spear.position.set(x, 0.72, 0);
        carGroup.add(spear);
      });

      // Curved Roof Cabin Structure
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.76, 2.45), bodyMat);
      cabin.position.set(0, 1.45, -0.1);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // Roof Chrome Drip Rails
      [-0.98, 0.98].forEach(x => {
        const dripRail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 2.45), handleMat);
        dripRail.position.set(x, 1.84, -0.1);
        carGroup.add(dripRail);
      });

      // Front Slanted Windshield with Chrome Frame
      const windshieldFrame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.72, 0.06), handleMat);
      windshieldFrame.rotation.x = -0.32;
      windshieldFrame.position.set(0, 1.42, 1.15);
      carGroup.add(windshieldFrame);

      const windshieldGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.64), glassMat);
      windshieldGlass.rotation.x = -0.32;
      windshieldGlass.position.set(0, 1.42, 1.18);
      carGroup.add(windshieldGlass);

      // Chrome Windshield Wipers
      [-0.45, 0.45].forEach(x => {
        const wiper = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55), handleMat);
        wiper.rotation.z = 0.4;
        wiper.rotation.x = -0.32;
        wiper.position.set(x, 1.25, 1.22);
        carGroup.add(wiper);
      });

      // Rear Slanted Window with Chrome Frame
      const rearWindowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.68, 0.06), handleMat);
      rearWindowFrame.rotation.x = 0.35;
      rearWindowFrame.position.set(0, 1.42, -1.35);
      carGroup.add(rearWindowFrame);

      const rearWindowGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), glassMat);
      rearWindowGlass.rotation.x = 0.35 + Math.PI;
      rearWindowGlass.position.set(0, 1.42, -1.38);
      carGroup.add(rearWindowGlass);

      // Side Windows with Chrome Trim & Quarter Vent Window Pillars
      [-0.97, 0.97].forEach(x => {
        const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.55), glassMat);
        sideGlass.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
        sideGlass.position.set(x, 1.45, -0.1);
        carGroup.add(sideGlass);

        const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 2.15), handleMat);
        topTrim.position.set(x, 1.74, -0.1);
        carGroup.add(topTrim);

        const bottomTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 2.15), handleMat);
        bottomTrim.position.set(x, 1.16, -0.1);
        carGroup.add(bottomTrim);

        const ventDivider = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.56, 0.03), handleMat);
        ventDivider.position.set(x, 1.45, 0.45);
        carGroup.add(ventDivider);

        const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.56, 0.05), handleMat);
        bPillar.position.set(x, 1.45, -0.3);
        carGroup.add(bPillar);
      });

      // Door Seams / Panels & Chrome Handles with Push-Button Keyholes
      [-1.21, 1.21].forEach(x => {
        const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.72, 1.85), new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 }));
        doorPanel.position.set(x, 0.78, -0.1);
        carGroup.add(doorPanel);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.32), handleMat);
        handle.position.set(x * 1.025, 1.05, -0.2);
        carGroup.add(handle);

        const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), handleMat);
        keyhole.rotation.z = Math.PI / 2;
        keyhole.position.set(x * 1.03, 0.98, -0.2);
        carGroup.add(keyhole);
      });

      // Chrome Hood Spear & Vintage Hood Ornament
      const hoodSpear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 2.2), handleMat);
      hoodSpear.position.set(0, 1.24, 1.4);
      carGroup.add(hoodSpear);

      const hoodOrnament = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), handleMat);
      hoodOrnament.rotation.x = -Math.PI / 2;
      hoodOrnament.position.set(0, 1.27, 2.5);
      carGroup.add(hoodOrnament);

      // Motoramic V8 Livery Decals (No numbers on car body, matching reference photo)
      const liveryTex = createMotoramicLiveryTexture();
      const liveryMat = new THREE.MeshBasicMaterial({ map: liveryTex, transparent: true });

      const leftDoorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), liveryMat);
      leftDoorDecal.rotation.y = -Math.PI / 2;
      leftDoorDecal.position.set(-1.23, 0.8, -0.1);
      carGroup.add(leftDoorDecal);

      const rightDoorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), liveryMat);
      rightDoorDecal.rotation.y = Math.PI / 2;
      rightDoorDecal.position.set(1.23, 0.8, -0.1);
      carGroup.add(rightDoorDecal);

      // Front Chrome Grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.1), handleMat);
      grille.position.set(0, 0.65, 2.55);
      carGroup.add(grille);

      // Front Headlights with Chrome Bezels & Glass Lenses
      const lightLensMat = new THREE.MeshStandardMaterial({ color: 0xfffae0, emissive: 0xfffae0, emissiveIntensity: 1.1, roughness: 0.1 });
      [-0.85, 0.85].forEach(x => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16), handleMat);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(x, 0.75, 2.54);
        carGroup.add(bezel);

        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.13, 16), lightLensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 0.75, 2.56);
        carGroup.add(lens);
      });

      // Front Bumper with Vertical Overriders
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.26, 0.26), handleMat);
      frontBumper.position.set(0, 0.45, 2.64);
      carGroup.add(frontBumper);

      [-0.6, 0.6].forEach(x => {
        const overrider = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.16), handleMat);
        overrider.position.set(x, 0.54, 2.7);
        carGroup.add(overrider);
      });

      // Dynamic Rear Brake Lights & Tail Lights
      const tailLensMat = new THREE.MeshStandardMaterial({
        color: 0xff1111,
        emissive: 0xcc0000,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });

      [-0.88, 0.88].forEach(x => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16), handleMat);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(x, 0.75, -2.54);
        carGroup.add(bezel);

        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.13, 16), tailLensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 0.75, -2.56);
        carGroup.add(lens);
      });

      // Rear Bumper with Overriders & License Plate
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.26, 0.26), handleMat);
      rearBumper.position.set(0, 0.45, -2.64);
      carGroup.add(rearBumper);

      [-0.6, 0.6].forEach(x => {
        const overrider = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.16), handleMat);
        overrider.position.set(x, 0.54, -2.7);
        carGroup.add(overrider);
      });

      const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });
      const licensePlate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), plateMat);
      licensePlate.rotation.y = Math.PI;
      licensePlate.position.set(0, 0.45, -2.78);
      carGroup.add(licensePlate);

      // Dual Side Exhaust Pipes
      [-1.23, 1.23].forEach(x => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12), handleMat);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(x, 0.3, 0.5);
        carGroup.add(pipe);
      });

      // Racing Wheels: Wide Tread Tires with White Sidewall and Chrome Dish Hubcaps
      const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 16);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
      const whitewallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

      const frontWheelGroups: THREE.Group[] = [];
      const allWheelMeshes: THREE.Mesh[] = [];

      const wheelPositions = [
        [-1.25, 0.5, 1.6], [1.25, 0.5, 1.6],   // Front (Left, Right)
        [-1.25, 0.5, -1.6], [1.25, 0.5, -1.6]  // Rear (Left, Right)
      ];

      wheelPositions.forEach((pos, idx) => {
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(pos[0], pos[1], pos[2]);

        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        pivotGroup.add(tire);
        allWheelMeshes.push(tire);

        const whitewall = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.43, 16), whitewallMat);
        whitewall.rotation.z = Math.PI / 2;
        pivotGroup.add(whitewall);

        const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 14), rimMat);
        hubcap.rotation.z = Math.PI / 2;
        pivotGroup.add(hubcap);

        carGroup.add(pivotGroup);
        if (idx < 2) frontWheelGroups.push(pivotGroup);
      });

      carGroup.userData = {
        frontWheels: frontWheelGroups,
        allWheels: allWheelMeshes,
        brakeLightMat: tailLensMat,
        body,
        bodyMat,
      };

      return carGroup;
    };

    // --- 6. 99 CAR GRID SETUP WITH DYNAMIC NASCAR PASSING ATTRIBUTES ---
    const totalCars = 99;
    const cars: any[] = [];
    const paintColors = [
      0xcc0000, 0x1d4ed8, 0x15803d, 0xd97706, 0x7e22ce,
      0xc2410c, 0xf8fafc, 0x1e293b, 0x0284c7, 0xdb2777,
      0x4f46e5, 0x16a34a, 0xea580c, 0x65a30d
    ];
    const playerCarIndex = 40; // POS 41 start out of 99
    let playerCarData: any = null;

    for (let i = 0; i < totalCars; i++) {
      const isPlayer = (i === playerCarIndex);
      const color = isPlayer ? playerColor : paintColors[i % paintColors.length];
      const numDisplay = isPlayer ? carNumber.toString() : (i + 1).toString();
      const mesh = createUltraDetailedNASCAR(
        color,
        numDisplay,
        isPlayer,
        isPlayer ? activeTextureUrl : undefined,
        isPlayer ? activeGlbMesh : undefined
      );
      scene.add(mesh);

      const startProgress = (0.985 - (i * 0.0016)) % 1.0;
      const initialLane = (i % 2 === 0 ? 1 : -1) * (2.0 + (i % 5) * 1.3);

      // Player top speed is 78 MPH, rest of the 98 AI cars go 71 MPH (as requested)
      const car = {
        mesh,
        progress: startProgress,
        totalDistance: startProgress,
        initialProgress: startProgress,
        nextLapDistance: startProgress + 1.0,
        laneOffset: initialLane,
        preferredLane: initialLane,
        temporaryLaneShift: 0,
        targetLaneShift: 0,
        shiftHoldTimer: 0,
        baseSpeedMPH: isPlayer ? topSpeedSetting : 71,
        currentSpeedMPH: isPlayer ? 0 : 71,
        draftBoost: 0,
        overtakeCheckTimer: Math.random() * 0.5,
        lap: 1,
        position: i + 1,
        isPlayer,
        pitCooldown: 25 + (i % 28) * 3,
        inPit: false,
        pitTimer: 0,
        assignedStall: i % totalStalls,
      };

      if (isPlayer) playerCarData = car;
      cars.push(car);
    }

    gameRef.current.scene = scene;
    gameRef.current.cars = cars;
    gameRef.current.playerCar = playerCarData;

    // --- 7. INPUT BINDINGS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      const c = gameRef.current.controls;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') c.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') c.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        soundManager.startEngine();
        c.gas = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') c.brake = true;
      if (e.key === 'p' || e.key === 'P') {
        const next = !c.pit;
        c.pit = next;
        setIsPitRequested(next);
      }
      if (e.key === 'c' || e.key === 'C') {
        cycleCameraMode();
      }
      if (e.key === 'v' || e.key === 'V') {
        cycleWeatherPreset();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const c = gameRef.current.controls;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') c.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') c.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') c.gas = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') c.brake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 8. SYNCHRONIZED TRAFFIC LIGHT COUNTDOWN (3..2..1..GO) ---
    let startTime = performance.now();
    let countdownPhase = 0; // 0=3, 1=2, 2=1, 3=GO

    // Initial position & orientation setup
    const startPt = trackCurve.getPointAt(playerCarData.progress);
    const startTan = trackCurve.getTangentAt(playerCarData.progress);
    const carWorldPos = new THREE.Vector3().copy(startPt);
    let currentHeading = Math.atan2(startTan.x, startTan.z);

    const maxPlayerMPH = topSpeedSetting; // 78 MPH
    const aiBaseMPH = 71;                  // 71 MPH for rest of cars
    let speedMPH = 0;

    const clock = new THREE.Clock();

    let currentSteerAngle = 0;
    let currentDriftYaw = 0;
    let driftDuration = 0;
    let driftSoundPlaying = false;
    let driftNoticeTimeout: NodeJS.Timeout | null = null;

    // Pit stop runtime state for player
    let isPittingActive = false;
    let pitServiceTimer = 0;
    let pitServiceStage = '';
    let pitAssignedStallNum = playerAssignedStallIdx + 1;

    const animate = () => {
      const animId = requestAnimationFrame(animate);
      if (gameRef.current.isPaused || gameRef.current.raceFinished) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const c = gameRef.current.controls;
      const player = gameRef.current.playerCar;
      const now = performance.now();

      // Countdown logic: 3 • ON YOUR MARK -> 2 • GET SET -> 1 • READY -> GO! GO! GO!
      if (!gameRef.current.raceStarted) {
        const elapsedSec = (now - startTime) / 1000;
        const lights = gameRef.current.trafficLights;

        if (elapsedSec < 1.2) {
          if (countdownPhase !== 0) {
            setCountdownText('3 • ON YOUR MARK');
            countdownPhase = 0;
            soundManager.playCountdownBeep(false);
          }
          if (lights) {
            (lights[0].material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
            (lights[0].material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
            (lights[0].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          }
        } else if (elapsedSec < 2.4) {
          if (countdownPhase !== 1) {
            setCountdownText('2 • GET SET');
            countdownPhase = 1;
            soundManager.playCountdownBeep(false);
          }
          if (lights) {
            (lights[1].material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
            (lights[1].material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
            (lights[1].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          }
        } else if (elapsedSec < 3.6) {
          if (countdownPhase !== 2) {
            setCountdownText('1 • READY');
            countdownPhase = 2;
            soundManager.playCountdownBeep(false);
          }
          if (lights) {
            (lights[2].material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
            (lights[2].material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
            (lights[2].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          }
        } else {
          gameRef.current.raceStarted = true;
          setIsRaceStarted(true);
          setCountdownText('GO! GO! GO!');
          soundManager.playCountdownBeep(true);
          soundManager.playGearShift();
          soundManager.startEngine();
          
          if (lights) {
            for (let k = 0; k < 3; k++) {
              (lights[k].material as THREE.MeshStandardMaterial).color.setHex(0x440000);
              (lights[k].material as THREE.MeshStandardMaterial).emissive.setHex(0x220000);
              (lights[k].material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
            }
            (lights[3].material as THREE.MeshStandardMaterial).color.setHex(0x00ff00);
            (lights[3].material as THREE.MeshStandardMaterial).emissive.setHex(0x00ff00);
            (lights[3].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8;
          }

          setTimeout(() => setCountdownText(''), 2000);
        }
      }

      // --- PIT STOP SERVICE LOGIC (PLAYER) ---
      const playerStallInfo = stallInfos[playerAssignedStallIdx];
      const distToAssignedStall = carWorldPos.distanceTo(playerStallInfo.center);
      const isNearPitRoad = (player.progress >= 0.86 || player.progress <= 0.12);

      if (isNearPitRoad) {
        setIsInPitLane(true);
        if (distToAssignedStall < 7.5 && speedMPH < 22 && (c.pit || isPitRequested || isPittingActive)) {
          if (!isPittingActive) {
            isPittingActive = true;
            pitServiceTimer = 0;
            soundManager.playPneumaticWrench();
            setPitServiceStatus({ active: true, stage: 'CHANGING 4 TIRES & INSPECTING SPARK PLUGS', progress: 0, stallNum: pitAssignedStallNum });
            fetchCommentaryRef.current(player.lap, player.position, speedMPH, `Lightning pit stop at Stall #${pitAssignedStallNum}! Changing 4 tires and tuning spark plugs!`);
          }
        }
      } else {
        setIsInPitLane(false);
      }

      if (isPittingActive) {
        speedMPH = 0; // Stationary during pit stop service
        pitServiceTimer += delta;
        const pitProgressRatio = Math.min(1.0, pitServiceTimer / 4.2);

        if (pitServiceTimer > 1.2 && pitServiceTimer - delta <= 1.2) {
          soundManager.playPneumaticWrench(); // Second round of air wrench tightening
          setPitServiceStatus({ active: true, stage: 'INSPECTING SPARK PLUGS & TIMING', progress: 0.5, stallNum: pitAssignedStallNum });
        }
        if (pitServiceTimer > 3.2 && pitServiceTimer - delta <= 3.2) {
          soundManager.playJackDrop(); // Hydraulic jack drops with heavy metallic thud
          setPitServiceStatus({ active: true, stage: 'DROPPING JACK - FRESH TIRES READY!', progress: 0.9, stallNum: pitAssignedStallNum });
        }

        if (pitServiceTimer >= 4.2) {
          isPittingActive = false;
          setIsPitRequested(false);
          c.pit = false;
          setPitServiceStatus(null);
          setFreshTireBuffLaps(2); // Fresh tire grip & spark plug boost for 2 full laps!
          setSparkPlugBoostActive(true);
          setTireWearPct(0); // 100% fresh tires!
          setEngineTempDeg(182); // Engine cooled & tuned!
          soundManager.playDriftReturnBoost();
          speedMPH = 35; // Fast pit exit surge
        }
      }

      // --- PHYSICS & CAR MOVEMENT ---
      const effectiveTopSpeed = maxPlayerMPH + (sparkPlugBoostActive ? 6 : 0);

      if (gameRef.current.raceStarted && !isPittingActive) {
        if (c.gas) {
          speedMPH = Math.min(effectiveTopSpeed, speedMPH + (freshTireBuffLaps > 0 ? 38 : 32) * delta);
          soundManager.updateEngine(speedMPH / effectiveTopSpeed);
        } else if (c.brake) {
          speedMPH = Math.max(0, speedMPH - 45 * delta);
          soundManager.updateEngine(speedMPH / effectiveTopSpeed);
        } else {
          if (speedMPH < (isInPitLane ? 40 : 55)) {
            speedMPH = Math.min(isInPitLane ? 40 : 55, speedMPH + 18 * delta);
          } else {
            speedMPH = Math.max(isInPitLane ? 40 : 55, speedMPH - 8 * delta);
          }
          soundManager.updateEngine(speedMPH / effectiveTopSpeed);
        }
      } else {
        if (c.gas && !isPittingActive) soundManager.updateEngine(0.35);
      }

      // 1. Smooth Steering Input Lag
      let targetSteerInput = 0;
      if (gameRef.current.raceStarted && speedMPH > 2 && !isPittingActive) {
        if (c.left) targetSteerInput = 1;
        else if (c.right) targetSteerInput = -1;
      }
      currentSteerAngle = THREE.MathUtils.lerp(currentSteerAngle, targetSteerInput, 10 * delta);

      // 2. Turn Rate scaled by Speed
      const turnRate = 2.5 * (speedMPH / maxPlayerMPH) * delta;
      currentHeading += currentSteerAngle * turnRate;

      // --- DIRT DRIFT OVER & RETURN PHYSICS ---
      const isHardSteering = Math.abs(currentSteerAngle) > 0.28;
      const isDrifting = isHardSteering && speedMPH > 24 && gameRef.current.raceStarted && !isPittingActive;

      if (isDrifting) {
        driftDuration += delta;
        const targetDriftYaw = -currentSteerAngle * 0.42 * (speedMPH / maxPlayerMPH);
        currentDriftYaw = THREE.MathUtils.lerp(currentDriftYaw, targetDriftYaw, 6 * delta);

        if (driftDuration > 0.25 && !driftSoundPlaying) {
          soundManager.playDriftSound(Math.min(1.0, driftDuration * 1.5));
          driftSoundPlaying = true;
        }
      } else {
        if (driftDuration > 0.45 && Math.abs(currentSteerAngle) < 0.2 && gameRef.current.raceStarted) {
          speedMPH = Math.min(effectiveTopSpeed + 4, speedMPH + 8);
          soundManager.playDriftReturnBoost();
          soundManager.playBackfire();
          setDriftNotification('🔥 DIRT DRIFT RETURN! +8 MPH SLINGSHOT BOOST!');
          if (driftNoticeTimeout) clearTimeout(driftNoticeTimeout);
          driftNoticeTimeout = setTimeout(() => setDriftNotification(''), 2400);
          driftDuration = 0;
          driftSoundPlaying = false;
        } else if (Math.abs(currentSteerAngle) < 0.12) {
          driftDuration = Math.max(0, driftDuration - delta * 2.5);
          driftSoundPlaying = false;
        }
        currentDriftYaw = THREE.MathUtils.lerp(currentDriftYaw, 0, 11 * delta);
      }

      // 3. Front Wheel Visual Turning Animation
      if (player.mesh.userData.frontWheels) {
        player.mesh.userData.frontWheels.forEach((w: THREE.Group) => {
          w.rotation.y = THREE.MathUtils.lerp(w.rotation.y, currentSteerAngle * 0.45, 0.2);
        });
      }

      // Wheel spinning
      const speedMS = speedMPH * 0.44704;
      const wheelSpinDelta = (speedMS / 0.5) * delta;
      if (player.mesh.userData.allWheels && gameRef.current.raceStarted) {
        player.mesh.userData.allWheels.forEach((t: THREE.Mesh) => {
          t.rotation.x += wheelSpinDelta;
        });
      }

      // 4. Vehicle Positioning & Alignment (Track Surface Normal & Movement Vector)
      const forwardMovementDir = new THREE.Vector3(Math.sin(currentHeading), 0, Math.cos(currentHeading)).normalize();

      if (gameRef.current.raceStarted) {
        carWorldPos.addScaledVector(forwardMovementDir, speedMS * delta);
      }

      const trackLength = trackCurve.getLength();
      if (gameRef.current.raceStarted) {
        const advance = (speedMS / trackLength) * delta;
        player.totalDistance += advance;
        player.progress = player.totalDistance % 1.0;

        // Player lap advances strictly one by one upon completing each full circuit
        if (player.totalDistance >= player.nextLapDistance) {
          player.lap += 1;
          player.nextLapDistance += 1.0;
          setLap(player.lap);
          if (player.lap > 500) {
            gameRef.current.raceFinished = true;
            setIsFinished(true);
            soundManager.stopEngine();
          } else {
            fetchCommentaryRef.current(player.lap, player.position, speedMPH, `Completed Lap ${player.lap - 1} of 500`);
          }
        }
      }

      const currentSplinePoint = trackCurve.getPointAt(player.progress);
      const splineTan = trackCurve.getTangentAt(player.progress).normalize();
      const bankAngle = getBankAngle(player.progress);

      // Compute track surface normal and side vectors
      const unbankedSide = new THREE.Vector3().crossVectors(splineTan, new THREE.Vector3(0, 1, 0)).normalize();
      const trackSide = unbankedSide.clone().applyAxisAngle(splineTan, bankAngle).normalize();
      const trackSurfaceNormal = new THREE.Vector3().crossVectors(trackSide, splineTan).normalize();

      // Constrain player lateral displacement within trail bounds
      const toCar = new THREE.Vector3().subVectors(carWorldPos, currentSplinePoint);
      const lateralDist = toCar.dot(unbankedSide);
      const maxBound = trackWidth / 2 - 1.8;

      if (Math.abs(lateralDist) > maxBound) {
        const clamped = Math.sign(lateralDist) * maxBound;
        carWorldPos.copy(currentSplinePoint).addScaledVector(unbankedSide, clamped);
      }

      // Lock height flush to track elevation over hills
      carWorldPos.y = currentSplinePoint.y + 0.1;

      // --- STAGE 1 & 2: ROBUST VEHICLE-TO-VEHICLE 3D PHYSICS COLLISIONS ---
      // Check collision between player and all AI cars
      cars.forEach((otherCar) => {
        if (otherCar.isPlayer) return;
        const otherPos = otherCar.mesh.position;
        const distXZ = Math.hypot(carWorldPos.x - otherPos.x, carWorldPos.z - otherPos.z);
        const collisionThreshold = 3.6; // Stock car body width/length bounding radius

        if (distXZ < collisionThreshold) {
          // Collision detected! Apply physical separation & momentum reaction
          const pushDir = new THREE.Vector3(carWorldPos.x - otherPos.x, 0, carWorldPos.z - otherPos.z).normalize();
          const overlap = collisionThreshold - distXZ;
          
          // Push player away naturally
          carWorldPos.addScaledVector(pushDir, overlap * 0.75);
          
          // Slow down player on impact & play crash sound
          speedMPH = Math.max(10, speedMPH * 0.78);
          soundManager.playCrash();

          // Kick AI car forward/outward as well
          otherCar.currentSpeedMPH = Math.max(20, (otherCar.currentSpeedMPH || 71) * 0.85);
          otherCar.progress += 0.0004 * Math.sign(Math.random() - 0.5);
        }
      });

      player.mesh.position.copy(carWorldPos);

      // Align vehicle up-vector strictly with track surface normal; apply outward drift yaw around track normal
      const carUp = trackSurfaceNormal.clone().normalize();
      const driftedForward = forwardMovementDir.clone().applyAxisAngle(carUp, currentDriftYaw);
      const carForward = driftedForward.clone().sub(carUp.clone().multiplyScalar(driftedForward.dot(carUp))).normalize();
      const carRight = new THREE.Vector3().crossVectors(carUp, carForward).normalize();
      const carForwardOrtho = new THREE.Vector3().crossVectors(carRight, carUp).normalize();

      const playerOrientMatrix = new THREE.Matrix4().makeBasis(carRight, carUp, carForwardOrtho);
      player.mesh.quaternion.setFromRotationMatrix(playerOrientMatrix);

      // Gently align heading toward track tangent
      const targetHeading = Math.atan2(splineTan.x, splineTan.z);
      currentHeading = THREE.MathUtils.lerp(currentHeading, targetHeading, 0.035 * (speedMPH / maxPlayerMPH));

      // Dynamic Brake Lights: Intense red glow when braking
      if (player.mesh.userData.brakeLightMat) {
        player.mesh.userData.brakeLightMat.emissiveIntensity = c.brake ? 3.0 : 0.8;
        player.mesh.userData.brakeLightMat.color.setHex(c.brake ? 0xff2222 : 0xff0000);
      }

      // --- DIRT SPLASH EMISSION (PLAYER CAR) ---
      if (gameRef.current.raceStarted && speedMPH > 3) {
        const rearCenter = carWorldPos.clone().addScaledVector(forwardMovementDir, -2.4);
        const sprayRate = Math.min(5, Math.max(1, Math.floor(speedMPH / 16))) + (isDrifting ? 3 : 0);
        const leftTirePos = rearCenter.clone().addScaledVector(unbankedSide, -1.1);
        spawnDirtSplash(leftTirePos.x, leftTirePos.y, leftTirePos.z, forwardMovementDir, speedMPH / maxPlayerMPH, sprayRate);
        const rightTirePos = rearCenter.clone().addScaledVector(unbankedSide, 1.1);
        spawnDirtSplash(rightTirePos.x, rightTirePos.y, rightTirePos.z, forwardMovementDir, speedMPH / maxPlayerMPH, sprayRate);
      }

      // --- DYNAMIC NASCAR PASSING & OVERTAKING AI FOR ALL 66 CARS ---
      // Logic detects if an opponent is blocked by another car ahead in their lane corridor
      // and calculates a temporary lane shift (offset adjustment) to attempt an overtake
      cars.forEach((car) => {
        if (!car.isPlayer) {
          if (gameRef.current.raceStarted) {
            car.overtakeCheckTimer -= delta;

            if (car.overtakeCheckTimer <= 0) {
              car.overtakeCheckTimer = 0.28 + Math.random() * 0.32;

              // Scan for cars directly ahead in forward lane corridor
              let isBlocked = false;
              let blockingCar = null;
              let closestDiff = 0.034; // ~50 meters along spline

              for (let j = 0; j < cars.length; j++) {
                const other = cars[j];
                if (other === car) continue;

                let diffProgress = other.progress - car.progress;
                if (diffProgress < -0.5) diffProgress += 1.0;

                if (diffProgress > 0.0008 && diffProgress < closestDiff) {
                  const currentCarLane = car.laneOffset;
                  const otherLane = other.isPlayer ? lateralDist : other.laneOffset;
                  const lateralGap = Math.abs(currentCarLane - otherLane);

                  // Car is directly ahead in our corridor blocking our way
                  if (lateralGap < 2.6) {
                    isBlocked = true;
                    blockingCar = other;
                    closestDiff = diffProgress;
                  }
                }
              }

              if (isBlocked && blockingCar) {
                // Draft slipstream boost (+3.8 MPH)
                car.draftBoost = THREE.MathUtils.lerp(car.draftBoost || 0, 3.8, 0.45);

                // Calculate temporary lane shift (offset adjustment) to attempt overtake
                const currentLane = car.preferredLane;
                const shiftLeftTarget = currentLane - 3.8;
                const shiftRightTarget = currentLane + 3.8;
                const maxTrackBound = trackWidth / 2 - 2.8;

                const canPassLeft = shiftLeftTarget >= -maxTrackBound;
                const canPassRight = shiftRightTarget <= maxTrackBound;

                // Check if adjacent lanes have traffic
                let leftClear = canPassLeft;
                let rightClear = canPassRight;

                for (let k = 0; k < cars.length; k++) {
                  const cTest = cars[k];
                  if (cTest === car || cTest === blockingCar) continue;
                  let dProg = cTest.progress - car.progress;
                  if (dProg < -0.5) dProg += 1.0;
                  if (Math.abs(dProg) < 0.022) {
                    const testLane = cTest.isPlayer ? lateralDist : cTest.laneOffset;
                    if (Math.abs(testLane - shiftLeftTarget) < 2.2) leftClear = false;
                    if (Math.abs(testLane - shiftRightTarget) < 2.2) rightClear = false;
                  }
                }

                // Choose best clear lane for overtake: prefer inside passing line in NASCAR
                if (leftClear && (!rightClear || Math.random() < 0.65)) {
                  car.targetLaneShift = -3.8; // Overtake on the inside line
                  car.shiftHoldTimer = 2.4 + Math.random() * 1.5;
                } else if (rightClear) {
                  car.targetLaneShift = 3.8;  // Overtake on the outside high-groove
                  car.shiftHoldTimer = 2.4 + Math.random() * 1.5;
                } else if (canPassLeft) {
                  car.targetLaneShift = -2.8;
                  car.shiftHoldTimer = 1.6;
                } else if (canPassRight) {
                  car.targetLaneShift = 2.8;
                  car.shiftHoldTimer = 1.6;
                }
              } else {
                // Not blocked
                if (car.shiftHoldTimer > 0) {
                  car.shiftHoldTimer -= delta;
                } else {
                  // Decay temporary lane shift back to 0 (return to preferred line)
                  car.targetLaneShift = 0;
                  car.draftBoost = Math.max(0, (car.draftBoost || 0) - delta * 2.2);
                }
              }
            }

            // Smoothly lerp temporary lane shift (offset adjustment)
            car.temporaryLaneShift = THREE.MathUtils.lerp(
              car.temporaryLaneShift || 0,
              car.targetLaneShift || 0,
              2.8 * delta
            );
            car.laneOffset = car.preferredLane + car.temporaryLaneShift;

            // Rest of cars go 71 MPH (with drafting boosts during passing)
            car.currentSpeedMPH = 71 + (car.draftBoost || 0) + (Math.sin(now * 0.0012 + car.mesh.id) * 0.8);

            // AI Pitting logic: periodically divert into pit lane
            car.pitCooldown -= delta;
            if (car.pitCooldown <= 0 && !car.inPit && (car.progress >= 0.88 || car.progress <= 0.05)) {
              car.inPit = true;
              car.pitTimer = 0;
              car.pitCooldown = 180 + Math.random() * 120; // 3-5 min cooldown
            }

            if (car.inPit) {
              car.pitTimer += delta;
              car.currentSpeedMPH = 35; // Pit speed limit
              if (car.pitTimer >= 4.0) {
                car.inPit = false;
              }
            }

            const aiSpeedMS = car.currentSpeedMPH * 0.44704;
            const aiAdvance = (aiSpeedMS / trackLength) * delta;
            car.totalDistance += aiAdvance;
            car.progress = car.totalDistance % 1.0;

            // AI laps advance strictly one by one upon completing each full circuit
            if (car.totalDistance >= car.nextLapDistance) {
              car.lap += 1;
              car.nextLapDistance += 1.0;
            }

            // Spawn dirt splash from nearby AI cars
            const pt = trackCurve.getPointAt(car.progress);
            const distToPlayer = pt.distanceTo(carWorldPos);
            if (distToPlayer < 110 && Math.random() < 0.5) {
              const tan = trackCurve.getTangentAt(car.progress).normalize();
              const aiRear = pt.clone().addScaledVector(tan, -2.4);
              spawnDirtSplash(aiRear.x, aiRear.y, aiRear.z, tan, car.currentSpeedMPH / 75, 1);
            }
          }

          const pt = trackCurve.getPointAt(car.progress);
          const tan = trackCurve.getTangentAt(car.progress).normalize();
          const aiBank = getBankAngle(car.progress);
          const aiUnbankedSide = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
          const aiTrackSide = aiUnbankedSide.clone().applyAxisAngle(tan, aiBank).normalize();
          const aiTrackNormal = new THREE.Vector3().crossVectors(aiTrackSide, tan).normalize();

          // If AI is in pit, route through pit lane at offset +24m
          const effectiveLaneOffset = car.inPit ? 24.0 : car.laneOffset;
          const aiPos = new THREE.Vector3().copy(pt).addScaledVector(aiUnbankedSide, effectiveLaneOffset);
          aiPos.y = pt.y + 0.1;
          car.mesh.position.copy(aiPos);

          // Dynamic AI corner powerslide on banked turns
          const aiCornerSlide = Math.abs(aiBank) > 0.12 ? -Math.sign(aiBank) * 0.08 : 0;

          // Align AI up-vector strictly with track surface normal & forward movement vector
          const aiUp = aiTrackNormal.clone().normalize();
          const aiDriftTan = tan.clone().applyAxisAngle(aiUp, aiCornerSlide);
          const aiForward = aiDriftTan.clone().sub(aiUp.clone().multiplyScalar(aiDriftTan.dot(aiUp))).normalize();
          const aiRight = new THREE.Vector3().crossVectors(aiUp, aiForward).normalize();
          const aiForwardOrtho = new THREE.Vector3().crossVectors(aiRight, aiUp).normalize();

          const aiOrientMatrix = new THREE.Matrix4().makeBasis(aiRight, aiUp, aiForwardOrtho);
          car.mesh.quaternion.setFromRotationMatrix(aiOrientMatrix);

          // Spin AI wheels
          if (car.mesh.userData.allWheels && gameRef.current.raceStarted) {
            const aiWheelSpin = ((car.currentSpeedMPH || 71) * 0.44704 / 0.5) * delta;
            car.mesh.userData.allWheels.forEach((t: THREE.Mesh) => {
              t.rotation.x += aiWheelSpin;
            });
          }
        }
      });

      // --- DIRT SPLASH PARTICLES SIMULATION & RENDERING ---
      const dummyParticle = new THREE.Object3D();
      let clumpCount = 0;
      let puffCount = 0;

      for (let i = 0; i < maxDirtParticles; i++) {
        const p = dirtParticles[i];
        if (!p.active) continue;

        p.life += delta;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        if (p.isPuff) {
          p.scale *= 1.025;
          p.vel.multiplyScalar(0.96);
        } else {
          p.vel.y -= 25.0 * delta;
        }

        p.pos.addScaledVector(p.vel, delta);
        p.rot.x += p.rotSpeed.x * delta;
        p.rot.y += p.rotSpeed.y * delta;

        const progressRatio = p.life / p.maxLife;
        const curScale = p.scale * (1.0 - progressRatio * 0.7);

        dummyParticle.position.copy(p.pos);
        dummyParticle.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummyParticle.scale.set(curScale, curScale, curScale);
        dummyParticle.updateMatrix();

        if (p.isPuff) {
          if (puffCount < 200) {
            dustPuffsMesh.setMatrixAt(puffCount++, dummyParticle.matrix);
          }
        } else {
          if (clumpCount < 300) {
            dirtClumpsMesh.setMatrixAt(clumpCount++, dummyParticle.matrix);
          }
        }
      }

      // Hide unused instanced particle meshes
      dummyParticle.scale.set(0, 0, 0);
      dummyParticle.updateMatrix();
      for (let k = clumpCount; k < 300; k++) dirtClumpsMesh.setMatrixAt(k, dummyParticle.matrix);
      for (let k = puffCount; k < 200; k++) dustPuffsMesh.setMatrixAt(k, dummyParticle.matrix);

      dirtClumpsMesh.instanceMatrix.needsUpdate = true;
      dustPuffsMesh.instanceMatrix.needsUpdate = true;

      // Standings calculation based on strictly continuous, monotonic totalDistance traveled
      cars.sort((a, b) => b.totalDistance - a.totalDistance);
      cars.forEach((c, idx) => {
        c.position = idx + 1;
      });

      if (gameRef.current.raceStarted) {
        setSpeed(Math.round(speedMPH));

        // Position updates strictly one-by-one with smooth ticking
        const targetPos = player.position;
        if (displayedPositionRef.current !== targetPos) {
          if (now - lastPosStepTimeRef.current > 130) {
            if (displayedPositionRef.current > targetPos) {
              // Gaining position (overtaking)! e.g. 41 -> 40 -> 39
              displayedPositionRef.current -= 1;
              setPosition(displayedPositionRef.current);
              soundManager.playOvertakeBlip();
              setOvertakeNotice({ pos: displayedPositionRef.current, direction: 'up' });
              if (overtakeNoticeTimeoutRef.current) clearTimeout(overtakeNoticeTimeoutRef.current);
              overtakeNoticeTimeoutRef.current = setTimeout(() => setOvertakeNotice(null), 1200);
            } else if (displayedPositionRef.current < targetPos) {
              // Losing position! e.g. 39 -> 40
              displayedPositionRef.current += 1;
              setPosition(displayedPositionRef.current);
              setOvertakeNotice({ pos: displayedPositionRef.current, direction: 'down' });
              if (overtakeNoticeTimeoutRef.current) clearTimeout(overtakeNoticeTimeoutRef.current);
              overtakeNoticeTimeoutRef.current = setTimeout(() => setOvertakeNotice(null), 1200);
            }
            lastPosStepTimeRef.current = now;
          }
        }
      }

      // Player Drafting & Side-Drafting Telemetry Check
      let draftingFound = false;
      let sideDraftingFound = false;
      for (let j = 0; j < cars.length; j++) {
        const other = cars[j];
        if (other.isPlayer) continue;
        const dProg = (other.progress - player.progress + 1.0) % 1.0;
        if (dProg > 0.0004 && dProg < 0.0035) { // Within ~35 meters ahead
          const lateralGap = Math.abs(other.laneOffset - lateralDist);
          if (lateralGap < 2.5) {
            draftingFound = true;
          } else if (lateralGap < 4.2 && dProg < 0.0012) {
            sideDraftingFound = true;
          }
        }
      }
      setIsDraftingActive(draftingFound);
      setIsSideDrafting(sideDraftingFound);

      // Speed-dependent motion vibration / camera shake
      const speedRatio = Math.min(1.0, speedMPH / maxPlayerMPH);
      const camShakeX = (Math.random() - 0.5) * speedRatio * 0.12;
      const camShakeY = (Math.random() - 0.5) * speedRatio * 0.12;

      // Multi-Camera Perspective Logic (Chase, Cockpit / Hood, Roof, TV Broadcast)
      const activeCamMode = cameraModeRef.current;
      const camTargetPos = new THREE.Vector3();
      const camLookTarget = new THREE.Vector3();

      if (activeCamMode === 'cockpit') {
        // Hood / Windshield Cockpit POV
        camTargetPos.copy(carWorldPos).add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(forwardMovementDir, 0.6);
        camLookTarget.copy(carWorldPos).add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(forwardMovementDir, 35);
      } else if (activeCamMode === 'roof') {
        // Roof Camera POV
        camTargetPos.copy(carWorldPos).add(new THREE.Vector3(0, 1.88, 0)).addScaledVector(forwardMovementDir, -0.2);
        camLookTarget.copy(carWorldPos).add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(forwardMovementDir, 45);
      } else if (activeCamMode === 'tv') {
        // Broadcast TV Trackside Canyon Camera
        const tvPt = trackCurve.getPointAt((player.progress + 0.04) % 1.0);
        const tvTan = trackCurve.getTangentAt((player.progress + 0.04) % 1.0).normalize();
        const tvSide = new THREE.Vector3().crossVectors(tvTan, new THREE.Vector3(0, 1, 0)).normalize();
        camTargetPos.copy(tvPt).addScaledVector(tvSide, 32).add(new THREE.Vector3(0, 18, 0));
        camLookTarget.copy(carWorldPos).add(new THREE.Vector3(0, 1.5, 0));
      } else {
        // Default Chase Camera (-15m behind, +5m above)
        camTargetPos.copy(forwardMovementDir).multiplyScalar(-15).add(carWorldPos).add(new THREE.Vector3(camShakeX, 5 + camShakeY, 0));
        camLookTarget.copy(carWorldPos).add(new THREE.Vector3(0, 1.5, 0));
      }

      camera.position.lerp(camTargetPos, activeCamMode === 'tv' ? 0.06 : 0.18);
      camera.lookAt(camLookTarget);

      renderer.render(scene, camera);
    };

    const animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      soundManager.stopEngine();
      renderer.dispose();
    };
  }, [playerColor, carNumber, topSpeedSetting, activeTextureUrl, activeGlbMesh]);

  const handleApplyModInGame = (config: CarModConfig) => {
    setActiveModName(config.modName);
    if (config.customTextureUrl) setActiveTextureUrl(config.customTextureUrl);
    if (config.customGlbMesh) setActiveGlbMesh(config.customGlbMesh);

    const player = gameRef.current.playerCar;
    if (player && player.mesh && gameRef.current.scene) {
      if (config.customGlbMesh) {
        const oldPos = player.mesh.position.clone();
        const oldQuat = player.mesh.quaternion.clone();
        gameRef.current.scene.remove(player.mesh);

        const customGroup = new THREE.Group();
        const modelClone = config.customGlbMesh.clone(true);
        const box = new THREE.Box3().setFromObject(modelClone);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 5.2 / maxDim;
          modelClone.scale.set(scale, scale, scale);
        }
        const center = new THREE.Box3().setFromObject(modelClone).getCenter(new THREE.Vector3());
        modelClone.position.sub(center);
        modelClone.position.y += 0.9;
        modelClone.castShadow = true;
        customGroup.add(modelClone);
        customGroup.position.copy(oldPos);
        customGroup.quaternion.copy(oldQuat);
        customGroup.userData = { frontWheels: [], allWheels: [], brakeLightMat: null, body: modelClone };

        gameRef.current.scene.add(customGroup);
        player.mesh = customGroup;
      } else if (player.mesh.userData?.bodyMat) {
        if (config.customTextureUrl) {
          const tex = new THREE.TextureLoader().load(config.customTextureUrl);
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          player.mesh.userData.bodyMat.map = tex;
          player.mesh.userData.bodyMat.needsUpdate = true;
        }
        if (config.playerColor) {
          player.mesh.userData.bodyMat.color.set(config.playerColor);
          player.mesh.userData.bodyMat.needsUpdate = true;
        }
      }
    }
  };

  const bindBtn = (key: 'left' | 'right' | 'gas' | 'brake', isDown: boolean) => {
    gameRef.current.controls[key] = isDown;
    if (key === 'gas' && isDown) soundManager.startEngine();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* COUNTDOWN OVERLAY */}
      {countdownText && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center p-4">
          <div className={`text-4xl sm:text-6xl md:text-8xl font-black text-center drop-shadow-[0_10px_30px_rgba(0,0,0,0.95)] tracking-widest uppercase transition-all duration-300 ${
            countdownText.includes('GO') ? 'text-emerald-400 scale-110 animate-bounce' : 'text-amber-400 animate-pulse'
          }`}>
            {countdownText}
          </div>
        </div>
      )}

      {/* DIRT DRIFT OVER & RETURN NOTIFICATION */}
      {driftNotification && (
        <div className="absolute top-36 left-1/2 transform -translate-x-1/2 pointer-events-none z-30">
          <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white font-black px-6 py-2.5 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.8)] border-2 border-yellow-300 text-sm sm:text-lg uppercase tracking-wider animate-bounce flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            {driftNotification}
          </div>
        </div>
      )}

      {/* DRAFTING & SIDE-DRAFTING TELEMETRY BADGE */}
      {(isDraftingActive || isSideDrafting) && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 pointer-events-none z-30">
          <div className="bg-slate-900/90 border-2 border-amber-400 text-amber-300 font-black px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.6)] text-xs uppercase tracking-wider flex items-center gap-2 animate-pulse">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            {isSideDrafting ? 'DOOR-TO-DOOR SIDE-DRAFTING!' : 'AERODYNAMIC SLIPSTREAM DRAFT! (+2.5 MPH)'}
          </div>
        </div>
      )}

      {/* OVERTAKE 1-BY-1 STEP BANNER */}
      {overtakeNotice && overtakeNotice.direction === 'up' && (
        <div className="absolute top-24 left-4 pointer-events-none z-30 animate-bounce">
          <div className="bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-black px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.5)] text-xs uppercase tracking-wider flex items-center gap-2">
            <span className="text-emerald-400 font-black">▲ PASS!</span>
            <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black text-xs">P{overtakeNotice.pos}</span>
          </div>
        </div>
      )}

      {/* TOP HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-20">
        <div className="flex gap-3">
          <div className={`bg-slate-900/90 border-2 px-5 py-2.5 rounded-xl shadow-xl flex flex-col items-center transition-all duration-200 ${
            overtakeNotice?.direction === 'up'
              ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] scale-105'
              : overtakeNotice?.direction === 'down'
              ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
              : 'border-amber-500'
          }`}>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              Position
              {overtakeNotice?.direction === 'up' && <span className="text-emerald-400 text-[10px] font-black animate-pulse">▲ +1</span>}
              {overtakeNotice?.direction === 'down' && <span className="text-rose-400 text-[10px] font-black animate-pulse">▼ -1</span>}
            </span>
            <div className={`text-2xl font-black transition-colors ${
              overtakeNotice?.direction === 'up' ? 'text-emerald-300' : 'text-amber-400'
            }`}>
              {position} <span className="text-xs text-slate-400">/ 99</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border-2 border-amber-500 px-5 py-2.5 rounded-xl shadow-xl flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lap</span>
            <div className="text-2xl font-black text-sky-400">
              {Math.min(500, lap)} <span className="text-xs text-slate-400">/ 500</span>
            </div>
          </div>

          {/* RACE CONTROL FLAG STATUS */}
          <div className="bg-emerald-950/90 border-2 border-emerald-400 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <Flag className="w-4 h-4 text-emerald-400 fill-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider">Race Control</span>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">GREEN FLAG</span>
            </div>
          </div>

          <button
            onClick={() => {
              const next = !isPitRequested;
              setIsPitRequested(next);
              gameRef.current.controls.pit = next;
            }}
            className={`border-2 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-black text-xs uppercase tracking-wider transition-all pointer-events-auto ${
              isInPitLane
                ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                : 'bg-slate-900/90 text-amber-400 border-amber-500 hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" /> {isInPitLane ? 'PIT STALL #3' : 'ENTER PIT'}
          </button>
        </div>

        {/* SPEED & TELEMETRY GAUGES */}
        <div className="flex gap-3">
          <div className="bg-slate-900/90 border-2 border-amber-500 px-4 py-2 rounded-xl shadow-xl hidden md:flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Tires</span>
              <span className="text-xs font-black text-emerald-400">{freshTireBuffLaps > 0 ? '100% FRESH' : 'GOOD'}</span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Engine</span>
              <span className="text-xs font-black text-amber-400">{sparkPlugBoostActive ? '182°F TUNED' : '195°F NORM'}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border-2 border-amber-500 px-6 py-2.5 rounded-xl shadow-xl flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Speed</span>
            <div className="text-3xl font-black text-emerald-400 leading-none">
              {speed} <span className="text-xs text-slate-400">MPH</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={cycleCameraMode}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl border border-slate-700 shadow-lg font-black text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            title="Cycle Camera View (Chase, Cockpit, Roof, TV Broadcast)"
          >
            <Video className="w-4 h-4 text-sky-400" />
            <span className="uppercase text-[10px] hidden sm:inline">{cameraMode}</span>
          </button>
          <button
            onClick={cycleWeatherPreset}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl border border-slate-700 shadow-lg font-black text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            title="Cycle Environment Weather & Sky (Sunset, Night, Fog, Day)"
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="uppercase text-[10px] hidden sm:inline">{envPreset}</span>
          </button>
          <button
            onClick={() => setIsModModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2.5 rounded-xl border border-amber-300 shadow-lg font-black text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            title="Open Car Mod Center & 3D Imports"
          >
            <Sparkles className="w-3.5 h-3.5" /> MODS
          </button>
          <button
            onClick={() => {
              const muted = !isMuted;
              setIsMuted(muted);
              soundManager.setMuted(muted);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl border border-slate-700 shadow-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => {
              const next = !isPaused;
              setIsPaused(next);
              gameRef.current.isPaused = next;
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl border border-slate-700 shadow-lg"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* AI COMMENTARY BANNER */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 pointer-events-none z-20 w-11/12 max-w-xl">
        <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-200 italic">
            &ldquo;{commentary}&rdquo;
          </p>
        </div>
      </div>

      {/* CONTROLS OVERLAY */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none z-20">
        <div className="flex gap-3 pointer-events-auto">
          <button
            className="w-16 h-16 bg-slate-900/90 border-2 border-slate-600 rounded-2xl text-white text-2xl font-black flex items-center justify-center active:bg-amber-500 active:text-slate-950 shadow-xl"
            onMouseDown={() => bindBtn('left', true)}
            onMouseUp={() => bindBtn('left', false)}
            onTouchStart={() => bindBtn('left', true)}
            onTouchEnd={() => bindBtn('left', false)}
          >
            &#9664;
          </button>
          <button
            className="w-16 h-16 bg-slate-900/90 border-2 border-slate-600 rounded-2xl text-white text-2xl font-black flex items-center justify-center active:bg-amber-500 active:text-slate-950 shadow-xl"
            onMouseDown={() => bindBtn('right', true)}
            onMouseUp={() => bindBtn('right', false)}
            onTouchStart={() => bindBtn('right', true)}
            onTouchEnd={() => bindBtn('right', false)}
          >
            &#9654;
          </button>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <button
            className="w-20 h-24 bg-rose-950/90 border-2 border-rose-500 rounded-2xl text-rose-300 font-black flex flex-col items-center justify-center active:bg-rose-600 active:text-white shadow-xl text-xs uppercase"
            onMouseDown={() => bindBtn('brake', true)}
            onMouseUp={() => bindBtn('brake', false)}
            onTouchStart={() => bindBtn('brake', true)}
            onTouchEnd={() => bindBtn('brake', false)}
          >
            <span>BRAKE</span>
          </button>
          <button
            className="w-22 h-26 bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl text-emerald-300 font-black flex flex-col items-center justify-center active:bg-emerald-600 active:text-slate-950 shadow-xl text-sm uppercase"
            onMouseDown={() => bindBtn('gas', true)}
            onMouseUp={() => bindBtn('gas', false)}
            onTouchStart={() => bindBtn('gas', true)}
            onTouchEnd={() => bindBtn('gas', false)}
          >
            <span>GAS</span>
            <span className="text-[9px] text-emerald-400">MAX {topSpeedSetting}</span>
          </button>
        </div>
      </div>

      {/* PAUSE MENU */}
      {isPaused && !isFinished && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-center justify-center p-6 text-white">
          <div className="bg-slate-900 border-2 border-amber-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <h2 className="text-3xl font-black text-amber-400 mb-6 uppercase">Race Paused</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setIsPaused(false);
                  gameRef.current.isPaused = false;
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-xl shadow-lg"
              >
                RESUME
              </button>
              <button
                onClick={() => setIsModModalOpen(true)}
                className="w-full bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500 text-amber-300 font-black py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> CAR MOD CENTER
              </button>
              <button
                onClick={onReturnToMenu}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 rounded-xl shadow-lg"
              >
                GARAGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINISH SCREEN */}
      {isFinished && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg z-50 flex items-center justify-center p-6 text-white">
          <div className="bg-slate-900 border-2 border-amber-500 p-10 rounded-3xl max-w-lg w-full text-center shadow-2xl">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-amber-400 mb-2 uppercase">Checkered Flag!</h1>
            <p className="text-xl text-slate-300 mb-6">Driver: <span className="font-bold text-white">{driverName}</span> (#{carNumber})</p>
            <p className="text-2xl font-black text-sky-400 mb-8">You finished in Place #{position} out of 99 Cars after 500 Laps!</p>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> RACE AGAIN
              </button>
              <button
                onClick={onReturnToMenu}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 rounded-xl shadow-lg"
              >
                GARAGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOD MANAGER MODAL */}
      <ModManagerModal
        isOpen={isModModalOpen}
        onClose={() => setIsModModalOpen(false)}
        currentConfig={{
          modName: activeModName,
          driverName: driverName,
          carNumber: carNumber,
          playerColor: playerColor,
          topSpeedSetting: topSpeedSetting,
          customTextureUrl: activeTextureUrl,
          customGlbMesh: activeGlbMesh,
        }}
        onApplyMod={handleApplyModInGame}
      />
    </div>
  );
}
