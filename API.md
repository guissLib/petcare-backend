# PetCare Home Services API

API REST NestJS para reservas de servicios de mascotas. Usa MySQL mediante
TypeORM y migraciones explícitas; el dominio no depende del ORM.

## Ejecución

```bash
npm install
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api`.
La documentación interactiva Swagger queda disponible en
`http://localhost:3000/api-docs` y el contrato OpenAPI JSON en
`http://localhost:3000/api-docs/openapi.json`.

## MySQL

1. Cree la base de datos y un usuario con permisos sobre ella.
2. Copie `.env.example` a `.env` y configure sus credenciales.
3. Si el servidor requiere TLS con una CA privada, configure
   `MYSQL_SSL=true` y `MYSQL_SSL_CA` con la ruta del certificado CA.
4. Ejecute las migraciones:

```bash
npm run migration:run
```

Las tablas relacionales se crean con `synchronize=false`; no se modifica el
esquema automáticamente al iniciar la aplicación. Para cargar el administrador,
proveedores y promoción base configure las variables `ADMIN_SEED_*` y ejecute:

```bash
npm run seed:base
```

El seed es idempotente. La contraseña del administrador y la de todos los
usuarios nuevos se almacenan únicamente como hash scrypt. Si existe una tabla
`petcare_state` de una instalación anterior, la migración de compatibilidad
aplana sus datos antes de activar los repositorios relacionales.

## Recursos

Todos los cuerpos usan JSON. Los endpoints principales son:

- `POST /users`, `GET /users`. `role` puede ser `pet-owner`, `provider` o
  `administrator`. El rol por defecto es `pet-owner`.
- Para todos los usuarios se requieren `name`, `email` y `password`; la
  contraseña debe tener al menos 12 caracteres.
- Para `pet-owner` se requiere además `city`.
- Para `provider` se requieren además `city` y un objeto `provider` con
  `type`, `address` y `services`.
- Para `administrator` no se requiere `city`; también debe incluir `password`.
- `POST /users/:userId/pets`, `GET /users/:userId/pets`
- `POST /pets/:petId/vaccinations` para registrar documentos mediante `documentUrl`
- `GET /providers?city=&serviceType=`
- `GET /providers/:providerId/availability?date=YYYY-MM-DD`
- `POST /users/:userId/bookings`, `GET /bookings`, `GET /bookings/:bookingId`
- `PATCH /bookings/:bookingId/status` con `confirmed`, `rejected`, `in-progress`,
  `completed` o `cancelled`
- `POST /bookings/:bookingId/reminder`
- `GET /promotions`, `POST /promotions`
- `POST /maps/geocode`
- `GET /users/:userId/notifications`
- `POST /payments` o `POST /payments/mock`

### Autenticación

- `POST /auth/login` recibe `email` y `password` y devuelve un JWT junto con
  el usuario público.
- El registro (`POST /users`), `GET /` y `GET /health` son públicos.
- Los demás endpoints requieren
  `Authorization: Bearer <accessToken>`.
- Configure `AUTH_JWT_SECRET` con un secreto aleatorio de al menos 32
  caracteres y `AUTH_JWT_EXPIRES_IN_SECONDS` para definir la vigencia.

Los servicios de veterinaria y boarding requieren al menos una vacuna vigente.
Las reservas validan pertenencia de la mascota, modalidad a domicilio,
disponibilidad, capacidad y promociones nacionales/locales.

## Integraciones simuladas

`payments/mock` y el pago de una reserva generan referencias `MOCK-*`; no
contactan una pasarela. `maps/geocode` devuelve coordenadas determinísticas
simuladas. Las notificaciones de confirmación, rechazo y finalización se
guardan localmente y se entregan con el canal `mock-push`.

La autenticación utiliza JWT y verifica las contraseñas contra hashes scrypt.
El guard valida el token en cada endpoint protegido; la autorización fina por
rol y las políticas específicas de cada recurso pueden ampliarse en una
iteración posterior. El almacenamiento de archivos y los adaptadores reales de
pagos, mapas y notificaciones siguen pendientes.
