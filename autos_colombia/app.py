"""
==============================================================
PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
SISTEMA DE CONTROL DE ENTRADA Y SALIDA - PARQUEADERO MENSUAL
Archivo: app.py
Tecnología: Python 3 + Flask + MySQL
==============================================================

Guía para el estudiante:
Este archivo es el corazón de la aplicación (Backend).
Aquí definimos las rutas (URLs), la lógica de negocio,
las validaciones de datos y las transacciones con MySQL.
"""

import re
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import mysql.connector
from mysql.connector import errorcode

from config import Config

# Inicialización de la aplicación Flask
app = Flask(__name__)
app.config.from_object(Config)

# ==============================================================
# FUNCIÓN AUXILIAR: CONEXIÓN A MYSQL
# ==============================================================
def get_db_connection():
    """
    Establece una conexión con la base de datos MySQL usando los
    parámetros seguros configurados en config.py.
    
    Retorna:
        connection: Objeto de conexión a MySQL si es exitoso.
        None: Si ocurre un error de conexión (el error se maneja sin exponer credenciales).
    """
    try:
        connection = mysql.connector.connect(**Config.get_db_config())
        return connection
    except mysql.connector.Error as err:
        # Registramos el error de forma segura en la consola del servidor
        print(f"[ERROR DE BASE DE DATOS]: {err.msg} (Código: {err.errno})")
        return None


# ==============================================================
# FUNCIÓN AUXILIAR: VALIDACIÓN DE FORMATO DE PLACA COLOMBIANA
# ==============================================================
def validar_formato_placa(placa):
    """
    Valida que la placa cumpla con el formato legal colombiano:
    - Carros/Camionetas: 3 letras y 3 números (Ej: KLM482).
    - Motos: 3 letras, 2 números y 1 letra (Ej: ABC12D).
    
    Retorna True si es válida, False en caso contrario.
    """
    if not placa:
        return False
    placa_limpia = placa.strip().upper()
    # Patrón: 3 letras seguidas de 3 dígitos O 3 letras seguidas de 2 dígitos y 1 letra
    patron = r'^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]{1}$'
    return bool(re.match(patron, placa_limpia))


# ==============================================================
# RUTA 1: INICIO (DASHBOARD OPERATIVO)
# ==============================================================
@app.route('/')
def index():
    """
    Pantalla principal del sistema.
    Muestra un resumen en tiempo real del parqueadero:
    - Cantidad de vehículos actualmente dentro (movimientos activos).
    - Cantidad total de vehículos registrados.
    - Total de salidas procesadas hoy.
    """
    conn = get_db_connection()
    if not conn:
        flash("No fue posible conectar con la base de datos MySQL. Revisa que el servicio MySQL esté iniciado y el archivo .env configurado.", "danger")
        return render_template('index.html', stats={'activos': 0, 'vehiculos': 0, 'hoy': 0}, ultimos_movimientos=[])

    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Contar vehículos actualmente dentro
        cursor.execute("SELECT COUNT(*) AS total_activos FROM movimiento WHERE estado = 'ACTIVO'")
        total_activos = cursor.fetchone()['total_activos']

        # 2. Contar vehículos registrados en total
        cursor.execute("SELECT COUNT(*) AS total_vehiculos FROM vehiculo")
        total_vehiculos = cursor.fetchone()['total_vehiculos']

        # 3. Contar salidas completadas en la fecha actual
        cursor.execute("SELECT COUNT(*) AS salidas_hoy FROM movimiento WHERE estado = 'FINALIZADO' AND DATE(fecha_hora_salida) = CURDATE()")
        salidas_hoy = cursor.fetchone()['salidas_hoy']

        # 4. Obtener los 5 movimientos más recientes para el resumen visual
        cursor.execute("""
            SELECT m.id_movimiento, m.placa, m.fecha_hora_entrada, m.fecha_hora_salida, m.estado,
                   v.tipo, v.marca, v.modelo, v.color
            FROM movimiento m
            INNER JOIN vehiculo v ON m.placa = v.placa
            ORDER BY m.fecha_hora_entrada DESC
            LIMIT 5
        """)
        ultimos_movimientos = cursor.fetchall()

        stats = {
            'activos': total_activos,
            'vehiculos': total_vehiculos,
            'hoy': salidas_hoy
        }
        return render_template('index.html', stats=stats, ultimos_movimientos=ultimos_movimientos)

    except mysql.connector.Error as err:
        flash(f"Error al consultar el resumen operativo: {err.msg}", "danger")
        return render_template('index.html', stats={'activos': 0, 'vehiculos': 0, 'hoy': 0}, ultimos_movimientos=[])
    finally:
        cursor.close()
        conn.close()


# ==============================================================
# RUTA 2: REGISTRAR ENTRADA DE VEHÍCULO
# ==============================================================
@app.route('/registrar-entrada', methods=['GET', 'POST'])
def registrar_entrada():
    """
    Gestiona el registro de ingreso de vehículos.
    - Valida campos obligatorios y formato de placa.
    - Si el vehículo ya existe, actualiza o reutiliza su ficha.
    - Verifica de forma transaccional que no tenga un movimiento activo.
    - Registra fecha y hora automáticas (NOW()).
    """
    if request.method == 'GET':
        return render_template('registrar_entrada.html', datos={}, errores={})

    # Procesar formulario (POST)
    placa = request.form.get('placa', '').strip().upper()
    tipo = request.form.get('tipo', '').strip()
    color = request.form.get('color', '').strip()
    marca = request.form.get('marca', '').strip()
    modelo = request.form.get('modelo', '').strip()

    datos = {
        'placa': placa,
        'tipo': tipo,
        'color': color,
        'marca': marca,
        'modelo': modelo
    }
    errores = {}

    # Validaciones obligatorias de campos
    if not placa:
        errores['placa'] = "La placa es obligatoria."
    elif not validar_formato_placa(placa):
        errores['placa'] = "Formato inválido. Usa 3 letras y 3 números (KLM482)."

    if not tipo:
        errores['tipo'] = "Selecciona el tipo de vehículo."
    if not color:
        errores['color'] = "Ingresa el color del vehículo."
    if not marca:
        errores['marca'] = "Ingresa la marca del vehículo."
    if not modelo:
        errores['modelo'] = "Ingresa el modelo del vehículo."

    # Si hay errores de campos, devolver inmediatamente con mensajes
    if errores:
        flash("No se pudo registrar la entrada. Corrige la placa y completa los campos obligatorios indicados.", "danger")
        return render_template('registrar_entrada.html', datos=datos, errores=errores)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos. Intenta nuevamente.", "danger")
        return render_template('registrar_entrada.html', datos=datos, errores=errores)

    cursor = conn.cursor(dictionary=True)
    try:
        # Iniciar transacción manual para evitar carreras críticas
        conn.start_transaction()

        # 1. Comprobar si el vehículo ya existe en la tabla 'vehiculo'
        consulta_vehiculo = "SELECT placa, tipo, color, marca, modelo FROM vehiculo WHERE placa = %s FOR UPDATE"
        cursor.execute(consulta_vehiculo, (placa,))
        vehiculo_existente = cursor.fetchone()

        if not vehiculo_existente:
            # Insertar nuevo vehículo con consulta parametrizada
            insert_vehiculo = """
                INSERT INTO vehiculo (placa, tipo, color, marca, modelo)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_vehiculo, (placa, tipo, color, marca, modelo))
        else:
            # Si el vehículo ya existe, actualizamos sus datos por si cambiaron de color o modelo
            update_vehiculo = """
                UPDATE vehiculo
                SET tipo = %s, color = %s, marca = %s, modelo = %s
                WHERE placa = %s
            """
            cursor.execute(update_vehiculo, (tipo, color, marca, modelo, placa))

        # 2. Comprobar si el vehículo ya tiene un movimiento 'ACTIVO'
        consulta_activo = """
            SELECT id_movimiento, fecha_hora_entrada, estado 
            FROM movimiento 
            WHERE placa = %s AND estado = 'ACTIVO' 
            FOR UPDATE
        """
        cursor.execute(consulta_activo, (placa,))
        movimiento_activo = cursor.fetchone()

        if movimiento_activo:
            # Regla de negocio: No se permiten dos movimientos activos simultáneos
            conn.rollback()
            flash(f"No se puede registrar otra entrada para {placa}. Primero debes registrar la salida del vehículo.", "warning")
            return render_template('registrar_entrada.html',
                                   datos=datos,
                                   errores={},
                                   ya_activo=True,
                                   movimiento_activo=movimiento_activo)

        # 3. Registrar la nueva entrada con fecha y hora actual automática
        insert_movimiento = """
            INSERT INTO movimiento (fecha_hora_entrada, estado, observaciones, placa)
            VALUES (NOW(), 'ACTIVO', %s, %s)
        """
        cursor.execute(insert_movimiento, ('Ingreso regular registrado en sistema', placa))
        id_nuevo_movimiento = cursor.lastrowid

        # 4. Obtener la fecha y hora exacta asignada por MySQL
        cursor.execute("SELECT fecha_hora_entrada FROM movimiento WHERE id_movimiento = %s", (id_nuevo_movimiento,))
        nuevo_registro = cursor.fetchone()
        fecha_ingreso = nuevo_registro['fecha_hora_entrada']

        # Confirmar transacción en la base de datos
        conn.commit()

        fecha_formateada = fecha_ingreso.strftime('%d de %B de %Y a las %H:%M') if isinstance(fecha_ingreso, datetime) else str(fecha_ingreso)
        flash(f"El vehículo {placa} ingresó el {fecha_formateada}. Su movimiento está activo.", "success")
        
        return render_template('registrar_entrada.html',
                               datos=datos,
                               errores={},
                               exito=True,
                               movimiento_activo={'placa': placa, 'fecha_hora_entrada': fecha_ingreso, 'estado': 'ACTIVO'})

    except mysql.connector.Error as err:
        conn.rollback()
        flash(f"Error en la base de datos al registrar entrada: {err.msg}", "danger")
        return render_template('registrar_entrada.html', datos=datos, errores=errores)
    finally:
        cursor.close()
        conn.close()


# ==============================================================
# RUTA 3: REGISTRAR SALIDA DE VEHÍCULO
# ==============================================================
@app.route('/registrar-salida', methods=['GET', 'POST'])
def registrar_salida():
    """
    Gestiona la salida de vehículos:
    - Búsqueda por placa.
    - Muestra datos del vehículo y el movimiento activo.
    - Al confirmar, registra fecha y hora de salida y cambia estado a 'FINALIZADO'.
    - Impide salida si el vehículo no tiene movimiento activo.
    """
    placa_busqueda = request.args.get('placa', '').strip().upper() or request.form.get('placa', '').strip().upper()
    accion = request.form.get('accion', '')

    vehiculo = None
    movimiento_activo = None
    resumen_salida = None

    if not placa_busqueda:
        return render_template('registrar_salida.html', placa_busqueda='', vehiculo=None, movimiento_activo=None)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=None, movimiento_activo=None)

    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Buscar vehículo en la base de datos
        cursor.execute("SELECT * FROM vehiculo WHERE placa = %s", (placa_busqueda,))
        vehiculo = cursor.fetchone()

        if not vehiculo:
            flash(f"No se encontró ningún vehículo registrado con la placa {placa_busqueda}.", "danger")
            return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=None, movimiento_activo=None)

        # 2. Si el usuario presionó el botón 'Registrar salida'
        # 2. Si el usuario presionó el botón 'Registrar salida'
        if request.method == 'POST' and accion == 'confirmar_salida':
        # La consulta SELECT anterior puede haber iniciado una transacción.
        # Cerramos esa transacción de lectura antes de iniciar la de salida.
         conn.rollback()
         conn.start_transaction()

            # Bloqueamos el movimiento activo para actualizarlo de forma atómica
        cursor.execute("""
                SELECT id_movimiento, fecha_hora_entrada, estado, placa
                FROM movimiento
                WHERE placa = %s AND estado = 'ACTIVO'
                FOR UPDATE
            """, (placa_busqueda,))
        mov = cursor.fetchone()

        if not mov:
                conn.rollback()
                flash(f"El vehículo {placa_busqueda} no tiene un movimiento activo en este momento. Ya se encuentra fuera del parqueadero.", "warning")
                return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=vehiculo, movimiento_activo=None)

            # Actualizar el movimiento con fecha_hora_salida = NOW() y estado = 'FINALIZADO'
        cursor.execute("""
                UPDATE movimiento
                SET fecha_hora_salida = NOW(), estado = 'FINALIZADO'
                WHERE id_movimiento = %s
            """, (mov['id_movimiento'],))

            # Consultar los datos actualizados para mostrarlos en el resumen de salida
        cursor.execute("""
                SELECT id_movimiento, placa, fecha_hora_entrada, fecha_hora_salida, estado
                FROM movimiento
                WHERE id_movimiento = %s
            """, (mov['id_movimiento'],))
        resumen_salida = cursor.fetchone()

        conn.commit()

        fecha_salida = resumen_salida['fecha_hora_salida']
        fecha_str = fecha_salida.strftime('%d de %B de %Y a las %H:%M') if isinstance(fecha_salida, datetime) else str(fecha_salida)
        flash(f"Se registró la salida de {placa_busqueda} el {fecha_str}. El movimiento ha finalizado.", "success")

        return render_template('registrar_salida.html',
                                   placa_busqueda=placa_busqueda,
                                   vehiculo=vehiculo,
                                   movimiento_activo=None,
                                   resumen_salida=resumen_salida,
                                   salida_exitosa=True)

        # 3. Si es solo búsqueda o visualización previa
        cursor.execute("""
            SELECT id_movimiento, fecha_hora_entrada, fecha_hora_salida, estado, placa
            FROM movimiento
            WHERE placa = %s AND estado = 'ACTIVO'
        """, (placa_busqueda,))
        movimiento_activo = cursor.fetchone()

        if not movimiento_activo:
            flash(f"El vehículo {placa_busqueda} está registrado, pero actualmente no tiene un movimiento activo (está fuera del parqueadero).", "info")

        return render_template('registrar_salida.html',
                               placa_busqueda=placa_busqueda,
                               vehiculo=vehiculo,
                               movimiento_activo=movimiento_activo)

    except mysql.connector.Error as err:
        conn.rollback()
        flash(f"Error al procesar la salida: {err.msg}", "danger")
        return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=None, movimiento_activo=None)
    finally:
        cursor.close()
        conn.close()


# ==============================================================
# RUTA 4: CONSULTAR VEHÍCULO Y SU ESTADO
# ==============================================================
@app.route('/consultar-vehiculo', methods=['GET'])
def consultar_vehiculo():
    """
    Permite consultar los datos de un vehículo por su placa
    y determinar su estado actual:
    - 'En parqueadero' (si tiene movimiento activo).
    - 'Fuera del parqueadero' (si no tiene movimiento activo).
    """
    placa_busqueda = request.args.get('placa', '').strip().upper()
    if not placa_busqueda:
        return render_template('consultar_vehiculo.html', placa_busqueda='', vehiculo=None)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template('consultar_vehiculo.html', placa_busqueda=placa_busqueda, vehiculo=None)

    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Obtener datos del vehículo
        cursor.execute("SELECT * FROM vehiculo WHERE placa = %s", (placa_busqueda,))
        vehiculo = cursor.fetchone()

        if not vehiculo:
            flash(f"No se encontró ningún vehículo con la placa '{placa_busqueda}'. Verifica los datos ingresados.", "danger")
            return render_template('consultar_vehiculo.html', placa_busqueda=placa_busqueda, vehiculo=None)

        # 2. Consultar si tiene un movimiento activo
        cursor.execute("""
            SELECT id_movimiento, fecha_hora_entrada, fecha_hora_salida, estado, placa
            FROM movimiento
            WHERE placa = %s AND estado = 'ACTIVO'
        """, (placa_busqueda,))
        movimiento_activo = cursor.fetchone()

        return render_template('consultar_vehiculo.html',
                               placa_busqueda=placa_busqueda,
                               vehiculo=vehiculo,
                               movimiento_activo=movimiento_activo)

    except mysql.connector.Error as err:
        flash(f"Error al consultar el vehículo: {err.msg}", "danger")
        return render_template('consultar_vehiculo.html', placa_busqueda=placa_busqueda, vehiculo=None)
    finally:
        cursor.close()
        conn.close()


# ==============================================================
# RUTA 5: CONSULTAR HISTORIAL DE MOVIMIENTOS
# ==============================================================
@app.route('/historial', methods=['GET'])
def historial():
    """
    Muestra la lista de entradas y salidas de un vehículo por su placa,
    ordenadas del más reciente al más antiguo.
    Si el movimiento está activo, la fecha de salida se muestra como '—'.
    """
    placa_busqueda = request.args.get('placa', '').strip().upper()
    if not placa_busqueda:
        return render_template('historial.html', placa_busqueda='', movimientos=None, vehiculo=None)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template('historial.html', placa_busqueda=placa_busqueda, movimientos=None, vehiculo=None)

    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Verificar si el vehículo existe
        cursor.execute("SELECT * FROM vehiculo WHERE placa = %s", (placa_busqueda,))
        vehiculo = cursor.fetchone()

        # 2. Consultar todos los movimientos ordenados DESC
        cursor.execute("""
            SELECT id_movimiento, fecha_hora_entrada, fecha_hora_salida, estado, observaciones, placa
            FROM movimiento
            WHERE placa = %s
            ORDER BY fecha_hora_entrada DESC
        """, (placa_busqueda,))
        movimientos = cursor.fetchall()

        return render_template('historial.html',
                               placa_busqueda=placa_busqueda,
                               vehiculo=vehiculo,
                               movimientos=movimientos)

    except mysql.connector.Error as err:
        flash(f"Error al consultar el historial: {err.msg}", "danger")
        return render_template('historial.html', placa_busqueda=placa_busqueda, movimientos=None, vehiculo=None)
    finally:
        cursor.close()
        conn.close()


# ==============================================================
# RUTA 6: API JSON (Para autocompletado en JavaScript puro)
# ==============================================================
@app.route('/api/vehiculo/<placa>')
def api_buscar_vehiculo(placa):
    """
    Endpoint JSON que permite a JavaScript consultar si un vehículo
    ya existe en la base de datos para autocompletar su marca, modelo y color
    sin recargar toda la página.
    """
    placa_limpia = placa.strip().upper()
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'No hay conexión con la base de datos'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM vehiculo WHERE placa = %s", (placa_limpia,))
        vehiculo = cursor.fetchone()

        cursor.execute("""
            SELECT id_movimiento, fecha_hora_entrada, estado 
            FROM movimiento 
            WHERE placa = %s AND estado = 'ACTIVO'
        """, (placa_limpia,))
        movimiento_activo = cursor.fetchone()

        if vehiculo:
            # Formatear fecha para JSON si existe
            if movimiento_activo and isinstance(movimiento_activo.get('fecha_hora_entrada'), datetime):
                movimiento_activo['fecha_hora_entrada'] = movimiento_activo['fecha_hora_entrada'].strftime('%Y-%m-%d %H:%M:%S')

            return jsonify({
                'encontrado': True,
                'vehiculo': vehiculo,
                'tiene_activo': bool(movimiento_activo),
                'movimiento_activo': movimiento_activo
            })
        else:
            return jsonify({'encontrado': False})

    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()


# ==============================================================
# INICIO DEL SERVIDOR FLASK
# ==============================================================
if __name__ == '__main__':
    # En desarrollo local desde Visual Studio Code ejecutamos en puerto 5000 o configurable
    print("\n" + "="*60)
    print("  AUTOS COLOMBIA - SISTEMA DE CONTROL DE PARQUEADERO")
    print("  Servidor iniciado localmente.")
    print("  Abre en tu navegador: http://127.0.0.1:5000")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
