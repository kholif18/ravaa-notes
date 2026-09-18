"use client";
import { useEffect, useState, useMemo } from "react";
import { Plus, Search, BookOpen, StickyNote, Pin, Trash2, Share2, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Code, Eye, Edit3, Tag, Star, Image as ImageIcon, Music, LogOut, ArrowRightLeft, FolderInput, ArrowRight, ArrowLeft } from "lucide-react";
import { MoveNoteDialog } from "@/components/ui/move-note-dialog";
import { ShareDialog } from "@/components/notes/share-note-dialog";
import { ConfirmDialog, PromptDialog } from "@/components/ui/confirm-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [activeNotebook, setActiveNotebook] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [filterPinned, setFilterPinned] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const historyMapRef = useState(() => new Map<string, { stack: string[]; index: number; isUndoRedo?: boolean }>())[0] as Map<string, { stack: string[]; index: number; isUndoRedo?: boolean }>;
  const [historyVersion, setHistoryVersion] = useState(0);
  const getHistory = (noteId: string) => {
    if (!historyMapRef.has(noteId)) {
      const note = notes.find((n:any) => n.id === noteId);
      const initial = note ? note.content : "";
      historyMapRef.set(noteId, { stack: [initial], index: 0 });
    }
    return historyMapRef.get(noteId)!;
  };
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showNewNotebookPrompt, setShowNewNotebookPrompt] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newNotebookParent, setNewNotebookParent] = useState<string | null>(null);
  const [moveNote, setMoveNote] = useState<any>(null);
  const [shareNote, setShareNote] = useState<any>(null);
  const [dragOverNotebook, setDragOverNotebook] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [noteContextMenu, setNoteContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  async function load() {
    const q = new URLSearchParams();
    if (activeNotebook) q.set("notebookId", activeNotebook);
    if (search) q.set("q", search);
    if (filterPinned) q.set("pinned", "true");
    if (showTrash) q.set("trash", "true");
    const [nRes, nbRes] = await Promise.all([
      fetch(`/api/notes?${q}`, { credentials: "include" }).then(r => r.json()).catch(() => ({ data: { notes: [] } })),
      fetch("/api/notebooks", { credentials: "include" }).then(r => r.json()).catch(() => ({ data: { lists: [] } })),
    ]);
    if (nRes.success) setNotes(nRes.data.notes);
    if (nbRes.success) setNotebooks(nbRes.data.lists);
  }
  useEffect(() => { load(); }, [activeNotebook, search, filterPinned, showTrash]);
  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setContent(selected.content);
      setTagsInput(selected.tags || "");
      // Init history for this note if not exists
      if (!historyMapRef.has(selected.id)) {
        historyMapRef.set(selected.id, { stack: [selected.content || ""], index: 0 });
        setHistoryVersion(v => v + 1);
      }
    }
  }, [selected]);

  async function create() {
    const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled", content: "", notebookId: activeNotebook, tags: "" }) });
    const data = await res.json();
    if (data.success) { load(); setSelected(data.data.note); }
  }
  async function save() {
    if (!selected) return;
    await fetch(`/api/notes/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title, content, tags: tagsInput }) });
    load();
  }

  function toggleTaskInPreview(index: number) {
    const lines = content.split("\n");
    let taskIdx = -1;
    const newLines = lines.map((line) => {
      if (/^\s*- \[[ x]\]/i.test(line)) {
        taskIdx++;
        if (taskIdx === index) {
          if (/^\s*- \[ \]/i.test(line)) return line.replace(/\[ \]/, "[x]");
          else return line.replace(/\[x\]/i, "[ ]");
        }
      }
      return line;
    });
    const newContent = newLines.join("\n");
    setContent(newContent);
    // auto save
    setTimeout(async () => {
      if (selected) {
        await fetch(`/api/notes/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ content: newContent }) });
        load();
      }
    }, 100);
  }

  async function handleImageInsert() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,audio/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      if (selected?.id) form.append("noteId", selected.id);
      // Upload via notes proxy -> Drive Ravaa Notes/{noteId} biar gak campur My Drive
      try {
        const res = await fetch("/api/upload-proxy", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const data = await res.json();
        if (data.success && data.data?.file) {
          const url = `http://localhost:2713/api/files/${data.data.file.id}/raw`;
          const md = file.type.startsWith("audio/") ? `[${file.name}](${url})` : `![${file.name}](${url})`;
          insertAtCursor("\n" + md + "\n", "");
        } else {
          alert("Upload gagal: " + (data.error || "unknown"));
        }
      } catch (err: any) {
        alert("Upload error: " + err.message);
      }
    };
    input.click();
  }
  async function del(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE", credentials: "include" });
    setSelected(null); load();
  }

  async function handleMove(note: any, targetNotebookId: string | null) {
    await fetch(`/api/notes/${note.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ notebookId: targetNotebookId }) });
    setMoveNote(null);
    // Update selected if it's the moved note
    if (selected?.id === note.id) setSelected({ ...selected, notebookId: targetNotebookId });
    load();
  }

  function handleDragStart(e: React.DragEvent, noteId: string) {
    e.dataTransfer.setData("text/plain", noteId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleNotebookDragOver(e: React.DragEvent, notebookId: string | null) {
    e.preventDefault();
    setDragOverNotebook(notebookId || "root");
  }

  function handleNotebookDrop(e: React.DragEvent, notebookId: string | null) {
    e.preventDefault();
    setDragOverNotebook(null);
    const noteId = e.dataTransfer.getData("text/plain");
    const notebookIdDrag = e.dataTransfer.getData("text/notebook");
    if (notebookIdDrag) {
      handleNotebookMove(notebookIdDrag, notebookId);
      return;
    }
    if (!noteId) return;
    const note = notes.find((n: any) => n.id === noteId);
    if (note) handleMove(note, notebookId);
  }
  async function restore(id: string) {
    await fetch(`/api/notes/${id}/restore`, { method: "POST", credentials: "include" });
    load();
  }
  async function permanentDel(id: string) {
    await fetch(`/api/notes/${id}/permanent`, { method: "DELETE", credentials: "include" });
    setSelected(null); setConfirmDelete(null); load();
  }
  async function togglePin(n: any) {
    await fetch(`/api/notes/${n.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ isPinned: !n.isPinned }) });
    load();
  }

  function insertAtCursor(before: string, after: string = "") {
    const textarea = document.getElementById("note-content") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || "text";
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }

  const filtered = useMemo(() => notes, [notes]);

  // Build notebook tree
  const tree = useMemo(() => {
    const map = new Map<string, any>();
    notebooks.forEach((nb: any) => map.set(nb.id, { ...nb, children: [] }));
    const roots: any[] = [];
    notebooks.forEach((nb: any) => {
      if (nb.parentId && map.has(nb.parentId)) map.get(nb.parentId).children.push(map.get(nb.id));
      else roots.push(map.get(nb.id));
    });
    return roots;
  }, [notebooks]);

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  function renderNotebook(nbs: any[], depth = 0) {
    return nbs.map((nb: any) => {
      const hasChildren = nb.children && nb.children.length > 0;
      const isExpanded = expanded.has(nb.id) || depth === 0;
      const isActive = activeNotebook === nb.id;
      return (
      <div key={nb.id} style={{ marginLeft: depth * 12 }}>
        <div
          onDragOver={(e) => handleNotebookDragOver(e, nb.id)}
          onDragLeave={() => setDragOverNotebook(null)}
          onDrop={(e) => handleNotebookDrop(e, nb.id)}
          onDragOverCapture={(e) => e.preventDefault()}
          className={`rounded flex items-center gap-1 ${dragOverNotebook===nb.id ? "ring-2 ring-zinc-500/20 bg-zinc-800/20" : ""}`}
        >
          <button onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(nb.id); }} className={`w-4 h-4 flex items-center justify-center shrink-0 -ml-1 bg-transparent ${hasChildren ? "text-zinc-400 hover:text-white" : "invisible"}`}>
            <span className={`inline-block transition-transform text-[10px] ${isExpanded ? "rotate-90" : ""}`}>▶</span>
          </button>
          {editingNotebook === nb.id ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if (editingName.trim()) {
                    await fetch(`/api/notebooks/${nb.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: editingName.trim() }) });
                    load();
                  }
                  setEditingNotebook(null);
                } else if (e.key === "Escape") {
                  setEditingNotebook(null);
                }
              }}
              onBlur={() => setEditingNotebook(null)}
              className="flex-1 px-2 py-1 text-sm bg-[#1A1A1A] border border-blue-500 rounded text-white"
              placeholder="Nama notebook"
            />
          ) : (
            <button
              onClick={() => setActiveNotebook(nb.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: nb.id, x: e.clientX, y: e.clientY }); }}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/notebook", nb.id); e.stopPropagation(); }}
              className={`flex-1 text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${isActive ? "bg-blue-600 text-white" : "hover:bg-[#1A1A1A] text-zinc-300"}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0 ml-0" style={{background: nb.color}}></span>
              <span className="truncate flex-1">{nb.name}</span>
            {(() => { const c = notes.filter((n:any) => n.notebookId === nb.id).length; return c > 0 ? <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.12] text-zinc-300 border border-white/10">{c}</span> : null; })()}
              {nb.children?.length > 0 && <span className="text-[10px] px-1 rounded bg-[#232323]">{nb.children.length}</span>}
            </button>
          )}
        </div>
        {hasChildren && isExpanded && <div className="mt-1 border-l border-white/[0.04]/50 ml-2 pl-1">{renderNotebook(nb.children, depth+1)}</div>}
      </div>
    )});
  }

  async function handleNotebookMove(draggedId: string, targetId: string | null) {
    if (draggedId === targetId) return;
    if (targetId) {
      const target = notebooks.find((n:any)=>n.id===targetId) as any;
      if (target?.parentId) {
        const grandparent = notebooks.find((n:any)=>n.id===target.parentId);
        if (grandparent?.parentId) { alert("Cannot move into a sub-notebook"); return; }
      }
    }
    // Prevent moving into own descendant
    const isDescendant = (nodes: any[], target: string, dragged: string): boolean => {
      for (const n of nodes) {
        if (n.id === target) {
          // check if dragged is ancestor of target
          const find = (list: any[], id: string): any => {
            for (const it of list) {
              if (it.id === id) return it;
              const f = it.children ? find(it.children, id) : null;
              if (f) return f;
            }
            return null;
          };
          const draggedNode = find(notebooks, dragged);
          if (draggedNode) {
            const contains = (node: any, tid: string): boolean => {
              if (node.id === tid) return true;
              return node.children?.some((c: any) => contains(c, tid)) || false;
            };
            if (contains(draggedNode, target)) return true;
          }
        }
        if (n.children) if (isDescendant(n.children, target, dragged)) return true;
      }
      return false;
    };
    if (targetId && isDescendant(notebooks, targetId, draggedId)) {
      alert("Tidak bisa pindah ke dalam diri sendiri");
      return;
    }
    await fetch(`/api/notebooks`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: draggedId, parentId: targetId }) });
    load();
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden">
      <div className="h-11 border-b border-white/[0.02] flex items-center justify-between px-3 glass-strong shrink-0">
        <span className="font-semibold">Ravaa Notes</span>
        <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); try { localStorage.removeItem("ravaa_token"); } catch {} ; location.href = "/login"; }} className="text-xs px-3 py-1.5 rounded bg-[#1A1A1A] hover:bg-[#232323] flex items-center gap-1"><LogOut className="w-3 h-3" /> Logout</button>
      </div>
      <div className="flex flex-1 overflow-hidden min-h-0">
      <div className="w-60 border-r border-white/[0.02] p-3 hidden md:flex flex-col glass h-full overflow-hidden shrink-0 sticky top-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4" /> Notebooks</h2>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); try { localStorage.removeItem("ravaa_token"); } catch {} ; location.href = "/login"; }} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1A1A1A] rounded" title="Logout"><LogOut className="w-4 h-4" /></button>
        </div>
        <div
          onDragOver={(e) => handleNotebookDragOver(e, null)}
          onDragLeave={() => setDragOverNotebook(null)}
          onDrop={(e) => handleNotebookDrop(e, null)}
          className={`rounded ${dragOverNotebook==="root" ? "ring-2 ring-zinc-500/20 bg-zinc-800/20" : ""}`}
        >
          <button onClick={() => setActiveNotebook(null)} className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${!activeNotebook ? "bg-blue-600 text-white" : "hover:bg-[#1A1A1A] text-zinc-300"}`}><span>All Notes</span><span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-400">{notes.length}</span></button>
        </div>
        <div className="mt-2 space-y-1 flex-1 overflow-y-auto min-h-0 pr-1">
          {tree.length===0 ? <p className="text-xs text-zinc-500">No notebooks</p> : renderNotebook(tree)}
        </div>
        <button onClick={() => setShowNewNotebookPrompt(true)} className="mt-4 w-full px-2 py-1.5 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 justify-center"><Plus className="w-3 h-3" /> New Notebook</button>
        <div className="mt-2">
          <button onClick={() => setShowTrash(!showTrash)} className={`w-full px-2 py-1.5 rounded text-xs flex items-center gap-1 ${showTrash ? "bg-red-600 text-white" : "bg-[#1A1A1A] text-zinc-300 hover:bg-[#232323]"}`}><Trash2 className="w-3 h-3" /> {showTrash ? "Trash" : "Trash"}</button>
        </div>
        <div className="mt-4 pt-4 border-t border-white/[0.03]">
          <button onClick={() => setFilterPinned(!filterPinned)} className={`w-full px-2 py-1.5 rounded text-xs flex items-center gap-1 font-medium ${filterPinned ? "bg-blue-600 text-white" : "bg-[#1A1A1A] text-zinc-300 hover:bg-[#232323] hover:text-white"}`}><Star className="w-3 h-3" /> {filterPinned ? "★ Pinned" : "☆ All Notes"}</button>
        </div>
      </div>

      <div className="w-72 border-r border-white/[0.02] flex flex-col glass h-full overflow-hidden shrink-0">
        {activeNotebook && (() => {
          const findPath = (nodes: any[], target: string, path: any[] = []): any[] | null => {
            for (const n of nodes) {
              const np = [...path, n];
              if (n.id === target) return np;
              if (n.children) {
                const r = findPath(n.children, target, np);
                if (r) return r;
              }
            }
            return null;
          };
          const path = findPath(tree, activeNotebook);
          if (!path) return null;
          return (
            <div className="px-3 py-2 border-b border-white/[0.02] flex items-center gap-1 text-xs overflow-auto">
              <button onClick={() => setActiveNotebook(null)} className="hover:text-white text-zinc-400">All</button>
              {path.map((p: any) => (
                <span key={p.id} className="flex items-center gap-1">
                  <span className="text-zinc-400">/</span>
                  <button onClick={() => setActiveNotebook(p.id)} className={`${p.id===activeNotebook ? "text-blue-400 font-medium" : "text-zinc-400 hover:text-white"}`}>{p.name}</button>
                </span>
              ))}
            </div>
          );
        })()}
        <div className="p-3 border-b border-white/[0.02] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{ if (e.key==='Escape') setSearch(""); }} placeholder="Search title/content..." className="w-full pl-7 pr-7 py-1.5 text-sm bg-[#141414] border border-white/[0.04] rounded" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white">
                <span className="w-3 h-3 flex items-center justify-center">×</span>
              </button>
            )}
          </div>
          <button onClick={create} className="p-1.5 bg-blue-600 rounded hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length===0 ? <p className="p-4 text-sm text-zinc-500">{showTrash ? "Trash kosong" : "No notes"}</p> : filtered.map((n:any)=>(
            <div key={n.id} draggable onDragStart={(e)=>handleDragStart(e, n.id)} onClick={()=>{setSelected(n); setShowPreview(true);}} onContextMenu={(e)=>{e.preventDefault(); e.stopPropagation(); setNoteContextMenu({ id: n.id, x: e.clientX, y: e.clientY });}} className={`p-2.5 border-b border-white/[0.02] cursor-pointer hover:bg-white/5 ${selected?.id===n.id ? "bg-white/10" : ""}`}>
              <p className="text-sm font-medium flex items-center gap-1">{n.isPinned && <Pin className="w-3 h-3 text-blue-400" />}{n.title || "Untitled"}{n.tags && <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-[#232323] text-zinc-300 flex items-center gap-0.5"><Tag className="w-2 h-2" />{n.tags.split(",")[0]}</span>}</p>
              <div className="text-xs text-zinc-400 truncate line-clamp-2 leading-tight prose prose-invert prose-p:m-0 prose-strong:text-zinc-200 prose-em:text-zinc-300 prose-code:text-zinc-200 prose-pre:text-zinc-200 prose-a:text-blue-400 prose-a:break-words prose-a:whitespace-pre-wrap prose-a:break-all max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({children}) => <span>{children}</span>, strong: ({children}) => <strong>{children}</strong>, em: ({children}) => <em>{children}</em>, code: ({children}) => <code>{children}</code>, a: ({children}) => <span>{children}</span>, h1: ({children}) => <span>{children}</span>, h2: ({children}) => <span>{children}</span>, h3: ({children}) => <span>{children}</span>, ul: ({children}) => <span>{children}</span>, ol: ({children}) => <span>{children}</span>, li: ({children}) => <span>{children} </span>, blockquote: ({children}) => <span>{children}</span> }}>
                  {(n.content?.slice(0,100) || "No content").replace(/^#\s+/gm, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1")}
                </ReactMarkdown>
              </div>
              <div className="flex gap-1 mt-1">
                {showTrash ? (
                  <>
                    <button onClick={(e)=>{e.stopPropagation(); restore(n.id);}} className="text-[10px] px-1 py-0.5 rounded bg-green-700 hover:bg-green-600 text-white">Restore</button>
                    <button onClick={(e)=>{e.stopPropagation(); setConfirmDelete(n.id);}} className="text-[10px] px-1 py-0.5 rounded bg-red-700 hover:bg-red-600 text-white">Delete permanently</button>
                  </>
                ) : (
                  <>
                    <button onClick={(e)=>{e.stopPropagation(); togglePin(n);}} className="text-[10px] px-1 py-0.5 rounded bg-[#232323] hover:bg-[#2a2a2a]">{n.isPinned ? "Unpin" : "Pin"}</button>
                    <button onClick={(e)=>{e.stopPropagation(); del(n.id);}} className="text-[10px] px-1 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-300">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
        {selected ? (
          <>
            <div className="p-3 border-b border-white/[0.02] flex flex-wrap items-center gap-2">
              <input value={title} onChange={e=>setTitle(e.target.value)} className="flex-1 min-w-[150px] px-2 py-1.5 text-sm bg-[#141414] border border-white/[0.04] rounded font-medium" placeholder="Title" />
              <input value={tagsInput} onChange={e=>setTagsInput(e.target.value)} placeholder="tags, comma" className="w-32 px-2 py-1.5 text-xs bg-[#141414] border border-white/[0.04] rounded" />
              <button onClick={save} className="px-3 py-1.5 text-xs bg-blue-600 rounded hover:bg-blue-700">Save</button>
              <div className="flex gap-1 flex-wrap">
                {(tagsInput.split(",").map((t:string)=>t.trim()).filter(Boolean) as string[]).map((tag:string) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 flex items-center gap-1">
                    {tag} <button onClick={()=>setTagsInput(tagsInput.split(",").filter((x:string)=>x.trim()!==tag).join(", "))} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
              <button onClick={()=>setMoveNote(selected)} className="p-1.5 text-zinc-400 hover:text-blue-400" title="Pindah notebook"><FolderInput className="w-4 h-4" /></button>
              <button onClick={()=>del(selected.id)} className="p-1.5 text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              <button onClick={() => setShareNote(selected)} className="p-1.5 text-zinc-400 hover:text-white" title="Share"><Share2 className="w-4 h-4" /></button>
              <button onClick={()=>setShowPreview(!showPreview)} className={`p-1.5 rounded ${showPreview ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>{showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            <div className="px-2 py-1.5 border-b border-white/[0.02] flex flex-wrap gap-1 glass">
              <button onClick={()=>insertAtCursor("**", "**")} title="Bold" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><Bold className="w-3 h-3" /> Bold</button>
              <button onClick={()=>insertAtCursor("*", "*")} title="Italic" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><Italic className="w-3 h-3" /> Italic</button>
              <button onClick={()=>insertAtCursor("~~", "~~")} title="Strikethrough" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">S̶</button>
              <button onClick={()=>insertAtCursor("# ", "")} title="H1" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><Heading1 className="w-3 h-3" /> H1</button>
              <button onClick={()=>insertAtCursor("## ", "")} title="H2" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">H2</button>
              <button onClick={()=>insertAtCursor("### ", "")} title="H3" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">H3</button>
              <button onClick={()=>insertAtCursor("- ", "")} title="Bullet List" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><List className="w-3 h-3" /> List</button>
              <button onClick={()=>insertAtCursor("1. ", "")} title="Numbered List" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><ListOrdered className="w-3 h-3" /> 1.</button>
              <button onClick={()=>insertAtCursor("- [ ] ", "")} title="Task" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">☐ Task</button>
              <button onClick={()=>insertAtCursor("> ", "")} title="Quote" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">❝ Quote</button>
              <button onClick={()=>{
                const url = prompt("URL untuk link:");
                if (url) insertAtCursor("[", `]( ${url})`.replace(" ", ""));
                else insertAtCursor("[", "](url)");
              }} title="Link [text](url)" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">Link</button>
              <button onClick={()=>insertAtCursor("\n---\n", "")} title="HR" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">— HR</button>
              <button onClick={()=>insertAtCursor("```\n", "\n```")} title="Code" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><Code className="w-3 h-3" /> Code</button>
              <button onClick={() => {
                const table = "| Header 1 | Header 2 |\n|---|---|\n|  |  |\n|  |  |";
                insertAtCursor("\n" + table + "\n", "");
              }} title="Table" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">Table</button>
              <button onClick={()=>insertAtCursor("[[", "]]")} title="Internal Link [[Note]]" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323]">[[Link]]</button>
              <button onClick={handleImageInsert} title="Image/Audio" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Image</button>
              <button onClick={()=>{
                const ta = document.getElementById("note-content") as HTMLTextAreaElement;
                if (!ta) return;
                const s = ta.selectionStart, e = ta.selectionEnd;
                const v = ta.value;
                const before = v.substring(0, s);
                const after = v.substring(e);
                const sel = v.substring(s, e);
                if (s === e) {
                  const lines = before.split("\n");
                  const cur = lines[lines.length-1];
                  lines[lines.length-1] = "  " + cur;
                  const nc = lines.join("\n") + after;
                  setContent(nc);
                  setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = s + 2; ta.focus(); }, 0);
                } else {
                  const indented = sel.split("\n").map(l => "  " + l).join("\n");
                  const nc = v.substring(0, s) + indented + v.substring(e);
                  setContent(nc);
                  setTimeout(()=>{ ta.selectionStart = s + 2; ta.selectionEnd = e + 2*sel.split("\n").length; ta.focus(); }, 0);
                }
              }} title="Increase indent" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center"><ArrowRight className="w-3 h-3" /></button>
              <button onClick={()=>{
                const ta = document.getElementById("note-content") as HTMLTextAreaElement;
                if (!ta) return;
                const start = ta.selectionStart, end = ta.selectionEnd;
                const val = ta.value;
                if (start === end) {
                  const beforeLines = val.substring(0, start).split("\n");
                  const cur = beforeLines[beforeLines.length-1];
                  if (cur.startsWith("→ ")) {
                    beforeLines[beforeLines.length-1] = cur.slice(2);
                    const newContent = beforeLines.join("\n") + val.substring(end);
                    setContent(newContent);
                    setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = start - 2; ta.focus(); }, 0);
                  } else if (cur.startsWith("  ")) {
                    beforeLines[beforeLines.length-1] = cur.slice(2);
                    const newContent = beforeLines.join("\n") + val.substring(end);
                    setContent(newContent);
                    setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = start - 2; ta.focus(); }, 0);
                  }
                } else {
                  const sel = val.substring(start, end);
                  const lines = sel.split("\n");
                  const outdented = lines.map(l => {
                    if (l.startsWith("→ ")) return l.slice(2);
                    if (l.startsWith("  ")) return l.slice(2);
                    return l;
                  }).join("\n");
                  const newContent = val.substring(0, start) + outdented + val.substring(end);
                  setContent(newContent);
                  setTimeout(()=>{ ta.selectionStart = start; ta.selectionEnd = start + outdented.length; ta.focus(); }, 0);
                }
              }} title="Decrease indent" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center"><ArrowLeft className="w-3 h-3" /></button>
                            <button onClick={()=>{
                if (!selected) return;
                const h = getHistory(selected.id);
                if (h.index > 0) {
                  (h as any).isUndoRedo = true;
                  h.index--;
                  const val = h.stack[h.index];
                  setContent(val);
                  setHistoryVersion(v=>v+1);
                  setTimeout(()=>{ const ta = document.getElementById("note-content") as HTMLTextAreaElement; if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = val.length; } }, 0);
                }
              }} title="Undo (Ctrl+Z)" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center disabled:opacity-30" disabled={selected ? getHistory(selected.id).index===0 : true}>↩ Undo</button>
              <button onClick={()=>{
                if (!selected) return;
                const h = getHistory(selected.id);
                if (h.index < h.stack.length - 1) {
                  (h as any).isUndoRedo = true;
                  h.index++;
                  const val = h.stack[h.index];
                  setContent(val);
                  setHistoryVersion(v=>v+1);
                  setTimeout(()=>{ const ta = document.getElementById("note-content") as HTMLTextAreaElement; if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = val.length; } }, 0);
                }
              }} title="Redo (Ctrl+Y)" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center disabled:opacity-30" disabled={selected ? getHistory(selected.id).index===getHistory(selected.id).stack.length-1 : true}>↪ Redo</button>
            </div>
            {showPreview ? (
              <div className="flex-1 p-4 overflow-auto prose prose-invert max-w-none bg-[#0A0A0A] prose-p:whitespace-pre-wrap prose-p:break-words prose-p:break-all prose-pre:bg-[#141414] prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-hidden prose-code:whitespace-pre-wrap prose-code:break-words prose-code:break-all prose-code:text-zinc-200 prose-pre:text-zinc-200 prose-a:text-blue-400 prose-a:break-words prose-a:whitespace-pre-wrap prose-a:break-all prose-headings:text-white prose-strong:text-white prose-blockquote:border-l-blue-500 prose-li:has-[input:checked]:line-through prose-li:has-[input:checked]:text-zinc-500">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ children, href, ...props }: any) => {
                      if (href?.startsWith("#internal:")) {
                        const title = decodeURIComponent(href.replace("#internal:", ""));
                        return (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const target = notes.find((n: any) => n.title.trim() === title.trim());
                              if (target) setSelected(target);
                              else alert(`Note "${title}" tidak ditemukan`);
                            }}
                            className="text-blue-400 hover:underline cursor-pointer font-medium break-words whitespace-pre-wrap"
                            {...props}
                          >
                            {children} ↗
                          </a>
                        );
                      }
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="break-words whitespace-pre-wrap break-all" {...props}>{children}</a>
                      );
                    },
                    img: ({ src, alt, ...props }: any) => (
                      <img src={src} alt={alt} {...props} className="max-w-full rounded-lg border border-white/[0.04]" loading="lazy" />
                    ),
                    code: ({ children, className, ...props }: any) => {
                  const isInline = !className || !String(className).includes("language-");
                  if (isInline) {
                    return <code className="bg-[#1A1A1A] text-amber-300 px-1 py-0.5 rounded text-sm break-words" {...props}>{children}</code>;
                  }
                  return <code className={String(className) + " bg-transparent p-0"} {...props}>{children}</code>;
                },
                    p: ({ children, ...props }: any) => {
                      const text = String(children);
                      if (typeof text === "string" && (text.startsWith("→ ") || text.startsWith("  ") || text.startsWith("\u00a0") || text.startsWith("\u200B"))) {
                        const clean = text.replace(/^→\s*/, "").replace(/^\u200B\s*/, "").replace(/^\u00a0+/, "").replace(/^  /, "").trimStart();
                        return <p className="ml-6 break-words whitespace-pre-wrap" {...props}>{clean || children}</p>;
                      }
                      return <p className="break-words whitespace-pre-wrap" {...props}>{children}</p>;
                    },
                                    pre: ({ children, ...props }: any) => (
                  <div className="relative group">
                    <pre className="bg-[#141414] p-3 rounded-lg overflow-auto whitespace-pre-wrap break-words break-all" {...props}>{children}</pre>
                    <button onClick={() => navigator.clipboard.writeText(String((children as any)?.props?.children || children))} className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#232323] hover:bg-[#2a2a2a] rounded opacity-0 group-hover:opacity-100">Copy</button>
                  </div>
                ),
                  }}
                >
                  {(content || "*No content*").replace(/\[\[(.+?)\]\]/g, (m: string, p1: string) => `[${p1.trim()}](#internal:${encodeURIComponent(p1.trim())})`)}
                </ReactMarkdown>
                <p className="text-xs text-zinc-500 mt-4">Tip: klik checkbox di atas untuk toggle tanpa masuk edit</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-1 text-xs text-zinc-500 border-b border-white/5 flex justify-between">
                  <span>{content.split(/\s+/).filter(Boolean).length} words • {content.length} chars</span>
                  <span>{content.split("\n").length} lines</span>
                </div>
                <textarea
                id="note-content"
                value={content}
                onChange={e=>{
                  const val = e.target.value;
                  if (selected) {
                    const h = getHistory(selected.id);
                    if (!(h as any).isUndoRedo) {
                      if (h.stack[h.index] !== val) {
                        h.stack = h.stack.slice(0, h.index + 1);
                        h.stack.push(val);
                        h.index = h.stack.length - 1;
                        setHistoryVersion(v=>v+1);
                      }
                    } else {
                      (h as any).isUndoRedo = false;
                      setHistoryVersion(v=>v+1);
                    }
                  }
                  setContent(val);
                }}
                onKeyDown={e=>{
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
                    e.preventDefault();
                    if (selected) {
                      const h = getHistory(selected.id);
                      if (h.index > 0) {
                        (h as any).isUndoRedo = true;
                        h.index--;
                        const val = h.stack[h.index];
                        setContent(val);
                        setHistoryVersion(v=>v+1);
                      }
                    }
                    return;
                  }
                  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
                    e.preventDefault();
                    if (selected) {
                      const h = getHistory(selected.id);
                      if (h.index < h.stack.length - 1) {
                        (h as any).isUndoRedo = true;
                        h.index++;
                        const val = h.stack[h.index];
                        setContent(val);
                        setHistoryVersion(v=>v+1);
                      }
                    }
                    return;
                  }
                  if (e.key === "Enter") {
                    const ta = e.currentTarget as HTMLTextAreaElement;
                    const val = ta.value;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const before = val.substring(0, start);
                    const after = val.substring(end);
                    const lines = before.split("\n");
                    const currentLine = lines[lines.length - 1];
                    // Match indent + marker (task, bullet, numbered)
                    const taskMatch = currentLine.match(/^(\s*)(- \[[ x]\] )(.*)$/i);
                    const bulletMatch = currentLine.match(/^(\s*)(- )(.*)$/);
                    const numberedMatch = currentLine.match(/^(\s*)(\d+)\. (.*)$/);
                    let insert = "";
                    let indent = "";
                    let marker = "";
                    let rest = "";
                    if (taskMatch) {
                      indent = taskMatch[1];
                      marker = taskMatch[2];
                      rest = taskMatch[3];
                      if (rest.trim() === "") {
                        e.preventDefault();
                        lines[lines.length - 1] = "";
                        const newContent = lines.join("\n") + after;
                        setContent(newContent);
                        setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = before.lastIndexOf("\n") + 1; }, 0);
                        return;
                      }
                      insert = "\n" + indent + "- [ ] ";
                    } else if (bulletMatch) {
                      indent = bulletMatch[1];
                      marker = bulletMatch[2];
                      rest = bulletMatch[3];
                      if (rest.trim() === "") {
                        e.preventDefault();
                        lines[lines.length - 1] = "";
                        const newContent = lines.join("\n") + after;
                        setContent(newContent);
                        setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = before.lastIndexOf("\n") + 1; }, 0);
                        return;
                      }
                      insert = "\n" + indent + marker;
                    } else if (numberedMatch) {
                      indent = numberedMatch[1];
                      const num = parseInt(numberedMatch[2], 10);
                      rest = numberedMatch[3];
                      if (rest.trim() === "") {
                        e.preventDefault();
                        lines[lines.length - 1] = "";
                        const newContent = lines.join("\n") + after;
                        setContent(newContent);
                        setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = before.lastIndexOf("\n") + 1; }, 0);
                        return;
                      }
                      insert = "\n" + indent + (num + 1) + ". ";
                    }
                    if (insert) {
                      e.preventDefault();
                      const newContent = before + insert + after;
                      setContent(newContent);
                      setTimeout(()=>{ ta.selectionStart = ta.selectionEnd = start + insert.length; }, 0);
                    }
                  }
                }}
                placeholder="Write markdown... (support **bold**, *italic*, # heading, - list, ```code```, - [ ] task — Enter untuk lanjut otomatis)"
                className="flex-1 p-4 bg-[#0A0A0A] text-sm font-mono resize-none focus:outline-none"
              />
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <StickyNote className="w-12 h-12 mb-2 opacity-20" />
            <p>Select a note or create new</p>
            <p className="text-xs mt-1">Joplin-style: notebooks, tags, pin, search, markdown toolbar, preview</p>
          </div>
        )}
      </div>
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Permanently delete?"
        description="This note will be permanently deleted and cannot be restored."
        confirmText="Delete permanently"
        variant="danger"
        onConfirm={() => confirmDelete && permanentDel(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <PromptDialog
        open={showNewNotebookPrompt}
        title="New notebook name"
        placeholder="e.g. Work, Personal"
        onSubmit={async (name: string) => {
          const parentId = newNotebookParent || activeNotebook || null;
          if (parentId) {
            const parent = notebooks.find((n:any)=>n.id===parentId) as any;
            if (parent?.parentId) {
              const gp = notebooks.find((n:any)=>n.id===parent.parentId);
              if (gp?.parentId) { alert("Maximum depth"); return; }
            }
          }
          const res = await fetch("/api/notebooks", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name, parentId }) });
          const data = await res.json();
          if (!res.ok) alert(data.error || "Gagal");
          setShowNewNotebookPrompt(false);
          setNewNotebookParent(null);
          load();
        }}
        onCancel={() => { setShowNewNotebookPrompt(false); setNewNotebookParent(null); }}
      />
      <MoveNoteDialog
        open={!!moveNote}
        noteTitle={moveNote?.title || "Untitled"}
        notebooks={notebooks}
        activeNotebookId={activeNotebook}
        currentNotebookId={moveNote?.notebookId || null}
        onMove={(targetId) => moveNote && handleMove(moveNote, targetId)}
        onCancel={() => setMoveNote(null)}
      />
      {shareNote && <ShareDialog note={shareNote} onClose={() => setShareNote(null)} />}
      {contextMenu && (
        <div className="fixed z-50 bg-[#1A1A1A] border border-white/[0.04] rounded-lg shadow-xl py-1 min-w-[180px]" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => setContextMenu(null)}>
          <button onClick={() => { const nb = notebooks.find((n:any)=>n.id===contextMenu.id); if (nb) { setEditingName(nb.name); setEditingNotebook(nb.id); } setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#232323]">Rename</button>
          <button onClick={() => { const target = notebooks.find((n:any)=>n.id===contextMenu.id) as any; if (target?.parentId) { const gp = notebooks.find((n:any)=>n.id===target.parentId); if (gp?.parentId) { alert("Maximum depth"); return; } } setNewNotebookParent(contextMenu.id); setShowNewNotebookPrompt(true); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#232323]">New Sub-notebook</button>
          <button onClick={async () => { if (!confirm("Hapus notebook? Note di dalamnya jadi All Notes")) return; await fetch(`/api/notebooks/${contextMenu.id}`, { method: "DELETE", credentials: "include" }); setContextMenu(null); load(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-900/50 text-red-400">Delete</button>
        </div>
      )}
      {contextMenu && <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />}
      {noteContextMenu && (
        <div className="fixed z-50 bg-[#1A1A1A] border border-white/[0.04] rounded-xl shadow-2xl py-1 min-w-[180px]" style={{ left: noteContextMenu.x, top: noteContextMenu.y }}>
          <button onClick={() => { const n = notes.find((x:any)=>x.id===noteContextMenu.id); if (n) togglePin(n); setNoteContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 flex items-center gap-2"><Pin className="w-3 h-3" /> {notes.find((x:any)=>x.id===noteContextMenu.id)?.isPinned ? "Unpin" : "Pin"}</button>
          <button onClick={() => { const n = notes.find((x:any)=>x.id===noteContextMenu.id); if (n) setMoveNote(n); setNoteContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 flex items-center gap-2"><FolderInput className="w-3 h-3" /> Pindah</button>
          <button onClick={() => { const n = notes.find((x:any)=>x.id===noteContextMenu.id); if (n) setShareNote(n); setNoteContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 flex items-center gap-2"><Share2 className="w-3 h-3" /> Share</button>
          <div className="h-px bg-white/5 my-1" />
          <button onClick={() => { const n = notes.find((x:any)=>x.id===noteContextMenu.id); if (n) { if (showTrash) permanentDel(n.id); else del(n.id); } setNoteContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-900/50 text-red-400 flex items-center gap-2"><Trash2 className="w-3 h-3" /> {showTrash ? "Hapus permanen" : "Hapus"}</button>
        </div>
      )}
      {noteContextMenu && <div className="fixed inset-0 z-40" onClick={() => setNoteContextMenu(null)} />}
    </div>
  );
}
