import React, { useEffect, useMemo, useRef, useState } from "react";

type ColKey = "Requested" | "In Progress" | "Dispatched" | "Delivered";

type Card = {
  id: string;          // e.g. FR-000014
  name: string;        // e.g. John Smith
  address?: string;    // optional
  createdAt?: number;  // for sorting
};

type BoardState = Record<ColKey, Card[]>;

const COLS: ColKey[] = ["Requested", "In Progress", "Dispatched", "Delivered"];
const STORE_KEY = "vah.manualForwardingBoard.v1";

function loadState(): BoardState {
  if (typeof window === "undefined") return initState();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return initState();
    const parsed = JSON.parse(raw);
    // very light validation
    for (const col of COLS) if (!Array.isArray(parsed[col])) return initState();
    return parsed;
  } catch {
    return initState();
  }
}

function saveState(state: BoardState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function initState(): BoardState {
  return {
    Requested: [],
    "In Progress": [],
    Dispatched: [],
    Delivered: [],
  };
}

export default function LocalForwardingBoard() {
  const [state, setState] = useState<BoardState>(() => loadState());
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState({ id: "", name: "", address: "" });
  const dragCardRef = useRef<Card | null>(null);

  useEffect(() => saveState(state), [state]);

  const filteredState = useMemo(() => {
    if (!filter.trim()) return state;
    const q = filter.toLowerCase();
    const out: BoardState = initState();
    for (const col of COLS) {
      out[col] = state[col].filter(
        c =>
          c.id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.address || "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [state, filter]);

  function addCard(e: React.FormEvent) {
    e.preventDefault();
    const id = (adding.id || "").trim();
    const name = (adding.name || "").trim();
    if (!id || !name) return;
    const card: Card = { id, name, address: adding.address?.trim(), createdAt: Date.now() };
    setState(prev => ({ ...prev, Requested: [card, ...prev.Requested] }));
    setAdding({ id: "", name: "", address: "" });
  }

  function moveCard(card: Card, to: ColKey) {
    setState(prev => {
      // remove from any col, insert into target
      const next: BoardState = { ...prev, Requested: [...prev.Requested], "In Progress": [...prev["In Progress"]], Dispatched: [...prev.Dispatched], Delivered: [...prev.Delivered] };
      for (const col of COLS) {
        const idx = next[col].findIndex(c => c.id === card.id);
        if (idx >= 0) next[col].splice(idx, 1);
      }
      next[to].unshift(card);
      return next;
    });
  }

  function onDragStart(card: Card) {
    dragCardRef.current = card;
  }
  function onDragOver(ev: React.DragEvent) {
    ev.preventDefault(); // allow drop
  }
  function onDrop(to: ColKey) {
    const card = dragCardRef.current;
    if (!card) return;
    moveCard(card, to);
    dragCardRef.current = null;
  }

  function removeCard(card: Card) {
    setState(prev => {
      const next: BoardState = { ...prev, Requested: [...prev.Requested], "In Progress": [...prev["In Progress"]], Dispatched: [...prev.Dispatched], Delivered: [...prev.Delivered] };
      for (const col of COLS) {
        const idx = next[col].findIndex(c => c.id === card.id);
        if (idx >= 0) next[col].splice(idx, 1);
      }
      return next;
    });
  }

  function resetBoard() {
    if (confirm("Clear all cards?")) setState(initState());
  }

  function exportBoard() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forwarding-board.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBoard(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // minimal validation
        if (COLS.every(c => Array.isArray(parsed?.[c]))) {
          setState(parsed);
        } else {
          alert("Invalid file.");
        }
      } catch {
        alert("Invalid file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="p-6">
      {/* Header / Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Forwarding Board (Manual Mode)</h1>
        <div className="flex-1" />
        <input
          className="border rounded-lg px-3 py-2 w-64"
          placeholder="Search…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button className="border px-3 py-2 rounded-lg" onClick={resetBoard}>Reset</button>
        <button className="border px-3 py-2 rounded-lg" onClick={exportBoard}>Export</button>
        <label className="border px-3 py-2 rounded-lg cursor-pointer">
          Import
          <input type="file" className="hidden" accept="application/json" onChange={e => e.target.files && importBoard(e.target.files[0])} />
        </label>
      </div>

      {/* Quick Add */}
      <form onSubmit={addCard} className="mb-5 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm">ID</label>
          <input className="border rounded-lg px-3 py-2 w-40" value={adding.id} onChange={e => setAdding(a => ({ ...a, id: e.target.value }))} placeholder="FR-000014" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Name</label>
          <input className="border rounded-lg px-3 py-2 w-56" value={adding.name} onChange={e => setAdding(a => ({ ...a, name: e.target.value }))} placeholder="John Smith" />
        </div>
        <div className="flex flex-col flex-1 min-w-[240px]">
          <label className="text-sm">Address (optional)</label>
          <input className="border rounded-lg px-3 py-2" value={adding.address} onChange={e => setAdding(a => ({ ...a, address: e.target.value }))} placeholder="123 Test Street…" />
        </div>
        <button className="bg-black text-white px-4 py-2 rounded-lg">Add</button>
      </form>

      {/* Columns */}
      <div className="grid gap-4 md:grid-cols-4">
        {COLS.map(col => (
          <div
            key={col}
            className="bg-gray-50 rounded-2xl p-3 border"
            onDragOver={onDragOver}
            onDrop={() => onDrop(col)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{col}</div>
              <div className="text-xs text-gray-500">{filteredState[col].length}</div>
            </div>
            <div className="space-y-3 min-h-[120px]">
              {filteredState[col].map(card => (
                <article
                  key={card.id}
                  draggable
                  onDragStart={() => onDragStart(card)}
                  className="rounded-xl border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
                  title="Drag to move"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{card.id}</div>
                    <div className="flex gap-1">
                      {/* quick move buttons */}
                      {COLS.filter(c => c !== col).map(next => (
                        <button
                          key={next}
                          onClick={() => moveCard(card, next)}
                          className="text-[11px] border rounded-md px-2 py-1"
                          title={`Move to ${next}`}
                        >
                          {arrowTo(col, next)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm">{card.name}</div>
                  {card.address && <div className="text-xs text-gray-500">{card.address}</div>}
                  <div className="mt-2 flex gap-2">
                    <button className="text-xs border rounded-md px-2 py-1" onClick={() => removeCard(card)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Manual Mode stores data in your browser only (localStorage). No emails, no webhooks, no backend.
      </p>
    </div>
  );
}

function arrowTo(from: ColKey, to: ColKey) {
  // compact labels for quick-move buttons
  const short = {
    "Requested": "Req",
    "In Progress": "Prog",
    "Dispatched": "Disp",
    "Delivered": "Deliv",
  } as const;
  return short[to];
}
