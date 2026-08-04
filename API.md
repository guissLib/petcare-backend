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
La documentación interactiva Swagger queda disponible en
`http://localhost:3000/docs` y el contrato OpenAPI JSON en
`http://localhost:3000/docs/openapi.json`.

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
- `POST /payments` para iniciar un pago y solicitar una reserva
- `GET /bookings?paymentId=`, `GET /bookings`, `GET /bookings/:bookingId`
- `PATCH /bookings/:bookingId/status` con `confirmed`, `rejected`, `in-progress`,
  `completed` o `cancelled`
- `POST /bookings/:bookingId/reminder`
- `GET /promotions`, `POST /promotions`
- `POST /maps/geocode`
- `GET /users/:userId/notifications`
- `POST /users/:userId/bookings` se mantiene como ruta de compatibilidad
- `POST /payments/mock`

Los servicios de veterinaria y boarding requieren al menos una vacuna vigente.
El frontend debe enviar primero `POST /payments` con los datos de la reserva
embebidos. Cuando el pago online queda confirmado, el backend publica el evento
`payment.confirmed`; el consumidor de reservas valida la mascota, modalidad,
disponibilidad, capacidad y promociones, y crea la reserva de forma asíncrona.

Ejemplo de solicitud:

```json
{
  "amount": 45000,
  "method": "online",
  "booking": {
    "userId": "user_123",
    "petId": "pet_123",
    "providerId": "provider_centro",
    "serviceType": "grooming",
    "visitMode": "at-location",
    "scheduledAt": "2030-01-01T10:00:00.000Z"
  }
}
```

La respuesta contiene `bookingStatus: "queued"` y el frontend puede consultar
`GET /bookings?paymentId=<payment-id>` hasta que el consumidor confirme la
reserva.

## Integraciones simuladas

`payments` y `payments/mock` generan referencias `MOCK-*`; no contactan una
pasarela de pago real. `maps/geocode` devuelve coordenadas determinísticas
simuladas. Las notificaciones de confirmación, rechazo y finalización se
guardan localmente y se entregan con el canal `mock-push`.

## CloudAMQP

Configure `CLOUDAMQP_URL` o `AMQP_URL` en `.env`. El backend crea un exchange
`petcare.events`, una cola durable y publica `payment.confirmed` con mensajes
persistentes. Si no se configura CloudAMQP, se usa un bus local únicamente para
desarrollo.

Los errores permanentes de negocio, como `Usuario no encontrado`, no se
reintentan indefinidamente: el evento se confirma y se mueve a
`AMQP_DEAD_LETTER_QUEUE`. Los errores transitorios se reintentan hasta
`AMQP_MAX_RETRIES` veces.

Para producción se deben sustituir los adaptadores mock de pago, mapas y
notificaciones, además de agregar autenticación/autorización y almacenamiento
de archivos.
