# URDF Color Palette

A browsable, searchable catalog of 900+ named [URDF](http://wiki.ros.org/urdf) material colors. Click any swatch to preview the color on an interactive 3D robot joint, then copy the `<material>` XML snippet straight into your URDF file.

Built with Next.js 15, React 19, Three.js, and Tailwind CSS — deploys to Vercel with zero config.

---

## What this tool does

When you're authoring URDF (the XML format ROS uses to describe robots), you often want to assign nice-looking named materials to links — but the named XKCD-style palette has hundreds of entries and it's hard to know what `darkmintgreen` actually looks like, especially when applied to 3D geometry under lighting.

This app solves that:

- **Browse** all named colors grouped by hue family (reds, oranges, browns, yellows, greens, cyans, blues, purples, pinks, neutrals).
- **Search** by name with live filtering.
- **Preview** any color on a rotating 3D robot revolute joint with realistic lighting, so you can see how it'll actually look on a robot.
- **Copy** the URDF `<material>` snippet with one click and paste it into your robot description file.

## How to use it

1. **Browse or search.** Scroll the grouped grid, or type in the search bar to filter by name.
2. **Click a swatch.** A modal opens with a rotating 3D joint rendered in that color. Drag the canvas to orbit the camera; the joint auto-rotates so you can watch the highlights move.
3. **Copy the snippet.** Click the **Copy** button in the code block. The modal shows the exact XML you need:
   ```xml
   <material name="darkmintgreen">
     <color rgba="0.125 0.752 0.450 1.0"/>
   </material>
   ```
4. **Paste into your URDF** and reference the material by name on any `<visual>` element:
   ```xml
   <visual>
     <geometry>
       <box size="0.2 0.2 0.2"/>
     </geometry>
     <material name="darkmintgreen"/>
   </visual>
   ```
5. **Close** the modal with the X, click outside it, or press <kbd>Esc</kbd>.

## Adding or editing colors

All colors live in a single file: [`data/colors.xml`](data/colors.xml). It uses the standard URDF `<material>` format. To add a color, append an entry:

```xml
<material name="mycolor">
  <color rgba="0.1 0.2 0.3 1.0"/>
</material>
```

The RGBA values are normalized (0.0–1.0), matching URDF convention. The dev server hot-reloads on save; production deployments pick up the change on rebuild. No registry to update, no code to touch.

Grouping into hue families is automatic — the app converts each color to HSL on the server and classifies it. Very low saturation goes to **Neutrals**; orange-hue + low lightness goes to **Browns**; everything else is bucketed by hue angle.

## Running locally

You'll need Node.js 18.18+ (Node 20 LTS recommended).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with Turbopack hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Deploying to Vercel

The easiest path: push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js, installs deps, builds, and deploys — no configuration needed.

From the CLI:

```bash
npm i -g vercel
vercel
```

Because `data/colors.xml` is read on the server at request time, it's included in the build automatically; you don't need any special config for static assets.

## Project structure

```
.
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Server component — reads colors, renders palette
│   └── globals.css         # Tailwind + keyframes
├── components/
│   ├── ColorPalette.tsx    # Client: search, grid, modal
│   └── ColorPreview3D.tsx  # Client: Three.js robot joint (dynamic-imported)
├── lib/
│   ├── colors.ts           # Server: fs read + XML parse + hue classification
│   └── color-types.ts      # Shared types + group constants (client-safe)
└── data/
    └── colors.xml          # The color database — edit this to add colors
```

The 3D viewer is loaded with `next/dynamic({ ssr: false })`, so the ~700 KB Three.js bundle only downloads when a user opens a modal — the landing-page grid stays fast.

## Tech stack

- **[Next.js 15](https://nextjs.org)** — App Router, server components, Turbopack
- **React 19**
- **TypeScript**
- **[Tailwind CSS](https://tailwindcss.com)**
- **[Three.js](https://threejs.org)** via **[@react-three/fiber](https://r3f.docs.pmnd.rs)** and **[@react-three/drei](https://github.com/pmndrs/drei)** — 3D preview
- **[Heroicons](https://heroicons.com)** — UI icons

## License

The named-color list is sourced from the [XKCD color survey](https://www.w3schools.com/colors/colors_xkcd.asp) (CC0).
