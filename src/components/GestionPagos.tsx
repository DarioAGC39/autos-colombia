import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Receipt,
  Printer,
  Bell,
  Users,
  Car,
  Bike,
  Calendar,
  DollarSign,
  X,
  Info,
  RefreshCw,
  UserCheck,
  Plus
} from 'lucide-react';
import { Usuario } from './GestionUsuarios';

export interface Propietario {
  id_propietario: number;
  nombre_completo: string;
  identificacion: string;
  celular: string;
  correo: string;
  fecha_registro: string;
}

export interface VehiculoConPropietario {
  placa: string;
  tipo: string;
  color: string;
  marca: string;
  modelo: string;
  id_propietario?: number | null;
}

export interface PagoMensual {
  id_pago: number;
  numero_comprobante: string;
  placa: string;
  id_propietario: number;
  propietario_nombre: string;
  propietario_identificacion: string;
  propietario_celular: string;
  propietario_correo: string;
  concepto: string;
  tipo_vehiculo_tarifa: 'Carro' | 'Moto';
  valor_mensualidad: number;
  valor_mora: number;
  valor_pagado: number;
  fecha_pago: string; // YYYY-MM-DD
  fecha_inicio_periodo: string; // YYYY-MM-DD
  fecha_vencimiento: string; // YYYY-MM-DD
  metodo_pago: string;
  estado_pago: 'CONFIRMADO' | 'ANULADO';
  observaciones: string;
  usuario_registro_nombre: string;
  usuario_registro_rol: string;
}

export interface NotificacionVencimiento {
  id_notificacion: number;
  placa: string;
  id_propietario: number;
  propietario_nombre: string;
  propietario_celular: string;
  propietario_correo: string;
  id_pago: number | null;
  tipo_notificacion: 'VENCIMIENTO_PROXIMO';
  mensaje: string;
  fecha_vencimiento_ref: string; // YYYY-MM-DD
  estado_envio: 'GENERADA_PENDIENTE_CANAL' | 'REVISADA';
  detalle_canal: string;
  fecha_generacion: string;
}

export type EstadoMensualidadCodigo = 'AL_DIA' | 'PROXIMA_A_VENCER' | 'VENCIDA' | 'SIN_MENSUALIDAD';

const MESES_ES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function hoyISO(): string {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sumarDiasISO(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function sumarUnMesISO(fechaISO: string): string {
  if (!fechaISO || fechaISO.length < 10) return '';
  const [y, m, d] = fechaISO.split('-').map(Number);
  let nuevoMes = m + 1;
  let nuevoAnio = y;
  if (nuevoMes > 12) {
    nuevoMes = 1;
    nuevoAnio += 1;
  }
  const ultimoDia = new Date(nuevoAnio, nuevoMes, 0).getDate();
  const nuevoDia = Math.min(d, ultimoDia);
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}-${String(nuevoDia).padStart(2, '0')}`;
}

export function restarUnMesISO(fechaISO: string): string {
  if (!fechaISO || fechaISO.length < 10) return '';
  const [y, m, d] = fechaISO.split('-').map(Number);
  let nuevoMes = m - 1;
  let nuevoAnio = y;
  if (nuevoMes < 1) {
    nuevoMes = 12;
    nuevoAnio -= 1;
  }
  const ultimoDia = new Date(nuevoAnio, nuevoMes, 0).getDate();
  const nuevoDia = Math.min(d, ultimoDia);
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}-${String(nuevoDia).padStart(2, '0')}`;
}

export function formatearFechaLegibleES(fechaISO: string): string {
  if (!fechaISO || fechaISO.length < 10) return fechaISO;
  const [, m, d] = fechaISO.split('-').map(Number);
  return `${d} de ${MESES_ES[m] || ''}`;
}

export function formatearCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export function construirMensajeRecordatorio(placa: string, fechaVencimientoISO: string): string {
  const fechaLegible = formatearFechaLegibleES(fechaVencimientoISO);
  return `Estimado cliente, le informamos que su mensualidad de parqueadero del vehículo ${placa} está próxima a vencer el día ${fechaLegible}. Le recomendamos realizar su pago antes de esa fecha. Gracias por utilizar Autos Colombia.`;
}

export function clasificarEstadoMensualidad(
  fechaVencimiento?: string | null,
  fechaRefISO?: string
): { codigo: EstadoMensualidadCodigo; etiqueta: string; diasRestantes: number | null } {
  if (!fechaVencimiento) {
    return { codigo: 'SIN_MENSUALIDAD', etiqueta: 'Sin mensualidad', diasRestantes: null };
  }
  const hoy = fechaRefISO || hoyISO();
  const [hy, hm, hd] = hoy.split('-').map(Number);
  const [vy, vm, vd] = fechaVencimiento.split('-').map(Number);
  const msHoy = Date.UTC(hy, hm - 1, hd);
  const msVenc = Date.UTC(vy, vm - 1, vd);
  const diff = Math.round((msVenc - msHoy) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    const dAbs = Math.abs(diff);
    return {
      codigo: 'VENCIDA',
      etiqueta: `Vencida (hace ${dAbs} día${dAbs === 1 ? '' : 's'})`,
      diasRestantes: diff
    };
  }
  if (diff <= 5) {
    return {
      codigo: 'PROXIMA_A_VENCER',
      etiqueta: diff === 0 ? 'Próxima (Vence hoy)' : `Próxima (en ${diff} día${diff === 1 ? '' : 's'})`,
      diasRestantes: diff
    };
  }
  return {
    codigo: 'AL_DIA',
    etiqueta: `Al día (${diff} días restantes)`,
    diasRestantes: diff
  };
}

interface GestionPagosProps {
  vehiculos: Record<string, VehiculoConPropietario>;
  propietarios: Propietario[];
  pagos: PagoMensual[];
  notificaciones: NotificacionVencimiento[];
  usuarioSesion: Usuario | null;
  comprobanteActivo: PagoMensual | null;
  onSeleccionarComprobante: (pago: PagoMensual | null) => void;
  onConfirmarPago: (datos: {
    placa: string;
    fecha_pago: string;
    metodo_pago: string;
    observaciones: string;
    nombre_propietario: string;
    identificacion_propietario: string;
    celular_propietario: string;
    correo_propietario: string;
  }) => { success: boolean; error?: string; comprobante?: PagoMensual };
  onGuardarPropietario: (datos: {
    nombre_completo: string;
    identificacion: string;
    celular: string;
    correo: string;
    placa_vincular?: string;
  }) => { success: boolean; error?: string; mensaje?: string };
  onMarcarNotificacionRevisada: (id_notificacion: number) => void;
  onSincronizarNotificaciones: () => number;
}

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta Débito/Crédito', 'Nequi / Daviplata'];

export default function GestionPagos({
  vehiculos,
  propietarios,
  pagos,
  notificaciones,
  comprobanteActivo,
  onSeleccionarComprobante,
  onConfirmarPago,
  onGuardarPropietario,
  onMarcarNotificacionRevisada,
  onSincronizarNotificaciones
}: GestionPagosProps) {
  const [tab, setTab] = useState<'registro' | 'vencimientos' | 'historial' | 'propietarios' | 'notificaciones'>('registro');

  // Búsqueda y formulario de registro de pago
  const [placaBuscar, setPlacaBuscar] = useState('XYZ789');
  const [placaConsultada, setPlacaConsultada] = useState<string>('XYZ789');
  const [fechaPago, setFechaPago] = useState<string>(hoyISO());
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [observacionesPago, setObservacionesPago] = useState<string>('');

  // Campos de propietario dentro del flujo de pago
  const [propCedula, setPropCedula] = useState<string>('');
  const [propNombre, setPropNombre] = useState<string>('');
  const [propCelular, setPropCelular] = useState<string>('');
  const [propCorreo, setPropCorreo] = useState<string>('');
  const [propAutocargado, setPropAutocargado] = useState<boolean>(false);

  const [feedbackPago, setFeedbackPago] = useState<{ tipo: 'success' | 'danger' | 'info'; texto: string } | null>(null);

  // Filtros de Control de Vencimientos e Historial
  const [filtroVencimiento, setFiltroVencimiento] = useState<'TODOS' | EstadoMensualidadCodigo>('TODOS');
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  // Formulario de propietarios independiente (Tab Propietarios)
  const [formProp, setFormProp] = useState({
    identificacion: '',
    nombre_completo: '',
    celular: '',
    correo: '',
    placa_vincular: ''
  });
  const [feedbackProp, setFeedbackProp] = useState<{ tipo: 'success' | 'danger'; texto: string } | null>(null);

  // Mapa rápido de propietarios por ID y por cédula
  const propietariosPorId = useMemo(() => {
    const mapa: Record<number, Propietario> = {};
    propietarios.forEach(p => {
      mapa[p.id_propietario] = p;
    });
    return mapa;
  }, [propietarios]);

  // Estado de mensualidades por cada vehículo registrado
  const estadoPorVehiculo = useMemo(() => {
    const listaVehiculos = Object.values(vehiculos);
    return listaVehiculos.map(v => {
      const pagosVeh = pagos
        .filter(p => p.placa === v.placa && p.estado_pago === 'CONFIRMADO')
        .sort((a, b) => (a.fecha_vencimiento < b.fecha_vencimiento ? 1 : -1));
      const ultimoPago = pagosVeh[0] || null;
      const propietario = v.id_propietario ? propietariosPorId[v.id_propietario] || null : null;
      const clasificacion = clasificarEstadoMensualidad(ultimoPago?.fecha_vencimiento);
      const esMoto = v.tipo.toLowerCase().includes('moto');
      const tarifa = esMoto ? 100000 : 250000;
      return {
        vehiculo: v,
        propietario,
        ultimoPago,
        clasificacion,
        tarifa,
        tipoTarifa: (esMoto ? 'Moto' : 'Carro') as 'Carro' | 'Moto'
      };
    });
  }, [vehiculos, pagos, propietariosPorId]);

  // KPIs del Panel General de Pagos (A)
  const kpis = useMemo(() => {
    const pagosConfirmados = pagos.filter(p => p.estado_pago === 'CONFIRMADO');
    const ingresosTotales = pagosConfirmados.reduce((acc, p) => acc + p.valor_pagado, 0);
    const alDia = estadoPorVehiculo.filter(e => e.clasificacion.codigo === 'AL_DIA').length;
    const proximas = estadoPorVehiculo.filter(e => e.clasificacion.codigo === 'PROXIMA_A_VENCER').length;
    const vencidas = estadoPorVehiculo.filter(e => e.clasificacion.codigo === 'VENCIDA').length;
    return {
      totalPagadas: pagosConfirmados.length,
      ingresosTotales,
      alDia,
      proximas,
      vencidas
    };
  }, [pagos, estadoPorVehiculo]);

  // Datos del vehículo actualmente seleccionado para pago
  const infoVehiculoPago = useMemo(() => {
    if (!placaConsultada) return null;
    return estadoPorVehiculo.find(e => e.vehiculo.placa === placaConsultada) || null;
  }, [placaConsultada, estadoPorVehiculo]);

  // Sincronizar campos del propietario cuando cambia la placa consultada
  const seleccionarPlacaParaPago = (placa: string) => {
    const limpia = placa.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    setPlacaBuscar(limpia);
    setPlacaConsultada(limpia);
    setFeedbackPago(null);
    const v = vehiculos[limpia];
    if (v && v.id_propietario && propietariosPorId[v.id_propietario]) {
      const pr = propietariosPorId[v.id_propietario];
      setPropCedula(pr.identificacion);
      setPropNombre(pr.nombre_completo);
      setPropCelular(pr.celular);
      setPropCorreo(pr.correo);
      setPropAutocargado(true);
    } else {
      setPropCedula('');
      setPropNombre('');
      setPropCelular('');
      setPropCorreo('');
      setPropAutocargado(false);
    }
  };

  // Inicializar campos si aún están vacíos al primer render con XYZ789
  React.useEffect(() => {
    if (placaConsultada && !propCedula && infoVehiculoPago?.propietario) {
      const pr = infoVehiculoPago.propietario;
      setPropCedula(pr.identificacion);
      setPropNombre(pr.nombre_completo);
      setPropCelular(pr.celular);
      setPropCorreo(pr.correo);
      setPropAutocargado(true);
    }
  }, [placaConsultada, infoVehiculoPago, propCedula]);

  // Al cambiar la cédula, detectar si el propietario ya existe (RN07 anti-duplicados)
  const handleCedulaChange = (val: string) => {
    setPropCedula(val);
    const limpia = val.trim();
    const existente = propietarios.find(p => p.identificacion === limpia);
    if (existente) {
      setPropNombre(existente.nombre_completo);
      setPropCelular(existente.celular);
      setPropCorreo(existente.correo);
      setPropAutocargado(true);
    } else {
      setPropAutocargado(false);
    }
  };

  const handleSubmitPago = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackPago(null);
    if (!infoVehiculoPago) {
      setFeedbackPago({ tipo: 'danger', texto: `No se encontró ningún vehículo con placa ${placaConsultada}.` });
      return;
    }
    const res = onConfirmarPago({
      placa: infoVehiculoPago.vehiculo.placa,
      fecha_pago: fechaPago,
      metodo_pago: metodoPago,
      observaciones: observacionesPago,
      nombre_propietario: propNombre,
      identificacion_propietario: propCedula,
      celular_propietario: propCelular,
      correo_propietario: propCorreo
    });
    if (!res.success) {
      setFeedbackPago({ tipo: 'danger', texto: res.error || 'No se pudo confirmar el pago.' });
      return;
    }
    setObservacionesPago('');
    setFeedbackPago({
      tipo: 'success',
      texto: `Pago confirmado (${res.comprobante?.numero_comprobante}). Nueva mensualidad vigente hasta ${res.comprobante?.fecha_vencimiento}. Mora aplicada: $0.`
    });
    if (res.comprobante) {
      onSeleccionarComprobante(res.comprobante);
    }
  };

  const handleSubmitPropietario = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackProp(null);
    const res = onGuardarPropietario(formProp);
    if (!res.success) {
      setFeedbackProp({ tipo: 'danger', texto: res.error || 'No se pudo guardar el propietario.' });
      return;
    }
    setFeedbackProp({ tipo: 'success', texto: res.mensaje || 'Propietario guardado correctamente.' });
    setFormProp({ identificacion: '', nombre_completo: '', celular: '', correo: '', placa_vincular: '' });
  };

  const pagosFiltrados = useMemo(() => {
    const q = busquedaHistorial.trim().toLowerCase();
    const ordenados = [...pagos].sort((a, b) => b.id_pago - a.id_pago);
    if (!q) return ordenados;
    return ordenados.filter(
      p =>
        p.placa.toLowerCase().includes(q) ||
        p.numero_comprobante.toLowerCase().includes(q) ||
        p.propietario_nombre.toLowerCase().includes(q) ||
        p.propietario_identificacion.toLowerCase().includes(q)
    );
  }, [pagos, busquedaHistorial]);

  const vencimientosFiltrados = useMemo(() => {
    if (filtroVencimiento === 'TODOS') return estadoPorVehiculo;
    return estadoPorVehiculo.filter(e => e.clasificacion.codigo === filtroVencimiento);
  }, [estadoPorVehiculo, filtroVencimiento]);

  const notificacionesPendientes = notificaciones.filter(n => n.estado_envio === 'GENERADA_PENDIENTE_CANAL').length;

  const nuevaFechaVencimientoPreview = sumarUnMesISO(fechaPago);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Encabezado del módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de pagos y mensualidades</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administración exclusiva de mensualidades ($250.000 Carros / $100.000 Motos), sin recargos por mora, comprobantes y alertas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Modalidad 100% Mensual · Mora: $0</span>
        </div>
      </div>

      {/* A. PANEL GENERAL DE PAGOS (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{kpis.totalPagadas}</div>
            <div className="text-xs font-medium text-slate-500">Mensualidades pagadas</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-700">{kpis.proximas}</div>
            <div className="text-xs font-medium text-slate-500">Próximas a vencer (≤ 5 días)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-700">{kpis.vencidas}</div>
            <div className="text-xs font-medium text-slate-500">Mensualidades vencidas</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-emerald-700">{formatearCOP(kpis.ingresosTotales)}</div>
            <div className="text-xs font-medium text-slate-500">Ingresos recaudados (COP)</div>
          </div>
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 print:hidden">
        <button
          type="button"
          onClick={() => setTab('registro')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'registro'
              ? 'bg-[#1e60f2] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Registrar Pago</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('vencimientos')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'vencimientos'
              ? 'bg-[#1e60f2] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Control de Vencimientos</span>
          {kpis.proximas + kpis.vencidas > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === 'vencimientos' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
            }`}>
              {kpis.proximas + kpis.vencidas}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('historial')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'historial'
              ? 'bg-[#1e60f2] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Historial y Comprobantes ({pagos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('propietarios')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'propietarios'
              ? 'bg-[#1e60f2] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Propietarios ({propietarios.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('notificaciones')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'notificaciones'
              ? 'bg-[#1e60f2] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notificaciones (5 días)</span>
          {notificacionesPendientes > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {notificacionesPendientes}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* B. PESTAÑA 1: REGISTRO DE PAGOS                                */}
      {/* ============================================================== */}
      {tab === 'registro' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Registrar Pago de Mensualidad</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Busca el vehículo por placa, valida los datos del propietario y confirma el pago para emitir el comprobante.
              </p>
            </div>

            {/* Buscador por placa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Buscar vehículo por placa</label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={placaBuscar}
                  onChange={e => setPlacaBuscar(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      seleccionarPlacaParaPago(placaBuscar);
                    }
                  }}
                  placeholder="Ej: XYZ789, ABC123, MOT101"
                  className="flex-1 h-10 px-3.5 border border-slate-300 rounded-lg text-sm font-bold uppercase tracking-wider focus:border-[#1e60f2] outline-none"
                />
                <button
                  type="button"
                  onClick={() => seleccionarPlacaParaPago(placaBuscar)}
                  className="h-10 px-5 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Search className="w-4 h-4" />
                  <span>Consultar</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[11px] text-slate-400">Vehículos rápidos:</span>
                {estadoPorVehiculo.map(item => (
                  <button
                    key={item.vehiculo.placa}
                    type="button"
                    onClick={() => seleccionarPlacaParaPago(item.vehiculo.placa)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                      item.clasificacion.codigo === 'VENCIDA'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : item.clasificacion.codigo === 'PROXIMA_A_VENCER'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : item.clasificacion.codigo === 'AL_DIA'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.vehiculo.placa}
                  </button>
                ))}
              </div>
            </div>

            {feedbackPago && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                feedbackPago.tipo === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : feedbackPago.tipo === 'danger'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                {feedbackPago.tipo === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedbackPago.texto}</span>
              </div>
            )}

            {infoVehiculoPago ? (
              <form onSubmit={handleSubmitPago} className="space-y-5">
                {/* Ficha del vehículo */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        {infoVehiculoPago.tipoTarifa === 'Moto' ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-lg font-black text-slate-900 tracking-wider">{infoVehiculoPago.vehiculo.placa}</span>
                        <span className="text-xs text-slate-500 block">
                          {infoVehiculoPago.vehiculo.marca} {infoVehiculoPago.vehiculo.modelo} · {infoVehiculoPago.vehiculo.tipo} ({infoVehiculoPago.vehiculo.color})
                        </span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      infoVehiculoPago.clasificacion.codigo === 'AL_DIA'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : infoVehiculoPago.clasificacion.codigo === 'PROXIMA_A_VENCER'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : infoVehiculoPago.clasificacion.codigo === 'VENCIDA'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {infoVehiculoPago.clasificacion.etiqueta}
                    </span>
                  </div>

                  {infoVehiculoPago.ultimoPago && (
                    <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1 border-t border-slate-200/70">
                      <span><strong>Último pago:</strong> {infoVehiculoPago.ultimoPago.fecha_pago} ({infoVehiculoPago.ultimoPago.numero_comprobante})</span>
                      <span><strong>Vencimiento registrado:</strong> {infoVehiculoPago.ultimoPago.fecha_vencimiento}</span>
                    </div>
                  )}
                </div>

                {/* 1. Datos del Propietario (RN07) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      1. Datos del Propietario (RN07 · Sin duplicar cédula)
                    </h4>
                    {propAutocargado && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Propietario existente vinculado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Cédula *</label>
                      <input
                        type="text"
                        required
                        value={propCedula}
                        onChange={e => handleCedulaChange(e.target.value)}
                        placeholder="Ej: 1015423890"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={propNombre}
                        onChange={e => setPropNombre(e.target.value)}
                        placeholder="Nombre y apellidos completos"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Celular *</label>
                      <input
                        type="text"
                        required
                        value={propCelular}
                        onChange={e => setPropCelular(e.target.value)}
                        placeholder="Ej: 3104567890"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        value={propCorreo}
                        onChange={e => setPropCorreo(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Fechas y Liquidación (RN01, RN02, RN03) */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Liquidación de Mensualidad (RN01 - RN03)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago (Inicio periodo) *</label>
                      <input
                        type="date"
                        required
                        value={fechaPago}
                        onChange={e => setFechaPago(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nueva Fecha de Vencimiento (+1 mes)</label>
                      <input
                        type="date"
                        readOnly
                        value={nuevaFechaVencimientoPreview}
                        className="w-full h-10 px-3 border border-slate-200 bg-slate-100 rounded-lg text-sm font-bold text-blue-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Medio de Pago *</label>
                      <select
                        value={metodoPago}
                        onChange={e => setMetodoPago(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:border-[#1e60f2] outline-none"
                      >
                        {METODOS_PAGO.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                      <input
                        type="text"
                        value={observacionesPago}
                        onChange={e => setObservacionesPago(e.target.value)}
                        placeholder="Ej: Renovación mensual sin mora"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen económico */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[11px] font-medium text-emerald-700 block">
                      Mensualidad ({infoVehiculoPago.tipoTarifa})
                    </span>
                    <strong className="text-base font-extrabold text-emerald-950">
                      {formatearCOP(infoVehiculoPago.tarifa)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-emerald-700 block">
                      Mora / Recargo (RN02)
                    </span>
                    <strong className="text-base font-extrabold text-emerald-600">$0 (Exento)</strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-emerald-700 block">
                      Total a Confirmar
                    </span>
                    <strong className="text-lg font-black text-emerald-900">
                      {formatearCOP(infoVehiculoPago.tarifa)} COP
                    </strong>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Pago y Generar Comprobante</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Vehículo no encontrado</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  La placa <strong>{placaConsultada}</strong> no está registrada en Autos Colombia. Regístrala primero desde &quot;Registrar entrada&quot;.
                </p>
              </div>
            )}
          </div>

          {/* Tarjetas informativas laterales */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Tarifas Oficiales (RN01)</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                El parqueadero trabaja únicamente con mensualidades completas. No existen cobros por horas ni días.
              </p>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold flex justify-between">
                <span>🚗 Carros</span>
                <span>$250.000 / mes</span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-800 text-xs font-bold flex justify-between">
                <span>🏍️ Motos</span>
                <span>$100.000 / mes</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Renovación sin Mora (RN02 / RN03)</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Si un cliente deja vencer su mensualidad y paga días después, solo cancela una mensualidad completa (<strong>mora $0</strong>). La nueva mensualidad inicia el día del pago y vence 1 mes calendario después.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <strong>Ejemplo:</strong> Venció 10 nov · Paga 15 nov → Vigente del <strong>15 nov al 15 dic</strong> (Mora: $0).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* D. PESTAÑA 2: CONTROL DE VENCIMIENTOS                          */}
      {/* ============================================================== */}
      {tab === 'vencimientos' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Control de Vencimientos</h3>
              <p className="text-xs text-slate-500">Clasificación en tiempo real: Al día, Próximas a vencer (≤ 5 días) y Vencidas.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'TODOS', label: `Todos (${estadoPorVehiculo.length})` },
                { key: 'AL_DIA', label: `Al día (${kpis.alDia})` },
                { key: 'PROXIMA_A_VENCER', label: `Próximas (${kpis.proximas})` },
                { key: 'VENCIDA', label: `Vencidas (${kpis.vencidas})` }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFiltroVencimiento(f.key as 'TODOS' | EstadoMensualidadCodigo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroVencimiento === f.key
                      ? 'bg-[#1e60f2] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Vehículo / Tarifa</th>
                  <th className="py-3 px-4">Propietario</th>
                  <th className="py-3 px-4">Último Pago</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vencimientosFiltrados.map(item => (
                  <tr key={item.vehiculo.placa} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-black text-slate-900">{item.vehiculo.placa}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{item.vehiculo.marca} {item.vehiculo.modelo}</div>
                      <div className="text-xs text-slate-500">{item.tipoTarifa} · {formatearCOP(item.tarifa)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.propietario ? (
                        <>
                          <div className="font-semibold text-slate-800 text-xs">{item.propietario.nombre_completo}</div>
                          <div className="text-[11px] text-slate-500">CC {item.propietario.identificacion} · {item.propietario.celular}</div>
                        </>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Sin propietario asociado</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{item.ultimoPago?.fecha_pago || '—'}</td>
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-800">{item.ultimoPago?.fecha_vencimiento || '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        item.clasificacion.codigo === 'AL_DIA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.clasificacion.codigo === 'PROXIMA_A_VENCER'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.clasificacion.codigo === 'VENCIDA'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.clasificacion.etiqueta}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          seleccionarPlacaParaPago(item.vehiculo.placa);
                          setTab('registro');
                        }}
                        className="px-3 py-1.5 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-xs font-semibold transition"
                      >
                        {item.clasificacion.codigo === 'AL_DIA' ? 'Ver / Pagar' : 'Renovar ahora'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* C & E. PESTAÑA 3: HISTORIAL Y COMPROBANTES                     */}
      {/* ============================================================== */}
      {tab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Historial de Pagos y Comprobantes (RN04, RN05)</h3>
              <p className="text-xs text-slate-500">Consulta todos los pagos confirmados y visualiza o imprime cada recibo en PDF.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busquedaHistorial}
                onChange={e => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar placa, comprobante o cédula..."
                className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-lg text-xs focus:border-[#1e60f2] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">N° Comprobante</th>
                  <th className="py-3 px-4">Vehículo</th>
                  <th className="py-3 px-4">Propietario</th>
                  <th className="py-3 px-4">Fecha Pago</th>
                  <th className="py-3 px-4">Periodo / Vencimiento</th>
                  <th className="py-3 px-4">Valor Pagado</th>
                  <th className="py-3 px-4 text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagosFiltrados.map(p => (
                  <tr key={p.id_pago} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-xs">{p.numero_comprobante}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{p.placa}</span>
                      <span className="block text-[11px] text-slate-500">{p.tipo_vehiculo_tarifa}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 text-xs block">{p.propietario_nombre}</span>
                      <span className="text-[11px] text-slate-500">CC {p.propietario_identificacion}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">{p.fecha_pago}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="text-slate-600">{p.fecha_inicio_periodo} → </span>
                      <strong className="text-slate-900">{p.fecha_vencimiento}</strong>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700">{formatearCOP(p.valor_pagado)}</span>
                      <span className="block text-[11px] text-slate-500">{p.metodo_pago} · Mora $0</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSeleccionarComprobante(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ver / PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {pagosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                      No hay pagos que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RN07. PESTAÑA 4: PROPIETARIOS (1:N VEHÍCULOS)                  */}
      {/* ============================================================== */}
      {tab === 'propietarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Directorio de Propietarios (RN07)</h3>
              <p className="text-xs text-slate-500">Un propietario puede tener asociados 1 o varios vehículos sin duplicar su identificación.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Cédula</th>
                    <th className="py-3 px-4">Nombre Completo</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4">Vehículos Asociados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propietarios.map(pr => {
                    const placas = Object.values(vehiculos)
                      .filter(v => v.id_propietario === pr.id_propietario)
                      .map(v => v.placa);
                    return (
                      <tr key={pr.id_propietario} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-800 text-xs">{pr.identificacion}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 text-xs">{pr.nombre_completo}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <div>📱 {pr.celular}</div>
                          <div className="text-[11px] text-slate-400">✉️ {pr.correo}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {placas.length > 0 ? (
                              placas.map(pl => (
                                <span key={pl} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold font-mono">
                                  {pl}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">Sin vehículos aún</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Registrar / Vincular Propietario</h3>
              <p className="text-xs text-slate-500">Si la cédula ya existe, reutiliza el registro y asocia el vehículo adicional.</p>
            </div>
            {feedbackProp && (
              <div className={`p-3 rounded-lg border text-xs ${
                feedbackProp.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {feedbackProp.texto}
              </div>
            )}
            <form onSubmit={handleSubmitPropietario} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula / Identificación *</label>
                <input
                  type="text"
                  required
                  value={formProp.identificacion}
                  onChange={e => setFormProp({ ...formProp, identificacion: e.target.value })}
                  placeholder="Ej: 1015423890"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e60f2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formProp.nombre_completo}
                  onChange={e => setFormProp({ ...formProp, nombre_completo: e.target.value })}
                  placeholder="Nombre y apellidos"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e60f2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Celular *</label>
                <input
                  type="text"
                  required
                  value={formProp.celular}
                  onChange={e => setFormProp({ ...formProp, celular: e.target.value })}
                  placeholder="Ej: 3104567890"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e60f2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={formProp.correo}
                  onChange={e => setFormProp({ ...formProp, correo: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e60f2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Asociar Placa (Opcional)</label>
                <input
                  type="text"
                  maxLength={7}
                  value={formProp.placa_vincular}
                  onChange={e => setFormProp({ ...formProp, placa_vincular: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  placeholder="Ej: KLM482"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm uppercase font-bold outline-none focus:border-[#1e60f2]"
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Guardar / Asociar Propietario</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* F. PESTAÑA 5: NOTIFICACIONES (5 DÍAS ANTES - RN06 / SECCIÓN 7) */}
      {/* ============================================================== */}
      {tab === 'notificaciones' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recordatorios de Vencimiento (5 días antes · RN06)</h3>
              <p className="text-xs text-slate-500">
                Lógica automática para detectar mensualidades que vencen en ≤ 5 días y preparar envío por correo o SMS.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nuevas = onSincronizarNotificaciones();
                setFeedbackPago({
                  tipo: 'info',
                  texto: nuevas > 0
                    ? `Se generaron ${nuevas} notificación(es) nueva(s) para vencimientos dentro de los próximos 5 días.`
                    : 'Verificación completada: todas las mensualidades próximas a vencer ya tienen su recordatorio.'
                });
              }}
              className="px-4 py-2 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verificar vencimientos (5 días)</span>
            </button>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Estado de canales externos (Sección 7):</strong> En este entorno web no hay un servidor SMTP ni proveedor SMS conectado, por lo que <strong>no se simula el envío real</strong>. Los recordatorios se generan automáticamente en el sistema con los datos de contacto listos para integrarse mediante las variables <code>MAIL_SERVER</code> y <code>SMS_PROVIDER_URL</code> en el backend Flask.
            </div>
          </div>

          <div className="space-y-3">
            {notificaciones.map(n => (
              <div
                key={n.id_notificacion}
                className={`p-4 rounded-xl border space-y-2.5 ${
                  n.estado_envio === 'GENERADA_PENDIENTE_CANAL'
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-slate-900 text-sm">{n.placa}</span>
                    <span className="text-xs text-slate-600">
                      {n.propietario_nombre} · 📱 {n.propietario_celular} · ✉️ {n.propietario_correo}
                    </span>
                  </div>
                  {n.estado_envio === 'GENERADA_PENDIENTE_CANAL' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Generada (Pendiente de canal externo)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                      Revisada en sistema
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-3 leading-relaxed">
                  &ldquo;{n.mensaje}&rdquo;
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>Vence: <strong>{n.fecha_vencimiento_ref}</strong> · {n.detalle_canal}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        seleccionarPlacaParaPago(n.placa);
                        setTab('registro');
                      }}
                      className="px-3 py-1 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-md font-semibold transition"
                    >
                      Renovar Mensualidad
                    </button>
                    {n.estado_envio === 'GENERADA_PENDIENTE_CANAL' && (
                      <button
                        type="button"
                        onClick={() => onMarcarNotificacionRevisada(n.id_notificacion)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md font-semibold transition"
                      >
                        Marcar revisada
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {notificaciones.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-400">
                No existen mensualidades próximas a vencer en los próximos 5 días.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* E. MODAL DE COMPROBANTE OFICIAL DE PAGO (RN04 - IMPRIMIBLE PDF) */}
      {/* ============================================================== */}
      {comprobanteActivo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border print:border-slate-300 print:max-w-full print:rounded-none">
            {/* Barra superior de acciones del modal (oculta al imprimir) */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Comprobante Oficial · {comprobanteActivo.numero_comprobante}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSeleccionarComprobante(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo imprimible del comprobante (RN04) */}
            <div className="p-7 space-y-6">
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">AUTOS COLOMBIA</h3>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Parqueadero Mensual · Comprobante de Pago
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">N° Comprobante</span>
                  <span className="text-lg font-black text-[#1e60f2] font-mono">
                    {comprobanteActivo.numero_comprobante}
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {comprobanteActivo.estado_pago}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Propietario</span>
                  <strong className="text-sm text-slate-900 block">{comprobanteActivo.propietario_nombre}</strong>
                  <span className="text-slate-600 block">Cédula / ID: <strong>{comprobanteActivo.propietario_identificacion}</strong></span>
                  <span className="text-slate-500 block">Cel: {comprobanteActivo.propietario_celular} · {comprobanteActivo.propietario_correo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehículo</span>
                  <strong className="text-base text-slate-900 tracking-wider block">{comprobanteActivo.placa}</strong>
                  <span className="text-slate-600 block">Categoría: <strong>{comprobanteActivo.tipo_vehiculo_tarifa}</strong></span>
                  <span className="text-slate-500 block">Medio de pago: {comprobanteActivo.metodo_pago}</span>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-400 uppercase text-[10px]">
                    <th className="py-2">Concepto</th>
                    <th className="py-2">Periodo Pagado</th>
                    <th className="py-2">Fecha Pago</th>
                    <th className="py-2">Vencimiento</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 font-bold text-slate-900">{comprobanteActivo.concepto}</td>
                    <td className="py-3 text-slate-700">
                      {comprobanteActivo.fecha_inicio_periodo} al {comprobanteActivo.fecha_vencimiento}
                    </td>
                    <td className="py-3 text-slate-700">{comprobanteActivo.fecha_pago}</td>
                    <td className="py-3 font-bold text-blue-700">{comprobanteActivo.fecha_vencimiento}</td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {formatearCOP(comprobanteActivo.valor_mensualidad)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-2.5 text-emerald-700 font-medium">
                      Recargo por mora / retraso (Regla RN02 — Exento)
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-700">$0</td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Pagado</span>
                  <span className="text-xs text-emerald-700">{comprobanteActivo.observaciones}</span>
                </div>
                <span className="text-2xl font-black text-emerald-800">
                  {formatearCOP(comprobanteActivo.valor_pagado)} COP
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-3 border-t border-dashed border-slate-300">
                <span>
                  Recibido por: <strong>{comprobanteActivo.usuario_registro_nombre}</strong> ({comprobanteActivo.usuario_registro_rol})
                </span>
                <span>Autos Colombia · Parqueadero Mensual</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
