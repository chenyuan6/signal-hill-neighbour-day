import { PixelCharacterData } from "./types";

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
  idleTimer: number; // ticks remaining in idle state
  walkFrame: number; // alternates 0/1 for leg animation
  frameCounter: number;
}

// Walkable bounds (grass area, avoiding rink interior and parking)
const WALK_AREAS = {
  // Around the rink perimeter (outside the boards)
  topGrass: { x1: 5, y1: 58, x2: 555, y2: 72 },
  bottomGrass: { x1: 5, y1: 258, x2: 555, y2: 360 },
  leftGrass: { x1: 5, y1: 58, x2: 38, y2: 360 },
  rightGrass: { x1: 522, y1: 58, x2: 555, y2: 360 },
  // Inside the rink zones (characters can wander inside the event)
  insideRink: { x1: 50, y1: 75, x2: 510, y2: 250 },
};

// Entrance gate location
const ENTRANCE = { x: 280, y: 310 };

/** Pick a random walkable position biased by character type */
function randomTarget(type: PixelCharacterData["type"]): {
  x: number;
  y: number;
} {
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  switch (type) {
    case "rsvp":
      // RSVP families wander inside the event
      return {
        x: rand(55, 500),
        y: rand(80, 250),
      };
    case "volunteer":
      // Volunteers patrol everywhere
      return {
        x: rand(50, 510),
        y: rand(70, 340),
      };
    case "vendor":
      // Vendors stay near the food/sponsor side
      return {
        x: rand(160, 510),
        y: rand(80, 250),
      };
    case "vip":
      // VIPs wander near info booth and stage
      return {
        x: rand(300, 510),
        y: rand(80, 240),
      };
    default:
      return { x: rand(50, 500), y: rand(80, 340) };
  }
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
    speed: 1.0 + Math.random() * 0.8, // brisk RCT walk ~1.0–1.8 px/tick
    state: "walking", // start walking immediately so they look alive
    facing: target.x > char.x ? "right" : "left",
    idleTimer: 0,
    walkFrame: 0,
    frameCounter: 0,
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
    speed: 1.2 + Math.random() * 0.5,
    state: "walking",
    facing: target.x > ENTRANCE.x ? "right" : "left",
    idleTimer: 0,
    walkFrame: 0,
    frameCounter: 0,
  };
}

/** Advance one tick of the movement simulation */
export function tickCharacters(chars: MovingCharacter[]): MovingCharacter[] {
  return chars.map((c) => {
    const next = { ...c, frameCounter: c.frameCounter + 1 };

    if (c.state === "idle") {
      next.idleTimer -= 1;
      if (next.idleTimer <= 0) {
        // Start walking to a new target
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
      // Arrived — go idle
      next.state = "idle";
      next.idleTimer = Math.floor(20 + Math.random() * 40); // short pauses
      next.x = next.targetX;
      next.y = next.targetY;
      return next;
    }

    // Move toward target
    const moveX = (dx / dist) * c.speed;
    const moveY = (dy / dist) * c.speed;
    next.x += moveX;
    next.y += moveY;

    // Update facing direction
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
