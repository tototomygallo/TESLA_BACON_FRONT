import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services';
import type { Muestra, ProtocoloEditado, Usuario } from '../types';
import { codigoMuestra, etiquetaTipoEstudioMayus } from '../utils/estudios';

interface Props {
  usuario: Usuario;
  muestras: Muestra[];
  onActualizada: () => void;
}

type CambioPaciente = {
  campo: 'nombre' | 'apellido' | 'DNI';
  anterior: string;
  nuevo: string;
};

const MOTIVOS_CORRECCION_PACIENTE = [
  'Los datos del paciente no corresponden al número de serie',
  'Error de tipeo',
  'Otro',
] as const;

type MotivoCorreccionPaciente = (typeof MOTIVOS_CORRECCION_PACIENTE)[number];

function exportarProtocolosEditadosCsv(registros: ProtocoloEditado[]): void {
  const sep = ';';
  const headers = [
    'Protocolo',
    'Número de serie',
    'Tipo de estudio',
    'Fecha de ingreso',
    'Fecha de edición',
    'Campos editados',
    'Motivo',
    'Usuario responsable',
  ];
  const limpiar = (valor: string | number | undefined) =>
    `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const filas = registros.map((registro) => [
    registro.protocolo,
    registro.numeroSerie,
    registro.tipoEstudio,
    registro.fechaIngreso,
    registro.fechaEdicion,
    registro.camposEditados?.join(', ') ?? '',
    registro.motivo,
    registro.usuario,
  ]);
  const csv = `\uFEFF${headers.map(limpiar).join(sep)}\n${filas
    .map((fila) => fila.map(limpiar).join(sep))
    .join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `protocolos-editados-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function descargarArchivo(archivo: File): void {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdministracionPage({ usuario, muestras, onActualizada }: Props) {
  const [serie, setSerie] = useState('');
  const [motivoBaja, setMotivoBaja] = useState('');
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [mensajeBaja, setMensajeBaja] = useState<string | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [motivoCorreccion, setMotivoCorreccion] =
    useState<MotivoCorreccionPaciente>(MOTIVOS_CORRECCION_PACIENTE[0]);
  const [motivoCorreccionOtro, setMotivoCorreccionOtro] = useState('');
  const [guardandoPaciente, setGuardandoPaciente] = useState(false);
  const [mensajePaciente, setMensajePaciente] = useState<string | null>(null);
  const [errorPaciente, setErrorPaciente] = useState<string | null>(null);
  const [ultimoCambioPaciente, setUltimoCambioPaciente] = useState<{
    numeroSerie: string;
    cambios: CambioPaciente[];
  } | null>(null);

  const [asunto, setAsunto] = useState('');
  const [mensajeMail, setMensajeMail] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviandoMail, setEnviandoMail] = useState(false);
  const [preparandoMail, setPreparandoMail] = useState(false);
  const [mensajeContacto, setMensajeContacto] = useState<string | null>(null);
  const [errorContacto, setErrorContacto] = useState<string | null>(null);
  const [protocolosEditados, setProtocolosEditados] = useState<ProtocoloEditado[]>([]);
  const [cargandoEditados, setCargandoEditados] = useState(false);
  const [errorEditados, setErrorEditados] = useState<string | null>(null);

  const serieNormalizada = serie.trim();
  const hayDatoPacienteParaCorregir = Boolean(nombre.trim() || apellido.trim() || dni.trim());
  const motivoCorreccionFinal =
    motivoCorreccion === 'Otro' ? motivoCorreccionOtro.trim() : motivoCorreccion;
  const muestraSeleccionada = useMemo(
    () =>
      muestras.find(
        (m) =>
          codigoMuestra(m).toLowerCase() === serieNormalizada.toLowerCase() ||
          m.protocolo.toLowerCase() === serieNormalizada.toLowerCase(),
      ) ?? null,
    [muestras, serieNormalizada],
  );

  const cargarProtocolosEditados = async () => {
    setCargandoEditados(true);
    setErrorEditados(null);
    try {
      const registros = await api.listarProtocolosEditadosAdmin(usuario.username);
      setProtocolosEditados(registros);
    } catch (e) {
      setErrorEditados(
        e instanceof Error ? e.message : 'No se pudieron cargar los protocolos editados.',
      );
    } finally {
      setCargandoEditados(false);
    }
  };

  useEffect(() => {
    if (usuario.rol === 'admin') {
      void cargarProtocolosEditados();
    }
  }, [usuario.rol, usuario.username]);

  const buscarMuestra = () => {
    setMensajeBaja(null);
    setErrorBaja(null);
    setMensajePaciente(null);
    setErrorPaciente(null);
    setConfirmandoBaja(false);
    setUltimoCambioPaciente(null);

    if (!muestraSeleccionada) {
      setErrorBaja('No se encontró una muestra con ese número de serie o protocolo.');
      setErrorPaciente('No se encontró una muestra con ese número de serie o protocolo.');
      setNombre('');
      setApellido('');
      setDni('');
      return;
    }

    setNombre(muestraSeleccionada.paciente.nombre);
    setApellido(muestraSeleccionada.paciente.apellido);
    setDni(muestraSeleccionada.paciente.dni);
  };

  const obtenerCambiosPaciente = (): CambioPaciente[] => {
    if (!muestraSeleccionada) return [];

    const cambios: CambioPaciente[] = [];
    const nombreNuevo = nombre.trim();
    const apellidoNuevo = apellido.trim();
    const dniNuevo = dni.trim();

    if (nombreNuevo && nombreNuevo !== muestraSeleccionada.paciente.nombre) {
      cambios.push({
        campo: 'nombre',
        anterior: muestraSeleccionada.paciente.nombre,
        nuevo: nombreNuevo,
      });
    }
    if (apellidoNuevo && apellidoNuevo !== muestraSeleccionada.paciente.apellido) {
      cambios.push({
        campo: 'apellido',
        anterior: muestraSeleccionada.paciente.apellido,
        nuevo: apellidoNuevo,
      });
    }
    if (dniNuevo && dniNuevo !== muestraSeleccionada.paciente.dni) {
      cambios.push({
        campo: 'DNI',
        anterior: muestraSeleccionada.paciente.dni,
        nuevo: dniNuevo,
      });
    }

    return cambios;
  };

  const eliminarSerie = async () => {
    if (!muestraSeleccionada) {
      setErrorBaja('Busca y selecciona una muestra antes de eliminar.');
      return;
    }
    if (!motivoBaja.trim()) {
      setErrorBaja('El motivo es obligatorio.');
      return;
    }
    if (!confirmandoBaja) {
      setConfirmandoBaja(true);
      return;
    }

    setProcesandoBaja(true);
    setErrorBaja(null);
    setMensajeBaja(null);
    try {
      await api.eliminarSerieAdmin(
        codigoMuestra(muestraSeleccionada),
        motivoBaja.trim(),
        usuario.username,
      );
      setMensajeBaja('Número de serie eliminado correctamente.');
      setConfirmandoBaja(false);
      setMotivoBaja('');
      await onActualizada();
    } catch (e) {
      setErrorBaja(e instanceof Error ? e.message : 'No se pudo eliminar el número de serie.');
    } finally {
      setProcesandoBaja(false);
    }
  };

  const corregirPaciente = async () => {
    if (!muestraSeleccionada) {
      setErrorPaciente('Busca y selecciona una muestra antes de corregir.');
      return;
    }
    if (!hayDatoPacienteParaCorregir) {
      setErrorPaciente('Completa al menos un dato para corregir.');
      return;
    }
    if (!motivoCorreccionFinal) {
      setErrorPaciente('El motivo es obligatorio.');
      return;
    }
    const cambios = obtenerCambiosPaciente();
    if (cambios.length === 0) {
      setErrorPaciente('Modifica al menos un dato antes de guardar.');
      return;
    }

    setGuardandoPaciente(true);
    setErrorPaciente(null);
    setMensajePaciente(null);
    try {
      await api.corregirPacienteAdmin(
        codigoMuestra(muestraSeleccionada),
        {
          ...(cambios.some((c) => c.campo === 'nombre') ? { nombre: nombre.trim() } : {}),
          ...(cambios.some((c) => c.campo === 'apellido') ? { apellido: apellido.trim() } : {}),
          ...(cambios.some((c) => c.campo === 'DNI') ? { dni: dni.trim() } : {}),
          motivo: motivoCorreccionFinal,
        },
        usuario.username,
      );
      setUltimoCambioPaciente({
        numeroSerie: codigoMuestra(muestraSeleccionada),
        cambios,
      });
      setMensajePaciente('Datos del paciente actualizados correctamente.');
      setMotivoCorreccion(MOTIVOS_CORRECCION_PACIENTE[0]);
      setMotivoCorreccionOtro('');
      await onActualizada();
      await cargarProtocolosEditados();
    } catch (e) {
      setErrorPaciente(e instanceof Error ? e.message : 'No se pudo corregir el paciente.');
    } finally {
      setGuardandoPaciente(false);
    }
  };

  const enviarMail = async () => {
    if (!asunto.trim() || !mensajeMail.trim()) {
      setErrorContacto('Asunto y mensaje son obligatorios.');
      return;
    }

    setEnviandoMail(true);
    setErrorContacto(null);
    setMensajeContacto(null);
    try {
      await api.enviarMailBacon(
        {
          asunto: asunto.trim(),
          mensaje: mensajeMail.trim(),
          archivos,
        },
        usuario.username,
      );
      setMensajeContacto('Mensaje enviado a BACON correctamente.');
      setAsunto('');
      setMensajeMail('');
      setArchivos([]);
    } catch (e) {
      setErrorContacto(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviandoMail(false);
    }
  };

  const describirDatosIncorrectos = () => {
    const numeroSerieActual = muestraSeleccionada
      ? codigoMuestra(muestraSeleccionada)
      : serieNormalizada;
    const cambiosActuales = obtenerCambiosPaciente();
    const cambios =
      cambiosActuales.length > 0
        ? cambiosActuales
        : ultimoCambioPaciente?.numeroSerie === numeroSerieActual
          ? ultimoCambioPaciente.cambios
          : [];

    if (cambios.length === 0) {
      return 'tenía datos incorrectos que detallamos en este mensaje';
    }

    const describirCambio = (cambio: CambioPaciente) => {
      const etiqueta = cambio.campo === 'DNI' ? 'el DNI' : `el ${cambio.campo}`;
      const anterior = cambio.anterior || 'sin dato';
      return `${etiqueta} ${anterior}, cuando el correcto es ${cambio.nuevo}`;
    };

    if (cambios.length === 1) {
      return `tenía ${describirCambio(cambios[0])}`;
    }

    return `tenía los siguientes datos incorrectos: ${cambios
      .map(describirCambio)
      .join('; ')}`;
  };

  const cargarMensajeBacon = async (etapa: 'recepcion' | 'procesado') => {
    const numeroSerie = muestraSeleccionada
      ? codigoMuestra(muestraSeleccionada)
      : serieNormalizada || '[número de serie]';
    const datosIncorrectos = describirDatosIncorrectos();

    setPreparandoMail(true);
    setErrorContacto(null);
    setMensajeContacto(null);
    setAsunto(`URGENTE - Detectamos datos erróneos en el número de serie: ${numeroSerie}`);
    setMensajeMail(
      etapa === 'recepcion'
        ? `Hola,
Encontramos que el número de serie ${numeroSerie} ${datosIncorrectos}.
Notificamos que hemos realizado el cambio correspondiente en nuestra base de datos, pero necesitamos de manera urgente que realicen el cambio dentro de su sistema para evitar mandarle al cliente un informe erróneo.

Muchas gracias.`
        : `Hola,
Hemos completado y enviado el informe del número de serie ${numeroSerie} y encontramos que ${datosIncorrectos}.
Notificamos que hemos realizado el cambio correspondiente en nuestra base de datos, pero necesitamos de manera urgente que realicen el cambio dentro de su sistema para evitar mandarle al cliente un informe erróneo.
Adjuntamos a continuación el informe con los datos corregidos.

Muchas gracias.`,
    );

    if (etapa === 'procesado') {
      if (!muestraSeleccionada) {
        setErrorContacto('Busca y selecciona una muestra antes de adjuntar el informe corregido.');
        setPreparandoMail(false);
        return;
      }

      try {
        const pdf = await api.obtenerInformePdf(muestraSeleccionada.protocolo);
        const nombreArchivo = `Informe ${muestraSeleccionada.protocolo}.pdf`;
        const archivoPdf = new File([pdf], nombreArchivo, {
          type: pdf.type || 'application/pdf',
        });
        setArchivos((prev) => [
          archivoPdf,
          ...prev.filter((archivo) => archivo.name !== nombreArchivo),
        ]);
        setMensajeContacto('Informe corregido adjuntado correctamente.');
      } catch (e) {
        setErrorContacto(
          e instanceof Error
            ? `No se pudo adjuntar el informe corregido: ${e.message}`
            : 'No se pudo adjuntar el informe corregido.',
        );
      } finally {
        setPreparandoMail(false);
      }
      return;
    }

    setPreparandoMail(false);
  };

  if (usuario.rol !== 'admin') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        No tenés permisos para acceder a Operación.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Operación
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Herramientas operativas reservadas para administradores.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Protocolos editados
            </div>
            <div className="mt-1 text-3xl font-extrabold text-emerald-600">
              {cargandoEditados ? '...' : protocolosEditados.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Correcciones de datos registradas con motivo y usuario responsable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportarProtocolosEditadosCsv(protocolosEditados)}
            disabled={protocolosEditados.length === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Exportar Excel
          </button>
        </div>
        {errorEditados && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {errorEditados}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <Label>Número de serie o protocolo</Label>
            <input
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ej: 20000001"
            />
          </label>
          <button
            type="button"
            onClick={buscarMuestra}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Buscar
          </button>
        </div>

        {muestraSeleccionada && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm md:grid-cols-4">
            <Dato label="Serie" valor={codigoMuestra(muestraSeleccionada)} />
            <Dato label="Tipo" valor={etiquetaTipoEstudioMayus(muestraSeleccionada.tipoEstudio)} />
            <Dato label="Protocolo" valor={muestraSeleccionada.protocolo} />
            <Dato label="Estado" valor={muestraSeleccionada.estado} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <TituloPanel
            titulo="Eliminar número de serie"
            subtitulo="Acción sensible. Requiere motivo y confirmación."
          />

          <label className="mt-4 block">
            <Label>Motivo</Label>
            <textarea
              value={motivoBaja}
              onChange={(e) => {
                setMotivoBaja(e.target.value);
                setConfirmandoBaja(false);
              }}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </label>

          <Mensajes mensaje={mensajeBaja} error={errorBaja} />

          <button
            type="button"
            onClick={eliminarSerie}
            disabled={!muestraSeleccionada || !motivoBaja.trim() || procesandoBaja}
            className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 ${
              confirmandoBaja ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {procesandoBaja
              ? 'Eliminando...'
              : confirmandoBaja
                ? 'Confirmar eliminación'
                : 'Eliminar número de serie'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <TituloPanel
            titulo="Corregir paciente"
            subtitulo="Modifica uno o más datos asociados a la muestra."
          />

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Luego de guardar la corrección, utilizá uno de los botones de Contacto BACON para generar el correo con el número de serie y los datos corregidos.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Nombre" value={nombre} onChange={setNombre} />
            <Campo label="Apellido" value={apellido} onChange={setApellido} />
            <Campo label="DNI" value={dni} onChange={setDni} />
          </div>

          <label className="mt-4 block">
            <Label>Motivo</Label>
            <select
              value={motivoCorreccion}
              onChange={(e) => {
                setMotivoCorreccion(e.target.value as MotivoCorreccionPaciente);
                setMotivoCorreccionOtro('');
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {MOTIVOS_CORRECCION_PACIENTE.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
          </label>

          {motivoCorreccion === 'Otro' && (
            <label className="mt-3 block">
              <Label>Detalle del motivo</Label>
              <textarea
                value={motivoCorreccionOtro}
                onChange={(e) => setMotivoCorreccionOtro(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </label>
          )}

          <Mensajes mensaje={mensajePaciente} error={errorPaciente} />

          <button
            type="button"
            onClick={corregirPaciente}
            disabled={
              !muestraSeleccionada ||
              !hayDatoPacienteParaCorregir ||
              !motivoCorreccionFinal ||
              guardandoPaciente
            }
            className="mt-4 w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {guardandoPaciente ? 'Guardando...' : 'Guardar corrección'}
          </button>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <TituloPanel
          titulo="Contacto BACON"
          subtitulo="Redacta una consulta para BACON. El destinatario queda configurado en backend."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cargarMensajeBacon('recepcion')}
            disabled={preparandoMail}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Datos corregidos al recibir
          </button>
          <button
            type="button"
            onClick={() => cargarMensajeBacon('procesado')}
            disabled={preparandoMail}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {preparandoMail ? 'Adjuntando informe...' : 'Datos detectados con informe enviado'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <Campo label="Asunto" value={asunto} onChange={setAsunto} />
          <label className="block">
            <Label>Mensaje</Label>
            <textarea
              value={mensajeMail}
              onChange={(e) => setMensajeMail(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </label>
          <label className="block">
            <Label>Adjuntos</Label>
            <input
              type="file"
              multiple
              onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        {archivos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {archivos.map((archivo) => (
              <button
                type="button"
                key={`${archivo.name}-${archivo.size}`}
                onClick={() => descargarArchivo(archivo)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                title="Descargar adjunto"
              >
                {archivo.name}
              </button>
            ))}
          </div>
        )}

        <Mensajes mensaje={mensajeContacto} error={errorContacto} />

        <button
          type="button"
          onClick={enviarMail}
          disabled={!asunto.trim() || !mensajeMail.trim() || enviandoMail}
          className="mt-4 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {enviandoMail ? 'Enviando...' : 'Enviar a BACON'}
        </button>
      </section>
    </div>
  );
}

function TituloPanel({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div>
      <div className="text-sm font-semibold uppercase text-slate-950">{titulo}</div>
      <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>
    </div>
  );
}

function Campo({
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </label>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
        {valor}
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
      {children}
    </span>
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
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {mensaje}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  );
}
