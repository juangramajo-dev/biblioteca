# ⚙️ Guía de Exposición: Backend con FastAPI (`backend/`)

Esta guía detalla cómo exponer la **Capa de Servidor (API REST)** desarrollada en Python con **FastAPI**, **SQLAlchemy 2.0 Asíncrono**, **aiomysql**, **Pydantic** y **JWT**.

---

## 1. Apertura: Arquitectura y Conexión Asíncrona
> **💡 Qué decir al empezar:**
> *"El backend está construido como una REST API asíncrona en FastAPI. Toda la comunicación con MySQL se realiza de forma **no bloqueante (asíncrona)** mediante `create_async_engine`, `AsyncSession` y el driver `aiomysql`, optimizando las operaciones de entrada/salida (I/O) sin bloquear el servidor ante múltiples peticiones concurrentes."*

### Estructura de Carpetas
```text
backend/
├── requirements.txt       # fastapi, uvicorn, sqlalchemy[asyncio], greenlet, aiomysql, PyJWT, pydantic
└── app/
    ├── database.py        # Motor async (mysql+aiomysql://...), AsyncSessionLocal y get_db()
    ├── models.py          # Modelos ORM de las 11 tablas + tabla intermedia libro_autor
    ├── schemas.py         # Esquemas Pydantic con validadores cruzados (@field_validator)
    ├── main.py            # App FastAPI, lifespan async, CORS, handlers y registro de routers
    └── routers/
        ├── auth.py        # Login, generación/validación de JWT (5 min) y rol ADMIN
        ├── socios.py      # CRUD completo de socios (GET, POST, PUT, DELETE lógico/físico)
        ├── usuarios.py    # CRUD completo de usuarios y consulta de roles (solo ADMIN)
        ├── libros.py      # CRUD de libros, relación N:M con autores y catálogos
        ├── autores.py     # CRUD de autores
        ├── prestamos.py   # Préstamos y devoluciones invocando Stored Procedures
        ├── pagos.py       # Control y cobro de cuotas de socios
        └── reportes.py    # 3 consultas SQL complejas (INNER JOIN, Subconsultas, GROUP BY) + KPIs
```

---

## 2. Puntos Clave para Explicar en cada Archivo

### A. Conexión Asíncrona y Ciclo de Vida (`database.py` y `main.py`)
* **[database.py](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/backend/app/database.py):**
  * Utiliza `create_async_engine` con `pool_pre_ping=True` y `pool_recycle=1800`.
  * `AsyncSessionLocal` se configura con `expire_on_commit=False` y todos los endpoints reciben `db: AsyncSession = Depends(get_db)`.
  * En todas las consultas ORM se utiliza **`select(...)`** junto con **`selectinload(...)`** y **`await db.execute(...)`** para cargar relaciones de forma explícita y asíncrona sin disparar carga diferida (`MissingGreenlet`).
* **[main.py](file:///c:/Users/Juan/Documents/Proyectos/React/biblioteca/backend/app/main.py):**
  * Usa `@asynccontextmanager async def lifespan(...)` para inicializar las tablas (`await conn.run_sync(Base.metadata.create_all)`) al arrancar y cerrar el pool (`await engine.dispose()`) al detenerse.
  * Configura `CORSMiddleware` para permitir peticiones desde el frontend en React.
  * Incluye un `@app.exception_handler(RequestValidationError)` para transformar los errores `422` de Pydantic en un mensaje legible en español (`detail`).

### B. Seguridad: Autenticación JWT de 5 Minutos + RBAC (`routers/auth.py`)
* **Login (`POST /api/auth/login`):**
  * Busca al usuario por `nombre_usuario`, verifica su `clave_hash` (SHA-256) y que esté `activo = True`.
  * Actualiza `ultimo_acceso` y firma un **JWT** (`HS256` con `PyJWT`) incluyendo `sub` (`id_usuario`), `username`, `rol`, `iat` y **`exp = now + 5 minutos`** (`ACCESS_TOKEN_EXPIRE_MINUTES = 5`).
* **Dependencias de Protección:**
  * `obtener_usuario_actual`: Lee la cabecera `Authorization: Bearer <token>`, decodifica el JWT y verifica que no haya expirado (`jwt.ExpiredSignatureError` → `401 Unauthorized`).
  * `requerir_admin`: Verifica que el rol sea `ADMIN`; caso contrario responde **`403 Forbidden`**.
* **Aplicación de permisos en `main.py` y routers:**
  * `auth.router` es público (para poder iniciar sesión).
  * `socios`, `libros`, `autores`, `prestamos`, `pagos` y `reportes` requieren sesión JWT válida (`obtener_usuario_actual`).
  * `usuarios.router` y las rutas de escritura (`POST`/`PUT`/`DELETE`) de `libros.py` y `autores.py` exigen `requerir_admin`.

### C. Validación Cruzada en el Servidor (`schemas.py`)
* Además de validar en el cliente React, Pydantic valida tipos y formatos en el servidor antes de tocar la base de datos:
  * **DNI (`_validar_dni_valor`):** Solo dígitos numéricos entre 7 y 15 caracteres.
  * **Correo electrónico (`_validar_email_opcional`):** Formato válido `usuario@dominio.ext`.
  * **Usuario:** 3 a 50 caracteres sin espacios; contraseña mínimo 4 caracteres.
  * **Libro:** ISBN entre 5 y 20 caracteres, año entre `1400` y `2100`, `stock_total >= 1`.
  * **Socio (`SocioUpdate`):** Estado restringido a `ACTIVO`, `INACTIVO` o `SUSPENDIDO`.

### D. Integración con los Procedimientos Almacenados (`routers/prestamos.py`)
* **Cómo explicar `POST /api/prestamos` y `PATCH /api/prestamos/{id}/devolver`:**
  * *"En lugar de hacer la lógica de stock solo en Python, el endpoint resuelve el socio y el libro y ejecuta de forma asíncrona `await db.execute(text("CALL sp_registrar_prestamo(..., @id_prestamo_out)"))` (y `CALL sp_registrar_devolucion(...)` en devoluciones)."*
  * Si el procedimiento almacenado detecta falta de stock, socio inactivo o fechas inválidas, ejecuta `ROLLBACK` y `SIGNAL SQLSTATE '45000'`. El router captura `DBAPIError`, hace `await db.rollback()`, extrae el mensaje del error SQL y responde `400 Bad Request` al cliente.

### E. Consultas SQL Complejas para Reportes (`routers/reportes.py`)
* `GET /api/reportes/resumen`: Subconsultas escalares con métricas globales del sistema.
* `GET /api/reportes/prestamos-por-genero`: **`INNER JOIN`** (`prestamo` + `libro` + `genero`) + **`GROUP BY`** con totales por género.
* `GET /api/reportes/socios-atencion`: **`INNER JOIN`** (`socio` + `persona` + `pago`) + **Subconsultas** (`SELECT` correlacionado y `WHERE id_socio IN (... UNION ...)`) + **`GROUP BY`**.
* `GET /api/reportes/libros-destacados`: **`INNER JOIN` múltiple** de 5 tablas (incluyendo `libro_autor`) + `GROUP_CONCAT` + **`GROUP BY`** + **Subconsulta `HAVING AVG(...)`**.

---

## 3. Demo Sugerida para Mostrar en Swagger (`/docs`)
1. Abrir `http://127.0.0.1:8000/docs` y mostrar que los endpoints muestran el candado de `HTTPBearer` (JWT).
2. Probar un endpoint sin token → mostrar respuesta `401 / 403`.
3. Ejecutar `POST /api/auth/login` con `admin` / `1234`, copiar `access_token` y pegarlo en **Authorize**.
4. Mostrar `GET /api/reportes/socios-atencion` o `POST /api/prestamos` con una fecha de devolución anterior al préstamo para demostrar en vivo el `ROLLBACK` del Stored Procedure y el mensaje de error devuelto por FastAPI.

