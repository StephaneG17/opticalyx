import React from 'react';
import { AnalysisReport, ZernikeTerm } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { ZERNIKE_COLORS } from '../constants';

interface Props {
  report: AnalysisReport;
}

const AnalysisDashboard: React.FC<Props> = ({ report }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-astro-800 p-6 rounded-xl border border-astro-600 text-center">
            <h3 className="text-astro-300 text-sm font-bold uppercase tracking-widest mb-2">Rapport de Strehl</h3>
            <div className={`text-4xl font-mono font-bold ${report.strehlRatio > 0.8 ? 'text-green-400' : report.strehlRatio > 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                {report.strehlRatio.toFixed(2)}
            </div>
            <p className="text-xs text-astro-400 mt-2">
                {report.strehlRatio > 0.8 ? "Limité par la diffraction" : "Aberrations présentes"}
            </p>
        </div>
        <div className="col-span-2 bg-astro-800 p-6 rounded-xl border border-astro-600">
             <h3 className="text-astro-300 text-sm font-bold uppercase tracking-widest mb-2">Diagnostic Principal</h3>
             <p className="text-lg text-white font-medium leading-relaxed">{report.diagnosis}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Zernike Decomposition Chart */}
        <div className="bg-astro-800 p-4 rounded-xl border border-astro-600 shadow-lg min-h-[400px] flex flex-col">
          <h3 className="text-astro-100 font-bold mb-4">Décomposition Zernike (Estimée)</h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={report.primaryAberrations} 
                layout="vertical" 
                margin={{ left: 0, right: 30, top: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2E365E" horizontal={false} />
                <XAxis type="number" stroke="#8FA1E0" domain={[0, 'auto']} tick={{fontSize: 10}} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#8FA1E0" 
                  width={130} 
                  tick={{fontSize: 11, fill: '#DDE4FF'}} 
                  interval={0}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#15192B', borderColor: '#3D4C8A', color: '#fff' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="value" fill="#00F0FF" radius={[0, 4, 4, 0]} barSize={24} name="Ondes RMS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Correction Plan */}
        <div className="bg-astro-800 p-6 rounded-xl border border-astro-600 flex flex-col justify-between min-h-[400px]">
           <div>
               <h3 className="text-astro-100 font-bold mb-4 flex items-center gap-2">
                   <span className="bg-astro-600 text-astro-accent p-1 rounded">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                     </svg>
                   </span>
                   Plan d'Action
               </h3>
               <ul className="space-y-4">
                   {report.correctionSteps.map((step, idx) => (
                       <li key={idx} className="flex items-start gap-3 text-sm text-astro-100">
                           <span className="flex-shrink-0 w-6 h-6 bg-astro-700 text-astro-accent rounded-full flex items-center justify-center text-xs font-bold font-mono shadow-md shadow-astro-900">
                               {idx + 1}
                           </span>
                           <span className="leading-6 pt-0.5">{step}</span>
                       </li>
                   ))}
               </ul>
           </div>
           <div className="mt-8 pt-6 border-t border-astro-600">
               <h4 className="text-xs font-bold text-astro-400 uppercase tracking-wider mb-2">Évaluation Atmosphérique</h4>
               <div className="bg-astro-900/50 p-3 rounded border border-astro-700">
                 <p className="text-sm text-astro-300 italic">"{report.turbulenceAssessment}"</p>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;