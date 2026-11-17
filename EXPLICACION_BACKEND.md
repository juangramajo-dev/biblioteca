# Documentación Técnica del Backend: Sistema de Gestión de Biblioteca
**Cátedra:** Metodología de Sistemas II  
**Carrera:** Tecnicatura Universitaria en Programación  
**Tecnologías:** Python 3.10+ | FastAPI | SQLAlchemy 2.0 (Async) | aiomysql | MySQL / MariaDB | JWT | React 19  

---

## 1. Introducción y Arquitectura General

El backend de este proyecto fue desarrollado como una **API RESTful asíncrona**, diseñada para resolver de forma integral la gestión operativa de una biblioteca comunitaria o universitaria (administración de socios, catálogo bibliográfico, control de préstamos, cobranza de cuotas y reportes analíticos).

### ¿Cómo se comunican las tres capas del sistema? (Flujo End-to-End)

```
+-----------------------------------------------------------------------------------+
|                            CAPA DE CLIENTE (Frontend)                             |
| React 19 + Vite (SPA en http://localhost:5173)                                    |
| Componentes modulares -> Centralizador de peticiones HTTP: src/api.js             |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Peticiones HTTP asíncronas (fetch)
                                       | JSON + Headers ("Authorization: Bearer <token>")
                                       v
+-----------------------------------------------------------------------------------+
|                            CAPA DE SERVIDOR (Backend)                             |
| FastAPI en http://127.0.0.1:8000 (Asynchronous Server Gateway Interface - ASGI)  |
|                                                                                   |
|  1. Middleware CORS: Permite peticiones del origen de Vite.                       |
|  2. Enrutadores (/api/...): auth, socios, libros, autores, usuarios, préstamos,   |
|     pagos, reportes.                                                              |
|  3. Inyección de Dependencias:                                                    |
|     - Seguridad: `obtener_usuario_actual` (Valida JWT en cada petición).         |
|     - Base de Datos: `get_db` (Provee una sesión `AsyncSession` no bloqueante).   |
|  4. Esquemas Pydantic: Validación de tipos, DNI, fechas y sanitización.           |
|  5. Modelos ORM (SQLAlchemy Declarative Base).                                    |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Protocolo MySQL Asíncrono
                                       | Conexión no bloqueante vía driver `aiomysql`
                                       v
+-----------------------------------------------------------------------------------+
|                        CAPA DE PERSISTENCIA (Base de Datos)                       |
| MySQL / MariaDB (Motor InnoDB, Charset UTF-8)                                     |
|                                                                                   |
|  - 11 Tablas normalizadas con Integridad Referencial (ON UPDATE/DELETE CASCADE).  |
|  - Relación N:M en tabla intermedia `libro_autor` con clave compuesta.           |
|  - 2 Procedimientos Almacenados Transaccionales con COMMIT y ROLLBACK.            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Estructura de Archivos del Backend y Responsabilidades

El código del servidor reside dentro del directorio `backend/` y sigue una arquitectura modular en capas que separa la configuración, los modelos de datos, la validación y los controladores:

```text
backend/
├── requirements.txt            # Dependencias del entorno virtual
└── app/
    ├── __init__.py             # Inicializador del paquete Python
    ├── database.py             # Motor y fábrica de sesiones asíncronas
    ├── main.py                 # Punto de entrada de la aplicación FastAPI
    ├── models.py               # Modelos relacionales ORM (tablas de MySQL)
    ├── schemas.py              # Esquemas Pydantic (validación DTO y serialización)
    └── routers/                # Controladores agrupados por dominio
        ├── __init__.py
        ├── auth.py             # Autenticación, JWT y control de roles (RBAC)
        ├── socios.py           # CRUD de socios y vinculación con persona
        ├── usuarios.py         # CRUD de usuarios y permisos administrativos
        ├── libros.py           # Catálogo bibliográfico y gestión de ejemplares
        ├── autores.py          # CRUD de autores
        ├── prestamos.py        # Préstamos/devoluciones (Llamada a Stored Procedures)
        ├── pagos.py            # Registro de cobranzas y control de cuotas
        └── reportes.py         # Consultas analíticas SQL avanzadas y KPIs
```

### Detalle archivo por archivo:

1. **`backend/requirements.txt`**: Define las librerías necesarias para el proyecto:
   * `fastapi`: Framework web para construir la API REST.
   * `uvicorn[standard]`: Servidor ASGI de alto rendimiento.
   * `sqlalchemy[asyncio]`: ORM en su versión moderna 2.0 con soporte asíncrono.
   * `aiomysql` y `cryptography`: Driver asíncrono para comunicarse con MySQL/MariaDB sobre `asyncio`.
   * `greenlet`: Dependencia requerida por SQLAlchemy para ejecutar corrutinas sobre drivers nativos.
   * `pydantic`: Motor de validación de datos y tipado estricto.
   * `PyJWT`: Generación, firma y decodificación de tokens seguros JSON Web Token.

2. **`backend/app/database.py`**:
   * Configura la URL de conexión usando el esquema `mysql+aiomysql://root:@127.0.0.1:3306/biblioteca?charset=utf8mb4`.
   * Crea el motor asíncrono (`create_async_engine`) configurando `pool_pre_ping=True` (comprueba conexiones vivas antes de usarlas) y `pool_recycle=1800` (recicla sockets para evitar desconexiones por timeout de MySQL).
   * Define `AsyncSessionLocal` mediante `async_sessionmaker` para generar sesiones de base de datos aisladas por petición.
   * Define la función generadora `get_db()` utilizada como dependencia de FastAPI (`Depends(get_db)`): cada petición recibe su propia sesión asíncrona y, al finalizar, la cierra automáticamente liberando la conexión al pool.

3. **`backend/app/models.py`**:
   * Mapea las **11 tablas relacionales** de la base de datos a clases Python heredadas de `Base = declarative_base()`.
   * Implementa las relaciones bidireccionales (`relationship`) con carga configurada (`selectinload`), asegurando que al consultar un socio o un préstamo se traigan sus datos de `persona` y `libro` sin lanzar consultas redundantes.
   * Modela la tabla intermedia `libro_autor` con clave primaria compuesta `(id_libro, id_autor)` para soportar la relación Muchos a Muchos ($N:M$).

4. **`backend/app/schemas.py`**:
   * Contiene los esquemas DTO (Data Transfer Objects) divididos en dos grupos:
     * **Entrada (`*Create`, `*Update`)**: Validan que los datos ingresados por el usuario sean correctos antes de llegar a la base de datos.
     * **Salida (`*Out`, `*Response`)**: Definen la estructura JSON exacta que se envía de regreso al frontend, ocultando información sensible como la contraseña cifrada (`clave_hash`).
   * Contiene validadores personalizados con `@field_validator` (ej: verificar que el DNI contenga solo números de 7 a 15 dígitos o que el formato de email sea válido).

5. **`backend/app/main.py`**:
   * Instancia la aplicación `app = FastAPI(...)`.
   * Utiliza el gestor de ciclo de vida moderno `@asynccontextmanager def lifespan(app)` para crear automáticamente las tablas que falten al iniciar y cerrar el pool al apagar.
   * Agrega el middleware `CORSMiddleware` con `allow_origins=["*"]`, permitiendo que el cliente React (corriendo en `localhost:5173`, `5174`, etc.) consuma los endpoints sin bloqueo de navegadores.
   * Incluye todos los enrutadores (`include_router`) aplicando la inyección global de dependencias para proteger las rutas con JWT y roles administrativos.
   * Define un manejador de excepciones personalizado para `RequestValidationError` que formatea los errores de validación de Pydantic en mensajes legibles en español.

---

## 3. Conexión Asíncrona con MySQL (Requisito Técnico Fundamental)

### ¿Por qué asíncrono y qué problema resuelve?
En una aplicación web tradicional **síncrona** (bloqueante), cuando el servidor ejecuta una consulta lenta a MySQL, el hilo de ejecución queda esperando sin hacer nada hasta que la base de datos responda el último byte. Si muchos usuarios consultan al mismo tiempo, el servidor agota sus hilos y el sistema se congela.

FastAPI trabaja sobre el bucle de eventos (**Event Loop**) de Python. Al utilizar `create_async_engine`, `AsyncSession` y el driver **`aiomysql`**:
* Cada vez que se ejecuta una consulta con `await db.execute(...)` o `await db.commit()`, el hilo no se bloquea.
* La corrutina cede el control al Event Loop, permitiendo que el servidor atienda peticiones de otros usuarios mientras la base de datos procesa la consulta en disco.
* Esto optimiza drásticamente el rendimiento de Entrada/Salida (**I/O Bound**).

### Implementación en `database.py`:
```python
DATABASE_URL = "mysql+aiomysql://root:@127.0.0.1:3306/biblioteca?charset=utf8mb4"

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=1800)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 4. Seguridad, Autenticación JWT y Control de Acceso (RBAC)

El trabajo práctico exige un esquema obligatorio de seguridad basado en **JSON Web Tokens (JWT)** para la gestión de sesiones.

### A. Flujo de Login y Generación del Token
1. El usuario envía sus credenciales (`POST /api/auth/login`) con `{ "nombre_usuario": "admin", "clave": "1234" }`.
2. El backend busca al usuario en la base de datos y compara la clave aplicando la función de hashing `hash_password(plain_password)` usando SHA-256 (`hashlib.sha256`).
3. Si las credenciales coinciden, se firma un JWT codificado con el algoritmo simétrico `HS256`, incluyendo en su carga útil (*payload*):
   * `sub`: ID del usuario (`id_usuario`).
   * `username`: Nombre de usuario.
   * `rol`: Rol del usuario (`ADMIN` o `BIBLIOTECARIO`).
   * `iat`: Fecha y hora de emisión.
   * `exp`: Fecha y hora exacta de vencimiento (**5 minutos exactos** desde su emisión).
4. El servidor responde con el token, el tipo `bearer` y los datos del usuario.

### B. Validación en Cada Petición
Para las rutas protegidas, FastAPI ejecuta la dependencia `obtener_usuario_actual`:
```python
security = HTTPBearer()

async def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        id_usuario: str = payload.get("sub")
        if id_usuario is None:
            raise HTTPException(status_code=401, detail="Token de autenticación inválido.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Tu sesión de 5 minutos ha expirado. Por favor, volvé a iniciar sesión."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido o corrupto.")
    
    # Se recupera el usuario desde MySQL comprobando que siga activo
    usuario = await _buscar_usuario_activo(db, int(id_usuario))
    return usuario
```

### C. Control de Acceso Basado en Roles (RBAC)
Para proteger acciones sensibles (como crear o borrar otros usuarios del sistema), se utiliza la dependencia `requerir_admin`:
```python
async def requerir_admin(usuario_actual: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
    if usuario_actual.rol.nombre_rol.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Acceso denegado: esta acción requiere rol ADMIN.")
    return usuario_actual
```
En `main.py`, el router de usuarios queda blindado declarativamente:
```python
app.include_router(usuarios.router, dependencies=[Depends(requerir_admin)])
```

---

## 5. Integración con Stored Procedures Transaccionales (COMMIT y ROLLBACK)

El requisito técnico exige al menos un procedimiento almacenado transaccional que reciba parámetros y asegure la atomicidad de los datos. En este proyecto se implementaron **dos Stored Procedures en MySQL**, consumidos directamente por FastAPI:

### 1. `sp_registrar_prestamo`
* **Parámetros de entrada**: `p_id_socio`, `p_id_libro`, `p_id_usuario`, `p_fecha_prestamo`, `p_fecha_devolucion_pactada`, `p_observaciones`.
* **Parámetro de salida**: `p_id_prestamo_out`.
* **Lógica Transaccional**:
  1. `START TRANSACTION`: Inicia el bloque atómico.
  2. Declara un manejador de excepciones `DECLARE EXIT HANDLER FOR SQLEXCEPTION` que ante cualquier falla ejecuta automáticamente `ROLLBACK` y emite un `SIGNAL SQLSTATE '45000'`.
  3. Comprueba el estado del socio (debe estar `ACTIVO`).
  4. Bloquea la fila del libro para lectura concurrente con **`FOR UPDATE`** comprobando que `stock_disponible > 0`.
  5. Inserta el registro en la tabla `prestamo` con estado `'ACTIVO'`.
  6. Descuenta el stock del libro: `UPDATE libro SET stock_disponible = stock_disponible - 1`.
  7. Ejecuta `COMMIT` para consolidar los cambios en el disco de MySQL.

### 2. `sp_registrar_devolucion`
* **Parámetros**: `p_id_prestamo`, `p_fecha_devolucion_real`.
* **Lógica Transaccional**:
  1. Verifica que el préstamo exista y se encuentre en estado `'ACTIVO'`.
  2. Cambia el estado a `'DEVUELTO'` y registra la `fecha_devolucion_real`.
  3. Reintegra el ejemplar sumando stock: `UPDATE libro SET stock_disponible = stock_disponible + 1`.
  4. Ejecuta `COMMIT` o `ROLLBACK` en caso de error.

### ¿Cómo invoca FastAPI los Procedimientos Almacenados?
En `backend/app/routers/prestamos.py`, la API no ejecuta un simple `INSERT`, sino que delega la transacción al motor relacional mediante SQL crudo:

```python
try:
    await db.execute(
        text("""
            CALL sp_registrar_prestamo(
                :id_socio,
                :id_libro,
                :id_usuario,
                :fecha_prestamo,
                :fecha_devolucion_pactada,
                :observaciones,
                @id_prestamo_out
            )
        """),
        {
            "id_socio": socio.id_socio,
            "id_libro": libro.id_libro,
            "id_usuario": usuario_actual.id_usuario,
            "fecha_prestamo": datos.fecha_prestamo,
            "fecha_devolucion_pactada": datos.fecha_devolucion_pactada,
            "observaciones": datos.observaciones,
        }
    )
    # Recupera el ID autogenerado del parámetro OUT
    nuevo_id = (await db.execute(text("SELECT @id_prestamo_out"))).scalar()
    await db.commit()
except DBAPIError as exc:
    await db.rollback()
    # Captura el mensaje exacto generado por el SIGNAL SQLSTATE de MySQL
    raise HTTPException(status_code=400, detail=extraer_mensaje_sql(exc))
```

---

## 6. Las 3 Consultas SQL Complejas (Módulo de Reportes)

El archivo [backend/app/routers/reportes.py](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/backend/app/routers/reportes.py) implementa las tres consultas SQL exigidas por el trabajo práctico combinando `INNER JOIN`, subconsultas y agrupamientos `GROUP BY`:

### Consulta 1: INNER JOIN + GROUP BY (Demanda por Género)
* **Endpoint:** `GET /api/reportes/prestamos-por-genero`
* **Objetivo:** Determinar cuáles son las categorías literarias más solicitadas, discriminando entre préstamos activos, devueltos y socios únicos.
```sql
SELECT
    g.nombre AS genero,
    COUNT(p.id_prestamo) AS total_prestamos,
    SUM(CASE WHEN p.estado = 'ACTIVO' THEN 1 ELSE 0 END) AS prestamos_activos,
    SUM(CASE WHEN p.estado = 'DEVUELTO' THEN 1 ELSE 0 END) AS prestamos_devueltos,
    COUNT(DISTINCT p.id_socio) AS socios_distintos
FROM prestamo p
INNER JOIN libro l ON l.id_libro = p.id_libro
INNER JOIN genero g ON g.id_genero = l.id_genero
GROUP BY g.id_genero, g.nombre
ORDER BY total_prestamos DESC, g.nombre ASC;
```

### Consulta 2: INNER JOIN + Subconsultas (UNION/IN) + GROUP BY (Socios de Atención)
* **Endpoint:** `GET /api/reportes/socios-atencion`
* **Objetivo:** Detectar socios que tienen libros pendientes de devolución o cuotas adeudadas, calculando su saldo pendiente y su total histórico abonado mediante agregación condicional.
```sql
SELECT
    s.numero_socio,
    CONCAT(pe.nombre, ' ', pe.apellido) AS socio,
    pe.numero_documento AS dni,
    s.estado AS estado_socio,
    (
        SELECT COUNT(*)
        FROM prestamo pr
        WHERE pr.id_socio = s.id_socio AND pr.estado <> 'DEVUELTO'
    ) AS prestamos_activos,
    COALESCE(SUM(CASE WHEN pg.estado = 'PENDIENTE' THEN pg.monto ELSE 0 END), 0) AS deuda_pendiente,
    COALESCE(SUM(CASE WHEN pg.estado = 'PAGADO' THEN pg.monto ELSE 0 END), 0) AS total_abonado
FROM socio s
INNER JOIN persona pe ON pe.id_persona = s.id_persona
INNER JOIN pago pg ON pg.id_socio = s.id_socio
WHERE s.id_socio IN (
    SELECT pg2.id_socio FROM pago pg2 WHERE pg2.estado = 'PENDIENTE'
    UNION
    SELECT pr2.id_socio FROM prestamo pr2 WHERE pr2.estado <> 'DEVUELTO'
)
GROUP BY s.id_socio, s.numero_socio, pe.nombre, pe.apellido, pe.numero_documento, s.estado
ORDER BY deuda_pendiente DESC, prestamos_activos DESC;
```

### Consulta 3: INNER JOIN múltiple ($N:M$) + GROUP BY + Subconsulta con HAVING AVG (Libros Destacados)
* **Endpoint:** `GET /api/reportes/libros-destacados`
* **Objetivo:** Listar los libros cuya cantidad de préstamos supera el promedio general de la biblioteca, concatenando sus autores mediante la tabla intermedia `libro_autor`.
```sql
SELECT
    l.isbn,
    l.titulo,
    e.nombre AS editorial,
    g.nombre AS genero,
    GROUP_CONCAT(
        DISTINCT CONCAT(a.nombre, ' ', a.apellido)
        ORDER BY a.apellido
        SEPARATOR ', '
    ) AS autores,
    l.stock_disponible,
    l.stock_total,
    (
        SELECT COUNT(*)
        FROM prestamo pr
        WHERE pr.id_libro = l.id_libro
    ) AS veces_prestado
FROM libro l
INNER JOIN editorial e ON e.id_editorial = l.id_editorial
INNER JOIN genero g ON g.id_genero = l.id_genero
INNER JOIN libro_autor la ON la.id_libro = l.id_libro
INNER JOIN autor a ON a.id_autor = la.id_autor
GROUP BY l.id_libro, l.isbn, l.titulo, e.nombre, g.nombre, l.stock_disponible, l.stock_total
HAVING veces_prestado >= (
    SELECT COALESCE(AVG(cnt), 0)
    FROM (
        SELECT COUNT(*) AS cnt
        FROM prestamo
        GROUP BY id_libro
    ) AS promedio_prestamos
)
ORDER BY veces_prestado DESC, l.titulo ASC;
```

---

## 7. Catálogo Completo de Endpoints y Rutas de la API

La API cuenta con más de 25 endpoints REST clasificados por dominio:

| Módulo | Método | Ruta | Descripción | Seguridad |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Autentica usuario y devuelve JWT de 5 min | Pública |
| **Auth** | `GET` | `/api/auth/me` | Retorna los datos del usuario logueado actual | Requiere JWT |
| **Socios** | `GET` | `/api/socios` | Lista socios con búsqueda por nombre/DNI | Requiere JWT |
| **Socios** | `GET` | `/api/socios/{id}` | Obtiene detalle de un socio particular | Requiere JWT |
| **Socios** | `POST` | `/api/socios` | Crea nueva persona y socio (Alta) | Requiere JWT |
| **Socios** | `PUT` | `/api/socios/{id}` | Modifica datos del socio y persona | Requiere JWT |
| **Socios** | `DELETE`| `/api/socios/{id}` | Da de baja o elimina al socio | Requiere JWT |
| **Libros** | `GET` | `/api/libros` | Catálogo de libros con stock y autores | Requiere JWT |
| **Libros** | `GET` | `/api/libros/catalogos` | Listas de editoriales, géneros y autores | Requiere JWT |
| **Libros** | `GET` | `/api/libros/{id}` | Detalle de un libro específico | Requiere JWT |
| **Libros** | `POST` | `/api/libros` | Alta de libro vinculando autores ($N:M$) | Requiere JWT |
| **Libros** | `PUT` | `/api/libros/{id}` | Modificación de libro y sus autores | Requiere JWT |
| **Libros** | `DELETE`| `/api/libros/{id}` | Baja de libro (valida stock y préstamos) | Requiere JWT |
| **Autores**| `GET` | `/api/autores` | Listado general de autores | Requiere JWT |
| **Autores**| `POST` | `/api/autores` | Alta de autor | Requiere JWT |
| **Autores**| `PUT` | `/api/autores/{id}` | Modificación de autor | Requiere JWT |
| **Autores**| `DELETE`| `/api/autores/{id}` | Baja de autor (valida que no tenga libros) | Requiere JWT |
| **Préstamos**| `GET` | `/api/prestamos` | Lista préstamos (filtro por DNI y estado) | Requiere JWT |
| **Préstamos**| `GET` | `/api/prestamos/activos` | Lista préstamos pendientes de un socio | Requiere JWT |
| **Préstamos**| `POST` | `/api/prestamos` | Registra préstamo ejecutando Stored Procedure | Requiere JWT |
| **Préstamos**| `PATCH`| `/api/prestamos/{id}/devolver` | Registra devolución ejecutando Stored Procedure | Requiere JWT |
| **Pagos** | `GET` | `/api/pagos` | Historial de pagos y cobranzas | Requiere JWT |
| **Pagos** | `POST` | `/api/pagos` | Registra un nuevo cobro de cuota | Requiere JWT |
| **Pagos** | `DELETE`| `/api/pagos/{id}` | Anula o elimina un comprobante de pago | Requiere JWT |
| **Usuarios**| `GET` | `/api/usuarios` | Lista usuarios del sistema | Requiere ADMIN |
| **Usuarios**| `GET` | `/api/usuarios/buscar-dni/{dni}` | Busca si una persona ya existe para asignarle usuario | Requiere ADMIN |
| **Usuarios**| `POST` | `/api/usuarios` | Alta de usuario con clave encriptada | Requiere ADMIN |
| **Usuarios**| `PUT` | `/api/usuarios/{id}` | Modifica datos o clave de usuario | Requiere ADMIN |
| **Usuarios**| `DELETE`| `/api/usuarios/{id}` | Elimina o desactiva acceso de usuario | Requiere ADMIN |
| **Reportes**| `GET` | `/api/reportes/resumen` | Métricas y KPIs globales en tiempo real | Requiere JWT |
| **Reportes**| `GET` | `/api/reportes/prestamos-por-genero` | Consulta 1 (Demanda por género) | Requiere JWT |
| **Reportes**| `GET` | `/api/reportes/socios-atencion` | Consulta 2 (Socios con deuda o préstamo) | Requiere JWT |
| **Reportes**| `GET` | `/api/reportes/libros-destacados` | Consulta 3 (Libros destacados por encima del promedio) | Requiere JWT |

---

## 8. Validación Cruzada (Frontend y Backend)

Para cumplir con el criterio de **Validación Cruzada**:
1. **En el Cliente (React)**:
   * Antes de enviar la petición, [src/utils/validators.js](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/src/utils/validators.js) verifica en el formulario que el DNI no tenga letras, que las fechas de devolución no sean anteriores a las del préstamo y que los textos no estén vacíos. Si algo falla, el navegador avisa de inmediato sin consumir ancho de banda ni molestar al servidor.
2. **En el Servidor (FastAPI)**:
   * Aunque un atacante intente evadir el frontend (por ejemplo mediante Postman o curl), [backend/app/schemas.py](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/backend/app/schemas.py) intercepta el JSON entrante con Pydantic. Si el DNI no tiene entre 7 y 15 dígitos o el año de publicación es inválido, rechaza la petición con código `422 Unprocessable Entity` devolviendo un mensaje explicativo y protegiendo la base de datos.

---

## 9. Conclusión de la Exposición Técnica

La arquitectura del backend combina:
1. **Rendimiento no bloqueante**: Implementado con FastAPI + SQLAlchemy 2.0 Asíncrono + `aiomysql`.
2. **Seguridad y Control de Roles**: Implementado con JWT estricto de 5 minutos y RBAC (`ADMIN` / `BIBLIOTECARIO`).
3. **Robustez y Consistencia de Datos**: Delegando las operaciones críticas a Procedimientos Almacenados con control transaccional (`COMMIT` / `ROLLBACK`).
4. **Analítica de Negocio**: Mediante consultas complejas con `INNER JOIN`, Subconsultas y `GROUP BY`, consumidas y exportables a PDF y Excel desde el cliente React.
