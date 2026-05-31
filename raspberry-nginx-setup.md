# Contexto para configurar nginx + SSL en Raspberry Pi 5

## Escenario

- **Server**: Raspberry Pi 5 con Ubuntu/Debian
- **Usuario**: jorge
- **Dominio**: api.glsolutions.tech (apunta a la IP de la casa)
- **Container**: cryptoinvestor-backend corriendo con Docker en `/home/jorge/docker/cryptoinvestor-plataforma/`
- **Backend**: Fastify escuchando en puerto 3000 (API pública, JWT) y 3001 (robot, mTLS local)
- **Nginx**: ya instalado en el host (Raspberry), solo config default

## Objetivo

Hacer que `https://api.glsolutions.tech` sirva como reverse proxy hacia `http://localhost:3000` con SSL, para que el frontend y Postman accedan por un solo puerto (443).

## Lo que hay que hacer

### 1. Certbot

Verificar si está instalado:
```bash
which certbot
```

Si no:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Archivo de sitio

Crear `/etc/nginx/sites-available/api.glsolutions.tech`:

```nginx
server {
    listen 80;
    server_name api.glsolutions.tech;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.glsolutions.tech;

    ssl_certificate /etc/letsencrypt/live/api.glsolutions.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.glsolutions.tech/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Activar y certbot

```bash
sudo ln -s /etc/nginx/sites-available/api.glsolutions.tech /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.glsolutions.tech
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Firewall

- Puerto 443 (https) abierto en el router, apuntando a la Raspberry
- Puerto 80 también abierto (certbot necesita verificar el dominio)
- Una vez funcional, se puede cerrar puerto 3000 si estaba abierto

### 5. Docker-compose

No necesita cambios. El container sigue escuchando en localhost:3000. Nginx proxy_pass hacia ahí.

## Post-instalación

Probar desde internet:
```bash
curl https://api.glsolutions.tech/health
```

Debería responder `{"success":true,"data":{"status":"ok",...}}`

## Frontend — app.glsolutions.tech

Además de la API, se sirve el frontend React en un subdominio separado.

### 1. DNS

Agregar un registro A para `app.glsolutions.tech` apuntando a la misma IP de la casa (la de la Raspberry).

### 2. Nginx config

Hay un archivo de referencia en `deploy/app.glsolutions.tech.nginx` dentro del repo. Copiarlo y activarlo:

```bash
sudo cp /home/jorge/docker/cryptoinvestor-plataforma/deploy/app.glsolutions.tech.nginx /etc/nginx/sites-available/app.glsolutions.tech
sudo ln -s /etc/nginx/sites-available/app.glsolutions.tech /etc/nginx/sites-enabled/
sudo certbot --nginx -d app.glsolutions.tech
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Build del frontend

En la Raspberry, después de hacer `git pull`, compilar el frontend:

```bash
cd /home/jorge/docker/cryptoinvestor-plataforma
npm ci
npm run build
```

Esto regenera `dist/` con las variables de producción (`VITE_API_BASE_URL=https://api.glsolutions.tech`).

### 4. Verificar

```bash
curl https://app.glsolutions.tech
# Debería devolver el HTML del index.html
```

## Nota sobre mTLS / robot

El robot (Python) se conecta directo al container por localhost:3001 con mTLS, sin pasar por nginx. No necesita cambios.
