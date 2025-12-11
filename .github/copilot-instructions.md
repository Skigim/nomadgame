# Copilot Instructions for Nomad

## Project Overview
Nomad is a turn-based hex strategy game built with TypeScript and Canvas 2D rendering. No frameworks - pure TypeScript with Vite as the bundler.

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Bundler**: Vite
- **Rendering**: Canvas 2D API
- **Package Manager**: npm

## Architecture Patterns

### Module Structure
Each module has a single responsibility:
- `types.ts` - All TypeScript interfaces and types
- `constants.ts` - Game constants, colors, terrain configs
- `hex-math.ts` - Hex grid coordinate math (pure functions)
- `camera.ts` - Viewport state and transformations
- `terrain.ts` - Terrain generation and tile utilities
- `unit.ts` - Unit factory and configurations
- `game-state.ts` - Centralized game state and mutations
- `renderer.ts` - All Canvas drawing code
- `ai.ts` - Enemy AI decision logic
- `main.ts` - Entry point, event handling, initialization

### State Management
- Game state is centralized in `gameState` object in `game-state.ts`
- State mutations happen through exported functions (e.g., `moveUnit`, `attackUnit`)
- Avoid direct state mutation from other modules

### Coordinate Systems
- **Offset Coordinates (col, row)**: Used for storage and board indexing (odd-R layout)
- **Cube Coordinates (q, r, s)**: Used for algorithms (distance, pathfinding)
- **Pixel Coordinates (x, y)**: Used for rendering and mouse input
- Always use `hexToPixel` and `pixelToHex` for conversions

### Rendering
- All drawing happens in `renderer.ts`
- Use `worldToScreen` for camera transformations
- Sprites are pre-cached with owner-based recoloring at load time
- Only render hexes within the visible viewport (culling)

## Code Style

### Naming Conventions
- Functions: `camelCase` - verbs for actions (`moveUnit`, `getDistance`)
- Types/Interfaces: `PascalCase` (`Unit`, `HexTile`, `GameState`)
- Constants: `SCREAMING_SNAKE_CASE` (`BOARD_COLS`, `HEX_SIZE`)
- Files: `kebab-case.ts` (`game-state.ts`, `hex-math.ts`)

### TypeScript
- Use explicit return types on exported functions
- Prefer `interface` over `type` for object shapes
- Use `Record<K, V>` for dictionaries
- Avoid `any` - use `unknown` if type is truly unknown

### Functions
- Keep functions small and focused
- Pure functions when possible (especially in `hex-math.ts`)
- Document complex algorithms with JSDoc comments

## Common Patterns

### Adding a New Unit Type
1. Add sprite to `assets/` folder
2. Add to `UNIT_SPRITES` in `renderer.ts`
3. Add config to `UNIT_CONFIGS` in `unit.ts`

### Adding a New Terrain Type
1. Add to `TerrainType` union in `types.ts`
2. Add color to `TERRAIN_COLORS` in `constants.ts`
3. Add config to `TERRAIN_CONFIG` in `constants.ts`

### Event Handling
- All event listeners are set up once in `setupEventListeners()` in `main.ts`
- Use window-level flags to prevent duplicate listeners during HMR
- Convert screen coordinates to world coordinates before hex lookup

## Testing Changes
```bash
# Type check before committing
npm run typecheck

# Or use npx directly
npx tsc --noEmit
```

## Don'ts
- Don't import from `main.ts` in other modules (it's the entry point)
- Don't store derived state (recalculate from source of truth)
- Don't add external rendering libraries - use Canvas 2D
- Don't mutate function parameters
- Don't use `var` - use `const` or `let`
