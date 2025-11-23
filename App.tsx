import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InstrumentConfig, ProcessingStats, AnalysisReport, RadialDataPoint } from './types';
import { DEFAULT_INSTRUMENT } from './constants';
import InstrumentForm from './components/InstrumentForm';
import AnalysisDashboard from './components/AnalysisDashboard';
import PSF3DViewer from './components/PSF3DViewer';
import { calculateCentroid, estimateStats, cropImage, calculateRadialProfile, checkSaturation } from './services/imageProcessing';
import { analyzePSF } from './services/geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

const App: React.FC = () => {
  const [instrument, setInstrument] = useState<InstrumentConfig>(DEFAULT_INSTRUMENT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [radialProfile, setRadialProfile] = useState<RadialDataPoint[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [croppedPSF, setCroppedPSF] = useState<string | null>(null);
  const [croppedImageData, setCroppedImageData] = useState<ImageData | null>(null);
  const [isLogView, setIsLogView] = useState(false); // Toggle linear/log view

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null); // Store original image for re-cropping

  // Re-generate crop when view mode changes
  useEffect(() => {
    if (sourceImageRef.current && stats) {
        generatePreview(sourceImageRef.current, stats, isLogView);
    }
  }, [isLogView]);

  const generatePreview = (img: HTMLImageElement, currentStats: ProcessingStats, logMode: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cropSize = 256; 
    const result = cropImage(canvas, currentStats.centroid.x, currentStats.centroid.y, cropSize, logMode);
    setCroppedPSF(result.url);
    setCroppedImageData(result.imageData);
  }

  // Handle File Upload and Initial Processing
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setError(null);
      setWarning(null);
      setStats(null);
      setReport(null);
      setCroppedPSF(null);
      setCroppedImageData(null);
      setRadialProfile([]);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          sourceImageRef.current = img;
          processLocalImage(img);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const processLocalImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 1. Calculate Statistics & Centroid
    const calculatedStats = estimateStats(imageData);
    setStats(calculatedStats);

    // 2. Validate Image Quality
    const isSaturated = checkSaturation(imageData, calculatedStats.centroid.x, calculatedStats.centroid.y);
    
    if (isSaturated) {
        setWarning("Attention : L'étoile est saturée (clipping). L'analyse de Strehl et de forme sera imprécise. Réduisez le temps de pose.");
    }

    if (calculatedStats.peakIntensity < 20) {
      setError("Signal trop faible. Veuillez charger une image d'étoile plus brillante.");
      return;
    }
    if (calculatedStats.snr < 3) {
      setError("Rapport Signal/Bruit trop faible pour une analyse fiable.");
      return;
    }

    // 3. Radial Profile
    const profile = calculateRadialProfile(imageData, calculatedStats.centroid.x, calculatedStats.centroid.y);
    setRadialProfile(profile);

    // 4. Crop for API & Preview
    generatePreview(img, calculatedStats, isLogView);
  };

  const handleRunAnalysis = async () => {
    if (!croppedPSF) return;
    
    setIsProcessing(true);
    setError(null);

    // Note: We always send the standard crop (or maybe linear is better for AI?) 
    // Usually AI expects what humans see. Let's send the current view.
    try {
      const analysisResult = await analyzePSF(croppedPSF, instrument);
      setReport(analysisResult);
      // Add to history
      setHistory(prev => [...prev, analysisResult]);
    } catch (err: any) {
      setError(err.message || "Une erreur inattendue est survenue lors de l'analyse.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-10 bg-astro-900 text-white font-sans selection:bg-astro-accent selection:text-black">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="bg-astro-800 border-b border-astro-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded bg-gradient-to-br from-astro-500 to-astro-accent flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
             </div>
             <div>
               <h1 className="text-xl font-bold tracking-tight text-white">OptiCalyx</h1>
               <p className="text-xs text-astro-400 uppercase tracking-widest">Diagnostics PSF Avancés</p>
             </div>
          </div>
          <div className="text-xs text-astro-500 font-mono hidden md:block">
             v1.2.0 • React • Gemini Vision
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Preview */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upload Section */}
          <div className="bg-astro-800 rounded-xl border border-astro-600 p-6 shadow-lg">
             <h2 className="text-lg font-bold mb-4 text-astro-100">1. Charger la PSF</h2>
             <div className="border-2 border-dashed border-astro-500 hover:border-astro-accent rounded-lg p-8 transition-colors bg-astro-900/50 text-center relative group cursor-pointer">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/tiff"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-astro-400 group-hover:text-astro-accent mb-2 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm text-astro-300 font-medium">Cliquer ou Glisser l'image</p>
                  <p className="text-xs text-astro-500 mt-1">PNG, JPG, TIFF (Max 5MB)</p>
                </div>
             </div>

             {/* Preview & Stats */}
             {croppedPSF && stats && (
               <div className="mt-6 flex gap-4 animate-fade-in flex-col sm:flex-row">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border border-astro-500 shadow-inner flex-shrink-0 group">
                    <img src={croppedPSF} alt="Cropped PSF" className="w-full h-full object-contain bg-black" />
                    <div className="absolute top-0 right-0 bg-astro-accent text-black text-[10px] font-bold px-1 z-10">
                        {isLogView ? 'LOG' : 'LIN'}
                    </div>
                    <button 
                        onClick={() => setIsLogView(!isLogView)}
                        className="absolute bottom-1 right-1 bg-astro-900/80 text-white text-xs p-1 rounded border border-astro-600 hover:border-astro-accent opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Basculer vue Logarithmique"
                    >
                        {isLogView ? 'Voir Linéaire' : 'Voir Log'}
                    </button>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                     <div className="flex justify-between text-xs text-astro-300 border-b border-astro-700 pb-1">
                        <span>FWHM:</span>
                        <span className="font-mono text-white">{stats.fwhmPixels} px</span>
                     </div>
                     <div className="flex justify-between text-xs text-astro-300 border-b border-astro-700 pb-1">
                        <span>SNR:</span>
                        <span className="font-mono text-white">{stats.snr}</span>
                     </div>
                     <div className="flex justify-between text-xs text-astro-300 border-b border-astro-700 pb-1">
                        <span>Pic:</span>
                        <span className={`font-mono ${warning ? 'text-red-400 font-bold' : 'text-white'}`}>{stats.peakIntensity}</span>
                     </div>
                  </div>
               </div>
             )}
             
             {warning && (
                 <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500 rounded text-yellow-200 text-xs flex items-start gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                     {warning}
                 </div>
             )}

             {error && (
               <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm flex items-start gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                 {error}
               </div>
             )}
          </div>

          <InstrumentForm 
            config={instrument} 
            onChange={setInstrument} 
            disabled={isProcessing}
          />

          <button
            onClick={handleRunAnalysis}
            disabled={!croppedPSF || isProcessing || !!error}
            className={`w-full py-4 rounded-lg font-bold text-lg uppercase tracking-wider transition-all shadow-lg
              ${!croppedPSF || !!error 
                ? 'bg-astro-700 text-astro-500 cursor-not-allowed' 
                : isProcessing 
                  ? 'bg-astro-600 text-white cursor-wait'
                  : 'bg-astro-accent text-astro-900 hover:bg-cyan-300 hover:shadow-cyan-500/20'
              }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyse en cours...
              </span>
            ) : "Lancer le Diagnostic"}
          </button>
          
          {/* 3D Viewer Section (Only if image loaded) */}
          {croppedImageData && (
             <div className="bg-astro-800 p-4 rounded-xl border border-astro-600 animate-fade-in">
                <h3 className="text-sm font-bold text-astro-300 mb-2 uppercase tracking-wide">Topologie 3D</h3>
                <PSF3DViewer imageData={croppedImageData} width={360} height={250} />
                <p className="text-[10px] text-astro-500 text-center mt-2 italic">Glisser pour pivoter</p>
             </div>
          )}

        </div>

        {/* Right Column: Visualization & Report */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* History/Session Tracking (Shown if more than 1 report exists) */}
          {history.length > 1 && (
              <div className="bg-astro-800 p-4 rounded-xl border border-astro-600 shadow-lg">
                  <h3 className="text-astro-300 text-xs font-bold uppercase tracking-widest mb-4">Évolution de la Session (Strehl)</h3>
                  <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={history.map((h, i) => ({ idx: i+1, strehl: h.strehlRatio }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1F253D" />
                              <XAxis dataKey="idx" stroke="#5C73C2" tick={{fontSize: 10}} />
                              <YAxis domain={[0, 1]} stroke="#5C73C2" tick={{fontSize: 10}} />
                              <Tooltip contentStyle={{ backgroundColor: '#15192B', borderColor: '#3D4C8A' }} />
                              <Line type="monotone" dataKey="strehl" stroke="#00F0FF" strokeWidth={2} dot={{fill: '#00F0FF'}} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {/* Radial Profile Chart */}
          {radialProfile.length > 0 && (
            <div className="bg-astro-800 p-6 rounded-xl border border-astro-600 shadow-lg">
               <h3 className="text-astro-100 font-bold mb-4">Profil Radial d'Intensité</h3>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={radialProfile} 
                      margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                    >
                      <defs>
                        <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F253D" vertical={false} />
                      <XAxis 
                        dataKey="radius" 
                        stroke="#5C73C2" 
                        label={{ value: 'Pixels depuis le centre', position: 'insideBottom', offset: -15, fill: '#5C73C2', fontSize: 12 }} 
                      />
                      <YAxis stroke="#5C73C2" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#15192B', borderColor: '#3D4C8A', color: '#fff' }} 
                        itemStyle={{ color: '#00F0FF' }}
                        labelFormatter={(label) => `Rayon: ${label} px`}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Area type="monotone" dataKey="intensity" stroke="#00F0FF" strokeWidth={2} fillOpacity={1} fill="url(#colorIntensity)" name="Mesuré" />
                      <Area type="monotone" dataKey="idealDiffraction" stroke="#8884d8" strokeWidth={1} strokeDasharray="5 5" fill="none" name="Airy (Réf)" />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
          )}

          {/* Analysis Report */}
          {report ? (
            <AnalysisDashboard report={report} />
          ) : (
            <div className="h-[400px] border-2 border-dashed border-astro-700 rounded-xl flex items-center justify-center text-astro-600">
               {!croppedPSF ? (
                 <div className="text-center">
                    <p className="text-lg font-semibold">Prêt pour l'analyse</p>
                    <p className="text-sm">Chargez une PSF et configurez l'instrument pour commencer.</p>
                 </div>
               ) : (
                  <p className="animate-pulse">En attente d'exécution...</p>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;