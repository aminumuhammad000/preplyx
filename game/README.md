# Swallern 3D Exam Game — Exam Journey Milestone

Godot 4.7 project covering the Exam Hub handoff, compact exam world, dynamic subject selection, and dynamic year selection.

## Run

Open `game/project.godot` in Godot 4.7+, then use **F6** on `scenes/swa_test.tscn` to inspect Swa, or **F5** to open the exam hub. The test scene can be launched with **Run Current Scene**.

Controls:

- **W A S D**: move Swa around the platform
- **Shift**: run
- **Mouse hover**: focus an exam portal and reveal its details
- **Left click**: select a portal
- **Enter**: walk toward and open the selected portal
- **Left / Right**: focus adjacent portals
- **Escape**: return the hub panel to its initial state

Selecting a portal opens it and walks production Swa through the gate into the shared exam world. Subject and year navigation use the current Swallern exam availability service. The final action stores the selected exam, subjects, and year for the Battle Preparation milestone.

## Current asset findings

- `scenes.png` is used as a visual reference only; it is not included in the game.
- The hub now uses `assets/branding/logo.svg`, copied byte-for-byte from the supplied root `logo.svg`.
- Production Swa is built from scratch in `assets/swa/`; its Blender source, GLB, reusable Godot controller, and test scene are documented in `assets/swa/documentation/character_design.md`.
- Blender MCP is installed but no instance is connected at `localhost:9876`. The local Blender 5.2 executable built and exported Swa.
- Two short UI/portal tones in `assets/audio/ui/` were synthesized for this scene. No third-party audio is used.

## Structure

- `scenes/exam_hub.tscn` — portal hub and physical exam entry
- `scenes/exam_journey.tscn` — shared exam world, subject browser, year carousel, and battle-preparation handoff
- `scripts/exam_hub.gd` — hub portals, Swa movement, and entry transition
- `scripts/exam_journey.gd` — dynamic selection UI, compact world, navigation, and validation
- `scripts/journey_data.gd` — shared availability adapter and selected journey state
- `assets/branding/` — Swallern logo mark
- `assets/audio/ui/` — original selection and portal cues

## Exam data integration

`JourneyData` requests `GET /api/exams/availability`, which returns exams, subjects, all years, exact subject/year availability, question counts, and question-set IDs from the independent Swallern Exam API. The development base URL is `http://localhost:3000/api`; configure another API base (ending in `/api`) in Project Settings as `swallern/content_api_base_url`, or set `SWALLERN_API_BASE_URL`. The game does not ship substitute catalogs: it displays a retryable connection state when the service is unavailable. The year browser shows every exam year; Battle Preparation receives the selected exam, subject, year, and question-set UUIDs only after matching published sets are found for every subject.

Subject and year browsers create only the visible focused window (up to seven items), support wheel, drag, arrow keys, and on-screen navigation, and reuse the existing Player Swa scene/controller. The current milestone ends with a saved Battle Preparation handoff; question combat remains future work.
