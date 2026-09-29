# Swa — original Swallern companion

Swa is a custom stylized swallow-inspired learning companion built from authored mesh forms in Blender. The silhouette combines a rounded expressive head, small three-feather crest, ivory face/chest, marigold beak and feet, teal collar, compact wing-arms with three feather digits, and a forked swallow tail. Materials are embedded and use a compact palette; no external character assets or image textures are used.

## Deliverables

- `../models/swa.glb` — Godot-ready model, 40 imported bones, 8 facial morph targets, and 39 animation clips.
- `../source/swa.blend` — editable Blender source file.
- `../source/build_swa.py` — reproducible procedural Blender build/export source.
- `../previews/` — rendered front/back/left/right/three-quarter/gameplay-distance inspections.
- `../../../scripts/swa_character.gd` — reusable animation, expression, and smooth look-target API.
- `../../../scripts/player_swa_controller.gd` and `computer_swa_controller.gd` — separate controller types sharing Swa's visual/animation base.
- `../../../scenes/swa_character.tscn` — ready-to-instance character scene.
- `../../../scenes/swa_test.tscn` — interactive character animation/expression test scene.

## Rig

The Blender rig has root/pelvis/spine/chest/neck/head/jaw; left/right gaze, eyelid, and brow controls; independent shoulders, upper/lower wings, hands, six independently weighted feather digits; a split tail; and independently articulated legs, feet, and toe groups. The production skin is one unified mesh with bone-specific vertex weights and eight facial shape keys: Blink, Happy, Surprised, Confused, Sad, Determined, Sleepy, and BeakOpen.

## Animation clips

Idle, Idle_Variation, Walk, Run, Start_Walking, Stop_Walking, Turn_Left, Turn_Right, Wave, Point, Look_Around, Look_At_Object, Head_Nod, Head_Shake, Curious, Thinking, Confused, Excited, Happy, Sad, Celebrate, Victory_Small, Victory_Big, Attack, Attack_Reaction, Hit_Reaction, Defeated, Ready_Battle_Stance, Listening, Correct_Answer, Wrong_Answer, Encourage, Discover, Lets_Go, Jump, Fall, Land, Sleep, Rest.

## Build

Run from the repository root:

```sh
blender -b --factory-startup --python game/assets/swa/source/build_swa.py
```

The local Blender 5.2 CLI was used because Blender MCP is installed but no MCP Blender instance is connected.
