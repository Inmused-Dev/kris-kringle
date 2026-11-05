# kris-kringle

Temporary static Kris Kringle draw pages at `https://christmas.inmused.com/<slug>/`, Christmas 2026.
Only the Wesley family draw (`wesley`) is live.

## How a draw works
- `draws/<slug>.json`: who is in it, and who must not draw whom.
- `node scripts/draw.mjs <slug>` runs the draw once, offline. It writes `site/<slug>/draw.json`
  (committed; one AES-GCM ciphertext per person, in shuffled order) and `links/<slug>.txt`
  (gitignored; each person's private link, with the key in the URL fragment).
- The page tries the link's key against every slip. Only that person's slip opens. No server state, no login.
- Re-running with `--force` is a **new draw** and invalidates every link already sent. The script never prints pairings.

## Deploy
The image is `ghcr.io/inmused-dev/kris-kringle:<sha>`, built by `.github/workflows/build.yml` on every
push to `main`. **armature-infra is authoritative for deployment** (ADR-0034). The stack is
`machines/vps-inmused/kris-kringle/` there; its `version` file names the sha that runs. Deploy with
`sudo scripts/deploy.sh kris-kringle` on vps-inmused.

## Working rules
Branch per session, PR into `main`, never commit straight to `main`. See
armature-infra `docs/branch-strategy.md`.
