"""
==============================================================
AUTOS COLOMBIA - DAO: CELDA
Archivo: dao/celda_dao.py
Responsabilidad: Gestión de ocupación y estado de las 80 celdas
                 (70 Carros C-01..C-70, 10 Motos M-01..M-10).
==============================================================
"""

class CeldaDAO:
    """
    Objeto de Acceso a Datos y mapeo de las 80 celdas del parqueadero.
    """
    TOTAL_CARROS = 70
    TOTAL_MOTOS = 10
    TOTAL_CELDAS = 80

    @classmethod
    def generar_catalogo_celdas(cls):
        """Genera el catálogo maestro estático de las 80 celdas."""
        celdas = []
        for i in range(1, cls.TOTAL_CARROS + 1):
            celdas.append({
                'codigo': f"C-{i:02d}",
                'tipo': 'CARRO',
                'numero': i
            })
        for i in range(1, cls.TOTAL_MOTOS + 1):
            celdas.append({
                'codigo': f"M-{i:02d}",
                'tipo': 'MOTO',
                'numero': i
            })
        return celdas

    @staticmethod
    def obtener_celdas_ocupadas(cursor):
        """
        Consulta en MySQL el conjunto de códigos de celdas actualmente ocupadas
        por movimientos en estado 'ACTIVO'.
        
        Retorna:
            set[str]: Conjunto de códigos (ej: {'C-01', 'C-14', 'M-02'})
        """
        sql = "SELECT celda FROM movimiento WHERE estado = 'ACTIVO' AND celda IS NOT NULL"
        cursor.execute(sql)
        filas = cursor.fetchall()
        return {r['celda'] for r in filas if r.get('celda')}

    @classmethod
    def obtener_primera_celda_libre(cls, cursor, tipo_vehiculo):
        """
        Calcula de forma atómica y determinística la primera celda disponible
        para el tipo de vehículo especificado.
        
        Args:
            cursor: Cursor activo de MySQL.
            tipo_vehiculo (str): 'Carro' o 'Moto'.
            
        Retorna:
            str | None: Código de celda (ej: 'C-01', 'M-03') o None si está lleno.
        """
        ocupadas = cls.obtener_celdas_ocupadas(cursor)
        es_moto = 'moto' in tipo_vehiculo.lower()

        if es_moto:
            for i in range(1, cls.TOTAL_MOTOS + 1):
                codigo = f"M-{i:02d}"
                if codigo not in ocupadas:
                    return codigo
        else:
            for i in range(1, cls.TOTAL_CARROS + 1):
                codigo = f"C-{i:02d}"
                if codigo not in ocupadas:
                    return codigo
        return None
