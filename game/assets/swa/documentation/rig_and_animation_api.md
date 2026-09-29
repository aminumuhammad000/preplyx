# Swa character API

`SwaCharacter` is the shared character presentation layer. It owns animation playback, facial expressions, blinking, and smooth head/eye target tracking. Input and opponent decisions stay outside it.

`PlayerSwaController` and `ComputerSwaController` extend the same class. This allows a future network controller to share the exact Swa model, rig, animation, and expression controls without changing exam scenes.

## Common methods

```gdscript
swa.idle()
swa.walk()
swa.run()
swa.wave()
swa.point()
swa.think()
swa.look_at_target(portal_or_target)
swa.clear_look_target()
swa.react_correct()
swa.react_wrong()
swa.attack()
swa.take_hit()
swa.celebrate()
swa.set_expression("curious")
swa.trigger_blink()
```

`play_action(StringName)` can play any exported action by its animation name. One-shot actions blend back to Idle when they finish; Idle, Idle_Variation, Walk, Run, Sleep, and Rest loop.


Each of the three feather digits on either wing has its own rig bone (`wing_digit_01.L` through `wing_digit_03.R`). `set_wing_digit_pose(side, digit, degrees)` exposes individual pose control for future pointing, waving, and hand gestures.
