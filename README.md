# CryptoInvestor

Plataforma de trading algorítmico automatizado para Binance. Frontend en React + Vite, backend en Fastify + MongoDB, autenticación con Supabase Auth.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts |
| Auth | Supabase Auth (PostgreSQL) |
| Backend | Fastify 4, TypeScript, Node.js |
| Base de datos | MongoDB Atlas (operacional) |
| Encriptación | AES-256-GCM con master key |
| Robot | Python 3 (placeholder para trading) |

## Estructura del Proyecto

```
cryptoinvestor/
├── src/                          # Frontend React
│   ├── contexts/AuthContext.tsx   # Estado de auth (login, register, 2FA, forgot password)
│   ├── screens/                 # Pantallas (Login, Register, Dashboard, Settings, etc.)
│   ├── components/                # Componentes reutilizables (Button, Alert, Card, etc.)
│   ├── hooks/                     # Custom hooks (useTrading, useTheme)
│   └── types/                     # Tipos compartidos
├── backend/                      # Backend Fastify
│   ├── src/
│   │   ├── config/              # Env validation, database, supabase client
│   │   ├── services/            # Business logic (encryption, keys, 2FA, profiles)
│   │   ├── routes/              # HTTP routes (keys, legal docs, auth, health)
│   │   ├── plugins/             # CORS, auth, rate limit, mTLS, logger
│   │   └── index.ts             # Dual server bootstrap (public + robot)
│   ├── scripts/generate-certs.sh # OpenSSL cert generator for mTLS
│   └── .env.example             # Backend env vars
├── robot/                        # Python trading robot
│   ├── main.py                   # Consumes decrypted keys via mTLS
│   └── requirements.txt
├── .env                          # Frontend env vars (Supabase, API base)
├── .env.example                  # Template
└── dev-servers.js               # Dev runner: backend + frontend in parallel
```

## Requisitos Previos

- Node.js ≥ 18
- MongoDB Atlas (o local)
- Supabase project (gratis en supabase.com)
- Python 3.11+ (solo para el robot)

## Setup paso a paso

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd cryptoinvestor
npm install
cd backend && npm install && cd ..
```

### 2. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **Authentication → Providers → Email** → asegurar que **Confirm email** está **ON**
3. Ir a **SQL Editor** → ejecutar:

```sql
-- Crear tabla profiles con trigger
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
```

4. Copiar **Project URL**, **anon key**, y **service role key** desde **Project Settings → API**

### 3. Configurar variables de entorno

**Frontend** — copiar `.env.example` a `.env` y completar:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_API_BASE_URL=http://localhost:3000
```

**Backend** — copiar `backend/.env.example` a `backend/.env` y completar:

```bash
cp backend/.env.example backend/.env
```

```
PORT=3000
ROBOT_PORT=3001
MONGODB_URI=mongodb+srv://usuario:pass@cluster.mongodb.net/
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
MASTER_KEY=tu-master-key-base64
CORS_ORIGIN=http://localhost:5173
```

Generar `MASTER_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Generar certificados mTLS (opcional, para producción)

```bash
cd backend && ./scripts/generate-certs.sh
```

Esto crea `backend/certs/ca.crt`, `server.crt`, `server.key`, `robot.crt`, `robot.key`.

### 5. Levantar en desarrollo

```bash
# Opción A: usar el dev runner
node dev-servers.js

# Opción B: manual (dos terminales)
# Terminal 1:
cd backend && npx ts-node src/index.ts
# Terminal 2:
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Robot API: http://localhost:3001 (mTLS si certs configurados)

### 6. Compilar para producción

```bash
# Frontend
npm run build

# Backend
cd backend && npm run build && npm start
```

## Funcionalidades

### Autenticación
- ✅ Registro con email + 4 documentos legales obligatorios
- ✅ Verificación de email vía Supabase
- ✅ Login con email/password
- ✅ Recuperar contraseña (forgot password)
- ✅ 2FA TOTP con QR code (Google Authenticator, Authy)
- ✅ JWT en React state (sin localStorage)
- ✅ Perfil de usuario cacheado en MongoDB

### Seguridad
- ✅ AES-256-GCM para claves API en reposo
- ✅ mTLS entre backend y robot Python
- ✅ Rate limiting por usuario/IP
- ✅ Structured logging con redacción de campos sensibles
- ✅ CORS configurado para frontend

### API Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/keys` | JWT | Guardar claves API encriptadas |
| GET | `/api/keys/status` | JWT | Verificar si tiene claves |
| DELETE | `/api/keys` | JWT | Eliminar claves |
| POST | `/api/legal-docs/accept` | JWT | Aceptar documento legal |
| GET | `/api/legal-docs/status` | JWT | Estado de documentos |
| GET | `/api/legal-docs/required` | No | Lista de docs requeridos |
| POST | `/api/auth/2fa/setup` | JWT | Iniciar setup 2FA |
| POST | `/api/auth/2fa/verify` | JWT | Verificar y activar 2FA |
| POST | `/api/auth/2fa/disable` | JWT | Desactivar 2FA |
| GET | `/api/auth/2fa/status` | JWT | Estado 2FA |
| GET | `/api/keys/:userId` | mTLS | Claves desencriptadas para robot |

### Robot Python

```bash
cd robot
pip install -r requirements.txt

# Configurar env vars
export ROBOT_BACKEND_URL=https://localhost:3001
export ROBOT_USER_ID=tu-user-id
export ROBOT_CERT=../backend/certs/robot.crt
export ROBOT_KEY=../backend/certs/robot.key
export ROBOT_CA=../backend/certs/ca.crt

python main.py
```

## Documentos Legales

La plataforma requiere aceptación de 4 documentos antes de operar:

1. **Términos de Servicio**
2. **Divulgación de Riesgos**
3. **Autorización de API**
4. **Política de No Custodia**

Todos se trackean en MongoDB con timestamp e IP del usuario.

## Desarrollo

### Convenciones
- UI en **español**
- Tipos TypeScript estrictos (`strict: true`)
- Alert component: solo acepta `children`, `variant?`, `icon?` — **no acepta className**
- Commits en inglés, UI copy en español

### Scripts útiles

```bash
# Test E2E backend
npx ts-node backend/src/test-e2e.ts

# Test full auth flow
npx ts-node backend/src/test-full-e2e.ts

# Verificar compilación
npx tsc --noEmit                 # frontend
cd backend && npx tsc --noEmit   # backend
```

## Licencia

Propietario — CryptoInvestor. Todos los derechos reservados.
