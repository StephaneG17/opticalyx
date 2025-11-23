import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisReport, InstrumentConfig, ZernikeTerm } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || "";

export const analyzePSF = async (
  imageBase64: string,
  instrument: InstrumentConfig
): Promise<AnalysisReport> => {
  if (!GEMINI_API_KEY) {
    console.warn("No API Key found. Returning Mock Data.");
    return mockAnalysis(instrument);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `
      Tu es un ingénieur optique expert spécialisé en astrophotographie et en analyse de front d'onde.
      Analyse l'image de la Fonction d'Étalement du Point (PSF) jointe.
      
      Détails de l'instrument :
      - Type : ${instrument.type}
      - Ouverture : ${instrument.apertureMm}mm
      - Focale : ${instrument.focalLengthMm}mm
      - Taille de pixel : ${instrument.pixelSizeUm}µm
      - Obstruction : ${instrument.obstructionPct}%
      - Longueur d'onde : ${instrument.wavelength}
      
      Effectue une analyse qualitative du front d'onde basée sur la morphologie de la PSF.
      
      HYPOTHÈSE CRITIQUE : La mise au point est considérée comme PARFAITE.
      
      1. Estime les aberrations de Zernike principales.
         - IMPORTANT : Attribue une valeur très faible (proche de 0) au terme "Défocalisation" car le focus est parfait.
         - Concentre l'analyse sur : Astigmatisme, Coma, Sphérique, Trèfle.
      2. Estime le rapport de Strehl (0.0 à 1.0).
      3. Distingue si possible le seeing local (turbulence) d'un désalignement optique.
      4. Fournis des étapes concrètes pour collimater ou corriger le problème.

      Réponds UNIQUEMENT en format JSON valide correspondant à cette structure, et en FRANÇAIS.
    `;

    // Define the schema for structured output
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        primaryAberrations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              value: { type: Type.NUMBER, description: "Amplitude en ondes RMS" },
              description: { type: Type.STRING },
            },
            required: ["name", "value", "description"],
          },
        },
        strehlRatio: { type: Type.NUMBER },
        diagnosis: { type: Type.STRING },
        turbulenceAssessment: { type: Type.STRING },
        correctionSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["primaryAberrations", "strehlRatio", "diagnosis", "correctionSteps", "turbulenceAssessment"],
    };

    // Remove Data URI prefix if present
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: base64Data } },
          { text: prompt }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);

    return {
      timestamp: new Date().toISOString(),
      instrument: instrument,
      primaryAberrations: data.primaryAberrations,
      strehlRatio: data.strehlRatio,
      diagnosis: data.diagnosis,
      correctionSteps: data.correctionSteps,
      turbulenceAssessment: data.turbulenceAssessment
    };

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Échec de l'analyse PSF. Veuillez vérifier la qualité de l'image ou la clé API.");
  }
};

const mockAnalysis = async (instrument: InstrumentConfig): Promise<AnalysisReport> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    timestamp: new Date().toISOString(),
    instrument,
    primaryAberrations: [
      { name: "Coma", value: 0.35, description: "Asymétrie dans la distribution radiale de l'énergie." },
      { name: "Astigmatisme", value: 0.15, description: "Allongement du cœur de la PSF." },
      { name: "Défocalisation", value: 0.02, description: "Négligeable (Hypothèse focus parfait)." },
      { name: "Sphérique", value: 0.10, description: "Transfert d'énergie vers les anneaux." }
    ],
    strehlRatio: 0.68,
    diagnosis: "Coma significative détectée. Cela indique un désalignement de l'axe optique par rapport au centre du capteur.",
    turbulenceAssessment: "Seeing modéré détecté, mais la nature directionnelle de la queue de la PSF confirme un désalignement optique plutôt que de la turbulence atmosphérique seule.",
    correctionSteps: [
      "Ajuster les vis de bascule du miroir secondaire (Newton/RC) ou du barillet primaire (SCT).",
      "S'assurer que la caméra est orthogonale à l'axe optique (vérifier le tilt).",
      "Effectuer un test sur étoile au centre du champ pour isoler la collimation de la courbure de champ."
    ]
  };
};