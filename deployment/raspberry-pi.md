# Raspberry Pi 5 — Test Environment Setup

Guía para desplegar el stack completo (API + Frontend) en una **Raspberry Pi 5 (8GB)** con ARM64.

## Prerequisitos

- Raspberry Pi 5 con **Raspberry Pi OS** (64-bit, Debian Bookworm)
- 8GB RAM (ideal) o 4GB
- **MongoDB Atlas** cuenta gratuita (o URI de MongoDB)
- **Supabase** proyecto ya funcionando
- **Binance API keys** (para probar el dashboard)

## 1. Instalar Node.js 22

```bash
# Usar NodeSource (ARM64)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

# Verificar
node --version   # v22.x
npm --version
```

## 2. Clonar el repositorio

```bash
cd ~
git clone https://github.com/ingjogonza/arbicore.git
cd arbicore
```

## 3. Configurar variables de entorno

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Editar `backend/.env`:

```env
PORT=3000
ROBOT_PORT=3001
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cryptoinvestor
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
MASTER_KEY=<generated_key>
NODE_ENV=production
SERVE_FRONTEND=true
LOG_LEVEL=info
```

> `MASTER_KEY` generarlo con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Editar `.env` (frontend):

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_BASE_URL=http://<PI_IP>:3000
```

> Reemplazar `<PI_IP>` con la IP local de la Raspberry Pi.

## 4. Instalar dependencias y construir

```bash
# Backend
cd ~/arbicore/backend
npm install
npm run build    # Compila TypeScript a dist/

# Frontend
cd ~/arbicore
npm install
npm run build    # Genera dist/ con los archivos estáticos
```

## 5. Probar manualmente

```bash
cd ~/arbicore/backend
SERVE_FRONTEND=true node dist/index.js
```

Abrir en el navegador: `http://<PI_IP>:3000`

- El frontend se sirve desde `dist/`
- Las rutas `/api/*` van al backend
- Las rutas no-API devuelven `index.html` (SPA)

## 6. Instalar PM2 (production process manager)

```bash
sudo npm install -g pm2
cd ~/arbicore
pm2 start ecosystem.config.cjs
pm2 save
sudo pm2 startup   # Sigue las instrucciones que te dé
```

Comandos útiles:

```bash
pm2 status                      # Estado de procesos
pm2 logs arbicore-api           # Ver logs
pm2 restart arbicore-api        # Reiniciar
pm2 stop arbicore-api           # Detener
pm2 monit                       # Monitor interactivo
```

## 7. Configurar firewall (opcional)

```bash
sudo apt-get install -y ufw
sudo ufw allow 22/tcp           # SSH
sudo ufw allow 3000/tcp         # API + Frontend
sudo ufw enable
```

## 8. Actualizar después de cambios

```bash
cd ~/arbicore
git pull origin develop

# Backend
cd backend && npm install && npm run build

# Frontend
cd ~/arbicore && npm install && npm run build

# Reiniciar
pm2 restart arbicore-api
```

## Arquitectura

```
Raspberry Pi 5 (:3000)
  ├── GET /api/*          → Fastify backend
  ├── GET / (static)      → dist/ (React SPA)
  ├── SPA fallback        → index.html (para rutas React)
  └── GET /api/keys/:userId → Robot endpoint (:3001)

MongoDB Atlas (cloud)
  └── apiKeys, legalDocuments, twoFactorSecrets, userProfiles

Supabase (cloud)
  └── Auth, profiles table
```

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| `ERR_MODULE_NOT_FOUND` | Backend no compilado | `cd backend && npm run build` |
| Frontend blank screen | `VITE_API_BASE_URL` incorrecto | Verificar IP de la Pi |
| API retorna 401 | Supabase keys incorrectas | Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` |
| Dashboard sin datos | API keys de Binance no configuradas | Ir a ConnectScreen y configurarlas |
| Dashboard sin datos (con keys) | Firma HMAC incorrecta | Ya fixeado en `develop` — asegurate de tener el último commit |
| PM2 no arranca en boot | `pm2 startup` no ejecutado | Ejecutar `sudo pm2 startup` y seguir instrucciones |
