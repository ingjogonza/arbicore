# Delta Spec: Sistema de Autenticación y Gestión de Claves API

## Purpose

Especificar el comportamiento del sistema después de integrar autenticación completa con Supabase Auth, backend Fastify con MongoDB, encriptación AES-256 de claves API de Binance, y comunicación mTLS con el robot de trading. Este es un dominio nuevo: **Auth & Key Management**.

---

## Requirements

### Requirement: Registro de Usuario con Documentos Legales

El sistema DEBE permitir el registro de nuevos usuarios a través del frontend React integrado con Supabase Auth. El registro DEBE incluir: nombres, apellidos, email y contraseña. Antes de completar el registro, el usuario DEBE aceptar obligatoriamente 4 documentos legales.

#### Scenario: Registro exitoso con aceptación de documentos

- GIVEN un visitante en la pantalla de registro
- WHEN completa nombres, apellidos, email, password y marca las 4 casillas de aceptación de documentos legales
- THEN el sistema crea la cuenta en Supabase Auth
- AND el sistema guarda el registro de aceptación de documentos en MongoDB vinculado al userId de Supabase
- AND se envía un email de verificación al correo proporcionado
- AND se muestra un mensaje indicando que debe verificar su email para continuar

#### Scenario: Registro fallido por documentos no aceptados

- GIVEN un visitante en la pantalla de registro
- WHEN intenta registrarse sin marcar alguno de los 4 documentos legales
- THEN el sistema bloquea el envío del formulario
- AND muestra un mensaje de error indicando que debe aceptar todos los documentos

#### Scenario: Registro fallido por email existente

- GIVEN un visitante que ingresa un email ya registrado
- WHEN intenta completar el registro
- THEN Supabase Auth retorna un error de email duplicado
- AND el sistema muestra el mensaje de error correspondiente sin revelar si el email existe (por privacidad)

---

### Requirement: Verificación de Email

El sistema DEBE requerir verificación de email antes de permitir el login. Un usuario con email no verificado NO DEBE poder acceder al dashboard ni a ninguna ruta protegida.

#### Scenario: Verificación exitosa

- GIVEN un usuario recién registrado que recibe el email de verificación
- WHEN hace clic en el enlace de verificación de Supabase
- THEN su email se marca como verificado en Supabase Auth
- AND puede proceder a iniciar sesión

#### Scenario: Login bloqueado por email no verificado

- GIVEN un usuario registrado pero con email no verificado
- WHEN intenta iniciar sesión
- THEN el sistema bloquea el acceso
- AND muestra un mensaje indicando que debe verificar su email
- AND ofrece la opción de reenviar el email de verificación

---

### Requirement: Login y Logout con Sesiones JWT

El sistema DEBE permitir login con email y password a través de Supabase Auth. El JWT de Supabase DEBE ser almacenado y utilizado para autenticar todas las peticiones al backend Fastify. El logout DEBE invalidar la sesión local y redirigir al onboarding.

#### Scenario: Login exitoso

- GIVEN un usuario con email verificado
- WHEN ingresa credenciales correctas en el formulario de login
- THEN Supabase Auth retorna un JWT válido
- AND el frontend almacena el JWT en memoria (contexto React, no localStorage por seguridad)
- AND redirige al dashboard
- AND el dashboard muestra datos del usuario autenticado

#### Scenario: Logout exitoso

- GIVEN un usuario autenticado en el dashboard
- WHEN hace clic en "Cerrar sesión"
- THEN el sistema limpia el JWT del contexto
- AND llama a Supabase Auth signOut
- AND redirige a la pantalla de onboarding (/)

#### Scenario: Acceso a ruta protegida sin autenticación

- GIVEN un visitante no autenticado
- WHEN intenta acceder directamente a /dashboard
- THEN el sistema redirige automáticamente a /login

---

### Requirement: Gestión de Claves API de Binance

El sistema DEBE permitir a usuarios autenticados proporcionar su clave pública (API Key) y clave secreta (Secret Key) de Binance. La secret key DEBE encriptarse con AES-256-GCM usando una clave maestra almacenada en variable de entorno. El ciphertext DEBE almacenarse en MongoDB. La API key DEBE almacenarse en texto plano (no es sensible para operaciones de lectura de balance).

#### Scenario: Almacenamiento exitoso de claves

- GIVEN un usuario autenticado en la pantalla de conexión (/connect)
- WHEN ingresa su API Key y Secret Key de Binance y confirma
- THEN el frontend envía ambas claves al backend via HTTPS
- AND el backend encripta la Secret Key con AES-256-GCM usando la MASTER_KEY
- AND almacena en MongoDB: { userId, apiKey (plain), encryptedSecret (ciphertext + iv + authTag), createdAt }
- AND el sistema confirma el almacenamiento exitoso

#### Scenario: Rechazo de claves inválidas

- GIVEN un usuario que ingresa una API Key o Secret Key vacía o con formato incorrecto
- WHEN intenta guardar
- THEN el backend valida el formato y rechaza la petición con HTTP 400
- AND el frontend muestra mensaje de error específico

#### Scenario: Actualización de claves existentes

- GIVEN un usuario que ya tiene claves almacenadas
- WHEN ingresa nuevas claves
- THEN el sistema reemplaza las claves anteriores (soft-delete o overwrite)
- AND registra un log de la operación (sin exponer las claves)

---

### Requirement: Servicio de Claves al Robot via mTLS

El backend DEBE exponer un endpoint `GET /api/keys/:userId` que SOLO sea accesible a través de una conexión mTLS autenticada con un certificado de cliente válido emitido por la CA interna. Este endpoint DEBE desencriptar la Secret Key y devolverla junto con la API Key al robot.

#### Scenario: Robot obtiene claves exitosamente

- GIVEN el robot Python configurado con certificado de cliente válido
- WHEN realiza una petición GET /api/keys/:userId con mTLS
- THEN el backend verifica el certificado cliente contra la CA
- AND verifica que el userId existe y tiene claves registradas
- AND desencripta la Secret Key con la MASTER_KEY
- AND responde con JSON: { apiKey, secretKey }
- AND el robot puede usar estas credenciales para operar en Binance

#### Scenario: Rechazo por mTLS fallido

- GIVEN una petición sin certificado de cliente o con certificado inválido/expirado
- WHEN intenta acceder a GET /api/keys/:userId
- THEN el backend rechaza la conexión a nivel TLS (antes de llegar a la aplicación)
- AND retorna error de conexión TLS

#### Scenario: Rechazo por userId sin claves

- GIVEN el robot con mTLS válido
- WHEN solicita claves para un userId que no tiene claves registradas
- THEN el backend responde con HTTP 404
- AND el robot registra que ese usuario no está configurado

---

### Requirement: Documentos Legales

El sistema DEBE exponer endpoints para registrar y consultar la aceptación de documentos legales. Los 4 documentos obligatorios son: Terms of Service, Risk Disclosure, API Authorization Agreement, No Custody Policy.

#### Scenario: Registro de aceptación

- GIVEN un usuario durante el registro
- WHEN marca las casillas de aceptación
- THEN el frontend envía POST /api/legal-docs con el array de documentos aceptados y el userId
- AND el backend almacena en MongoDB: { userId, documents: [{docId, title, acceptedAt}], acceptedAll: true }

#### Scenario: Consulta de aceptación

- GIVEN un usuario autenticado
- WHEN el sistema necesita verificar si puede operar
- THEN consulta GET /api/legal-docs/:userId
- AND recibe el estado de aceptación de cada documento

---

## Data Models

### MongoDB Collections

#### Collection: `apiKeys`
```typescript
interface ApiKeyDocument {
  _id: ObjectId;
  userId: string;              // Supabase user UUID
  apiKey: string;              // Binance API Key (plain text, not highly sensitive)
  encryptedSecret: string;      // Base64-encoded ciphertext
  iv: string;                  // Initialization vector (Base64)
  authTag: string;             // GCM authentication tag (Base64)
  createdAt: Date;
  updatedAt: Date;
}
```

#### Collection: `legalDocuments`
```typescript
interface LegalDocumentRecord {
  _id: ObjectId;
  userId: string;              // Supabase user UUID
  documents: Array<{
    docId: string;             // 'tos' | 'risk' | 'api' | 'custody'
    title: string;
    acceptedAt: Date;
  }>;
  acceptedAll: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Collection: `users` (extension de perfil, opcional)
```typescript
interface UserProfile {
  _id: ObjectId;
  userId: string;              // Supabase user UUID
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Supabase Auth Schema (existente en PostgreSQL de Supabase)
- `auth.users` — gestionado por Supabase
- `public.profiles` — extensión opcional para nombres/apellidos si no se guardan en MongoDB

---

## API Contract

### Auth Middleware (Fastify)

```typescript
// Middleware: verifySupabaseJWT
// Extrae el header Authorization: Bearer <jwt>
// Verifica la firma usando la JWT_SECRET de Supabase
// Adjunta request.user = { userId, email, ...claims }
// Rechaza con 401 si el token es inválido, expirado o ausente
```

### Endpoints

#### `POST /api/keys`

**Headers:** `Authorization: Bearer <supabase_jwt>`

**Body:**
```json
{
  "apiKey": "string (required, min 10 chars)",
  "secretKey": "string (required, min 10 chars)"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "API keys stored securely"
}
```

**Response 400:**
```json
{
  "success": false,
  "error": "Invalid API key format"
}
```

**Response 401:** Unauthorized (JWT inválido)

**Response 409:** Keys already exist for user (opcional: implementar PUT para update)

---

#### `GET /api/keys/:userId`

**Security:** mTLS obligatorio. No requiere Authorization header (la identidad del robot viene del certificado).

**Params:** `userId` — Supabase user UUID

**Response 200:**
```json
{
  "apiKey": "string",
  "secretKey": "string"
}
```

**Response 403:** mTLS certificate missing or invalid

**Response 404:** No keys found for user

**NOTA:** Este endpoint DEBE estar en un puerto separado o una ruta específica que el servidor web sólo expone con mTLS configurado.

---

#### `POST /api/legal-docs`

**Headers:** `Authorization: Bearer <supabase_jwt>`

**Body:**
```json
{
  "documents": [
    { "docId": "tos", "title": "Terms of Service" },
    { "docId": "risk", "title": "Risk Disclosure" },
    { "docId": "api", "title": "API Authorization Agreement" },
    { "docId": "custody", "title": "No Custody Policy" }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "acceptedAll": true
}
```

---

#### `GET /api/legal-docs/:userId`

**Headers:** `Authorization: Bearer <supabase_jwt>`

**Params:** `userId` — Supabase user UUID

**Response 200:**
```json
{
  "userId": "string",
  "documents": [
    { "docId": "tos", "title": "Terms of Service", "acceptedAt": "2026-05-29T..." }
  ],
  "acceptedAll": true
}
```

---

## Security Model

### AES-256-GCM Encryption Flow

1. **Master Key:** 32-byte key generada aleatoriamente, almacenada en `MASTER_KEY` (env var). NUNCA en código.
2. **Encrypt (Backend):**
   ```
   iv = crypto.randomBytes(16)
   cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
   encrypted = cipher.update(secretKey, 'utf8', 'base64') + cipher.final('base64')
   authTag = cipher.getAuthTag() // 16 bytes
   ```
   Store: `encryptedSecret` + `iv` + `authTag`
3. **Decrypt (Backend):**
   ```
   decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv)
   decipher.setAuthTag(authTag)
   secretKey = decipher.update(encryptedSecret, 'base64', 'utf8') + decipher.final('utf8')
   ```
4. **Key Rotation:** Documentar pero no implementar en este SDD. Para rotación, re-encriptar todos los registros con nueva master key.

### mTLS Setup

**Step 1: Generar CA**
```bash
openssl req -x509 -newkey rsa:4096 -keyout ca-key.pem -out ca-cert.pem -sha256 -days 3650 -nodes -subj "/CN=CryptoInvestor-Internal-CA"
```

**Step 2: Generar certificado de servidor**
```bash
openssl req -newkey rsa:4096 -keyout server-key.pem -out server-req.pem -nodes -subj "/CN=api.cryptoinvestor.local"
openssl x509 -req -in server-req.pem -CA ca-cert.pem -CAkey ca-key.pem -out server-cert.pem -days 365 -sha256 -copy_extensions=copyall
```

**Step 3: Generar certificado de cliente (robot)**
```bash
openssl req -newkey rsa:4096 -keyout robot-key.pem -out robot-req.pem -nodes -subj "/CN=trading-robot"
openssl x509 -req -in robot-req.pem -CA ca-cert.pem -CAkey ca-key.pem -out robot-cert.pem -days 365 -sha256 -copy_extensions=copyall
```

**Step 4: Configurar Fastify con mTLS**
```typescript
// Puerto separado para endpoints del robot
const robotServer = Fastify({
  https: {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem'),
    ca: fs.readFileSync('ca-cert.pem'),
    requestCert: true,
    rejectUnauthorized: true
  }
});
```

**Step 5: Robot Python config**
```python
import ssl
context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile='ca-cert.pem')
context.load_cert_chain(certfile='robot-cert.pem', keyfile='robot-key.pem')
```

### Consideraciones de Seguridad

- La `MASTER_KEY` DEBE tener al menos 32 bytes de entropía.
- Los certificados DEBEN tener fecha de expiración y proceso de renovación documentado.
- El endpoint mTLS DEBE correr en un puerto separado o detrás de un reverse proxy que maneje el mTLS.
- No loggear nunca la Secret Key ni el master key.
- La API Key (pública) puede loggearse para debugging pero nunca la Secret Key.

---

## Frontend Changes

### Nuevas pantallas/componentes

1. **AuthProvider** — Contexto React que envuelve la app y gestiona el estado de autenticación de Supabase. Reemplaza o envuelve a `TradingProvider`.
2. **LoginScreen** — Formulario de login con email/password.
3. **RegisterScreen** — Formulario de registro con: nombres, apellidos, email, password, checkbox para cada uno de los 4 documentos legales con links a los textos.
4. **VerifyEmailScreen** — Pantalla intermedia después del registro indicando que debe verificar el email.
5. **ProtectedRoute** — Wrapper que verifica autenticación y redirige a /login si no está logueado.

### Cambios en pantallas existentes

- **OnboardingScreen:** Agregar botones "Iniciar sesión" y "Crear cuenta" que redirijan a login/register.
- **ConnectScreen (/connect):** Modificar para que, después de la conexión de claves API, envíe las claves al backend en lugar de solo guardarlas localmente.
- **DashboardScreen:** Mostrar nombre del usuario autenticado. Botón de logout en el TopBar o Sidebar.
- **useTrading hook:** Actualizar para obtener datos del usuario desde Supabase Auth en lugar de mockUser.

### Flujo de Autenticación

```
Onboarding (/) → Register (/register) → Verify Email (/verify-email) → Login (/login) → Dashboard (/dashboard)
                                    ↘ Login (/login) ───────────────────────↗
```

### Protección de rutas

```typescript
// App.tsx actualizado
<AuthProvider>
  <TradingProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OnboardingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/verify-email" element={<VerifyEmailScreen />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/connect" element={<ConnectScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/withdrawals" element={<WithdrawalsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </TradingProvider>
</AuthProvider>
```

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://api.cryptoinvestor.local:3001
```

### Backend (.env)
```
# Server
PORT=3000
ROBOT_PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cryptoinvestor

# Encryption
MASTER_KEY=base64-encoded-32-byte-key

# mTLS paths
SERVER_KEY_PATH=./certs/server-key.pem
SERVER_CERT_PATH=./certs/server-cert.pem
CA_CERT_PATH=./certs/ca-cert.pem
```

---

## Dependencies

### Frontend
```bash
npm install @supabase/supabase-js
```

### Backend
```bash
npm init -y
npm install fastify @fastify/cors mongodb dotenv
npm install -D typescript @types/node ts-node nodemon
```

Opcionalmente:
```bash
npm install @fastify/helmet @fastify/rate-limit  # para hardening futuro
```

---

## Test Strategy

### Frontend Tests
1. **Registro:** Simular formulario completo con aceptación de documentos → verificar llamada a Supabase signup.
2. **Login bloqueado:** Usuario no verificado → verificar mensaje de error.
3. **ProtectedRoute:** Acceso sin token → verificar redirección a /login.
4. **Logout:** Verificar limpieza de estado y redirección.

### Backend Tests
1. **POST /api/keys:**
   - Con JWT válido → 201
   - Sin JWT → 401
   - Clave inválida → 400
   - Verificar que secret se almacena encriptada
2. **GET /api/keys/:userId (mTLS):**
   - Con mTLS válido → 200 con keys desencriptadas
   - Sin certificado → rechazo TLS
   - userId inexistente → 404
3. **Legal docs endpoints:** CRUD de aceptación

### Integration Tests
1. Flujo completo: Register → Verify → Login → Store Keys → Robot fetches keys via mTLS
2. Verificar que la Secret Key desencriptada coincide con la original

### Security Tests
1. Intentar acceder a /api/keys sin certificado → conexión rechazada
2. Intentar desencriptar con master key incorrecta → fallo de auth tag
3. Verificar que logs no contienen secret keys

---

## Scenarios Summary

| Scenario | Happy Path | Error Path |
|----------|-----------|------------|
| Registro | Datos completos + docs aceptados → cuenta creada + email enviado | Docs faltantes → error; Email duplicado → error genérico |
| Verificación | Click en link → email verificado | Email no verificado → login bloqueado |
| Login | Credenciales correctas → JWT + dashboard | Credenciales incorrectas → error; No verificado → mensaje específico |
| Claves API | Form válido → encriptadas y guardadas | Formato inválido → 400; Sin auth → 401 |
| Robot mTLS | Cert válido → keys desencriptadas | Sin cert → TLS handshake fail; User sin keys → 404 |

---

## Open Questions / Decisions

1. **¿Dónde guardar nombres/apellidos?** Opción A: En Supabase `profiles` (PostgreSQL). Opción B: En MongoDB `users`. Recomendación: Supabase `profiles` para mantener coherencia con auth.
2. **¿El robot hará polling o el backend le pusheará las claves?** Decision: Polling REST por simplicidad. WebSocket SSE puede ser siguiente iteración.
3. **¿Necesitamos rate limiting en /api/keys?** Por ahora no, pero se documenta como mejora futura.
4. **¿Cómo manejar la CA en producción?** Decision: Usar cert-manager o similar. Para MVP, scripts OpenSSL documentados.
