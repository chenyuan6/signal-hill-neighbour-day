import { PixelCharacterData } from "./types";

/** Thought bubble emojis by context */
const THOUGHTS_BY_ZONE: Record<string, string[]> = {
  food: ["🍔", "🌭", "🍕", "😋", "🧁"],
  music: ["🎵", "🎶", "🎸", "💃", "🕺"],
  games: ["🎯", "🏆", "💪", "🎉", "⭐"],
  general: ["😊", "❤️", "☀️", "🎉", "👋", "✨", "🥳", "🎈"],
};

/** Internal state for each animated character */
export interface MovingCharacter {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  type: PixelCharacterData["type"];
  name: string;
  speed: number;
  state: "idle" | "walking";
  facing: "left" | "right";
  idleTimer: number;
  walkFrame: number;
  frameCounter: number;
  // Thought bubble
  thought: string | null;
  thoughtTimer: number;
}

// Entrance gate location (top of the rink, near the building)
const ENTRANCE = { x: 280, y: 80 };

/** Pick a random walkable position biased by character type */
function randomTarget(type: PixelCharacterData["type"]): {
  x: number;
  y: number;
} {
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  switch (type) {
    case "rsvp":
      return { x: rand(55, 500), y: rand(80, 250) };
    case "volunteer":
      return { x: rand(50, 510), y: rand(70, 340) };
    case "vendor":
      return { x: rand(160, 510), y: rand(80, 250) };
    case "vip":
      return { x: rand(300, 510), y: rand(80, 240) };
    default:
      return { x: rand(50, 500), y: rand(80, 340) };
  }
}

/** Determine what kind of thought a character should have based on position */
function getThoughtForPosition(x: number, y: number): string {
  // Near food vendors (170-280, 160-240)
  if (x > 150 && x < 300 && y > 140 && y < 250) {
    const pool = THOUGHTS_BY_ZONE.food;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // Near music stage (300-400, 170-240)
  if (x > 280 && x < 420 && y > 150 && y < 250) {
    const pool = THOUGHTS_BY_ZONE.music;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // Near yard games (300-390, 80-150)
  if (x > 280 && x < 410 && y > 60 && y < 160) {
    const pool = THOUGHTS_BY_ZONE.games;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const pool = THOUGHTS_BY_ZONE.general;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Initialize a moving character from static data */
export function initMovingCharacter(
  char: PixelCharacterData
): MovingCharacter {
  const target = randomTarget(char.type);
  return {
    id: char.id,
    x: char.x,
    y: char.y,
    targetX: target.x,
    targetY: target.y,
    color: char.color,
    type: char.type,
    name: char.name,
    speed: 0.4 + Math.random() * 0.35,
    state: "walking",
    facing: target.x > char.x ? "right" : "left",
    idleTimer: 0,
    walkFrame: 0,
    frameCounter: 0,
    thought: null,
    thoughtTimer: 0,
  };
}

/** Create a character that spawns at the entrance gate and walks in */
export function spawnAtEntrance(
  char: PixelCharacterData
): MovingCharacter {
  const target = randomTarget(char.type);
  return {
    id: char.id,
    x: ENTRANCE.x,
    y: ENTRANCE.y,
    targetX: target.x,
    targetY: target.y,
    color: char.color,
    type: char.type,
    name: char.name,
    speed: 0.45 + Math.random() * 0.3,
    state: "walking",
    facing: target.x > ENTRANCE.x ? "right" : "left",
    idleTimer: 0,
    walkFrame: 0,
    frameCounter: 0,
    thought: "🎉",
    thoughtTimer: 60,
  };
}

/** Advance one tick of the movement simulation */
export function tickCharacters(chars: MovingCharacter[]): MovingCharacter[] {
  return chars.map((c) => {
    const next = { ...c, frameCounter: c.frameCounter + 1 };

    // --- Thought bubble logic ---
    if (next.thought !== null) {
      next.thoughtTimer -= 1;
      if (next.thoughtTimer <= 0) {
        next.thought = null;
        next.thoughtTimer = 0;
      }
    } else if (Math.random() < 0.002) {
      // ~6% chance per second at 30fps → occasional thought bubbles
      next.thought = getThoughtForPosition(c.x, c.y);
      next.thoughtTimer = Math.floor(50 + Math.random() * 40); // 1.5–3 seconds
    }

    // --- Movement logic ---
    if (c.state === "idle") {
      next.idleTimer -= 1;
      if (next.idleTimer <= 0) {
        const target = randomTarget(c.type);
        next.targetX = target.x;
        next.targetY = target.y;
        next.state = "walking";
        next.facing = target.x > c.x ? "right" : "left";
      }
      return next;
    }

    // Walking
    const dx = next.targetX - next.x;
    const dy = next.targetY - next.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      next.state = "idle";
      next.idleTimer = Math.floor(60 + Math.random() * 90);
      next.x = next.targetX;
      next.y = next.targetY;
      return next;
    }

    const moveX = (dx / dist) * c.speed;
    const moveY = (dy / dist) * c.speed;
    next.x += moveX;
    next.y += moveY;

    if (Math.abs(dx) > 1) {
      next.facing = dx > 0 ? "right" : "left";
    }

    // Alternate walk frame every 8 ticks
    if (next.frameCounter % 8 === 0) {
      next.walkFrame = next.walkFrame === 0 ? 1 : 0;
    }

    return next;
  });
}
