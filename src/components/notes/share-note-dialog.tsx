"use client";
import { useState, useEffect } from "react";
import { Mail, Link, Copy, Check, Trash2, Globe, Lock, Clock, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";

interface ShareUser {
  id: string;
  fullName: string | null;
  email: string;
}

interface Share {
  id: string;
  permission: string;
  shareToken: string | null;
  visibility: string;
  passwordHash: string | null;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  allowDownload: boolean;
  revokedAt: string | null;
  createdAt: string;
  sharedBy: ShareUser;
  sharedWith: ShareUser | null;
}

interface ShareDialogProps {
  note: { id: string; title: string };
  onClose: () => void;
}

export function ShareDialog({ note, onClose }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  const [maxViews, setMaxViews] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreatedLink, setJustCreatedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"link" | "family">("link");

  const fetchShares = async () => {
    const params = new URLSearchParams();
    params.set("noteId", note.id);
    params.set("shareableType", "note");
    params.set("shareableId", note.id);
    const res = await fetch(`/api/share?${params}`);
    const data = await res.json();
    if (data.success) setShares(data.data.shares);
  };

  useEffect(() => { fetchShares(); }, [note.id]);

  const handleShareWithEmail = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload: any = { noteId: note.id, shareableType: "note", shareableId: note.id, visibility: "FAMILY", email: email.trim(), permission };
      if (expiresIn !== "never") {
        const days = parseInt(expiresIn);
        if (!isNaN(days)) payload.expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }
      const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { setError(`Server error: ${text.slice(0,100)}`); return; }
      if (res.ok && data?.success) { setEmail(""); fetchShares(); } else setError(data?.error || `Error ${res.status}`);
    } catch { setError("Failed to share"); } finally { setIsLoading(false); }
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    setError(null);
    setJustCreatedLink(null);
    try {
      const payload: any = { noteId: note.id, shareableType: "note", shareableId: note.id, visibility: "LINK", permission, allowDownload };
      if (password.trim()) payload.password = password.trim();
      if (expiresIn !== "never") {
        const days = parseInt(expiresIn);
        if (!isNaN(days)) payload.expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }
      if (maxViews.trim()) {
        const v = parseInt(maxViews);
        if (!isNaN(v)) payload.maxViews = v;
      }
      const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { setError(`Server error: ${text.slice(0,100)}`); return; }
      if (res.ok && data?.success) {
        const link = `${window.location.origin}/s/${data.data.share.shareToken}`;
        await navigator.clipboard.writeText(link);
        setJustCreatedLink(link);
        setCopied(true);
        fetchShares();
        setTimeout(() => setCopied(false), 2000);
      } else setError(data.error);
    } catch (e: any) { setError(e.message); } finally { setIsLoading(false); }
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/share/${id}`, { method: "DELETE" });
    fetchShares();
  };

  const familyShares = shares.filter((s) => s.visibility === "FAMILY");
  const linkShares = shares.filter((s) => s.visibility === "LINK");

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title={`Share "${note.title}"`} onClose={onClose} />
      <div className="flex gap-1 p-2 bg-slate-900/50">
        <button onClick={() => setActiveTab("link")} className={`flex-1 py-2 text-xs font-medium rounded-lg ${activeTab === "link" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>Link Publik</button>
        <button onClick={() => setActiveTab("family")} className={`flex-1 py-2 text-xs font-medium rounded-lg ${activeTab === "family" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>Keluarga</button>
      </div>
      {activeTab === "link" ? (
        <ModalBody className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <select value={permission} onChange={(e) => setPermission(e.target.value as any)} className="px-2 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white">
                <option value="view">View (read-only)</option>
                <option value="edit">Edit</option>
              </select>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} /> Allow download</label>
            </div>
            <input type="text" placeholder="Password opsional" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-2 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <div className="grid grid-cols-2 gap-2">
              <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="w-full px-2 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white">
                <option value="7">7 hari</option>
                <option value="1">1 hari</option>
                <option value="30">30 hari</option>
                <option value="never">Tidak pernah</option>
              </select>
              <input type="number" placeholder="Max views" value={maxViews} onChange={(e) => setMaxViews(e.target.value)} className="w-full px-2 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white" />
            </div>
            <button onClick={handleCreateLink} disabled={isLoading} className="w-full py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {copied && justCreatedLink ? "Copied!" : "Buat Link & Salin"}
            </button>
            {justCreatedLink && (
              <div className="flex items-center gap-2 p-2 bg-green-900/20 border border-green-700/30 rounded">
                <p className="text-xs break-all text-green-400 flex-1 truncate">{justCreatedLink}</p>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(justCreatedLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-green-400 hover:text-green-300 shrink-0"
                  title="Copy link baru"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium mb-2">Link aktif ({linkShares.length})</p>
              {linkShares.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-2 rounded bg-slate-800/50 mb-1 gap-2">
                  <code className="text-xs font-mono text-blue-400 truncate">{s.permission} • {s.shareToken?.slice(0,10)}...</code>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/s/${s.shareToken}`;
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                        setJustCreatedLink(url);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Copy link"
                    >
                      {copied && justCreatedLink?.includes(s.shareToken || "") ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button onClick={() => handleRevoke(s.id)} className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-300" title="Revoke"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ModalBody>
      ) : (
        <ModalBody className="p-4">
          <div className="flex gap-2">
            <input type="email" placeholder="Email keluarga" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 px-2 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <select value={permission} onChange={(e) => setPermission(e.target.value as any)} className="px-2 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
            <button onClick={handleShareWithEmail} disabled={isLoading || !email.trim()} className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">Share</button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <div className="mt-3">
            {familyShares.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-2 rounded bg-slate-800/50 mb-1">
                <span className="text-xs text-white">{s.sharedWith?.email || "Unknown"}</span>
                <button onClick={() => handleRevoke(s.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </ModalBody>
      )}
    </Modal>
  );
}
