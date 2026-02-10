# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Valentine's Day interactive web experience — a single-page app where the user rotates a touch-based crank to scroll through an infinite carousel of memory cards while background music plays. No frameworks, no build tools, no dependencies.

## Running

Open `index.html` directly in a browser. No build step, package manager, or server required.

## Architecture

Everything lives in a single `index.html` file (~290 lines) containing inline CSS and JavaScript. The key systems:

- **Loading screen** — waits for the audio file to reach `canplaythrough`, then fades out
- **Infinite card carousel** — lazily creates `.memory` card elements as the user scrolls; cards within 240px of viewport center become `.visible` with scale/opacity transitions
- **Crank input** — touch-only rotatable dial at the bottom; calculates angle delta from `atan2` to drive `scrollX`, which translates the `#world` container
- **Audio** — loops `Nadin Amizah - Semua Aku Dirayakan (Official Lyric Video).mp3`; plays while crank is being dragged, pauses on touch end

Key constants: `IMAGE_STEP = 152` (card width + margin), `BUFFER = 10` (cards pre-created on each side of viewport center).

## Design Notes

- Touch-only interaction (no mouse/pointer events) — designed for mobile
- Cards get random Y-offset (-20 to 20px) and rotation (-6 to 6deg) for a scattered photo feel
- Color palette: `#fff6f8` background, `#ffd6e0` pink accents, `#6b2c3e` dark rose text
