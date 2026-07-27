import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services';
import { parsearTxt } from '../services/txtParser';
import type {
  AnuladoPendienteRevision,
  CompletadoCorreccion,
  Muestra,
  ProtocoloEditado,
  ResultadoMuestra,
  Usuario,
} from '../types';
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
type SeccionOperacion = 'editar_paciente' | 'correccion_estados';
type BloqueCorreccion = 'anulados' | 'completados';

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
  const [seccionOperacion, setSeccionOperacion] =
    useState<SeccionOperacion>('editar_paciente');
  const [bloqueCorreccion, setBloqueCorreccion] =
    useState<BloqueCorreccion>('anulados');
  const [anuladosPendientes, setAnuladosPendientes] = useState<AnuladoPendienteRevision[]>([]);
  const [cargandoAnuladosPendientes, setCargandoAnuladosPendientes] = useState(false);
  const [errorCorreccionEstados, setErrorCorreccionEstados] = useState<string | null>(null);
  const [mensajeCorreccionEstados, setMensajeCorreccionEstados] = useState<string | null>(null);
  const [anuladoARevertir, setAnuladoARevertir] =
    useState<AnuladoPendienteRevision | null>(null);
  const [revirtiendoAnulado, setRevirtiendoAnulado] = useState(false);
  const [completadoSeleccionado, setCompletadoSeleccionado] =
    useState<CompletadoCorreccion | null>(null);
  const [valoresCorregidosCargados, setValoresCorregidosCargados] = useState(false);
  const [busquedaCompletadosAbierta, setBusquedaCompletadosAbierta] = useState(false);
  const [cargaValoresAbierta, setCargaValoresAbierta] = useState(false);
  const [confirmarInformeAbierto, setConfirmarInformeAbierto] = useState(false);
  const [procesandoCompletado, setProcesandoCompletado] = useState(false);

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

  const cargarAnuladosPendientes = async () => {
    setCargandoAnuladosPendientes(true);
    setErrorCorreccionEstados(null);
    try {
      const registros = await api.listarAnuladosPendientesRevision(usuario.username);
      setAnuladosPendientes(registros);
    } catch (e) {
      setErrorCorreccionEstados(
        e instanceof Error
          ? e.message
          : 'No se pudieron cargar los anulados pendientes de revisión.',
      );
    } finally {
      setCargandoAnuladosPendientes(false);
    }
  };

  useEffect(() => {
    if (usuario.rol === 'admin') {
      void cargarProtocolosEditados();
      void cargarAnuladosPendientes();
    }
  }, [usuario.rol, usuario.username]);

  const confirmarReversionAnulado = async () => {
    if (!anuladoARevertir) return;
    setRevirtiendoAnulado(true);
    setErrorCorreccionEstados(null);
    setMensajeCorreccionEstados(null);
    try {
      await api.revertirAnuladoAEnProceso(anuladoARevertir.protocolo, usuario.username);
      setMensajeCorreccionEstados(
        'La muestra volvió a En proceso y quedó lista para cargar resultados nuevamente.',
      );
      setAnuladoARevertir(null);
      await cargarAnuladosPendientes();
      await onActualizada();
    } catch (e) {
      setErrorCorreccionEstados(
        e instanceof Error ? e.message : 'No se pudo revertir la muestra.',
      );
    } finally {
      setRevirtiendoAnulado(false);
    }
  };

  const seleccionarCompletadoCorreccion = (registro: CompletadoCorreccion) => {
    setCompletadoSeleccionado(registro);
    setValoresCorregidosCargados(false);
    setBusquedaCompletadosAbierta(false);
    setMensajeCorreccionEstados(null);
    setErrorCorreccionEstados(null);
  };

  const cargarValoresCompletado = async (
    valores: Omit<ResultadoMuestra, 'cargadoEn'>,
  ) => {
    if (!completadoSeleccionado) return;
    setProcesandoCompletado(true);
    setErrorCorreccionEstados(null);
    setMensajeCorreccionEstados(null);
    try {
      const actualizado = await api.cargarValoresCompletadoCorreccion(
        completadoSeleccionado.protocolo,
        {
          ...valores,
          usuarioId: usuario.username,
        },
      );
      setCompletadoSeleccionado(actualizado);
      setValoresCorregidosCargados(true);
      setCargaValoresAbierta(false);
      setMensajeCorreccionEstados(
        'Valores corregidos cargados. Ya podés generar el nuevo informe.',
      );
      await onActualizada();
    } catch (e) {
      setErrorCorreccionEstados(
        e instanceof Error ? e.message : 'No se pudieron cargar los valores corregidos.',
      );
    } finally {
      setProcesandoCompletado(false);
    }
  };

  const generarInformeCompletado = async () => {
    if (!completadoSeleccionado) return;
    setProcesandoCompletado(true);
    setErrorCorreccionEstados(null);
    setMensajeCorreccionEstados(null);
    try {
      const respuesta = await api.generarInformeCompletadoCorreccion(
        completadoSeleccionado.protocolo,
        usuario.username,
      );
      setValoresCorregidosCargados(false);
      setConfirmarInformeAbierto(false);
      setMensajeCorreccionEstados(
        respuesta.advertencia ??
          'Nuevo informe generado, subido y verificado en BACON correctamente.',
      );
      await onActualizada();
    } catch (e) {
      setErrorCorreccionEstados(
        e instanceof Error ? e.message : 'No se pudo generar el nuevo informe.',
      );
    } finally {
      setProcesandoCompletado(false);
    }
  };

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

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setSeccionOperacion('editar_paciente')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            seccionOperacion === 'editar_paciente'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          Editar paciente
        </button>
        <button
          type="button"
          onClick={() => setSeccionOperacion('correccion_estados')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            seccionOperacion === 'correccion_estados'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          Corrección de estados
        </button>
      </div>

      {seccionOperacion === 'editar_paciente' ? (
        <>
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
            Aviso de corrección (sin informe)
          </button>
          <button
            type="button"
            onClick={() => cargarMensajeBacon('procesado')}
            disabled={preparandoMail}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {preparandoMail ? 'Adjuntando informe...' : 'Aviso de corrección (informe enviado)'}
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
        </>
      ) : (
        <CorreccionEstadosPanel
          bloque={bloqueCorreccion}
          onBloqueChange={setBloqueCorreccion}
          anuladosPendientes={anuladosPendientes}
          cargandoAnulados={cargandoAnuladosPendientes}
          mensaje={mensajeCorreccionEstados}
          error={errorCorreccionEstados}
          onRevertir={setAnuladoARevertir}
          completadoSeleccionado={completadoSeleccionado}
          valoresCorregidosCargados={valoresCorregidosCargados}
          onBuscarCompletado={() => setBusquedaCompletadosAbierta(true)}
          onCargarValores={() => setCargaValoresAbierta(true)}
          onGenerarInforme={() => setConfirmarInformeAbierto(true)}
        />
      )}

      {anuladoARevertir && (
        <ConfirmarReversionAnuladoModal
          registro={anuladoARevertir}
          procesando={revirtiendoAnulado}
          onCancelar={() => setAnuladoARevertir(null)}
          onConfirmar={confirmarReversionAnulado}
        />
      )}

      {busquedaCompletadosAbierta && (
        <BuscarCompletadoModal
          usuarioId={usuario.username}
          onCancelar={() => setBusquedaCompletadosAbierta(false)}
          onSeleccionar={seleccionarCompletadoCorreccion}
        />
      )}

      {cargaValoresAbierta && completadoSeleccionado && (
        <CargarValoresCompletadoTxtModal
          completado={completadoSeleccionado}
          procesando={procesandoCompletado}
          onCancelar={() => setCargaValoresAbierta(false)}
          onConfirmar={cargarValoresCompletado}
        />
      )}

      {confirmarInformeAbierto && completadoSeleccionado && (
        <ConfirmarInformeCompletadoModal
          completado={completadoSeleccionado}
          procesando={procesandoCompletado}
          onCancelar={() => setConfirmarInformeAbierto(false)}
          onConfirmar={generarInformeCompletado}
        />
      )}
    </div>
  );
}

function CorreccionEstadosPanel({
  bloque,
  onBloqueChange,
  anuladosPendientes,
  cargandoAnulados,
  mensaje,
  error,
  onRevertir,
  completadoSeleccionado,
  valoresCorregidosCargados,
  onBuscarCompletado,
  onCargarValores,
  onGenerarInforme,
}: {
  bloque: BloqueCorreccion;
  onBloqueChange: (bloque: BloqueCorreccion) => void;
  anuladosPendientes: AnuladoPendienteRevision[];
  cargandoAnulados: boolean;
  mensaje: string | null;
  error: string | null;
  onRevertir: (registro: AnuladoPendienteRevision) => void;
  completadoSeleccionado: CompletadoCorreccion | null;
  valoresCorregidosCargados: boolean;
  onBuscarCompletado: () => void;
  onCargarValores: () => void;
  onGenerarInforme: () => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">
          Corrección de estados
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Herramientas para revisar y corregir estados de muestras.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => onBloqueChange('anulados')}
          className={`border-b-2 px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            bloque === 'anulados'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Anulados
        </button>
        <button
          type="button"
          onClick={() => onBloqueChange('completados')}
          className={`border-b-2 px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            bloque === 'completados'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completados
        </button>
      </div>

      <Mensajes mensaje={mensaje} error={error} />

      {bloque === 'anulados' ? (
        <AnuladosPendientesRevision
          registros={anuladosPendientes}
          cargando={cargandoAnulados}
          onRevertir={onRevertir}
        />
      ) : (
        <CompletadosCorreccion
          completado={completadoSeleccionado}
          valoresCorregidosCargados={valoresCorregidosCargados}
          onBuscar={onBuscarCompletado}
          onCargarValores={onCargarValores}
          onGenerarInforme={onGenerarInforme}
        />
      )}
    </section>
  );
}

function AnuladosPendientesRevision({
  registros,
  cargando,
  onRevertir,
}: {
  registros: AnuladoPendienteRevision[];
  cargando: boolean;
  onRevertir: (registro: AnuladoPendienteRevision) => void;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-300 text-blue-700">
            i
          </span>
          <div>
            <h4 className="font-semibold text-blue-900">
              Anulados pendientes de revisión
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-blue-800">
              Estos Taukits fueron marcados por el rol bioquímico como mal anulados y
              requieren revisión administrativa antes de volver al circuito
              operativo.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {[
                'N° serie',
                'Protocolo',
                'Paciente',
                'Estado actual',
                'Motivo',
                'Usuario',
                'Fecha',
                'Acción',
              ].map((header) => (
                <th
                  key={header}
                  className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  Cargando anulados pendientes...
                </td>
              </tr>
            ) : registros.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay Taukits pendientes de revisión administrativa.
                </td>
              </tr>
            ) : (
              registros.map((registro) => (
                <tr key={registro.protocolo} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-mono text-sm text-slate-700">
                    {registro.numeroSerie}
                  </td>
                  <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-900">
                    {registro.protocolo}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">
                      {registro.paciente.apellido}, {registro.paciente.nombre}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      DNI {registro.paciente.dni}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    Pendiente de anulación
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    {registro.motivo}
                    {registro.detalle && (
                      <div className="mt-1 text-xs text-slate-500">
                        {registro.detalle}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    {registro.usuarioId}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">
                    {registro.fecha}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onRevertir(registro)}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                    >
                      Revertir a En proceso
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompletadosCorreccion({
  completado,
  valoresCorregidosCargados,
  onBuscar,
  onCargarValores,
  onGenerarInforme,
}: {
  completado: CompletadoCorreccion | null;
  valoresCorregidosCargados: boolean;
  onBuscar: () => void;
  onCargarValores: () => void;
  onGenerarInforme: () => void;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-blue-900">
              Completados a corregir
            </h4>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-blue-800">
              Utilizá esta herramienta únicamente cuando una muestra completada
              requiera corrección de valores y generación de un nuevo informe.
            </p>
          </div>
          <button
            type="button"
            onClick={onBuscar}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Buscar muestra completada
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Protocolo',
                'N° serie',
                'Basal CO2',
                'Post CO2',
                'Basal Delta',
                'Post Delta',
                'Test Value',
                'Estado',
                'Acciones',
              ].map((header) => (
                <th
                  key={header}
                  className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!completado ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                  Buscá y seleccioná una muestra completada para corregir sus valores.
                </td>
              </tr>
            ) : (
              <tr className="border-t border-slate-100">
                <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-900">
                  {completado.protocolo}
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-700">
                  {completado.numeroSerie}
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-700">
                  {completado.resultados.basalCO2}
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-700">
                  {completado.resultados.postCO2}
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-700">
                  {completado.resultados.basalDelta}
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-700">
                  {completado.resultados.postDelta}
                </td>
                <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-900">
                  {completado.resultados.testValue}
                </td>
                <td className="px-3 py-3 text-sm text-emerald-700">
                  Completado
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={onCargarValores}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                    >
                      Cargar TXT
                    </button>
                    <button
                      type="button"
                      onClick={onGenerarInforme}
                      disabled={!valoresCorregidosCargados}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      Generar informe y subir
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BuscarCompletadoModal({
  usuarioId,
  onCancelar,
  onSeleccionar,
}: {
  usuarioId: string;
  onCancelar: () => void;
  onSeleccionar: (registro: CompletadoCorreccion) => void;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<CompletadoCorreccion[]>([]);
  const [seleccionado, setSeleccionado] = useState<CompletadoCorreccion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = async () => {
    setBuscando(true);
    setError(null);
    try {
      const registros = await api.buscarCompletadosCorreccion(q, usuarioId);
      setResultados(registros);
      setSeleccionado(registros[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar la muestra completada.');
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    void buscar();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Buscar muestra completada
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Buscá por número de serie, protocolo, paciente, DNI o resultado.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void buscar();
            }}
            placeholder="Número de serie, protocolo, nombre, DNI o resultado..."
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => void buscar()}
            disabled={buscando}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                {['N° serie', 'Protocolo', 'Paciente', 'Estado', 'Fecha de informe'].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    No hay resultados para la búsqueda.
                  </td>
                </tr>
              ) : (
                resultados.map((registro) => (
                  <tr
                    key={registro.protocolo}
                    onClick={() => setSeleccionado(registro)}
                    className={`cursor-pointer border-t border-slate-100 ${
                      seleccionado?.protocolo === registro.protocolo
                        ? 'bg-emerald-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-3 font-mono text-sm text-slate-700">
                      {registro.numeroSerie}
                    </td>
                    <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-900">
                      {registro.protocolo}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {registro.paciente.apellido}, {registro.paciente.nombre}
                    </td>
                    <td className="px-3 py-3 text-sm text-emerald-700">
                      Completado
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {registro.fechaInforme}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => seleccionado && onSeleccionar(seleccionado)}
            disabled={!seleccionado}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            Seleccionar
          </button>
        </div>
      </div>
    </div>
  );
}

function CargarValoresCompletadoTxtModal({
  completado,
  procesando,
  onCancelar,
  onConfirmar,
}: {
  completado: CompletadoCorreccion;
  procesando: boolean;
  onCancelar: () => void;
  onConfirmar: (valores: Omit<ResultadoMuestra, 'cargadoEn'>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [contenido, setContenido] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const [valoresDetectados, setValoresDetectados] =
    useState<Omit<ResultadoMuestra, 'cargadoEn'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const procesarContenido = (texto: string) => {
    const parseado = parsearTxt(texto);
    const resultado = parseado.resultados.find(
      (r) => r.testId.trim() === completado.protocolo,
    );
    if (!resultado) {
      setValoresDetectados(null);
      setError(`El TXT no contiene resultados para el protocolo ${completado.protocolo}.`);
      return;
    }
    if (resultado.tieneErrorEquipo) {
      setValoresDetectados(null);
      setError('El TXT contiene error del equipo para este protocolo.');
      return;
    }
    setError(null);
    setValoresDetectados({
      basalCO2: resultado.basalCO2,
      postCO2: resultado.postCO2,
      basalDelta: resultado.basalDelta,
      postDelta: resultado.postDelta,
      testValue: resultado.testValue,
    });
  };

  const procesarArchivo = (file: File) => {
    setError(null);
    setValoresDetectados(null);
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('El archivo debe tener extensión .txt');
      return;
    }
    setArchivo(file);
    const reader = new FileReader();
    reader.onload = () => {
      const texto = String(reader.result ?? '');
      setContenido(texto);
      procesarContenido(texto);
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsText(file);
  };

  const limpiarArchivo = () => {
    setArchivo(null);
    setContenido('');
    setValoresDetectados(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const preview = contenido
    ? contenido.split(/\r?\n/).slice(0, 8).join('\n')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Cargar TXT de corrección
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Adjuntá el TXT exportado por el HeliFan. Se tomarán únicamente
              los valores del protocolo seleccionado.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="text-slate-400 hover:text-slate-700 disabled:text-slate-300"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {!archivo && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              const file = e.dataTransfer.files[0];
              if (file) procesarArchivo(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`mt-5 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              arrastrando
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-sm font-medium text-slate-900">
              Arrastrá el archivo TXT acá, o hacé click para seleccionar
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Se buscará el TestID {completado.protocolo}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) procesarArchivo(file);
              }}
              className="hidden"
            />
          </div>
        )}

        {archivo && (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {archivo.name}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {(archivo.size / 1024).toFixed(1)} KB ·{' '}
                  {contenido.split(/\r?\n/).length} líneas
                </div>
              </div>
              <button
                type="button"
                onClick={limpiarArchivo}
                disabled={procesando}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:text-slate-300"
              >
                Quitar
              </button>
            </div>
            <pre className="max-h-44 overflow-x-auto bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              {preview}
              {contenido.split(/\r?\n/).length > 8 && (
                <div className="mt-1 text-slate-400">
                  ... ({contenido.split(/\r?\n/).length - 8} líneas más)
                </div>
              )}
            </pre>
          </div>
        )}

        {valoresDetectados && (
          <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200">
            <table className="w-full">
              <thead className="bg-emerald-50">
                <tr>
                  {['t/min', '12CO2 / %', 'Delta C / %', 'TestValue', 'TestID'].map((header) => (
                    <th key={header} className="px-3 py-3 text-left text-xs font-bold text-emerald-900">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-emerald-100">
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">0</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{valoresDetectados.basalCO2}</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{valoresDetectados.basalDelta}</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{valoresDetectados.testValue}</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{completado.protocolo}</td>
                </tr>
                <tr className="border-t border-emerald-100">
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">30</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{valoresDetectados.postCO2}</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{valoresDetectados.postDelta}</td>
                  <td className="px-3 py-2 text-sm text-slate-300">-</td>
                  <td className="px-3 py-2 font-mono text-sm text-slate-700">{completado.protocolo}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Al confirmar, se reemplazarán los valores anteriores y la muestra quedará lista para generar un nuevo informe.
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => valoresDetectados && onConfirmar(valoresDetectados)}
            disabled={procesando || !valoresDetectados}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {procesando ? 'Aceptando...' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CargarValoresCompletadoModal({
  completado,
  procesando,
  onCancelar,
  onConfirmar,
}: {
  completado: CompletadoCorreccion;
  procesando: boolean;
  onCancelar: () => void;
  onConfirmar: (valores: Omit<ResultadoMuestra, 'cargadoEn'>) => void;
}) {
  const [basalCO2, setBasalCO2] = useState(String(completado.resultados.basalCO2));
  const [postCO2, setPostCO2] = useState(String(completado.resultados.postCO2));
  const [basalDelta, setBasalDelta] = useState(String(completado.resultados.basalDelta));
  const [postDelta, setPostDelta] = useState(String(completado.resultados.postDelta));
  const [testValue, setTestValue] = useState(String(completado.resultados.testValue));
  const [error, setError] = useState<string | null>(null);

  const numero = (valor: string) => Number(valor.replace(',', '.'));
  const confirmar = () => {
    const valores = {
      basalCO2: numero(basalCO2),
      postCO2: numero(postCO2),
      basalDelta: numero(basalDelta),
      postDelta: numero(postDelta),
      testValue: numero(testValue),
    };
    if (Object.values(valores).some((v) => !Number.isFinite(v))) {
      setError('Completá todos los valores numéricos antes de aceptar.');
      return;
    }
    onConfirmar(valores);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Cargar nuevos valores de medición
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Completá los valores de las dos mediciones esperadas. El TestID se completa automáticamente según el protocolo seleccionado.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="text-slate-400 hover:text-slate-700 disabled:text-slate-300"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['t/min', '12CO2 / %', 'Delta C / %', 'TestValue', 'TestID'].map((header) => (
                  <th key={header} className="px-3 py-3 text-left text-xs font-bold text-slate-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-sm text-slate-700">0</td>
                <td className="px-3 py-2">
                  <ValorInput value={basalCO2} onChange={setBasalCO2} disabled={procesando} />
                </td>
                <td className="px-3 py-2">
                  <ValorInput value={basalDelta} onChange={setBasalDelta} disabled={procesando} />
                </td>
                <td className="px-3 py-2">
                  <ValorInput value={testValue} onChange={setTestValue} disabled={procesando} />
                </td>
                <td className="px-3 py-2 font-mono text-sm text-slate-700">{completado.protocolo}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-sm text-slate-700">30</td>
                <td className="px-3 py-2">
                  <ValorInput value={postCO2} onChange={setPostCO2} disabled={procesando} />
                </td>
                <td className="px-3 py-2">
                  <ValorInput value={postDelta} onChange={setPostDelta} disabled={procesando} />
                </td>
                <td className="px-3 py-2">
                  <input
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-sm text-slate-700">{completado.protocolo}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Al confirmar, se reemplazarán los valores anteriores y la muestra quedará lista para generar un nuevo informe.
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={procesando}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {procesando ? 'Aceptando...' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmarInformeCompletadoModal({
  completado,
  procesando,
  onCancelar,
  onConfirmar,
}: {
  completado: CompletadoCorreccion;
  procesando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
          ✓
        </div>
        <h3 className="mt-5 text-lg font-bold text-slate-900">
          Generar informe y subir a BACON
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Se generará el nuevo informe para{' '}
          <span className="font-mono font-semibold text-slate-900">
            {completado.protocolo}
          </span>{' '}
          con los valores cargados y se enviará a BACON. Esta acción quedará registrada en la auditoría.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          ¿Deseás continuar?
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {procesando ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ValorInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      inputMode="decimal"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
    />
  );
}

function ConfirmarReversionAnuladoModal({
  registro,
  procesando,
  onCancelar,
  onConfirmar,
}: {
  registro: AnuladoPendienteRevision;
  procesando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          Confirmar reversión
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Esta acción devolverá la muestra{' '}
          <span className="font-mono font-semibold text-slate-900">
            {registro.protocolo}
          </span>{' '}
          al estado En proceso para permitir una nueva carga de resultados. No
          se enviará ningún informe a BACON.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {procesando ? 'Confirmando...' : 'Confirmar reversión'}
          </button>
        </div>
      </div>
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
