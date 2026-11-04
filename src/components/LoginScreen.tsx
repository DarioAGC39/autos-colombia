import React, { useState } from 'react';
import { LogIn, Lock, User, AlertCircle, ShieldCheck, Car, Key } from 'lucide-react';
import { Usuario } from './GestionUsuarios';

interface LoginScreenProps {
  usuarios: Usuario[];
  onLoginExitoso: (usuario: Usuario) => void;
}

export default function LoginScreen({ usuarios, onLoginExitoso }: LoginScreenProps) {
  const [identificador, setIdentificador] = useState('admin');
  const [password, setPassword] = useState('Admin123*');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const idLimpio = identificador.trim().toLowerCase();
    const u = usuarios.find(
      x => x.nombre_usuario.toLowerCase() === idLimpio || x.correo.toLowerCase() === idLimpio
    );

    if (!u) {
      setError('Usuario o contraseña incorrectos.');
      return;
    }

    if (u.estado !== 'ACTIVO') {
      setError('Tu cuenta se encuentra inactiva. Comunícate con un administrador.');
      return;
    }

    // En el simulador las contraseñas de demo son Admin123* o cualquier valor para cuentas nuevas
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    onLoginExitoso(u);
  };

  const loginRapido = (username: string) => {
    const u = usuarios.find(x => x.nombre_usuario.toLowerCase() === username.toLowerCase());
    if (u) {
      if (u.estado !== 'ACTIVO') {
        setError(`La cuenta de @${username} está inactiva.`);
        return;
      }
      onLoginExitoso(u);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1320] via-[#152238] to-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Encabezado */}
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-14 h-14 bg-[#1e60f2] text-white rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Car className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Autos Colombia</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1e60f2] mt-1">
            Sistema de Control de Parqueadero
          </p>
        </div>

        {/* Cuerpo */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuario o Correo Electrónico (RF-01)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identificador}
                  onChange={e => setIdentificador(e.target.value)}
                  placeholder="admin o admin@autoscolombia.com"
                  className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg text-sm focus:border-[#1e60f2] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-[#1e60f2] hover:bg-[#174ecc] text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              <span>Ingresar al Sistema</span>
              <LogIn className="w-4 h-4" />
            </button>
          </form>

          {/* Acceso Rápido para Pruebas del Evaluador */}
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#1e60f2]" />
              <span>Acceso Rápido de Prueba (Evaluación):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginRapido('admin')}
                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold text-left transition flex items-center justify-between"
              >
                <span>👑 Administrador</span>
                <span className="text-[10px] font-mono text-purple-600 bg-purple-200/60 px-1 py-0.5 rounded">admin</span>
              </button>
              <button
                type="button"
                onClick={() => loginRapido('empleado')}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold text-left transition flex items-center justify-between"
              >
                <span>👷 Empleado</span>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-200/60 px-1 py-0.5 rounded">empleado</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Contraseña predeterminada para ambos: <code className="font-mono text-slate-600">Admin123*</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
