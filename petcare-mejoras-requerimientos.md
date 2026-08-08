# Prompt para Cursor

Actúa como un **Analista Funcional Senior** y traduce los siguientes requerimientos de negocio en una implementación técnica completa dentro del proyecto existente.

Tu objetivo es analizar el código actual, identificar dónde deben realizarse los cambios e implementar las funcionalidades respetando la arquitectura y las convenciones del proyecto. Antes de desarrollar, comprende el flujo existente para evitar duplicidad de lógica o regresiones.

## Requerimientos Funcionales

### 1. Gestión de Promociones Simples por Proveedor

#### Historia de Usuario (Proveedor)

Como proveedor de servicios, quiero poder crear promociones de descuento aplicables a mis propios servicios, para incentivar a los clientes a reservar conmigo.

#### Historia de Usuario (Cliente)

Como cliente, quiero ver si un proveedor tiene promociones activas al consultar sus servicios, para aprovechar el mejor precio.

#### Reglas de Negocio

* Un proveedor únicamente puede crear promociones para los servicios que le pertenecen.
* Cada promoción debe contener:

  * Nombre de la promoción.
  * Tipo de descuento:

    * Porcentaje.
    * Monto fijo.
* No existe flujo de aprobación por parte de la plataforma.
* La promoción debe quedar activa inmediatamente después de ser guardada.
* Durante el proceso de reserva, el cliente debe visualizar:

  * El precio original tachado.
  * El precio final con el descuento aplicado.
* El descuento debe aplicarse únicamente cuando exista una promoción activa para el servicio.

#### Criterios de Aceptación

* El proveedor solo visualiza y administra promociones de sus propios servicios.
* No es posible crear promociones para servicios de otros proveedores.
* El precio con descuento debe calcularse correctamente según el tipo de promoción.
* El cliente siempre debe visualizar ambos precios antes de confirmar la reserva.

---

## 2. Registro de Dirección para Servicios a Domicilio

### Historia de Usuario

Como cliente que solicita un servicio a domicilio, quiero registrar mi ubicación exacta en un mapa para que el proveedor conozca el lugar donde debe prestar el servicio.

### Reglas de Negocio

* Cuando el cliente seleccione la modalidad **A domicilio** durante la reserva:

  * Debe mostrarse un mapa interactivo.
  * La búsqueda y navegación del mapa debe limitarse geográficamente a Bolivia.
* El usuario debe poder mover un marcador (pin) para seleccionar su ubicación.
* Deben almacenarse obligatoriamente:

  * Latitud.
  * Longitud.
  * Referencia escrita.
* Ejemplo de referencia:

  * "Casa de portón negro".
* La dirección completa únicamente debe estar disponible para el proveedor cuando la reserva haya sido confirmada.

### Criterios de Aceptación

* El mapa aparece únicamente para reservas a domicilio.
* No puede finalizarse la reserva sin coordenadas válidas.
* La referencia escrita es editable por el cliente.
* El proveedor no puede visualizar la ubicación antes de la confirmación de la reserva.

---
## 3. Carga de Carnet de Vacunación

### Historia de Usuario

Como dueño de una mascota, quiero tener la opción de subir el carnet de vacunación de mi mascota a su perfil para poder cumplir con los requisitos de determinados servicios cuando sea necesario.

### Reglas de Negocio

* Dentro de la sección **Perfil de la Mascota** existirá la opción **"Subir Carnet de Vacunación"**.
* La carga del carnet de vacunación **no es obligatoria** para crear una mascota ni para utilizar la plataforma.
* El sistema únicamente permitirá cargar archivos en formato **PDF**.
* Si el usuario intenta subir un archivo en otro formato (JPG, PNG, DOC, etc.), mostrará el siguiente mensaje:

  > **"Formato no válido. Por favor, suba el documento únicamente en formato PDF."**
* El documento deberá quedar asociado exclusivamente al perfil de la mascota seleccionada y no al perfil del propietario.

### Criterios de Aceptación

* El usuario puede registrar una mascota sin adjuntar un carnet de vacunación.
* El usuario puede cargar o actualizar posteriormente el carnet desde el perfil de la mascota.
* Solo se aceptan archivos en formato PDF.
* El documento queda asociado únicamente a la mascota correspondiente.

---

## 4. Validación Obligatoria para Servicios que Requieren Vacunación

### Historia de Usuario

Como plataforma, quiero exigir que las mascotas cuenten con un carnet de vacunación registrado únicamente cuando el cliente desee reservar servicios que requieran este requisito, garantizando el bienestar de los animales.

### Reglas de Negocio

* La plataforma clasificará los servicios en dos categorías:

  * **Estándar**
  * **Requiere Vacunación**
* Inicialmente, los siguientes servicios pertenecerán a la categoría **Requiere Vacunación**:

  * Guardería
  * Limpieza
  * Peluquería
* Cuando el cliente intente reservar un servicio clasificado como **Requiere Vacunación**, el sistema verificará si la mascota seleccionada tiene un carnet de vacunación en formato PDF asociado.
* Si el documento existe, el flujo de reserva continuará con normalidad.
* Si el documento no existe:

  * Se impedirá completar la reserva.
  * El botón **Confirmar Reserva** permanecerá deshabilitado o la acción será bloqueada.
  * Se mostrará el siguiente mensaje:

    > **"Para este servicio es obligatorio adjuntar el carnet de vacunación."**
  * La alerta deberá incluir un botón de acceso directo que redirija al usuario a la pantalla **"Subir Carnet de Vacunación"** de la mascota seleccionada.

### Criterios de Aceptación

* Los servicios clasificados como **Estándar** pueden reservarse sin carnet de vacunación.
* Los servicios clasificados como **Requiere Vacunación** no pueden confirmarse si la mascota no tiene un carnet registrado.
* El usuario puede completar la reserva inmediatamente después de cargar correctamente el carnet.
* La validación se realiza utilizando la mascota seleccionada para la reserva y no la cuenta del propietario.
