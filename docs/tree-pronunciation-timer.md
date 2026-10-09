# Tree pronunciation and numeric timer acceptance

User feedback: after the instruction the 30-second hold starts correctly; however the numeric timer was replaced by long prose, and 吐きます sounded like つきます. The no-overlap/equal-hold behavior must remain unchanged.

Product invariants:
- Display text may use 吐きます; speech must use the explicit はきます reading, never つきます.
- src/lib/voicePronunciation.json is shared by the product fallback and the WAV generation script. Do not generate this clip from displayText.
- The corrected WAV has a new versioned asset key to prevent reuse of cached mispronunciation.
- Numeric 0:30 stays visible during instructions. 案内中 changes to 保持中 at the actual independent hold; 0:30 → 0:29 → ... follows the runtime.
- No PracticeAudioRuntime or hold sequencing changes in this patch.

Validation: regression 4/4 PASS, TypeScript/Vite build PASS. Original published WAV was reproduced byte-for-byte using Microsoft Haruka Desktop, confirming its generation source. New clip uses the same voice with explicit kana. Browser UI at start: 案内中 / 0:30. Android human listening of the replacement is not verified here and must not be reported PASS.
