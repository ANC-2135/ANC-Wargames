# ANC Wargames

A browser-based hex-grid wargame prototype. This guide gets it running on your own computer, even if you've never used Node.js or a terminal before.

---

## One-time setup

You only need to do this part once per computer.

### 1. Install Node.js

Node.js is the engine that runs the development tools. We need it to start the game in your browser.

1. Go to **<https://nodejs.org/>**.
2. Click the big green button on the **left** that says **LTS** (Long-Term Support).
3. Run the installer you just downloaded. Accept all the default options.
4. **Close every terminal / command prompt window you have open.** New terminals will see Node.js; old ones won't.

### 2. Open a terminal in this project folder

You need to open a terminal whose "current folder" is the folder this README lives in.

- **Windows:** open **File Explorer**, navigate into this folder, right-click an empty area, and choose **"Open in Terminal"** (Windows 11) or **"Open PowerShell window here"** (Windows 10).
- **macOS:** open **Finder**, right-click this folder, and choose **"New Terminal at Folder"**. (If you don't see that option: open **System Settings → Keyboard → Keyboard Shortcuts → Services**, and enable **"New Terminal at Folder"**.)
- **Linux:** open your terminal, then `cd` into this folder, e.g. `cd ~/Projects/ANC-Wargames`.

### 3. Install the project's libraries

In that terminal, run:

```sh
npm install
```

This downloads everything the project needs into a folder called `node_modules`. It takes about a minute the first time and is much faster after that. You don't need to do this again unless somebody updates `package.json`.

---

## Every time you want to run the game

1. In a terminal in this folder, run:

   ```sh
   npm run dev
   ```

2. After a moment, the terminal will print something like:

   ```
   ➜  Local:   http://localhost:5173/
   ```

   Click that link, or copy it into your browser. The game should appear.

3. Any time you save a change to a file in `src/`, the browser will reload automatically — you don't need to restart anything.

4. To stop the server, click in the terminal window and press **Ctrl + C** (on macOS too — not Cmd).

---

## Common problems

**"`npm` is not recognized" / "command not found: npm"**
Node.js didn't install correctly, or the terminal you're using was open before you installed it. Close every terminal window, open a brand-new one, and try `npm install` again. If it still fails, re-download and re-install Node.js from <https://nodejs.org/>.

**"Port 5173 is already in use"**
Another program (or another copy of the dev server) is already using that port. Either close the other one, or pick a different port:

```sh
npm run dev -- --port 5174
```

Then open `http://localhost:5174/` instead.

**The browser opens but shows a blank page**
Open the browser's developer tools (press **F12**, or right-click the page and choose **Inspect**), click the **Console** tab, and copy any red text you see there. Send that to whoever set up the project.

**A change I made doesn't show up**
Hard-refresh the browser: **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (macOS).

---

## Optional: build a shareable copy

If you want a copy of the game that can be hosted anywhere (e.g. uploaded to a static web host), run:

```sh
npm run build
```

That puts a fully self-contained version in a new `dist/` folder. To preview it locally, run:

```sh
npm run preview
```

…and open the link the terminal prints.

---

## Project layout

You don't need this section to run the game — it's here for whoever edits the code.

```
ANC-Wargames/
├── index.html              entry HTML (loads src/main.tsx)
├── package.json            project config — lists dependencies and scripts
├── tsconfig.*.json         TypeScript settings
├── vite.config.ts          dev-server / build settings
├── public/assets/          images and other static files (served at /assets/...)
└── src/
    ├── main.tsx            mounts the React app
    ├── App.tsx             top-level <App /> component
    ├── styles.css          page styles
    ├── lib/
    │   ├── hex-math.ts     pointy-top hex grid math
    │   └── terrain.ts      seeded terrain generation
    └── components/
        ├── HexCanvas.tsx   pan/zoom canvas renderer
        ├── Hud.tsx         team legend, minimap, status bar
        └── TweaksPanel.tsx floating live-tweak panel
```

### Available commands

| Command             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload at <http://localhost:5173/>.           |
| `npm run build`     | Type-check and build a production bundle into `dist/`.                      |
| `npm run preview`   | Serve the contents of `dist/` to verify the production build locally.       |
| `npm run typecheck` | Run TypeScript without producing files — useful as a quick correctness check. |
