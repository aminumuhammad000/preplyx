# SWA White Mascot Master (Production V3)

Production-ready character asset built with Blender 5.2.2 LTS using `source/build_swa_master.py`.

## Files

- `source/swa_master.blend` — Editable Blender master scene, complete production armature, IK/FK controls, shape keys, and action library.
- `models/swa_master.glb` — Exported production-ready skinned GLB with unified single mesh, morph targets, materials, and 33 animation clips.
- `previews/swa_master_{front,side,back,three_quarter}.png` — High-resolution studio turnaround views.
- `previews/swa_expression_*.png` — High-resolution validation renders for 16 facial expression states.
- `previews/swa_expression_contact_sheet.png` — 4x4 facial expression contact sheet.
- `source/build_swa_master.py` — Procedural, reproducible master build pipeline.
- `source/qa_v3_rig.py` — Rig hierarchy, IK constraints, deformation, and extreme pose validation test suite.

## Visual Design & Identity Baseline

- **Silhouette**: Plump, rounded, soft capsule mascot with rounded dome head, fuller upper body, cute belly curvature, and stable pebble feet flat at $Z=0$.
- **Antenna**: Removed cleanly per design directive, yielding a smooth, pure, minimalist mascot dome.
- **Eyes**: Large, expressive, rounded dark plum/charcoal glossy eyes (`#2D2D3A`) with bright circular specular catchlights.
- **Mouth**: Delicate, recessed facial mouth cavity with rosylit tongue/interior (`#FA3D61`), naturally deforming across emotional shape keys.
- **Cheeks / Blush**: Controllable soft warm pink blush glow (`#FF8CA3`), driven via `BLUSH` parameter (0 = off, 0.25 = subtle, 0.5 = normal, 0.75 = strong, 1.0 = very strong) and shape keys.
- **Hands**: Mascot hand design with articulated digits: Thumb (`01`, `02`), Index pointer (`01`, `02`), and Fingers mass (`01`, `02`).
- **Body Material**: Premium porcelain soft satin PBR with subtle warm subsurface scattering (SSS) for a huggable, soft digital mascot feel.

## Rig & Hierarchy

The production rig hierarchy strictly follows:
```
SWA_MASTER (Ground level control, Z=0)
  └── SWA_ROOT (Root motion control)
        └── SWA_PELVIS (Center of mass / hips)
              ├── SWA_SPINE (Lower spine / torso compression)
              │     └── SWA_CHEST (Upper torso & shoulder girdle)
              │           ├── SWA_NECK
              │           │     └── SWA_HEAD
              │           │           ├── SWA_EYE_TARGET (Gaze control proxy)
              │           │           ├── SWA_EYE_L / SWA_EYE_R
              │           ├── SWA_UPPER_ARM_L / R
              │           │     └── SWA_FOREARM_L / R (Elbow joint, Arm IK constraint)
              │           │           └── SWA_HAND_L / R (Wrist / Palm)
              │           │                 ├── SWA_THUMB_01_L/R -> SWA_THUMB_02_L/R
              │           │                 ├── SWA_INDEX_01_L/R -> SWA_INDEX_02_L/R
              │           │                 └── SWA_FINGERS_01_L/R -> SWA_FINGERS_02_L/R
              └── SWA_UPPER_LEG_L / R
                    └── SWA_LOWER_LEG_L / R (Knee joint, Leg IK constraint)
                          └── SWA_FOOT_L / R (Ankle, Foot Copy-Rotation constraint)
```

### Arm & Leg IK/FK System
- **Arm IK**: `SWA_ARM_IK_L/R` target with `SWA_ARM_POLE_L/R` elbow vector (chain length 2 on Forearm). Switchable between IK and FK via `IK_FK` slider on `SWA_HAND_L/R`.
- **Leg IK**: `SWA_LEG_IK_L/R` target with `SWA_LEG_POLE_L/R` knee vector (chain length 2 on Lower Leg).
- **Foot Orientation**: `SWA_FOOT_L/R` maintains ground alignment via Copy Rotation from `SWA_LEG_IK_L/R`.

## Corrective Deformation & Shape Keys

- **Corrective Volume Keys**:
  - `corrective_arm_up_L/R`: Preserves shoulder deltoid volume during 90° and overhead arm reaches.
  - `corrective_elbow_bend_L/R`: Maintains elbow fullness and prevents harsh pinched creasing when flexed.
  - `corrective_knee_bend_L/R`: Preserves knee fullness and curve in squats, running, and sitting poses.
  - `squash` & `stretch`: Soft-body physical bounce deformation for jumps, landings, walks, and breathing.
- **Hand Articulation Keys**:
  - `hand_fist_L/R`, `hand_point_L/R`, `hand_thumbs_up_L/R`, `hand_open_L/R`.
- **Facial Morphs (33 keys)**:
  - Blinks (`blink_L`, `blink_R`, `blink_both`, `squint`, `wide`)
  - Mouth & Phonemes (`smile`, `smile_big`, `open`, `surprised_mouth`, `sad_mouth`, `angry_mouth`, `confused_mouth`, `laugh_mouth`, `phoneme_A/E/O/M`)
  - Blush Controls (`blush`, `blush_strong`, `blush_off`)
  - Directional Gaze (`gaze_left`, `gaze_right`, `gaze_up`, `gaze_down` driven by `SWA_EYE_TARGET`)
  - Emotions (`happy`, `sad`, `surprised`, `angry`, `thinking`, `laugh`, `confused`, `sleepy`, `crying`, `excited`, `proud`, `worried`)

## Production Animation Actions (33 Exported Clips)

All 33 actions are keyed directly on `SWA_Rig` and baked into `models/swa_master.glb`:
1. `Idle_Breathing` — Subtle mascot breathing with spine compression and chest rise.
2. `Idle_Look_Around` — Curious head turn and gaze shifting left and right.
3. `Walk` — Natural 2-bone leg stride with knee bend, arm counter-swing, and pelvic bounce.
4. `Run` — Dynamic forward run cycle with leg compression and arm pump.
5. `Jump` — Anticipation crouch, explosive upward spring, apex hang, and landing prep.
6. `Land` — Contact squash, deep knee cushion compression, and recovery to standing.
7. `Turn_Left` / `Turn_Right` — Foot pivot and torso rotation.
8. `Sit` / `Stand` — Clean transition into 90° seated rest and rising back to standing.
9. `Wave` — Raised arm with forearm tilt and rhythmic waving with open mascot fingers.
10. `Point` — Forward arm reach with extended index finger and curled support fingers.
11. `Thumbs_Up` — Confident upward thumb gesture with head nod.
12. `Thumbs_Down` — Downward thumb gesture with disappointed head tilt.
13. `Clap` — Both hands clapping rhythmically in front of chest.
14. `Heart_Gesture` — Both hands meeting in front of chest to form a heart contour.
15. `Think` — Bent elbow with index finger gently resting on cheek.
16. `Celebrate` — Triumphant V-shape arm raise with wide open hands.
17. `Greet` — Polite mascot greeting wave and slight courteous head bow.
18. `Goodbye` — Sweeping farewell wave.
19. `Dance` — Playful rhythmic body sway and alternating arm bounce.
20. `Sleep` — Peaceful resting posture with closed eyes and gentle breathing.
21. `Surprised_Reaction` — Sharp backward step, arms thrown back, wide stance.
22. `Disappointed_Reaction` — Drooped shoulders, downward head hang, limp arms.
23. `Happy_Reaction` — Joyful energetic double hop with pumped arms.
24. `Emotion_Happy`, `Emotion_Sad`, `Emotion_Surprised`, `Emotion_Angry`, `Emotion_Confused`, `Emotion_Sleepy`, `Emotion_Laugh`, `Emotion_Excited` — Expressive whole-body emotional motifs.

## Engine Compatibility

The model is optimized and tested for Godot 4.x, Unity, WebGL / Three.js, and Unreal Engine:
- Standard Y-up orientation.
- Single skinned character mesh (`SWA_Mesh`) parented to `SWA_Rig`.
- Vertex weights normalized per vertex with max 4 influences.
- No third-party plugins or external physics dependencies required.
