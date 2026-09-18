"use client";
import { BookOpen, Folder, Home } from "lucide-react";

interface Notebook {
  id: string;
  name: string;
  color: string;
  parentId?: string | null;
  children?: Notebook[];
}

interface MoveNoteDialogProps {
  open: boolean;
  noteTitle: string;
  notebooks: Notebook[];
  activeNotebookId: string | null;
  currentNotebookId: string | null;
  onMove: (notebookId: string | null) => void;
  onCancel: () => void;
}

function NotebookTree({ nodes, depth = 0, activeId, currentId, onSelect }: { nodes: Notebook[]; depth?: number; activeId: string | null; currentId: string | null; onSelect: (id: string | null) => void }) {
  return (
    <>
      {nodes.map((nb) => (
        <div key={nb.id} style={{ marginLeft: depth * 12 }}>
          <button
            onClick={() => onSelect(nb.id)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 border ${currentId === nb.id ? "bg-blue-600 border-blue-500 text-white" : activeId === nb.id ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-white/5 border-white/[0.04] hover:bg-white/10 text-white"}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: nb.color }} />
            <span className="truncate">{nb.name}</span>
            {currentId === nb.id && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/20">saat ini</span>}
          </button>
          {nb.children && nb.children.length > 0 && <div className="mt-1"><NotebookTree nodes={nb.children} depth={depth + 1} activeId={activeId} currentId={currentId} onSelect={onSelect} /></div>}
        </div>
      ))}
    </>
  );
}

export function MoveNoteDialog({ open, noteTitle, notebooks, activeNotebookId, currentNotebookId, onMove, onCancel }: MoveNoteDialogProps) {
  if (!open) return null;

  const buildTree = (list: Notebook[]): Notebook[] => {
    const map = new Map<string, Notebook & { children: Notebook[] }>();
    list.forEach((nb) => map.set(nb.id, { ...nb, children: [] }));
    const roots: Notebook[] = [];
    list.forEach((nb) => {
      const node = map.get(nb.id)!;
      if (nb.parentId && map.has(nb.parentId)) map.get(nb.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  };

  const tree = buildTree(notebooks as any);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A0A0A]/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border bg-white/10 dark:bg-[#1A1A1A]/40 backdrop-blur-xl border-white/20 dark:border-white/[0.04]/50 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-white/[0.04]">
          <h3 className="font-semibold text-white flex items-center gap-2"><Folder className="w-4 h-4" /> Pindah note</h3>
          <p className="text-sm text-zinc-400 mt-1 truncate">“{noteTitle}”</p>
        </div>
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-0 scrollbar-thin pr-1">
          <button
            onClick={() => onMove(null)}
            className={`w-full text-left px-3 py-3 rounded-xl text-sm flex items-center gap-2 border ${currentNotebookId === null ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/[0.04] hover:bg-white/10 text-white"}`}
          >
            <Home className="w-4 h-4" /> All Notes
            {currentNotebookId === null && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/20">saat ini</span>}
          </button>
          <div className="pt-2">
            <p className="text-xs text-zinc-400 mb-2 px-1">Pilih notebook tujuan:</p>
            {tree.length === 0 ? <p className="text-xs text-zinc-500 px-1">Belum ada notebook</p> : <NotebookTree nodes={tree} activeId={activeNotebookId} currentId={currentNotebookId} onSelect={onMove} />}
          </div>
        </div>
        <div className="p-4 border-t border-white/[0.04] flex justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-xl border border-white/[0.04] bg-white/5 hover:bg-white/10 text-white">Batal</button>
        </div>
      </div>
    </div>
  );
}
