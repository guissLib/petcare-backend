# Diagramas C4 - PetCare Home Services

Los diagramas están escritos en Mermaid usando la sintaxis C4 integrada.
Representan la arquitectura actual del backend NestJS organizado por paquetes
de dominio y su integración con el frontend Next.js.

## Niveles

- `01-system-context.mmd`: actores, frontend web, backend y MySQL/Aiven.
- `02-containers.mmd`: interfaz HTTP, fachada de aplicación, dominios, store y
  puerto/adaptador de persistencia.
- `03-components.mmd`: componentes de cada capa y relaciones entre dominios.

## Flujo principal

```text
PetCare Web → HTTP Interface → Application Facade → Domain Packages
                                               ↓
                                         PetCare Store
                                               ↓
                                      Persistence Port
                                               ↓
                                      MySQL Adapter → MySQL
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
- MySQL utiliza la tabla `petcare_state` y se activa mediante
  `MYSQL_ENABLED=true`.
- Pagos, geocodificación y notificaciones siguen siendo implementaciones mock
  dentro de sus dominios, sin llamadas a proveedores externos.
