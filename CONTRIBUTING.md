# Contributing to MOTO

Thanks for your interest in contributing. This guide covers how to get set up, run the app, and submit changes.

## Development setup

### Prerequisites

- **dfx** – [Install the ICP SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
- **Node.js 18+** and npm (or yarn)
- **Git**

### 1. Clone and install

```bash
git clone https://github.com/kidhack/moto.git
cd moto
cd frontend
npm install
cd ..
```

### 2. Local ICP network and canisters

From the **project root** (directory containing `dfx.json`):

```bash
# Terminal 1: start the local replica
dfx start

# Terminal 2: deploy canisters and generate TypeScript bindings
dfx deploy
dfx generate
```

### 3. Frontend environment

Create `frontend/.env` with the local backend canister ID:

```bash
cd frontend
echo "VITE_CANISTER_ID_MOTO=$(cd .. && dfx canister id moto)" > .env
echo "VITE_DFX_NETWORK=local" >> .env
```

Or set `VITE_CANISTER_ID_MOTO` manually (from `dfx canister id moto`).

### 4. Run the app

The frontend is pinned to **port 5173** so the Internet Identity session stays consistent.

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. For more detail, see [README.md](README.md) and [QUICK_START.md](QUICK_START.md).

---

## Git workflow

### Branching

- **`main`** – stable, deployable branch.
- Work in a **branch** for features or fixes, then open a pull request (PR) into `main`.

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name   # or fix/short-description
```

### Commits

- Prefer **small, logical commits** (one concern per commit).
- Write a **clear message**: first line summary (≤72 chars), then body if needed.

```text
Fix transactions not loading when ckBTC address is pending

Fetch from index canister when identity is present instead of
requiring userBitcoinAddress, so the list populates immediately.
```

### Submitting changes

1. Push your branch: `git push -u origin feature/your-feature-name`
2. Open a **pull request** on GitHub from your branch into `main`.
3. Describe what changed and why; link any related issue.
4. After review (or self-review for solo work), merge the PR.

---

## Code and quality

- **Lint:** From `frontend/`, run `npm run lint` before committing.
- **TypeScript:** Keep types accurate; the project uses strict-ish TypeScript.
- **Style:** Follow existing patterns in the repo (React hooks, file layout, naming). Use the project’s formatting (e.g. existing quote/indent style).

---

## Project layout

- **`backend/`** – Motoko canister (`moto`).
- **`frontend/`** – React + TypeScript + Vite app; deploys as `moto_frontend`.
- **`frontend/src/`** – Components, hooks, pages, declarations.
- **Docs** – [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DEPLOY.md](DEPLOY.md), [SETUP.md](SETUP.md), [QUICK_START.md](QUICK_START.md).

---

## Questions and issues

- **Bugs or feature ideas:** Open an [issue](https://github.com/kidhack/moto/issues) on GitHub.
- **Security:** Do not open public issues for security-sensitive topics; contact the maintainers privately.

Thanks for contributing.
