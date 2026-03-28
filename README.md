# Sistema de Inventario con Codigo QR

Implementacion full-stack para control de inventario con:

- CRUD de productos
- Generacion y lectura de codigos QR
- Movimientos de inventario con trazabilidad
- Alertas de bajo stock
- Reporteria operativa y exportacion a Excel
- Autenticacion JWT con control por roles

Este documento esta escrito con enfoque de ingenieria: arquitectura, reglas de negocio, despliegue local, variables de entorno, API y troubleshooting.

## 1. Alcance funcional

### 1.1 Funciones implementadas

1. CRUD completo de productos.
2. Generacion automatica de QR unico por producto.
3. Descarga de QR en PNG desde frontend.
4. Escaner QR en camara + entrada manual.
5. Movimientos: entrada, salida, traslado y ajuste.
6. Alertas cuando stock <= stock minimo.
7. Historial por producto con usuario y fecha.
8. Reportes operativos y exportacion Excel.
9. Roles: `admin`, `bodeguero`, `auditor`.

### 1.2 Roles y permisos

| Modulo | admin | bodeguero | auditor |
|---|---|---|---|
| Login / Perfil | si | si | si |
| CRUD productos | si | no | no |
| Ver productos | si | si | si |
| Registrar movimientos | si | si | no |
| Escaneo QR | si | si | si |
| Reportes | si | no | si |
| Exportar Excel | si | no | si |

> Nota: el frontend esconde acciones segun rol, y backend aplica autorizacion real por middleware.

## 2. Stack tecnico

- Frontend: React + Vite + React Router + Axios
- QR: `qrcode` (generacion) + `react-qr-scanner` (lectura)
- Backend: Node.js + Express + Sequelize
- DB: MySQL 8 (Docker)
- Reportes Excel: `exceljs`
- Auth: JWT + bcrypt

## 3. Arquitectura

Arquitectura de 3 capas:

1. **Presentacion (frontend)**
   - Pantallas: login, productos, escaner, movimientos, reportes
   - Estado de sesion en `AuthContext`
2. **API (backend)**
   - Controladores por dominio
   - Middleware de autenticacion/autorizacion
   - Reglas de inventario y transacciones
3. **Persistencia (MySQL + Sequelize)**
   - Modelos relacionales
   - Integridad referencial
   - Indices para consultas de historial/reportes

### 3.1 Estructura de carpetas

```text
.
|- backend/
|  |- src/
|  |  |- config/
|  |  |- controllers/
|  |  |- middlewares/
|  |  |- models/
|  |  |- routes/
|  |  |- services/
|  |  |- app.js
|  |  |- seed.js
|  |  |- server.js
|- frontend/
|  |- src/
|  |  |- components/
|  |  |- lib/
|  |  |- pages/
|  |  |- state/
|  |  |- App.jsx
|  |  |- main.jsx
|- docker-compose.yml
|- .env.example
|- .gitignore
```

## 4. Modelo de datos

### 4.1 Tablas principales

- `users`: usuarios del sistema y rol.
- `categories`: catalogo de categorias.
- `suppliers`: proveedores.
- `locations`: ubicaciones base.
- `products`: maestro de productos e inventario actual.
- `inventory_movements`: bitacora de entradas/salidas/traslados/ajustes.
- `stock_alerts`: alertas de bajo stock (open/closed).

### 4.2 Campos clave en movimientos

En cada movimiento se guardan:

- `type`: `entry | exit | transfer | adjustment`
- `quantity`
- `adjustmentSign` (solo ajustes)
- `stockBefore`
- `stockAfter`
- `reason`
- `fromLocationText`, `toLocationText`
- `productId`, `userId`, `createdAt`

Esto permite auditoria completa y reconstruccion de eventos.

## 5. Reglas de negocio criticas

1. SKU unico por producto.
2. QR unico por producto.
3. No se permite stock negativo.
4. Ajuste manual requiere motivo.
5. Traslado requiere origen y destino distintos.
6. Alertas automaticas cuando `stockCurrent <= stockMin`.
7. Cierre de alerta cuando el stock vuelve por encima del minimo.

## 6. Prerrequisitos

- Node.js 18+
- npm 9+
- Docker + Docker Compose

## 7. Instalacion y ejecucion local

### 7.1 Clonar e instalar

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 7.2 Configurar variables de entorno

Desde la raiz del repo:

```bash
# Linux / macOS
cp .env.example .env

# Windows PowerShell
copy .env.example .env
```

En backend:

```bash
# Linux / macOS
cp backend/.env.example backend/.env

# Windows PowerShell
copy backend/.env.example backend/.env
```

En frontend:

```bash
# Linux / macOS
cp frontend/.env.example frontend/.env

# Windows PowerShell
copy frontend/.env.example frontend/.env
```

### 7.3 Levantar MySQL con Docker

```bash
docker compose up -d mysql
```

Opcional: interfaz visual de DB

```bash
docker compose up -d phpmyadmin
```

### 7.4 Cargar datos iniciales y ejecutar API

```bash
cd backend
npm run seed
npm run dev
```

API en `http://localhost:4000`

### 7.5 Ejecutar frontend

```bash
cd frontend
npm run dev
```

Web en `http://localhost:5173`

## 8. Variables de entorno

### 8.1 Root (`.env`)

| Variable | Uso | Ejemplo |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Password root de MySQL container | `root` |
| `MYSQL_DATABASE` | Base de datos inicial | `inventario_qr` |
| `MYSQL_USER` | Usuario app en MySQL | `inventario` |
| `MYSQL_PASSWORD` | Password usuario app | `inventario123` |
| `MYSQL_PORT` | Puerto host para MySQL | `3306` |
| `PHPMYADMIN_PORT` | Puerto host para phpMyAdmin | `8081` |

### 8.2 Backend (`backend/.env`)

| Variable | Uso | Ejemplo |
|---|---|---|
| `PORT` | Puerto API | `4000` |
| `DB_HOST` | Host MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_NAME` | Nombre DB | `inventario_qr` |
| `DB_USER` | Usuario DB | `inventario` |
| `DB_PASSWORD` | Password DB | `inventario123` |
| `JWT_SECRET` | Firma de tokens JWT | `change_this_for_dev_and_prod` |
| `JWT_EXPIRES_IN` | TTL del token | `1d` |
| `CORS_ORIGIN` | Origen permitido frontend | `http://localhost:5173` |

### 8.3 Frontend (`frontend/.env`)

| Variable | Uso | Ejemplo |
|---|---|---|
| `VITE_API_URL` | Base URL de API | `http://localhost:4000/api` |
| `VITE_APP_NAME` | Nombre de app (opcional) | `Sistema Inventario QR` |

## 9. Usuarios de prueba (seed)

- `admin@inventario.local / Admin123!`
- `bodega@inventario.local / Bodega123!`
- `auditor@inventario.local / Auditor123!`

## 10. Endpoints principales

### 10.1 Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### 10.2 Catalogos

- `GET /api/catalog/categories`
- `POST /api/catalog/categories` (admin)
- `GET /api/catalog/suppliers`
- `POST /api/catalog/suppliers` (admin)
- `GET /api/catalog/locations`
- `POST /api/catalog/locations` (admin)

### 10.3 Productos

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/by-qr?value=...`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin, soft delete)

### 10.4 Movimientos

- `GET /api/movements?productId=&type=&from=&to=&limit=`
- `POST /api/movements` (admin, bodeguero)
- `GET /api/movements/product/:id`

### 10.5 Alertas

- `GET /api/alerts/low-stock`

### 10.6 Reportes

- `GET /api/reports/inventory-current`
- `GET /api/reports/low-stock`
- `GET /api/reports/movements?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/reports/top-moved?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10`

Para exportar Excel en reportes, agregar `format=excel`.

## 11. Ejemplos de payloads

### 11.1 Crear producto

```json
{
  "name": "Taladro Inalambrico 20V",
  "sku": "TAL-INA-2045",
  "categoryId": 1,
  "supplierId": 1,
  "locationId": 1,
  "warehouseLocation": "Pasillo A - Nivel 2",
  "costPrice": 250,
  "salePrice": 379,
  "stockCurrent": 40,
  "stockMin": 12,
  "active": true
}
```

### 11.2 Registrar salida

```json
{
  "productId": 1,
  "type": "exit",
  "quantity": 2,
  "reason": "Venta mostrador"
}
```

### 11.3 Registrar ajuste negativo

```json
{
  "productId": 1,
  "type": "adjustment",
  "adjustmentSign": "negative",
  "quantity": 3,
  "reason": "Diferencia en conteo ciclico"
}
```

### 11.4 Registrar traslado

```json
{
  "productId": 1,
  "type": "transfer",
  "quantity": 1,
  "fromLocationText": "Pasillo A - Nivel 1",
  "toLocationText": "Pasillo B - Nivel 2",
  "reason": "Reubicacion por rotacion"
}
```

## 12. Notas de implementacion

- Se usa `sequelize.sync({ alter: true })` para bootstrap rapido de desarrollo.
- En produccion se recomienda migraciones versionadas con `sequelize-cli`.
- Errores de SKU duplicado devuelven `409` con mensaje explicito.
- Login normaliza email a lowercase para evitar errores por mayusculas.

## 13. Troubleshooting

### 13.1 `POST /api/products` devuelve 400 o 409

- Revisa mensaje exacto en UI/API.
- Caso comun: SKU duplicado.
- Solucion: usa SKU unico.

### 13.2 `GET ... 304` en logs

No es error. Es cache valida (ETag/Not Modified).

### 13.3 Escaner QR parece no detectar segundo codigo

- Se agrego control anti-duplicado por ventana corta para evitar lecturas repetidas del mismo frame.
- Si hay problema en camara, usa ingreso manual del valor QR.

### 13.4 Error de conexion a DB

1. Verifica `docker compose ps`.
2. Verifica variables `DB_*` en `backend/.env`.
3. Verifica que `MYSQL_PORT` no este ocupado.

## 14. Seguridad y hardening recomendado

1. Cambiar `JWT_SECRET` en cada entorno.
2. No usar credenciales por defecto en ambientes compartidos.
3. Agregar rate limiting en login.
4. Agregar logs estructurados y monitoreo.
5. Cambiar `sequelize.sync` por migraciones versionadas.

## 15. Comandos utiles

```bash
# Levantar DB
docker compose up -d mysql

# Ver logs MySQL
docker compose logs -f mysql

# Seed de backend
cd backend && npm run seed

# Ejecutar backend
cd backend && npm run dev

# Ejecutar frontend
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build
```

## 16. Estado del proyecto

Proyecto funcional para entorno de desarrollo y demos internas.

Para productivo, el siguiente sprint sugerido es:

1. Migraciones versionadas.
2. Tests automatizados (unit + integration).
3. Manejo centralizado de errores async.
4. Auditoria avanzada y observabilidad.
