import React from 'react';
import { InstrumentConfig, TelescopeType, Wavelength } from '../types';

interface Props {
  config: InstrumentConfig;
  onChange: (config: InstrumentConfig) => void;
  disabled: boolean;
}

const InstrumentForm: React.FC<Props> = ({ config, onChange, disabled }) => {
  const handleChange = (key: keyof InstrumentConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-astro-800 p-6 rounded-xl border border-astro-600 shadow-lg">
      <h2 className="text-xl font-bold text-astro-100 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-astro-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Configuration Optique
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telescope Type */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-astro-300 uppercase tracking-wider mb-1">Type d'Instrument</label>
          <select 
            disabled={disabled}
            value={config.type} 
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full bg-astro-900 border border-astro-600 rounded p-2 text-white focus:border-astro-accent focus:ring-1 focus:ring-astro-accent outline-none transition"
          >
            {Object.values(TelescopeType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Aperture */}
        <div>
          <label className="block text-xs font-semibold text-astro-300 uppercase tracking-wider mb-1">Ouverture (mm)</label>
          <input 
            type="number" 
            disabled={disabled}
            value={config.apertureMm} 
            onChange={(e) => handleChange('apertureMm', Number(e.target.value))}
            className="w-full bg-astro-900 border border-astro-600 rounded p-2 text-white focus:border-astro-accent outline-none"
          />
        </div>

        {/* Focal Length */}
        <div>
          <label className="block text-xs font-semibold text-astro-300 uppercase tracking-wider mb-1">Focale (mm)</label>
          <input 
            type="number" 
            disabled={disabled}
            value={config.focalLengthMm} 
            onChange={(e) => handleChange('focalLengthMm', Number(e.target.value))}
            className="w-full bg-astro-900 border border-astro-600 rounded p-2 text-white focus:border-astro-accent outline-none"
          />
        </div>

        {/* Pixel Size */}
        <div>
          <label className="block text-xs font-semibold text-astro-300 uppercase tracking-wider mb-1">Taille Pixel (µm)</label>
          <input 
            type="number" 
            step="0.01"
            disabled={disabled}
            value={config.pixelSizeUm} 
            onChange={(e) => handleChange('pixelSizeUm', Number(e.target.value))}
            className="w-full bg-astro-900 border border-astro-600 rounded p-2 text-white focus:border-astro-accent outline-none"
          />
        </div>

        {/* Obstruction */}
        <div>
            <label className="block text-xs font-semibold text-astro-300 uppercase tracking-wider mb-1">Obstruction (%)</label>
            <input 
              type="number" 
              disabled={disabled}
              value={config.obstructionPct}
              onChange={(e) => handleChange('obstructionPct', Number(e.target.value))}
              className="w-full bg-astro-900 border border-astro-600 rounded p-2 text-white focus:border-astro-accent outline-none"
            />
        </div>

        {/* Wavelength */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-astro-300 uppercase tracking-wider mb-1">Filtre / Longueur d'onde</label>
          <select 
            disabled={disabled}
            value={config.wavelength} 
            onChange={(e) => handleChange('wavelength', e.target.value)}
            className="w-full bg-astro-900 border border-astro-600 rounded p-2 text-white focus:border-astro-accent focus:ring-1 focus:ring-astro-accent outline-none transition"
          >
             {Object.values(Wavelength).map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default InstrumentForm;