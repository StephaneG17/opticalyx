import { InstrumentConfig, TelescopeType, Wavelength } from "./types";

export const DEFAULT_INSTRUMENT: InstrumentConfig = {
  type: TelescopeType.REFRACTOR,
  apertureMm: 100,
  focalLengthMm: 600,
  pixelSizeUm: 3.76, // Standard IMX571/533 size
  obstructionPct: 0,
  wavelength: Wavelength.BROADBAND,
  isSpiderVanes: false
};

export const ZERNIKE_COLORS = {
  "Défocalisation": "#FFBB28",
  "Astigmatisme": "#FF8042",
  "Coma": "#00C49F",
  "Sphérique": "#0088FE",
  "Trèfle": "#8884d8",
  "Tilt": "#82ca9d"
};

export const MOCK_ANALYSIS_DELAY = 2500;