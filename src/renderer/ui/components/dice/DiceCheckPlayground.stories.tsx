import type { Story } from "@ladle/react";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiceComponent, DiceResult } from "./DiceComponent";
import { Panel } from "../common/Panel";
import { Button } from "../common/Button";
import { AttrBadge } from "../common/AttrBadge";
import { ATTR_LABELS, ATTR_ICONS } from "../../constants/labels";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-6">{children}</div>
);

const RESULT_COLORS: Record<string, string> = {
  success: "text-green-400",
  partial_success: "text-yellow-400",
  failure: "text-red-400",
  critical_failure: "text-red-600",
};
const RESULT_BG: Record<string, string> = {
  success: "from-green-900/30 to-transparent",
  partial_success: "from-yellow-900/20 to-transparent",
  failure: "from-red-900/20 to-transparent",
  critical_failure: "from-red-900/40 to-transparent",
};
const RESULT_LABELS: Record<string, string> = {
  success: "大成功",
  partial_success: "部分成功",
  failure: "失败",
  critical_failure: "大失败",
};
const RESULT_BORDER: Record<string, string> = {
  success: "border-green-500/50",
  partial_success: "border-yellow-500/50",
  failure: "border-red-500/50",
  critical_failure: "border-red-800/60",
};

function rollD10() {
  return Math.floor(Math.random() * 10) + 1;
}

function simulateDiceCheck(poolSize: number, target: number) {
  const dice: number[] = [];
  for (let i = 0; i < Math.min(poolSize, 20); i++) dice.push(rollD10());

  const exploded: number[] = [];
  let toExplode = dice.filter((d) => d === 10).length;
  let total = 0;
  while (toExplode > 0 && total < 20) {
    const batch = Math.min(toExplode, 20 - total);
    let next = 0;
    for (let i = 0; i < batch; i++) {
      const r = rollD10();
      exploded.push(r);
      total++;
      if (r === 10) next++;
    }
    toExplode = next;
  }

  const allDice = [...dice, ...exploded];
  const successes = allDice.filter((d) => d >= 7).length;

  let result: string;
  if (successes >= target) result = "success";
  else if (successes === 0) result = "critical_failure";
  else if (target > 2 && successes >= target - 2) result = "partial_success";
  else result = "failure";

  return {
    dice,
    exploded,
    allDice,
    successes,
    target,
    result,
    explodedStartIndex: dice.length,
  };
}

// ===== Style A: Classic Compact =====
function StyleA_Classic({
  data,
}: {
  data: ReturnType<typeof simulateDiceCheck>;
}) {
  return (
    <Panel variant="dark" title="鉴定结果">
      <div className="text-center mb-3">
        <span className="text-xs text-gold-dim/70">战斗 鉴定</span>
        <span className="text-xs text-gold-dim/40 mx-2">|</span>
        <span className="text-xs text-gold-dim/70">
          目标 {data.target}
        </span>
      </div>
      <DiceResult
        dice={data.allDice}
        explodedStartIndex={data.explodedStartIndex}
        successThreshold={7}
      />
      <div className="text-center mt-3">
        <span className="text-sm text-gold-dim">
          成功: {data.successes} / 目标: {data.target}
        </span>
      </div>
      <div
        className={`text-center text-lg font-bold mt-2 ${RESULT_COLORS[data.result]}`}
      >
        {RESULT_LABELS[data.result]}
      </div>
    </Panel>
  );
}

// ===== Style B: Cinematic Fullscreen =====
function StyleB_Cinematic({
  data,
}: {
  data: ReturnType<typeof simulateDiceCheck>;
}) {
  return (
    <div
      className={`relative rounded-xl border ${RESULT_BORDER[data.result]} bg-gradient-to-b ${RESULT_BG[data.result]} p-8 overflow-hidden`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.08),transparent_70%)] pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-2">
          <span className="text-gold font-(family-name:--font-display) text-2xl text-glow-gold">
            ⚔️ 战斗鉴定
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-dim/40" />
          <span className="text-xs text-gold-dim/60 tracking-widest">
            DIFFICULTY {data.target}
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-dim/40" />
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {data.allDice.map((value, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, y: -40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                delay: idx * 0.1,
                damping: 12,
              }}
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold
                border-2 shadow-lg relative
                ${value >= 7 ? "bg-green-900/50 border-green-400/80 text-green-300" : "bg-ink/60 border-gold-dim/20 text-parchment/40"}
                ${value === 10 ? "ring-2 ring-yellow-400/60" : ""}
                ${idx >= data.explodedStartIndex ? "border-dashed" : ""}
              `}
            >
              {value}
              {value === 10 && (
                <span className="absolute -top-1 -right-1 text-[10px] text-yellow-400">
                  💥
                </span>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: data.allDice.length * 0.1 + 0.3 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-lg bg-ink/40 border border-gold-dim/20">
            <div>
              <div className="text-[10px] text-gold-dim/50 uppercase tracking-wider">
                成功数
              </div>
              <div className="text-2xl font-bold text-gold-bright tabular-nums">
                {data.successes}
              </div>
            </div>
            <div className="text-gold-dim/30 text-2xl">/</div>
            <div>
              <div className="text-[10px] text-gold-dim/50 uppercase tracking-wider">
                目标
              </div>
              <div className="text-2xl font-bold text-parchment/60 tabular-nums">
                {data.target}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: data.allDice.length * 0.1 + 0.6 }}
          className={`text-center mt-4 text-3xl font-bold font-(family-name:--font-display) ${RESULT_COLORS[data.result]}`}
          style={{
            textShadow:
              data.result === "success"
                ? "0 0 20px rgba(74,222,128,0.4)"
                : data.result === "critical_failure"
                  ? "0 0 20px rgba(239,68,68,0.4)"
                  : "none",
          }}
        >
          {RESULT_LABELS[data.result]}
        </motion.div>
      </div>
    </div>
  );
}

// ===== Style C: Progress Bar / Gauge =====
function StyleC_Gauge({
  data,
}: {
  data: ReturnType<typeof simulateDiceCheck>;
}) {
  const ratio = Math.min(data.successes / data.target, 1.5);
  const barColor =
    data.result === "success"
      ? "bg-green-500"
      : data.result === "partial_success"
        ? "bg-yellow-500"
        : data.result === "critical_failure"
          ? "bg-red-700"
          : "bg-red-500";

  return (
    <div className="rounded-xl border border-gold-dim/30 bg-ink/80 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚔️</span>
          <span className="text-sm font-bold text-gold">战斗鉴定</span>
        </div>
        <span className="text-xs text-gold-dim/60">
          目标难度 {data.target}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {data.allDice.map((value, idx) => (
          <div
            key={idx}
            className={`
              w-8 h-8 rounded flex items-center justify-center text-xs font-bold
              ${value >= 7 ? "bg-green-900/50 text-green-300 border border-green-500/40" : "bg-ink-light/60 text-parchment/30 border border-gold-dim/10"}
              ${idx >= data.explodedStartIndex ? "ring-1 ring-yellow-500/40" : ""}
            `}
          >
            {value}
          </div>
        ))}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gold-dim/60 mb-1">
          <span>
            成功 {data.successes} / {data.target}
          </span>
          <span>{Math.round(ratio * 100)}%</span>
        </div>
        <div className="h-3 bg-ink-light rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(ratio * 100, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className={`h-full rounded-full ${barColor}`}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-gold/60"
            style={{ left: "100%" }}
          />
        </div>
      </div>

      <div
        className={`text-center mt-3 text-lg font-bold ${RESULT_COLORS[data.result]}`}
      >
        {RESULT_LABELS[data.result]}
      </div>
    </div>
  );
}

// ===== Style D: Slot Machine / Sequential Reveal =====
function StyleD_Sequential({
  data,
}: {
  data: ReturnType<typeof simulateDiceCheck>;
}) {
  const [revealIndex, setRevealIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setRevealIndex(-1);
    let idx = 0;
    const reveal = () => {
      if (idx <= data.allDice.length) {
        setRevealIndex(idx);
        idx++;
        timerRef.current = setTimeout(reveal, 200);
      }
    };
    timerRef.current = setTimeout(reveal, 500);
    return () => clearTimeout(timerRef.current);
  }, [data]);

  const revealedSuccesses = data.allDice
    .slice(0, Math.max(0, revealIndex))
    .filter((d) => d >= 7).length;
  const allRevealed = revealIndex >= data.allDice.length;

  return (
    <div className="rounded-xl border border-gold-dim/30 bg-ink/80 p-6">
      <div className="text-center mb-4">
        <span className="text-sm font-bold text-gold">⚔️ 战斗鉴定</span>
        <span className="text-xs text-gold-dim/50 ml-2">
          (逐个揭示)
        </span>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-4 min-h-[56px]">
        {data.allDice.map((value, idx) => {
          const revealed = idx < revealIndex;
          return (
            <AnimatePresence key={idx}>
              {revealed ? (
                <motion.div
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  className={`
                    w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg
                    border-2 shadow-md
                    ${value >= 7 ? "bg-green-900/50 border-green-400 text-green-300" : "bg-ink-light border-gold-dim/20 text-parchment/40"}
                    ${idx >= data.explodedStartIndex ? "ring-1 ring-yellow-400/50" : ""}
                  `}
                >
                  {value}
                </motion.div>
              ) : idx === revealIndex ? (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                  className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-gold/40 bg-gold/10 text-gold text-lg font-bold"
                >
                  ?
                </motion.div>
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-gold-dim/10 bg-ink-light/40 text-gold-dim/20 text-lg">
                  ?
                </div>
              )}
            </AnimatePresence>
          );
        })}
      </div>

      <div className="text-center">
        <span className="text-sm text-gold-dim tabular-nums">
          当前成功: {revealedSuccesses} / 目标: {data.target}
        </span>
      </div>

      {allRevealed && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-center mt-3 text-xl font-bold ${RESULT_COLORS[data.result]}`}
        >
          {RESULT_LABELS[data.result]}
        </motion.div>
      )}
    </div>
  );
}

// ===== Style E: Tabletop RPG Sheet =====
function StyleE_Sheet({
  data,
}: {
  data: ReturnType<typeof simulateDiceCheck>;
}) {
  return (
    <div className="rounded-lg border border-gold-dim/40 bg-[#1e1520] overflow-hidden">
      <div className="bg-gradient-to-r from-crimson-dark/60 to-ink/80 px-4 py-2 border-b border-gold-dim/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gold text-glow-gold font-(family-name:--font-display)">
            鉴定记录
          </span>
          <span className="text-[10px] text-gold-dim/50 font-mono">
            ROLL#{Math.random().toString(36).slice(2, 8).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-20 text-[10px] text-gold-dim/50 uppercase tracking-wider">
            属性
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">⚔️</span>
            <span className="text-sm text-parchment-light font-bold">
              战斗
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-20 text-[10px] text-gold-dim/50 uppercase tracking-wider">
            骰池
          </div>
          <span className="text-sm text-parchment font-mono">
            {data.dice.length}D10
          </span>
          {data.exploded.length > 0 && (
            <span className="text-xs text-yellow-400/80">
              +{data.exploded.length} 爆炸
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-20 text-[10px] text-gold-dim/50 uppercase tracking-wider">
            投骰
          </div>
          <div className="flex flex-wrap gap-1">
            {data.dice.map((v, i) => (
              <span
                key={`d${i}`}
                className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-mono font-bold
                  ${v >= 7 ? "bg-green-900/50 text-green-400" : "bg-ink-light text-parchment/30"}
                  ${v === 10 ? "ring-1 ring-yellow-400/60" : ""}
                `}
              >
                {v}
              </span>
            ))}
            {data.exploded.length > 0 && (
              <>
                <span className="text-gold-dim/30 flex items-center px-1">
                  |
                </span>
                {data.exploded.map((v, i) => (
                  <span
                    key={`e${i}`}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-mono font-bold border border-dashed
                      ${v >= 7 ? "bg-green-900/50 text-green-400 border-yellow-500/40" : "bg-ink-light text-parchment/30 border-yellow-500/20"}
                    `}
                  >
                    {v}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="h-px bg-gold-dim/20" />

        <div className="flex items-center gap-3">
          <div className="w-20 text-[10px] text-gold-dim/50 uppercase tracking-wider">
            结果
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold text-gold-bright font-mono">
                {data.successes}
              </span>
              <span className="text-gold-dim/40 mx-1">/</span>
              <span className="text-lg text-parchment/50 font-mono">
                {data.target}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${RESULT_COLORS[data.result]} ${
                data.result === "success"
                  ? "bg-green-900/30"
                  : data.result === "critical_failure"
                    ? "bg-red-900/30"
                    : data.result === "partial_success"
                      ? "bg-yellow-900/20"
                      : "bg-red-900/20"
              }`}
            >
              {RESULT_LABELS[data.result]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Style F: Interactive Playground with Reroll & Golden Dice =====
function StyleF_Interactive() {
  const [poolSize, setPoolSize] = useState(6);
  const [target, setTarget] = useState(3);
  const [attribute, setAttribute] = useState("combat");
  const [data, setData] = useState<ReturnType<typeof simulateDiceCheck> | null>(
    null,
  );
  const [rerollsLeft, setRerollsLeft] = useState(1);
  const [goldenDice, setGoldenDice] = useState(0);
  const [selectedForReroll, setSelectedForReroll] = useState<Set<number>>(
    new Set(),
  );
  const [phase, setPhase] = useState<"setup" | "rolled" | "resolved">("setup");

  const roll = useCallback(() => {
    setData(simulateDiceCheck(poolSize, target));
    setPhase("rolled");
    setRerollsLeft(1);
    setGoldenDice(0);
    setSelectedForReroll(new Set());
  }, [poolSize, target]);

  const toggleRerollSelect = (idx: number) => {
    if (!data || data.allDice[idx] >= 7) return;
    const next = new Set(selectedForReroll);
    if (next.has(idx)) next.delete(idx);
    else if (next.size < rerollsLeft) next.add(idx);
    setSelectedForReroll(next);
  };

  const doReroll = () => {
    if (!data || selectedForReroll.size === 0) return;
    const newAll = [...data.allDice];
    for (const idx of selectedForReroll) {
      newAll[idx] = rollD10();
    }
    const successes = newAll.filter((d) => d >= 7).length;
    let result: string;
    if (successes >= target) result = "success";
    else if (successes === 0) result = "critical_failure";
    else if (target > 2 && successes >= target - 2) result = "partial_success";
    else result = "failure";

    setData({
      ...data,
      allDice: newAll,
      successes,
      result,
    });
    setRerollsLeft(0);
    setSelectedForReroll(new Set());
  };

  const addGoldenDice = () => {
    if (!data) return;
    const newSuccesses = data.successes + 1;
    let result: string;
    if (newSuccesses >= target) result = "success";
    else if (newSuccesses === 0) result = "critical_failure";
    else if (target > 2 && newSuccesses >= target - 2)
      result = "partial_success";
    else result = "failure";

    setData({ ...data, successes: newSuccesses, result });
    setGoldenDice(goldenDice + 1);
  };

  const resolve = () => setPhase("resolved");
  const reset = () => {
    setPhase("setup");
    setData(null);
    setGoldenDice(0);
    setRerollsLeft(1);
    setSelectedForReroll(new Set());
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Panel variant="dark" title="交互式鉴定模拟">
        {phase === "setup" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-xs text-gold-dim/70 w-16">属性</label>
              <select
                value={attribute}
                onChange={(e) => setAttribute(e.target.value)}
                className="bg-ink-light border border-gold-dim/30 rounded px-2 py-1 text-sm text-parchment"
              >
                {Object.entries(ATTR_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {ATTR_ICONS[k]} {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs text-gold-dim/70 w-16">骰池</label>
              <input
                type="range"
                min={1}
                max={15}
                value={poolSize}
                onChange={(e) => setPoolSize(Number(e.target.value))}
                className="flex-1 accent-gold"
              />
              <span className="text-gold-bright font-bold w-8 text-right tabular-nums">
                {poolSize}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs text-gold-dim/70 w-16">目标</label>
              <input
                type="range"
                min={1}
                max={10}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="flex-1 accent-gold"
              />
              <span className="text-gold-bright font-bold w-8 text-right tabular-nums">
                {target}
              </span>
            </div>
            <div className="text-center pt-2">
              <Button variant="primary" size="lg" glow onClick={roll}>
                开始鉴定
              </Button>
            </div>
          </div>
        )}

        {phase === "rolled" && data && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <span className="text-sm text-gold">
                {ATTR_ICONS[attribute]}{" "}
                {ATTR_LABELS[attribute]} 鉴定
              </span>
              <span className="text-xs text-gold-dim/40 mx-2">|</span>
              <span className="text-xs text-gold-dim/60">
                骰池 {poolSize}D10 / 目标 {target}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {data.allDice.map((value, idx) => {
                const isSuccess = value >= 7;
                const canSelect = !isSuccess && rerollsLeft > 0;
                const isSelected = selectedForReroll.has(idx);
                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: idx * 0.08 }}
                    onClick={() => canSelect && toggleRerollSelect(idx)}
                    className={`
                      w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg
                      border-2 shadow-lg transition-all
                      ${isSuccess ? "bg-green-900/60 border-green-400 text-green-300" : "bg-red-900/40 border-red-500/50 text-red-400"}
                      ${idx >= data.explodedStartIndex ? "ring-2 ring-yellow-400 animate-pulse" : ""}
                      ${canSelect ? "cursor-pointer hover:border-blue-400" : ""}
                      ${isSelected ? "ring-2 ring-blue-400 border-blue-400 bg-blue-900/30" : ""}
                    `}
                  >
                    {value}
                  </motion.div>
                );
              })}
            </div>

            <div className="text-center text-sm text-gold-dim">
              成功: {data.successes} / 目标: {data.target}
              {goldenDice > 0 && (
                <span className="text-yellow-400 ml-2">
                  (+{goldenDice} 黄金骰)
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              {rerollsLeft > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={selectedForReroll.size === 0}
                  onClick={doReroll}
                >
                  重掷 ({selectedForReroll.size}/{rerollsLeft})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={addGoldenDice}>
                + 黄金骰
              </Button>
              <Button variant="primary" size="sm" glow onClick={resolve}>
                确认结果
              </Button>
            </div>

            {rerollsLeft > 0 && (
              <p className="text-center text-[10px] text-gold-dim/40">
                点击失败的骰子选择重掷
              </p>
            )}
          </div>
        )}

        {phase === "resolved" && data && (
          <div className="space-y-4">
            <StyleB_Cinematic data={data} />
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                重新开始
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ===== Exported Stories =====

export const A_Classic: Story = () => {
  const [data, setData] = useState(() => simulateDiceCheck(6, 3));
  return (
    <Wrap>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-gold text-lg font-bold text-glow-gold font-(family-name:--font-display) text-center">
          Style A: 经典紧凑
        </h2>
        <p className="text-parchment/50 text-xs text-center">
          复用现有 Panel + DiceResult，最小改动
        </p>
        <StyleA_Classic data={data} />
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData(simulateDiceCheck(6, 3))}
          >
            重新投掷
          </Button>
        </div>
      </div>
    </Wrap>
  );
};
A_Classic.meta = { title: "DiceCheckPlayground / A - Classic Compact" };

export const B_Cinematic: Story = () => {
  const [data, setData] = useState(() => simulateDiceCheck(8, 4));
  return (
    <Wrap>
      <div className="max-w-lg mx-auto space-y-4">
        <h2 className="text-gold text-lg font-bold text-glow-gold font-(family-name:--font-display) text-center">
          Style B: 电影式全屏
        </h2>
        <p className="text-parchment/50 text-xs text-center">
          大尺寸骰子 + 逐个弹出动画 + 渐变背景
        </p>
        <StyleB_Cinematic data={data} />
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData(simulateDiceCheck(8, 4))}
          >
            重新投掷
          </Button>
        </div>
      </div>
    </Wrap>
  );
};
B_Cinematic.meta = { title: "DiceCheckPlayground / B - Cinematic Fullscreen" };

export const C_Gauge: Story = () => {
  const [data, setData] = useState(() => simulateDiceCheck(7, 4));
  return (
    <Wrap>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-gold text-lg font-bold text-glow-gold font-(family-name:--font-display) text-center">
          Style C: 进度条/仪表
        </h2>
        <p className="text-parchment/50 text-xs text-center">
          用进度条直观呈现成功数 vs 目标，适合快速扫读
        </p>
        <StyleC_Gauge data={data} />
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData(simulateDiceCheck(7, 4))}
          >
            重新投掷
          </Button>
        </div>
      </div>
    </Wrap>
  );
};
C_Gauge.meta = { title: "DiceCheckPlayground / C - Progress Gauge" };

export const D_Sequential: Story = () => {
  const [data, setData] = useState(() => simulateDiceCheck(6, 3));
  return (
    <Wrap>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-gold text-lg font-bold text-glow-gold font-(family-name:--font-display) text-center">
          Style D: 逐个揭示
        </h2>
        <p className="text-parchment/50 text-xs text-center">
          骰子逐个翻转揭示，制造紧张感
        </p>
        <StyleD_Sequential data={data} />
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData(simulateDiceCheck(6, 3))}
          >
            重新投掷
          </Button>
        </div>
      </div>
    </Wrap>
  );
};
D_Sequential.meta = { title: "DiceCheckPlayground / D - Sequential Reveal" };

export const E_Sheet: Story = () => {
  const [data, setData] = useState(() => simulateDiceCheck(8, 5));
  return (
    <Wrap>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-gold text-lg font-bold text-glow-gold font-(family-name:--font-display) text-center">
          Style E: TRPG 记录表
        </h2>
        <p className="text-parchment/50 text-xs text-center">
          模拟桌游角色卡记录，信息密度高
        </p>
        <StyleE_Sheet data={data} />
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData(simulateDiceCheck(8, 5))}
          >
            重新投掷
          </Button>
        </div>
      </div>
    </Wrap>
  );
};
E_Sheet.meta = { title: "DiceCheckPlayground / E - TRPG Sheet" };

export const F_Interactive: Story = () => (
  <Wrap>
    <div className="space-y-4">
      <h2 className="text-gold text-lg font-bold text-glow-gold font-(family-name:--font-display) text-center">
        Style F: 完整交互模拟
      </h2>
      <p className="text-parchment/50 text-xs text-center">
        可调参数 + 重掷 + 黄金骰，模拟完整鉴定流程
      </p>
      <StyleF_Interactive />
    </div>
  </Wrap>
);
F_Interactive.meta = { title: "DiceCheckPlayground / F - Interactive" };

export const AllStyles: Story = () => {
  const [data, setData] = useState(() => simulateDiceCheck(7, 4));
  return (
    <Wrap>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-gold text-xl font-bold text-glow-gold font-(family-name:--font-display) text-center mb-6">
          鉴定机制 - 前端呈现方案对比
        </h1>
        <div className="text-center mb-4">
          <Button
            variant="primary"
            size="sm"
            glow
            onClick={() => setData(simulateDiceCheck(7, 4))}
          >
            全部重新投掷
          </Button>
        </div>

        <section>
          <h3 className="text-gold-dim text-sm mb-2">
            A. 经典紧凑 — 复用现有组件
          </h3>
          <StyleA_Classic data={data} />
        </section>

        <section>
          <h3 className="text-gold-dim text-sm mb-2">
            B. 电影式全屏 — 大骰子 + 动画
          </h3>
          <StyleB_Cinematic data={data} />
        </section>

        <section>
          <h3 className="text-gold-dim text-sm mb-2">
            C. 进度条/仪表 — 直观比率
          </h3>
          <StyleC_Gauge data={data} />
        </section>

        <section>
          <h3 className="text-gold-dim text-sm mb-2">
            D. 逐个揭示 — 紧张感
          </h3>
          <StyleD_Sequential data={data} />
        </section>

        <section>
          <h3 className="text-gold-dim text-sm mb-2">
            E. TRPG 记录表 — 高信息密度
          </h3>
          <StyleE_Sheet data={data} />
        </section>
      </div>
    </Wrap>
  );
};
AllStyles.meta = { title: "DiceCheckPlayground / All Styles Compare" };
