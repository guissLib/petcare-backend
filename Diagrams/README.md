# Diagramas C4 - PetCare Home Services

Los diagramas C4 están disponibles en Mermaid y PlantUML.

## Niveles

- `01-system-context.mmd`: actores y dependencias externas del sistema.
- `02-containers.mmd`: frontend, backend, Booking Service, sus bases de datos,
  RabbitMQ y mapas.
- `03-components.puml`: módulos del backend, componentes internos de Booking
  Service y el flujo asíncrono de confirmación de pagos.
- `03-components.puml` y `03-components.png`: versión C4 equivalente para
  PlantUML.

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

- La capa de dominio no depende de NestJS, MySQL ni de proveedores externos.
- La capa de aplicación coordina casos de uso y aplica las reglas entre
  agregados.
- Los contratos de repositorio y gateways viven como puertos; infraestructura
  los implementa con repositorios TypeORM y adaptadores mock.
- MySQL se administra mediante migraciones TypeORM, con
  `synchronize=false` y TLS verificable.
- El seed inicial crea el administrador, proveedores y promoción base de forma
  idempotente.
- El frontend consume directamente las rutas públicas del `booking-service`;
  el backend conserva únicamente los bounded contexts que le pertenecen y los
  contratos internos de contexto, disponibilidad y Payment.
- El login emite JWT, el guard protege los endpoints y las contraseñas se
  verifican contra hashes scrypt.
- Cada módulo de negocio contiene internamente `presentation`, `application`,
  `domain` e `infrastructure`; `src/app.module.ts` solo realiza la composición.
- Booking es dueño de su agregado y de su base MySQL privada, sin FK hacia
  usuarios, mascotas o proveedores de otros bounded contexts.
- Booking calcula el importe y valida el contexto server-side; el navegador no
  puede imponer `total`, `paymentId` ni estados.
- Payment crea y procesa intenciones únicamente mediante endpoints internos
  protegidos por secreto de servicio. Después de persistir Booking, publica
  `payment.confirmed` para evitar carreras de confirmación.
- Payment publica `payment.confirmed` en RabbitMQ/CloudAMQP después de persistir
  un pago aprobado; el orquestador envía `booking.confirm` y Booking confirma
  la reserva de forma idempotente antes de notificar al proveedor.
- `orchestration-service` coordina el proceso como una Saga: mantiene el
  estado y un outbox ACID, usa Booking como transacción pivote, compensa el
  pago con un reembolso si la reserva falla y reintenta las notificaciones.
