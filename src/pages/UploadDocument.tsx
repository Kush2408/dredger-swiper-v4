import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/upload.css";
import { uploadDocument } from "../services/uploadDocumentService";

declare global { interface Window { Papa: any; XLSX: any; } }

export default function UploadDocument() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<any[][]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");
  const [serverResult, setServerResult] = useState<any | null>(null);

  useEffect(() => {

  }, []);

  const setState = (s: typeof status) => setStatus(s);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setState("processing");
    // upload original file to server as multipart/form-data using shared service
    const uploadFileToServer = async (f: File) => {
      try {
        const json = await uploadDocument(f);
        setServerResult(json);
        return json;
      } catch (err: any) {
        console.error('Upload error', err);
        setServerResult({ status: 'error', message: err?.message ?? String(err) });
        // don't interrupt parsing; surface error to user
        alert('Upload to server failed. See console for details.');
        return null;
      }
    };
    const name = file.name.toLowerCase();
    try {
      // start upload first (await so user sees server response quickly)
      await uploadFileToServer(file);

      if (name.endsWith(".csv")) {
        window.Papa.parse(file, {
          complete: (results: any) => { setRows(results.data); setState("success"); },
          error: () => setState("idle"),
          skipEmptyLines: true
        });
      } else if (name.endsWith(".xlsx")) {
        const data = await file.arrayBuffer();
        const wb = window.XLSX.read(data, { type: "array" });
        const first = wb.SheetNames[0];
        const ws = wb.Sheets[first];
        const r = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        setRows(r); setState("success");
      } else {
        setState("idle");
        alert("Unsupported file type. Use .csv or .xlsx");
      }
    } catch (err) {
      console.error(err);
      setState("idle");
      alert("Error reading file");
    }
  };

  const header = rows[0] && rows[0].every((h: any) => typeof h === "string") ? rows[0] : [];
  const dataRows = header.length ? rows.slice(1, 10) : rows.slice(0, 10);
  const headers = header.length ? header : (rows[0]?.map((_: any, i: number) => `Column ${i+1}`) || []);

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "radial-gradient(circle at center, #0a192f 0%, #020a15 100%)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="glass-card rounded-2xl p-6 holo-hover lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--ocean-blue)]">Upload Datasheet</h2>
              <div>
                <label htmlFor="fileInput" className="cursor-pointer bg-[var(--ocean-blue)]/20 border border-[var(--ocean-blue)] text-[var(--ocean-blue)] px-3 py-1 rounded-md hover:bg-[var(--ocean-blue)]/30 transition">Choose File</label>
                <input id="fileInput" ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e)=>handleFile(e.target.files?.[0])} />
              </div>
            </div>
            <div id="dropzone" className="dropzone flex flex-col items-center justify-center p-10 text-center"
              onDragEnter={(e)=>{e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("dragover");}}
              onDragOver={(e)=>{e.preventDefault(); e.stopPropagation();}}
              onDragLeave={(e)=>{e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("dragover");}}
              onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("dragover"); const f=e.dataTransfer?.files?.[0]; handleFile(f || undefined); }}>
              <i className="fas fa-cloud-upload-alt text-4xl text-[var(--ocean-blue)] mb-3"></i>
              <p className="text-sm text-gray-300">Drag & drop your Excel (.xlsx) or CSV (.csv) file here</p>
              <p className="text-xs text-gray-500 mt-1">or click "Choose File" to select</p>
            </div>
            <div className="mt-3 text-xs text-gray-400">Max size 10MB. Data stays in-browser.</div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${status !== "success" ? "pulse-glow" : ""}`} style={{ border: `2px solid ${status==="success" ? "var(--glow-green)" : "var(--ocean-blue)"}`, color: status==="success" ? "var(--glow-green)" : "var(--ocean-blue)" }}>
              {status === "processing" ? <i className="fas fa-spinner fa-pulse"></i> : status === "success" ? <i className="fas fa-check"></i> : <i className="fas fa-spinner fa-pulse"></i>}
            </div>
            <div className="text-sm text-gray-300">
              {status === "processing" ? "Processing Data…" : status === "success" ? "Upload Successful" : "Waiting for file…"}
            </div>
            {serverResult && (
              <div className="mt-2 text-xs text-gray-400 text-center">
                <div>Server: {String(serverResult?.status ?? serverResult?.result?.status ?? '')}</div>
                <div>Rows: {String(serverResult?.result?.rows ?? '')} Columns: {String(serverResult?.result?.columns ?? '')}</div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--ocean-blue)]">Data Preview (first 10 rows)</h3>
            <div className="text-xs text-gray-400">{rows.length ? `${rows.length} rows loaded (showing first 10)` : "No data"}</div>
          </div>
          <div className="overflow-auto max-h-[420px] rounded-xl">
            <table className="w-full table-auto table-glass text-sm">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  {headers.map((h: any, i: number) => (<th key={i} className="text-left px-3 py-2 text-[var(--ocean-blue)]">{h ?? ""}</th>))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((r: any[], ri: number) => (
                  <tr key={ri}>{r.map((c: any, ci: number) => (<td key={ci} className="px-3 py-2 text-gray-200">{c ?? ""}</td>))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}