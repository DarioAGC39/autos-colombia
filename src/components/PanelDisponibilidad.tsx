/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Car,
  Bike,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

export interface CeldaInfo {
  codigo: string;
  tipo: 'CARRO' | 'MOTO';
  ocupada: boolean;
  movimiento?: {
    id: number;
    placa: string;
    fecha_hora_entrada: string;
    tipoVehiculo: string;
    marca: string;
    modelo: string;
    color: string;
  };
}

interface PanelDisponibilidadProps {
  movimientosActivos: Array<{
    id: number;
    placa: string;
    fecha_hora_entrada: string;
    celda?: string;
  }>;
  vehiculos: Record<string, {
    placa: string;
    tipo: string;
    color: string;
    marca: string;
    modelo: string;
  }>;
  onRegistrarSalida: (placa: string) => void;
  onRegistrarEntradaConCelda: (celda: string, tipoSugerido: string) => void;
  onVerHistorial: (placa: string) => void;
}

export default function PanelDisponibilidad({
  movimientosActivos,
  vehiculos,
  onRegistrarSalida,
  onRegistrarEntradaConCelda,
  onVerHistorial
}: PanelDisponibilidadProps) {
  // Filtros de navegación
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CARRO' | 'MOTO'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'DISPONIBLES' | 'OCUPADAS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<CeldaInfo | null>(null);

  // Mapeo dinámico de las 80 celdas (70 Carros: C-01 a C-70, 10 Motos: M-01 a M-10)
  const celdas = useMemo<CeldaInfo[]>(() => {
    const listado: CeldaInfo[] = [];

    // Mapear movimientos activos por su celda asignada o por asignación automática
    const ocupadasPorCelda: Record<string, CeldaInfo['movimiento']> = {};

    // Asignación explícita o asistida para los activos
    let indiceCarroLibre = 1;
    let indiceMotoLibre = 1;

    movimientosActivos.forEach(mov => {
      const v = vehiculos[mov.placa] || {
        placa: mov.placa,
        tipo: 'Automóvil',
        color: 'Desconocido',
        marca: 'Genérico',
        modelo: 'Modelo',
      };

      const esMoto = v.tipo.toLowerCase().includes('moto');
      let codigoAsignado = mov.celda;

      if (!codigoAsignado) {
        if (esMoto) {
          codigoAsignado = `M-${String(indiceMotoLibre).padStart(2, '0')}`;
          indiceMotoLibre++;
        } else {
          // Asignar por defecto KLM482 a C-14 como en los mockups, o el siguiente
          if (mov.placa === 'KLM482') {
            codigoAsignado = 'C-14';
          } else {
            if (indiceCarroLibre === 14) indiceCarroLibre++; // saltar C-14 si ya está
            codigoAsignado = `C-${String(indiceCarroLibre).padStart(2, '0')}`;
            indiceCarroLibre++;
          }
        }
      }

      ocupadasPorCelda[codigoAsignado] = {
        id: mov.id,
        placa: mov.placa,
        fecha_hora_entrada: mov.fecha_hora_entrada,
        tipoVehiculo: v.tipo,
        marca: v.marca,
        modelo: v.modelo,
        color: v.color,
      };
    });

    // 1. Generar 70 celdas para carros (C-01 a C-70)
    for (let i = 1; i <= 70; i++) {
      const codigo = `C-${String(i).padStart(2, '0')}`;
      const ocupante = ocupadasPorCelda[codigo];
      listado.push({
        codigo,
        tipo: 'CARRO',
        ocupada: Boolean(ocupante),
        movimiento: ocupante,
      });
    }

    // 2. Generar 10 celdas para motos (M-01 a M-10)
    for (let i = 1; i <= 10; i++) {
      const codigo = `M-${String(i).padStart(2, '0')}`;
      const ocupante = ocupadasPorCelda[codigo];
      listado.push({
        codigo,
        tipo: 'MOTO',
        ocupada: Boolean(ocupante),
        movimiento: ocupante,
      });
    }

    return listado;
  }, [movimientosActivos, vehiculos]);

  // Cálculos estadísticos
  const stats = useMemo(() => {
    const total = 80;
    const ocupadasTotal = celdas.filter(c => c.ocupada).length;
    const disponiblesTotal = total - ocupadasTotal;

    const carros = celdas.filter(c => c.tipo === 'CARRO');
    const carrosOcupados = carros.filter(c => c.ocupada).length;
    const carrosDisponibles = 70 - carrosOcupados;

    const motos = celdas.filter(c => c.tipo === 'MOTO');
    const motosOcupadas = motos.filter(c => c.ocupada).length;
    const motosDisponibles = 10 - motosOcupadas;

    const porcentajeOcupacion = Math.round((ocupadasTotal / total) * 100);

    return {
      total,
      ocupadasTotal,
      disponiblesTotal,
      carrosTotal: 70,
      carrosOcupados,
      carrosDisponibles,
      motosTotal: 10,
      motosOcupadas,
      motosDisponibles,
      porcentajeOcupacion,
    };
  }, [celdas]);

  // Celdas filtradas por tipo, estado y búsqueda
  const celdasFiltradas = useMemo(() => {
    return celdas.filter(celda => {
      // Filtro tipo
      if (filtroTipo === 'CARRO' && celda.tipo !== 'CARRO') return false;
      if (filtroTipo === 'MOTO' && celda.tipo !== 'MOTO') return false;

      // Filtro estado
      if (filtroEstado === 'DISPONIBLES' && celda.ocupada) return false;
      if (filtroEstado === 'OCUPADAS' && !celda.ocupada) return false;

      // Filtro búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toUpperCase().trim();
        const coincideCodigo = celda.codigo.toUpperCase().includes(query);
        const coincidePlaca = celda.movimiento?.placa.toUpperCase().includes(query);
        const coincideModelo = celda.movimiento?.modelo.toUpperCase().includes(query);
        return coincideCodigo || coincidePlaca || coincideModelo;
      }

      return true;
    });
  }, [celdas, filtroTipo, filtroEstado, busqueda]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Disponibilidad</h2>
            <span className="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Etapa 2 · 80 Celdas
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitoreo en tiempo real de celdas para automóviles y motocicletas.
          </p>
        </div>

        {/* Indicadores rápidos de resumen */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 block">Ocupación global</span>
            <span className="text-base font-extrabold text-slate-800">
              {stats.ocupadasTotal} / 80 ({stats.porcentajeOcupacion}%)
            </span>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 flex items-center justify-center font-bold text-xs text-blue-600 relative">
            <span>{stats.porcentajeOcupacion}%</span>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN DE DISPONIBILIDAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tarjeta 1: Total Parqueadero */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Capacidad Total</h4>
                <span className="text-xs text-slate-400">80 celdas activas</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              {stats.disponiblesTotal} libres
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>{stats.ocupadasTotal} ocupadas</span>
              <span>{stats.disponiblesTotal} disponibles</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.porcentajeOcupacion}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Celdas de Carros (70) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Zona Carros</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>70 celdas (C-01 a C-70)</span>
                  <span>·</span>
                  <span className="font-bold text-blue-700">$250.000/mes</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {stats.carrosDisponibles} libres
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>{stats.carrosOcupados} ocupadas</span>
              <span className="text-emerald-700 font-semibold">{stats.carrosDisponibles} disponibles</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((stats.carrosOcupados / 70) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Celdas de Motos (10) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Zona Motos</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>10 celdas (M-01 a M-10)</span>
                  <span>·</span>
                  <span className="font-bold text-amber-700">$100.000/mes</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {stats.motosDisponibles} libres
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>{stats.motosOcupadas} ocupadas</span>
              <span className="text-amber-700 font-semibold">{stats.motosDisponibles} disponibles</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((stats.motosOcupadas / 10) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y CONTROLES */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Pestañas por Tipo */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setFiltroTipo('TODOS')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              filtroTipo === 'TODOS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setFiltroTipo('CARRO')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              filtroTipo === 'CARRO'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Zona Carros (70)</span>
          </button>
          <button
            onClick={() => setFiltroTipo('MOTO')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              filtroTipo === 'MOTO'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Zona Motos (10)</span>
          </button>
        </div>

        {/* Filtros de Estado y Búsqueda */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Estado */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as any)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="DISPONIBLES">Solo disponibles</option>
              <option value="OCUPADAS">Solo ocupadas</option>
            </select>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar celda o placa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden w-48 sm:w-56"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Leyenda rápida */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-500 border-l border-slate-200 pl-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>Ocupada Carro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Ocupada Moto</span>
            </div>
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE CELDAS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Distribución de celdas ({celdasFiltradas.length} visibles)
            </h3>
            <span className="text-xs text-slate-400">· Haz clic en cualquier celda para ver detalles o registrar salida</span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Mostrando {celdasFiltradas.filter(c => c.ocupada).length} ocupadas / {celdasFiltradas.filter(c => !c.ocupada).length} libres
          </div>
        </div>

        {/* Grilla responsiva de 80 celdas (10 columnas en pantallas grandes) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {celdasFiltradas.map(celda => {
            const esMoto = celda.tipo === 'MOTO';
            return (
              <button
                key={celda.codigo}
                onClick={() => setCeldaSeleccionada(celda)}
                className={`group relative text-left p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between h-[106px] ${
                  celda.ocupada
                    ? esMoto
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 hover:shadow-md'
                      : 'bg-blue-50/70 border-blue-200 hover:border-blue-500 hover:shadow-md'
                    : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 hover:shadow-sm'
                }`}
              >
                {/* Cabecera de celda: Código + Tipo Icon */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`font-black text-xs tracking-wider px-1.5 py-0.5 rounded ${
                      celda.ocupada
                        ? esMoto
                          ? 'bg-amber-200/80 text-amber-900'
                          : 'bg-blue-200/80 text-blue-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {celda.codigo}
                  </span>

                  <span className="text-slate-400 group-hover:text-slate-600 transition">
                    {esMoto ? (
                      <Bike className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </span>
                </div>

                {/* Contenido según estado */}
                {celda.ocupada && celda.movimiento ? (
                  <div className="mt-1">
                    <span className="block font-black text-sm tracking-wide text-slate-900 leading-none">
                      {celda.movimiento.placa}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate mt-1">
                      {celda.movimiento.marca} {celda.movimiento.modelo}
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-blue-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="truncate">{celda.movimiento.fecha_hora_entrada.split('·')[1] || 'Activo'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-col justify-end flex-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Disponible</span>
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 group-hover:text-emerald-700 transition">
                      + Asignar
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {celdasFiltradas.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No se encontraron celdas con ese criterio</p>
            <p className="text-xs text-slate-400 mt-1">Intenta ajustando el filtro de tipo, estado o búsqueda.</p>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE CELDA */}
      {celdaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="bg-[#0b1320] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-black text-base border border-blue-500/30">
                  {celdaSeleccionada.codigo}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Celda {celdaSeleccionada.codigo}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {celdaSeleccionada.tipo === 'CARRO' ? 'Zona Carros / Camionetas' : 'Zona Motocicletas'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCeldaSeleccionada(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-5">
              {celdaSeleccionada.ocupada && celdaSeleccionada.movimiento ? (
                <>
                  {/* Estado Ocupada */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-blue-900">Vehículo en parqueadero</span>
                    </div>
                    <span className="text-xs font-semibold text-blue-700">Movimiento activo</span>
                  </div>

                  {/* Ficha técnica del vehículo */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Placa</span>
                        <span className="text-2xl font-black text-slate-900 tracking-wider">
                          {celdaSeleccionada.movimiento.placa}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                        {celdaSeleccionada.movimiento.tipoVehiculo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Marca / Modelo:</span>
                        <span className="font-semibold text-slate-800">
                          {celdaSeleccionada.movimiento.marca} {celdaSeleccionada.movimiento.modelo}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Color:</span>
                        <span className="font-semibold text-slate-800">
                          {celdaSeleccionada.movimiento.color}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-400 block mb-0.5">Fecha y hora de entrada:</span>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{celdaSeleccionada.movimiento.fecha_hora_entrada}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones para celda ocupada */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => {
                        const placa = celdaSeleccionada.movimiento?.placa;
                        setCeldaSeleccionada(null);
                        if (placa) onRegistrarSalida(placa);
                      }}
                      className="w-full py-2.5 px-4 bg-[#1e60f2] hover:bg-[#174ecc] text-white font-semibold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                    >
                      <span>Registrar salida de {celdaSeleccionada.movimiento.placa}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        const placa = celdaSeleccionada.movimiento?.placa;
                        setCeldaSeleccionada(null);
                        if (placa) onVerHistorial(placa);
                      }}
                      className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ver historial de movimientos de este vehículo</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Estado Disponible */}
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs">Celda completamente disponible</h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Lista para recibir un vehículo de tipo {celdaSeleccionada.tipo === 'CARRO' ? 'Carro' : 'Moto'}.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Identificador de celda:</span>
                      <span className="font-bold text-slate-800">{celdaSeleccionada.codigo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tipo permitido:</span>
                      <span className="font-bold text-slate-800">
                        {celdaSeleccionada.tipo === 'CARRO' ? 'Carro' : 'Moto'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estado actual:</span>
                      <span className="font-bold text-emerald-700">Libre (0 horas de ocupación)</span>
                    </div>
                  </div>

                  {/* Acción para celda disponible */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const codigo = celdaSeleccionada.codigo;
                        const tipo = celdaSeleccionada.tipo === 'CARRO' ? 'Carro' : 'Moto';
                        setCeldaSeleccionada(null);
                        onRegistrarEntradaConCelda(codigo, tipo);
                      }}
                      className="w-full py-2.5 px-4 bg-[#1e60f2] hover:bg-[#174ecc] text-white font-semibold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                    >
                      <span>Registrar entrada en celda {celdaSeleccionada.codigo}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
