# Arquitectura del backend

PetCare implementa un monolito modular para los bounded contexts de identidad,
mascotas, proveedores, promociones, mapas, notificaciones y Payment. Booking
se despliega como un microservicio con una base MySQL propia:

```text
src/modules/
├── booking-context/
├── payment/
├── user/
├── pet/
├── provider/
├── notification/
├── promotion/
├── map/
├── system/
└── shared-kernel/
```

`src/app.module.ts` realiza únicamente la composición Nest y registra la
conexión global de TypeORM. La API, Swagger y los middlewares siguen
inicializándose desde `src/main.ts`. El frontend consume únicamente
`api-gateway`; este enruta las rutas públicas hacia el backend o
`booking-service`.

## Capas dentro de cada módulo

Cada módulo de negocio conserva las capas DDD definidas previamente:

- `presentation`: controladores REST y DTOs de entrada.
- `application`: casos de uso y coordinación de agregados mediante puertos.
- `domain`: entidades, agregados, objetos de valor, servicios, eventos y
  contratos de repositorio.
- `infrastructure`: adaptadores TypeORM, gateways externos y detalles
  tecnológicos.

La dependencia esperada es:

```text
presentation -> application -> domain
                      |
                      v
                 infrastructure
```

El dominio no conoce NestJS, HTTP, MySQL ni TypeORM. La aplicación depende de
interfaces; la infraestructura implementa esas interfaces.

## Módulos del diagrama

- `booking-context`: contrato HTTP interno que compone el contexto necesario
  para cotizar y validar una reserva.
- `payment`: agregado de pagos, intenciones y contratos internos de checkout.
- `user`: agregado de usuarios, roles, registro, login, JWT y hash scrypt.
- `pet`: agregado de mascotas y registros de vacunación.
- `provider`: agregado de proveedores, servicios, horarios y disponibilidad.
- `notification`: notificaciones por usuario y persistencia asociada.
- `promotion`: promociones nacionales/locales y tipos de servicio.
- `shared-kernel`: errores de dominio, tipos, eventos base, value objects,
  utilidades de aplicación y configuración/persistencia transversal.

`map` encapsula el caso de uso de geolocalización y su gateway. `system`
encapsula el health check y el adaptador de disponibilidad de TypeORM; ambos
son módulos técnicos de soporte del backend y no agregados de negocio
adicionales del diagrama.

## Comunicación entre módulos

Los módulos Nest exponen únicamente los contratos o servicios que otros
módulos necesitan. Por ejemplo:

- `booking-service` consume el contrato interno de contexto y Payment de este
  backend; el frontend le envía quote, creación, consulta, estados y checkout a
  través de `api-gateway`.
- `provider` consume el endpoint interno de disponibilidad de
  `booking-service`.
- `pet` y `notification` consumen el contrato de usuarios.
- `user` consume el contrato de proveedores para crear el perfil de proveedor y
  enriquecer el JWT.

Esta composición mantiene el backend monolítico desplegable como una sola
aplicación y deja Booking aislado como microservicio, sin FK hacia otros
bounded contexts.
Los ciclos de composición estrictamente necesarios para disponibilidad y
registro se expresan con `forwardRef`; no se trasladan al dominio.

## Persistencia

Las entidades ORM viven junto al módulo que posee el agregado:

```text
src/modules/<module>/infrastructure/persistence/entities
src/modules/<module>/infrastructure/persistence/repositories
```

La configuración global, `DataSource`, migraciones y seeds están en:

```text
src/modules/shared-kernel/infrastructure/persistence
```

TypeORM descubre las entidades de todos los módulos mediante un patrón común.
El esquema usa `synchronize=false`, migraciones explícitas, claves foráneas,
índices, restricciones y TLS verificable para MySQL.

## Seguridad y HTTP

El `JwtAuthGuard` pertenece al módulo `user` y se registra como guard global.
`api-gateway` valida el JWT público y propaga claims internos mediante un
secreto exclusivo entre servicios. Backend y Booking aceptan únicamente esa
identidad de gateway en sus rutas públicas protegidas. `@Public()` deja
explícitos los endpoints sin autenticación. Los errores de dominio se traducen
a HTTP mediante
`shared-kernel/presentation/http/filters/DomainExceptionFilter`.

La API se sirve bajo `/api` y Swagger bajo `/api-docs`.
