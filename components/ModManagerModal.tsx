'use client';

import React, { useState } from 'react';
import { Upload, Download, Sparkles, Check, X, FileCode, Palette, Box } from 'lucide-react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export interface CarModConfig {
  modName: string;
  driverName: string;
  carNumber: number;
  playerColor: string;
  topSpeedSetting: number;
  bodyStyle?: string;
  customTextureUrl?: string;
  customGlbMesh?: THREE.Group | null;
}

interface ModManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMod: (mod: CarModConfig) => void;
  currentConfig: CarModConfig;
}

export const PRESET_CAR_MODS: CarModConfig[] = [
  {
    modName: '1951 Fabulous Hudson Hornet #92',
    driverName: 'Herb Thomas',
    carNumber: 92,
    playerColor: '#1d4ed8', // Deep Royal Blue
    topSpeedSetting: 82,
    bodyStyle: 'Step-Down Twin H-Power Fastback',
  },
  {
    modName: '1953 Oldsmobile Rocket 88 #42',
    driverName: 'Lee Petty',
    carNumber: 42,
    playerColor: '#dc2626', // Crimson Red
    topSpeedSetting: 84,
    bodyStyle: 'Rocket 303ci V8 Stocker',
  },
  {
    modName: '1955 Chevy Bel Air Stocker #3',
    driverName: 'Dale Trail King',
    carNumber: 3,
    playerColor: '#1e293b', // Midnight Black with Gold
    topSpeedSetting: 85,
    bodyStyle: 'Shoebox High-Wedge V8',
  },
  {
    modName: '1949 Mercury Lead Sled Dirt King #7',
    driverName: 'Buck Baker',
    carNumber: 7,
    playerColor: '#15803d', // Racing Emerald
    topSpeedSetting: 80,
    bodyStyle: 'Chopped Roof Lead Sled',
  },
  {
    modName: 'Dirt Demon Supercharged V8 #99',
    driverName: 'Wild Bill',
    carNumber: 99,
    playerColor: '#e11d48', // Neon Hot Pink
    topSpeedSetting: 88,
    bodyStyle: 'Supercharged Alcohol Beast',
  },
];

export default function ModManagerModal({
  isOpen,
  onClose,
  onApplyMod,
  currentConfig,
}: ModManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'import-3d' | 'import-livery' | 'json'>('presets');
  const [jsonText, setJsonText] = useState(JSON.stringify(currentConfig, null, 2));
  const [importStatus, setImportStatus] = useState<string>('');
  const [loadedModPreview, setLoadedModPreview] = useState<CarModConfig | null>(null);

  if (!isOpen) return null;

  // Handle GLB / GLTF 3D Model Upload
  const handleFileUploadGLTF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(`Loading 3D car model: ${file.name}...`);
    const reader = new FileReader();

    reader.onload = (event) => {
      const contents = event.target?.result;
      if (!contents) return;

      const loader = new GLTFLoader();
      try {
        loader.parse(
          contents as ArrayBuffer,
          '',
          (gltf) => {
            const model = gltf.scene;
            // Normalize scale & orientation
            model.scale.set(1.5, 1.5, 1.5);
            const customMod: CarModConfig = {
              modName: file.name.replace(/\.[^/.]+$/, ''),
              driverName: currentConfig.driverName,
              carNumber: currentConfig.carNumber,
              playerColor: currentConfig.playerColor,
              topSpeedSetting: currentConfig.topSpeedSetting,
              bodyStyle: 'Custom 3D Model Mod',
              customGlbMesh: model,
            };
            setLoadedModPreview(customMod);
            setImportStatus(`Successfully loaded 3D model "${file.name}"! Click Apply to race it.`);
          },
          (err) => {
            console.error('Error parsing GLTF:', err);
            setImportStatus(`Failed to parse 3D file: ${String(err)}`);
          }
        );
      } catch (err) {
        setImportStatus(`Error importing 3D file: ${String(err)}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Custom Livery Texture Upload (PNG / JPG)
  const handleFileUploadTexture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(`Importing texture wrap: ${file.name}...`);
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const customMod: CarModConfig = {
        ...currentConfig,
        modName: `Wrap: ${file.name.replace(/\.[^/.]+$/, '')}`,
        customTextureUrl: dataUrl,
      };
      setLoadedModPreview(customMod);
      setImportStatus(`Imported custom livery wrap "${file.name}"! Click Apply to install.`);
    };

    reader.readAsDataURL(file);
  };

  // Handle JSON Mod Import
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.playerColor || !parsed.carNumber) {
        setImportStatus('Invalid JSON mod: Must contain playerColor and carNumber.');
        return;
      }
      const newMod: CarModConfig = {
        modName: parsed.modName || 'Custom JSON Mod',
        driverName: parsed.driverName || 'Modded Driver',
        carNumber: parseInt(parsed.carNumber) || 3,
        playerColor: parsed.playerColor || '#facc15',
        topSpeedSetting: parseInt(parsed.topSpeedSetting) || 80,
        bodyStyle: parsed.bodyStyle || 'Custom Tuned Coupe',
      };
      onApplyMod(newMod);
      onClose();
    } catch (err) {
      setImportStatus(`JSON parse error: ${String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-xl text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Car Mod & Import Center</h2>
              <p className="text-xs text-slate-400">Import custom 3D cars, paint wraps, or load legend community stock car mods</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
              activeTab === 'presets' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Legend Mods
          </button>
          <button
            onClick={() => setActiveTab('import-3d')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
              activeTab === 'import-3d' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Box className="w-4 h-4" /> Import 3D (.GLB)
          </button>
          <button
            onClick={() => setActiveTab('import-livery')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
              activeTab === 'import-livery' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-4 h-4" /> Custom Livery
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
              activeTab === 'json' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode className="w-4 h-4" /> JSON Mod
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Status Banner */}
          {importStatus && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-4 py-3 rounded-xl">
              {importStatus}
            </div>
          )}

          {/* TAB 1: PRESET LEGEND MODS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold mb-2">Select a legendary 1950s NASCAR stock car championship mod:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_CAR_MODS.map((mod) => (
                  <div
                    key={mod.modName}
                    className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                          {mod.modName}
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 border border-slate-700">
                          #{mod.carNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">Driver: <span className="text-slate-200 font-bold">{mod.driverName}</span></p>
                      <p className="text-[11px] text-slate-500 mb-3">{mod.bodyStyle}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full shadow" style={{ backgroundColor: mod.playerColor }} />
                        <span className="text-[11px] font-bold text-emerald-400">{mod.topSpeedSetting} MPH</span>
                      </div>
                      <button
                        onClick={() => {
                          onApplyMod(mod);
                          onClose();
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-md"
                      >
                        <Check className="w-3.5 h-3.5" /> INSTALL MOD
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT 3D GLB/GLTF */}
          {activeTab === 'import-3d' && (
            <div className="space-y-4 text-center py-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-3xl p-8 bg-slate-950/40 flex flex-col items-center justify-center transition-colors">
                <Box className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-white mb-1">Import Custom 3D Vehicle Model</h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm">
                  Upload a <span className="text-amber-400 font-mono">.glb</span> or <span className="text-amber-400 font-mono">.gltf</span> 3D model file to drive your own car in the race!
                </p>
                <label className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl cursor-pointer flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                  <Upload className="w-4 h-4" /> CHOOSE .GLB / .GLTF FILE
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleFileUploadGLTF}
                    className="hidden"
                  />
                </label>
              </div>

              {loadedModPreview?.customGlbMesh && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-400 uppercase">3D Model Ready</div>
                    <div className="text-sm font-black text-white">{loadedModPreview.modName}</div>
                  </div>
                  <button
                    onClick={() => {
                      onApplyMod(loadedModPreview);
                      onClose();
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl"
                  >
                    APPLY 3D CAR MOD
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPORT CUSTOM LIVERY WRAP */}
          {activeTab === 'import-livery' && (
            <div className="space-y-4 text-center py-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-3xl p-8 bg-slate-950/40 flex flex-col items-center justify-center transition-colors">
                <Palette className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-white mb-1">Import Custom Livery / Body Texture</h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm">
                  Upload your custom livery image (<span className="text-amber-400 font-mono">.png, .jpg</span>) to wrap your NASCAR coupe with custom sponsor stickers and racing graphics.
                </p>
                <label className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl cursor-pointer flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                  <Upload className="w-4 h-4" /> CHOOSE LIVERY IMAGE
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileUploadTexture}
                    className="hidden"
                  />
                </label>
              </div>

              {loadedModPreview?.customTextureUrl && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={loadedModPreview.customTextureUrl}
                      alt="Livery preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-emerald-400 uppercase">Livery Wrap Ready</div>
                      <div className="text-sm font-black text-white">{loadedModPreview.modName}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onApplyMod(loadedModPreview);
                      onClose();
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl"
                  >
                    INSTALL WRAP MOD
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: JSON MOD IMPORT & EXPORT */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Edit or paste custom JSON specifications for your NASCAR mod:</p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={9}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={() => {
                    const blob = new Blob([jsonText], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `nascar_mod_${currentConfig.carNumber}.json`;
                    a.click();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> EXPORT JSON
                </button>
                <button
                  onClick={handleApplyJson}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> APPLY JSON MOD
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
