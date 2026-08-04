# Arquitectura por dominios

El backend está organizado por paquetes de dominio. Cada dominio contiene la
lógica relacionada con una capacidad del negocio y no depende del controlador
HTTP.

```text
src/
├── domains/
│   ├── users/          # perfiles y acceso por correo
│   ├── pets/           # mascotas y vacunación
│   ├── providers/      # proveedores y disponibilidad
│   ├── promotions/     # promociones nacionales y locales
│   ├── bookings/       # reglas y ciclo de vida de reservas
│   ├── notifications/  # notificaciones de reservas
│   ├── payments/       # pagos mock
│   ├── maps/           # geocodificación mock
│   └── shared/         # tipos, estado inicial y utilidades comunes
├── application/
│   ├── consumers/      # consumidores de eventos de dominio
│   ├── ports/          # contratos de persistencia y eventos
│   ├── petcare-store.service.ts
│   └── petcare.application.service.ts
├── infrastructure/
│   ├── messaging/      # adaptador CloudAMQP/RabbitMQ
│   └── persistence/    # implementación MySQL
└── interfaces/
    └── http/           # adaptador REST y Swagger
```

## Flujo de una petición

Las peticiones de pago siguen este flujo:

`HTTP Controller → Payments Domain → Event Bus → Bookings Consumer → Bookings Domain`

La reserva no importa ni invoca el dominio de pagos. Una vez confirmado el
pago, `PaymentsDomainService` publica `payment.confirmed` y
`PaymentConfirmedConsumer` entrega el evento a `BookingsDomainService`.

Para operaciones síncronas de consulta, el flujo es:

`HTTP Controller → Application Service → Domain Service → Store → Persistence`

El controlador solamente traduce HTTP. La fachada de aplicación coordina los
dominios y cada servicio de dominio aplica sus reglas. La persistencia se
consume mediante `PetcarePersistence`, mientras que los eventos se publican
mediante `PetcareEventBus`. Ambos adaptadores pueden reemplazarse sin modificar
los dominios.

## Compatibilidad

Los archivos antiguos en `src/petcare.service.ts`, `src/petcare.controller.ts`,
`src/petcare.types.ts` y `src/mysql-persistence.service.ts` son adaptadores de
compatibilidad que reexportan las implementaciones nuevas. Esto evita romper
imports existentes mientras se adopta la nueva estructura.
