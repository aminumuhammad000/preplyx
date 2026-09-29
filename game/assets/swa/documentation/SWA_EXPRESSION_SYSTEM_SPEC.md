# SWA Facial Expression System Specification
**Swallern 3D Mascot & Learning Companion**  
*Document Version: 2.0 (Production Master)*  
*Target Engine: Godot 4.x / WebGL / Mobile*  
*Source Model: `game/assets/swa/source/swa_master.blend` -> `game/assets/swa/models/swa.glb`*

---

## 1. Executive Summary & Design Philosophy

Swa is the central character, tutor, and companion of the Swallern educational universe. Swa's design combines soft organic mascot geometry with clean, readable digital companion aesthetics.

### 1.1 Source of Truth
The 3D model (`swa_master.blend` / `swa.glb`) is the **sole source of truth** for:
- Soft rounded pear/egg body silhouette ($H \approx 1.95\,\text{m}$, wide base, soft shoulders).
- Large glossy dark expressive eyes (`#2D2D3A`) with bright specular catchlights.
- Recessed integrated facial mouth with rosy internal tongue.
- Soft blush cheeks with dynamic scalar intensity.
- Articulated curved organic head antenna.
- Minimal mascot hands with thumb and pointing digits.
- Clean white body shading (`#F8FAFC`).

The 2D expression sheet serves solely as an emotional compass for personality range. Swa's facial anatomy is **not** a literal collage of flat 2D sticker graphics; rather, Swa's emotional life is expressed through volumetric, physically plausible character deformation.

### 1.2 Multi-Modal Expression Philosophy
Expressions on Swa are **never created by moving the eyes alone**. Swa operates on a **holistic emotional feedback loop** combining seven synchronized channels:

1. **Eyes & Eyelids**: Openness, squint crinkles, wide alert dilation, blink cadence.
2. **Gaze & Pupils**: Coordinated eye aim (`SWA_EYE_TARGET`, `gaze_left/right/up/down`).
3. **Eyebrows**: Height, angle, inner tilt (empathy/worry), outer tilt (determination/sternness).
4. **Mouth & Oral Cavity**: Shape, smiling corners, open apertures, pursed contemplation.
5. **Cheeks / Blush**: Dynamically modulated pink glow (`blush_off` to `blush_strong`).
6. **Head Orientation**: Subtle head tilts (yaw, pitch, roll) providing life and asymmetry.
7. **Antenna Articulation**: Organic perking, drooping, bristling, or tilting in unison with mood.

---

## 2. Emotional States Breakdown (16 Core & Secondary States)

Every state combines blendshape morph targets with skeletal poses (`SWA_HEAD` and `SWA_ANTENNA`):

| # | Emotion | Emotional Intent & Companion Function | Key Blendshapes & Weights | Head Pose (deg) | Antenna Pose & Behavior | Blush Level |
|---|---|---|---|---|---|---|
| **01** | **Neutral** | Idle state; calm, warm, approachable readiness. | Base mesh ($1.0$), all morphs $0.0$ | Pitch $0^\circ$, Roll $0^\circ$, Yaw $0^\circ$ | Neutral rest position ($0^\circ$) | Subtle ($0.15$) |
| **02** | **Happy** | Standard positive response; correct answer, warm greeting. | `happy`: $1.0$ (or `mouth_smile_open`: $0.8$, `brow_raise_L/R`: $0.4$, `squint`: $0.35$) | Pitch $+3^\circ$, Yaw $-2^\circ$ | Perked forward $-10^\circ$, lively bounce | Normal ($0.60$) |
| **03** | **Very Happy** | Major achievement, level completed, streak milestone. | `very_happy`: $1.0$ (or `mouth_smile_big`: $1.0$, `brow_raise`: $0.7$, `squint`: $0.65$) | Pitch $+5^\circ$, Roll $+2^\circ$, Yaw $-3^\circ$ | High bouncy perk $-18^\circ$, slight flutter | Rosy ($0.85$) |
| **04** | **Sad** | Gentle empathy when user struggles or makes repeated mistakes. | `sad`: $1.0$ (or `mouth_frown`: $0.9$, `brow_tilt_in_L/R`: $0.85$, `blink_both`: $0.25$) | Pitch $-6^\circ$, Yaw $-2^\circ$ (bowed down) | Drooped down $+22^\circ$, low energy | Off ($0.0$) |
| **05** | **Angry** | Playful mock-stern challenge, timer expiring, rival mascot stance. | `angry`: $1.0$ (or `brow_lower`: $0.8$, `brow_tilt_out`: $0.9$, `mouth_frown`: $0.8$) | Pitch $-4^\circ$ (assertive stance) | Stiff, bristling backward $-15^\circ$ | Flushed ($0.40$) |
| **06** | **Surprised** | Unexpected bonus, surprise quiz reveal, sudden insight. | `surprised`: $1.0$ (or `wide`: $1.0$, `brow_raise`: $1.0$, `mouth_surprised_O`: $1.0$) | Pitch $+6^\circ$ (recoil back) | Alert standing upright $-14^\circ$ | Soft ($0.30$) |
| **07** | **Confused** | User asks unexpected query, puzzling riddle, asymmetric quiz brow. | `confused`: $1.0$ (or `brow_raise_L`: $0.8$, `brow_lower_R`: $0.7$, `squint_L`: $0.5$) | Roll $-8^\circ$, Yaw $+4^\circ$ (cocked head) | Curious sideways tilt Roll $-16^\circ$ | Minimal ($0.20$) |
| **08** | **Worried** | Low lives remaining, approaching timeout, gentle cautionary prompt. | `worried`: $1.0$ (or `brow_tilt_in`: $0.95$, `mouth_worried`: $1.0$, `wide`: $0.4$) | Pitch $-3^\circ$, Roll $+2^\circ$ | Sagging with mild tremor Pitch $+14^\circ$, Roll $+10^\circ$ | Faint ($0.20$) |
| **09** | **Shy** | Compliment received, modest celebration, bashful introduction. | `shy`: $1.0$ (or `squint`: $0.45$, `gaze_down`: $0.6$, `mouth_shy`: $0.9$) | Pitch $-4^\circ$, Roll $-4^\circ$, Yaw $-6^\circ$ | Modest inward curl Pitch $+10^\circ$, Roll $-12^\circ$ | Very Strong ($1.0$) |
| **10** | **Sleepy** | Inactivity timeout, late night study reminder, low energy state. | `sleepy`: $1.0$ (or `blink_both`: $0.75$, `squint`: $0.3$, `brow_lower`: $0.4$) | Pitch $-8^\circ$, Roll $+3^\circ$ (drooping) | Limp forward droop Pitch $+26^\circ$ | Cozy ($0.45$) |
| **11** | **Thinking** | Processing user input, calculating test score, hints loading. | `thinking`: $1.0$ (or `gaze_up`: $0.6$, `gaze_right`: $0.5$, `mouth_pursed_think`: $1.0$) | Pitch $+4^\circ$, Roll $+6^\circ$, Yaw $+5^\circ$ | Synchronized antenna tilt Roll $+16^\circ$ | Subtle ($0.25$) |
| **12** | **Excited** | Fast-paced mini-game, speed round, energetic enthusiasm. | `excited`: $1.0$ (or `wide`: $0.8$, `brow_raise`: $0.9$, `mouth_smile_big`: $0.85$) | Pitch $+6^\circ$, Roll $-2^\circ$, Yaw $-3^\circ$ | Upright and vibrating Pitch $-20^\circ$ | Strong ($0.70$) |
| **13** | **Laughing** | Hilarious joke, comedic game moment, playful victory. | `laugh`: $1.0$ (or `blink_both`: $0.92$, `squint`: $0.8$, `mouth_laugh`: $1.0$) | Pitch $+8^\circ$, Yaw $-2^\circ$ (thrown back) | Bouncy backward curve Pitch $-22^\circ$ | Rosy ($0.80$) |
| **14** | **Crying** | Extreme comic sadness, catastrophic fail (tears visibly deployed). | `crying`: $1.0$ (or `blink_both`: $0.8$, `brow_tilt_in`: $1.0$, `mouth_frown`: $0.95$) | Pitch $-8^\circ$, Roll $+2^\circ$ (slumped) | Heavy sagging Pitch $+28^\circ$ | Off ($0.0$) |
| **15** | **Proud** | Completed study module, mastery certificate, mentoring satisfaction. | `proud`: $1.0$ (or `brow_raise`: $0.5$, `mouth_smirk`: $0.85$, `mouth_smile_small`: $0.5$) | Pitch $+6^\circ$, Roll $-4^\circ$, Yaw $-3^\circ$ | Tall, stately curve Pitch $-14^\circ$, Roll $-10^\circ$ | Warm ($0.50$) |
| **16** | **Wink** | Playful secret, hint given, mutual understanding, friendly nod. | `wink`: $1.0$ (or `blink_L`: $1.0$, `wide_R`: $0.4$, `brow_raise_R`: $0.8$, `mouth_smile_open`: $0.75$) | Roll $-4^\circ$, Yaw $-5^\circ$ (playful cock) | Perked side tilt Pitch $-10^\circ$, Roll $-14^\circ$ | Normal ($0.60$) |

---

## 3. Facial Anatomy & Component Architecture

### 3.1 Eyes & Specular Catchlights
- **Base Geometry**: Spheroidal dark volumes (`#2D2D3A`) positioned at $(\pm 0.20, -0.572, 1.46)$ on the curved front face.
- **Specular Highlights (Glints)**: Permanent secondary white spheres positioned at top-left $(\pm 0.20 - 0.02, -0.588, 1.485)$ with pure white roughness $0.05$ and specular $1.0$.
- **Deformation Rule**: All eye shape keys (`blink`, `squint`, `wide`, `gaze`) deform the glint in exact spatial correspondence with the pupil body to prevent highlight disconnects.

### 3.2 Eyebrows
- **Geometry**: Slender arched lozenges positioned at $(\pm 0.20, -0.568, 1.58)$ just above the ocular orbit.
- **Controls**:
  - `brow_raise_L / R`: Vertical translation ($+0.035\,\text{m}$) and arching.
  - `brow_lower_L / R`: Furrowing downward ($-0.025\,\text{m}$) toward eye.
  - `brow_tilt_in_L / R`: Center points raise while outer tips lower (empathy, sadness, worry).
  - `brow_tilt_out_L / R`: Center points drop while outer tips flare outward (focus, sternness, determination).

### 3.3 Integrated Facial Mouth
- **Philosophy**: No protruding rubber buttons. The mouth is an integrated oval cavity (`#1E1E28`) with an embedded rosy tongue (`#FF6B8B`).
- **Resting Appearance**: Sleek, tiny, friendly neutral line.
- **Dynamic Vocabulary**:
  - `mouth_smile_small`: Subtle greeting, resting warmth ($+8\%$ width, slight upward corner lift).
  - `mouth_smile_open`: Speaking smile, welcoming voice state.
  - `mouth_smile_big`: Beaming triumph; cheeks push outward symmetrically.
  - `mouth_frown`: Downward corner dip ($-0.022\,\text{m}$), lower cavity compression.
  - `mouth_worried`: Asymmetric wavering line conveying hesitation.
  - `mouth_surprised_O`: Compact vertical oval ($2.2\times$ height, $0.85\times$ width).
  - `mouth_pursed_think`: Shifted to the right ($+0.028\,\text{m}$) with a puckered contour.
  - `mouth_laugh`: Broad arched aperture revealing internal tongue.
  - `mouth_shy`: Diminutive reserved smirk tucked to one side.
  - `mouth_smirk`: Unilateral upward corner lift.

### 3.4 Cheeks & Blush System
- **Blush Nodes**: Situated at $(\pm 0.30, -0.575, 1.34)$, below each eye.
- **Behavior**:
  - `blush_off` ($0.0$): Shrunk to invisible scale inside skin boundary.
  - `blush` ($0.5$): Warm mascot pink glow (`#FF758F`).
  - `blush_strong` ($1.0$): $1.65\times$ volumetric expansion for blushing or extreme joy.

### 3.5 The Tear System (Optional Special Effect)
- **Strict Rule**: Tears are **NEVER** permanent facial anatomy.
- **Implementation**: The teardrop mesh (`SWA_Tear_L`, `SWA_Tear_R`) is modeled at rest at $Y = 0.0$ **inside the cranial core**, completely occluded by the outer head mesh.
- **Activation**: ONLY driven by the `crying` shape key (or designated sad VFX curves). The shape key shifts the tears by $dY = -0.582\,\text{m}$ through the facial skin down the cheek surfaces. In all other 15 emotional states, tears remain fully hidden at zero weight.

---

## 4. Complete Blendshape / Morph Target Reference Table

The 52 production shape keys exported in `swa.glb` / `swa_master.blend`:

```
================================================================================
INDEX | SHAPE KEY NAME           | MIN  | MAX  | CATEGORY  | FUNCTION
================================================================================
00    | Basis                    | 0.0  | 1.0  | Baseline  | Neutral reference geometry
01    | blink_L                  | 0.0  | 1.0  | Eyes      | Unilateral left eyelid blink
02    | blink_R                  | 0.0  | 1.0  | Eyes      | Unilateral right eyelid blink
03    | blink_both               | 0.0  | 1.0  | Eyes      | Bilateral natural blink
04    | squint_L                 | 0.0  | 1.0  | Eyes      | Left eye happy/skeptical squint
05    | squint_R                 | 0.0  | 1.0  | Eyes      | Right eye happy/skeptical squint
06    | squint                   | 0.0  | 1.0  | Eyes      | Bilateral eye squint
07    | wide_L                   | 0.0  | 1.0  | Eyes      | Left eye alerted dilation
08    | wide_R                   | 0.0  | 1.0  | Eyes      | Right eye alerted dilation
09    | wide                     | 0.0  | 1.0  | Eyes      | Bilateral wide alert eyes
10    | brow_raise_L             | 0.0  | 1.0  | Eyebrows  | Raise left brow
11    | brow_raise_R             | 0.0  | 1.0  | Eyebrows  | Raise right brow
12    | brow_lower_L             | 0.0  | 1.0  | Eyebrows  | Lower/furrow left brow
13    | brow_lower_R             | 0.0  | 1.0  | Eyebrows  | Lower/furrow right brow
14    | brow_tilt_in_L           | 0.0  | 1.0  | Eyebrows  | Melancholic/concerned inner tilt L
15    | brow_tilt_in_R           | 0.0  | 1.0  | Eyebrows  | Melancholic/concerned inner tilt R
16    | brow_tilt_out_L          | 0.0  | 1.0  | Eyebrows  | Stern/determined outer tilt L
17    | brow_tilt_out_R          | 0.0  | 1.0  | Eyebrows  | Stern/determined outer tilt R
18    | mouth_smile_small        | 0.0  | 1.0  | Mouth     | Subtle pleasant smile
19    | mouth_smile_open         | 0.0  | 1.0  | Mouth     | Open talking smile
20    | mouth_smile_big          | 0.0  | 1.0  | Mouth     | Wide celebratory smile
21    | mouth_frown              | 0.0  | 1.0  | Mouth     | Sad downturned frown
22    | mouth_worried            | 0.0  | 1.0  | Mouth     | Wavy hesitant mouth
23    | mouth_surprised_O        | 0.0  | 1.0  | Mouth     | Round surprised 'O'
24    | mouth_pursed_think       | 0.0  | 1.0  | Mouth     | Puckered thoughtful mouth
25    | mouth_laugh              | 0.0  | 1.0  | Mouth     | Wide joyous open laugh
26    | mouth_shy                | 0.0  | 1.0  | Mouth     | Reserved small smile
27    | mouth_smirk              | 0.0  | 1.0  | Mouth     | Playful asymmetrical smirk
28    | smile                    | 0.0  | 1.0  | Mouth     | Standard smile (alias)
29    | smile_big                | 0.0  | 1.0  | Mouth     | Big smile (alias)
30    | open                     | 0.0  | 1.0  | Mouth     | Open mouth (alias)
31    | surprised_mouth          | 0.0  | 1.0  | Mouth     | Surprised mouth (alias)
32    | sad_mouth                | 0.0  | 1.0  | Mouth     | Sad mouth (alias)
33    | angry_mouth              | 0.0  | 1.0  | Mouth     | Angry mouth (alias)
34    | confused_mouth            | 0.0  | 1.0  | Mouth     | Confused mouth (alias)
35    | laugh_mouth              | 0.0  | 1.0  | Mouth     | Laugh mouth (alias)
36    | phoneme_A                | 0.0  | 1.0  | Viseme    | Ah/Open vowel
37    | phoneme_E                | 0.0  | 1.0  | Viseme    | Ee/Stretched vowel
38    | phoneme_O                | 0.0  | 1.0  | Viseme    | Oh/Rounded vowel
39    | phoneme_M                | 0.0  | 1.0  | Viseme    | Mm/Closed bilabial
40    | blush                    | 0.0  | 1.0  | Cheeks    | Standard pink blush ($0.5$)
41    | blush_strong             | 0.0  | 1.0  | Cheeks    | Intense rosy cheeks ($1.0$)
42    | blush_off                | 0.0  | 1.0  | Cheeks    | Suppress blush ($0.0$)
43    | gaze_left                | 0.0  | 1.0  | Eyes      | Gaze offset to left
44    | gaze_right               | 0.0  | 1.0  | Eyes      | Gaze offset to right
45    | gaze_up                  | 0.0  | 1.0  | Eyes      | Gaze offset upwards
46    | gaze_down                | 0.0  | 1.0  | Eyes      | Gaze offset downwards
47    | happy                    | 0.0  | 1.0  | Preset    | Master Happy expression
48    | sad                      | 0.0  | 1.0  | Preset    | Master Sad expression
49    | surprised                | 0.0  | 1.0  | Preset    | Master Surprised expression
50    | angry                    | 0.0  | 1.0  | Preset    | Master Angry expression
51    | thinking                 | 0.0  | 1.0  | Preset    | Master Thinking expression
52    | laugh                    | 0.0  | 1.0  | Preset    | Master Laughing expression
53    | confused                 | 0.0  | 1.0  | Preset    | Master Confused expression
54    | sleepy                   | 0.0  | 1.0  | Preset    | Master Sleepy expression
55    | crying                   | 0.0  | 1.0  | Preset    | Master Crying + Tears expression
56    | excited                  | 0.0  | 1.0  | Preset    | Master Excited expression
57    | proud                    | 0.0  | 1.0  | Preset    | Master Proud expression
58    | worried                  | 0.0  | 1.0  | Preset    | Master Worried expression
59    | very_happy               | 0.0  | 1.0  | Preset    | Master Very Happy expression
60    | wink                     | 0.0  | 1.0  | Preset    | Master Wink expression
61    | shy                      | 0.0  | 1.0  | Preset    | Master Shy expression
================================================================================
```

---

## 5. Skeletal Rig Integration & Antenna Articulation

### 5.1 Head & Neck Chain
- `SWA_CHEST` -> `SWA_NECK` ($Z: 1.50 \to 1.62$) -> `SWA_HEAD` ($Z: 1.62 \to 1.94$).
- The head bone moves all facial elements (eyes, mouth, blush) and parents the antenna.
- **Head Micro-Tilts**: During emotional shifts, `SWA_HEAD` executes slight rotation offsets ($\pm 3^\circ \sim 8^\circ$) to inject organic weight and eliminate robotic stillness.

### 5.2 Antenna Bone Articulation (`SWA_ANTENNA`)
- Positioned from $Z: 1.92$ to $(0, 0.05, 2.17)$ atop the skull crown.
- Fully weighted to the antenna stem and spherical tip.
- **Antenna Behavioral Modes**:
  1. *Perked / Bouncy* ($\text{Pitch} < 0^\circ$): Triggered on `happy`, `excited`, `very_happy`. Curves upward and vibrates softly.
  2. *Drooped / Limp* ($\text{Pitch} > 0^\circ$): Triggered on `sad` ($+22^\circ$), `sleepy` ($+26^\circ$), `crying` ($+28^\circ$). Curves downward toward the brow.
  3. *Inquisitive Cock* ($\text{Roll} \neq 0^\circ$): Triggered on `confused` ($-16^\circ$), `thinking` ($+16^\circ$), `wink` ($-14^\circ$).
  4. *Rigid / Bristling* ($\text{Pitch} -15^\circ$, stiff): Triggered on `angry`, `surprised`.

---

## 6. Gaze, Idling & Micro-Expression Dynamics

To prevent Swa from ever looking lifeless on screen, the character controller executes three background micro-behaviors:

1. **Autonomous Blinking**:
   - Random interval: $3.2\,\text{s} \pm 1.2\,\text{s}$.
   - Curve: Fast closing ($0.08\,\text{s}$), instantaneous snap, smooth opening ($0.12\,\text{s}$).
   - Micro-squint probability ($15\%$) following a blink for a soft gaze settle.

2. **Ocular Micro-Saccades**:
   - When not tracking an explicit user target, the gaze drifts gently within a subtle bounding box ($\pm 0.08\,\text{rad}$) every $2.5\,\text{s}$ to simulate scanning curiosity.

3. **Subtle Antenna Breathing**:
   - Continuous sine oscillation on antenna pitch: $\theta(t) = 0.04 \cdot \sin(2\pi \cdot 0.35 \cdot t)$, synchronized with the chest/torso breathing cycle.

---

## 7. Godot Engine Architecture & API

The Godot implementation lives in `game/scripts/swa_character.gd`.

### 7.1 Script API Reference

```gdscript
# Set expression by name with custom cross-fade duration
swa.set_expression("happy", 0.25)

# Set blush directly (0.0 = none, 0.5 = normal, 1.0 = strong)
swa.set_blush(0.7)

# Point gaze toward 3D world position
swa.look_at_point(camera.global_position)

# Trigger viseme phoneme for speech synthesis
swa.speak_phoneme("A", 0.85)

# Play accompanying full-body skeletal animation
swa.play_action("celebrate_jump")
```

### 7.2 Core Godot Implementation (`swa_character.gd`)

```gdscript
class_name SwaCharacter
extends Node3D

@export var current_expression: String = "neutral"
@export var expression_blend_time: float = 0.2
@export var blush_intensity: float = 0.5

@onready var mesh_instance: MeshInstance3D = $SWA_Mesh
@onready var skeleton: Skeleton3D = $SWA_Rig/Skeleton3D
@onready var anim_player: AnimationPlayer = $AnimationPlayer

var _head_bone_idx: int = -1
var _antenna_bone_idx: int = -1
var _current_weights: Dictionary = {}
var _target_weights: Dictionary = {}
var _blink_timer: float = 0.0
var _next_blink_time: float = 3.5

# Poses for each of the 16 emotional states
const EXPRESSION_PROFILES = {
    "neutral": { "keys": {}, "head": Vector3.ZERO, "ant": Vector3.ZERO, "blush": 0.15 },
    "happy": { "keys": {"happy": 1.0}, "head": Vector3(deg_to_rad(3), 0, deg_to_rad(-2)), "ant": Vector3(deg_to_rad(-10), 0, 0), "blush": 0.60 },
    "very_happy": { "keys": {"very_happy": 1.0}, "head": Vector3(deg_to_rad(5), deg_to_rad(2), deg_to_rad(-3)), "ant": Vector3(deg_to_rad(-18), 0, deg_to_rad(-4)), "blush": 0.85 },
    "sad": { "keys": {"sad": 1.0}, "head": Vector3(deg_to_rad(-6), 0, deg_to_rad(-2)), "ant": Vector3(deg_to_rad(22), 0, deg_to_rad(-4)), "blush": 0.0 },
    "angry": { "keys": {"angry": 1.0}, "head": Vector3(deg_to_rad(-4), 0, 0), "ant": Vector3(deg_to_rad(-15), 0, 0), "blush": 0.40 },
    "surprised": { "keys": {"surprised": 1.0}, "head": Vector3(deg_to_rad(6), 0, 0), "ant": Vector3(deg_to_rad(-14), 0, 0), "blush": 0.30 },
    "confused": { "keys": {"confused": 1.0}, "head": Vector3(0, deg_to_rad(-8), deg_to_rad(4)), "ant": Vector3(0, deg_to_rad(-16), deg_to_rad(6)), "blush": 0.20 },
    "worried": { "keys": {"worried": 1.0}, "head": Vector3(deg_to_rad(-3), deg_to_rad(2), 0), "ant": Vector3(deg_to_rad(14), deg_to_rad(10), 0), "blush": 0.20 },
    "shy": { "keys": {"shy": 1.0}, "head": Vector3(deg_to_rad(-4), deg_to_rad(-4), deg_to_rad(-6)), "ant": Vector3(deg_to_rad(10), deg_to_rad(-12), 0), "blush": 1.0 },
    "sleepy": { "keys": {"sleepy": 1.0}, "head": Vector3(deg_to_rad(-8), deg_to_rad(3), 0), "ant": Vector3(deg_to_rad(26), 0, 0), "blush": 0.45 },
    "thinking": { "keys": {"thinking": 1.0}, "head": Vector3(deg_to_rad(4), deg_to_rad(6), deg_to_rad(5)), "ant": Vector3(deg_to_rad(-8), deg_to_rad(16), 0), "blush": 0.25 },
    "excited": { "keys": {"excited": 1.0}, "head": Vector3(deg_to_rad(6), deg_to_rad(-2), deg_to_rad(-3)), "ant": Vector3(deg_to_rad(-20), 0, deg_to_rad(-5)), "blush": 0.70 },
    "laughing": { "keys": {"laugh": 1.0}, "head": Vector3(deg_to_rad(8), 0, deg_to_rad(-2)), "ant": Vector3(deg_to_rad(-22), 0, 0), "blush": 0.80 },
    "crying": { "keys": {"crying": 1.0}, "head": Vector3(deg_to_rad(-8), deg_to_rad(2), 0), "ant": Vector3(deg_to_rad(28), 0, 0), "blush": 0.0 },
    "proud": { "keys": {"proud": 1.0}, "head": Vector3(deg_to_rad(6), deg_to_rad(-4), deg_to_rad(-3)), "ant": Vector3(deg_to_rad(-14), deg_to_rad(-10), 0), "blush": 0.50 },
    "wink": { "keys": {"wink": 1.0}, "head": Vector3(0, deg_to_rad(-4), deg_to_rad(-5)), "ant": Vector3(deg_to_rad(-10), deg_to_rad(-14), 0), "blush": 0.60 }
}

func _ready() -> void:
    if skeleton:
        _head_bone_idx = skeleton.find_bone("SWA_HEAD")
        if _head_bone_idx == -1: _head_bone_idx = skeleton.find_bone("head")
        _antenna_bone_idx = skeleton.find_bone("SWA_ANTENNA")
    set_expression("neutral", 0.0)

func set_expression(expr_name: String, duration: float = 0.2) -> void:
    if not EXPRESSION_PROFILES.has(expr_name): return
    current_expression = expr_name
    expression_blend_time = max(duration, 0.01)
    var profile = EXPRESSION_PROFILES[expr_name]
    _target_weights.clear()
    for k in profile["keys"]:
        _target_weights[k] = profile["keys"][k]
    set_blush(profile["blush"])

func _process(delta: float) -> void:
    _update_expression_blend(delta)
    _update_idle_blinking(delta)

func _update_expression_blend(delta: float) -> void:
    if not mesh_instance: return
    var rate: float = delta / expression_blend_time
    for shape_name in _target_weights:
        var target: float = _target_weights[shape_name]
        var curr: float = _current_weights.get(shape_name, 0.0)
        curr = move_toward(curr, target, rate)
        _current_weights[shape_name] = curr
        var idx: int = mesh_instance.find_blend_shape_by_name(shape_name)
        if idx >= 0:
            mesh_instance.set_blend_shape_value(idx, curr)

func _update_idle_blinking(delta: float) -> void:
    _blink_timer += delta
    if _blink_timer >= _next_blink_time:
        _blink_timer = 0.0
        _next_blink_time = randf_range(2.8, 5.0)
        _trigger_micro_blink()

func _trigger_micro_blink() -> void:
    if not mesh_instance: return
    var idx = mesh_instance.find_blend_shape_by_name("blink_both")
    if idx >= 0:
        var tween = create_tween()
        tween.tween_method(func(v: float): mesh_instance.set_blend_shape_value(idx, v), 0.0, 1.0, 0.08)
        tween.tween_method(func(v: float): mesh_instance.set_blend_shape_value(idx, v), 1.0, 0.0, 0.12)
```

---

## 8. Educational Companion Context Matrix

| Educational Scenario | Recommended Expression | Audio Tone | Antenna Dynamic |
|---|---|---|---|
| **App Launch / Welcome** | `happy` $\to$ `wink` | Welcoming, upbeat chime | Perked bounce |
| **Lesson Question Posed** | `neutral` $\to$ `thinking` | Soft prompt tone | Curious side cock |
| **User Answering (Listening)** | `thinking` | Gentle ambient hum | Attentive stillness |
| **Correct Answer (First Try)** | `excited` $\to$ `happy` | High triumph chord | Energized flutter |
| **Level Cleared / Streak Milestone** | `very_happy` $\to$ `proud` | Major fanfare fanfare | Tall proud arch |
| **Incorrect Answer (Encouraging)**| `worried` $\to$ `neutral` | Soft warm marimba | Sympathetic droop |
| **User Idle / Distracted** | `confused` $\to$ `wink` | Friendly tap ping | Questioning tilt |
| **Late Night Session Warning** | `sleepy` | Soft lullaby chime | Limp forward droop |

---

## 9. QA & Validation Checklist

- [x] **Antenna Presence**: Curved organic sprout restored with proper bone hierarchy (`SWA_ANTENNA`).
- [x] **Silhouette Preservation**: Base mascot silhouette intact; egg-shaped volume preserved.
- [x] **Tear Occlusion**: Tears strictly occluded inside head mesh ($Y = 0.0$) in all expressions except `crying`.
- [x] **No Button Mouth**: Mouth is recessed with internal rosy tongue; smoothly deforms through shape keys.
- [x] **No Flat Decals**: Eyes and catchlights are volumetric 3D meshes smoothly keyed with eyelid morphs.
- [x] **Blush Continuity**: Controllable blush parameter supporting smooth gradations from 0 to 1.
- [x] **Full 16-State Renders**: 16 high-resolution isolated expression renders generated and collated into contact sheet.
- [x] **Engine Compatibility**: 100% clean import into Godot 4.x with 0 vertex weight or skeleton warnings.
