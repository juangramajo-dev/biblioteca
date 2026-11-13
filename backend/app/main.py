from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import Base, engine
from .routers import auth, autores, libros, pagos, prestamos, reportes, socios, usuarios
from .routers.auth import obtener_usuario_actual, requerir_admin


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Crea las tablas de forma asíncrona si no existen en MySQL
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="API Biblioteca",
    description="Backend asíncrono con FastAPI + SQLAlchemy AsyncSession + aiomysql + JWT (5 min)",
    version="1.1.0",
    lifespan=lifespan,
)

# Habilitar CORS para cualquier puerto local de Vite (5173, 5174, 5175, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ruta pública de login y verificación de token
app.include_router(auth.router)

# Rutas protegidas con JWT (requieren sesión activa de <= 5 minutos)
dependencia_jwt = [Depends(obtener_usuario_actual)]
dependencia_admin = [Depends(requerir_admin)]
app.include_router(socios.router, dependencies=dependencia_jwt)
app.include_router(usuarios.router, dependencies=dependencia_admin)
app.include_router(libros.router, dependencies=dependencia_jwt)
app.include_router(autores.router, dependencies=dependencia_jwt)
app.include_router(prestamos.router, dependencies=dependencia_jwt)
app.include_router(pagos.router, dependencies=dependencia_jwt)
app.include_router(reportes.router, dependencies=dependencia_jwt)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    mensajes = []
    for err in exc.errors():
        msg = err.get("msg", "Dato inválido").replace("Value error, ", "")
        mensajes.append(msg)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": " | ".join(mensajes)},
    )


@app.get("/")
async def health_check():
    return {"estado": "ok", "servicio": "API Biblioteca UTN (Async)", "docs": "/docs"}
