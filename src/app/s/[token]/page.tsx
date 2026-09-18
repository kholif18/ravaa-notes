"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SharedNotePage() {
  const params = useParams() as { token: string };
  const token = params.token;
  const [note, setNote] = useState<any>(null);
  const [share, setShare] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  async function load(pwd?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/shared/${token}${pwd ? `?password=${encodeURIComponent(pwd)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNote(data.data.note);
        setShare(data.data.share);
        setEditContent(data.data.note?.content || "");
        setNeedsPassword(false);
      } else {
        if (data.needsPassword) setNeedsPassword(true);
        setError(data.error || "Failed to load");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!share || share.permission !== "edit") return;
    try {
      const res = await fetch(`/api/shared/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, password: password || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setNote({ ...note, content: editContent });
        setIsEditing(false);
      } else {
        alert(data.error || "Gagal save");
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  useEffect(() => { load(); }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">Loading...</div>;
  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4">
        <div className="w-full max-w-sm p-6 rounded-2xl border bg-white/5 backdrop-blur-xl border-white/10">
          <h1 className="font-semibold text-white">Link diproteksi password</h1>
          <p className="text-sm text-zinc-400 mt-1">Masukkan password yang dibagikan</p>
          <form onSubmit={(e) => { e.preventDefault(); load(password); }} className="mt-4 space-y-3">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-white" autoFocus />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Buka</button>
          </form>
        </div>
      </div>
    );
  }
  if (error || !note) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white"><p className="text-zinc-400">{error || "Not found"}</p></div>;
  }

  const canEdit = share?.permission === "edit";
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-xs text-zinc-500 mb-2">Shared via Ravaa Notes • {share?.permission === "edit" ? "✏️ Bisa edit" : "👁️ Read-only"} • {note.isPinned ? "📌 Pinned" : ""}</p>
        <h1 className="text-2xl font-bold">{note.title}</h1>
        {note.tags && <p className="text-xs text-zinc-400 mt-1">Tags: {note.tags}</p>}
        {canEdit && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className={`px-3 py-1.5 text-xs rounded-lg ${isEditing ? "bg-blue-600 text-white" : "bg-[#1A1A1A] hover:bg-[#232323] text-zinc-300"}`}>{isEditing ? "Preview" : "Edit"}</button>
            {isEditing && <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Save</button>}
          </div>
        )}
        <div className="mt-6 prose prose-invert max-w-none bg-[#141414] p-4 rounded-xl border border-white/5 prose-p:whitespace-pre-wrap prose-p:break-words prose-code:whitespace-pre-wrap prose-code:break-words prose-code:break-all prose-pre:whitespace-pre-wrap prose-pre:break-words prose-a:break-words">
          {isEditing && canEdit ? (
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full min-h-[300px] bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children, ...props }: any) => {
                  const text = String(children);
                  if (typeof text === "string" && (text.startsWith("→ ") || text.startsWith("  ") || text.startsWith("\u00a0"))) {
                    const clean = text.replace(/^→\s*/, "").replace(/^\u00a0+/, "").replace(/^  /, "").trimStart();
                    return <p className="ml-6" {...props}>{clean || children}</p>;
                  }
                  return <p className="break-words whitespace-pre-wrap" {...props}>{children}</p>;
                },
                a: ({ children, href, ...props }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="break-words" {...props}>{children}</a>,
                code: ({ children, className, ...props }: any) => {
                  const isInline = !className || !String(className).includes("language-");
                  if (isInline) {
                    return <code className="bg-[#1A1A1A] text-amber-300 px-1 py-0.5 rounded text-sm break-words" {...props}>{children}</code>;
                  }
                  return <code className={String(className) + " bg-transparent p-0"} {...props}>{children}</code>;
                },
                pre: ({ children, ...props }: any) => (
                  <div className="relative group">
                    <pre className="bg-[#141414] p-3 rounded-lg overflow-auto whitespace-pre-wrap break-words break-all" {...props}>{children}</pre>
                    <button onClick={() => navigator.clipboard.writeText(String((children as any)?.props?.children || children))} className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#232323] hover:bg-[#2a2a2a] rounded opacity-0 group-hover:opacity-100">Copy</button>
                  </div>
                ),
              }}
            >
              {(isEditing ? editContent : note.content || "*No content*").replace(/\[\[(.*?)\]\]/g, "[$1](#internal:$1)")}
            </ReactMarkdown>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-4">{canEdit ? "Bisa edit — klik Edit di atas" : "Read-only • minta link Edit dari pemilik untuk bisa edit"}</p>
      </div>
    </div>
  );
}
