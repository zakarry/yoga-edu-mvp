# Shared camera mirror verification — 2026-09-25

Base: GitHub main `1f2f49a2507a27d75aa7c3f2df807d501eb192c9`.
Scope: common Yoga AI camera mirror, including normal entry and `entry=event-demo`.
No auth, conversation engine, database/RLS, directory data, publishing or merge changes.

## Findings and changes

Both entries render the same `MyAITeacherPage` and previously used its camera effects. There was no event-demo-only camera API restriction. The public event-demo button displayed a video area but the observed video had no `srcObject`, zero dimensions and `readyState=0` in the available in-app browser. The old implementation discarded access and playback errors; it therefore cannot establish which error occurred on the reporter's Android Chrome device. Public response headers did not contain a camera-denying Permissions-Policy.

The shared controller now invokes getUserMedia directly from the click handler, checks secure context/API availability, prefers `{facingMode:{ideal:'user'}}`, and retries with `video:true` only for device selection/constraint failures. Audio is always false. Permission/security failures are not retried. Error name/message are retained locally and shown in an expandable diagnostic with a cause-specific Japanese explanation.

The current video is attached through a callback ref, including when permission resolves after guide/practice views swap. The stream is assigned to srcObject and play() is handled explicitly; autoplay, playsInline and muted remain enabled. Existing CSS provides display-only mirroring. No recording, video transmission or image analysis was added.

Old tracks are stopped before facing switches, on close, when the camera UI is no longer available, pagehide and component unmount. Late streams returned after cancellation are immediately stopped. Active practice now also has a close button. A blocked play() has an explicit playback retry.

The fallback uses LIFF openWindow with external:true when already in the LINE client; otherwise it provides a normal HTTPS link with openExternalBrowser=1 and a menu instruction. It carries only the entry destination, never arbitrary query parameters/auth codes/hash. No LIFF initialization or auth changes are made. This fallback remains unverified on an actual LINE device.

## Executed checks

| Check | Result / evidence |
| --- | --- |
| Main lockfile dependencies | Installed with npm ci --ignore-scripts; lockfile unchanged |
| Build | npm run build PASS (existing dynamic/static import and bundle-size warnings) |
| Controller tests | node scripts/test-camera-mirror.mjs: 16 PASS; simulated devices, not hardware |
| DEMO regression | node scripts/test-directory-demo.mjs PASS: 40 fixtures, normal/demo, saved recommendations, formal/unknown preservation |
| Normal UI | Local app, normal home → AI teacher → Asana → first guide → camera button; shared camera request reached |
| Event UI | Local app, event-demo → experience → guide → camera button; shared camera request reached |
| Actual camera request in available browser | Secure context=true, API=true, getUserMedia=1, permission=prompt; promise remained pending, no stream, no playback. Permission dialog was not accessible in this browser surface. Not a hardware success. |
| Actual browser denial | A LOCAL-ONLY reverse proxy added Permissions-Policy: camera=(). Both normal and event-demo returned real NotAllowedError / `Permission denied`, permission=denied, API call count=1. Japanese explanation and browser fallback visible. This tests policy denial, not a physical Android user's denial click. The proxy/header is NOT part of this PR. |
| Mobile error UI | 390px viewport; document clientWidth=375 and scrollWidth=375 (scrollbar), no horizontal overflow |
| Exit while pending | Returning from guide to list removed video and camera status UI; controller cancellation/late-stream cleanup covered by tests |
| Release/playback/switch success | Covered using simulated stream/video objects; NOT confirmed with a physical camera |
| Galaxy / Android Chrome | NOT VERIFIED; no connected Android device |
| LINE official-account / LIFF | NOT VERIFIED; do not attribute Android Chrome failure to LINE restrictions |
| Public fixed version | NOT VERIFIED: no merge or publish performed |

The exact original Android error and real-camera recovery remain open. Do not call the six-item device acceptance suite fully PASS based on these tests.

## Device acceptance remaining

Follow-up: the user supplied a localhost screenshot showing a real camera image, confirming local image display on their tested environment (not proof of Android/public release acceptance). The screenshot also exposed the camera toolbar extending beyond the video's right edge. The video container now shares the video's 480px maximum width, and the toolbar can wrap. Browser DOM measurements after the CSS fix: desktop video 480px / toolbar 460px; 390px viewport video 252px / toolbar 232px; both have 10px left/right insets. No camera lifecycle logic changed in this follow-up.

Use a reviewed branch preview or, only after separately authorized release, yogai.net. On Android Chrome test normal and event-demo independently: allow permission, confirm moving front-camera image, switch/back, close/reopen, exit the screen and verify camera indicator stops. Repeat with permission denied and confirm the explanation. If it fails, expand camera connection/error details and record permission, API call count, error.name and error.message (no IDs/tokens needed).

Then repeat from the LINE official-account entry; if direct access is restricted, verify the external-browser action and the manual menu alternative. Confirm no assumption that LINE cannot use a camera on all devices.

References: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [LIFF openWindow](https://developers.line.biz/en/reference/liff/#open-window), [LINE external-browser URL parameter](https://developers.line.biz/ja/docs/line-login/using-line-url-scheme/).
