"use client";

import React, { useEffect, useState, useRef } from "react";
import { Ruler, Check, RefreshCw, PenTool, Eraser, Download, Eye } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface Lead {
  id: string;
  title: string;
  status: string;
  customer?: { name: string };
}

interface Measurement {
  id: string;
  leadId: string;
  width: number;
  height: number;
  shutterType: string;
  motor: string;
  color: string;
  photos: string;
  drawing: string;
  notes: string;
  material?: string;
  pipe?: string;
  spring?: string;
  guide?: string;
  lead?: Lead;
}

const shutterTypes = [
  "Galvanized Steel Slat (1.2mm)",
  "Aluminum Polyurethane Insulated Slat (77mm)",
  "Polycarbonate Transparent Slat",
  "Perforated Grill Security Slat",
  "High Speed PVC Fabric Roll-up"
];

const motors = [
  "Somfy 40Nm Motorised (Single Phase)",
  "Somfy 120Nm Motorised (Heavy Duty)",
  "Generic 40Nm Motorised (Economic)",
  "Generic 100Nm Motorised",
  "Manual Gear Operated (Hand Crank)",
  "Manual Push-Pull Spring Operated"
];

const colors = [
  "Slate Grey (RAL 7016)",
  "Classic Silver (RAL 9006)",
  "Pure White (RAL 9010)",
  "Industrial Bronze",
  "Transparent / Clear"
];

const materials = [
  "Aluminum Double Skin Insulated",
  "Galvanized Iron (GI) 1.2mm",
  "Polycarbonate Transparent Slat",
  "Stainless Steel Grill Slat"
];

const pipes = [
  "3 inch (80mm) Octagonal Pipe",
  "4 inch (100mm) Heavy Duty Steel Pipe",
  "5 inch (130mm) High Gauge Seamless Pipe"
];

const springs = [
  "Flat Wrap Torsion Springs (Pair)",
  "Heavy Duty Torsion Coil Springs",
  "No Springs (Direct Shaft Drive)"
];

const guides = [
  "65mm Standard U-Channel Guide",
  "80mm Wind-Resistant Guide Channel",
  "100mm Heavy Duty Flanged Guide"
];

export default function MeasurementsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [shutterType, setShutterType] = useState(shutterTypes[0]);
  const [motor, setMotor] = useState(motors[0]);
  const [color, setColor] = useState(colors[0]);
  
  const [material, setMaterial] = useState(materials[0]);
  const [pipe, setPipe] = useState(pipes[0]);
  const [spring, setSpring] = useState(springs[0]);
  const [guide, setGuide] = useState(guides[0]);
  const [notes, setNotes] = useState("");
  const [photoSimulation, setPhotoSimulation] = useState("/uploads/sample-shutter.jpg");
  const [drawingData, setDrawingData] = useState("");

  const [notification, setNotification] = useState("");

  // Canvas Drawing Board Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<"draw" | "erase">("draw");

  const fetchData = async () => {
    setLoading(true);
    try {
      const leadsRes = await fetch("/api/leads");
      const measRes = await fetch("/api/measurements");
      if (leadsRes.ok && measRes.ok) {
        setLeads(await leadsRes.json());
        setMeasurements(await measRes.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Initialize canvas default
    resetCanvas();
  }, []);

  // Canvas Sketching Functions
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and set background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw guidance lines (Grid overlay for drawing rolling shutters)
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    for (let i = 20; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 20; j < canvas.height; j += 20) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    setDrawingData("");
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);

    ctx.strokeStyle = drawMode === "draw" ? "#2563eb" : "#ffffff";
    ctx.lineWidth = drawMode === "draw" ? 3 : 15;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Save image base64
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawingData(canvas.toDataURL("image/png"));
    }
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !width || !height) {
      alert("Please specify the associated lead, width and height values.");
      return;
    }

    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          width: parseFloat(width),
          height: parseFloat(height),
          shutterType,
          material,
          pipe,
          spring,
          guide,
          motor,
          color,
          notes,
          photos: photoSimulation,
          drawing: drawingData
        })
      });

      if (res.ok) {
        setNotification("Technical shutter measurement logged!");
        setTimeout(() => setNotification(""), 3000);
        // Reset form
        setSelectedLeadId("");
        setWidth("");
        setHeight("");
        setNotes("");
        resetCanvas();
        fetchData();
      }
    } catch (e) {}
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Grid: Form Left, Measurement Log Right */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* Left Specification Intake Form */}
        <div className="xl:col-span-3 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-5">
          <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            <span>Technical Measurement Intake</span>
          </h2>

          <form onSubmit={handleSaveMeasurement} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Link to Sales Lead
                </label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  <option value="" className="bg-card">Link Lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id} className="bg-card">
                      {l.title} ({l.customer?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Width (mm)</label>
                  <input
                    type="number"
                    required
                    placeholder="4500"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Height (mm)</label>
                  <input
                    type="number"
                    required
                    placeholder="3800"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Shutter Slat Category</label>
                <select
                  value={shutterType}
                  onChange={(e) => setShutterType(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {shutterTypes.map((t) => (
                    <option key={t} value={t} className="bg-card">{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Motor / Drive Unit</label>
                <select
                  value={motor}
                  onChange={(e) => setMotor(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {motors.map((m) => (
                    <option key={m} value={m} className="bg-card">{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">RAL Shutter Color</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {colors.map((c) => (
                    <option key={c} value={c} className="bg-card">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Material Specs</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {materials.map((mat) => (
                    <option key={mat} value={mat} className="bg-card">{mat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Pipe Spec</label>
                <select
                  value={pipe}
                  onChange={(e) => setPipe(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {pipes.map((p) => (
                    <option key={p} value={p} className="bg-card">{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Spring Spec</label>
                <select
                  value={spring}
                  onChange={(e) => setSpring(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {springs.map((s) => (
                    <option key={s} value={s} className="bg-card">{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Guide Spec</label>
                <select
                  value={guide}
                  onChange={(e) => setGuide(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  {guides.map((g) => (
                    <option key={g} value={g} className="bg-card">{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drawing whiteboard */}
            <div className="space-y-2 border border-border/80 p-4 rounded-lg bg-secondary/10">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                  <PenTool className="w-3.5 h-3.5 text-primary" />
                  <span>On-site Hand Sketch Drawing Board</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawMode("draw")}
                    className={`p-1.5 rounded border text-xs font-semibold ${
                      drawMode === "draw" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground"
                    }`}
                    title="Pen tool"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawMode("erase")}
                    className={`p-1.5 rounded border text-xs font-semibold ${
                      drawMode === "erase" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground"
                    }`}
                    title="Eraser tool"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={resetCanvas}
                    className="p-1.5 bg-card hover:bg-secondary border rounded text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Clear Board
                  </button>
                </div>
              </div>

              <div className="flex justify-center bg-white rounded-lg border overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="cursor-crosshair w-full max-w-[520px] h-[220px]"
                />
              </div>
              <span className="text-[9px] text-muted-foreground font-mono">
                Hint: Tap/Click and draw the shutter shape, structural rails, or wiring layout. Will be attached.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Technical Remarks & Adjustments</label>
              <textarea
                rows={2}
                placeholder="Include site constraints, guide length tolerances, electrical connection proximity details."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer"
            >
              Record Specifications Log
            </button>
          </form>
        </div>

        {/* Right Saved Measurement History */}
        <div className="xl:col-span-2 border border-border/80 rounded-xl bg-card/30 flex flex-col max-h-[calc(100vh-230px)]">
          <div className="p-4 border-b border-border/60 bg-secondary/15 flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Technical Logs Registry ({measurements.length})
            </h3>
            <button
              onClick={fetchData}
              className="text-muted-foreground hover:text-foreground p-1 hover:bg-secondary rounded"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-border/60 p-4 space-y-4">
            {measurements.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No technical rolling shutter specs logged.
              </div>
            ) : (
              measurements.map((m) => (
                <div key={m.id} className="bg-card border border-border/80 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-border/40 pb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        {m.lead?.title || "Lead Specs"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Client: {m.lead?.customer?.name || "N/A"}
                      </span>
                    </div>
                    <span className="text-[10px] bg-secondary/80 border font-mono px-2 py-0.5 rounded text-foreground font-bold">
                      {m.width}x{m.height} mm
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed">
                    <div>
                      <span className="text-muted-foreground">Slat Type: </span>
                      <span className="text-foreground font-medium">{m.shutterType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Motor: </span>
                      <span className="text-foreground font-medium">{m.motor}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RAL Color: </span>
                      <span className="text-foreground font-medium">{m.color}</span>
                    </div>
                    {m.material && (
                      <div>
                        <span className="text-muted-foreground">Material: </span>
                        <span className="text-foreground font-medium">{m.material}</span>
                      </div>
                    )}
                    {m.pipe && (
                      <div>
                        <span className="text-muted-foreground">Pipe: </span>
                        <span className="text-foreground font-medium">{m.pipe}</span>
                      </div>
                    )}
                    {m.spring && (
                      <div>
                        <span className="text-muted-foreground">Spring: </span>
                        <span className="text-foreground font-medium">{m.spring}</span>
                      </div>
                    )}
                    {m.guide && (
                      <div>
                        <span className="text-muted-foreground">Guide: </span>
                        <span className="text-foreground font-medium">{m.guide}</span>
                      </div>
                    )}
                  </div>

                  {m.drawing && (
                    <div className="mt-2 border border-border/60 rounded bg-white p-2 overflow-hidden flex flex-col items-center gap-1.5">
                      <span className="text-[9px] text-slate-500 font-mono self-start">Technical Hand Sketch:</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.drawing} alt="Technical Shutter Sketch" className="max-h-24 object-contain" />
                    </div>
                  )}

                  {m.notes && (
                    <p className="text-[10px] text-muted-foreground italic bg-secondary/20 p-2 rounded border border-border/20 mt-1">
                      Note: {m.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
