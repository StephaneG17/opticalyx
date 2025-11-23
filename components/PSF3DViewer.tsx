import React, { useEffect, useRef, useState } from 'react';

interface Props {
  imageData: ImageData;
  width?: number;
  height?: number;
}

const PSF3DViewer: React.FC<Props> = ({ imageData, width = 360, height = 250 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Interaction state
  const angleRef = useRef({ x: 0.8, z: 0.5 }); 
  const scaleRef = useRef(1.2);
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  
  // UI Update trigger
  const [zoomDisplay, setZoomDisplay] = useState(1.2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency
    if (!ctx) return;

    // --- 1. DATA PREPARATION (Run once) ---
    // Reduce resolution drastically for performance and readability (Wireframe style)
    const gridSize = 32; 
    const points: { x: number; y: number; z: number; color: string }[][] = [];
    
    const stepX = imageData.width / gridSize;
    const stepY = imageData.height / gridSize;

    // Helper to get color from Z height (0 to 1)
    const getColor = (n: number) => {
        // HSL Transition: Blue (240) -> Green (120) -> Orange (30)
        // This maps 0.0 -> 240, 1.0 -> 30
        const hue = 240 - (n * 210);
        return `hsl(${hue}, 100%, 60%)`;
    };

    let maxZ = 0;

    for (let y = 0; y <= gridSize; y++) {
      const row = [];
      for (let x = 0; x <= gridSize; x++) {
        // Sample image data
        const px = Math.floor(Math.min(x * stepX, imageData.width - 1));
        const py = Math.floor(Math.min(y * stepY, imageData.height - 1));
        const idx = (py * imageData.width + px) * 4;
        
        // Calculate intensity (0-1)
        const intensity = (imageData.data[idx] + imageData.data[idx+1] + imageData.data[idx+2]) / (3 * 255);
        
        if (intensity > maxZ) maxZ = intensity;

        // Centered coordinates
        row.push({
          x: x - gridSize / 2,
          y: y - gridSize / 2,
          z: intensity, 
          color: getColor(intensity)
        });
      }
      points.push(row);
    }

    // --- 2. PROJECTION & RENDER LOOP ---
    const project = (x: number, y: number, z: number) => {
      const cosX = Math.cos(angleRef.current.x);
      const sinX = Math.sin(angleRef.current.x);
      const cosZ = Math.cos(angleRef.current.z);
      const sinZ = Math.sin(angleRef.current.z);

      // Rotation Z (Azimuth)
      const x1 = x * cosZ - y * sinZ;
      const y1 = x * sinZ + y * cosZ;
      
      // Rotation X (Elevation)
      const y2 = y1 * cosX - (z * 15) * sinX; // Z scaled up for visibility
      const z2 = y1 * sinX + (z * 15) * cosX;

      // Perspective
      const perspective = 400 / (500 - y2); 
      const zoom = scaleRef.current;
      
      return {
        x: x1 * perspective * 8 * zoom + width / 2,
        y: -z2 * perspective * 8 * zoom + height / 1.5, // Invert Y for screen coords
      };
    };

    const draw = () => {
      // Clear with dark astro background
      ctx.fillStyle = '#0B0D17'; 
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';

      // Draw Grid Lines - Horizontal (Scanning X)
      for (let y = 0; y <= gridSize; y++) {
        ctx.beginPath();
        for (let x = 0; x <= gridSize; x++) {
          const p = points[y][x];
          const proj = project(p.x, p.y, p.z);
          
          if (x === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        }
        // Use color of the middle of the row roughly, or gradient?
        // Simple wireframe: use a constant subtle color or the Z color
        ctx.strokeStyle = `rgba(80, 100, 160, 0.3)`; // Faint Blue for grid structure
        ctx.stroke();
      }

      // Draw Grid Lines - Vertical (Scanning Y) & Apply Height Colors
      // We draw these "on top" with the Z-color to emphasize the peaks
      for (let x = 0; x <= gridSize; x++) {
        // Optimization: Break path into segments to color them individually based on Z
        for (let y = 0; y < gridSize; y++) {
            const p1 = points[y][x];
            const p2 = points[y+1][x];
            
            const proj1 = project(p1.x, p1.y, p1.z);
            const proj2 = project(p2.x, p2.y, p2.z);

            ctx.beginPath();
            ctx.moveTo(proj1.x, proj1.y);
            ctx.lineTo(proj2.x, proj2.y);
            
            // Color based on the higher Z of the segment
            const maxSegmentZ = Math.max(p1.z, p2.z);
            ctx.strokeStyle = maxSegmentZ < 0.1 ? 'rgba(46, 54, 94, 0.5)' : p2.color; // Dark blue for noise, Bright for signal
            
            // Thicken lines near peak
            ctx.lineWidth = maxSegmentZ > 0.5 ? 2 : 1;
            ctx.stroke();
        }
      }

      // Draw Base Frame (Reference Plane)
      const ext = gridSize / 2;
      const corners = [
          {x: -ext, y: -ext}, {x: ext, y: -ext}, 
          {x: ext, y: ext}, {x: -ext, y: ext}
      ];
      ctx.beginPath();
      corners.forEach((c, i) => {
          const proj = project(c.x, c.y, 0);
          if (i===0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
      });
      ctx.closePath();
      ctx.strokeStyle = '#3D4C8A'; // Astro-500
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const animate = () => {
      if (!isDragging.current) {
         angleRef.current.z += 0.003; // Smooth slow rotation
      }
      draw();
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);

  }, [imageData, width, height]);

  // Interaction Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { isDragging.current = false; };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    
    angleRef.current.z += dx * 0.01;
    angleRef.current.x += dy * 0.01;
    // Limit vertical tilt
    angleRef.current.x = Math.max(0.2, Math.min(Math.PI / 2.2, angleRef.current.x));

    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newScale = Math.min(Math.max(0.5, scaleRef.current + delta), 3.0);
    scaleRef.current = newScale;
    setZoomDisplay(newScale);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-astro-600 shadow-2xl bg-[#0B0D17]">
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height}
        className="cursor-move block"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-3 right-3 pointer-events-none flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-astro-300 font-mono">INTENSITÉ</span>
            <div className="w-20 h-2 rounded bg-gradient-to-r from-blue-700 via-green-500 to-orange-500"></div>
          </div>
      </div>

      <div className="absolute bottom-3 left-3 pointer-events-none">
         <span className="bg-astro-800/80 text-astro-300 text-[10px] font-mono px-2 py-1 rounded border border-astro-600">
            ZOOM: {zoomDisplay.toFixed(1)}x
         </span>
      </div>
    </div>
  );
};

export default PSF3DViewer;