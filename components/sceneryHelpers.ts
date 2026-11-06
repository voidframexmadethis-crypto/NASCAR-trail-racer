import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// --- 1. PROCEDURAL PBR TEXTURES (HIGH ANISOTROPY & ZERO 404s) ---

export function createDetailedDirtTrailTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base packed earth
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#54361c');
    grad.addColorStop(0.12, '#6c4625');
    grad.addColorStop(0.26, '#3e2410'); // Left tire rut
    grad.addColorStop(0.38, '#634023');
    grad.addColorStop(0.5, '#5c3a20');  // Trail center crown
    grad.addColorStop(0.62, '#634023');
    grad.addColorStop(0.74, '#3e2410'); // Right tire rut
    grad.addColorStop(0.88, '#6c4625');
    grad.addColorStop(1, '#54361c');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine gravel, sand granules, and clay micro-texture
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 28;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.6));
    }
    ctx.putImageData(imgData, 0, 0);

    // Tread groove cross-hatching in tire ruts
    ctx.strokeStyle = 'rgba(30, 16, 6, 0.4)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 1024; y += 18) {
      // Left track
      ctx.beginPath();
      ctx.moveTo(220, y);
      ctx.lineTo(320, y + 8);
      ctx.stroke();

      // Right track
      ctx.beginPath();
      ctx.moveTo(704, y);
      ctx.lineTo(804, y + 8);
      ctx.stroke();
    }

    // Scattered loose pebbles and gravel stones
    for (let p = 0; p < 180; p++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 1024;
      const rad = 2 + Math.random() * 5;
      ctx.fillStyle = Math.random() < 0.6 ? '#2b1b11' : '#947a61';
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

export function createDetailedGrassTerrainTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#223d13'; // Mountain pasture deep green
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 36;
      data[i] = Math.max(0, Math.min(255, data[i] + n * 0.7));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));   // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.4)); // B
    }
    ctx.putImageData(imgData, 0, 0);

    // Wild grass tufts and wildflower accents
    for (let j = 0; j < 90; j++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      ctx.fillStyle = Math.random() < 0.8 ? '#2e5718' : '#3f6820';
      ctx.fillRect(gx, gy, 3 + Math.random() * 4, 3 + Math.random() * 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

export function createSkidMarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, 'rgba(18, 12, 8, 0)');
    grad.addColorStop(0.25, 'rgba(18, 12, 8, 0.75)');
    grad.addColorStop(0.75, 'rgba(18, 12, 8, 0.75)');
    grad.addColorStop(1, 'rgba(18, 12, 8, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 128);

    // Fine longitudinal tread ribbing
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(16, 0, 6, 128);
    ctx.fillRect(32, 0, 6, 128);
    ctx.fillRect(48, 0, 6, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

// --- 2. HISTORICAL 1940s–1950s ARCHITECTURE & COUNTRYSIDE ASSETS ---

// Weathered Red Rural Barn with corrugated roof and silo
export function createVintageBarn(): THREE.Group {
  const barn = new THREE.Group();

  // Barn Main Structure
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x8b2518, // Rustic barn red
    roughness: 0.9,
    metalness: 0.05,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Weathered corrugated galvanized tin
    roughness: 0.55,
    metalness: 0.75,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // White painted wooden trim
    roughness: 0.85,
  });

  const baseBuilding = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 34), wallMat);
  baseBuilding.position.y = 6;
  baseBuilding.castShadow = true;
  baseBuilding.receiveShadow = true;
  barn.add(baseBuilding);

  // Gambrel Roof Slopes
  const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(13, 0.4, 35), roofMat);
  roofLeft.rotation.z = 0.58;
  roofLeft.position.set(-5.6, 14.8, 0);
  roofLeft.castShadow = true;
  barn.add(roofLeft);

  const roofRight = new THREE.Mesh(new THREE.BoxGeometry(13, 0.4, 35), roofMat);
  roofRight.rotation.z = -0.58;
  roofRight.position.set(5.6, 14.8, 0);
  roofRight.castShadow = true;
  barn.add(roofRight);

  // Gable Peak Wall Filler
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-11, 0);
  gableShape.lineTo(0, 6.5);
  gableShape.lineTo(11, 0);
  gableShape.closePath();
  const extrudeSettings = { depth: 0.4, bevelEnabled: false };
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, extrudeSettings);

  const frontGable = new THREE.Mesh(gableGeo, wallMat);
  frontGable.position.set(0, 12, 17);
  barn.add(frontGable);

  const backGable = new THREE.Mesh(gableGeo, wallMat);
  backGable.position.set(0, 12, -17.4);
  barn.add(backGable);

  // White Cross-Braced Double Doors
  const doorGroup = new THREE.Group();
  const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 8, 0.2), trimMat);
  doorLeft.position.set(-2.2, 4, 17.2);
  doorGroup.add(doorLeft);

  const doorRight = new THREE.Mesh(new THREE.BoxGeometry(4.2, 8, 0.2), trimMat);
  doorRight.position.set(2.2, 4, 17.2);
  doorGroup.add(doorRight);

  // Cross braces (X shape)
  [-2.2, 2.2].forEach((x) => {
    const brace1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 9.2, 0.24), wallMat);
    brace1.rotation.z = 0.52;
    brace1.position.set(x, 4, 17.25);
    doorGroup.add(brace1);

    const brace2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 9.2, 0.24), wallMat);
    brace2.rotation.z = -0.52;
    brace2.position.set(x, 4, 17.25);
    doorGroup.add(brace2);
  });
  barn.add(doorGroup);

  // Tall Cylindrical Grain Silo
  const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.4 });
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 22, 16), siloMat);
  silo.position.set(15, 11, -8);
  silo.castShadow = true;
  barn.add(silo);

  const siloDome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
  siloDome.position.set(15, 22, -8);
  barn.add(siloDome);

  return barn;
}

// 1950s Rural Gas Station with retro fuel pumps and illuminated signs
export function createVintageGasStation(): THREE.Group {
  const station = new THREE.Group();

  const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.85 });
  const canopyRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }); // Vintage blue
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.08 });
  const pumpRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.3 }); // Texaco red

  // Main Station Building
  const building = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 12), stuccoMat);
  building.position.set(0, 3.25, -6);
  building.castShadow = true;
  station.add(building);

  // Large Service Bay Windows
  const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7 });
  const bayWindow = new THREE.Mesh(new THREE.BoxGeometry(10, 3.5, 0.2), windowMat);
  bayWindow.position.set(0, 3.5, 0.1);
  station.add(bayWindow);

  // Canopy extending over pump island
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 14), canopyRoofMat);
  canopy.position.set(0, 7.5, 6);
  canopy.castShadow = true;
  station.add(canopy);

  // Steel Support Columns
  [-7, 7].forEach((x) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.5, 12), chromeMat);
    col.position.set(x, 3.75, 11);
    col.castShadow = true;
    station.add(col);
  });

  // Concrete Pump Island
  const island = new THREE.Mesh(new THREE.BoxGeometry(14, 0.45, 3.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 }));
  island.position.set(0, 0.22, 11);
  station.add(island);

  // Dual 1950s Clock-Face Fuel Pumps
  [-3.5, 3.5].forEach((x) => {
    const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), pumpRedMat);
    pumpBody.position.set(x, 1.9, 11);
    pumpBody.castShadow = true;
    station.add(pumpBody);

    // Glowing White Glass Globe on Top
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff8ee,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }));
    globe.position.set(x, 3.9, 11);
    station.add(globe);
  });

  // Vintage Gasoline Sign Plaque
  const signMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(8, 1.4, 0.2), signMat);
  signBoard.position.set(0, 7.5, 13.1);
  station.add(signBoard);

  return station;
}

// Historic Covered Timber Bridge spanning canyon trails
export function createCoveredBridge(length: number = 44, width: number = 26, height: number = 10): THREE.Group {
  const bridge = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.92 });
  const roofWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2415, roughness: 0.88 });

  // Roadway Deck Planks
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, length), woodMat);
  deck.position.y = 0.3;
  deck.receiveShadow = true;
  bridge.add(deck);

  // Heavy Timber Wall Posts & Diagonal X-Trusses
  const postSpacing = 5.5;
  const numBays = Math.floor(length / postSpacing);

  for (let side of [-1, 1]) {
    const xPos = (side * width) / 2;

    for (let i = 0; i <= numBays; i++) {
      const zPos = -length / 2 + i * postSpacing;

      // Vertical Timber Post
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, height, 0.6), woodMat);
      post.position.set(xPos, height / 2, zPos);
      post.castShadow = true;
      bridge.add(post);

      // Diagonal X-Truss between posts
      if (i < numBays) {
        const diagLen = Math.hypot(height * 0.7, postSpacing);
        const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, diagLen, 0.3), woodMat);
        diag1.position.set(xPos, height * 0.5, zPos + postSpacing / 2);
        diag1.rotation.x = Math.atan2(height * 0.7, postSpacing);
        bridge.add(diag1);
      }
    }
  }

  // Gabled Roof
  const roofSlopeLeft = new THREE.Mesh(new THREE.BoxGeometry(width * 0.58, 0.4, length + 2), roofWoodMat);
  roofSlopeLeft.rotation.z = 0.38;
  roofSlopeLeft.position.set(-width * 0.25, height + 1.8, 0);
  roofSlopeLeft.castShadow = true;
  bridge.add(roofSlopeLeft);

  const roofSlopeRight = new THREE.Mesh(new THREE.BoxGeometry(width * 0.58, 0.4, length + 2), roofWoodMat);
  roofSlopeRight.rotation.z = -0.38;
  roofSlopeRight.position.set(width * 0.25, height + 1.8, 0);
  roofSlopeRight.castShadow = true;
  bridge.add(roofSlopeRight);

  return bridge;
}

// 1940s Vintage Farm Pickup Truck parked beside countryside barns
export function createVintageTruck(colorHex: number = 0x22553b): THREE.Group {
  const truck = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.08 });
  const woodBedMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

  // Cab & Rounded Hood
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.4, 1.8), paintMat);
  cab.position.set(0, 1.4, -0.2);
  cab.castShadow = true;
  truck.add(cab);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.95, 2.0), paintMat);
  hood.position.set(0, 0.95, 1.5);
  hood.castShadow = true;
  truck.add(hood);

  // Chrome Grille & Headlights
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.1), chromeMat);
  grille.position.set(0, 0.85, 2.52);
  truck.add(grille);

  [-0.7, 0.7].forEach((x) => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), chromeMat);
    light.position.set(x, 0.95, 2.5);
    truck.add(light);
  });

  // Wooden Stake Bed
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.6), woodBedMat);
  bedFloor.position.set(0, 0.8, -2.1);
  truck.add(bedFloor);

  [-1.1, 1.1].forEach((x) => {
    const stakeRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 2.6), woodBedMat);
    stakeRail.position.set(x, 1.25, -2.1);
    truck.add(stakeRail);
  });

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.35, 14);
  wheelGeo.rotateZ(Math.PI / 2);

  [
    [-1.05, 0.46, 1.4], [1.05, 0.46, 1.4],
    [-1.05, 0.46, -2.1], [1.05, 0.46, -2.1]
  ].forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(pos[0], pos[1], pos[2]);
    wheel.castShadow = true;
    truck.add(wheel);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.38, 12), chromeMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.copy(wheel.position);
    truck.add(cap);
  });

  return truck;
}

// 1950s Roadside Advertising Billboards
export function createVintageBillboard(title: string, sub: string, bgHex: number = 0x1e3a8a, textHex: string = '#ffffff'): THREE.Group {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = `#${bgHex.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 512, 256);

    ctx.lineWidth = 14;
    ctx.strokeStyle = '#fef08a';
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = textHex;
    ctx.font = '900 48px Impact, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 100);

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(sub, 256, 175);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.3), boardMat);
  board.position.y = 6.5;
  board.castShadow = true;
  group.add(board);

  // Wooden Leg Posts
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.9 });
  [-3.8, 3.8].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7.5, 8), legMat);
    leg.position.set(x, 3.75, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  return group;
}

// --- 3. DYNAMIC WEATHER & RAIN PARTICLES ---

export interface RainSystem {
  mesh: THREE.InstancedMesh;
  update: (delta: number, camPos: THREE.Vector3, isRaining: boolean) => void;
}

export function createRainSystem(scene: THREE.Scene, count: number = 800): RainSystem {
  const rainGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.8, 4);
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xcfd8dc,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const mesh = new THREE.InstancedMesh(rainGeo, rainMat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const particles = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 80,
    y: Math.random() * 45,
    z: (Math.random() - 0.5) * 80,
    speed: 70 + Math.random() * 40,
  }));

  return {
    mesh,
    update: (delta: number, camPos: THREE.Vector3, isRaining: boolean) => {
      mesh.visible = isRaining;
      if (!isRaining) return;

      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.y -= p.speed * delta;
        if (p.y < 0) {
          p.y = 45;
          p.x = (Math.random() - 0.5) * 80;
          p.z = (Math.random() - 0.5) * 80;
        }

        dummy.position.set(camPos.x + p.x, camPos.y + p.y - 10, camPos.z + p.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// --- 4. ROOM ENVIRONMENT PBR SETUP ---

export function setupRoomEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  try {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();
  } catch (e) {
    console.error('RoomEnvironment setup error:', e);
  }
}

// --- 5. DETAILED VINTAGE CAR INTERIOR (STEERING WHEEL, DASHBOARD, ROLL CAGE) ---

export function createVintageCarInterior(): THREE.Group {
  const interior = new THREE.Group();

  // Dashboard panel (painted metal with chrome bezel instruments)
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.08 });
  const gaugeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 0.4), dashMat);
  dash.position.set(0, 1.15, 0.95);
  interior.add(dash);

  // Chrome instrument dials (Speedometer, Oil Temp, Fuel)
  [-0.35, 0, 0.35].forEach((x) => {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), chromeMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(x - 0.25, 1.2, 0.82);
    interior.add(bezel);

    const face = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), gaugeMat);
    face.position.set(x - 0.25, 1.2, 0.81);
    interior.add(face);
  });

  // 3-Spoke Vintage Steering Wheel
  const wheelGroup = new THREE.Group();
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 20), rimMat);
  wheelGroup.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), chromeMat);
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);

  // 3 Spokes
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.015), chromeMat);
    spoke.rotation.z = (s * Math.PI * 2) / 3;
    spoke.position.y = 0.1;
    wheelGroup.add(spoke);
  }

  // Steering column angled toward driver (left-hand drive)
  wheelGroup.position.set(-0.45, 1.26, 0.65);
  wheelGroup.rotation.x = -0.45;
  interior.add(wheelGroup);

  // Steel Safety Roll Bar (tubular cage behind driver seat)
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const rollBarMain = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 8, 16, Math.PI), cageMat);
  rollBarMain.position.set(0, 1.15, -0.25);
  interior.add(rollBarMain);

  [-0.65, 0.65].forEach((x) => {
    const rearBrace = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), cageMat);
    rearBrace.rotation.x = 0.65;
    rearBrace.position.set(x, 1.2, -0.75);
    interior.add(rearBrace);
  });

  return interior;
}

// --- 6. DYNAMIC WEATHER & ATMOSPHERIC LIGHTING PRESETS ---

export function applyWeatherAtmosphere(
  preset: 'sunset' | 'day' | 'fog' | 'rain',
  scene: THREE.Scene,
  sun: THREE.DirectionalLight,
  hemiLight: THREE.HemisphereLight,
  dirtMat: THREE.MeshStandardMaterial,
  renderer: THREE.WebGLRenderer
): void {
  if (preset === 'sunset') {
    // Golden Hour: Rich amber sunlight, long dramatic shadows
    sun.color.setHex(0xffaa55);
    sun.intensity = 1.7;
    sun.position.set(400, 220, -500);
    hemiLight.color.setHex(0xffd1a4);
    hemiLight.groundColor.setHex(0x3e2723);
    hemiLight.intensity = 0.85;
    scene.background = new THREE.Color(0xd97736);
    scene.fog = new THREE.FogExp2(0xd97736, 0.00045);
    dirtMat.roughness = 0.92;
    dirtMat.metalness = 0.05;
    renderer.toneMappingExposure = 1.2;
  } else if (preset === 'day') {
    // Crisp Midday: High-contrast bright sun, deep blue sky
    sun.color.setHex(0xffffff);
    sun.intensity = 1.8;
    sun.position.set(250, 700, 300);
    hemiLight.color.setHex(0x90caf9);
    hemiLight.groundColor.setHex(0x2e4714);
    hemiLight.intensity = 0.9;
    scene.background = new THREE.Color(0x60a5fa);
    scene.fog = new THREE.FogExp2(0x60a5fa, 0.00035);
    dirtMat.roughness = 0.92;
    dirtMat.metalness = 0.05;
    renderer.toneMappingExposure = 1.15;
  } else if (preset === 'fog') {
    // Country Morning Mist: Pale diffused sunlight, mystical atmosphere
    sun.color.setHex(0xcfd8dc);
    sun.intensity = 0.9;
    sun.position.set(100, 400, 200);
    hemiLight.color.setHex(0xb0bec5);
    hemiLight.groundColor.setHex(0x37474f);
    hemiLight.intensity = 0.7;
    scene.background = new THREE.Color(0x94a3b8);
    scene.fog = new THREE.FogExp2(0x94a3b8, 0.0016);
    dirtMat.roughness = 0.88;
    dirtMat.metalness = 0.08;
    renderer.toneMappingExposure = 1.05;
  } else if (preset === 'rain') {
    // Stormy Slick: Dark moody sky, glistening wet mud with puddles
    sun.color.setHex(0x78909c);
    sun.intensity = 0.85;
    sun.position.set(150, 500, 200);
    hemiLight.color.setHex(0x475569);
    hemiLight.groundColor.setHex(0x1e293b);
    hemiLight.intensity = 0.65;
    scene.background = new THREE.Color(0x334155);
    scene.fog = new THREE.FogExp2(0x334155, 0.0012);
    // Road turns glossy wet mud with specular sheen
    dirtMat.roughness = 0.28;
    dirtMat.metalness = 0.22;
    renderer.toneMappingExposure = 1.1;
  }
}
