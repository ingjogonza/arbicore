# SDD Proposal: Sistema de Autenticación y Gestión de Claves API

## Status
Proposed

## Context
El proyecto CryptoInvestor tiene solo frontend hecho (React + Vite) con datos mock. No hay sistema de usuarios, no hay backend real, y no hay forma segura de capturar ni almacenar claves API de Binance para operar con el robot de trading.

## Objective
Implementar un sistema completo de autenticación y gestión segura de claves API que permita:
1. Registrar usuarios con nombres, apellidos, email y password
2. Verificar el email antes de permitir el login
3. Obligar aceptación de 4 documentos legales en el registro
4. Capturar y almacenar claves API de Binance encriptadas
5. Servir las claves de forma segura al robot Python mediante mTLS

## Scope (In-Scope)
- Integrar Supabase Auth en el frontend (register, login, logout, email verification)
- Modificar el formulario de registro para incluir aceptación de 4 documentos legales
- Crear backend Fastify con TypeScript:
  - Conexión a MongoDB
  - Middleware de verificación JWT de Supabase
  - Endpoint POST /api/keys — recibe claves API, las encripta con AES-256 (clave maestra en env var) y guarda en MongoDB
  - Endpoint GET /api/keys/:userId — accesible solo vía mTLS, devuelve claves desencriptadas para el robot
  - Endpoint POST /api/legal-docs — registra aceptación de documentos legales
  - Endpoint GET /api/legal-docs/:userId — verifica si el usuario aceptó todos los docs
- Generar infraestructura de certificados mTLS (CA, cert servidor, cert cliente)
- Actualizar useTrading para integrar con usuario autenticado de Supabase

## Non-Goals (Out-of-Scope)
- Robot Python de trading (será otro SDD)
- Ejecución de trades reales en Binance
- Modificaciones a pantallas de withdrawals, settings o dashboard (salvo la integración de auth)
- Deploy a producción
- Rate limiting avanzado en la API

## Assumptions
- Supabase proyecto ya existe o se creará
- MongoDB estará disponible localmente o en MongoDB Atlas
- El robot Python correrá en infraestructura controlada por nosotros

## Estimated Risk
- High: Seguridad de claves API (encriptación correcta, mTLS configurado)
- Medium: Integración Supabase Auth con frontend existente
- Medium: Tamaño del diff (frontend + backend nuevo, probablemente >400 líneas)

## Review Workload Forecast
Estimado: 500-800 líneas de código nuevas + archivos de certificados + configs. Recomienda dividir en PRs encadenados.

## Next Phase
Spec → Design → Tasks → Apply → Verify → Archive
