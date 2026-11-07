# Bible Quiz Leaderboard ✝

A live, offline-capable quiz leaderboard for church Bible quizzes. Features a warm, reverent church/spiritual theme with stained-glass effects, golden rays, and floating gold dust particles.

## Tech Stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Framer Motion** for smooth animations
- **localStorage** + **BroadcastChannel** for offline state syncing

No backend required — everything runs in the browser.

## Quick Start

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## How to Use (Two Windows on One Laptop)

1. Open `http://localhost:5173/admin` in one browser window (or phone tab) — this is the **Admin panel**
2. Open `http://localhost:5173/` in another browser window — this is the **Projector view** (display on your projector via screen sharing or drag to the external monitor)
3. Changes made in the Admin window instantly sync to the Projector window via BroadcastChannel

### Demo Mode

Add `?demo=1` to the projector URL to load 17 sample groups with 4 levels:

```
http://localhost:5173/?demo=1
```

## Routes

| Route       | Purpose                          |
| ----------- | -------------------------------- |
| `/`         | Projector view (read-only, 16:9) |
| `/?demo=1`  | Projector with demo data         |
| `/?lite=1`  | Projector in ultra-low CPU mode  |
| `/admin`    | Admin panel (no login required)  |

## Admin Features

- **Quiz Settings**: Edit title, choose what the projector displays (Overall or a specific level)
- **Add Groups**: Paste up to 30 group names, one per line
- **Levels**: Add, rename, delete levels. Each level has an "Eliminate lowest N" button
- **Scores Table**: Enter scores per group per level (numeric keypad on mobile), live totals
- **Out Checkbox**: Manually eliminate or restore any group
- **Bulk Actions**: Bring back all eliminated, Reset all scores (with confirmation)
- **Autosave**: ~350ms debounced, with a "Saved ✓" indicator

## Projector Features

- **16:9 optimised**: Designed for 1920×1080, readable from 5 metres
- **Landscape layout**: Podium on the left, ranks 4+ on the right
- **Animated rank changes**: Rows slide smoothly to new positions
- **Eliminated groups**: Dimmed at the bottom with "out after Level X" tag
- **Empty state**: Glowing cross with "Waiting for the quiz to start…"
- **Hidden cursor**: Disappears after 3 seconds of inactivity
- **Responsive**: Switches to portrait/mobile layout on narrow screens
- **Bible verse footer**: Rotating KJV verses every 12 seconds

## Theme

- Deep midnight navy/indigo background
- Ivory text, rich gold accents
- Stained-glass colour touches (ruby, sapphire, emerald, amber)
- Faint cathedral window pattern behind the podium
- Slow golden shimmer rays streaming down
- Subtle floating gold dust particles
- Rank 1: Golden halo above the avatar, candlelight glow
- Arch-shaped podium steps (like church windows)
- White dove flies across when rank 1 changes
- Respects `prefers-reduced-motion` (disables rays, particles, dove)

## Building for Production

```bash
npm run build
npx vite preview
```

Note: For production hosting, configure your web server to serve `index.html` for all routes (SPA fallback).
