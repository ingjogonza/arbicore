# Raspberry Pi 5 — CryptoInvestor en producción

## Escenario

- **Server**: Raspberry Pi 5, IP local `192.168.100.43`
- **ISP**: Entel (Santiago, Chile) — bloquea puertos no estándar
- **Exposición pública**: Cloudflare Tunnel (no hay puertos abiertos en el router salvo 443/UDP para WireGuard)
- **Orquestación**: Docker Compose master en `~/docker/docker-compose.yml`

## Stack

| Servicio | URL | Container |
|---|---|---|
| Frontend React | https://app.glsolutions.tech | `cryptoinvestor-frontend` (nginx:alpine) |
| Backend API | https://api.glsolutions.tech | `cryptoinvestor-backend` (Fastify 4) |
| Swagger UI | https://api.glsolutions.tech/docs | (mismo backend) |
| Health check | https://api.glsolutions.tech/health | (mismo backend) |
| Robot prod | interno | `cryptoinvestor` (Python) |
| Robot dev | interno | `cryptoinvestor-dev` (Python) |

## Repositorio

```bash
# Ruta en la Pi
/home/jorge/docker/cryptoinvestor-plataforma/

# GitHub
git@github.com:ingjogonza/arbicore.git
```

El repo contiene solo el código fuente. El `docker-compose.yml` del repo tiene **solo el backend**. El master compose que orquesta todo vive en `~/docker/docker-compose.yml` (portainer, n8n, wireguard, cloudflared, n8n, etc.).

## Frontend — app.glsolutions.tech

### Arquitectura

```
[Browser] → Cloudflare Tunnel → nginx:alpine (container)
                                     │
                                     ├── /usr/share/nginx/html ← dist/ (read-only)
                                     └── /etc/nginx/conf.d/default.conf ← deploy/default.conf
```

Cloudflare Tunnel termina TLS en el edge. El container nginx solo escucha HTTP en puerto 80.

### Config

Archivo de referencia: `deploy/default.conf` — incluye:
- Gzip para JS, CSS, JSON, SVG
- Cacheo agresivo (`1 year`, `immutable`) para assets con hash en `/assets/`
- SPA routing (`try_files $uri /index.html`)

### Actualizar frontend

```bash
cd /home/jorge/docker/cryptoinvestor-plataforma
git pull
npm ci
npm run build
# No hace falta reiniciar el container nginx,
# lee los archivos desde dist/ en tiempo real.
```

### Docker service standalone

```bash
# Para probar fuera del master compose:
docker compose -f deploy/docker-compose.frontend.yml up -d
```

Requiere red `cryptoinvestor-network` creada (`docker network create cryptoinvestor-network`).

## Backend — api.glsolutions.tech

### Docker service

El `docker-compose.yml` del repo levanta el backend. Las variables de entorno se pasan desde el `.env` en la raíz del repo:

```env
MONGODB_URI=mongodb+srv://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
MASTER_KEY=...
CORS_ORIGIN=https://app.glsolutions.tech
```

### Login desde Postman / cliente

```bash
curl -X POST https://api.glsolutions.tech/auth/v1/token?grant_type=password \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'
```

El JWT devuelto se usa como `Authorization: Bearer {token}`.

### Swagger

`https://api.glsolutions.tech/docs` — requiere JWT (excepto rutas listadas en `PUBLIC_PATHS`).

## Robot Python

Dos instancias:

- `cryptoinvestor` — producción
- `cryptoinvestor-dev` — desarrollo/testing

Algoritmo: `traderbot_binance_macd_v9.py` (MACD para Binance, colaboración con Carlos Lameda).

Canal de comunicación: puerto `3001` del backend (mTLS). No exponer públicamente.

```bash
# Actualizar solo el .py (sin rebuild de imagen):
git pull
docker compose restart cryptoinvestor-dev
```

## Acceso para desarrollo — WireGuard VPN

- Endpoint: `glsolutions.tech:443` UDP
- Split tunnel: solo `10.13.13.0/24` y `192.168.100.0/24`
- Backend local: `http://192.168.100.43:3000`
- Solicitar `.conf` o QR a Jorge.

## Node.js

Requiere **Node.js 22**. v20 no es compatible con `@supabase/realtime-js`.

## Docker quirks conocidos

- El `docker-compose.yml` del repo usa `npm install` en el Dockerfile en lugar de `npm ci` (por desync del lockfile).
- Versiones pinneadas de `@fastify/swagger` y `@fastify/swagger-ui` para compatibilidad con Fastify 4.
