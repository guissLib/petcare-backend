# Arquitectura del backend

El backend sigue una arquitectura por capas con el dominio en el centro,
aplicando patrones tácticos de DDD: entidades, objetos de valor, agregados,
servicios de dominio y repositorios definidos como contratos.

```text
presentation/http -> application -> domain
                         |
                         v
                  infrastructure
```

## Dominio

La carpeta está organizada por responsabilidad táctica:

- `src/domain/entities`: entidades y agregados.
- `src/domain/value-objects`: valores inmutables como `Email` y `Money`.
- `src/domain/repositories`: contratos de persistencia por agregado.
- `src/domain/services`: reglas que coordinan más de una entidad.
- `src/domain/events`: eventos generados por los agregados, listos para una
  futura publicación.
- `src/domain/shared`: tipos y errores compartidos.

Las entidades de `src/domain/entities` representan los límites del negocio:

- `users`: agregado de usuario y roles `pet-owner`, `provider` y
  `administrator`.
- `pets`: agregado de mascota y sus registros de vacunación.
- `providers`: proveedor, tipos de proveedor, servicios y disponibilidad.
- `bookings`: reserva, transiciones de estado y políticas de validación.
- `payments`: pago y valor monetario.
- `promotions`: promociones nacionales o locales.
- `notifications`: notificaciones asociadas al ciclo de una reserva.

`Booking` y `Payment` acumulan sus eventos de dominio y los exponen mediante
`pullDomainEvents()`, manteniendo la futura mensajería fuera del agregado.

Las entidades, objetos de valor (`Email`, `Money`) y servicios de dominio no
conocen NestJS, MySQL ni HTTP. Las reglas de vacunación, capacidad,
disponibilidad, pertenencia de mascotas y modalidades de visita se ejecutan
antes de persistir.

## Aplicación

Los servicios de `src/application` implementan casos de uso y coordinan
agregados mediante interfaces de repositorio. Los símbolos de repositorio y
gateway son puertos; esto permite cambiar la tecnología sin cambiar las reglas
del dominio.

El caso de uso de autenticación verifica las credenciales mediante el puerto
`PasswordHasher` y emite tokens JWT. La autorización fina por rol y por
recurso puede crecer sobre el `AuthenticatedUser` que el guard agrega a la
petición.

## Infraestructura

`src/infrastructure` contiene:

- entidades ORM y repositorios TypeORM que adaptan MySQL a entidades de dominio;
- migraciones versionadas y seeds idempotentes;
- configuración de conexión MySQL con TLS verificable;
- gateways mock para pagos y geocodificación.

El dominio permanece libre de decoradores TypeORM. Las colecciones que forman
parte de un agregado se normalizan en tablas de detalle (`pet_vaccinations`,
`provider_services`, `provider_schedules` y `promotion_service_types`) y las
relaciones entre agregados se protegen con claves foráneas, índices y
restricciones de unicidad. La aplicación no usa `synchronize` ni hace fallback
silencioso a memoria cuando MySQL no está disponible.

Las contraseñas se almacenan como hashes scrypt en `users.password_hash`. El
secreto y la vigencia de los JWT se configuran mediante variables de entorno;
los endpoints HTTP protegidos requieren un token Bearer válido.

## HTTP y documentación

Los componentes HTTP están en `src/presentation/http`, organizados por tipo:

- `controllers`: controladores REST de cada caso de uso.
- `dtos`: contratos de entrada documentados con Swagger.
- `filters`: traducción de errores de dominio a respuestas HTTP.

La API se sirve bajo `/api` y Swagger bajo `/api-docs`. Los errores de reglas
de negocio se traducen a respuestas HTTP mediante `DomainExceptionFilter`.
