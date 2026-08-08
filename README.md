# PetCare Home Services API

Backend NestJS para reservas de servicios de mascotas. La aplicación es un
monolito modular: cada módulo agrupa sus capas de presentación, aplicación,
dominio e infraestructura sin cambiar los endpoints públicos.

## Estructura

El código de negocio está en `src/modules`:

- `booking`: creación, consulta y ciclo de vida de reservas.
- `payment`: pagos y gateway de pago.
- `user`: usuarios, registro, autenticación JWT y hash scrypt.
- `pet`: mascotas y vacunaciones.
- `provider`: proveedores, servicios y disponibilidad.
- `notification`: notificaciones asociadas a usuarios y reservas.
- `promotion`: promociones nacionales y locales.
- `shared-kernel`: value objects, errores, eventos, tipos y utilidades
  compartidas.
- `map` y `system`: adaptadores técnicos para geolocalización y health check.

Dentro de cada módulo:

```text
presentation -> application -> domain
                      |
                      v
                 infrastructure
```

`src/app.module.ts` solo compone los módulos Nest. Los contratos de
repositorio permanecen en el dominio y los adaptadores TypeORM en la
infraestructura de cada módulo.

## Ejecución

```bash
npm install
npm run start:dev
```

La API queda disponible en `http://localhost:3005/api`. Swagger está en
`http://localhost:3005/api-docs` y el contrato OpenAPI en
`http://localhost:3005/api-docs/openapi.json`.

## MySQL

1. Cree la base de datos y un usuario con permisos sobre ella.
2. Copie `.env.example` a `.env` y configure sus credenciales.
3. Si el servidor requiere TLS con una CA privada, configure `MYSQL_SSL=true` y
   `MYSQL_SSL_CA` con la ruta del certificado.
4. Ejecute las migraciones:

```bash
npm run migration:run
```

Las entidades se encuentran dentro de los módulos y TypeORM las descubre
mediante el patrón configurado en
`src/modules/shared-kernel/infrastructure/persistence/typeorm.config.ts`.
El esquema usa `synchronize=false`. Para cargar el administrador, proveedores y
promoción base configure las variables `ADMIN_SEED_*` y ejecute:

```bash
npm run seed:base
```

El seed es idempotente. Las contraseñas se almacenan únicamente como hashes
scrypt.

## API y autenticación

- `POST /users`, `GET /users`.
- `POST /auth/login`.
- `POST /users/:userId/pets`, `GET /users/:userId/pets`.
- `POST /pets/:petId/vaccinations`.
- `GET /providers?city=&serviceType=`.
- `GET /providers/:providerId/availability?date=YYYY-MM-DD`.
- `POST /users/:userId/bookings`, `GET /bookings`,
  `GET /bookings/:bookingId`.
- `PATCH /bookings/:bookingId/status` y
  `POST /bookings/:bookingId/reminder`.
- `GET /promotions`, `POST /promotions`.
- `POST /maps/geocode`.
- `GET /users/:userId/notifications`.
- `POST /payments` o `POST /payments/mock`.

El registro (`POST /users`), login, raíz y health check son públicos. Los demás
endpoints requieren `Authorization: Bearer <accessToken>`. Configure
`AUTH_JWT_SECRET` con al menos 32 caracteres y
`AUTH_JWT_EXPIRES_IN_SECONDS` para definir la vigencia.

## Pruebas

```bash
npm run lint
npm test
npm run build
```
