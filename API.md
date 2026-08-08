# PetCare Home Services API

API REST NestJS para reservas de servicios de mascotas. Usa MySQL mediante
TypeORM y migraciones explícitas; el dominio no depende del ORM.

## Ejecución

```bash
npm install
npm run start:dev
```

La API queda disponible en `http://localhost:3005/api`.
La documentación interactiva Swagger queda disponible en
`http://localhost:3005/api-docs` y el contrato OpenAPI JSON en
`http://localhost:3005/api-docs/openapi.json`.

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

La mayoría de cuerpos usan JSON; la carga de carnets usa
`multipart/form-data`. Los endpoints principales son:

- `POST /users`, `GET /users`. `role` puede ser `pet-owner`, `provider` o
  `administrator`. El rol por defecto es `pet-owner`.
- Para todos los usuarios se requieren `name`, `email` y `password`; la
  contraseña debe tener al menos 12 caracteres.
- Para `pet-owner` se requiere además `city`.
- Para `provider` se requieren además `city` y un objeto `provider` con
  `type`, `address` y `services`.
- Para `administrator` no se requiere `city`; también debe incluir `password`.
- `POST /users/:userId/pets`, `GET /users/:userId/pets`
- `POST /pets/:petId/vaccinations` para registrar una vacuna y su PDF
- `PUT /pets/:petId/vaccinations/:vaccinationId/document` para reemplazar el PDF
- `GET /pets/:petId/vaccinations/:vaccinationId/document` para descargarlo de
  forma autenticada
- `GET /providers?city=&serviceType=`
- `GET /providers/:providerId/availability?date=YYYY-MM-DD`
- `POST /users/:userId/bookings/quote` calcula el precio antes del pago
- `POST /users/:userId/bookings` crea la reserva. Para `online` crea una
  intención de pago y deja la reserva en `pending` durante 30 minutos; para
  `at-location` conserva la confirmación inmediata.
- `POST /bookings/:bookingId/payments/mock` procesa el checkout de tarjeta
  simulado. Solo un pago `paid` confirma una reserva online y dispara la
  notificación al proveedor.
- `GET /bookings`, `GET /bookings/:bookingId`
- `PATCH /bookings/:bookingId/status` con `rejected`, `in-progress`,
  `completed` o `cancelled`; una reserva online pendiente no puede confirmarse
  manualmente.
- `POST /bookings/:bookingId/reminder`
- `GET /promotions` consulta promociones aplicables; `POST /promotions` crea
  una promoción propia para el proveedor autenticado
- `GET /promotions/mine`, `PATCH /promotions/:promotionId` y
  `PATCH /promotions/:promotionId/status` administran promociones propias
- `scope: national` hace aplicable la promoción en cualquier ciudad; `scope:
local` exige `city` y solo aplica cuando coincide con la ciudad del cliente.
- `POST /maps/geocode`, `GET /maps/config`
- `GET /users/:userId/notifications`
- `POST /payments` y `POST /payments/mock` se mantienen por compatibilidad;
  para una reserva debe usarse el endpoint contextual de checkout.

Los datos de tarjeta del checkout mock se validan únicamente por formato y no
se almacenan. Para probar un rechazo, use un número de tarjeta terminado en
`0002`. El checkout no persiste el número, el CVV ni la fecha de expiración.

### Autenticación

- `POST /auth/login` recibe `email` y `password` y devuelve un JWT junto con
  el usuario público.
- El registro (`POST /users`), `GET /` y `GET /health` son públicos.
- Los demás endpoints requieren
  `Authorization: Bearer <accessToken>`.
- Configure `AUTH_JWT_SECRET` con un secreto aleatorio de al menos 32
  caracteres y `AUTH_JWT_EXPIRES_IN_SECONDS` para definir la vigencia.

Los servicios de grooming, boarding y cleaning requieren un carnet PDF vigente.
Las reservas validan pertenencia de la mascota, modalidad a domicilio,
coordenadas dentro de Bolivia, disponibilidad, capacidad y promociones
nacionales/locales. Las reservas online pendientes no ocupan capacidad ni son
visibles para el proveedor; al aprobarse el pago se confirma la reserva y se
publica un evento local idempotente para crear las notificaciones del cliente y
del operador del proveedor. Además, MySQL impide por trigger que una reserva
online llegue a `confirmed`, `in-progress` o `completed` si su pago no está
`paid`. La dirección de un domicilio se oculta al proveedor hasta que la
reserva esté confirmada.

## Integraciones simuladas

`payments/mock` y el pago de una reserva generan referencias `MOCK-*`; no
contactan una pasarela. `maps/geocode` consulta Google Maps mediante la clave
de servidor y limita el resultado a Bolivia. Las notificaciones de
confirmación, rechazo y finalización se guardan localmente y se entregan con el
canal `mock-push`.

La autenticación utiliza JWT y verifica las contraseñas contra hashes scrypt.
El guard valida el token en cada endpoint protegido. Las políticas de
propiedad para mascotas, promociones y reservas se aplican en la capa de
aplicación. Los carnets PDF se almacenan como BLOB privado en MySQL; nunca se
incluyen en las respuestas normales.
