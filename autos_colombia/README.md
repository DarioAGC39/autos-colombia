# 🚗 Autos Colombia - Sistema de Control de Parqueadero Mensual
**Proyecto Universitario de Desarrollo de Software Full-Stack**

Bienvenido a la documentación oficial y pedagógica del proyecto **Autos Colombia**. Esta guía está diseñada paso a paso para que cualquier estudiante principiante pueda comprender, ejecutar en su computador local usando **Visual Studio Code**, probar y presentar con éxito el sistema en su universidad.

---

## 📌 1. Tecnologías y Arquitectura del Sistema

El proyecto cumple estrictamente con el enfoque pedagógico solicitado, sin sobrecargas de frameworks innecesarios:

- **Frontend:** HTML5 semántico, CSS3 puro (siguiendo los mockups de Figma al milímetro) y JavaScript puro (Vanilla JS).
- **Backend:** Python 3 con el micro-framework **Flask**.
- **Base de Datos:** **MySQL** con motor transaccional `InnoDB`.
- **Conector MySQL:** `mysql-connector-python` oficial de Oracle.
- **Entorno de Desarrollo:** Visual Studio Code.

### ¿Cómo se comunican el Frontend, Flask y MySQL?
1. **El usuario interactúa en el Frontend:** Por ejemplo, digita la placa `KLM482` y presiona el botón "Registrar entrada".
2. **El navegador envía una petición HTTP:** Se envía una petición `POST` hacia la ruta `/registrar-entrada` en Flask con los datos del formulario.
3. **Flask recibe y valida:** En `app.py`, Python valida que todos los campos existan y que la placa cumpla con el formato colombiano (3 letras y 3 números).
4. **Flask consulta MySQL mediante consultas parametrizadas:**
   - Abre una transacción `conn.start_transaction()`.
   - Verifica si el vehículo ya tiene un movimiento activo usando `SELECT ... WHERE placa = %s AND estado = 'ACTIVO' FOR UPDATE`.
   - Si no está activo, ejecuta `INSERT INTO movimiento (fecha_hora_entrada, estado, placa) VALUES (NOW(), 'ACTIVO', %s)`.
   - Confirma los cambios con `conn.commit()`.
5. **Flask renderiza la respuesta:** Utiliza el motor de plantillas **Jinja2** para inyectar los datos en el archivo HTML correspondiente (`registrar_entrada.html`), mostrando un mensaje de confirmación verde y el nuevo estado.

---

## 📁 2. Estructura del Proyecto Explicada

```text
autos_colombia/
│
├── app.py                 # Backend principal: rutas Flask, lógica de negocio y transacciones
├── config.py              # Carga segura de variables de entorno (.env)
├── database.sql           # Script SQL para crear la base de datos, tablas, índices y datos de prueba
├── requirements.txt       # Lista de librerías Python requeridas
├── .env.example           # Plantilla de variables de entorno (credenciales de MySQL)
├── README.md              # Guía completa de instalación y sustentación
│
├── templates/             # Vistas HTML con plantillas Jinja2
│   ├── base.html              # Plantilla maestra (barra lateral azul oscuro, reloj y encabezado)
│   ├── index.html             # Panel de inicio con estadísticas y accesos rápidos
│   ├── registrar_entrada.html # Formulario de ingreso de vehículos con validaciones
│   ├── registrar_salida.html  # Búsqueda y confirmación de salidas
│   ├── consultar_vehiculo.html# Consulta de estado («En parqueadero» o «Fuera»)
│   └── historial.html         # Tabla cronológica de movimientos y estado vacío
│
└── static/                # Archivos estáticos
    ├── css/
    │   └── styles.css         # Hoja de estilos moderna y limpia (Figma original)
    └── js/
        └── app.js             # Reloj Colombia, validaciones en cliente y autocompletado
```

---

## 🛠️ 3. Requisitos Previos e Instalación Local

### Paso 1: Instalar Python y MySQL
1. **Python 3.10 o superior:** Descárgalo desde [python.org](https://www.python.org). Al instalar en Windows, asegúrate de marcar la casilla **"Add Python to PATH"**.
2. **MySQL:** Puedes usar **XAMPP** (iniciando el módulo MySQL) o **MySQL Workbench / MySQL Community Server**.
3. **Visual Studio Code:** Descárgalo desde [code.visualstudio.com](https://code.visualstudio.com).

---

### Paso 2: Crear la Base de Datos en MySQL
1. Abre tu gestor de base de datos preferido (**phpMyAdmin** en XAMPP, **MySQL Workbench** o la terminal de MySQL).
2. Abre y ejecuta el archivo `database.sql` incluido en el proyecto.
3. Este script:
   - Creará la base de datos `autos_colombia`.
   - Creará la tabla `vehiculo` con su clave primaria `placa`.
   - Creará la tabla `movimiento` con clave foránea hacia `vehiculo(placa)` y restricciones de integridad.
   - Creará el índice `idx_movimiento_placa_estado`.
   - Insertará datos de prueba, incluyendo el vehículo `KLM482` con su historial mostrado en los mockups.

---

### Paso 3: Abrir el Proyecto en Visual Studio Code
1. Abre **Visual Studio Code**.
2. Ve al menú superior: **Archivo > Abrir carpeta...** y selecciona la carpeta `autos_colombia`.
3. Abre una terminal integrada en VS Code presionando `` Ctrl + ` `` (o en el menú: **Terminal > Nueva terminal**).

---

### Paso 4: Crear y Activar el Entorno Virtual de Python
El entorno virtual aísla las librerías del proyecto para no afectar la instalación global de tu sistema.

**En Windows (PowerShell / Símbolo del Sistema):**
```bash
python -m venv venv
.\venv\Scripts\activate
```
*(Si en PowerShell te aparece un error sobre directivas de ejecución de scripts, ejecuta antes: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Unrestricted`)*

**En Mac o Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Al activarse, verás `(venv)` al inicio de tu línea de comandos.

---

### Paso 5: Instalar las Dependencias
Con el entorno virtual activo, ejecuta:
```bash
pip install -r requirements.txt
```

Esto instalará:
- `Flask`
- `mysql-connector-python`
- `python-dotenv`

---

### Paso 6: Configurar las Variables de Entorno (`.env`)
1. En la carpeta raíz del proyecto, copia el archivo `.env.example` y renómbralo exactamente como `.env`:
   ```bash
   cp .env.example .env
   ```
   *(En Windows puedes simplemente hacer clic derecho > Copiar y Pegar en VS Code)*
2. Abre el archivo `.env` y ajusta las credenciales de tu MySQL local:
   ```env
   SECRET_KEY=mi_clave_secreta_universitaria_2026
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=tu_contraseña_de_mysql
   MYSQL_DATABASE=autos_colombia
   ```
   *Nota: Si estás usando XAMPP por defecto, `MYSQL_USER=root` y `MYSQL_PASSWORD=` queda en blanco.*

---

### Paso 7: Ejecutar la Aplicación
En la terminal integrada de VS Code ejecuta:
```bash
python app.py
```

Verás una salida similar a esta:
```text
============================================================
  AUTOS COLOMBIA - SISTEMA DE CONTROL DE PARQUEADERO
  Servidor iniciado localmente.
  Abre en tu navegador: http://127.0.0.1:5000
============================================================
```

Abre tu navegador web e ingresa a: **`http://127.0.0.1:5000`**

---

## 🧪 4. Guía de Pruebas Manuales (Para Sustentación)

Sigue estos 4 casos de prueba durante tu presentación académica para demostrar que el sistema funciona correctamente:

### Caso 1: Registrar Entrada de Vehículo Nuevo
1. Dirígete a la opción **"Registrar entrada"** en la barra lateral.
2. Ingresa los datos:
   - **Placa:** `COL101`
   - **Tipo:** `Automóvil`
   - **Color:** `Azul marino`
   - **Marca:** `Chevrolet`
   - **Modelo:** `Onix 2024`
3. Presiona **"Registrar entrada"**.
4. **Resultado esperado:**
   - Mensaje verde de éxito: *"El vehículo COL101 ingresó el [Fecha y hora actual]. Su movimiento está activo."*
   - La tarjeta lateral muestra el movimiento actual como **Activo**.

### Caso 2: Validación de No Duplicidad (Regla de Negocio)
1. Permanece en **"Registrar entrada"** o ingresa nuevamente.
2. Digita la misma placa: `COL101` con cualquier dato.
3. Presiona **"Registrar entrada"**.
4. **Resultado esperado:**
   - Mensaje amarillo de advertencia: *"Este vehículo ya tiene un movimiento activo: No se puede registrar otra entrada para COL101. Primero debes registrar la salida del vehículo."*
   - Aparece un botón directo que dice **"Ir a registrar salida"**.

### Caso 3: Registrar Salida de Vehículo
1. Ve a **"Registrar salida"**.
2. Escribe la placa `COL101` y haz clic en **"Buscar"**.
3. Verás la ficha técnica del carro, el estado **«En parqueadero»** y el movimiento activo con su hora de ingreso.
4. Presiona el botón azul **"Registrar salida"**.
5. **Resultado esperado:**
   - Mensaje verde de confirmación: *"Se registró la salida de COL101 el [Fecha y hora]. El movimiento ha finalizado."*
   - El estado cambia inmediatamente a **«Fuera del parqueadero»**.
   - El estado del movimiento se marca como **Finalizado**.

### Caso 4: Consultar Estado e Historial Cronológico
1. Ve a **"Consultar vehículo"**, escribe `KLM482` (vehículo de prueba precargado).
   - Observa cómo indica su estado actual.
2. Ve a **"Historial de movimientos"**, escribe `KLM482` y presiona **"Buscar"**.
   - Observa la tabla ordenada del más reciente al más antiguo con sus respectivas entradas, salidas y badges de estado.
3. Busca una placa que no tenga movimientos (ej: `JTR619`).
   - Observa el estado vacío limpio: *"No se encontraron movimientos. Verifica que la placa esté escrita correctamente..."*.

---

## 🔒 5. Aspectos de Seguridad y Buenas Prácticas Aplicados

- **Prevención de Inyección SQL:** Todas las consultas en `app.py` utilizan tuplas parametrizadas con `%s`. Jamás se concatenan cadenas directas con entradas del usuario.
- **Transacciones Atómicas:** Se utiliza `conn.start_transaction()` y `FOR UPDATE` para garantizar que no existan inconsistencias de concurrencia al registrar entradas o salidas simultáneas.
- **Protección de Credenciales:** La contraseña de MySQL reside únicamente en el archivo `.env`, excluido del control de versiones mediante `.gitignore`.
- **Doble Validación:** Los datos se validan tanto en el navegador con JavaScript para experiencia de usuario, como obligatoriamente en Python Flask para seguridad estricta del backend.
