# Diagramas C4 - PetCare Home Services

Los diagramas C4 están disponibles en Mermaid y PlantUML.

## Niveles

- `01-system-context.mmd`: actores y dependencias externas del sistema.
- `02-containers.mmd`: frontend, backend NestJS, MySQL y mapas.
- `03-components.mmd`: módulos principales del monolito modular NestJS y el
  flujo asíncrono de confirmación de pagos.
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
- La aplicación expone la API y Swagger bajo `/api-docs` a través del backend.
- El login emite JWT, el guard protege los endpoints y las contraseñas se
  verifican contra hashes scrypt.
- Cada módulo de negocio contiene internamente `presentation`, `application`,
  `domain` e `infrastructure`; `src/app.module.ts` solo realiza la composición.
- Payment publica `payment.confirmed` en RabbitMQ/CloudAMQP después de persistir
  un pago aprobado; Booking consume el mensaje y confirma la reserva de forma
  idempotente antes de notificar al proveedor.
