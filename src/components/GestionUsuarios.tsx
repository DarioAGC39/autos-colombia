import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Edit2,
  UserX,
  UserCheck,
  Lock,
  Mail,
  Fingerprint
} from 'lucide-react';

export interface Usuario {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  identificacion: string;
  correo: string;
  nombre_usuario: string;
  rol: 'ADMINISTRADOR' | 'EMPLEADO';
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_creacion: string;
}

interface GestionUsuariosProps {
  usuarios: Usuario[];
  usuarioActual: Usuario | null;
  onCrearUsuario: (datos: {
    nombres: string;
    apellidos: string;
    identificacion: string;
    correo: string;
    nombre_usuario: string;
    rol: 'ADMINISTRADOR' | 'EMPLEADO';
    estado: 'ACTIVO' | 'INACTIVO';
    password: string;
  }) => { success: boolean; error?: string };
  onActualizarUsuario: (
    id_usuario: number,
    datos: {
      nombres: string;
      apellidos: string;
      identificacion: string;
      correo: string;
      nombre_usuario: string;
      rol: 'ADMINISTRADOR' | 'EMPLEADO';
      estado: 'ACTIVO' | 'INACTIVO';
      password?: string;
    }
  ) => { success: boolean; error?: string };
  onCambiarEstado: (id_usuario: number, nuevo_estado: 'ACTIVO' | 'INACTIVO') => { success: boolean; error?: string };
}

export default function GestionUsuarios({
  usuarios,
  usuarioActual,
  onCrearUsuario,
  onActualizarUsuario,
  onCambiarEstado
}: GestionUsuariosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState<'crear' | 'editar' | null>(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);

  // Form state
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    correo: '',
    nombre_usuario: '',
    rol: 'EMPLEADO' as 'ADMINISTRADOR' | 'EMPLEADO',
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
    password: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Resumen estadístico
  const resumen = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.estado === 'ACTIVO').length;
    const inactivos = usuarios.filter(u => u.estado === 'INACTIVO').length;
    const admins = usuarios.filter(u => u.rol === 'ADMINISTRADOR').length;
    const empleados = usuarios.filter(u => u.rol === 'EMPLEADO').length;
    return { total, activos, inactivos, admins, empleados };
  }, [usuarios]);

  // Filtrado de usuarios (RF-05)
  const usuariosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return usuarios;
    const q = busqueda.toLowerCase().trim();
    return usuarios.filter(
      u =>
        u.nombres.toLowerCase().includes(q) ||
        u.apellidos.toLowerCase().includes(q) ||
        u.identificacion.toLowerCase().includes(q) ||
        u.nombre_usuario.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  const abrirModalCrear = () => {
    setUsuarioSeleccionado(null);
    setForm({
      nombres: '',
      apellidos: '',
      identificacion: '',
      correo: '',
      nombre_usuario: '',
      rol: 'EMPLEADO',
      estado: 'ACTIVO',
      password: ''
    });
    setFormError(null);
    setModalAbierto('crear');
  };

  const abrirModalEditar = (u: Usuario) => {
    setUsuarioSeleccionado(u);
    setForm({
      nombres: u.nombres,
      apellidos: u.apellidos,
      identificacion: u.identificacion,
      correo: u.correo,
      nombre_usuario: u.nombre_usuario,
      rol: u.rol,
      estado: u.estado,
      password: ''
    });
    setFormError(null);
    setModalAbierto('editar');
  };

  const cerrarModal = () => {
    setModalAbierto(null);
    setUsuarioSeleccionado(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validaciones frontend
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setFormError('Nombres y apellidos son obligatorios.');
      return;
    }
    if (!form.identificacion.trim() || form.identificacion.trim().length < 5) {
      setFormError('La identificación debe tener al menos 5 caracteres.');
      return;
    }
    if (!form.correo.trim() || !form.correo.includes('@')) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!form.nombre_usuario.trim() || form.nombre_usuario.trim().length < 3) {
      setFormError('El nombre de usuario debe tener mínimo 3 caracteres.');
      return;
    }

    if (modalAbierto === 'crear') {
      if (!form.password || form.password.length < 6) {
        setFormError('La contraseña es obligatoria y debe tener al menos 6 caracteres.');
        return;
      }
      const res = onCrearUsuario(form);
      if (res.success) {
        setMensajeExito(`Usuario @${form.nombre_usuario} registrado correctamente.`);
        cerrarModal();
        setTimeout(() => setMensajeExito(null), 4000);
      } else {
        setFormError(res.error || 'Error al crear el usuario.');
      }
    } else if (modalAbierto === 'editar' && usuarioSeleccionado) {
      if (form.password && form.password.length < 6) {
        setFormError('Si deseas cambiar la contraseña, debe tener al menos 6 caracteres.');
        return;
      }
      const res = onActualizarUsuario(usuarioSeleccionado.id_usuario, form);
      if (res.success) {
        setMensajeExito(`Información del usuario @${form.nombre_usuario} actualizada exitosamente.`);
        cerrarModal();
        setTimeout(() => setMensajeExito(null), 4000);
      } else {
        setFormError(res.error || 'Error al actualizar el usuario.');
      }
    }
  };

  const handleToggleEstado = (u: Usuario) => {
    const nuevoEstado = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar';
    if (window.confirm(`¿Confirmas que deseas ${accion} la cuenta de ${u.nombres} ${u.apellidos}?`)) {
      const res = onCambiarEstado(u.id_usuario, nuevoEstado);
      if (res.success) {
        setMensajeExito(`Cuenta ${nuevoEstado === 'ACTIVO' ? 'activada' : 'desactivada'} correctamente.`);
        setTimeout(() => setMensajeExito(null), 4000);
      } else {
        alert(res.error || `No se pudo ${accion} la cuenta.`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Alerta de Éxito Flotante */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#1e60f2]" />
            <span>Gestión de Usuarios</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Módulo de administración de cuentas, control de roles (Administrador / Empleado) y estados de acceso.
          </p>
        </div>

        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg font-semibold text-sm transition shadow-sm hover:shadow"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      {/* Métricas Rápidas / KPIs de Cuentas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Total</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{resumen.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-emerald-600">Activos</div>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{resumen.activos}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-amber-600">Inactivos</div>
          <div className="text-2xl font-bold text-amber-600 mt-0.5">{resumen.inactivos}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-purple-600">Admins</div>
          <div className="text-2xl font-bold text-purple-600 mt-0.5">{resumen.admins}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold uppercase text-blue-600">Empleados</div>
          <div className="text-2xl font-bold text-blue-600 mt-0.5">{resumen.empleados}</div>
        </div>
      </div>

      {/* Barra de Búsqueda (RF-05) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellidos, identificación o usuario..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 text-sm focus:border-[#1e60f2] focus:ring-1 focus:ring-[#1e60f2] outline-none"
          />
        </div>
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="px-3 h-10 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla de Usuarios (RF-04) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="py-3 px-4">Identificación</th>
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Usuario / Correo</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map(u => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{u.identificacion}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {u.nombres} {u.apellidos}
                        {usuarioActual?.id_usuario === u.id_usuario && (
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Creado: {u.fecha_creacion}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">@{u.nombre_usuario}</div>
                      <div className="text-xs text-slate-500">{u.correo}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.rol === 'ADMINISTRADOR' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>Administrador</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Shield className="w-3 h-3 text-blue-600" />
                          <span>Empleado</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.estado === 'ACTIVO' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => abrirModalEditar(u)}
                          title="Modificar usuario"
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-[#1e60f2] text-slate-600 hover:text-[#1e60f2] transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleEstado(u)}
                          title={u.estado === 'ACTIVO' ? 'Desactivar cuenta' : 'Activar cuenta'}
                          className={`p-1.5 rounded-lg border transition ${
                            u.estado === 'ACTIVO'
                              ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.estado === 'ACTIVO' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-700 text-sm">No se encontraron usuarios</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {busqueda ? `Sin resultados para "${busqueda}".` : 'No hay cuentas registradas en el sistema.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA CREAR / EDITAR USUARIO (RF-03, RF-06, RF-08) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalAbierto === 'crear' ? 'Registrar Nuevo Usuario' : 'Modificar Usuario'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalAbierto === 'crear'
                    ? 'Agrega una nueva cuenta con rol y permisos en Autos Colombia.'
                    : `Editando datos de @${usuarioSeleccionado?.nombre_usuario}`}
                </p>
              </div>
              <button
                onClick={cerrarModal}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombres}
                    onChange={e => setForm({ ...form, nombres: e.target.value })}
                    placeholder="Ej: Carlos Andrés"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.apellidos}
                    onChange={e => setForm({ ...form, apellidos: e.target.value })}
                    placeholder="Ej: Restrepo Gómez"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Identificación (Cédula) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={form.identificacion}
                      onChange={e => setForm({ ...form, identificacion: e.target.value })}
                      placeholder="Ej: 1020304050"
                      className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={form.correo}
                      onChange={e => setForm({ ...form, correo: e.target.value })}
                      placeholder="usuario@autoscolombia.com"
                      className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de Usuario <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre_usuario}
                    onChange={e => setForm({ ...form, nombre_usuario: e.target.value.toLowerCase().replace(/[^a-z0-9_\.-]/g, '') })}
                    placeholder="Ej: crestrepo"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {modalAbierto === 'crear' ? (
                      <>Contraseña <span className="text-rose-500">*</span></>
                    ) : (
                      'Nueva Contraseña (Opcional)'
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder={modalAbierto === 'crear' ? 'Mínimo 6 caracteres' : 'Dejar en blanco para conservar'}
                      className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol Asignado (RF-08) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.rol}
                    onChange={e => setForm({ ...form, rol: e.target.value as 'ADMINISTRADOR' | 'EMPLEADO' })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none bg-white font-medium"
                  >
                    <option value="EMPLEADO">Empleado (Operación diaria)</option>
                    <option value="ADMINISTRADOR">Administrador (Control total)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de la Cuenta (RF-07) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value as 'ACTIVO' | 'INACTIVO' })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none bg-white font-medium"
                  >
                    <option value="ACTIVO">Activo (Puede ingresar)</option>
                    <option value="INACTIVO">Inactivo (Acceso bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg text-sm font-semibold transition shadow-xs"
                >
                  {modalAbierto === 'crear' ? 'Guardar Usuario' : 'Actualizar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
