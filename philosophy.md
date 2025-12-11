
***

# Nomad: Design Philosophy & Guidelines

**Vision:** A deep, turn-based 4X browser game that captures the "empire scaling" thrill of PC classics without the time-wasting friction of mobile competitors. We respect the player's time; we do not sell it back to them.

---

### I. Core Design Pillars (The "Hooks")

**1. Capacity Gating > Time Gating (The "Play, Don’t Wait" Rule)**
* **Philosophy:** Players should never log in to find they "can't do anything" because of a 24-hour timer. Activity blocks are failures of design.
* **Mechanic:** We limit **Logistics**, not **Time**.
    * *Example:* Building a mine takes 0 seconds. However, you have a "Construction Capacity" of 3 slots. To build a 4th mine, you must make a strategic choice: Cancel an existing project, or invest resources to upgrade your Craftsmen's Guild.
* **Result:** The bottleneck is always strategic (resource management), never arbitrary (clock watching).

**2. The Command Point (CP) Economy (The "RTS Flow" in Turns)**
* **Philosophy:** Solve the "Late Game Slog" by decoupling actions from individual units. Scaling an empire should feel like becoming a King, not a micromanager.
* **Mechanic:** Players have a global pool of **Command Points** per turn.
    * *Early Game (Low Scale):* You have 10 CP. Moving a Scout costs 1 CP. You micro every step.
    * *Late Game (High Scale):* You have 100 CP. Moving a Scout still costs 1 CP, but you spend 20 CP on a "Region Automation" order (e.g., "Auto-Harvest Frontier Lands").
* **Result:** The *number of clicks* remains stable from Turn 1 to Turn 500, even as the empire grows 10x in size.

**3. Emergent Narrative > Flavor Text**
* **Philosophy:** Players skip text boxes. The "Story" is what happens *to* them, not what they read.
* **Mechanic:** Narrative is driven by **Tag Collisions**.
    * *Bad:* A popup says "Rebels attack!" because RNG rolled a 5.
    * *Good:* A Governor with the `Cruel` trait is assigned to a City with `Educated` population. The game logic triggers a `Coordinated Uprising` rebellion event.
* **Result:** "Story" is a reward for paying attention to game mechanics.

---

### II. The "Anti-Patterns" (Strictly Prohibited)

**1. No "Click-to-Collect" Farming**
* Resources must flow automatically into the treasury. Never force a player to click a building just to "claim" produced gold. That is an engagement hack, not gameplay.

**2. No "Siloed" Victories**
* Science, Military, and Culture are tools, not separate lanes. You cannot win a "Science Victory" by ignoring the map. All victory paths must require interaction with the shared game world.

**3. No "Hidden Math" UI**
* Avoid the "Spreadsheet Simulator" look.
* **Rule:** The main view is graphical (Map/Art). The "Math" (modifiers, upkeep costs) only appears on **Hover/Tooltip**.
* *UI Mantra:* "Clean on glance, deep on inspect."

---

### III. Technical & Pacing Guidelines

**1. Tiered Combat Resolution**
* **Skirmishes:** 100% Instant. Spreadsheet calculation. Result displayed in < 1 second.
* **Wars:** "Cinematic" replay available *after* calculation. Visuals are a reward, not a waiting room.

**2. Session Pacing**
* Designed for **Tab-Switching**. The game state must be preserved perfectly if the player leaves the tab for 20 minutes to work. No "session timeouts" unless security requires it.
* "One Sitting" Loop: A standard play session (refreshing economy, moving armies) must be completable in **15 minutes**.

---

### IV. Summary Checklist for New Features

* [ ] Does this feature require a timer > 5 minutes? (If YES -> Reject/Redesign)
* [ ] Does this scale exponentially with empire size? (If YES -> Automate it)
* [ ] Does this require reading > 3 sentences of lore? (If YES -> Convert to Traits/Tags)
* [ ] Can this be done with a single Global Command? (If NO -> Add Macro-Option)

***
