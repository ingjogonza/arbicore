# CryptoInvestor — Production Environment Setup

Guía para desplegar el stack completo (API + Frontend) en una **Raspberry Pi 5 (8GB)**
usando servicios cloud de producción.

## Prerequisitos

- Raspberry Pi 5 con **Raspberry Pi OS** (64-bit, Debian Bookworm)
- 8GB RAM (ideal) o 4GB
- **MongoDB Atlas** cluster de producción (dedicado, no el free tier de desarrollo)
- **Supabase** proyecto de producción (dedicado, no el usado en CI)
- **Binance API keys** (para probar el dashboard)

---

## Producción: Servidores Cloud

| Servicio | Tipo | Uso |
|----------|------|-----|
| **Supabase** | Proyecto de producción | Auth, usuarios reales |
| **MongoDB Atlas** | Cluster dedicado (M10+) | Datos de producción |

> ⚠️ **Importante**: Usá proyectos SEPARADOS de los que usa CI.
> CI usa un proyecto Supabase gratuito + MongoDB local (service container).
> Producción usa proyectos dedicados con datos reales.

### Configurar Supabase (producción)

1. Crear proyecto en [supabase.com](https://supabase.com) → New project
2. Anotar:
   - **Project URL** → Settings → API → Project URL
   - **anon public key** → Settings → API → anon public
   - **service_role key** → Settings → API → service_role (NUNCA compartir)

### Configurar MongoDB Atlas (producción)

1. Crear cluster en [cloud.mongodb.com](https://cloud.mongodb.com)
2. Database Access → Add user con contraseña segura
3. Network Access → Add IP (0.0.0.0/0 para la Raspberry Pi, o IP fija)
4. Clusters → Connect → Drivers → Node.js → copiar URI
5. Reemplazar `<password>` y `<dbname>` en la URI

---

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

Usá las plantillas de producción (contienen TODAS las vars necesarias):

```bash
# Backend
cp backend/setup/production-env-template.txt backend/.env

# Frontend
cp frontend-env-production-template.txt .env.production
```

Editar `backend/.env` con tus valores de producción:

```env
PORT=3000
ROBOT_PORT=3001
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cryptoinvestor?retryWrites=true&w=majority
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
MASTER_KEY=<generated_key>
NODE_ENV=production
SERVE_FRONTEND=true
LOG_LEVEL=info
CORS_ORIGIN=https://<tu-dominio>.duckdns.org
```

> `MASTER_KEY` generarlo con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Editar `.env.production` (frontend):

```env
VITE_SUPABASE_URL=https://<proyecto-produccion>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_produccion>
VITE_API_BASE_URL=
```

> `VITE_API_BASE_URL` vacío = el frontend usa rutas relativas al backend
> (porque `SERVE_FRONTEND=true`). Si el frontend está separado,
> poner la URL completa: `https://api.<dominio>.duckdns.org`

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

## Arquitectura (Producción)

```
Raspberry Pi 5 (:3000)              Servicios Cloud
├── GET /api/* → Fastify backend    MongoDB Atlas (producción)
├── GET / (static) → dist/ (SPA)      └── cryptoinvestor DB
├── SPA fallback → index.html           ├── apiKeys
└── GET /api/keys/:userId → Robot       ├── legalDocuments
                                         ├── twoFactorSecrets
Raspberry Pi 5 (:3001)                   ├── userProfiles
└── Robot API (mTLS)                     └── cache (dashboard)

                                    Supabase (producción)
                                      └── Auth
                                           ├── users
                                           ├── email verification
                                           └── password reset
```

> La **cache** del dashboard (30s TTL) se guarda en MongoDB Atlas
> en la colección `cache` con índice TTL automático.

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| `ERR_MODULE_NOT_FOUND` | Backend no compilado | `cd backend && npm run build` |
| Frontend blank screen | `VITE_API_BASE_URL` incorrecto | Verificar IP de la Pi |
| API retorna 401 | Supabase keys incorrectas | Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` |
| Dashboard sin datos | API keys de Binance no configuradas | Ir a ConnectScreen y configurarlas |
| Dashboard sin datos (con keys) | Firma HMAC incorrecta | Ya fixeado en `develop` — asegurate de tener el último commit |
| PM2 no arranca en boot | `pm2 startup` no ejecutado | Ejecutar `sudo pm2 startup` y seguir instrucciones |
