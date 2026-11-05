'use client';

import React, { useState } from 'react';
import { Play, Shield, Zap, Flame, User, Car, Sparkles, Box } from 'lucide-react';
import ModManagerModal, { CarModConfig } from '@/components/ModManagerModal';

interface GarageMenuProps {
  onStartRace: (config: {
    driverName: string;
    carNumber: number;
    playerColor: string;
    topSpeedSetting: number;
    modName?: string;
    bodyStyle?: string;
    customTextureUrl?: string;
    customGlbMesh?: any;
  }) => void;
}

export default function GarageMenu({ onStartRace }: GarageMenuProps) {
  const [driverName, setDriverName] = useState('Dale Trailrider');
  const [carNumber, setCarNumber] = useState(3);
  const [playerColor, setPlayerColor] = useState('#facc15'); // Gold / Yellow
  const [topSpeedSetting, setTopSpeedSetting] = useState(78); // MPH
  const [selectedPreset, setSelectedPreset] = useState('gold');
  const [activeMod, setActiveMod] = useState<CarModConfig | null>(null);
  const [isModModalOpen, setIsModModalOpen] = useState(false);

  const liveries = [
    { id: 'gold', name: 'Thunder Gold', color: '#facc15' },
    { id: 'red', name: 'NASCAR Crimson', color: '#dc2626' },
    { id: 'blue', name: 'Midnight Blue', color: '#2563eb' },
    { id: 'green', name: 'Apex Emerald', color: '#16a34a' },
    { id: 'purple', name: 'Cosmic Purple', color: '#9333ea' },
    { id: 'black', name: 'Carbon Stealth', color: '#1e293b' },
  ];

  const handleApplyMod = (mod: CarModConfig) => {
    setActiveMod(mod);
    setDriverName(mod.driverName);
    setCarNumber(mod.carNumber);
    setPlayerColor(mod.playerColor);
    setTopSpeedSetting(mod.topSpeedSetting);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
      <div className="max-w-4xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-12 my-8 max-h-[92vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3 border border-amber-500/20">
            <Flame className="w-4 h-4" /> 99-Car Trail Championship • 99-Stall Pit Road
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
            NASCAR <span className="text-amber-400">Trail Racer 500</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Customize your stock car, master the 99-stall pit road with fresh tires and tuned spark plugs, and conquer 98 rival drivers!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left Column: Driver & Number */}
          <div className="space-y-5">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" /> Driver Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                maxLength={20}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-400" /> Car Number (#)
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={carNumber}
                onChange={(e) => setCarNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Engine Top Speed
                </label>
                <span className="text-emerald-400 font-black">{topSpeedSetting} MPH</span>
              </div>
              <input
                type="range"
                min={65}
                max={95}
                value={topSpeedSetting}
                onChange={(e) => setTopSpeedSetting(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Column: Livery & Preview */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" /> Stock Car Livery
              </label>
              
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {liveries.map((liv) => (
                  <button
                    key={liv.id}
                    onClick={() => {
                      setPlayerColor(liv.color);
                      setSelectedPreset(liv.id);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedPreset === liv.id 
                        ? 'border-amber-400 bg-amber-500/10 shadow-lg' 
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full shadow-inner" style={{ backgroundColor: liv.color }} />
                    <span className="text-[11px] font-bold text-slate-300">{liv.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Car Preview Badge */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute top-2 right-2 text-slate-700 font-black text-6xl opacity-20 pointer-events-none">
                #{carNumber}
              </div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Preview Entry</div>
              <div className="text-xl font-black text-white mb-2">{driverName || 'Rookie'}</div>
              <div className="flex justify-center items-center gap-2 mb-2">
                <div className="w-3.5 h-3.5 rounded-full shadow" style={{ backgroundColor: playerColor }} />
                <span className="text-xs font-bold text-amber-400">NASCAR Stock Car #{carNumber}</span>
              </div>
              {activeMod && (
                <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/40">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Active Mod: {activeMod.modName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mod Center & Car Import Trigger Button */}
        <div className="mb-4">
          <button
            onClick={() => setIsModModalOpen(true)}
            className="w-full bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-slate-900 border border-purple-500/40 hover:border-purple-400 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 hover:scale-[1.01]"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm uppercase tracking-wide">CAR MOD CENTER & 3D IMPORTS</span>
            <span className="text-[11px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-md font-mono">
              .GLB / Wraps / Legend Mods
            </span>
          </button>
        </div>

        {/* Start Race CTA Play Button */}
        <button
          onClick={() =>
            onStartRace({
              driverName,
              carNumber,
              playerColor,
              topSpeedSetting,
              modName: activeMod?.modName,
              bodyStyle: activeMod?.bodyStyle,
              customTextureUrl: activeMod?.customTextureUrl,
              customGlbMesh: activeMod?.customGlbMesh,
            })
          }
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xl py-4 sm:py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 transform hover:scale-[1.01]"
        >
          <Play className="w-6 h-6 fill-current" /> START TRAIL RACE 500
        </button>

        {/* Mod Manager Modal */}
        <ModManagerModal
          isOpen={isModModalOpen}
          onClose={() => setIsModModalOpen(false)}
          onApplyMod={handleApplyMod}
          currentConfig={{
            modName: activeMod?.modName || 'Custom Coupe',
            driverName,
            carNumber,
            playerColor,
            topSpeedSetting,
          }}
        />

      </div>
    </div>
  );
}
