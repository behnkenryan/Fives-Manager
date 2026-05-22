"use client";
import { useState, useEffect, useCallback } from "react";

const SLOTS = 10;

/* ─── Small components ─── */

function StatusBadge({ section }) {
  const map = {
    playing: { bg: "bg-green-500", text: "text-green-950", label: "IN" },
    standby: { bg: "bg-amber-400", text: "text-amber-950", label: "STANDBY" },
    waiting: { bg: "bg-slate-600", text: "text-slate-200", label: "WAITING" },
    dropped: { bg: "bg-red-500", text: "text-white", label: "OUT" },
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
      }`}>{toast.msg}</div>
    </div>
  );
}

function ReliabilityBar({ pct }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-slate-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

function PlayerSection({ title, color, players, showAdmin, onReorder }) {
  const colors = {
    green: { dot: "bg-green-500 shadow-green-500/40", text: "text-green-500" },
    amber: { dot: "bg-amber-400 shadow-amber-400/40", text: "text-amber-400" },
    slate: { dot: "bg-slate-500 shadow-slate-500/40", text: "text-slate-500" },
    red: { dot: "bg-red-500 shadow-red-500/40", text: "text-red-500" },
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
            {showAdmin && (
              <div className="flex flex-col mr-2 gap-0.5">
                <button onClick={() => onReorder(p.id, "up")}
                  className="text-slate-500 hover:text-green-500 text-xs leading-none px-1 py-0.5 rounded hover:bg-slate-800 transition">▲</button>
                <button onClick={() => onReorder(p.id, "down")}
                  className="text-slate-500 hover:text-green-500 text-xs leading-none px-1 py-0.5 rounded hover:bg-slate-800 transition">▼</button>
              </div>
            )}
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

/* ─── Main App ─── */

export default function Home() {
  // Auth state
  const [screen, setScreen] = useState("loading"); // loading | pick-name | enter-pin | main
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // App state
  const [state, setState] = useState(null);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [busy, setBusy] = useState(false);

  const flash = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  /* ─── API helpers ─── */

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      return await res.json();
    } catch {
      flash("Failed to load", "error");
      return null;
    }
  }, [flash]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data.stats);
    } catch {
      flash("Failed to load stats", "error");
    }
  }, [flash]);

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

  /* ─── Boot: check if already logged in ─── */

  useEffect(() => {
    (async () => {
      const data = await fetchState();
      if (!data?.week) { setScreen("pick-name"); return; }
      setState(data);

      const savedId = localStorage.getItem("fives_player_id");
      const savedLoggedIn = localStorage.getItem("fives_logged_in");

      if (savedId && savedLoggedIn === "true") {
        const player = data.players.find((p) => p.id === Number(savedId));
        if (player) {
          setSelectedId(Number(savedId));
          setSelectedPlayer(player);
          setLoggedIn(true);
          setScreen("main");
          return;
        }
      }
      setScreen("pick-name");
    })();
  }, [fetchState]);

  /* ─── Login flow ─── */

  const handlePickName = (player) => {
    setSelectedId(player.id);
    setSelectedPlayer(player);
    setPinInput("");
    setScreen("enter-pin");
  };

  const handleLogin = async () => {
    if (!/^\d{4}$/.test(pinInput)) { flash("Enter a 4-digit PIN", "error"); return; }

    if (!selectedPlayer.hasPin) {
      // First time — set PIN
      const res = await api("/api/set-pin", { playerId: selectedId, pin: pinInput });
      if (res?.ok) {
        flash("PIN set! You're logged in.");
        localStorage.setItem("fives_player_id", String(selectedId));
        localStorage.setItem("fives_logged_in", "true");
        setLoggedIn(true);
        const data = await fetchState();
        if (data) setState(data);
        setScreen("main");
      }
    } else {
      // Verify PIN by attempting a dummy confirm then check
      // Simpler: just try to confirm and see if PIN is valid
      // Actually, let's verify by calling confirm — if they're already in it's a no-op upsert
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedId, pin: pinInput }),
      });
      const data = await res.json();

      if (res.status === 403) {
        flash("Wrong PIN", "error");
        return;
      }

      // PIN is valid — log them in (and they're also confirmed as IN)
      flash(`${selectedPlayer.emoji} ${selectedPlayer.name} — logged in & confirmed IN!`);
      localStorage.setItem("fives_player_id", String(selectedId));
      localStorage.setItem("fives_logged_in", "true");
      setLoggedIn(true);
      const freshState = await fetchState();
      if (freshState) setState(freshState);
      setPinInput("");
      setScreen("main");
    }
  };

  /* ─── Main app actions ─── */

  const handleConfirm = async () => {
    const pin = localStorage.getItem("fives_pin_cache");
    if (!pin) { flash("Session expired — please log in again", "error"); handleLogout(); return; }

    // Optimistic update
    const prevState = state;
    const me = state.players.find((p) => p.id === selectedId);
    const currentInCount = state.players.filter((p) => p.section === "playing").length;
    const newSection = currentInCount < SLOTS ? "playing" : "standby";
    setState({
      ...state,
      players: state.players.map((p) =>
        p.id === selectedId ? { ...p, status: "in", section: newSection } : p
      ),
      spotsUsed: newSection === "playing" ? state.spotsUsed + 1 : state.spotsUsed,
      spotsLeft: newSection === "playing" ? state.spotsLeft - 1 : state.spotsLeft,
    });
    flash(`${me?.emoji} ${me?.name} is IN!`);

    const res = await api("/api/confirm", { playerId: selectedId, pin });
    if (!res?.ok) { setState(prevState); } else {
      const data = await fetchState();
      if (data) setState(data);
    }
  };

  const handleDropout = async () => {
    const pin = localStorage.getItem("fives_pin_cache");
    if (!pin) { flash("Session expired — please log in again", "error"); handleLogout(); return; }

    // Optimistic update
    const prevState = state;
    const me = state.players.find((p) => p.id === selectedId);
    const wasPlaying = me?.section === "playing";
    const updatedPlayers = state.players.map((p) =>
      p.id === selectedId ? { ...p, status: "out", section: "dropped" } : p
    );
    if (wasPlaying) {
      const firstStandby = updatedPlayers.find((p) => p.section === "standby");
      if (firstStandby) firstStandby.section = "playing";
    }
    setState({
      ...state,
      players: updatedPlayers,
      spotsUsed: wasPlaying ? state.spotsUsed - 1 : state.spotsUsed,
      spotsLeft: wasPlaying ? state.spotsLeft + 1 : state.spotsLeft,
    });
    flash(`${me?.name} dropped out`);

    const res = await api("/api/dropout", { playerId: selectedId, pin });
    if (!res?.ok) { setState(prevState); } else {
      const data = await fetchState();
      if (data) setState(data);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("fives_player_id");
    localStorage.removeItem("fives_logged_in");
    localStorage.removeItem("fives_pin_cache");
    setLoggedIn(false);
    setSelectedId(null);
    setSelectedPlayer(null);
    setPinInput("");
    setScreen("pick-name");
  };

  const handleNewWeek = async () => {
    if (!/^\d{4}$/.test(adminPin)) { flash("Enter 4-digit admin PIN", "error"); return; }
    const res = await api("/api/admin/new-week", { adminPin });
    if (res?.ok) { flash(res.message); setAdminPin(""); const d = await fetchState(); if (d) setState(d); }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !/^\d{4}$/.test(adminPin)) { flash("Need name and admin PIN", "error"); return; }
    const res = await api("/api/admin/add-player", { adminPin, name: newPlayerName });
    if (res?.ok) { flash(`${res.player.name} added!`); setNewPlayerName(""); const d = await fetchState(); if (d) setState(d); }
  };

  const handleRemovePlayer = async (playerId, name) => {
    if (!/^\d{4}$/.test(adminPin)) { flash("Enter admin PIN first", "error"); return; }
    if (!confirm(`Remove ${name}?`)) return;
    const res = await api("/api/admin/remove-player", { adminPin, playerId });
    if (res?.ok) { flash(`${name} removed`); const d = await fetchState(); if (d) setState(d); }
  };

  const handleReorder = async (playerId, direction) => {
    if (!/^\d{4}$/.test(adminPin)) { flash("Enter admin PIN first", "error"); return; }
    const res = await api("/api/admin/reorder", { adminPin, playerId, direction });
    if (res?.ok) { const d = await fetchState(); if (d) setState(d); }
  };

  const handleResetPin = async (playerId, name) => {
    if (!/^\d{4}$/.test(adminPin)) { flash("Enter admin PIN first", "error"); return; }
    if (!confirm(`Reset PIN for ${name}?`)) return;
    const res = await api("/api/admin/reset-pin", { adminPin, playerId });
    if (res?.ok) { flash(res.message); const d = await fetchState(); if (d) setState(d); }
  };

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */

  // ─── LOADING ───
  if (screen === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-green-500 font-mono font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  // ─── SCREEN 1: PICK YOUR NAME ───
  if (screen === "pick-name") {
    return (
      <div className="min-h-screen flex flex-col">
        <Toast toast={toast} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="text-green-500 font-mono text-xs font-bold tracking-[0.2em] mb-2">FIVE A SIDE SOCIALS</div>
          <div className="text-3xl font-black tracking-tight mb-2">Welcome</div>
          <div className="text-slate-400 text-sm mb-8">Tap your name to log in</div>

          <div className="w-full max-w-sm space-y-2">
            {(state?.players || []).map((p) => (
              <button key={p.id} onClick={() => handlePickName(p)}
                className="w-full flex items-center gap-3 bg-[#111a15] border border-slate-800 hover:border-green-500/40 rounded-xl px-4 py-3 transition-all active:scale-[0.98]">
                <span className="text-xl">{p.emoji}</span>
                <span className="text-base font-bold flex-1 text-left">{p.name}</span>
                <span className="text-slate-600 text-sm">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN 2: ENTER PIN ───
  if (screen === "enter-pin" && selectedPlayer) {
    const isNewUser = !selectedPlayer.hasPin;
    return (
      <div className="min-h-screen flex flex-col">
        <Toast toast={toast} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="text-4xl mb-3">{selectedPlayer.emoji}</div>
          <div className="text-2xl font-black mb-1">{selectedPlayer.name}</div>
          <div className="text-slate-400 text-sm mb-8">
            {isNewUser ? "Choose a 4-digit PIN (you'll need it every time)" : "Enter your PIN"}
          </div>

          <div className="w-full max-w-xs space-y-4">
            <input
              type="tel" inputMode="numeric" maxLength={4} pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="• • • •"
              className="w-full bg-[#111a15] border-2 border-slate-700 focus:border-green-500 rounded-2xl px-6 py-5 text-center text-3xl font-mono font-bold tracking-[0.6em] text-white outline-none transition-colors"
              autoFocus
            />

            <button
              disabled={busy || pinInput.length < 4}
              onClick={() => {
                localStorage.setItem("fives_pin_cache", pinInput);
                handleLogin();
              }}
              className="w-full bg-green-500 text-green-950 py-4 rounded-2xl font-extrabold text-lg tracking-wide disabled:opacity-40 transition-all">
              {busy ? "..." : isNewUser ? "SET PIN & LOG IN" : "LOG IN"}
            </button>

            <button onClick={() => { setScreen("pick-name"); setPinInput(""); }}
              className="w-full text-slate-500 text-sm py-2 underline">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN 3: MAIN APP ───
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

      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#0f1a14] via-[#14291e] to-[#0f1a14] border-b border-green-500/10 px-5 pt-6 pb-5 text-center">
        <div className="text-green-500 font-mono text-xs font-bold tracking-[0.2em] mb-1">FIVE A SIDE SOCIALS</div>
        <div className="text-3xl font-black tracking-tight">{state.week.label}</div>
        <div className="text-slate-400 text-sm mt-1">Monday · 20:00 · Sunningdale</div>

        {/* Logged in as */}
        {me && (
          <div className="mt-3 inline-flex items-center gap-2 bg-[#0a0f0d] border border-slate-800 rounded-full px-4 py-1.5">
            <span className="text-base">{me.emoji}</span>
            <span className="text-sm font-bold">{me.name}</span>
            <StatusBadge section={me.section} />
          </div>
        )}

        {/* Spots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: SLOTS }).map((_, i) => (
            <div key={i} className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
              i < state.spotsUsed ? "bg-green-500 text-green-950" : "bg-slate-800 border border-dashed border-slate-700"
            }`}>
              {i < state.spotsUsed ? "✓" : ""}
            </div>
          ))}
        </div>
        <div className={`text-xs font-mono font-bold mt-2 ${state.spotsLeft > 0 ? "text-amber-400" : "text-green-500"}`}>
          {state.spotsLeft > 0 ? `${state.spotsLeft} SPOT${state.spotsLeft > 1 ? "S" : ""} LEFT` : "FULL — STANDBY ONLY"}
        </div>
      </div>

      {/* TAB BAR */}
      <div className="flex border-b border-slate-800 max-w-lg mx-auto">
        <button onClick={() => setShowStats(false)}
          className={`flex-1 py-3 text-sm font-bold text-center transition ${!showStats ? "text-green-500 border-b-2 border-green-500" : "text-slate-500"}`}>
          This Week
        </button>
        <button onClick={() => { setShowStats(true); fetchStats(); }}
          className={`flex-1 py-3 text-sm font-bold text-center transition ${showStats ? "text-green-500 border-b-2 border-green-500" : "text-slate-500"}`}>
          Consistency Log
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* ══════ STATS TAB ══════ */}
        {showStats && (
          <div className="animate-fade-in">
            {!stats ? (
              <div className="text-center text-slate-500 py-8 font-mono">Loading stats...</div>
            ) : stats.every((s) => s.totalWeeks === 0) ? (
              <div className="text-center text-slate-500 py-8">
                <div className="text-lg mb-2">📊</div>
                <div className="font-semibold">No history yet</div>
                <div className="text-sm mt-1">Stats appear after the first completed week.</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_50px_50px_50px_100px] gap-1 px-3 py-2 text-[10px] font-mono font-bold text-slate-500 tracking-wider">
                  <div>PLAYER</div>
                  <div className="text-center">✅</div>
                  <div className="text-center">❌</div>
                  <div className="text-center">➖</div>
                  <div className="text-right">RELIABLE</div>
                </div>
                {stats.sort((a, b) => b.reliability - a.reliability || b.gamesPlayed - a.gamesPlayed).map((s) => (
                  <div key={s.id} className="bg-[#111a15] border border-slate-800 rounded-xl px-3 py-2.5">
                    <div className="grid grid-cols-[1fr_50px_50px_50px_100px] gap-1 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{s.emoji}</span>
                        <span className="text-sm font-bold truncate">{s.name}</span>
                      </div>
                      <div className="text-center text-sm font-mono font-bold text-green-500">{s.gamesPlayed}</div>
                      <div className="text-center text-sm font-mono font-bold text-red-400">{s.gamesDropped}</div>
                      <div className="text-center text-sm font-mono font-bold text-slate-500">{s.gamesAbsent}</div>
                      <ReliabilityBar pct={s.reliability} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ THIS WEEK TAB ══════ */}
        {!showStats && (
          <div className="animate-fade-in">

            {/* Action card */}
            {me && (
              <div className="bg-gradient-to-br from-[#14291e] to-[#1a3328] border border-green-500/20 rounded-2xl p-4 mb-4">
                {me.section === "waiting" && (
                  <button onClick={handleConfirm}
                    className="w-full bg-green-500 text-green-950 py-4 rounded-xl font-extrabold text-lg tracking-wide active:scale-[0.98] transition">
                    I'M IN ⚽
                  </button>
                )}
                {(me.section === "playing" || me.section === "standby") && (
                  <button onClick={handleDropout}
                    className="w-full bg-red-500 text-white py-4 rounded-xl font-extrabold text-lg tracking-wide active:scale-[0.98] transition">
                    DROP OUT
                  </button>
                )}
                {me.section === "dropped" && (
                  <div className="text-center text-red-400 font-bold py-3">
                    You dropped out this week — back in the queue next week
                  </div>
                )}
              </div>
            )}

            {/* Player lists */}
            {playing.length > 0 && <PlayerSection title="PLAYING" color="green" players={playing} showAdmin={showAdmin} onReorder={handleReorder} />}
            {standby.length > 0 && <PlayerSection title="STANDBY" color="amber" players={standby} showAdmin={showAdmin} onReorder={handleReorder} />}
            {waiting.length > 0 && <PlayerSection title="NOT CONFIRMED" color="slate" players={waiting} showAdmin={showAdmin} onReorder={handleReorder} />}
            {dropped.length > 0 && <PlayerSection title="DROPPED" color="red" players={dropped} showAdmin={showAdmin} onReorder={handleReorder} />}

            {/* How it works */}
            <div className="bg-[#111a15] border border-slate-800 rounded-2xl p-4 mt-5 text-sm text-slate-400 leading-relaxed">
              <div className="font-extrabold text-slate-200 mb-2">How it works</div>
              Top 10 confirmed = playing. After that you're on standby. If someone drops, first standby gets promoted.
              Dropouts go to the bottom next week. Confirm for yourself only.
            </div>

            {/* Admin */}
            <div className="mt-5 mb-8">
              <button onClick={() => setShowAdmin(!showAdmin)}
                className="w-full bg-slate-800 text-slate-500 py-3 rounded-xl text-sm font-semibold">
                {showAdmin ? "Hide Admin" : "⚙️ Admin"}
              </button>

              {showAdmin && (
                <div className="bg-[#111a15] border border-slate-800 rounded-2xl p-4 mt-2 space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Admin PIN</label>
                    <input type="tel" inputMode="numeric" maxLength={4}
                      value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-white outline-none focus:border-green-500" />
                  </div>

                  <button onClick={handleNewWeek} disabled={busy}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-green-950 py-3 rounded-xl font-extrabold disabled:opacity-40">
                    🔄 Start New Week
                  </button>
                  <div className="text-xs text-slate-600 text-center -mt-2">Records history, reorders ranks, opens new week.</div>

                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-xs font-bold text-amber-400 mb-2">↕️ Reorder Players</div>
                    <div className="text-xs text-slate-500">Use the arrows next to each player above to move them up/down.</div>
                  </div>

                  <div className="flex gap-2">
                    <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="New player name..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500" />
                    <button onClick={handleAddPlayer} disabled={busy}
                      className="bg-green-500 text-green-950 px-4 rounded-lg font-extrabold text-sm disabled:opacity-40">Add</button>
                  </div>

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

                  <div>
                    <div className="text-xs font-bold text-slate-500 mb-2">🔐 Reset player PIN</div>
                    <div className="text-xs text-slate-600 mb-2">Player will need to set a new PIN on next login.</div>
                    <div className="flex flex-wrap gap-1">
                      {state.players.map((p) => (
                        <button key={p.id} onClick={() => handleResetPin(p.id, p.name)}
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            p.hasPin ? "bg-slate-800 text-amber-400 hover:bg-amber-500/20" : "bg-slate-800/50 text-slate-600 cursor-not-allowed"
                          }`} disabled={!p.hasPin}>
                          🔑 {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleLogout}
                    className="w-full text-slate-500 text-xs py-2 underline mt-4">
                    Log out of this device
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
