# Diagramas C4 - PetCare Home Services

Los diagramas C4 están disponibles en Mermaid y PlantUML.

## Niveles

- `01-system-context.mmd`: actores y dependencias externas del sistema.
- `02-containers.mmd`: frontend, API Gateway, servicios, bases write/read,
  RabbitMQ y mapas.
- `03-components.puml`: outbox de contexto, Booking CQRS, tokenización mock,
  Saga durable y procesamiento Payment asíncrono.
- `03-components.png`: render generado de `03-components.puml`. Debe
  regenerarse después de cambiar la fuente; la fecha del archivo permite
  detectar si quedó desactualizado.

## Visualizar

Los archivos pueden visualizarse en Mermaid Live Editor, GitHub, GitLab,
Mermaid Chart o VS Code con una extensión Mermaid. También pueden integrarse
en Markdown usando:

````markdown
```mermaid
<!-- contenido de uno de los archivos .mmd -->
```
````

Para validar y regenerar el artefacto PlantUML desde este directorio:

```bash
plantuml -failfast2 -tpng 03-components.puml
```

El comando requiere un runtime Java y acceso al `!include` C4 remoto. No se debe
considerar actualizado `03-components.png` si su fecha es anterior a la fuente.

## Decisiones representadas

- El frontend consume únicamente el API Gateway. El gateway enruta booking,
  catálogo y checkout a `booking-service`; no existe acceso frontend directo a
  servicios internos.
- `petcare-backend` publica eventos `context.*.vN` mediante outbox transaccional.
  Booking los consume con inbox idempotente y mantiene una base MySQL
  read/context separada y eventualmente consistente.
- Booking crea primero una reserva provisional en su write DB y publica
  `booking.requested` mediante outbox. Calcula importe y valida contexto
  server-side; el cliente no impone total, `paymentId` ni estados.
- El tokenizador mock vive en memoria. PAN, CVV y vencimiento nunca se
  persisten, registran ni publican; el único valor permitido fuera de la
  llamada es un token con forma `mock_tok`.
- `orchestration-service` inicia una Saga durable al consumir
  `booking.requested`. Encola `payment.intent.create` y luego
  `payment.capture-token` o `payment.confirm-at-location`.
- Payment en `petcare-backend` consume comandos asíncronos con inbox, persiste
  el resultado y la respuesta en un outbox en la misma transacción, y publica
  la respuesta a RabbitMQ. No hay llamada HTTP síncrona Booking→Payment.
- Booking consume `booking.confirm` de forma idempotente, confirma el agregado
  y actualiza su modelo CQRS de lectura.
- Todos los consumidores usan identificador de mensaje/correlación, inbox,
  retries con backoff y DLQ. La entrega es al menos una vez y los efectos son
  idempotentes.
- La arquitectura acepta consistencia eventual: catálogo/contexto y estado de
  consulta pueden retrasarse respecto de sus fuentes. La API expone el estado
  provisional mientras la Saga sigue en curso.
- El login actual sigue en `petcare-backend`; el gateway lo enruta y valida el
  JWT para el resto de rutas. Esta es una limitación vigente, no un servicio de
  identidad desacoplado.

## Documentación operativa

- `../../docs/architecture/resilient-booking-flow.md`: contratos, límites,
  garantías e invariantes del flujo aprobado.
- `../../docs/runbooks/resilient-booking-migration.md`: migración, backfill,
  despliegue, métricas y pruebas de fallo/recuperación.
