# Video skills from iart.ai

These five skills, and the helper scripts in `explainer-video/scripts/`, are
copied from [iart-ai/explainer-video-skills](https://github.com/iart-ai/explainer-video-skills)
at commit `3c13a1b` (18 Nov 2026). Only their empty README files were left out,
and one line of `explainer-video/scripts/probe-mp4.sh` was fixed: ffprobe 6
prints a trailing comma after each value (`1080,`), which made the check
fail on a correct file, so it now keeps only the first field.

| Skill | For |
|---|---|
| `explainer-video` | A 30–90 s short: script, storyboard, scenes, captions, render (Remotion) |
| `wrapped-video` | "Wrapped"-style 9:16 recaps from a data table |
| `diagram-animation` | Diagrams and charts that reveal step by step |
| `whiteboard-animation` | Draw-on, hand-sketched explainers |
| `isometric-animation` | Isometric, 2.5D scenes |

The skills refer to `scripts/contact-sheet.sh`, `scripts/probe-mp4.sh` and
`scripts/seek-shot.sh`: they're in `explainer-video/scripts/`. GymGO's own
short videos, made with these skills, are in `marketing/shorts/`.

In this project, a video about GymGO still follows GymGO's rules: real
screens from the app only, no made-up gym photos, prices, reviews or
partnerships, and nothing presented as live that isn't.

## Licence

MIT License

Copyright (c) 2026 iart.ai

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
