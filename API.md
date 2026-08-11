# PetCare Home Services API

API REST NestJS para usuarios, mascotas, proveedores, promociones y contratos
internos de Payment. Booking es un microservicio público independiente, dueño
del agregado y de su base MySQL. Ambos servicios usan TypeORM y migraciones
explícitas; el dominio no depende del ORM.

## Ejecución

```bash
npm install
npm run start:dev
```

La API queda disponible en `http://localhost:3005/api`.
La documentación interactiva Swagger queda disponible en
`http://localhost:3005/api-docs` y el contrato OpenAPI JSON en
`http://localhost:3005/api-docs/openapi.json`.

El microservicio de reservas se ejecuta por defecto en
`http://localhost:3011/api`; su Swagger está en
`http://localhost:3011/api-docs`. El navegador usa
`NEXT_PUBLIC_BOOKING_API_URL` para consumirlo directamente. Configure
`BOOKING_SERVICE_URL` y `BOOKING_INTERNAL_SECRET` en el backend para la
consulta interna de disponibilidad, y `PETCARE_BACKEND_URL` y
`PETCARE_SERVICE_SECRET` en `booking-service` para sus contratos internos de
contexto y Payment.

## MySQL

1. Cree la base de datos y un usuario con permisos sobre ella.
2. Copie `.env.example` a `.env` y configure sus credenciales.
3. Si el servidor requiere TLS con una CA privada, configure
   `MYSQL_SSL=true` y `MYSQL_SSL_CA` con la ruta del certificado CA.
4. Ejecute las migraciones:

```bash
npm run migration:run
```

Las tablas relacionales del backend se crean con `synchronize=false`; no se
modifica el esquema automáticamente al iniciar la aplicación. El runtime del
backend ya no carga ni escribe la entidad `bookings`; instalaciones históricas
pueden conservar esa tabla por las migraciones anteriores. La tabla activa de
reservas se crea en `booking-service` con
`cd booking-service && npm run migration:run`. Para cargar el administrador,
proveedores y promoción base configure las variables `ADMIN_SEED_*` y ejecute:

```bash
npm run seed:base
```

El seed es idempotente. La contraseña del administrador y la de todos los
usuarios nuevos se almacenan únicamente como hash scrypt. Si existe una tabla
`petcare_state` de una instalación anterior, la migración de compatibilidad
aplana sus datos antes de activar los repositorios relacionales.
La migración `1770000000009-add-payment-booking-id` conserva la asociación
entre las intenciones de Payment y `bookingId`; debe ejecutarse junto con las
migraciones del backend antes de levantar el flujo directo.

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
- `GET /promotions` consulta promociones aplicables; `POST /promotions` crea
  una promoción propia para el proveedor autenticado
- `GET /promotions/mine`, `PATCH /promotions/:promotionId` y
  `PATCH /promotions/:promotionId/status` administran promociones propias
- `scope: national` hace aplicable la promoción en cualquier ciudad; `scope:
local` exige `city` y solo aplica cuando coincide con la ciudad del cliente.
- `POST /maps/geocode`, `GET /maps/config`
- `GET /users/:userId/notifications`
- Payment no expone rutas públicas de pago. Sus rutas bajo
  `/internal/payments/*` requieren `x-petcare-service-secret` y solo se usan
  desde `booking-service`.

### Booking Service API

El frontend consume estas rutas directamente con el JWT del usuario:

- `POST /users/:userId/bookings/quote` calcula el precio en el servidor,
  validando mascota, proveedor, disponibilidad, vacunas y promociones.
- `POST /users/:userId/bookings` crea la reserva. Para `online` crea una
  intención de pago y deja la reserva en `pending` durante 30 minutos; para
  `at-location` conserva la confirmación inmediata.
- `GET /bookings`, `GET /bookings/:bookingId`
- `POST /bookings/:bookingId/payments/mock` procesa el checkout simulado.
  Después de persistir el pago y el estado local, Payment publica
  `payment.confirmed`; la reserva permanece `pending-confirmation` hasta que
  la Saga envía `booking.confirm`.
- `PATCH /bookings/:bookingId/status` y
  `POST /bookings/:bookingId/reminder` gestionan el ciclo operativo autorizado.

El servicio solo acepta orígenes configurados en `CORS_ORIGINS`. Nunca se
envían al navegador `PETCARE_SERVICE_SECRET`, `BOOKING_INTERNAL_SECRET` ni
otros secretos de infraestructura.

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
nacionales/locales. Las reservas online en `pending` no ocupan capacidad ni
son visibles para el proveedor. Tras el pago pasan a
  `pending-confirmation`, reservan la capacidad del horario, pero siguen ocultas
al proveedor hasta que la Saga solicite a Booking consumir el comando
  `booking.confirm` y la pase a `confirmed`. El evento de confirmación es
  idempotente y la notificación se ejecuta como transacción reintentable.
  Además, la base privada de Booking aplica restricciones de estado, pago,
  importes y ubicación. Si la transacción pivote de Booking falla, la Saga
  puede dejar el pago en `refunded` y la reserva en `cancelled`. La dirección de
  un domicilio se oculta al proveedor hasta que la reserva esté confirmada.

## Integraciones simuladas

`payments/mock` y el pago de una reserva generan referencias `MOCK-*`; no
contactan una pasarela. RabbitMQ/CloudAMQP transporta los eventos y comandos
de la Saga con colas durables y colas de mensajes fallidos. Si la confirmación
de Booking falla, la Saga solicita el reembolso del pago y la cancelación de la
reserva. `maps/geocode` consulta Google Maps mediante la clave
de servidor y limita el resultado a Bolivia. Las notificaciones de
confirmación, rechazo y finalización se guardan localmente y se entregan con el
canal `mock-push`.

La autenticación utiliza JWT y verifica las contraseñas contra hashes scrypt.
El guard valida el token en cada endpoint protegido. Las políticas de
propiedad para mascotas, promociones y reservas se aplican en la capa de
aplicación. Los carnets PDF se almacenan como BLOB privado en MySQL; nunca se
incluyen en las respuestas normales.
