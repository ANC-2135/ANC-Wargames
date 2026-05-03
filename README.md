# ANC Wargames

A browser-based hex-grid wargame prototype. This guide gets it running on your own computer, even if you've never used Node.js, a terminal, or Docker before.

The project is a **monorepo** — one folder containing two apps (a browser client and a backend server) that talk to a small local database. Everything runs inside Docker so you don't have to install or configure those pieces by hand.

---

## One-time setup

You only need to do this part once per computer.

### 1. Install Node.js

Node.js is the engine that runs the development tools.

1. Go to **<https://nodejs.org/>**.
2. Click the big green button on the **left** that says **LTS**.
3. Run the installer and accept all defaults.
4. **Close every terminal window you have open.** New terminals will see Node.js; old ones won't.

### 2. Install Docker Desktop

Docker is what runs the client and server side-by-side without you having to set them up individually.

- **Windows / macOS:** download **Docker Desktop** from <https://www.docker.com/products/docker-desktop/>, install it, and start it. The first launch can take a minute — wait until the Docker icon in your tray shows a steady whale (not animated).
- **Linux:** install Docker Engine and the Compose plugin. Distro-specific instructions are at <https://docs.docker.com/engine/install/>.

Verify it's working — open a fresh terminal and run:

```sh
docker --version
docker compose version
```

Both should print version numbers.

### 3. Open a terminal in this project folder

You need a terminal whose "current folder" is the folder this README lives in.

- **Windows:** open **File Explorer**, navigate into this folder, right-click an empty area, choose **"Open in Terminal"**.
- **macOS:** in **Finder**, right-click this folder, choose **"New Terminal at Folder"** (enable in System Settings → Keyboard → Keyboard Shortcuts → Services if you don't see it).
- **Linux:** open your terminal, then `cd` into this folder.

### 4. Turn on Yarn

This project uses **Yarn 4** (a package manager). Node.js ships with a tool called Corepack that activates the right version of Yarn automatically. Run this **once**:

```sh
corepack enable
```

Then install all the libraries:

```sh
yarn install
```

This downloads everything into a `node_modules` folder. Takes about a minute the first time. You only need to re-run it if somebody updates `package.json`.

---

## Every time you want to run the game

In a terminal in this folder, run:

```sh
yarn dev
```

The first time you run this it will build two Docker images (~2 minutes). After that, `yarn dev` starts in a few seconds.

When it's ready you'll see two URLs in the terminal — open the **client** one in your browser:

```
client  | ➜  Local:   http://localhost:5173/
```

The game appears. Clicks on the hex grid are saved to a small database file at `./data/anc.db`.

To stop, press **Ctrl + C** in the terminal, then run `yarn stop` to fully shut the containers down.

### Faster reloads (no Docker)

If you're actively editing code and want the fastest possible reload, you can skip Docker entirely:

```sh
yarn dev:native
```

This runs the client and server directly on your machine. The trade-off: the database file lands at `apps/server/data/anc.db` (not `./data/anc.db`), so the two modes don't share state.

---

## Common problems

**`yarn` is not recognized / `command not found: yarn`**
You skipped step 4. Run `corepack enable`, then `yarn install`.

**"Cannot connect to the Docker daemon"**
Docker Desktop isn't running. Start it from your applications list and wait for the whale icon to go steady.

**"Port 5173 is already in use" or "Port 3001 is already in use"**
Another program is using that port (probably an old copy of the dev server). Run `yarn stop` first, then `yarn dev` again. If that doesn't work, find and stop whatever else is using the port.

**The browser opens but shows a blank page**
Open the browser's developer tools (press **F12**), click the **Console** tab, and copy any red text you see. Send it to whoever set up the project.

**A change I made doesn't show up**
Hard-refresh the browser: **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (macOS).

**I want to wipe the database and start fresh**
Stop everything (`yarn stop`), then delete the `data/` folder. Linux/macOS may need `sudo rm -rf data/` because Docker creates files as root.

---

## What's where

You don't need this to run the game — it's here for whoever edits the code.

```
ANC-Wargames/
├── apps/
│   ├── client/             browser app (React + Vite + TypeScript)
│   └── server/             backend (Fastify + SQLite)
├── packages/
│   └── shared/             types shared between client and server
├── data/                   the SQLite database file lives here (gitignored)
├── compose.yaml            tells Docker how to run both apps together
└── package.json            project root with the `yarn dev` script
```

### Available commands

| Command            | What it does                                                                       |
| ------------------ | ---------------------------------------------------------------------------------- |
| `yarn dev`         | Build + start both apps in Docker. Open <http://localhost:5173/>.                  |
| `yarn dev:native`  | Run both apps directly on your machine (no Docker). Faster reload, separate DB.    |
| `yarn stop`        | Shut down the Docker containers.                                                   |
| `yarn typecheck`   | Run TypeScript across every workspace — quick correctness check.                   |
| `yarn build`       | Type-check and produce production builds for every workspace.                      |

To target a single workspace: `yarn workspace @anc/client typecheck`, `yarn workspace @anc/server dev`, etc.
