# Frontend GHCR deployment runbook

Version: 1.0  
Last updated: 2026-10-11  
Target host: `217.217.249.227`  
Repository directory: `/var/www/pos_inventory`

## Deployment model

GitHub Actions validates pull requests targeting `main`. A push to `main` publishes the frontend image to:

- `ghcr.io/aaa006bd/pos-inventory-frontend:latest`
- `ghcr.io/aaa006bd/pos-inventory-frontend:<full-git-commit-sha>`

The repository currently uses `main` and feature branches; it has no remote `staging` branch. A staging branch merged into `main` produces a push on `main` and therefore publishes an image. The Compose deployment should use the immutable full-SHA tag, not `latest`, after choosing a release.

The container listens on port `3000`. Compose initially publishes it only on `127.0.0.1:5001`, leaving the existing root-owned PM2 process `inv_mgm` on port `5000` untouched. Nginx continues proxying to port `5000` until the explicit cutover step.

## API routing and environment timing

Browser code uses the relative base URL `/backend-api`. This avoids browser CORS and keeps the backend address out of client-side requests.

Next.js implements `/backend-api/:path*` as a rewrite whose destination is read from `BACKEND_API_URL` when `next build` runs. The rewrite destination is stored in the built application, so these settings are **build-time settings**:

- `BACKEND_API_URL`
- `NEXT_PUBLIC_API_BASE_URL` and all other `NEXT_PUBLIC_*` variables

Changing either value in `.env.prod` or under Compose `environment` does not change an already-built image. A different value requires publishing a new image.

The release workflow builds with:

```text
BACKEND_API_URL=http://host.docker.internal:3001
```

The backend publishes host port `3001`. Compose adds this Linux host-gateway mapping:

```text
host.docker.internal:host-gateway
```

Consequently the frontend container reaches the host-published backend without assuming that independently deployed Compose projects share a Docker network. Do not replace this with `localhost:3001`: inside the frontend container, `localhost` refers to that frontend container.

`HOSTNAME`, `PORT`, the Compose host bind address, host port, and selected image are **runtime/deployment settings**. They do not alter the client bundle or rewrite destination.

## Preconditions

On the server, record the working state before doing anything:

```bash
cd /var/www/pos_inventory
pm2 status inv_mgm
curl -fsS http://127.0.0.1:5000/login >/dev/null
nginx -t
docker --version
docker compose version
```

Confirm the backend is listening on a host-accessible address, not only host loopback:

```bash
ss -ltnp | grep ':3001'
curl -fsS http://127.0.0.1:3001/api-json >/dev/null
```

For a Docker-published backend, `ss` commonly shows `0.0.0.0:3001` and/or `[::]:3001`. If it is bound only to `127.0.0.1:3001`, the Docker host gateway cannot reach it; fix the backend port publication before starting the frontend container.

Ensure the chosen commit's GitHub Actions run succeeded and its GHCR package exists. If the package is private, authenticate using a GitHub token with `read:packages`. Enter the token only at Docker's password prompt; never save it in this repository or `.env.prod`:

```bash
docker login ghcr.io -u aaa006bd
```

## Prepare an immutable release

Update the checked-out deployment files without stopping PM2:

```bash
cd /var/www/pos_inventory
git fetch origin
git switch main
git pull --ff-only origin main
cp -n .env.prod.example .env.prod
```

Edit `.env.prod` and replace `<full-commit-sha>` with the exact published commit. The file must contain no registry password or application secret:

```dotenv
FRONTEND_IMAGE=ghcr.io/aaa006bd/pos-inventory-frontend:<full-commit-sha>
FRONTEND_BIND_ADDRESS=127.0.0.1
FRONTEND_HOST_PORT=5001
```

`.env.prod` is ignored by Git. Confirm it is not tracked:

```bash
git status --short
git check-ignore .env.prod
```

## Pull and start alongside PM2

```bash
docker compose --env-file .env.prod -f docker-compose.deploy.yml pull inventory-app
docker compose --env-file .env.prod -f docker-compose.deploy.yml up -d
docker compose --env-file .env.prod -f docker-compose.deploy.yml ps
docker compose --env-file .env.prod -f docker-compose.deploy.yml logs --tail=100 inventory-app
```

Do not stop or restart `inv_mgm`. Confirm both deployments respond independently:

```bash
curl -fsS http://127.0.0.1:5000/login >/dev/null
curl -fsS http://127.0.0.1:5001/login >/dev/null
```

Confirm the container can reach the backend through the host gateway:

```bash
docker compose --env-file .env.prod -f docker-compose.deploy.yml exec inventory-app \
  wget -qO- http://host.docker.internal:3001/api-json >/dev/null
```

Confirm the frontend rewrite reaches that backend:

```bash
curl -fsS http://127.0.0.1:5001/backend-api/api-json >/dev/null
```

To verify the destination baked into the selected image:

```bash
docker run --rm --entrypoint node "$FRONTEND_IMAGE" -e \
  "const r=require('./.next/routes-manifest.json'); console.log(JSON.stringify(r.rewrites,null,2))"
```

The output must contain `http://host.docker.internal:3001` for `/backend-api/:path*`.

## Test before Nginx cutover

Because port `5001` binds to host loopback, use an SSH tunnel from an operator workstation:

```bash
ssh -L 5001:127.0.0.1:5001 root@217.217.249.227
```

Open `http://127.0.0.1:5001` locally and verify:

1. Login and logout.
2. Authenticated API reads through `/backend-api`.
3. A safe test workflow appropriate to the release.
4. Static assets, navigation, and a direct page refresh.
5. Browser console and network panel contain no asset, proxy, CORS, or mixed-content errors.

Keep PM2 and the public Nginx route unchanged throughout this phase.

## Nginx cutover to Docker

First locate the active server block rather than assuming a filename:

```bash
nginx -T 2>&1 | less
```

Find the block containing:

```nginx
server_name 217.217.249.227;
proxy_pass http://localhost:5000;
```

Back up that exact configuration file. Change only the upstream port to:

```nginx
proxy_pass http://localhost:5001;
```

Validate before reloading:

```bash
nginx -t
systemctl reload nginx
```

Then verify the public endpoint:

```bash
curl -fsS http://217.217.249.227/login >/dev/null
docker compose --env-file .env.prod -f docker-compose.deploy.yml ps
docker compose --env-file .env.prod -f docker-compose.deploy.yml logs --tail=100 inventory-app
pm2 status inv_mgm
```

Complete the same browser checks at `http://217.217.249.227`. Keep PM2 running during the observation period so rollback is immediate.

## Immediate rollback to PM2

If verification fails, restore Nginx to the still-running PM2 service:

```nginx
proxy_pass http://localhost:5000;
```

Then:

```bash
nginx -t
systemctl reload nginx
curl -fsS http://217.217.249.227/login >/dev/null
pm2 status inv_mgm
```

The Docker container may remain on loopback for investigation. To stop only the Docker deployment later:

```bash
docker compose --env-file .env.prod -f docker-compose.deploy.yml down
```

This command does not affect PM2.

## Roll forward or roll back between images

Set `FRONTEND_IMAGE` in `.env.prod` to another published full-SHA tag, then run:

```bash
docker compose --env-file .env.prod -f docker-compose.deploy.yml pull inventory-app
docker compose --env-file .env.prod -f docker-compose.deploy.yml up -d
docker compose --env-file .env.prod -f docker-compose.deploy.yml ps
```

Re-run the local health, backend reachability, proxy, and browser checks after every image change.
