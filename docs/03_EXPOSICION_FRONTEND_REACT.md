# 💻 Guía de Exposición: Frontend en React (`src/`)

Esta guía explica cómo presentar la **Capa de Presentación (SPA en React + Vite + Bootstrap)**, destacando su modularidad, el manejo de sesión JWT de 5 minutos, la validación en cliente y el módulo de reportes con exportación a PDF y Excel.

---

## 1. Apertura: Organización y Arquitectura Modular
> **💡 Qué decir al empezar:**
> *"El frontend está desarrollado en React con Vite y Bootstrap 5, organizado por separación de responsabilidades en **páginas** (`src/page/`), **componentes modulares** (`src/components/`), **utilidades compartidas** (`src/utils/`) y un **cliente HTTP centralizado** (`src/api.js`) que gestiona automáticamente el token JWT y la expiración de sesión."*

### Estructura de Carpetas
```text
src/
├── api.js                       # Cliente fetch centralizado + manejo de JWT y expiración (5 min)
├── App.jsx                      # Controla sesión activa, temporizador de 5 min y alterna Login/Dashboard
├── App.css                      # Estilos generales, overlays y tarjetas
├── main.jsx                     # Punto de entrada de React + Bootstrap CSS
├── utils/
│   ├── validators.js            # Validaciones cruzadas en cliente (DNI, email, año, username)
│   └── exportReport.js          # Exportación nativa de reportes a PDF (jsPDF) y Excel (.xlsx)
├── page/
│   ├── Login.jsx                # Pantalla de inicio de sesión
│   └── Dashboard.jsx            # Panel principal de gestión + control visual de roles (ADMIN/BIBLIOTECARIO)
└── components/
    ├── common/                  # Componentes UI reutilizables en toda la app
    │   ├── ModalBase.jsx        # Ventana modal Bootstrap estándar
    │   ├── DataTable.jsx        # Tabla genérica configurable por columnas
    │   ├── SearchBar.jsx        # Buscador reutilizable con Enter y estado de carga
    │   ├── NavTabs.jsx          # Pestañas Bootstrap reutilizables
    │   ├── PersonaNombreFields.jsx # Par de inputs Nombre + Apellido reutilizado en formularios
    │   ├── SocioSelect.jsx      # Selector desplegable de socios
    │   └── CitaDelDia.jsx       # Componente propio que rota citas literarias en español por día
    ├── socios/                  # Subcomponentes de Socios (SocioTabla.jsx, SocioForm.jsx)
    ├── usuarios/                # Subcomponentes de Usuarios (UsuarioTabla.jsx, UsuarioForm.jsx, UsuarioBuscarDni.jsx)
    ├── libros/                  # Subcomponentes de Libros (LibroTabla.jsx, LibroForm.jsx)
    ├── autores/                 # Subcomponentes de Autores (AutorTabla.jsx, AutorForm.jsx)
    ├── Socios.jsx               # Gestión completa (CRUD) + estado + libros en préstamo
    ├── Usuario.jsx              # Gestión completa (CRUD) de empleados y roles (solo ADMIN)
    ├── Libros.jsx               # Gestión completa (CRUD) + búsqueda multicriterio + stock
    ├── Autores.jsx              # Gestión completa (CRUD) de autores
    ├── Prestamos.jsx            # Alta de préstamos seleccionando socio desde SocioSelect
    ├── Devoluciones.jsx         # Búsqueda de préstamos activos por DNI y registro de devolución
    ├── Pagos.jsx                # Control de cuotas pendientes/pagadas y cobro por socio
    └── Reportes.jsx             # Panel de estadísticas + 3 consultas SQL + exportar PDF / Excel
```

---

## 2. Puntos Clave para Explicar en la Exposición

### A. Cliente HTTP y Ciclo de Vida del JWT (`src/api.js` y `src/App.jsx`)
* **`guardarSesion()` y `obtenerTokenValido()`:** Al iniciar sesión en [Login.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/page/Login.jsx), se guarda en `localStorage` el `access_token`, los datos del usuario (`nombre_completo`, `rol`) y el instante exacto de vencimiento (`Date.now() + 300 * 1000` ms = 5 minutos).
* **Inyección automática del token (`apiRequest`):** Cada petición agrega `Authorization: Bearer <token>`. Si el backend responde `401 Unauthorized`, limpia `localStorage` y dispara el evento global `"sesion-expirada"`.
* **Cierre automático (`App.jsx`):** Un `useEffect` calcula `obtenerTiempoRestanteMs()` y programa un `setTimeout` para cerrar la sesión automáticamente al cumplirse los 5 minutos, redirigiendo al login.

### B. Panel Principal y Control de Roles en la UI (`src/page/Dashboard.jsx`)
* Muestra el saludo personalizado con `nombre_completo` y un badge con el **Rol** del usuario autenticado (`ADMIN` o `BIBLIOTECARIO`).
* **Diferencia visual según el rol:**
  * Si es `ADMIN`: ve el botón **Usuarios** y en **Libros** / **Autores** dispone de botones para agregar, editar y eliminar registros.
  * Si es `BIBLIOTECARIO`: no ve el módulo **Usuarios**, y en **Libros** / **Autores** accede en modo consulta/búsqueda, operando normalmente **Socios**, **Préstamos**, **Devoluciones**, **Pagos** y **Reportes**.
* Incluye el componente propio **[CitaDelDia.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/CitaDelDia.jsx)**, que selecciona de forma pseudoaleatoria una cita literaria en español distinta cada día a partir de la fecha del calendario.

### C. Reutilización y Modularidad (`src/components/common/`)
* **Por qué modularizamos:** Para evitar duplicar cientos de líneas de HTML Bootstrap entre módulos.
  * Todos los modales usan **[ModalBase.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/ModalBase.jsx)**, **[NavTabs.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/NavTabs.jsx)**, **[SearchBar.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/SearchBar.jsx)** y **[DataTable.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/DataTable.jsx)**.
  * **[PersonaNombreFields.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/PersonaNombreFields.jsx)** reutiliza la fila Nombre + Apellido en `SocioForm`, `UsuarioForm` y `AutorForm`.
  * **[SocioSelect.jsx](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/components/common/SocioSelect.jsx)** permite elegir al socio desde una lista desplegable sin tener que memorizar ni tipear su DNI (usado en `Prestamos` y `Pagos`).

### D. Validación Cruzada en el Cliente (`src/utils/validators.js`)
* Antes de enviar cualquier formulario al servidor (`SocioForm`, `UsuarioForm`, `LibroForm`), el cliente valida formato de DNI (`7–15` dígitos), correo electrónico, año (`1400–2100`), nombre de usuario sin espacios y campos obligatorios, coincidiendo exactamente con las validaciones Pydantic del backend.

### E. Módulo de Reportes y Exportación PDF / Excel (`Reportes.jsx` y `exportReport.js`)
* Al abrir **Reportes**, ejecuta en paralelo (`Promise.all`) las 4 peticiones asíncronas contra `/api/reportes/*`.
* Muestra 4 tarjetas KPI superiores (*Socios Activos*, *Ejemplares Disponibles*, *Préstamos Activos* y *Recaudación Total*) y 3 pestañas con las consultas SQL requeridas.
* **Exportación:**
  * **PDF (`exportarPDF`):** Genera el documento con `jsPDF` y `jspdf-autotable` (título, fecha/hora de generación y tabla estilizada).
  * **Excel (`exportarExcel`):** Genera un archivo `.xlsx` descargable usando SheetJS (`xlsx`).

---

## 3. Recorrido Sugerido para la Demo en Vivo (5 minutos)
1. **Login y Roles:** Ingresar primero como `admin` (`1234`) y mostrar el badge `Rol: ADMIN` y la Cita del día.
2. **CRUDs:** Mostrar el listado de **Socios** (donde se ve quién tiene libros en préstamo), editar un dato, y abrir **Libros** para mostrar cómo se asignan múltiples coautores (relación `N:M`) y **Autores**.
3. **Flujo transaccional (Stored Procedures):** Registrar un nuevo préstamo desde **Préstamos** eligiendo el socio desde el `<select>` → verificar en **Libros** que bajó el `stock_disponible` → ir a **Devoluciones**, buscar por DNI y devolverlo → confirmar que el stock volvió a subir.
4. **Reportes y Exportación:** Abrir **Reportes**, recorrer las 3 pestañas y descargar en vivo un **PDF** y un **Excel**.
5. **Seguridad:** Mostrar brevemente que un usuario con rol `BIBLIOTECARIO` no ve el botón **Usuarios** ni opciones de edición/borrado en el catálogo.

