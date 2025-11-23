export enum TelescopeType {
  NEWTONIAN = "Newton",
  REFRACTOR = "Lunette (Réfracteur)",
  SCT = "Schmidt-Cassegrain",
  RCT = "Ritchey-Chrétien",
  CDK = "Dall-Kirkham Corrigé"
}

export enum Wavelength {
  BROADBAND = "Large Bande (L)",
  RED = "Rouge",
  GREEN = "Vert",
  BLUE = "Bleu",
  HA = "H-Alpha (656nm)",
  OIII = "O-III (500nm)",
  SII = "S-II (672nm)",
  IR850 = "IR Pass (850nm+)"
}

export interface InstrumentConfig {
  type: TelescopeType;
  apertureMm: number;
  focalLengthMm: number;
  pixelSizeUm: number;
  obstructionPct: number;
  wavelength: Wavelength;
  isSpiderVanes: boolean;
}

export interface ProcessingStats {
  fwhmPixels: number;
  snr: number;
  centroid: { x: number; y: number };
  peakIntensity: number;
  backgroundLevel: number;
}

export interface RadialDataPoint {
  radius: number;
  intensity: number;
  idealDiffraction?: number; // Airy disk theoretical
}

export interface ZernikeTerm {
  name: string; // e.g., "Astigmatisme", "Coma"
  value: number; // RMS in waves
  azimuth?: number; // Angle in degrees
  description: string;
}

export interface AnalysisReport {
  timestamp: string;
  instrument: InstrumentConfig;
  primaryAberrations: ZernikeTerm[];
  strehlRatio: number;
  diagnosis: string;
  correctionSteps: string[];
  turbulenceAssessment: string; // "Seeing dominated" vs "Optics dominated"
}