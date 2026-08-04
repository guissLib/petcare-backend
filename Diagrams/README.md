# Diagramas C4 - PetCare Home Services

Los diagramas están escritos en Mermaid usando la sintaxis C4 integrada.
Representan la arquitectura actual del backend NestJS organizado por paquetes
de dominio y su integración con el frontend Next.js.

## Niveles

- `01-system-context.mmd`: actores, frontend web, backend y MySQL/Aiven.
- `02-containers.mmd`: interfaz HTTP, fachada de aplicación, dominios, store,
  puertos y adaptadores de persistencia/eventos.
- `03-components.mmd`: componentes de cada capa y relaciones entre dominios.

## Flujo de pagos y reservas

```text
PetCare Web → Payments Domain → Event Bus → Bookings Consumer
                                      ↓              ↓
                                CloudAMQP       Bookings Domain
```

El frontend solicita primero el pago. Cuando queda confirmado, Payments publica
`payment.confirmed`; el consumidor entrega el evento a Bookings, que valida y
crea la reserva. Payments y Bookings no se invocan directamente.

## Persistencia

```text
Domain Packages → PetCare Store → Persistence Port → MySQL Adapter → MySQL
```

Si MySQL no está habilitado o no está disponible, `PetCareStoreService` mantiene
el estado en memoria y la API continúa funcionando en modo `in-memory-mock`.

## Visualizar

Los archivos pueden visualizarse en Mermaid Live Editor, GitHub, GitLab,
Mermaid Chart o VS Code con una extensión Mermaid. También pueden integrarse
en Markdown usando:

````markdown
```mermaid
<!-- contenido de uno de los archivos .mmd -->
```
````

## Decisiones representadas

- La API REST se limita al adaptador `interfaces/http`.
- `PetcareApplicationService` funciona como fachada estable para los casos de
  uso.
- Cada capacidad del negocio vive en su paquete de dominio: usuarios,
  mascotas, proveedores, promociones, reservas, notificaciones, pagos y mapas.
- `PetcarePersistence` es un puerto; `MysqlPersistenceService` es su adaptador
  de infraestructura.
- `PetcareEventBus` es un puerto; `CloudAmqpEventBusService` implementa el
  transporte RabbitMQ de CloudAMQP.
- MySQL utiliza la tabla `petcare_state` y se activa mediante
  `MYSQL_ENABLED=true`.
- El evento `payment.confirmed` usa una cola durable y se procesa con
  idempotencia por `payment.id`.
- Los errores permanentes se envían a una cola dead-letter y los errores
  transitorios tienen un máximo configurable de reintentos.
- Pagos, geocodificación y notificaciones siguen siendo implementaciones mock
  dentro de sus dominios, sin llamadas a proveedores externos.
