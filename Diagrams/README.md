# Diagramas C4 - PetCare Home Services

Los diagramas están escritos en Mermaid usando la sintaxis C4 integrada.

## Niveles

- `01-system-context.mmd`: actores y dependencias externas del sistema.
- `02-containers.mmd`: API REST, dominio, persistencia y adaptadores.
- `03-components.mmd`: componentes principales del backend NestJS.

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

- MySQL es la persistencia opcional configurada mediante `MYSQL_ENABLED=true`.
- En modo local, el dominio usa almacenamiento en memoria.
- Pagos, geocodificación y notificaciones no contactan servicios externos:
  se representan como adaptadores mock internos.
- La aplicación expone la API y Swagger a través del mismo backend NestJS.
