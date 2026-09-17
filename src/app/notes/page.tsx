"use client";
import { useEffect, useState } from "react";
import { Plus, Search, BookOpen, StickyNote, Pin, Trash2, Share2 } from "lucide-react";

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [activeNotebook, setActiveNotebook] = useState<string | null>(null);

  async function load() {
    const token = localStorage.getItem("ravaa_token") || "";
    const h = { Authorization: `Bearer ${token}` } as any;
    const [nRes, nbRes] = await Promise.all([
      fetch("/api/notes", { headers: h }).then(r => r.json()).catch(() => ({ data: { notes: [] } })),
      fetch("/api/notebooks", { headers: h }).then(r => r.json()).catch(() => ({ data: { lists: [] } })),
    ]);
    if (nRes.success) setNotes(nRes.data.notes);
    if (nbRes.success) setNotebooks(nbRes.data.lists);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (selected) { setTitle(selected.title); setContent(selected.content); }
  }, [selected]);

  async function create() {
    const token = localStorage.getItem("ravaa_token") || "";
    const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: "Untitled", content: "", notebookId: activeNotebook }) });
    const data = await res.json();
    if (data.success) { load(); setSelected(data.data.note); }
  }
  async function save() {
    if (!selected) return;
    const token = localStorage.getItem("ravaa_token") || "";
    await fetch(`/api/notes/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ title, content }) });
    load();
  }
  async function del(id: string) {
    const token = localStorage.getItem("ravaa_token") || "";
    await fetch(`/api/notes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSelected(null); load();
  }

  const filtered = notes.filter(n => {
    if (activeNotebook && n.notebookId !== activeNotebook) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      {/* Sidebar notebooks */}
      <div className="w-64 border-r border-slate-800 p-4 hidden md:block">
        <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4" /> Notebooks</h2>
        <button onClick={() => setActiveNotebook(null)} className={`w-full text-left mt-2 px-2 py-1.5 rounded text-sm ${!activeNotebook ? "bg-blue-600" : "hover:bg-slate-800"}`}>All Notes</button>
        {notebooks.map((nb: any) => (
          <button key={nb.id} onClick={() => setActiveNotebook(nb.id)} className={`w-full text-left mt-1 px-2 py-1.5 rounded text-sm flex items-center gap-2 ${activeNotebook===nb.id ? "bg-blue-600" : "hover:bg-slate-800"}`}>
            <span className="w-2 h-2 rounded-full" style={{background: nb.color}}></span>{nb.name}
          </button>
        ))}
        <button onClick={async () => {
          const name = prompt("Nama notebook");
          if (!name) return;
          const token = localStorage.getItem("ravaa_token") || "";
          await fetch("/api/notebooks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name }) });
          load();
        }} className="mt-4 w-full px-2 py-1.5 text-xs bg-slate-800 rounded hover:bg-slate-700 flex items-center gap-1 justify-center"><Plus className="w-3 h-3" /> New Notebook</button>
      </div>

      {/* List */}
      <div className="w-80 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full pl-7 pr-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded" />
          </div>
          <button onClick={create} className="p-1.5 bg-blue-600 rounded hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.length===0 ? <p className="p-4 text-sm text-slate-500">No notes</p> : filtered.map((n:any)=>(
            <div key={n.id} onClick={()=>setSelected(n)} className={`p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-900 ${selected?.id===n.id ? "bg-slate-800" : ""}`}>
              <p className="text-sm font-medium flex items-center gap-1">{n.isPinned && <Pin className="w-3 h-3 text-amber-400" />}{n.title || "Untitled"}</p>
              <p className="text-xs text-slate-400 truncate">{n.content?.slice(0,60) || "No content"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="p-3 border-b border-slate-800 flex items-center gap-2">
              <input value={title} onChange={e=>setTitle(e.target.value)} className="flex-1 px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded font-medium" placeholder="Title" />
              <button onClick={save} className="px-3 py-1.5 text-xs bg-blue-600 rounded hover:bg-blue-700">Save</button>
              <button onClick={()=>del(selected.id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              <button onClick={async () => {
                const token = localStorage.getItem("ravaa_token") || "";
                const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shareableType: "note", shareableId: selected.id, visibility: "LINK", permission: "view" }) });
                const data = await res.json();
                if (data.success) { const url = `${location.origin}/s/${data.data.share.shareToken}`; await navigator.clipboard.writeText(url); alert("Link copied: " + url); }
              }} className="p-1.5 text-slate-400 hover:text-white"><Share2 className="w-4 h-4" /></button>
            </div>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Write markdown..." className="flex-1 p-4 bg-slate-950 text-sm font-mono resize-none focus:outline-none" />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <StickyNote className="w-12 h-12 mb-2 opacity-20" />
            <p>Select a note or create new</p>
          </div>
        )}
      </div>
    </div>
  );
}
