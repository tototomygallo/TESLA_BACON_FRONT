import { useEffect, useMemo, useState } from 'react';
import { api } from '../services';
import type { Rol, Usuario, UsuarioConfiguracion } from '../types';

interface Props {
  usuario: Usuario;
}

type VistaConfig = 'password' | 'usuarios' | 'reset';

interface FormCrearUsuario {
  usuario: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  password: string;
  confirmarPassword: string;
}

const FORM_CREAR_INICIAL: FormCrearUsuario = {
  usuario: '',
  email: '',
  nombre: '',
  rol: 'tecnico',
  activo: true,
  password: '',
  confirmarPassword: '',
};

export function ConfiguracionPage({ usuario }: Props) {
  const [vista, setVista] = useState<VistaConfig>('password');

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioConfiguracion[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [guardandoUsuarioId, setGuardandoUsuarioId] = useState<string | null>(null);
  const [eliminandoUsuarioId, setEliminandoUsuarioId] = useState<string | null>(null);
  const [mensajeUsuarios, setMensajeUsuarios] = useState<string | null>(null);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] =
    useState<UsuarioConfiguracion | null>(null);
  const [formCrear, setFormCrear] = useState<FormCrearUsuario>(FORM_CREAR_INICIAL);
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  const [resetUsuarioId, setResetUsuarioId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmacion, setResetConfirmacion] = useState('');
  const [reseteandoPassword, setReseteandoPassword] = useState(false);
  const [mensajeReset, setMensajeReset] = useState<string | null>(null);
  const [errorReset, setErrorReset] = useState<string | null>(null);

  const esAdmin = usuario.rol === 'admin';
  const reglasPassword = useMemo(() => validarPassword(nueva), [nueva]);
  const reglasCrear = useMemo(() => validarPassword(formCrear.password), [formCrear.password]);
  const reglasReset = useMemo(() => validarPassword(resetPassword), [resetPassword]);

  useEffect(() => {
    if (!esAdmin) return;

    setCargandoUsuarios(true);
    setErrorUsuarios(null);
    api
      .listarUsuariosConfiguracion(usuario.id)
      .then((lista) => {
        setUsuarios(lista);
        setResetUsuarioId((actual) => actual || lista[0]?.id || '');
      })
      .catch((e) =>
        setErrorUsuarios(
          e instanceof Error ? e.message : 'No se pudieron cargar usuarios',
        ),
      )
      .finally(() => setCargandoUsuarios(false));
  }, [esAdmin, usuario.id]);

  useEffect(() => {
    if (!mensajePassword && !errorPassword) return;
    const timer = window.setTimeout(() => {
      setMensajePassword(null);
      setErrorPassword(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [mensajePassword, errorPassword]);

  useEffect(() => {
    if (!mensajeUsuarios && !errorUsuarios) return;
    const timer = window.setTimeout(() => {
      setMensajeUsuarios(null);
      setErrorUsuarios(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [mensajeUsuarios, errorUsuarios]);

  useEffect(() => {
    if (!mensajeReset && !errorReset) return;
    const timer = window.setTimeout(() => {
      setMensajeReset(null);
      setErrorReset(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [mensajeReset, errorReset]);

  const actualizarUsuarioLocal = (
    id: string,
    cambios: Partial<UsuarioConfiguracion>,
  ) => {
    setMensajeUsuarios(null);
    setErrorUsuarios(null);
    setUsuarios((actuales) =>
      actuales.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
    );
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeUsuarios(null);
    setErrorUsuarios(null);

    if (!reglasCrear.esValida) {
      setErrorUsuarios('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (formCrear.password !== formCrear.confirmarPassword) {
      setErrorUsuarios('La confirmación no coincide con la contraseña.');
      return;
    }

    setCreandoUsuario(true);
    try {
      const creado = await api.crearUsuarioConfiguracion(usuario.id, {
        usuario: formCrear.usuario,
        nombre: formCrear.nombre,
        email: formCrear.email,
        rol: formCrear.rol,
        password: formCrear.password,
        activo: formCrear.activo,
      });
      setUsuarios((actuales) => [...actuales, creado]);
      setResetUsuarioId((actual) => actual || creado.id);
      setMensajeUsuarios('Usuario creado correctamente');
      setModalCrearAbierto(false);
      setFormCrear(FORM_CREAR_INICIAL);
    } catch (err) {
      setErrorUsuarios(
        err instanceof Error ? err.message : 'No se pudo crear el usuario',
      );
    } finally {
      setCreandoUsuario(false);
    }
  };

  const guardarUsuario = async (usuarioEditado: UsuarioConfiguracion) => {
    const errorValidacion = validarUsuarioEditable(usuarioEditado);
    if (errorValidacion) {
      setMensajeUsuarios(null);
      setErrorUsuarios(errorValidacion);
      return;
    }

    setGuardandoUsuarioId(usuarioEditado.id);
    setMensajeUsuarios(null);
    setErrorUsuarios(null);

    try {
      const actualizado = await api.actualizarUsuarioConfiguracion(usuario.id, {
        id: usuarioEditado.id,
        usuario: usuarioEditado.usuario,
        email: usuarioEditado.email,
        nombre: usuarioEditado.nombre ?? '',
        rol: usuarioEditado.rol,
        activo: usuarioEditado.activo,
      });
      setUsuarios((actuales) =>
        actuales.map((u) => (u.id === actualizado.id ? actualizado : u)),
      );
      setMensajeUsuarios('Usuario actualizado correctamente');
    } catch (err) {
      setErrorUsuarios(
        err instanceof Error ? err.message : 'No se pudo actualizar el usuario',
      );
    } finally {
      setGuardandoUsuarioId(null);
    }
  };

  const eliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    setEliminandoUsuarioId(usuarioAEliminar.id);
    setMensajeUsuarios(null);
    setErrorUsuarios(null);

    try {
      await api.eliminarUsuarioConfiguracion(usuario.id, usuarioAEliminar.id);
      setUsuarios((actuales) =>
        actuales.filter((u) => u.id !== usuarioAEliminar.id),
      );
      setResetUsuarioId((actual) =>
        actual === usuarioAEliminar.id
          ? usuarios.find((u) => u.id !== usuarioAEliminar.id)?.id ?? ''
          : actual,
      );
      setMensajeUsuarios('Usuario eliminado correctamente');
      setUsuarioAEliminar(null);
    } catch (err) {
      setErrorUsuarios(
        err instanceof Error ? err.message : 'No se pudo eliminar el usuario',
      );
    } finally {
      setEliminandoUsuarioId(null);
    }
  };


  const resetearPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeReset(null);
    setErrorReset(null);

    if (!resetUsuarioId) {
      setErrorReset('Seleccioná un usuario.');
      return;
    }
    if (!reglasReset.esValida) {
      setErrorReset('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (resetPassword !== resetConfirmacion) {
      setErrorReset('La confirmación no coincide con la contraseña.');
      return;
    }

    setReseteandoPassword(true);
    try {
      await api.resetPasswordUsuarioConfiguracion(
        usuario.id,
        resetUsuarioId,
        resetPassword,
      );
      setResetPassword('');
      setResetConfirmacion('');
      setMensajeReset('Contraseña reseteada correctamente');
    } catch (err) {
      setErrorReset(
        err instanceof Error ? err.message : 'No se pudo resetear la contraseña',
      );
    } finally {
      setReseteandoPassword(false);
    }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePassword(null);
    setErrorPassword(null);

    if (!reglasPassword.esValida) {
      setErrorPassword('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (nueva !== confirmacion) {
      setErrorPassword('La confirmación no coincide con la nueva contraseña');
      return;
    }

    setGuardandoPassword(true);
    try {
      await api.cambiarPasswordActual(usuario.id, actual, nueva);
      setActual('');
      setNueva('');
      setConfirmacion('');
      setMensajePassword('Contraseña actualizada correctamente');
    } catch (err) {
      setErrorPassword(
        err instanceof Error ? err.message : 'No se pudo cambiar la contraseña',
      );
    } finally {
      setGuardandoPassword(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Configuración
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Preferencias de acceso y administración del sistema.
          </p>
        </div>

        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabConfig activo={vista === 'password'} onClick={() => setVista('password')}>
            Mi contraseña
          </TabConfig>
          {esAdmin && (
            <>
              <TabConfig activo={vista === 'usuarios'} onClick={() => setVista('usuarios')}>
                Usuarios
              </TabConfig>
              <TabConfig activo={vista === 'reset'} onClick={() => setVista('reset')}>
                Cambiar contraseñas
              </TabConfig>
            </>
          )}
        </div>
      </div>

      {vista === 'password' && (
        <section className="mx-auto w-full max-w-3xl">
          <PasswordCard
            actual={actual}
            nueva={nueva}
            confirmacion={confirmacion}
            guardando={guardandoPassword}
            mensaje={mensajePassword}
            error={errorPassword}
            reglas={reglasPassword}
            onSubmit={cambiarPassword}
            onActual={setActual}
            onNueva={setNueva}
            onConfirmacion={setConfirmacion}
          />
        </section>
      )}

      {esAdmin && vista === 'usuarios' && (
        <section className="mx-auto w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <div className="font-semibold text-slate-950 uppercase text-sm">
                Gestión de usuarios
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Administrá usuario, email, nombre, rol y estado de acceso.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormCrear(FORM_CREAR_INICIAL);
                setErrorUsuarios(null);
                setMensajeUsuarios(null);
                setModalCrearAbierto(true);
              }}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Crear Usuario
            </button>
          </div>

          <Mensajes mensaje={mensajeUsuarios} error={errorUsuarios} />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-900">
                  <Th>Usuario</Th>
                  <Th>Email</Th>
                  <Th>Nombre</Th>
                  <Th>Rol</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {cargandoUsuarios ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                      No hay usuarios para mostrar
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100">
                      <Td>
                        <InputTabla
                          value={u.usuario}
                          invalido={u.usuario.trim().length < 3}
                          onChange={(value) =>
                            actualizarUsuarioLocal(u.id, { usuario: value })
                          }
                        />
                      </Td>
                      <Td>
                        <InputTabla
                          type="email"
                          value={u.email}
                          invalido={!esEmailValido(u.email)}
                          onChange={(value) =>
                            actualizarUsuarioLocal(u.id, { email: value })
                          }
                        />
                      </Td>
                      <Td>
                        <InputTabla
                          value={u.nombre ?? ''}
                          invalido={!(u.nombre ?? '').trim()}
                          onChange={(value) =>
                            actualizarUsuarioLocal(u.id, { nombre: value })
                          }
                        />
                      </Td>
                      <Td>
                        <SelectRol
                          value={u.rol}
                          onChange={(value) =>
                            actualizarUsuarioLocal(u.id, { rol: value })
                          }
                        />
                      </Td>
                      <Td>
                        <select
                          value={u.activo ? 'activo' : 'inactivo'}
                          onChange={(e) =>
                            actualizarUsuarioLocal(u.id, {
                              activo: e.target.value === 'activo',
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="activo">Activo</option>
                          <option value="inactivo">Inactivo</option>
                        </select>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                          onClick={() => guardarUsuario(u)}
                          disabled={
                            guardandoUsuarioId === u.id ||
                            !!validarUsuarioEditable(u)
                          }
                            className="rounded-md bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {guardandoUsuarioId === u.id ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsuarioAEliminar(u)}
                            disabled={eliminandoUsuarioId === u.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 transition-colors"
                            aria-label={`Eliminar usuario ${u.usuario}`}
                            title="Eliminar usuario"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {esAdmin && vista === 'reset' && (
        <section className="mx-auto w-full max-w-3xl">
          <form
            onSubmit={resetearPassword}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
          >
            <div>
              <div className="font-semibold text-slate-950 uppercase text-sm">
                Reset de contraseña
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Elegí un usuario y definí una contraseña temporal segura.
              </div>
            </div>

            <Mensajes mensaje={mensajeReset} error={errorReset} />

            <label className="block">
              <Label>Usuario</Label>
              <select
                value={resetUsuarioId}
                onChange={(e) => setResetUsuarioId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.usuario} - {u.nombre || u.email}
                  </option>
                ))}
              </select>
            </label>

            <CampoPassword
              label="Nueva contraseña"
              value={resetPassword}
              onChange={setResetPassword}
            />
            <PasswordRules reglas={reglasReset} />
            <CampoPassword
              label="Confirmar contraseña"
              value={resetConfirmacion}
              onChange={setResetConfirmacion}
            />

            <button
              type="submit"
              disabled={
                reseteandoPassword ||
                !resetUsuarioId ||
                !resetPassword ||
                !resetConfirmacion ||
                !reglasReset.esValida
              }
              className="w-full rounded-lg bg-slate-950 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {reseteandoPassword ? 'Reseteando...' : 'Resetear contraseña'}
            </button>
          </form>
        </section>
      )}

      {modalCrearAbierto && (
        <Modal titulo="Crear usuario" onClose={() => setModalCrearAbierto(false)}>
          <form onSubmit={crearUsuario} className="space-y-4">
            <CampoTexto
              label="Usuario"
              value={formCrear.usuario}
              onChange={(value) => setFormCrear((f) => ({ ...f, usuario: value }))}
              required
            />
            <CampoTexto
              label="Email"
              type="email"
              value={formCrear.email}
              onChange={(value) => setFormCrear((f) => ({ ...f, email: value }))}
              required
            />
            <CampoTexto
              label="Nombre"
              value={formCrear.nombre}
              onChange={(value) => setFormCrear((f) => ({ ...f, nombre: value }))}
              required
            />
            <label className="block">
              <Label>Rol</Label>
              <SelectRol
                value={formCrear.rol}
                onChange={(value) => setFormCrear((f) => ({ ...f, rol: value as Rol }))}
              />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formCrear.activo}
                onChange={(e) =>
                  setFormCrear((f) => ({ ...f, activo: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-950"
              />
              Usuario activo
            </label>
            <CampoPassword
              label="Contraseña inicial"
              value={formCrear.password}
              onChange={(value) => setFormCrear((f) => ({ ...f, password: value }))}
            />
            <PasswordRules reglas={reglasCrear} />
            <CampoPassword
              label="Confirmar contraseña"
              value={formCrear.confirmarPassword}
              onChange={(value) =>
                setFormCrear((f) => ({ ...f, confirmarPassword: value }))
              }
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  creandoUsuario ||
                  !formCrear.usuario ||
                  !formCrear.email ||
                  !formCrear.nombre ||
                  !formCrear.password ||
                  !reglasCrear.esValida
                }
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {creandoUsuario ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {usuarioAEliminar && (
        <Modal
          titulo="Eliminar usuario"
          onClose={() => {
            if (!eliminandoUsuarioId) setUsuarioAEliminar(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              Esta acción eliminará el usuario{' '}
              <span className="font-semibold">{usuarioAEliminar.usuario}</span>.
            </div>
            <p className="text-sm text-slate-600">
              Revisá que no sea una cuenta en uso antes de continuar.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUsuarioAEliminar(null)}
                disabled={!!eliminandoUsuarioId}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={eliminarUsuario}
                disabled={!!eliminandoUsuarioId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {eliminandoUsuarioId ? 'Eliminando...' : 'Eliminar usuario'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PasswordCard({
  actual,
  nueva,
  confirmacion,
  guardando,
  mensaje,
  error,
  reglas,
  onSubmit,
  onActual,
  onNueva,
  onConfirmacion,
}: {
  actual: string;
  nueva: string;
  confirmacion: string;
  guardando: boolean;
  mensaje: string | null;
  error: string | null;
  reglas: ReturnType<typeof validarPassword>;
  onSubmit: (e: React.FormEvent) => void;
  onActual: (value: string) => void;
  onNueva: (value: string) => void;
  onConfirmacion: (value: string) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm"
    >
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Cambiar contraseña
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Actualizá tu contraseña de acceso.
        </div>
      </div>

      <CampoPassword label="Contraseña actual" value={actual} onChange={onActual} />
      <CampoPassword label="Nueva contraseña" value={nueva} onChange={onNueva} />
      <PasswordRules reglas={reglas} />
      <CampoPassword
        label="Confirmar nueva contraseña"
        value={confirmacion}
        onChange={onConfirmacion}
      />

      <Mensajes mensaje={mensaje} error={error} />

      <button
        type="submit"
        disabled={guardando || !actual || !nueva || !confirmacion || !reglas.esValida}
        className="w-full rounded-lg bg-slate-950 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        {guardando ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </form>
  );
}

function validarPassword(value: string) {
  const reglas = [
    { texto: 'Más de 6 caracteres', ok: value.length > 6 },
    { texto: 'Al menos 1 mayúscula', ok: /[A-ZÁÉÍÓÚÑ]/.test(value) },
    { texto: 'Al menos 1 número', ok: /\d/.test(value) },
    { texto: 'Al menos 1 carácter especial', ok: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(value) },
  ];
  return {
    reglas,
    esValida: reglas.every((regla) => regla.ok),
  };
}

function validarUsuarioEditable(usuario: UsuarioConfiguracion): string | null {
  if (!usuario.usuario.trim()) return 'El usuario no puede estar vacío.';
  if (usuario.usuario.trim().length < 3) {
    return 'El usuario debe tener al menos 3 caracteres.';
  }
  if (!usuario.email.trim()) return 'El email no puede estar vacío.';
  if (!esEmailValido(usuario.email)) return 'El email no tiene un formato válido.';
  if (!(usuario.nombre ?? '').trim()) return 'El nombre no puede estar vacío.';
  if (!['tecnico', 'bioquimico', 'admin'].includes(String(usuario.rol))) {
    return 'El rol seleccionado no es válido.';
  }
  return null;
}

function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function PasswordRules({ reglas }: { reglas: ReturnType<typeof validarPassword> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
      {reglas.reglas.map((regla) => (
        <div
          key={regla.texto}
          className={`text-xs font-medium ${
            regla.ok ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          {regla.ok ? '✓' : '•'} {regla.texto}
        </div>
      ))}
    </div>
  );
}

function TabConfig({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        activo
          ? 'bg-slate-950 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  titulo,
  children,
  onClose,
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Mensajes({
  mensaje,
  error,
}: {
  mensaje: string | null;
  error: string | null;
}) {
  return (
    <>
      {mensaje && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {mensaje}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </label>
  );
}

function CampoPassword({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
      {children}
    </span>
  );
}

function SelectRol({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: Rol) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Rol)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
    >
      <option value="admin">admin</option>
      <option value="bioquimico">bioquímico</option>
      <option value="tecnico">técnico</option>
    </select>
  );
}

function InputTabla({
  value,
  onChange,
  type = 'text',
  invalido = false,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  invalido?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 ${
        invalido
          ? 'border-red-300 bg-red-50/40 focus:outline-none focus:ring-2 focus:ring-red-200'
          : 'border-slate-200'
      }`}
    />
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[11px] font-bold text-slate-200 uppercase tracking-wider px-3 py-3">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 align-middle">{children}</td>;
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.67.1 1 .16m-1-.16L18.16 19.67A2.25 2.25 0 0115.92 21H8.08a2.25 2.25 0 01-2.24-1.33L4.77 5.79m14.46 0a48.1 48.1 0 00-3.48-.33m-11 .33c-.34.05-.67.1-1 .16m1-.16a48.1 48.1 0 013.48-.33m7.52 0V4.5A2.25 2.25 0 0013.5 2.25h-3A2.25 2.25 0 008.25 4.5v.96m7.5 0a48.67 48.67 0 00-7.5 0"
      />
    </svg>
  );
}
