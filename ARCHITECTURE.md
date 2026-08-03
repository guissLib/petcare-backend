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
│   ├── ports/          # contratos que necesita la aplicación
│   ├── petcare-store.service.ts
│   └── petcare.application.service.ts
├── infrastructure/
│   └── persistence/    # implementación MySQL
└── interfaces/
    └── http/           # adaptador REST y Swagger
```

## Flujo de una petición

`HTTP Controller → Application Service → Domain Service → Store → Persistence`

El controlador solamente traduce HTTP. La fachada de aplicación coordina los
dominios y cada servicio de dominio aplica sus reglas. La persistencia se
consume mediante `PetcarePersistence`, por lo que MySQL puede reemplazarse sin
modificar los dominios.

## Compatibilidad

Los archivos antiguos en `src/petcare.service.ts`, `src/petcare.controller.ts`,
`src/petcare.types.ts` y `src/mysql-persistence.service.ts` son adaptadores de
compatibilidad que reexportan las implementaciones nuevas. Esto evita romper
imports existentes mientras se adopta la nueva estructura.
