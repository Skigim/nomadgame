# Nomad - Hex Strategy Game

A turn-based hex strategy game built with TypeScript and Canvas 2D.

## Features

- **Hex Grid**: Pointy-topped hexes with offset coordinates (odd-R)
- **Fog of War**: Units reveal terrain based on sight range
- **Terrain System**: Plains, forest, mountain, water, sand, swamp with movement costs
- **Unit Types**: Warrior, Spearman, Scout, Horseman, Settler, Slinger
- **Turn-based Combat**: Move + Action system per unit per turn
- **AI Opponent**: Basic AI that moves towards and attacks player units
- **Camera System**: Pan (WASD/drag) and zoom (scroll wheel)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

## Controls

- **Left Click**: Select unit / Move / Attack
- **Right Click / Middle Click + Drag**: Pan camera
- **WASD / Arrow Keys**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **End Turn**: Pass turn to enemy AI

## Project Structure

```
src/
├── main.ts          # Entry point, event handling
├── types.ts         # TypeScript interfaces
├── constants.ts     # Game constants and colors
├── hex-math.ts      # Hex grid coordinate math
├── camera.ts        # Viewport and camera controls
├── terrain.ts       # Terrain generation
├── unit.ts          # Unit factory
├── game-state.ts    # Game state management
├── renderer.ts      # Canvas rendering
├── ai.ts            # Enemy AI logic
└── styles.css       # UI styling
```

## Architecture

- **Separation of Concerns**: Rendering, game logic, and UI are separate modules
- **Immutable-ish State**: Game state is centralized in `game-state.ts`
- **Type Safety**: Full TypeScript with strict mode
- **No External Dependencies**: Pure Canvas 2D rendering

## License

MIT
