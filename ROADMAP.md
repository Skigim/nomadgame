# Nomad: Project Roadmap

**Last Updated:** December 11, 2025

## Vision Statement

A turn-based hex 4X strategy game that delivers empire-building depth in browser-friendly sessions. **Capacity over timers. Strategy over spreadsheets. Emergent stories over text dumps.**

---

## Current State (Foundation)

| System | Status | Notes |
|--------|--------|-------|
| Hex Grid & Camera | ✅ Complete | 100x80 board, pan/zoom, viewport culling |
| Terrain Generation | ⚠️ Basic | Procedural noise, 6 terrain types |
| Units & Movement | ✅ Complete | BFS pathfinding with terrain costs |
| Combat | ⚠️ Basic | Damage only, no terrain/flanking modifiers |
| Fog of War | ✅ Complete | Per-unit sight, explored memory persists |
| Cities | ⚠️ Minimal | Settlers can found cities, no functionality |
| AI | ⚠️ Basic | Chase nearest player, attack if in range |
| Server | 🔲 Scaffolded | SQLite schema exists, not connected to client |

---

## Phase 1: Core Economy Loop

*Goal: Cities matter. Resources flow. Decisions have weight.*

### 1.1 Resource System
- [ ] Define resource types: Food, Production, Gold, Science
- [ ] Resources flow automatically each turn (no click-to-collect)
- [ ] Top bar UI shows empire totals
- [ ] City panel shows per-city breakdown on hover

### 1.2 City Production (Capacity-Gated)
- [ ] Cities have **build slots** (start: 1, upgradeable)
- [ ] Production queue: Units, Buildings, Projects
- [ ] **No build timers** — items complete when production cost is paid
- [ ] Production accumulates each turn until threshold met

### 1.3 Tile Yields & Improvements
- [ ] Each hex provides base yields (plains: +2 food, forest: +1 production, etc.)
- [ ] Worker unit type for building improvements
- [ ] Improvement types: Farm, Mine, Lumber Mill
- [ ] City works tiles within culture radius

### 1.4 Unit Upkeep
- [ ] Units cost Gold per turn
- [ ] Negative gold = units desert or reduced effectiveness
- [ ] Strategic tension: army size vs. economic stability

### 1.5 Turn Processing
- [ ] End-of-turn resource calculation
- [ ] Production progress updates
- [ ] Unit upkeep deduction

---

## Phase 2: Strategic Depth

*Goal: Meaningful decisions. Interconnected systems. No "solved" strategies.*

### 2.1 Technology Tree
- [ ] Define tech tree structure (linear early → branching late)
- [ ] Tech unlocks: Units, Buildings, Abilities, Improvements
- [ ] Science resource accumulates toward current research
- [ ] **No science "victory lane"** — tech enables other strategies

### 2.2 Command Point System
- [ ] Global CP pool per turn (scales with empire)
- [ ] **Free actions:** Basic move, basic attack (per-unit limits apply)
- [ ] **CP actions:** Found city, special abilities, automation orders
- [ ] Late-game: Macro-commands ("Fortify All Borders")

### 2.3 Combat Refinement
- [ ] Apply terrain defense bonuses (data exists, not used)
- [ ] Flanking/support bonuses
- [ ] Unit promotions (veteran status after X kills)
- [ ] Siege mechanics for attacking cities
- [ ] Counter-attacks for melee defenders

### 2.4 Trait/Tag System (Emergent Narrative Foundation)
- [ ] Add `tags` field to Unit type
- [ ] Units gain traits through experience: `Veteran`, `Cautious`, `Bloodthirsty`
- [ ] Add `tags` field to Structure type
- [ ] Cities have characteristics: `Productive`, `Restless`, `Loyal`
- [ ] Event engine checks tag collisions (not RNG)

---

## Phase 3: Empire Scale

*Goal: 50 cities should feel like 5. King, not micromanager.*

### 3.1 Automation & Standing Orders
- [ ] Patrol routes for military units
- [ ] Auto-explore for scouts
- [ ] Governor AI for cities (production focus: military/growth/science)
- [ ] Rally points for newly produced units

### 3.2 Army Groups
- [ ] Select multiple units → Form Army
- [ ] Move army as single entity
- [ ] Coordinated attack mechanics
- [ ] Army-level orders (assault, defend, retreat threshold)

### 3.3 Region Management
- [ ] Map divided into regions (geographic or player-defined)
- [ ] Assign policies per region
- [ ] Region-level automation ("Develop Infrastructure", "Militarize")

### 3.4 Summary Views
- [ ] Empire Overview: All cities at a glance
- [ ] Military Overview: All armies, orders, status
- [ ] Economy Overview: Income/expenses breakdown
- [ ] Keyboard shortcuts for quick navigation

---

## Phase 4: Victory & Endgame

*Goal: Multiple paths, all requiring map presence. Clear objectives.*

### 4.1 Victory Conditions

| Type | Requirement | Map Interaction |
|------|-------------|-----------------|
| **Domination** | Control all capitals | Military conquest |
| **Economic** | Accumulate X gold & control trade routes | Territory + infrastructure |
| **Cultural** | Build Wonders visible to all civs | Specific tiles, defense required |
| **Scientific** | Complete Final Project | Resource chain, protect labs |

- [ ] Implement domination victory (eliminate all enemies)
- [ ] Implement economic victory
- [ ] Implement cultural victory
- [ ] Implement scientific victory
- [ ] Victory progress UI

### 4.2 Score System
- [ ] Turn-by-turn scoring: territory, population, military, techs
- [ ] "Ahead/Behind" indicator vs. AI opponents
- [ ] Final score screen with detailed breakdown

### 4.3 Endgame Pacing
- [ ] Late-game turns completable in ~15 minutes
- [ ] Automation handles routine; player handles strategy
- [ ] Victory countdown when nearing completion

---

## Phase 5: Multiplayer

*Goal: Async-friendly. Respect player time. Secure.*

### 5.1 Server Authority
- [ ] Move all game logic to server
- [ ] Client sends intents ("move unit 5 to hex 10,20")
- [ ] Server validates and responds with new state
- [ ] No client-side cheating possible

### 5.2 Turn Modes
- [ ] **Simultaneous:** All players plan, then execute together
- [ ] **Sequential:** Traditional turn order (for smaller games)
- [ ] **Async:** Notification when it's your turn

### 5.3 Game Lobby
- [ ] Create game with settings (map size, victory conditions, player slots)
- [ ] Join public games or private (invite code)
- [ ] Spectator mode for finished games

### 5.4 Persistence
- [ ] Games saved to database
- [ ] Resume anytime
- [ ] Game history/replay system

### 5.5 Authentication
- [ ] Player accounts (existing schema ready)
- [ ] Session management
- [ ] Password security

---

## Phase 6: Polish & Content

*Goal: Feels complete. Replayable. Extensible.*

### 6.1 Visual Polish
- [ ] Unit animations (move, attack, death)
- [ ] Particle effects (combat, city production)
- [ ] Sound effects and ambient audio
- [ ] Visual variety (day/night cycle or weather)

### 6.2 Content Depth
- [ ] 15+ unit types with distinct roles
- [ ] 20+ building types
- [ ] 30+ technologies
- [ ] 5+ map types/biomes

### 6.3 Balance & AI
- [ ] AI uses same systems as player (no cheating)
- [ ] Multiple AI personalities (aggressive, builder, turtler)
- [ ] Difficulty scales via starting bonuses, not rule changes

### 6.4 Mod Support (Stretch Goal)
- [ ] JSON-defined units, buildings, techs
- [ ] Custom maps
- [ ] Workshop/sharing system

---

## Development Principles

1. **Vertical slices over horizontal layers** — Each phase delivers playable value
2. **Philosophy compliance** — Every feature checked against design pillars
3. **Server-ready architecture** — Even in single-player, code assumes server validation
4. **Documentation as we go** — JSDoc everything, decisions recorded
5. **Playtest early** — After Phase 1, the game should be *fun* even if limited

---

## Changelog

### December 11, 2025
- Initial roadmap created
- Documented current foundation state
- Defined 6-phase development plan
