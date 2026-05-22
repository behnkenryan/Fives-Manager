"use client";
import { useState, useEffect, useCallback } from "react";

const SLOTS = 10;

function StatusBadge({ section }) {
  const map = {
    playing:  { bg: "bg-green-500", text: "text-green-950", label: "IN" },
    standby:  { bg: "bg-amber-400", text: "text-amber-950", label: "STANDBY" },
    waiting:  { bg: "bg-slate-600", text: "text-slate-200", label: "WAITING" },
    dropped:  { bg: "bg-red-500",   text: "text-white",     label: "OUT" },
  };
  const s = map[section] || map.waiting;
  return (
    <span className={`${s.bg} ${s.text} px-2.5 py-0.5 rounded text-[11px] font-mono font-extrabold tracking-wider`}>
      {s.label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg ${
        toast.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-green-950"
      }`}>
        {toast.msg}
      </div>
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinMode, setPinMode] = useState(null); // 'set' | 'confirm' | 'dropout'
  const [toast, setToast] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [busy, setBusy] = useState(false);

  const flash = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      setState(data);
    } catch {
      flash("Failed to load", "error");
    }
    setLoading(false);
  }, [flash]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // Restore selected player from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fives_player_id");
    if (saved) setSelectedId(Number(saved));
  }, []);

  const selectPlayer = (id) => {
    setSelectedId(id);
    localStorage.setItem("fives_player_id", String(id));
  };

  const api = async (url, body) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error || "Something went wrong", "error");
        return null;
      }
      return data;
    } catch {
      flash("Network error", "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pinInput)) { flash("Enter a 4-digit PIN", "error"); return; }
    const res = await api("/api/set-pin", { playerId: selectedId, pin: pinInput });
    if (res?.ok) {
      flash(res.message);
      setPinInput("");
      setPinMode(null);
      fetchState();
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{4}$/.test(pinInput)) { flash("Enter your 4-digit PIN", "error"); return; }
    const res = await api("/api/confirm", { playerId: selectedId, pin: pinInput });
    if (res?.ok) {
      flash(res.message);
      setPinInput("");
      setPinMode(null);
      fetchState();
    }
  };

  const handleDropout = async () => {
    if (!/^\d{4}$/.test(pinInput)) { flash("Enter your 4-digit PIN", "error"); return; }
    const res = await api("/api/dropout", { playerId: selectedId, pin: pinInput });
    if (res?.ok) {
      flash(res.message);
      setPinInput("");
      setPinMode(null);
      fetchState();
    }
  };

  const handleNewWeek = async () => {
    if (!/^\d{4}$/.test(adminPin)) { flash("Enter 4-digit admin PIN", "error"); return; }
    const res = await api("/api/admin/new-week", { adminPin });
    if (res?.ok) {
      flash(res.message);
      setAdminPin("");
      fetchState();
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !/^\d{4}$/.test(adminPin)) {
      flash("Need name and admin PIN", "error"); return;
    }
    const res = await api("/api/admin/add-player", { adminPin, name: newPlayerName });
    if (res?.ok) {
      flash(`${res.player.name} added!`);
      setNewPlayerName("");
      fetchState();
    }
  };

  const handleRemovePlayer = async (playerId, name) => {
    if (!/^\d{4}$/.test(adminPin)) { flash("Enter admin PIN first", "error"); return; }
    if (!confirm(`Remove ${name}?`)) return;
    const res = await api("/api/admin/remove-player", { adminPin, playerId });
    if (res?.ok) { flash(`${name} removed`); fetchState(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-green-500 font-mono font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!state?.week) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400 font-mono">Error loading game state</div>
      </div>
    );
  }

  const me = state.players.find((p) => p.id === selectedId);
  const playing = state.players.filter((p) => p.section === "playing");
  const standby = state.players.filter((p) => p.section === "standby");
  const waiting = state.players.filter((p) => p.section === "waiting");
  const dropped = state.players.filter((p) => p.section === "dropped");

  return (
    <div className="min-h-screen pb-24">
      <Toast toast={toast} />

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-[#0f1a14] via-[#14291e] to-[#0f1a14] border-b border-green-500/10 px-5 pt-6 pb-5 text-center">
        <div className="text-green-500 font-mono text-xs font-bold tracking-[0.2em] mb-1">
          FIVE A SIDE SOCIALS
        </div>
        <div className="text-3xl font-black tracking-tight">
          {state.week.label}
        </div>
        <div className="text-slate-400 text-sm mt-1">Monday · 20:00 · Sunningdale</div>

        {/* Spot indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: SLOTS }).map((_, i) => (
            <div key={i} className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
              i < state.spotsUsed
                ? "bg-green-500 text-green-950"
                : "bg-slate-800 border border-dashed border-slate-700"
            }`}>
              {i < state.spotsUsed ? "✓" : ""}
            </div>
          ))}
        </div>
        <div className={`text-xs font-mono font-bold mt-2 ${
          state.spotsLeft > 0 ? "text-amber-400" : "text-green-500"
        }`}>
          {state.spotsLeft > 0
            ? `${state.spotsLeft} SPOT${state.spotsLeft > 1 ? "S" : ""} LEFT`
            : "FULL — STANDBY ONLY"}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* Player selector */}
        {!selectedId && (
          <div className="bg-[#14291e] border border-green-500/20 rounded-2xl p-4 mb-4 text-center animate-fade-in">
            <div className="font-semibold mb-3">Who are you? Tap your name.</div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {state.players.map((p) => (
                <button key={p.id} onClick={() => selectPlayer(p.id)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* My action card */}
        {me && (
          <div className="bg-gradient-to-br from-[#14291e] to-[#1a3328] border border-green-500/20 rounded-2xl p-4 mb-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{me.emoji}</span>
                <span className="text-lg font-extrabold">{me.name}</span>
                <StatusBadge section={me.section} />
              </div>
              <button onClick={() => { setSelectedId(null); localStorage.removeItem("fives_player_id"); setPinMode(null); setPinInput(""); }}
                className="text-slate-500 text-xs underline">
                Switch
              </button>
            </div>

            {/* PIN setup needed */}
            {!me.hasPin && !pinMode && (
              <button onClick={() => setPinMode("set")}
                className="w-full mt-3 bg-amber-400 text-amber-950 py-3 rounded-xl font-extrabold tracking-wide">
                SET YOUR PIN 🔐
              </button>
            )}

            {/* PIN input */}
            {pinMode && (
              <div className="mt-3 animate-fade-in">
                <div className="text-sm text-slate-400 mb-2">
                  {pinMode === "set" ? "Choose a 4-digit PIN (remember it!)" : "Enter your PIN"}
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]*"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-[0.5em] text-white outline-none focus:border-green-500"
                    autoFocus
                  />
                  <button
                    disabled={busy || pinInput.length < 4}
                    onClick={pinMode === "set" ? handleSetPin : pinMode === "confirm" ? handleConfirm : handleDropout}
                    className={`px-6 py-3 rounded-xl font-extrabold text-sm disabled:opacity-40 ${
                      pinMode === "dropout" ? "bg-red-500 text-white" : "bg-green-500 text-green-950"
                    }`}>
                    {busy ? "..." : "GO"}
                  </button>
                </div>
                <button onClick={() => { setPinMode(null); setPinInput(""); }}
                  className="text-slate-500 text-xs mt-2 underline">Cancel</button>
              </div>
            )}

            {/* Action buttons */}
            {me.hasPin && !pinMode && (
              <div className="flex gap-2 mt-3">
                {(me.section === "waiting") && (
                  <button onClick={() => setPinMode("confirm")}
                    className="flex-1 bg-green-500 text-green-950 py-3 rounded-xl font-extrabold text-base tracking-wide">
                    I'M IN ⚽
                  </button>
                )}
                {(me.section === "playing" || me.section === "standby") && (
                  <button onClick={() => setPinMode("dropout")}
                    className="flex-1 bg-red-500 text-white py-3 rounded-xl font-extrabold text-base tracking-wide">
                    DROP OUT
                  </button>
                )}
                {me.section === "dropped" && (
                  <div className="flex-1 text-center text-red-400 font-bold py-3 text-sm">
                    You dropped — back in the queue next week
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PLAYER LISTS ── */}
        {playing.length > 0 && <PlayerSection title="PLAYING" color="green" players={playing} />}
        {standby.length > 0 && <PlayerSection title="STANDBY" color="amber" players={standby} />}
        {waiting.length > 0 && <PlayerSection title="NOT CONFIRMED" color="slate" players={waiting} />}
        {dropped.length > 0 && <PlayerSection title="DROPPED" color="red" players={dropped} />}

        {/* ── HOW IT WORKS ── */}
        <div className="bg-[#111a15] border border-slate-800 rounded-2xl p-4 mt-5 text-sm text-slate-400 leading-relaxed">
          <div className="font-extrabold text-slate-200 mb-2">How it works</div>
          Top 10 confirmed = playing. After that you're on standby. If someone drops, first standby gets promoted automatically.
          Dropouts go to the bottom of the priority list next week. Confirm for yourself only — no signing in mates.
        </div>

        {/* ── ADMIN ── */}
        <div className="mt-5 mb-8">
          <button onClick={() => setShowAdmin(!showAdmin)}
            className="w-full bg-slate-800 text-slate-500 py-3 rounded-xl text-sm font-semibold">
            {showAdmin ? "Hide Admin" : "⚙️ Admin"}
          </button>

          {showAdmin && (
            <div className="bg-[#111a15] border border-slate-800 rounded-2xl p-4 mt-2 space-y-4 animate-fade-in">
              {/* Admin PIN */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Admin PIN</label>
                <input type="tel" inputMode="numeric" maxLength={4}
                  value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-white outline-none focus:border-green-500"
                />
              </div>

              {/* New week */}
              <button onClick={handleNewWeek} disabled={busy}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-green-950 py-3 rounded-xl font-extrabold disabled:opacity-40">
                🔄 Start New Week
              </button>
              <div className="text-xs text-slate-600 text-center -mt-2">
                Confirmed players keep priority. Dropouts go to bottom.
              </div>

              {/* Add player */}
              <div className="flex gap-2">
                <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="New player name..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                />
                <button onClick={handleAddPlayer} disabled={busy}
                  className="bg-green-500 text-green-950 px-4 rounded-lg font-extrabold text-sm disabled:opacity-40">
                  Add
                </button>
              </div>

              {/* Remove players */}
              <div>
                <div className="text-xs font-bold text-slate-500 mb-2">Remove player</div>
                <div className="flex flex-wrap gap-1">
                  {state.players.map((p) => (
                    <button key={p.id} onClick={() => handleRemovePlayer(p.id, p.name)}
                      className="bg-slate-800 text-red-400 px-2 py-1 rounded text-xs font-semibold hover:bg-red-500/20">
                      ✕ {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerSection({ title, color, players }) {
  const colors = {
    green: { dot: "bg-green-500 shadow-green-500/40", text: "text-green-500" },
    amber: { dot: "bg-amber-400 shadow-amber-400/40", text: "text-amber-400" },
    slate: { dot: "bg-slate-500 shadow-slate-500/40", text: "text-slate-500" },
    red:   { dot: "bg-red-500 shadow-red-500/40",     text: "text-red-500" },
  };
  const c = colors[color] || colors.slate;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={`w-2 h-2 rounded-full ${c.dot} shadow-md`} />
        <span className={`text-[11px] font-extrabold tracking-[0.15em] font-mono ${c.text}`}>{title}</span>
        <span className="text-[11px] font-bold text-slate-600 font-mono">{players.length}</span>
      </div>
      <div className="space-y-1">
        {players.map((p) => (
          <div key={p.id} className="flex items-center bg-[#111a15] border border-slate-800 rounded-xl px-3.5 py-2.5 transition-all">
            <span className="font-mono text-xs font-extrabold text-slate-600 w-7">#{p.rank}</span>
            <span className="text-lg mr-2.5">{p.emoji}</span>
            <span className="text-sm font-bold flex-1">{p.name}</span>
            <StatusBadge section={p.section} />
          </div>
        ))}
      </div>
    </div>
  );
}
