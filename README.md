# PetCare Home Services API

Backend NestJS para identidad y bounded contexts auxiliares de PetCare. La
aplicación es un monolito modular: cada módulo agrupa sus capas de
presentación, aplicación, dominio e infraestructura. Booking se ejecuta como
un microservicio independiente.

## Estructura

El código de negocio está en `src/modules`:

- `booking-context`: contrato interno que entrega contexto validado a Booking.
- `payment`: intenciones, checkout mock y eventos Payment internos.
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

El backend queda disponible internamente en `http://localhost:3005/api`.
Para el navegador, levante `api-gateway` en el puerto 3000 y use
`http://localhost:3000/api`; su Swagger público está en
`http://localhost:3000/api-docs`. Swagger interno del backend está en
`http://localhost:3005/api-docs`.

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
- `GET /promotions`, `POST /promotions`.
- `POST /maps/geocode`.
- `GET /users/:userId/notifications`.
- Los endpoints `/internal/booking-context` y `/internal/payments/*` son
  contratos servicio-a-servicio protegidos por `PETCARE_SERVICE_SECRET`.

Las rutas de cotización, creación, consulta, actualización, recordatorios y
checkout de Booking están documentadas en `booking-service/README.md` y se
consumen desde el frontend a través de `http://localhost:3000/api`. El puerto
3011 queda reservado para comunicación interna.

El registro (`POST /users`), login, raíz y health check son públicos. El
gateway valida `Authorization: Bearer <accessToken>` y los endpoints de
negocio reciben claims internos protegidos por `API_GATEWAY_SECRET`; los
contratos servicio-a-servicio continúan requiriendo sus secretos específicos.
Configure `AUTH_JWT_SECRET` con al menos 32 caracteres,
`AUTH_JWT_EXPIRES_IN_SECONDS` para definir la vigencia y el mismo
`API_GATEWAY_SECRET` en los tres servicios.

## Pruebas

```bash
npm run lint
npm test
npm run build
```
