# 🚗 Autos Colombia - Sistema de Control de Parqueadero Mensual
**Proyecto Universitario de Desarrollo de Software Full-Stack**

Bienvenido a la documentación oficial y pedagógica del proyecto **Autos Colombia**. Esta guía está diseñada para que cualquier estudiante principiante pueda comprender, ejecutar en su computador local usando **Visual Studio Code**, probar y defender con éxito el sistema ante su profesor y jurado evaluador.

---

## 📌 1. Cumplimiento de los Requerimientos del Profesor

El sistema ha sido refinado y evaluado rigurosamente respondiendo a las observaciones del docente:

| Observación del Profesor | Estado | Implementación en el Código |
|---|---|---|
| **1. Contemplar celda asignada:** Ampliar la solución para contemplar la celda, pues los modelos se limitaban a vehículos y movimientos. | ✅ **CUMPLIDO** | Se incorporó la columna `celda VARCHAR(10)` en `movimiento`, con índice `idx_movimiento_celda`. Se creó la capa `dao/celda_dao.py` que administra el catálogo de las **80 celdas** (70 para carros `C-01` a `C-70` y 10 para motos `M-01` a `M-10`), asignación automática inteligente y panel de disponibilidad en tiempo real. |
| **2. Corrección prioritaria en salida:** Al buscar placa activa, no finalizar automáticamente; buscar solo debe consultar y la salida debe ocurrir al confirmar. | ✅ **CUMPLIDO** | Se desacopló el flujo en 2 pasos independientes en `routes/salidas.py` y `services/parqueadero_service.py`: El paso de búsqueda (`GET`/`POST`) **solo consulta y muestra** los datos del vehículo y tiempo transcurrido sin alterar la base de datos. Solo cuando el empleado pulsa el botón **"Registrar salida"** (`POST` con `accion='confirmar_salida'`) se finaliza el movimiento, se guarda `NOW()` y se libera la celda. |
| **3. Separación de responsabilidades:** Llevar al código la modularización de los diagramas, separando rutas, reglas y consultas reunidas en `app.py`. | ✅ **CUMPLIDO** | Se refactorizó el proyecto en una **Arquitectura en 3 Capas (Clean MVC)**: `database.py` (conexión), `dao/` (consultas SQL aisladas), `services/` (reglas de negocio, validaciones y tarifas) y `routes/` (Flask Blueprints por módulo). `app.py` quedó como una fábrica limpia de la aplicación (`create_app`). |
| **4. Relación React vs. Flask:** Aclarar cómo se relaciona la versión React con la aplicación Flask. | ✅ **CUMPLIDO** | Documentado en detalle en la Sección 6: React actúa como el **Prototipo Interactivo de Alta Fidelidad (Digital Twin)** para validación inmediata de UX y reglas en el navegador (`localStorage`), mientras que Flask + MySQL es el **Backend Real de Entrega Académica** para persistencia relacional ACID y ejecución en VS Code. |

---

## 💰 2. Modelo de Negocio: Parqueadero Mensual

El sistema **Autos Colombia** opera bajo el modelo de suscripción mensual:
- **Tarifa mensual Carros:** **$250.000 COP / mes** (Capacidad: 70 celdas, `C-01` a `C-70`).
- **Tarifa mensual Motos:** **$100.000 COP / mes** (Capacidad: 10 celdas, `M-01` a `M-10`).
- **Capacidad Total:** **80 celdas** organizadas por zona.
- **Tipos Admitidos:** Exclusivamente **Carro** o **Moto** (sin otros tipos no admitidos).
- **Operación en Salida:** No hay caja de cobro ni tarifas por minuto/fracción al salir. El registro de salida libera la celda asignada y registra la fecha/hora de salida del abonado mensual.

---

## 🏛️ 3. Arquitectura de Software y Separación de Responsabilidades

El proyecto implementa el patrón de capas desacopladas recomendado en ingeniería de software:

```text
autos_colombia/
│
├── app.py                      # Punto de entrada / Fábrica (Application Factory)
├── config.py                   # Carga de variables de entorno seguras (.env)
├── database.py                 # Gestor central de conexión MySQL con mysql-connector
├── database.sql                # Script DDL completo: tablas, índices, celdas y datos de prueba
├── migration_celdas.sql        # Script de migración ALTER TABLE para agregar celda
├── requirements.txt            # Dependencias oficiales: Flask, mysql-connector-python, python-dotenv
├── .env.example                # Plantilla de credenciales locales
│
├── dao/                        # CAPA DE ACCESO A DATOS (Data Access Object)
│   ├── __init__.py
│   ├── vehiculo_dao.py         # Consultas SQL para la tabla 'vehiculo'
│   ├── movimiento_dao.py       # Consultas SQL para la tabla 'movimiento'
│   └── celda_dao.py            # Mapeo y consultas de las 80 celdas de parqueo
│
├── services/                   # CAPA DE LÓGICA DE NEGOCIO
│   ├── __init__.py
│   └── parqueadero_service.py  # Reglas de negocio: validación de placa, asignación
│                               # de celdas libres, confirmación en 2 fases, tarifas
│
├── routes/                     # CAPA DE CONTROLADORES (Flask Blueprints)
│   ├── __init__.py
│   ├── dashboard.py            # Rutas de inicio y KPIs (/ -> index)
│   ├── entradas.py             # Formulario y registro de ingreso (/registrar-entrada)
│   ├── salidas.py              # Búsqueda y confirmación en 2 pasos (/registrar-salida)
│   ├── consultas.py            # Consulta por placa e historial (/consultar-vehiculo, /historial)
│   ├── disponibilidad.py       # Cuadrícula interactiva de 80 celdas (/disponibilidad)
│   └── api.py                  # Endpoints REST JSON para autocompletado en JavaScript
│
├── templates/                  # CAPA DE VISTAS (Plantillas Jinja2 y HTML5 semántico)
│   ├── base.html               # Layout general con sidebar azul, reloj y breadcrumbs
│   ├── index.html              # Dashboard operativo
│   ├── disponibilidad.html     # Panel de las 80 celdas con filtros y estadísticas
│   ├── registrar_entrada.html  # Formulario con autocompletado y selección de celda
│   ├── registrar_salida.html   # Flujo de salida en 2 pasos (búsqueda y confirmación)
│   ├── consultar_vehiculo.html # Ficha del vehículo y estado actual
│   └── historial.html          # Tabla cronológica de movimientos
│
└── static/                     # ASSETS DEL CLIENTE
    ├── css/
    │   └── styles.css          # CSS3 puro basado en los mockups de Figma
    └── js/
        └── app.js              # Vanilla JS: autocompletado, reloj Colombia y validaciones
```

---

## 🛠️ 4. Guía de Instalación y Ejecución en Visual Studio Code

### Paso 1: Configurar la Base de Datos en MySQL
1. Abre tu cliente MySQL preferido (**phpMyAdmin** en XAMPP, **MySQL Workbench** o la terminal).
2. Ejecuta el archivo `database.sql`. Esto creará la base de datos `autos_colombia`, las tablas `vehiculo` y `movimiento` con la columna `celda`, índices y registros de prueba.

### Paso 2: Abrir el Proyecto en Visual Studio Code
1. Abre **Visual Studio Code**.
2. Selecciona **Archivo > Abrir carpeta...** y elige la carpeta `autos_colombia`.
3. Abre la terminal integrada (`Ctrl + \``).

### Paso 3: Entorno Virtual e Instalación de Dependencias
```bash
# En Windows:
python -m venv venv
.\venv\Scripts\activate

# En Linux / Mac:
python3 -m venv venv
source venv/bin/activate

# Instalar librerías:
pip install -r requirements.txt
```

### Paso 4: Variables de Entorno (`.env`)
Copia `.env.example` como `.env` y coloca las credenciales de tu MySQL local:
```env
SECRET_KEY=mi_clave_secreta_universitaria_2026
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=autos_colombia
```

### Paso 5: Iniciar el Servidor
```bash
python app.py
```
Abre en tu navegador: **`http://127.0.0.1:5000`**

---

## 🧪 5. Casos de Prueba para Demostración Académica

1. **Prueba de Entrada y Asignación de Celda:**
   - Ingresa una placa nueva (ej: `ABC123`).
   - El sistema valida el formato de placa colombiana y le asigna automáticamente la primera celda libre (`C-01` si es carro, `M-01` si es moto).
   - Intenta registrar la misma placa sin haber salido: el sistema rechaza el intento informando que ya tiene un movimiento activo.
2. **Prueba de Salida en Dos Fases:**
   - Ve a "Registrar salida" y busca `ABC123`.
   - **Observa que el movimiento NO se finaliza:** la pantalla muestra los datos del vehículo, la celda ocupada, la hora de entrada y el tiempo transcurrido.
   - Solo al pulsar el botón azul **"Registrar salida"**, el estado cambia a `FINALIZADO`, se guarda la fecha de salida y se libera la celda.
3. **Prueba del Panel de Disponibilidad:**
   - Abre el **Panel de Disponibilidad (80 celdas)**.
   - Verifica la cuadrícula organizada: 70 carros y 10 motos. La celda del vehículo recién salido ahora figura en verde (**Libre**).

---

## 🤝 6. Relación entre la Versión React y la Aplicación Flask

Para responder a la pregunta del jurado docente sobre por qué existen dos versiones del proyecto:

1. **Versión React (Frontend Simulator / Prototipo de Alta Fidelidad):**
   - **Propósito:** Actúa como un simulador interactivo en caliente ("Digital Twin") para diseño y experiencia de usuario (UI/UX) conforme a los mockups de Figma.
   - **Persistencia:** Almacena los datos en el navegador (`localStorage`) para permitir pruebas interactivas inmediatas sin requerir que el evaluador configure MySQL ni Python en su máquina en ese instante.
   - **Alcance:** Validación rápida de la cuadrícula de 80 celdas, reactividad instantánea y presentación visual.

2. **Versión Python Flask + MySQL (Backend de Producción y Entrega Oficial):**
   - **Propósito:** Es la solución formal solicitada en la rúbrica universitaria con tecnologías puras: HTML5, CSS3, JavaScript puro, Python, Flask y MySQL relacional con `mysql-connector-python`.
   - **Persistencia:** Persistencia relacional real en servidor MySQL, con transacciones ACID (`conn.start_transaction()`, `conn.commit()`, `conn.rollback()`), bloqueos pesimistas `FOR UPDATE` para concurrencia, e integridad referencial (`FOREIGN KEY`).
   - **Arquitectura:** Estructurada en capas desacopladas (Controladores -> Servicios -> DAOs).

Ambas versiones comparten exactamente las mismas reglas de negocio: mensualidad ($250.000 carro / $100.000 moto), capacidad de 80 celdas, validación de placas colombianas y flujo de salida en 2 pasos.
