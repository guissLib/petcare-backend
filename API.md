# PetCare Home Services API

API REST NestJS para reservas de servicios de mascotas. Por defecto usa memoria
para desarrollo; puede activar persistencia MySQL mediante las variables de
`.env.example`.

## Ejecución

```bash
npm install
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api`.

## MySQL

1. Cree la base de datos y un usuario con permisos sobre ella.
2. Copie `.env.example` a `.env` y configure sus credenciales.
3. Cambie `MYSQL_ENABLED=true`.

La aplicación crea automáticamente `petcare_state`, una tabla con el estado
persistido en JSON. La capa está aislada en `MysqlPersistenceService`; esto
permite reemplazarla posteriormente por entidades relacionales y migraciones
sin acoplar el dominio al driver.

## Recursos

Todos los cuerpos usan JSON. Los endpoints principales son:

- `POST /users`, `GET /users`
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
- `POST /payments/mock`

Los servicios de veterinaria y boarding requieren al menos una vacuna vigente.
Las reservas validan pertenencia de la mascota, modalidad a domicilio,
disponibilidad, capacidad y promociones nacionales/locales.

## Integraciones simuladas

`payments/mock` y el pago de una reserva generan referencias `MOCK-*`; no
contactan una pasarela. `maps/geocode` devuelve coordenadas determinísticas
simuladas. Las notificaciones de confirmación, rechazo y finalización se
guardan localmente y se entregan con el canal `mock-push`.

Para producción se debe sustituir `PetcareService` por repositorios persistentes,
autenticación/autorización, almacenamiento de archivos y adaptadores reales de
pagos, mapas y notificaciones.
