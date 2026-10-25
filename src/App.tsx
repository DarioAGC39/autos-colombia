/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Car,
  Home,
  LogIn,
  LogOut,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  RotateCcw,
  Calendar,
  User,
  ArrowRight,
  Database
} from 'lucide-react';

// Tipos de datos para el sistema
interface Vehiculo {
  placa: string;
  tipo: string;
  color: string;
  marca: string;
  modelo: string;
}

interface Movimiento {
  id: number;
  placa: string;
  fecha_hora_entrada: string;
  fecha_hora_salida: string | null;
  estado: 'ACTIVO' | 'FINALIZADO';
  observaciones: string;
}

// Datos de prueba iniciales (Conforme a los mockups de Figma para KLM482)
const VEHICULOS_INICIALES: Record<string, Vehiculo> = {
  'KLM482': { placa: 'KLM482', tipo: 'Automóvil', color: 'Gris plata', marca: 'Renault', modelo: 'Logan 2022' },
  'ABC123': { placa: 'ABC123', tipo: 'Automóvil', color: 'Rojo escarlata', marca: 'Mazda', modelo: 'Mazda 3 2021' },
  'XYZ789': { placa: 'XYZ789', tipo: 'Camioneta', color: 'Blanco', marca: 'Toyota', modelo: 'Prado 2023' },
  'MOT101': { placa: 'MOT101', tipo: 'Motocicleta', color: 'Negro', marca: 'Yamaha', modelo: 'FZ 250 2022' },
};

const MOVIMIENTOS_INICIALES: Movimiento[] = [
  { id: 5, placa: 'KLM482', fecha_hora_entrada: '23 oct 2026 · 08:32', fecha_hora_salida: null, estado: 'ACTIVO', observaciones: 'Vehículo actualmente en el parqueadero' },
  { id: 4, placa: 'KLM482', fecha_hora_entrada: '22 oct 2026 · 08:15', fecha_hora_salida: '22 oct 2026 · 17:38', estado: 'FINALIZADO', observaciones: 'Salida puntual' },
  { id: 3, placa: 'KLM482', fecha_hora_entrada: '21 oct 2026 · 08:26', fecha_hora_salida: '21 oct 2026 · 18:04', estado: 'FINALIZADO', observaciones: 'Horas extra autorizadas' },
  { id: 2, placa: 'KLM482', fecha_hora_entrada: '20 oct 2026 · 07:58', fecha_hora_salida: '20 oct 2026 · 17:32', estado: 'FINALIZADO', observaciones: 'Salida normal' },
  { id: 1, placa: 'KLM482', fecha_hora_entrada: '19 oct 2026 · 08:10', fecha_hora_salida: '19 oct 2026 · 17:51', estado: 'FINALIZADO', observaciones: 'Jornada laboral completa' },
];

export default function App() {
  // Vista activa del sistema administrativo
  const [seccionActiva, setSeccionActiva] = useState<'inicio' | 'registrar_entrada' | 'registrar_salida' | 'consultar_vehiculo' | 'historial'>('inicio');

  // Estado del Parqueadero (Persistente en LocalStorage)
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo>>(() => {
    const saved = localStorage.getItem('autos_colombia_vehiculos');
    return saved ? JSON.parse(saved) : VEHICULOS_INICIALES;
  });

  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => {
    const saved = localStorage.getItem('autos_colombia_movimientos');
    return saved ? JSON.parse(saved) : MOVIMIENTOS_INICIALES;
  });

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('autos_colombia_vehiculos', JSON.stringify(vehiculos));
  }, [vehiculos]);

  useEffect(() => {
    localStorage.setItem('autos_colombia_movimientos', JSON.stringify(movimientos));
  }, [movimientos]);

  // Reloj Colombia en tiempo real
  const [horaColombia, setHoraColombia] = useState<string>('23 de octubre de 2026 - 08:32 · Hora de Colombia');

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date();
      try {
        const opciones: Intl.DateTimeFormatOptions = {
          timeZone: 'America/Bogota',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        const formatter = new Intl.DateTimeFormat('es-CO', opciones);
        const parts = formatter.formatToParts(ahora);
        let dia = '', mes = '', anio = '', hora = '', min = '';
        parts.forEach(p => {
          if (p.type === 'day') dia = p.value;
          if (p.type === 'month') mes = p.value;
          if (p.type === 'year') anio = p.value;
          if (p.type === 'hour') hora = p.value;
          if (p.type === 'minute') min = p.value;
        });
        setHoraColombia(`${dia} de ${mes} de ${anio} - ${hora}:${min} · Hora de Colombia`);
      } catch {
        setHoraColombia('23 de octubre de 2026 - 08:32 · Hora de Colombia');
      }
    };
    actualizar();
    const interval = setInterval(actualizar, 10000);
    return () => clearInterval(interval);
  }, []);

  // Función para obtener fecha y hora formateada para nuevos movimientos
  const getFechaHoraActualFormateada = () => {
    const ahora = new Date();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = ahora.getDate();
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const mins = String(ahora.getMinutes()).padStart(2, '0');
    return `${dia} ${mes} ${anio} · ${horas}:${mins}`;
  };

  // Función para reiniciar datos a los iniciales
  const reiniciarDatos = () => {
    if (window.confirm('¿Deseas reiniciar los datos de prueba a su estado original (KLM482 precargado)?')) {
      setVehiculos(VEHICULOS_INICIALES);
      setMovimientos(MOVIMIENTOS_INICIALES);
      setAlertaGeneral({ tipo: 'info', mensaje: 'Datos de prueba reiniciados correctamente al estado de los mockups.' });
    }
  };

  // ==============================================================
  // ESTADO PARA "REGISTRAR ENTRADA"
  // ==============================================================
  const [formEntrada, setFormEntrada] = useState({
    placa: '',
    tipo: '',
    color: '',
    marca: '',
    modelo: ''
  });
  const [erroresEntrada, setErroresEntrada] = useState<Record<string, string>>({});
  const [alertaEntrada, setAlertaEntrada] = useState<{ tipo: 'success' | 'danger' | 'warning'; titulo: string; mensaje: string; activoData?: Movimiento } | null>(null);
  const [entradaExitosa, setEntradaExitosa] = useState(false);

  // Auto-completado cuando el usuario escribe una placa existente
  const handlePlacaEntradaChange = (val: string) => {
    const limpia = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    setFormEntrada(prev => ({ ...prev, placa: limpia }));

    // Si ya tiene 6 caracteres y existe en el registro
    if (limpia.length >= 6 && vehiculos[limpia]) {
      const v = vehiculos[limpia];
      setFormEntrada(prev => ({
        ...prev,
        tipo: v.tipo,
        color: v.color,
        marca: v.marca,
        modelo: v.modelo
      }));

      // Verificar si ya tiene un movimiento activo
      const movActivo = movimientos.find(m => m.placa === limpia && m.estado === 'ACTIVO');
      if (movActivo) {
        setAlertaEntrada({
          tipo: 'warning',
          titulo: 'Este vehículo ya tiene un movimiento activo',
          mensaje: `No se puede registrar otra entrada para ${limpia}. Primero debes registrar la salida del vehículo.`,
          activoData: movActivo
        });
      } else {
        setAlertaEntrada(null);
      }
    }
  };

  const handleRegistrarEntradaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { placa, tipo, color, marca, modelo } = formEntrada;
    const nuevosErrores: Record<string, string> = {};

    // Validaciones estrictas
    const regexPlaca = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]{1}$/;
    if (!placa) {
      nuevosErrores.placa = 'La placa es obligatoria.';
    } else if (!regexPlaca.test(placa)) {
      nuevosErrores.placa = 'Formato inválido. Usa 3 letras y 3 números (KLM482).';
    }

    if (!tipo) nuevosErrores.tipo = 'Selecciona el tipo de vehículo.';
    if (!color.trim()) nuevosErrores.color = 'Ingresa el color del vehículo.';
    if (!marca.trim()) nuevosErrores.marca = 'Ingresa la marca del vehículo.';
    if (!modelo.trim()) nuevosErrores.modelo = 'Ingresa el modelo del vehículo.';

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresEntrada(nuevosErrores);
      setAlertaEntrada({
        tipo: 'danger',
        titulo: 'Revisa los datos del vehículo',
        mensaje: 'No se pudo registrar la entrada. Corrige la placa y completa los campos obligatorios indicados.'
      });
      return;
    }

    // Comprobar si ya tiene movimiento activo
    const movActivo = movimientos.find(m => m.placa === placa && m.estado === 'ACTIVO');
    if (movActivo) {
      setAlertaEntrada({
        tipo: 'warning',
        titulo: 'Este vehículo ya tiene un movimiento activo',
        mensaje: `No se puede registrar otra entrada para ${placa}. Primero debes registrar la salida del vehículo.`,
        activoData: movActivo
      });
      return;
    }

    // Registrar o actualizar vehículo
    const nuevoVehiculo: Vehiculo = { placa, tipo, color, marca, modelo };
    setVehiculos(prev => ({ ...prev, [placa]: nuevoVehiculo }));

    // Crear nuevo movimiento con fecha y hora actual
    const nuevaFecha = getFechaHoraActualFormateada();
    const nuevoMovimiento: Movimiento = {
      id: Date.now(),
      placa,
      fecha_hora_entrada: nuevaFecha,
      fecha_hora_salida: null,
      estado: 'ACTIVO',
      observaciones: 'Ingreso regular registrado en sistema'
    };

    setMovimientos(prev => [nuevoMovimiento, ...prev]);
    setEntradaExitosa(true);
    setErroresEntrada({});
    setAlertaEntrada({
      tipo: 'success',
      titulo: 'Entrada registrada correctamente',
      mensaje: `El vehículo ${placa} ingresó el ${nuevaFecha}. Su movimiento está activo.`,
      activoData: nuevoMovimiento
    });
  };

  const limpiarFormEntrada = () => {
    setFormEntrada({ placa: '', tipo: '', color: '', marca: '', modelo: '' });
    setErroresEntrada({});
    setAlertaEntrada(null);
    setEntradaExitosa(false);
  };

  // ==============================================================
  // ESTADO PARA "REGISTRAR SALIDA"
  // ==============================================================
  const [placaBusquedaSalida, setPlacaBusquedaSalida] = useState('KLM482');
  const [vehiculoSalidaEncontrado, setVehiculoSalidaEncontrado] = useState<Vehiculo | null>(VEHICULOS_INICIALES['KLM482']);
  const [movActivoSalida, setMovActivoSalida] = useState<Movimiento | null>(MOVIMIENTOS_INICIALES[0]);
  const [salidaExitosaData, setSalidaExitosaData] = useState<Movimiento | null>(null);
  const [alertaSalida, setAlertaSalida] = useState<{ tipo: 'success' | 'danger' | 'info'; mensaje: string } | null>(null);

  const buscarParaSalida = (placa: string) => {
    const limpia = placa.toUpperCase().trim();
    if (!limpia) return;
    setSalidaExitosaData(null);

    const veh = vehiculos[limpia];
    if (!veh) {
      setVehiculoSalidaEncontrado(null);
      setMovActivoSalida(null);
      setAlertaSalida({ tipo: 'danger', mensaje: `No se encontró ningún vehículo registrado con la placa ${limpia}.` });
      return;
    }

    setVehiculoSalidaEncontrado(veh);
    const movAct = movimientos.find(m => m.placa === limpia && m.estado === 'ACTIVO');
    setMovActivoSalida(movAct || null);

    if (!movAct) {
      setAlertaSalida({ tipo: 'info', mensaje: `El vehículo ${limpia} está registrado, pero actualmente no tiene un movimiento activo (se encuentra fuera).` });
    } else {
      setAlertaSalida(null);
    }
  };

  const confirmarSalida = () => {
    if (!vehiculoSalidaEncontrado || !movActivoSalida) return;

    const fechaSalida = getFechaHoraActualFormateada();
    const movFinalizado: Movimiento = {
      ...movActivoSalida,
      fecha_hora_salida: fechaSalida,
      estado: 'FINALIZADO'
    };

    setMovimientos(prev => prev.map(m => m.id === movActivoSalida.id ? movFinalizado : m));
    setMovActivoSalida(null);
    setSalidaExitosaData(movFinalizado);
    setAlertaSalida({
      tipo: 'success',
      mensaje: `Se registró la salida de ${vehiculoSalidaEncontrado.placa} el ${fechaSalida}. El movimiento ha finalizado.`
    });
  };

  // ==============================================================
  // ESTADO PARA "CONSULTAR VEHÍCULO"
  // ==============================================================
  const [placaBusquedaConsulta, setPlacaBusquedaConsulta] = useState('KLM482');
  const [vehiculoConsulta, setVehiculoConsulta] = useState<Vehiculo | null>(VEHICULOS_INICIALES['KLM482']);
  const [movActivoConsulta, setMovActivoConsulta] = useState<Movimiento | null>(MOVIMIENTOS_INICIALES[0]);
  const [alertaConsulta, setAlertaConsulta] = useState<string | null>(null);

  const buscarParaConsulta = (placa: string) => {
    const limpia = placa.toUpperCase().trim();
    if (!limpia) return;

    const veh = vehiculos[limpia];
    if (!veh) {
      setVehiculoConsulta(null);
      setMovActivoConsulta(null);
      setAlertaConsulta(`No se encontró ningún vehículo con la placa '${limpia}'. Verifica los datos ingresados.`);
      return;
    }

    setVehiculoConsulta(veh);
    const movAct = movimientos.find(m => m.placa === limpia && m.estado === 'ACTIVO');
    setMovActivoConsulta(movAct || null);
    setAlertaConsulta(null);
  };

  // ==============================================================
  // ESTADO PARA "HISTORIAL DE MOVIMIENTOS"
  // ==============================================================
  const [placaBusquedaHistorial, setPlacaBusquedaHistorial] = useState('KLM482');
  const [historialResultados, setHistorialResultados] = useState<Movimiento[] | null>(
    MOVIMIENTOS_INICIALES.filter(m => m.placa === 'KLM482')
  );
  const [placaConsultadaHistorial, setPlacaConsultadaHistorial] = useState('KLM482');

  const buscarParaHistorial = (placa: string) => {
    const limpia = placa.toUpperCase().trim();
    if (!limpia) return;
    setPlacaConsultadaHistorial(limpia);
    const resultados = movimientos.filter(m => m.placa === limpia);
    setHistorialResultados(resultados);
  };

  // Alerta global
  const [alertaGeneral, setAlertaGeneral] = useState<{ tipo: string; mensaje: string } | null>(null);

  // Estadísticas del Dashboard
  const totalActivos = movimientos.filter(m => m.estado === 'ACTIVO').length;
  const totalVehiculosRegistrados = Object.keys(vehiculos).length;
  const salidasFinalizadas = movimientos.filter(m => m.estado === 'FINALIZADO').length;

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* SIDEBAR AZUL OSCURO (Fiel a los mockups de Figma) */}
      <aside className="w-64 bg-[#0b1320] text-slate-300 flex flex-col shrink-0 border-r border-white/5 sticky top-0 h-screen">
            {/* Logotipo y Título */}
            <div className="p-5 flex items-center gap-3 border-b border-white/5">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight tracking-tight">Autos Colombia</h1>
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 block mt-0.5">PARQUEADERO MENSUAL</span>
              </div>
            </div>

            {/* Menú de Operación Diaria */}
            <div className="flex-1 px-3 py-5">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider block px-3 mb-2">OPERACIÓN DIARIA</span>
              <nav className="space-y-1">
                <button
                  onClick={() => setSeccionActiva('inicio')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    seccionActiva === 'inicio'
                      ? 'bg-[#1e60f2] text-white shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Inicio</span>
                </button>

                <button
                  onClick={() => {
                    setSeccionActiva('registrar_entrada');
                    setAlertaEntrada(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    seccionActiva === 'registrar_entrada'
                      ? 'bg-[#1e60f2] text-white shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Registrar entrada</span>
                </button>

                <button
                  onClick={() => {
                    setSeccionActiva('registrar_salida');
                    buscarParaSalida(placaBusquedaSalida || 'KLM482');
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    seccionActiva === 'registrar_salida'
                      ? 'bg-[#1e60f2] text-white shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Registrar salida</span>
                </button>

                <button
                  onClick={() => {
                    setSeccionActiva('consultar_vehiculo');
                    buscarParaConsulta(placaBusquedaConsulta || 'KLM482');
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    seccionActiva === 'consultar_vehiculo'
                      ? 'bg-[#1e60f2] text-white shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Consultar vehículo</span>
                </button>

                <button
                  onClick={() => {
                    setSeccionActiva('historial');
                    buscarParaHistorial(placaBusquedaHistorial || 'KLM482');
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    seccionActiva === 'historial'
                      ? 'bg-[#1e60f2] text-white shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Historial de movimientos</span>
                </button>
              </nav>
            </div>

            {/* Pie de Sidebar: Estado del Sistema */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                <span>Sistema disponible</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Autos Colombia · 2026</p>
            </div>
          </aside>

          {/* CONTENEDOR PRINCIPAL */}
          <main className="flex-1 flex flex-col min-w-0">

            {/* Encabezado Superior (Topbar) */}
            <header className="bg-white h-16 border-b border-slate-200 px-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Control de acceso</span>
                <span className="text-slate-400">/</span>
                <span className="font-semibold text-slate-800">
                  {seccionActiva === 'inicio' && 'Inicio'}
                  {seccionActiva === 'registrar_entrada' && 'Registrar entrada'}
                  {seccionActiva === 'registrar_salida' && 'Registrar salida'}
                  {seccionActiva === 'consultar_vehiculo' && 'Consultar vehículo'}
                  {seccionActiva === 'historial' && 'Historial de movimientos'}
                </span>
              </div>

              {/* Perfil del Operador */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left leading-tight">
                  <span className="block text-xs font-bold text-slate-800">Empleado</span>
                  <span className="text-[11px] text-slate-400">Personal de parqueadero</span>
                </div>
              </div>
            </header>

            {/* Reloj de Colombia */}
            <div className="px-8 pt-4 pb-2 flex justify-end">
              <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{horaColombia}</span>
              </div>
            </div>

            {/* Alerta general si existe */}
            {alertaGeneral && (
              <div className="px-8 mb-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs flex justify-between items-center">
                  <span>{alertaGeneral.mensaje}</span>
                  <button onClick={() => setAlertaGeneral(null)} className="font-bold ml-4">✕</button>
                </div>
              </div>
            )}

            {/* CONTENIDO DE LA PÁGINA SEGÚN SECCIÓN */}
            <div className="flex-1 px-8 py-4">

              {/* ------------------------------------------------------------- */}
              {/* SECCIÓN 1: INICIO (DASHBOARD)                                  */}
              {/* ------------------------------------------------------------- */}
              {seccionActiva === 'inicio' && (
                <div className="space-y-6 max-w-6xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bienvenido a Autos Colombia</h2>
                    <p className="text-sm text-slate-500 mt-1">Sistema de gestión y control de entrada y salida para parqueadero mensual.</p>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900">{totalActivos}</div>
                        <div className="text-xs font-medium text-slate-500">Vehículos en parqueadero</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900">{totalVehiculosRegistrados}</div>
                        <div className="text-xs font-medium text-slate-500">Vehículos registrados en total</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900">{salidasFinalizadas}</div>
                        <div className="text-xs font-medium text-slate-500">Salidas finalizadas</div>
                      </div>
                    </div>
                  </div>

                  {/* Accesos rápidos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => setSeccionActiva('registrar_entrada')}
                      className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md transition text-left group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <LogIn className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Registrar entrada</h3>
                      <p className="text-xs text-slate-500">Ingreso de un vehículo al parqueadero con validación de placa.</p>
                    </button>

                    <button
                      onClick={() => {
                        setSeccionActiva('registrar_salida');
                        buscarParaSalida('KLM482');
                      }}
                      className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md transition text-left group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Registrar salida</h3>
                      <p className="text-xs text-slate-500">Búsqueda por placa y confirmación de salida de vehículos.</p>
                    </button>

                    <button
                      onClick={() => {
                        setSeccionActiva('consultar_vehiculo');
                        buscarParaConsulta('KLM482');
                      }}
                      className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md transition text-left group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Search className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Consultar vehículo</h3>
                      <p className="text-xs text-slate-500">Verifica si un carro está «En parqueadero» o «Fuera».</p>
                    </button>

                    <button
                      onClick={() => {
                        setSeccionActiva('historial');
                        buscarParaHistorial('KLM482');
                      }}
                      className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md transition text-left group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Historial de movimientos</h3>
                      <p className="text-xs text-slate-500">Consulta el registro cronológico completo de cualquier placa.</p>
                    </button>
                  </div>

                  {/* Tabla de movimientos recientes */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="font-bold text-slate-900 text-base mb-1">Últimos movimientos registrados</h3>
                    <p className="text-xs text-slate-500 mb-4">Actividad en tiempo real del parqueadero</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                            <th className="py-3 px-4">Placa</th>
                            <th className="py-3 px-4">Vehículo</th>
                            <th className="py-3 px-4">Entrada</th>
                            <th className="py-3 px-4">Salida</th>
                            <th className="py-3 px-4">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movimientos.slice(0, 5).map(m => {
                            const v = vehiculos[m.placa];
                            return (
                              <tr key={m.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-slate-900">{m.placa}</td>
                                <td className="py-3 px-4 text-slate-600">
                                  {v ? `${v.marca} ${v.modelo} (${v.tipo})` : '—'}
                                </td>
                                <td className="py-3 px-4 text-slate-600">{m.fecha_hora_entrada}</td>
                                <td className="py-3 px-4 text-slate-600">{m.fecha_hora_salida || '—'}</td>
                                <td className="py-3 px-4">
                                  {m.estado === 'ACTIVO' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Finalizado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECCIÓN 2: REGISTRAR ENTRADA (FIGMA SCREENS 1, 2, 3, 4)        */}
              {/* ------------------------------------------------------------- */}
              {seccionActiva === 'registrar_entrada' && (
                <div className="space-y-5 max-w-6xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Registrar entrada</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Registra el ingreso de un vehículo al parqueadero.</p>
                  </div>

                  {/* Banners de Alerta (Verde / Rojo / Amarillo de Figma) */}
                  {alertaEntrada && (
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                        alertaEntrada.tipo === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : alertaEntrada.tipo === 'danger'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {alertaEntrada.tipo === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                      {alertaEntrada.tipo === 'danger' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                      {alertaEntrada.tipo === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                      <div>
                        <h4 className="font-semibold text-sm">{alertaEntrada.titulo}</h4>
                        <p className="text-xs mt-0.5 opacity-90">{alertaEntrada.mensaje}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* FORMULARIO (2 COLUMNAS) */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-7 shadow-xs">
                      <div className="mb-6 pb-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 text-base">Datos del vehículo</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Completa la información para registrar el ingreso.</p>
                        <span className="text-[11px] text-slate-400 block mt-1">Todos los campos son obligatorios.</span>
                      </div>

                      <form onSubmit={handleRegistrarEntradaSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Placa */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Placa del vehículo <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. KLM482"
                              value={formEntrada.placa}
                              onChange={e => handlePlacaEntradaChange(e.target.value)}
                              disabled={entradaExitosa}
                              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm uppercase tracking-wider font-medium outline-hidden transition ${
                                erroresEntrada.placa
                                  ? 'border-red-500 bg-red-50/20 focus:border-red-500'
                                  : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                              } ${entradaExitosa ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                            {erroresEntrada.placa ? (
                              <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>{erroresEntrada.placa}</span>
                              </p>
                            ) : (
                              <p className="text-slate-400 text-[11px] mt-1">Sin espacios ni guiones. Ejemplo: KLM482.</p>
                            )}
                          </div>

                          {/* Tipo */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Tipo de vehículo <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formEntrada.tipo}
                              onChange={e => setFormEntrada({ ...formEntrada, tipo: e.target.value })}
                              disabled={entradaExitosa}
                              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-hidden transition ${
                                erroresEntrada.tipo
                                  ? 'border-red-500 bg-red-50/20'
                                  : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                              } ${entradaExitosa ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                            >
                              <option value="" disabled>Selecciona el tipo</option>
                              <option value="Automóvil">Automóvil</option>
                              <option value="Motocicleta">Motocicleta</option>
                              <option value="Camioneta">Camioneta</option>
                              <option value="Camión">Camión</option>
                              <option value="Otro">Otro</option>
                            </select>
                            {erroresEntrada.tipo && (
                              <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>{erroresEntrada.tipo}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Color */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Color <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. Gris plata"
                              value={formEntrada.color}
                              onChange={e => setFormEntrada({ ...formEntrada, color: e.target.value })}
                              disabled={entradaExitosa}
                              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-hidden transition ${
                                erroresEntrada.color ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                              } ${entradaExitosa ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                            {erroresEntrada.color && (
                              <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>{erroresEntrada.color}</span>
                              </p>
                            )}
                          </div>

                          {/* Marca */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Marca <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. Renault"
                              value={formEntrada.marca}
                              onChange={e => setFormEntrada({ ...formEntrada, marca: e.target.value })}
                              disabled={entradaExitosa}
                              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-hidden transition ${
                                erroresEntrada.marca ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                              } ${entradaExitosa ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                            {erroresEntrada.marca && (
                              <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>{erroresEntrada.marca}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Modelo */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Modelo <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Logan 2022"
                            value={formEntrada.modelo}
                            onChange={e => setFormEntrada({ ...formEntrada, modelo: e.target.value })}
                            disabled={entradaExitosa}
                            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-hidden transition ${
                              erroresEntrada.modelo ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                            } ${entradaExitosa ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                          />
                          {erroresEntrada.modelo && (
                            <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              <span>{erroresEntrada.modelo}</span>
                            </p>
                          )}
                        </div>

                        {/* Botones de Acción */}
                        <div className="pt-5 border-t border-slate-100 flex justify-end gap-3">
                          {entradaExitosa ? (
                            <>
                              <button
                                type="button"
                                onClick={limpiarFormEntrada}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                              >
                                Nueva entrada
                              </button>
                              <button
                                type="button"
                                disabled
                                className="px-5 py-2.5 rounded-lg bg-blue-300 text-white font-semibold text-sm cursor-not-allowed inline-flex items-center gap-2"
                              >
                                <span>Registrar entrada</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={limpiarFormEntrada}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                              >
                                Limpiar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2.5 rounded-lg bg-[#1e60f2] hover:bg-[#174ecc] text-white font-semibold text-sm shadow-sm transition inline-flex items-center gap-2"
                              >
                                <span>Registrar entrada</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* COLUMNA DERECHA: TARJETAS DE INFORMACIÓN */}
                    <div className="space-y-4">
                      {/* Antes de registrar */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Info className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">Antes de registrar</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Verifica la placa y las características del vehículo antes de confirmar su ingreso.
                        </p>
                        <p className="text-xs font-semibold text-blue-700 bg-blue-50/70 p-2 rounded-md mt-2">
                          Solo puede existir un movimiento activo por vehículo.
                        </p>
                      </div>

                      {/* Registro automático */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">Registro automático</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          La fecha y hora de entrada se asignan automáticamente con la hora oficial del sistema al confirmar el registro.
                        </p>
                      </div>

                      {/* Tarjeta: Movimiento actual si existe o se acaba de registrar */}
                      {alertaEntrada?.activoData && (
                        <div className="bg-gradient-to-b from-white to-emerald-50/50 rounded-xl border border-emerald-200 p-5 shadow-xs">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Movimiento actual</h4>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Activo
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-slate-400 block">Placa</span>
                              <span className="text-emerald-800 font-extrabold text-base tracking-wide">
                                {alertaEntrada.activoData.placa}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Fecha y hora de entrada</span>
                              <span className="text-slate-700 font-medium">
                                {alertaEntrada.activoData.fecha_hora_entrada}
                              </span>
                            </div>
                          </div>

                          {alertaEntrada.tipo === 'warning' && (
                            <div className="mt-4 pt-3 border-t border-emerald-100">
                              <button
                                onClick={() => {
                                  setPlacaBusquedaSalida(alertaEntrada.activoData?.placa || '');
                                  buscarParaSalida(alertaEntrada.activoData?.placa || '');
                                  setSeccionActiva('registrar_salida');
                                }}
                                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
                              >
                                <span>Ir a registrar salida</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECCIÓN 3: REGISTRAR SALIDA (FIGMA SCREENS 5 & 6)              */}
              {/* ------------------------------------------------------------- */}
              {seccionActiva === 'registrar_salida' && (
                <div className="space-y-5 max-w-6xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Registrar salida</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Busca el vehículo y confirma su salida del parqueadero.</p>
                  </div>

                  {/* Barra de Búsqueda */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Buscar por placa</label>
                    <div className="flex gap-3 max-w-md">
                      <input
                        type="text"
                        placeholder="KLM482"
                        value={placaBusquedaSalida}
                        onChange={e => setPlacaBusquedaSalida(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                        onKeyDown={e => e.key === 'Enter' && buscarParaSalida(placaBusquedaSalida)}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm uppercase tracking-wider font-semibold focus:border-blue-600 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => buscarParaSalida(placaBusquedaSalida)}
                        className="px-5 py-2 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shrink-0"
                      >
                        <Search className="w-4 h-4" />
                        <span>Buscar</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1.5">Ingresa la placa completa, sin espacios ni guiones.</span>
                  </div>

                  {/* Alerta de Salida */}
                  {alertaSalida && (
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                        alertaSalida.tipo === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : alertaSalida.tipo === 'danger'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      {alertaSalida.tipo === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">
                          {alertaSalida.tipo === 'success' ? 'Salida registrada correctamente' : 'Información'}
                        </h4>
                        <p className="text-xs mt-0.5 opacity-90">{alertaSalida.mensaje}</p>
                      </div>
                    </div>
                  )}

                  {/* Ficha del Vehículo */}
                  {vehiculoSalidaEncontrado && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
                      {/* Cabecera del Vehículo */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Car className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-wider">
                              {vehiculoSalidaEncontrado.placa}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              {vehiculoSalidaEncontrado.marca} {vehiculoSalidaEncontrado.modelo}
                            </p>
                          </div>
                        </div>

                        {/* Pastilla de Estado */}
                        {movActivoSalida ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> En parqueadero
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Fuera del parqueadero
                          </span>
                        )}
                      </div>

                      {/* Grilla de Especificaciones */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-slate-100">
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Tipo de vehículo</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoSalidaEncontrado.tipo}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Color</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoSalidaEncontrado.color}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Marca</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoSalidaEncontrado.marca}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Modelo</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoSalidaEncontrado.modelo}</span>
                        </div>
                      </div>

                      {/* CASO A: SALIDA RECIÉN REGISTRADA CON ÉXITO (FIGMA SCREEN 6) */}
                      {salidaExitosaData && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-900 text-sm">Resumen del movimiento</h4>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Finalizado
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-400 block mb-0.5">Placa del vehículo</span>
                              <span className="font-bold text-slate-800">{salidaExitosaData.placa}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Fecha y hora de entrada</span>
                              <span className="font-semibold text-slate-800">{salidaExitosaData.fecha_hora_entrada}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Fecha y hora de salida</span>
                              <span className="font-bold text-emerald-700">{salidaExitosaData.fecha_hora_salida}</span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => {
                                setSalidaExitosaData(null);
                                setPlacaBusquedaSalida('');
                                setVehiculoSalidaEncontrado(null);
                                setAlertaSalida(null);
                              }}
                              className="px-5 py-2.5 bg-[#1e60f2] hover:bg-[#174ecc] text-white font-semibold text-sm rounded-lg transition flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Registrar otra salida</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CASO B: TIENE MOVIMIENTO ACTIVO (FIGMA SCREEN 5) */}
                      {!salidaExitosaData && movActivoSalida && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-900 text-sm">Movimiento activo</h4>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activo
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-400 block mb-0.5">Placa del vehículo</span>
                              <span className="font-bold text-slate-800">{movActivoSalida.placa}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Fecha y hora de entrada</span>
                              <span className="font-semibold text-slate-800">{movActivoSalida.fecha_hora_entrada}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Fecha y hora de salida</span>
                              <span className="font-semibold text-slate-400">—</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-500">
                            Al registrar la salida, se finalizará el movimiento activo de este vehículo.
                          </p>

                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setSeccionActiva('inicio')}
                              className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={confirmarSalida}
                              className="px-5 py-2.5 bg-[#1e60f2] hover:bg-[#174ecc] text-white font-semibold text-sm rounded-lg shadow-sm transition flex items-center gap-2"
                            >
                              <span>Registrar salida</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CASO C: SIN MOVIMIENTO ACTIVO */}
                      {!salidaExitosaData && !movActivoSalida && (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">No existe un movimiento activo</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            El vehículo <strong>{vehiculoSalidaEncontrado.placa}</strong> se encuentra fuera del parqueadero.
                            No es posible registrar salida sin un ingreso previo activo.
                          </p>
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setFormEntrada({
                                  placa: vehiculoSalidaEncontrado.placa,
                                  tipo: vehiculoSalidaEncontrado.tipo,
                                  color: vehiculoSalidaEncontrado.color,
                                  marca: vehiculoSalidaEncontrado.marca,
                                  modelo: vehiculoSalidaEncontrado.modelo
                                });
                                setSeccionActiva('registrar_entrada');
                              }}
                              className="text-xs text-blue-600 font-semibold hover:underline"
                            >
                              Registrar nueva entrada para este vehículo →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECCIÓN 4: CONSULTAR VEHÍCULO (FIGMA SCREENS 7 & 8)            */}
              {/* ------------------------------------------------------------- */}
              {seccionActiva === 'consultar_vehiculo' && (
                <div className="space-y-5 max-w-6xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Consultar vehículo</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Consulta los datos del vehículo y su estado actual en el parqueadero.</p>
                  </div>

                  {/* Barra de Búsqueda */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Buscar por placa</label>
                    <div className="flex gap-3 max-w-md">
                      <input
                        type="text"
                        placeholder="KLM482"
                        value={placaBusquedaConsulta}
                        onChange={e => setPlacaBusquedaConsulta(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                        onKeyDown={e => e.key === 'Enter' && buscarParaConsulta(placaBusquedaConsulta)}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm uppercase tracking-wider font-semibold focus:border-blue-600 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => buscarParaConsulta(placaBusquedaConsulta)}
                        className="px-5 py-2 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shrink-0"
                      >
                        <Search className="w-4 h-4" />
                        <span>Buscar</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1.5">Ingresa la placa completa, sin espacios ni guiones.</span>
                  </div>

                  {alertaConsulta && (
                    <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 text-xs flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{alertaConsulta}</span>
                    </div>
                  )}

                  {vehiculoConsulta && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
                      {/* Cabecera */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Car className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-wider">
                              {vehiculoConsulta.placa}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              {vehiculoConsulta.marca} {vehiculoConsulta.modelo}
                            </p>
                          </div>
                        </div>

                        {/* Pastilla de Estado */}
                        {movActivoConsulta ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> En parqueadero
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Fuera del parqueadero
                          </span>
                        )}
                      </div>

                      {/* Grilla técnica */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-slate-100">
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Tipo de vehículo</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoConsulta.tipo}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Color</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoConsulta.color}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Marca</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoConsulta.marca}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Modelo</span>
                          <span className="text-sm font-semibold text-slate-800">{vehiculoConsulta.modelo}</span>
                        </div>
                      </div>

                      {/* Sub-tarjeta de estado del movimiento */}
                      {movActivoConsulta ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-900 text-sm">Movimiento activo</h4>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activo
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-400 block mb-0.5">Placa del vehículo</span>
                              <span className="font-bold text-slate-800">{movActivoConsulta.placa}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Fecha y hora de entrada</span>
                              <span className="font-semibold text-slate-800">{movActivoConsulta.fecha_hora_entrada}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-0.5">Fecha y hora de salida</span>
                              <span className="font-semibold text-slate-400">—</span>
                            </div>
                          </div>

                          <p className="text-xs text-emerald-700 font-medium">
                            El vehículo permanece en el parqueadero. Aún no se ha registrado su salida.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                            <Car className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">No existe un movimiento activo</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            El vehículo <strong>{vehiculoConsulta.placa}</strong> se encuentra fuera del parqueadero.
                            Puedes consultar sus entradas y salidas anteriores en Historial de movimientos.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECCIÓN 5: HISTORIAL DE MOVIMIENTOS (FIGMA SCREENS 9 & 10)     */}
              {/* ------------------------------------------------------------- */}
              {seccionActiva === 'historial' && (
                <div className="space-y-5 max-w-6xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Historial de movimientos</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Revisa las entradas y salidas registradas para un vehículo.</p>
                  </div>

                  {/* Barra de Búsqueda */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Buscar por placa</label>
                    <div className="flex gap-3 max-w-md">
                      <input
                        type="text"
                        placeholder="KLM482"
                        value={placaBusquedaHistorial}
                        onChange={e => setPlacaBusquedaHistorial(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                        onKeyDown={e => e.key === 'Enter' && buscarParaHistorial(placaBusquedaHistorial)}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm uppercase tracking-wider font-semibold focus:border-blue-600 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => buscarParaHistorial(placaBusquedaHistorial)}
                        className="px-5 py-2 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shrink-0"
                      >
                        <Search className="w-4 h-4" />
                        <span>Buscar</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1.5">Consulta todos los movimientos asociados a esta placa.</span>
                  </div>

                  {historialResultados !== null && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                      {/* Cabecera del Historial */}
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">Movimientos de {placaConsultadaHistorial}</h3>
                          <p className="text-xs text-slate-500">
                            {historialResultados.length > 0
                              ? 'Del más reciente al más antiguo.'
                              : 'No hay movimientos asociados a esta placa.'}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                          {historialResultados.length} movimientos
                        </span>
                      </div>

                      {/* TABLA DE RESULTADOS */}
                      {historialResultados.length > 0 ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                  <th className="py-3 px-4">Fecha y hora de entrada</th>
                                  <th className="py-3 px-4">Fecha y hora de salida</th>
                                  <th className="py-3 px-4">Estado</th>
                                  <th className="py-3 px-4">Observaciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {historialResultados.map(m => (
                                  <tr key={m.id} className="hover:bg-slate-50">
                                    <td className="py-3.5 px-4 font-medium text-slate-800">{m.fecha_hora_entrada}</td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                      {m.fecha_hora_salida || <span className="text-slate-400 font-bold">—</span>}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {m.estado === 'ACTIVO' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activo
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Finalizado
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-slate-500">{m.observaciones}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
                            <span>Mostrando {historialResultados.length} de {historialResultados.length} movimientos</span>
                            <span>Hora de Colombia (UTC-5)</span>
                          </div>
                        </>
                      ) : (
                        /* ESTADO VACÍO (FIGMA SCREEN 10 EXACTO) */
                        <div className="text-center py-16 space-y-3">
                          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <Search className="w-8 h-8" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-base">No se encontraron movimientos</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Verifica que la placa esté escrita correctamente o realiza una nueva búsqueda con otra placa.
                          </p>
                          <div className="pt-8 text-xs text-slate-400 flex justify-between border-t border-slate-100">
                            <span>Sin registros para mostrar</span>
                            <span>Hora de Colombia (UTC-5)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 px-8 py-3 text-xs text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Los movimientos se registran con la fecha y hora del sistema.</span>
            </footer>

          </main>
    </div>
  );
}
