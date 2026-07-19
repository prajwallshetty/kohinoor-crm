"use client";

import React, { useEffect, useState } from "react";
import { 
  HardDrive, Plus, ArrowUpRight, CloudUpload, FileText, 
  Trash2, ShieldCheck, Check, RefreshCw, Sparkles, Ban
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  category: "PHOTO" | "DRAWING" | "CONTRACT_PDF";
  sizeBytes: number;
  uploadedAt: string;
}

interface StorageQuota {
  totalQuotaBytes: number;
  usedBytes: number;
}

export default function StoragePage() {
  const [quota, setQuota] = useState<StorageQuota>({
    totalQuotaBytes: 10 * 1024 * 1024 * 1024,
    usedBytes: 0
  });
  
  // Custom mock file upload list
  const [files, setFiles] = useState<UploadedFile[]>([
    { id: "f-1", name: "front-elevation-shutter.jpg", category: "PHOTO", sizeBytes: 4.2 * 1024 * 1024, uploadedAt: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: "f-2", name: "wiring-schematic-somfy.pdf", category: "DRAWING", sizeBytes: 18.5 * 1024 * 1024, uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: "f-3", name: "customer-agreement-signed.pdf", category: "CONTRACT_PDF", sizeBytes: 2.1 * 1024 * 1024, uploadedAt: new Date(Date.now() - 3600000 * 48).toISOString() }
  ]);

  const [loading, setLoading] = useState(true);

  // Upload Form Simulation State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileNameInput, setFileNameInput] = useState("");
  const [fileCat, setFileCat] = useState<"PHOTO" | "DRAWING" | "CONTRACT_PDF">("PHOTO");
  const [fileSizeMB, setFileSizeMB] = useState("50"); // mock size slider/input in MB

  const [notification, setNotification] = useState("");
  const [uploadError, setUploadError] = useState("");

  const fetchStorage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storage");
      if (res.ok) {
        setQuota(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchStorage();
    
    // Initialize standard file sizes summation in quota if empty
    // But DataService already handles it statefully!
  }, []);

  const handleSimulateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    
    if (!fileNameInput || !fileSizeMB) {
      setUploadError("Please provide a file name and size.");
      return;
    }

    const sizeBytes = parseFloat(fileSizeMB) * 1024 * 1024;
    
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeBytes })
      });

      if (res.ok) {
        const result = await res.json();
        setQuota(result.quota);
        
        // Add item to local state list
        const newFile: UploadedFile = {
          id: `f-${Date.now()}`,
          name: fileNameInput + (fileCat === "PHOTO" ? ".jpg" : fileCat === "DRAWING" ? ".dwg" : ".pdf"),
          category: fileCat,
          sizeBytes,
          uploadedAt: new Date().toISOString()
        };
        setFiles(prev => [newFile, ...prev]);

        setNotification("Mock file uploaded successfully!");
        setTimeout(() => setNotification(""), 3000);
        
        // Reset
        setFileNameInput("");
        setFileSizeMB("50");
        setShowUploadModal(false);
      } else {
        const errorData = await res.json();
        setUploadError(errorData.error || "Upload rejected.");
      }
    } catch (e) {
      setUploadError("Upload failed connection check.");
    }
  };

  const handleUpgradeQuota = async (gbToAdd: number) => {
    const bytesToAdd = gbToAdd * 1024 * 1024 * 1024;
    try {
      const res = await fetch("/api/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bytesToAdd })
      });

      if (res.ok) {
        const updatedQuota = await res.json();
        setQuota(updatedQuota);
        setNotification(`Storage limit upgraded by +${gbToAdd} GB!`);
        setTimeout(() => setNotification(""), 3000);
      }
    } catch (e) {}
  };

  const handleDeleteSimulatedFile = (id: string, sizeBytes: number) => {
    // Subtract size from local states for visual consistency
    // Simple mock logic
    const nextFiles = files.filter(f => f.id !== id);
    setFiles(nextFiles);
    
    setQuota(prev => {
      const nextUsed = Math.max(0, prev.usedBytes - sizeBytes);
      // Hit endpoint to subtract quota as well
      fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeBytes: -sizeBytes })
      }).catch(() => {});

      return {
        ...prev,
        usedBytes: nextUsed
      };
    });

    setNotification("File removed from storage.");
    setTimeout(() => setNotification(""), 2000);
  };

  const totalGB = quota.totalQuotaBytes / (1024 * 1024 * 1024);
  const usedGB = quota.usedBytes / (1024 * 1024 * 1024);
  const remainingGB = Math.max(0, totalGB - usedGB);
  const usagePercentage = Math.min((quota.usedBytes / quota.totalQuotaBytes) * 100, 100);
  const isFull = quota.usedBytes >= quota.totalQuotaBytes;

  const packages = [
    { label: "Basic Expansion", addGb: 10, price: "₹299/mo" },
    { label: "Business Expansion", addGb: 25, price: "₹599/mo" },
    { label: "Professional Expansion", addGb: 50, price: "₹999/mo" },
    { label: "Enterprise Vault", addGb: 100, price: "₹1,799/mo" }
  ];

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Quota Indicator panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left utilization cards */}
        <div className="lg:col-span-2 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col justify-between gap-6">
          <div className="flex justify-between items-start border-b border-border/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border">
                <HardDrive className={`w-5 h-5 ${isFull ? "text-destructive animate-pulse" : "text-primary"}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-heading">Cloud Storage Vault</h2>
                <span className="text-[10px] text-muted-foreground">Technical blueprints & installation logs storage quota</span>
              </div>
            </div>

            {isFull ? (
              <span className="text-[10px] bg-destructive/15 text-destructive border border-destructive/20 font-bold px-2 py-0.5 rounded animate-pulse">
                Storage Quota Full
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded">
                Quota Healthy
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[10px] uppercase">Space Utilized</span>
                <span className="text-base font-bold text-foreground">{usedGB.toFixed(3)} GB</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-muted-foreground text-[10px] uppercase">Total Capacity</span>
                <span className="text-base font-bold text-foreground">{totalGB.toFixed(0)} GB</span>
              </div>
            </div>

            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isFull ? "bg-destructive animate-pulse" : usagePercentage > 85 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>{usagePercentage.toFixed(1)}% consumed</span>
              <span>{remainingGB.toFixed(3)} GB remaining</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Simulate File Upload</span>
            </button>
          </div>
        </div>

        {/* Right Upgrade quick purchase cards */}
        <div className="lg:col-span-1 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-4">
          <div className="flex flex-col border-b border-border/40 pb-2">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>SaaS Storage Upgrades</span>
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Extend corporate cloud quota limits</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {packages.map((pkg) => (
              <button
                key={pkg.addGb}
                onClick={() => handleUpgradeQuota(pkg.addGb)}
                className="w-full border border-border hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 p-3 rounded-lg flex justify-between items-center transition-all group"
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    +{pkg.addGb} GB Quota
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">{pkg.label}</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-foreground font-mono">{pkg.price}</span>
                  <span className="text-[9px] text-primary group-hover:underline font-mono">Buy Now</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Uploaded File simulation list table */}
      <div className="border border-border/80 rounded-xl bg-card/30 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border/60 bg-secondary/15 flex justify-between items-center">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Vault Blueprints File Registry ({files.length})
          </h3>
          <button
            onClick={fetchStorage}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <th className="p-4">Document / File Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Computed Size</th>
                <th className="p-4">Uploaded Time</th>
                <th className="p-4 text-center">Deletions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    Vault directory is empty.
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const sizeMB = file.sizeBytes / (1024 * 1024);

                  return (
                    <tr key={file.id} className="hover:bg-secondary/25 transition-colors">
                      <td className="p-4 font-bold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{file.name}</span>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground text-[10px] uppercase">
                        {file.category.replace("_", " ")}
                      </td>
                      <td className="p-4 text-right font-mono text-foreground">{sizeMB.toFixed(2)} MB</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(file.uploadedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteSimulatedFile(file.id, file.sizeBytes)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-secondary/80 transition-all cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulate Upload Dialog Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-heading font-semibold text-sm">Simulate File Upload</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleSimulateUpload} className="p-6 space-y-4">
              {uploadError && (
                <div className="bg-destructive/15 border border-destructive/25 text-destructive p-2.5 rounded text-xs flex items-center gap-1.5 animate-shake">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Category</label>
                <select
                  value={fileCat}
                  onChange={(e) => setFileCat(e.target.value as "PHOTO" | "DRAWING" | "CONTRACT_PDF")}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  <option value="PHOTO" className="bg-card">Installation Site Photo</option>
                  <option value="DRAWING" className="bg-card">Technical Blueprint / Drawing</option>
                  <option value="CONTRACT_PDF" className="bg-card">Signed Customer Agreement (PDF)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Document Base Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ground-floor-layout"
                  value={fileNameInput}
                  onChange={(e) => setFileNameInput(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                  <span>Simulated File Size</span>
                  <span className="font-bold text-foreground">{fileSizeMB} MB</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="3000"
                  step="5"
                  value={fileSizeMB}
                  onChange={(e) => setFileSizeMB(e.target.value)}
                  className="w-full accent-primary bg-secondary h-1.5 rounded-lg appearance-none cursor-pointer outline-none"
                />
                <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
                  <span>5 MB</span>
                  <span>3,000 MB (3 GB)</span>
                </div>
              </div>

              {isFull ? (
                <div className="border border-destructive/20 bg-destructive/10 p-3 rounded text-[10px] text-destructive leading-relaxed font-mono">
                  WARNING: Quota limit hit. Upgrades required before uploading new blueprints.
                </div>
              ) : (
                <div className="bg-secondary/15 p-3 rounded-lg border text-[10px] text-muted-foreground leading-relaxed font-mono">
                  Calculates capacity dynamically. Limits capped at {totalGB} GB.
                </div>
              )}

              <button
                type="submit"
                disabled={isFull}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Upload to Cloud Vault
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
