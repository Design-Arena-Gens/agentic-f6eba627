"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  type Variants,
} from "framer-motion";
import clsx from "clsx";

type Side = "player" | "opponent";

type MoveType =
  | "Fire"
  | "Water"
  | "Grass"
  | "Electric"
  | "Ice"
  | "Psychic"
  | "Fairy"
  | "Rock";

interface Move {
  name: string;
  type: MoveType;
  power: number;
  accuracy: number;
  description: string;
}

interface Pokemon {
  name: string;
  hp: number;
  maxHp: number;
  types: MoveType[];
  moves: Move[];
  flair: string;
}

interface BattlePokemon extends Pokemon {
  energy: number;
}

interface BattleState {
  player: BattlePokemon;
  opponent: BattlePokemon;
  turn: Side;
  victor?: Side;
}

interface Projectile {
  id: string;
  bundle: string;
  side: Side;
  type: MoveType;
  delay: number;
  lift: number;
}

const TYPE_STYLES: Record<
  MoveType,
  { from: string; via: string; to: string; text: string; glow: string; icon: string }
> = {
  Fire: {
    from: "from-orange-400",
    via: "via-rose-500",
    to: "to-amber-500",
    text: "text-orange-400",
    glow: "shadow-[0_0_22px_rgba(255,145,72,0.45)]",
    icon: "🔥",
  },
  Water: {
    from: "from-sky-300",
    via: "via-blue-500",
    to: "to-cyan-500",
    text: "text-sky-300",
    glow: "shadow-[0_0_22px_rgba(56,189,248,0.42)]",
    icon: "💧",
  },
  Grass: {
    from: "from-teal-300",
    via: "via-emerald-400",
    to: "to-lime-400",
    text: "text-emerald-300",
    glow: "shadow-[0_0_22px_rgba(52,211,153,0.42)]",
    icon: "🍃",
  },
  Electric: {
    from: "from-amber-300",
    via: "via-yellow-400",
    to: "to-orange-400",
    text: "text-amber-300",
    glow: "shadow-[0_0_22px_rgba(252,211,77,0.45)]",
    icon: "⚡️",
  },
  Ice: {
    from: "from-cyan-200",
    via: "via-sky-200",
    to: "to-blue-300",
    text: "text-cyan-200",
    glow: "shadow-[0_0_22px_rgba(165,243,252,0.45)]",
    icon: "❄️",
  },
  Psychic: {
    from: "from-fuchsia-400",
    via: "via-purple-500",
    to: "to-pink-500",
    text: "text-fuchsia-300",
    glow: "shadow-[0_0_22px_rgba(217,70,239,0.42)]",
    icon: "✨",
  },
  Fairy: {
    from: "from-pink-200",
    via: "via-rose-300",
    to: "to-purple-300",
    text: "text-pink-200",
    glow: "shadow-[0_0_22px_rgba(244,114,182,0.38)]",
    icon: "🌸",
  },
  Rock: {
    from: "from-stone-400",
    via: "via-amber-600",
    to: "to-zinc-500",
    text: "text-amber-400",
    glow: "shadow-[0_0_22px_rgba(120,113,108,0.42)]",
    icon: "🪨",
  },
};

const TYPE_CHART: Partial<Record<MoveType, Partial<Record<MoveType, number>>>> = {
  Fire: { Grass: 2, Ice: 2, Rock: 0.5, Water: 0.5, Fire: 0.5 },
  Water: { Fire: 2, Rock: 2, Grass: 0.5, Electric: 0.5 },
  Grass: { Water: 2, Rock: 2, Fire: 0.5, Grass: 0.5 },
  Electric: { Water: 2, Grass: 0.5 },
  Ice: { Grass: 2, Water: 0.5, Fire: 0.5, Rock: 1 },
  Psychic: { Psychic: 0.5 },
  Fairy: { Psychic: 1, Fire: 0.5 },
  Rock: { Fire: 2, Electric: 1, Grass: 1, Water: 1 },
};

const createPokemon = (base: Omit<Pokemon, "hp">): BattlePokemon => ({
  ...base,
  hp: base.maxHp,
  energy: 100,
});

const PLAYER_TEAM = createPokemon({
  name: "Solaris",
  maxHp: 260,
  types: ["Fire", "Grass"],
  moves: [
    {
      name: "Flare Cascade",
      type: "Fire",
      power: 36,
      accuracy: 94,
      description: "A cascading wave of golden flame that engulfs the arena.",
    },
    {
      name: "Solar Bloom",
      type: "Grass",
      power: 28,
      accuracy: 100,
      description: "Harnesses sunlight to bloom radiant petals that heal slightly.",
    },
    {
      name: "Aurora Pulse",
      type: "Psychic",
      power: 32,
      accuracy: 96,
      description: "A prismatic pulse that disorients the foe.",
    },
    {
      name: "Stellar Crest",
      type: "Fairy",
      power: 30,
      accuracy: 98,
      description: "A ribbon of stardust that empowers Solaris’ aura.",
    },
  ],
  flair: "Charismatic Sun Drake",
});

const OPPONENT_TEAM = createPokemon({
  name: "Tidal Vanguard",
  maxHp: 270,
  types: ["Water", "Electric"],
  moves: [
    {
      name: "Nebula Torrent",
      type: "Water",
      power: 34,
      accuracy: 97,
      description: "A spiralling column of crystal water.",
    },
    {
      name: "Ion Crash",
      type: "Electric",
      power: 35,
      accuracy: 92,
      description: "Charged lances of electricity crash into the opponent.",
    },
    {
      name: "Frostbound Wake",
      type: "Ice",
      power: 27,
      accuracy: 99,
      description: "Icy shards ride atop the wave with a chilling finish.",
    },
    {
      name: "Anchor Bloom",
      type: "Grass",
      power: 24,
      accuracy: 100,
      description: "Sea flora entangles the foe, siphoning their energy.",
    },
  ],
  flair: "Mariner Leviathan",
});

const INITIAL_STATE: BattleState = {
  player: PLAYER_TEAM,
  opponent: OPPONENT_TEAM,
  turn: "player",
};

const bundleProjectiles = (side: Side, type: MoveType): Projectile[] => {
  const bundle = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return Array.from({ length: 4 }).map((_, index) => ({
    id: `${bundle}-${index}`,
    bundle,
    side,
    type,
    delay: index * 90,
    lift: (Math.random() - 0.5) * 40,
  }));
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const calculateDamage = (
  move: Move,
  defender: Pokemon,
): { damage: number; effectiveness: number; crit: boolean } => {
  const base = move.power;
  const variation = 0.85 + Math.random() * 0.2;
  const crit = Math.random() < 0.1;
  const multiplier = defender.types.reduce((product, typing) => {
    const typeMultiplier = TYPE_CHART[move.type]?.[typing as MoveType] ?? 1;
    return product * typeMultiplier;
  }, 1);

  const damage = Math.round(base * variation * (crit ? 1.5 : 1) * multiplier);

  return { damage: clamp(damage, 12, 90), effectiveness: multiplier, crit };
};

const effectMessage = (effectiveness: number) => {
  if (effectiveness > 1.5) return "It’s super effective!";
  if (effectiveness < 1) return "It’s not very effective…";
  return null;
};

const formatHp = (hp: number, maxHp: number) => `${hp}/${maxHp}`;

const BOUNCE_VARIANTS: Variants = {
  idle: { y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  active: {
    y: [-12, 0, -8],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const HealthBar = ({ current, max, side }: { current: number; max: number; side: Side }) => {
  const ratio = current / max;
  const percent = Math.max(0, Math.min(1, ratio));
  const hue = Math.round(120 * percent);
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        <span>{side === "player" ? "Trainer A" : "Trainer B"}</span>
        <span className="font-semibold text-zinc-800">{formatHp(current, max)}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-200/60">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, hsl(${hue}, 90%, 65%), hsl(${hue}, 85%, 55%))`,
          }}
          animate={{ width: `${percent * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

const PokemonBadge = ({ pokemon }: { pokemon: Pokemon }) => (
  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
    {pokemon.types.map((type) => (
      <span
        key={type}
        className={clsx(
          "rounded-full bg-white/70 px-3 py-1 font-semibold backdrop-blur transition-colors",
          TYPE_STYLES[type].text,
        )}
      >
        {type}
      </span>
    ))}
  </div>
);

const ProjectileCluster = ({ projectiles }: { projectiles: Projectile[] }) => (
  <AnimatePresence>
    {projectiles.map((projectile) => {
      const style = TYPE_STYLES[projectile.type];
      const direction = projectile.side === "player" ? 1 : -1;
      return (
        <motion.span
          key={projectile.id}
          initial={{
            x: projectile.side === "player" ? "18vw" : "-18vw",
            y: projectile.lift,
            scale: 0.6,
            opacity: 0,
          }}
          animate={{
            x: direction * 50 + "vw",
            y: projectile.lift * 0.2,
            scale: [0.6, 1.05, 0.8],
            opacity: [0, 1, 0],
            rotate: direction * 14,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.1,
            delay: projectile.delay / 1000,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={clsx(
            "pointer-events-none absolute bottom-[38%] text-4xl drop-shadow-[0_20px_25px_rgba(0,0,0,0.25)]",
            style.text,
          )}
        >
          {style.icon}
        </motion.span>
      );
    })}
  </AnimatePresence>
);

const useHitShake = () => {
  const controls = useAnimationControls();
  const trigger = useCallback(() => {
    controls.start({
      x: [0, -8, 6, -4, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    });
  }, [controls]);
  return { controls, trigger };
};

export default function Home() {
  const [battle, setBattle] = useState<BattleState>(INITIAL_STATE);
  const [battleLog, setBattleLog] = useState<string[]>([
    "The arena hums to life as Solaris faces the Tidal Vanguard.",
  ]);
  const [isResolving, setIsResolving] = useState(false);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);

  const battleRef = useRef<BattleState>(battle);
  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  const playerShake = useHitShake();
  const opponentShake = useHitShake();

  const resetBattle = useCallback(() => {
    const freshState: BattleState = {
      player: { ...PLAYER_TEAM, hp: PLAYER_TEAM.maxHp },
      opponent: { ...OPPONENT_TEAM, hp: OPPONENT_TEAM.maxHp },
      turn: "player",
    };
    setBattle(freshState);
    setBattleLog(["The arena hums to life as Solaris faces the Tidal Vanguard."]);
    setProjectiles([]);
    setIsResolving(false);
  }, []);

  const resolveTurn = useCallback(
    (side: Side, move: Move) => {
      const current = battleRef.current;
      if (current.victor || isResolving || current[side].hp <= 0) return;

      setIsResolving(true);
      setBattle((prev) => ({ ...prev, turn: side }));

      const cluster = bundleProjectiles(side, move.type);
      setProjectiles((prev) => [...prev, ...cluster]);

      const defenderSide: Side = side === "player" ? "opponent" : "player";

      const cleanup = () => {
        setProjectiles((prev) => prev.filter((p) => p.bundle !== cluster[0]?.bundle));
      };

      window.setTimeout(() => {
        const state = battleRef.current;
        const attacker = state[side];
        const defender = state[defenderSide];

        if (attacker.hp <= 0 || state.victor) {
          cleanup();
          setIsResolving(false);
          return;
        }

        const { damage, effectiveness, crit } = calculateDamage(move, defender);
        const nextHp = clamp(defender.hp - damage, 0, defender.maxHp);

        const updated: BattleState = {
          ...state,
          [defenderSide]: { ...defender, hp: nextHp },
          turn: defenderSide,
        };

        if (nextHp <= 0) {
          updated.victor = side;
        }

        battleRef.current = updated;
        setBattle(updated);

        if (defenderSide === "player") {
          playerShake.trigger();
        } else {
          opponentShake.trigger();
        }

        const messages = [
          `${attacker.name} used ${move.name}!`,
          crit ? "A critical hit!" : null,
          effectMessage(effectiveness),
          nextHp <= 0 ? `${defender.name} fainted.` : null,
        ].filter(Boolean) as string[];

        setBattleLog((prev) => [...messages, ...prev].slice(0, 8));

        window.setTimeout(() => {
          cleanup();
          setIsResolving(false);
        }, 300);
      }, 620);
    },
    [isResolving, opponentShake, playerShake],
  );

  useEffect(() => {
    if (battle.turn === "opponent" && !battle.victor && !isResolving) {
      const timeout = window.setTimeout(() => {
        const move =
          battleRef.current.opponent.moves[
            Math.floor(Math.random() * battleRef.current.opponent.moves.length)
          ];
        resolveTurn("opponent", move);
      }, 900);

      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [battle.turn, battle.victor, isResolving, resolveTurn]);

  const playerDisabled = battle.turn !== "player" || battle.victor !== undefined || isResolving;

  const projectileBundles = useMemo(() => projectiles, [projectiles]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(212,224,255,0.75),_rgba(228,236,255,0.55)_60%,_rgba(233,242,255,0.4)_80%,_rgba(244,247,255,0.3))]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.4),rgba(242,248,255,0.3)_35%,rgba(198,211,255,0.25)_70%,rgba(244,241,255,0.3))]" />
      <main className="relative flex w-full max-w-6xl flex-col gap-8 rounded-[48px] border border-white/40 bg-white/65 p-10 shadow-[0_45px_90px_rgba(84,104,255,0.18)] backdrop-blur-[28px]">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Atelier Battle Lab</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">
              Solaris vs. Tidal Vanguard
            </h1>
          </div>
          <button
            onClick={resetBattle}
            className="rounded-full border border-white/60 bg-white/70 px-5 py-2 text-sm font-semibold text-zinc-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:scale-[1.02] hover:bg-white/90"
          >
            Reset Battle
          </button>
        </header>

        <section className="relative flex h-[520px] w-full overflow-hidden rounded-[36px] border border-white/50 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.9),_rgba(214,226,255,0.65),_rgba(184,206,255,0.55)_55%,_rgba(164,198,255,0.4)_80%,rgba(142,176,255,0.35))] px-10 py-12 shadow-[inset_0_20px_40px_rgba(255,255,255,0.4)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-10 h-24 w-24 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute inset-x-10 bottom-16 h-[220px] rounded-[40px] bg-gradient-to-b from-white/30 via-white/12 to-transparent blur-xl" />
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
          </div>

          <ProjectileCluster projectiles={projectileBundles} />

          <div className="relative flex h-full w-full items-end justify-between">
            <motion.div
              animate={playerShake.controls}
              className="relative flex w-[44%] flex-col gap-6 rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_25px_55px_rgba(120,125,255,0.18)] backdrop-blur-2xl"
            >
              <motion.div
                className="relative flex flex-col items-start gap-3"
                variants={BOUNCE_VARIANTS}
                animate={battle.turn === "player" && !battle.victor ? "active" : "idle"}
              >
                <div className="absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-white/40 blur-xl" />
                <div className="relative flex h-36 w-full items-center justify-center rounded-[24px] border border-white/60 bg-gradient-to-br from-amber-50/90 via-white/80 to-white/90 shadow-[0_18px_45px_rgba(255,186,142,0.22)]">
                  <div className="absolute -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-orange-100/70 via-amber-200/80 to-rose-200/60 blur-2xl" />
                  <span className="text-6xl drop-shadow-[0_18px_35px_rgba(255,176,89,0.45)]">
                    🔆
                  </span>
                </div>
              </motion.div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Player</p>
                    <h2 className="text-2xl font-semibold text-zinc-900">{battle.player.name}</h2>
                  </div>
                  <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    {battle.player.flair}
                  </span>
                </div>
                <PokemonBadge pokemon={battle.player} />
              </div>
              <HealthBar current={battle.player.hp} max={battle.player.maxHp} side="player" />
            </motion.div>

            <motion.div
              animate={opponentShake.controls}
              className="relative flex w-[44%] flex-col gap-6 rounded-[28px] border border-white/70 bg-white/60 p-6 shadow-[0_25px_55px_rgba(112,165,255,0.18)] backdrop-blur-2xl"
            >
              <motion.div
                className="relative flex flex-col items-start gap-3"
                variants={BOUNCE_VARIANTS}
                animate={battle.turn === "opponent" && !battle.victor ? "active" : "idle"}
              >
                <div className="absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-white/30 blur-xl" />
                <div className="relative flex h-36 w-full items-center justify-center rounded-[24px] border border-white/70 bg-gradient-to-br from-sky-50/90 via-white/90 to-white/75 shadow-[0_18px_45px_rgba(120,160,255,0.25)]">
                  <div className="absolute -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-sky-100/70 via-cyan-200/80 to-indigo-200/60 blur-2xl" />
                  <span className="text-6xl drop-shadow-[0_18px_35px_rgba(96,165,250,0.45)]">🌊</span>
                </div>
              </motion.div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Opponent</p>
                    <h2 className="text-2xl font-semibold text-zinc-900">
                      {battle.opponent.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    {battle.opponent.flair}
                  </span>
                </div>
                <PokemonBadge pokemon={battle.opponent} />
              </div>
              <HealthBar current={battle.opponent.hp} max={battle.opponent.maxHp} side="opponent" />
            </motion.div>
          </div>

          {battle.victor && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pointer-events-none absolute inset-x-16 top-10 rounded-[24px] border border-white/60 bg-white/70 px-8 py-6 text-center text-lg font-semibold uppercase tracking-[0.3em] text-zinc-600 shadow-[0_20px_40px_rgba(79,117,255,0.22)] backdrop-blur-xl"
            >
              {battle.victor === "player"
                ? "Solaris claims a radiant victory!"
                : "Tidal Vanguard prevails in the surge!"}
            </motion.div>
          )}
        </section>

        <section className="grid grid-cols-[1.3fr_1fr] gap-8 max-lg:grid-cols-1">
          <div className="flex flex-col gap-4 rounded-[30px] border border-white/50 bg-white/70 p-6 shadow-[0_20px_50px_rgba(112,128,255,0.16)] backdrop-blur-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">
              Command Palette
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {battle.player.moves.map((move) => {
                const style = TYPE_STYLES[move.type];
                const disabled = playerDisabled;
                return (
                  <button
                    key={move.name}
                    onClick={() => resolveTurn("player", move)}
                    disabled={disabled}
                    className={clsx(
                      "group relative overflow-hidden rounded-[24px] border border-white/60 px-5 py-6 text-left transition-all duration-300",
                      "shadow-[0_18px_40px_rgba(120,125,255,0.16)] backdrop-blur-xl",
                      disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:scale-[1.02] hover:border-white/80",
                    )}
                  >
                    <div
                      className={clsx(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity group-hover:opacity-100",
                        style.from,
                        style.via,
                        style.to,
                      )}
                    />
                    <div className="relative flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <span className="text-2xl drop-shadow-[0_10px_22px_rgba(15,23,42,0.18)]">
                          {style.icon}
                        </span>
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600 backdrop-blur">
                          {move.type}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-zinc-900">{move.name}</p>
                        <p className="text-sm text-zinc-600">{move.description}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-600">
                        <span>Power {move.power}</span>
                        <span>Acc {move.accuracy}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-[30px] border border-white/50 bg-white/70 p-6 shadow-[0_18px_40px_rgba(100,140,255,0.14)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">
                Battle Timeline
              </h3>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Live Feed
              </span>
            </div>
            <div className="flex h-72 flex-col gap-3 overflow-hidden">
              {battleLog.map((entry, index) => (
                <motion.div
                  key={`${entry}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[18px] border border-white/50 bg-white/65 px-4 py-3 text-sm font-medium text-zinc-600 shadow-inner shadow-white/40 backdrop-blur"
                >
                  {entry}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
