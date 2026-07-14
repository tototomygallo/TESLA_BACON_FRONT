// ============================================
// Contenido de la sección Asistencia y documentación
// ============================================
// Contenido estático (primera etapa, sin backend). Cada sección se renderiza
// genéricamente en AsistenciaPage a partir de esta estructura.

export type TipoBloqueInfo = 'importante' | 'consejo' | 'advertencia' | 'error';

export interface BloqueInfo {
  tipo: TipoBloqueInfo;
  texto: string;
  // Imagen que se muestra JUSTO DEBAJO de este bloque informativo.
  imagen?: string;
  imagenAlt?: string;
  imagenCaption?: string;
}

// Un paso del diagrama de flujo (ícono opcional + texto).
export interface PasoFlujo {
  icono?: string;
  texto: string;
}

// Un caso/ejemplo: un texto con su imagen debajo (ej: "Caso 1: ..." + captura).
export interface CasoDoc {
  texto: string;
  imagen?: string;
  imagenAlt?: string;
  imagenCaption?: string;
}

// Bloque de contenido flexible: permite intercalar en orden párrafos, listas,
// subtítulos, imágenes (con epígrafe) y enlaces a otra sección.
export type ContenidoItem =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'lista'; items: string[] }
  | { tipo: 'imagen'; src: string; alt?: string; caption?: string; tamano?: 'chica' | 'media' }
  | { tipo: 'link'; antes?: string; texto: string; seccion: string; despues?: string };

// Una subsección con su propio subtítulo, párrafos y opcionalmente una lista.
export interface SubseccionDoc {
  titulo: string;
  parrafos?: string[];
  items?: string[];
  parrafosPost?: string[];
  // Imagen que va al final de la subsección (debajo de su último texto).
  imagen?: string;
  imagenAlt?: string;
  // Contenido flexible (se renderiza en orden). Para casos con texto, listas
  // e imágenes intercaladas dentro de una misma subsección.
  imagenCaption?: string;
  contenido?: ContenidoItem[];
}

export interface BloqueDoc {
  id: string; // ancla para el índice "En esta página"
  titulo: string;
  parrafos?: string[];
  // Imagen pequeña que va JUSTO DEBAJO de los párrafos del bloque.
  imagenParrafo?: string;
  imagenParrafoAlt?: string;
  imagenParrafoCaption?: string;
  items?: string[];
  // Párrafos que van DEBAJO de la lista de items.
  parrafosPost?: string[];
  // Subsecciones con subtítulo propio (ej: cada "error frecuente").
  subsecciones?: SubseccionDoc[];
  // Contenido flexible del bloque (párrafos, listas, imágenes, links en orden).
  contenido?: ContenidoItem[];
  // Casos/ejemplos, cada uno con su imagen debajo del texto.
  casos?: CasoDoc[];
  infos?: BloqueInfo[];
  // Párrafos que van al FINAL del bloque (después de los bloques informativos).
  parrafosFinal?: string[];
  // Pasos de un diagrama de flujo vertical con íconos.
  flujo?: PasoFlujo[];
  // Imagen ilustrativa del bloque (URL en /public). Si no está el archivo,
  // se muestra el placeholder para reservar el espacio. Va al final del bloque.
  imagen?: string;
  imagenAlt?: string;
  imagenCaption?: string;
}

export interface FaqDoc {
  pregunta: string;
  respuesta: string;
}

export interface SeccionDoc {
  id: string; // slug de navegación
  label: string; // etiqueta del menú lateral
  titulo: string;
  descripcion: string;
  // Caja destacada que aparece arriba de los bloques (ej: cómo usar la doc).
  intro?: { titulo: string; texto: string };
  // Párrafos y recuadros informativos que van entre la descripción y la imagen
  // de la sección.
  parrafosPrevios?: string[];
  infosPrevias?: BloqueInfo[];
  // Imagen ilustrativa de la sección (URL en /public). Si no está el archivo,
  // se muestra el placeholder.
  imagen?: string;
  imagenAlt?: string;
  // Epígrafe que se muestra debajo de la imagen de la sección (ej: "Figura 1...").
  imagenCaption?: string;
  // Recuadros informativos que van DEBAJO de la imagen de la sección.
  infosPosteriores?: BloqueInfo[];
  // Oculta el placeholder de imagen (cuando la sección ya tiene su propio visual).
  sinPlaceholder?: boolean;
  bloques: BloqueDoc[];
  faqs?: FaqDoc[];
  // Título del bloque de FAQs (por defecto "Preguntas frecuentes").
  faqsTitulo?: string;
}

export const SECCIONES_DOC: SeccionDoc[] = [
  {
    id: 'introduccion',
    label: 'Introducción',
    titulo: 'Introducción',
    descripcion:
      'Esta guía reúne toda la documentación necesaria para utilizar Tesla Laboratorio, conocer el funcionamiento de cada módulo y comprender el flujo completo de procesamiento de muestras.',
    intro: {
      titulo: '¿Cómo utilizar esta documentación?',
      texto:
        'Esta documentación está organizada por módulos. Se recomienda recorrer primero esta introducción para comprender el flujo general de la plataforma y luego consultar cada sección según la tarea que se desee realizar.',
    },
    sinPlaceholder: true,
    bloques: [
      {
        id: 'flujo-general',
        titulo: 'Flujo general del sistema',
        parrafos: [
          'Este es el recorrido completo de una muestra dentro del laboratorio. Sirve para entender el proceso de punta a punta antes de entrar a cada módulo:',
        ],
        flujo: [
          { icono: '📷', texto: 'Ingreso por scanner' },
          { icono: '🔗', texto: 'Validación con BACON' },
          { icono: '📦', texto: 'Recepción de muestras' },
          { icono: '🧪', texto: 'Carga de resultados' },
          { icono: '👩‍⚕️', texto: 'Validación bioquímica' },
          { icono: '📄', texto: 'Generación del informe' },
          { icono: '📧', texto: 'Envío a BACON' },
        ],
      },
      {
        id: 'que-es',
        titulo: '¿Qué es?',
        parrafos: [
          'Tesla Laboratorio es el sistema interno para gestionar el ciclo de vida de las muestras, desde que ingresan por scanner hasta que se genera y envía el informe a BACON.',
          'Cada muestra recorre un flujo de trabajo compuesto por distintas etapas (Recibido, En proceso, En validación, Completado o Anulado), permitiendo conocer en todo momento su estado dentro del laboratorio.',
        ],
      },
      {
        id: 'organizacion',
        titulo: 'Cómo está organizada',
        parrafos: ['La navegación principal está en la barra superior. La aplicación se encuentra organizada en módulos, cada uno orientado a una etapa específica del proceso del laboratorio:'],
        items: [
          'Resumen del día: métricas y estado general de la jornada.',
          'Muestras: listado, búsqueda y validación bioquímica.',
          'Ingreso por scanner: alta de muestras escaneando códigos.',
          'Carga de resultados: carga de resultados según el tipo de estudio.',
          'Operación: herramientas administrativas, correción de datos y contacto con BACON.',
          'Configuración: administración de usuarios y gestión de credenciales.',
        ],
        
      },
      {
        id: 'roles',
        titulo: 'Roles y accesos',
        parrafos: ['La plataforma cuenta con tres perfiles de usuario, cada uno con distintos permisos según las tareas que realiza dentro del proceso.'],
        items: [
          'Técnico: ingreso de muestras y carga de resultados.',
          'Bioquímico: además de las funciones del técnico, puede validar muestras y emitir informes.',
          'Administrador: acceso completo a la plataforma, incluyendo configuración de usuarios, herramientas de operación y funciones administrativas.',
        ],
        parrafosPost: [
          'El acceso a cada módulo dependerá del rol asignado al usuario.',
        ],
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Si no ves alguna sección (por ejemplo Operación), es porque tu rol no tiene acceso. Consultá con un administrador.',
          },
        ],

      },
      {
        id: 'seguridad-cuenta',
        titulo: 'Seguridad de la cuenta',
        parrafos: [
          'Por motivos de seguridad, las contraseñas tienen una vigencia de 90 días.',
          'Cuando una contraseña vence, la plataforma solicita al usuario que la cambie antes de continuar utilizando el sistema.',
          'También puede solicitarse un cambio obligatorio cuando un administrador restablece la contraseña de una cuenta o cuando todavía no existe un cambio de contraseña registrado para ese usuario.',
          'Una vez definida la nueva contraseña, comienza nuevamente el período de vigencia de 90 días.',
        ],
      },
    ],
    faqs: [
      {
        pregunta: '¿Necesito internet para usar la plataforma?',
        respuesta:
          'Sí. La plataforma se conecta con BACON y con el servidor del laboratorio para validar y guardar la información.',
      },
      {
        pregunta: '¿Se cierra la sesión sola?',
        respuesta:
          'Sí, por seguridad la sesión se cierra tras 15 minutos de inactividad. Actualizar la página (F5) no cierra la sesión.',
      },
    ],
  },

  {
    id: 'resumen-del-dia',
    label: 'Resumen del día',
    titulo: 'Resumen del día',
    descripcion:
      'El Resumen del día brinda una vista rápida del estado de la operación del laboratorio. Desde esta pantalla es posible consultar las métricas de la jornada, las discrepancias detectadas y el historial de actividad de días anteriores.',
    imagen: '/docs/resumen-del-dia.png',
    imagenAlt: 'Pantalla del Resumen del día con sus indicadores, discrepancias e historial',
    imagenCaption: '**Figura 1. Pantalla principal de Resumen del día.** Los números identifican los bloques explicados a continuación.',
    bloques: [
      {
        id: 'descripcion-general',
        titulo: 'Descripción general',
        parrafos: [
          'El Resumen del día muestra los indicadores de la jornada en curso y un historial de días anteriores. Es la pantalla ideal para ver de un vistazo cómo viene el trabajo.',
        ],
      },
      {
        id: 'selector-fecha',
        titulo: '1. Selector de fecha e indicador En vivo',
        parrafos: [
          'Podés elegir cualquier fecha hasta hoy para revisar sus métricas. Cuando se visualiza la fecha actual aparece la etiqueta En vivo, que indica que los datos se actualizan con la operación del momento.',
        ],
        imagenParrafo: '/docs/resumen-en-vivo.png',
        imagenParrafoAlt: 'Selector de fecha e indicador En vivo',
        imagenParrafoCaption:
          '**Figura 2. Indicador En vivo.** La etiqueta **En vivo** aparece cuando se está consultando la fecha actual e indica que las métricas reflejan la operación del laboratorio en ese momento.',
        infos: [
          {
            tipo: 'consejo',
            texto: 'Usá el botón Hoy para volver rápido a la fecha actual.',
            imagen: '/docs/resumen-boton-hoy.png',
            imagenAlt: 'Ubicación del botón Hoy en el Resumen del día',
            imagenCaption:
              '**Figura 3. Acceso rápido a la fecha actual.** El botón **Hoy** permite regresar rápidamente a la jornada actual después de haber consultado una fecha anterior.',
          },
          {
            tipo: 'importante',
            texto:
              'Las métricas del Resumen del día son únicamente informativas y no modifican el estado de las muestras.',
          },
        ],
      },
      {
        id: 'filtro-tipo-estudio',
        titulo: '2. Filtro por tipo de estudio',
        parrafos: [
          'Podés filtrar las métricas por el tipo de estudio o visualizar todos los estudios en conjunto.',
        ],
      },
      {
        id: 'tarjetas-metricas',
        titulo: '3. Tarjetas de métricas',
        parrafos: ['Cuatro tarjetas resumen el día:'],
        items: [
          'Ingresadas: muestras que entraron al sistema.',
          'Procesadas: muestras en proceso, en validación o completadas.',
          'Finalizadas: muestras completadas.',
          'Pendientes: muestras que todavía no se completaron.',
        ],
        parrafosPost: ['Las métricas siempre corresponden a la fecha seleccionada y al filtro de tipo de estudio aplicado.'],

      },
      {
        id: 'discrepancias',
        titulo: '4. Discrepancias',
        parrafos: [
          'Si algún código escaneado fue rechazado por BACON (no figura como enviado), aparece un panel de discrepancias con el código, la hora y el motivo. Si no hubo, se muestra un cartel verde de "sin discrepancias".',
          'Una discrepancia indica que se intentó ingresar un número de serie que BACON no reconoce como enviado para el laboratorio. Estas situaciones deben revisarse antes de continuar con el procedimiento.',
        ],
        casos: [
          {
            texto: 'Caso 1: No hubo discrepancias.',
            imagen: '/docs/resumen-discrepancias-1.png',
            imagenAlt: 'Cartel verde de sin discrepancias',
            imagenCaption:
              '**Figura 4. Resumen del día sin discrepancias.** Cuando no se detectan códigos rechazados durante el ingreso de muestras, el sistema muestra un panel verde indicando que no existen discrepancias registradas para la fecha seleccionada.',
          },
          {
            texto: 'Caso 2: Hubo discrepancias.',
            imagen: '/docs/resumen-discrepancias-2.png',
            imagenAlt: 'Panel de discrepancias con los códigos rechazados',
            imagenCaption:
              '**Figura 5. Resumen del día con discrepancias.** Cuando BACON rechaza uno o más códigos escaneados, el sistema muestra un panel rojo con la cantidad de discrepancias y el detalle de cada caso, incluyendo el número de serie, la hora y el motivo del rechazo.',
          },
        ],
      },
      {
        id: 'historial-diario',
        titulo: '5. Historial diario y buscador por fecha',
        parrafos: [
          'Debajo se muestra el historial de los últimos días, desglosado por tipo de estudio, con las métricas registradas para cada jornada. El botón Ver (6) permite abrir rápidamente el detalle correspondiente a la fecha seleccionada.',
        ],
      },
    ],
    faqs: [
      {
        pregunta: '¿Por qué el total de un día viejo no coincide con el de hoy?',
        respuesta:
          'Los días anteriores muestran los valores registrados en ese momento; el día en curso se actualiza en vivo.',
      },
      {
        pregunta: '¿Qué significa "En vivo"?',
        respuesta:
          'Indica que se está visualizando el día actual y que los indicadores se actualizan con la operación del laboratorio.',
      },
      {
        pregunta: '¿Qué ocurre si cambio el tipo de estudio?',
        respuesta:
          'Todas las métricas e historial se recalculan mostrando únicamente la información correspondiente al estudio seleccionado.',
      },
      {
        pregunta: '¿Qué son las discrepancias?',
        respuesta:
          'Son muestras rechazadas durante el ingreso porque BACON no las informó como enviadas o presentaron algún inconveniente durante la validación.',
      },
    ],
  },

  {
    id: 'muestras',
    label: 'Muestras',
    titulo: 'Muestras',
    descripcion:
      'Desde esta sección es posible consultar todas las muestras registradas en el sistema, buscar información específica, aplicar filtros, imprimir etiquetas y realizar la validación bioquímica cuando corresponda.',
    imagen: '/docs/muestras.png',
    imagenAlt:
      'Pantalla principal de Muestras: buscador, filtros, tarjetas de resumen, tabla y paginación',
    imagenCaption:
      '**Figura 1. Pantalla principal de Muestras.** Los números identifican los bloques explicados a continuación.',
    bloques: [
      {
        id: 'buscador',
        titulo: '1. Buscador',
        parrafos: [
          'Permite buscar muestras por protocolo, número de serie, nombre o apellido del paciente, DNI o estudio.',
          'La búsqueda se realiza en tiempo real y puede combinarse con los filtros disponibles.',
        ],
      },
      {
        id: 'filtros',
        titulo: '2. Filtros',
        parrafos: ['Las muestras pueden filtrarse por:'],
        items: ['Tipo de estudio.', 'Rango de fechas.', 'Estado.'],
        parrafosPost: [
          'También se encuentran disponibles accesos rápidos como Últimos 3 días, Semana, Mes y Año, que permiten agilizar la consulta.',
        ],
      },
      {
        id: 'filtros-estado',
        titulo: '3. Filtros por estado',
        parrafos: [
          'Los botones ubicados sobre la tabla permiten visualizar únicamente las muestras que se encuentran en un estado determinado:',
        ],
        items: [
          'Todos.',
          'Recibidos.',
          'En proceso.',
          'En validación.',
          'Completados.',
          'Anulados.',
          'Con error.',
        ],
        parrafosPost: [
          'Estos filtros pueden combinarse con la búsqueda, el tipo de estudio y el rango de fechas seleccionado.',
        ],
      },
      {
        id: 'tarjetas-resumen',
        titulo: '4. Tarjetas de resumen',
        parrafos: ['Las tarjetas muestran la cantidad de muestras correspondientes a los filtros aplicados:'],
        items: [
          'Total.',
          'Recibidas.',
          'En proceso.',
          'En validación.',
          'Completadas.',
          'Con error.',
        ],
        parrafosPost: [
          'Los valores se actualizan automáticamente al modificar la búsqueda o cualquiera de los filtros disponibles.',
        ],
      },
      {
        id: 'exportar-csv',
        titulo: '5. Exportar CSV',
        parrafos: [
          'Permite descargar en formato CSV las muestras que se encuentran filtradas en pantalla.',
          'El archivo exportado respeta la búsqueda, el estado, el tipo de estudio y el rango de fechas aplicados en ese momento.',
        ],
        imagen: '/docs/muestras-exportar-csv.png',
        imagenAlt: 'Botón Exportar CSV',
        imagenCaption: '**Figura 2. Archivo CSV exportado desde la sección Muestras.**\n El archivo contiene las muestras visibles según la búsqueda y los filtros aplicados al momento de realizar la exportación.',
      },
      {
        id: 'tabla',
        titulo: '6. Tabla de muestras, estados y acciones',
        parrafos: [
          'La tabla central muestra las muestras que cumplen con los criterios de búsqueda y los filtros aplicados.',
          'Cada fila representa una muestra e incluye:',
        ],
        items: [
          'Protocolo.',
          'Tipo de muestra.',
          'Número de serie.',
          'Paciente.',
          'Estudio.',
          'Estado.',
          'Resultado.',
          'Fecha de ingreso.',
          'Acciones disponibles.',
          'Reinicios.',
        ],
        parrafosPost: [
          'Las acciones visibles cambian según el estado de la muestra y el rol del usuario.',
          'En muestras Taukit, la columna **Reinicios** muestra cuántos reinicios o errores de equipo lleva registrados la muestra: **0/2** indica que no hubo reinicios ni errores previos, **1/2** indica que ya hubo un reinicio manual o un error de equipo, y **2/2** indica que el Taukit llegó al límite y queda anulado. Esta columna no aplica al circuito Lactokit.',
        ],
        subsecciones: [
          {
            titulo: 'Recibido',
            parrafos: [
              'Es el estado inicial de una muestra luego de que el número de serie fue escaneado, validado por BACON e ingresado correctamente al sistema.',
              'En este estado se encuentra disponible la acción Etiquetas, que permite descargar las cinco etiquetas correspondientes a la muestra.',
              'Al imprimir las etiquetas, la muestra pasa al estado En proceso.',
            ],
            imagen: '/docs/muestras-estado-recibido.png',
            imagenAlt: 'Muestra en estado Recibido con la acción Etiquetas',
            imagenCaption: '**Figura 3. Muestra en estado Recibido.** En este estado se encuentra disponible la acción **Etiquetas**, que permite descargar las cinco etiquetas correspondientes. Al realizar la primera descarga, la muestra pasa a estado En proceso.',
          },
          {
            titulo: 'En proceso',
            parrafos: [
              'Indica que la muestra ya fue recibida y se encuentra a la espera de la carga de resultados.',
              'La acción Etiquetas continúa disponible para permitir una nueva impresión cuando sea necesario.',
              'En este estado:',
            ],
            items: [
              'Para Taukit, los resultados se cargan mediante la importación del archivo generado por el equipo.',
              'Para Lactokit, los resultados se cargan manualmente desde la grilla correspondiente.',
            ],
            imagen: '/docs/muestras-estado-en-proceso.png',
            imagenAlt: 'Muestra en estado En proceso',
            imagenCaption: '**Figura 4. Muestra en estado En proceso.**\n Indica que la muestra se encuentra a la espera de la carga de resultados. La acción **Etiquetas** continúa disponible para permitir una nueva descarga cuando sea necesario.',
          },
          {
            titulo: 'En validación',
            parrafos: [
              'La muestra pasa a este estado cuando sus resultados fueron cargados correctamente y se encuentra lista para la revisión de un usuario Bioquímico o Administrador.',
              'Para Taukit, este estado se alcanza cuando el archivo fue procesado sin errores.',
              'Para Lactokit, se alcanza cuando la carga completa fue confirmada.',
              'En este estado aparece la acción Validar. Desde la validación bioquímica se podrá:',
            ],
            items: [
              '**Aceptar y completar** la muestra.',
              'Reiniciar la muestra Taukit cuando sea necesario repetir la medición.',
            ],
            parrafosPost: [
              'El funcionamiento detallado de esta ventana se explica en el apartado Validación bioquímica.',
            ],
            imagen: '/docs/muestras-estado-en-validacion.png',
            imagenAlt: 'Muestra en estado En validación con la acción Validar',
            imagenCaption: '**Figura 5. Muestra en estado En validación.** \n Los resultados fueron cargados correctamente y la muestra está lista para la revisión de un usuario Bioquímico o Administrador. En este estado se habilita la acción **Validar**.',
          },
          {
            titulo: 'Con error',
            contenido: [
              {
                tipo: 'parrafo',
                texto:
                  'La condición Con error aparece acompañando al estado principal de la muestra. Puede presentarse como En proceso — Con error o Anulado — Con error, según la cantidad de reinicios o errores registrados.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'Para Taukit, el contador **Reinicios** suma tanto los reinicios manuales como los errores de equipo detectados automáticamente. La muestra queda anulada cuando llega a **2/2**.',
              },
              {
                tipo: 'lista',
                items: [
                  '**1/2**: hubo un reinicio manual o un error de equipo.',
                  '**2/2**: hubo dos reinicios manuales, dos errores de equipo, o un reinicio manual más un error de equipo.',
                ],
              },
              { tipo: 'subtitulo', texto: 'En proceso — Con error' },
              {
                tipo: 'parrafo',
                texto:
                  'Se produce cuando, durante la primera carga de resultados de un Taukit, el sistema detecta automáticamente que el valor Delta correspondiente al minuto 30 es -10000,00, lo que indica que el equipo no pudo medir correctamente la muestra.',
              },
              { tipo: 'parrafo', texto: 'En este caso:' },
              {
                tipo: 'lista',
                items: [
                  'La muestra permanece en estado En proceso.',
                  'Se muestra adicionalmente la condición Con error.',
                  'Se habilita la acción **Ver error** únicamente para usuarios con rol Bioquímico o Administrador.',
                  'La muestra queda con **Reinicios 1/2** y puede revisarse para decidir si corresponde reiniciarla.',
                ],
              },
              {
                tipo: 'imagen',
                src: '/docs/muestras-con-error-en-proceso.png',
                alt: 'Muestra En proceso — Con error con la acción **Ver error**',
                caption: '**Figura 6. Muestra en estado En proceso con la condición Con error.** \n El sistema detectó un inconveniente durante la medición. Los usuarios Bioquímicos y Administradores pueden utilizar la acción **Ver error** para consultar el detalle y reiniciar la muestra.',
              },
              {
                tipo: 'parrafo',
                texto: 'Al seleccionar **Ver error**, se abre una ventana donde se muestran:',
              },
              {
                tipo: 'lista',
                items: [
                  'Los datos de la muestra y del paciente.',
                  'Los valores registrados en la medición.',
                  'El motivo del error detectado.',
                  'La cantidad de reinicios o errores registrados.',
                  'La acción **Reiniciar muestra**.',
                ],
              },
              {
                tipo: 'parrafo',
                texto:
                  'Al reiniciar, se eliminan los resultados anteriores y la muestra vuelve a quedar en estado En proceso para recibir una nueva carga de resultados.',
              },
              {
                tipo: 'imagen',
                src: '/docs/muestras-con-error-ver-error.png',
                alt: 'Ventana **Ver error** con la acción **Reiniciar muestra**',
                tamano: 'media',
                caption:
                  '**Figura 7. Detalle de una muestra En proceso — Con error.** \n La ventana muestra los resultados registrados, el motivo del error y la cantidad de reinicios o errores registrados. La acción **Reiniciar muestra** está disponible únicamente para usuarios Bioquímicos y Administradores.',
              },
              { tipo: 'subtitulo', texto: 'Anulado — Con error' },
              {
                tipo: 'parrafo',
                texto:
                  'Se produce cuando la muestra Taukit llega a **Reinicios 2/2**, ya sea por reinicios manuales, errores del equipo o una combinación de ambos.',
              },
              { tipo: 'parrafo', texto: 'En este caso:' },
              {
                tipo: 'lista',
                items: [
                  'La muestra pasa a estado Anulado.',
                  'Se mantiene la condición Con error.',
                  'El contador de reinicios llegó a **2/2**.',
                  'No se habilita la acción **Reiniciar muestra**.',
                  'El sistema genera el informe correspondiente a la anulación y lo envía a BACON.',
                  'Para continuar con el estudio deberá utilizarse un nuevo Taukit.',
                ],
              },
              {
                tipo: 'parrafo',
                texto:
                  'En este estado se encuentra disponible la acción **Ver PDF**, que permite consultar o descargar el informe generado.',
              },
              {
                tipo: 'imagen',
                src: '/docs/muestras-con-error-anulado.png',
                alt: 'Muestra en estado Anulado — Con error',
                caption: '**Figura 8. Muestra en estado Anulado con la condición Con error.** \n Este estado se presenta cuando el Taukit llega a **Reinicios 2/2**. La muestra ya no puede reiniciarse y se habilita la acción **Ver PDF** para consultar el informe de anulación enviado a BACON.'
              },
              {
                tipo: 'link',
                antes:
                  'El funcionamiento, contenido y envío del informe relacionado con la anulación de una muestra se describe más adelante en la sección ',
                texto: 'Informes',
                seccion: 'informes',
                despues: '.',
              },
            ],
          },
          {
            titulo: 'Completado',
            parrafos: [
              'La muestra pasa a este estado cuando la validación bioquímica finalizó correctamente, se generó el informe y se realizaron los envíos correspondientes.',
              'Desde la acción **Ver PDF** se puede abrir o descargar el informe definitivo generado para la muestra.',
              'Una muestra completada ya no puede volver a recibir resultados.',
              'Si es necesario corregir sus datos, deberá utilizarse la sección Operación, disponible para usuarios administradores.',
            ],
            imagen: '/docs/muestras-estado-completado.png',
            imagenAlt: 'Muestra en estado Completado con la acción **Ver PDF**',
            imagenCaption: '**Figura 9. Muestra en estado Completado.** \n La validación bioquímica finalizó correctamente, se generó el informe y se realizaron los envíos correspondientes. La acción **Ver PDF** permite consultar o descargar el informe definitivo.',
          },
          {
            titulo: 'Flujo general de estados',
            imagen: '/docs/muestras-flujo-general.png',
            imagenAlt:
              'Flujo principal: Recibido, En proceso, En validación, Completado',
            imagenCaption: '**Figura 10. Flujo general de estados de una muestra.** \n Una muestra avanza normalmente desde **Recibido** hasta **Completado**, pasando por los estados **En proceso** y **En validación**.',
          },
          {
            titulo: 'Flujos alternativos de Taukit',
            imagen: '/docs/muestras-flujo-alternativos.png',
            imagenAlt: 'Flujos alternativos de Taukit',
            contenido: [
              {
                tipo: 'parrafo',
                texto:
                  'Nota: Estos flujos aplican al circuito de Taukit, ya que permiten reiniciar la muestra cuando es necesario repetir la carga de resultados. En Lactokit no aplica este mecanismo de reinicio.',
              },
            ],
            imagenCaption: '**Figura 11. Flujos alternativos de procesamiento de una muestra Taukit.** \n El primer flujo muestra un error inicial seguido de una carga exitosa. El segundo representa un caso que llega a **Reinicios 2/2**, situación en la que la muestra finaliza como **Anulado — Con error**.'
          },
        ],
        parrafosFinal: [
          'Para Lactokit: el guardado parcial mantiene la muestra en En proceso; la confirmación completa la carga y la lleva a En validación; y la carga de resultados de Lactokit no modifica la muestra a estado Anulado.',
        ],
      },
      {
        id: 'paginacion',
        titulo: '7. Paginación',
        parrafos: [
          'Debajo de la tabla se muestra la cantidad total de registros encontrados y los controles de navegación entre páginas.',
          'La opción **Por página** permite elegir cuántas muestras se desean visualizar simultáneamente.',
          'Los botones **Anterior** y **Siguiente** permiten recorrer las páginas cuando la cantidad de resultados supera el límite seleccionado.',
          'La paginación respeta la búsqueda y todos los filtros aplicados.',
        ],
      },
      {
        id: 'validacion',
        titulo: '8. Validación bioquímica',
        parrafos: [
          'La acción **Validar** está disponible únicamente para usuarios con rol Bioquímico o Administrador y se habilita cuando la muestra se encuentra en estado **En validación**.',
          'Desde esta ventana se pueden revisar los datos del paciente, el tipo de estudio y los resultados cargados, antes de definir la acción final sobre la muestra.',
          'El comportamiento de esta validación varía según el tipo de estudio.',
        ],
        subsecciones: [
          {
            titulo: '8.1 Validación de muestras Taukit',
            contenido: [
              {
                tipo: 'parrafo',
                texto:
                  'En el caso de Taukit, la ventana de validación bioquímica ofrece dos acciones posibles:',
              },
              {
                tipo: 'imagen',
                src: '/docs/validacion-taukit.png',
                alt: 'Ventana de validación bioquímica de una muestra Taukit',
                caption: '**Figura 12. Ventana de validación bioquímica para una muestra Taukit.**',
                tamano: 'media',
              },
              { tipo: 'subtitulo', texto: '**8.1.1 Aceptar y completar**' },
              {
                tipo: 'parrafo',
                texto:
                  'Si la información es correcta, la bioquímica podrá seleccionar la opción **Aceptar y completar**. Esta acción realiza lo siguiente:',
              },
              {
                tipo: 'lista',
                items: [
                  'Genera el informe definitivo.',
                  'Cambia el estado de la muestra a Completado.',
                  'Envía el informe a BACON.',
                  'Envía una copia de respaldo por correo electrónico a la cuenta definida para este proceso.',
                  'Verifica el resultado de los envíos realizados.',
                ],
              },
              {
                tipo: 'parrafo',
                texto:
                  'Cuando el proceso finaliza correctamente, el sistema muestra una confirmación de verificación exitosa.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'Si el informe o alguno de los envíos no puede completarse correctamente, el sistema muestra un mensaje de error con el detalle correspondiente para que el usuario pueda revisarlo y volver a intentar la operación.',
              },
              {
                tipo: 'imagen',
                src: '/docs/validacion-taukit-exito.png',
                alt: 'Confirmación de validación y envío exitoso del informe',
                caption: '**Figura 13. Confirmación de validación y envío exitoso del informe.**',
              },
              { tipo: 'subtitulo', texto: '**8.1.2 Reiniciar muestra**' },
              {
                tipo: 'parrafo',
                texto:
                  'Si los resultados no son correctos o deben repetirse, la bioquímica podrá seleccionar la opción **Reiniciar muestra**.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'Al hacerlo, el sistema muestra primero una ventana de confirmación. Si el usuario confirma la acción:',
              },
              {
                tipo: 'lista',
                items: [
                  'Se eliminan los resultados previamente cargados.',
                  'La muestra vuelve al estado **En proceso**.',
                  'Queda lista para esperar una nueva carga de resultados.',
                  'Se suma un registro en el contador **Reinicios**.',
                ],
              },
              {
                tipo: 'parrafo',
                texto:
                  'Esta acción se utiliza únicamente en el circuito de Taukit, cuando es necesario repetir la medición. Si la muestra está en **Reinicios 0/2**, el reinicio la deja en **Reinicios 1/2**. Si ya está en **Reinicios 1/2**, confirmar otro reinicio la lleva a **Reinicios 2/2** y el Taukit queda anulado.',
              },
              {
                tipo: 'imagen',
                src: '/docs/validacion-taukit-reinicio.png',
                alt: 'Confirmación previa al reinicio de una muestra Taukit',
                caption: '**Figura 14. Confirmación previa al reinicio de una muestra Taukit.**',
                tamano: 'media',
              },
              { tipo: 'subtitulo', texto: '**8.1.3 Validación luego de un reinicio**' },
              {
                tipo: 'parrafo',
                texto:
                  'Si una muestra Taukit ya fue reiniciada previamente o tuvo un error de equipo, la ventana de validación bioquímica mostrará el contador **Reinicios 1/2**.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'En ese contexto, la confirmación de reinicio advierte que, si se confirma la acción, el contador llegará a **2/2** y el Taukit quedará anulado en ese momento.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'Esta instancia permite a la bioquímica revisar nuevamente los resultados antes de decidir la acción a realizar.',
              },
              {
                tipo: 'lista',
                items: [
                  'Si los resultados son correctos, podrá **Aceptar y completar** la muestra.',
                  'Si vuelve a seleccionar **Reiniciar muestra**, el contador llegará a **Reinicios 2/2** y el Taukit quedará anulado.',
                ],
              },
              {
                tipo: 'imagen',
                src: '/docs/validacion-taukit-reinicio-2.png',
                alt: 'Validación bioquímica de una muestra Taukit luego de un reinicio',
                caption:
                  '**Figura 15. Ejemplo de validación bioquímica de una muestra Taukit luego de un reinicio, con el contador Reinicios 1/2 visible.**',
                tamano: 'media',
              },
              {
                tipo: 'imagen',
                src: '/docs/validacion-taukit-confirmar-reinicio-2.png',
                alt: 'Confirmación de reinicio de una muestra Taukit con Reinicios 1/2',
                caption:
                  '**Figura 16. Confirmación de reinicio de una muestra Taukit con Reinicios 1/2.** Al seleccionar **Reiniciar muestra**, el sistema advierte que si se confirma la acción el contador llegará a **2/2** y el Taukit quedará anulado.',
                tamano: 'media',
              },
              { tipo: 'subtitulo', texto: '**8.1.4 Caso con error**' },
              {
                tipo: 'parrafo',
                texto:
                  'Cuando el equipo informa un error en la medición, la ventana muestra el detalle del valor detectado y el contador **Reinicios** correspondiente.',
                },
              {
                tipo: 'imagen',
                src: '/docs/validacion-taukit-error.png',
                alt: 'Muestra Taukit con error detectado y opción de reinicio',
                caption:
                  '**Figura 17. Ejemplo de muestra Taukit con error detectado y opción de reinicio.**',
                tamano: 'media',
              },
            ],
          },
          {
            titulo: '8.2 Validación de muestras Lactokit',
            contenido: [
              {
                tipo: 'parrafo',
                texto:
                  'En el caso de Lactokit, la validación bioquímica dispone únicamente de la opción **Aceptar y completar**.',
              },
              {
                tipo: 'imagen',
                src: '/docs/validacion-lactokit.png',
                alt: 'Ventana de validación bioquímica de una muestra Lactokit',
                caption: '**Figura 18. Ventana de validación bioquímica para una muestra Lactokit.**',
              },
              { tipo: 'subtitulo', texto: '**Aceptar y completar**' },
              {
                tipo: 'parrafo',
                texto:
                  'Si la información cargada es correcta, la bioquímica podrá confirmar la muestra mediante la opción **Aceptar y completar**. Esta acción realiza lo siguiente:',
              },
              {
                tipo: 'lista',
                items: [
                  'Genera el informe definitivo.',
                  'Cambia el estado de la muestra a Completado.',
                  'Envía el informe a BACON.',
                  'Envía una copia de respaldo por correo electrónico a la cuenta definida para este proceso.',
                  'Verifica el resultado de los envíos realizados.',
                ],
              },
              {
                tipo: 'parrafo',
                texto:
                  'Cuando el proceso finaliza correctamente, el sistema muestra una confirmación de verificación exitosa.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'Si el informe o alguno de los envíos no puede completarse correctamente, el sistema muestra un mensaje de error con el detalle correspondiente para que el usuario pueda revisarlo y volver a intentar la operación.',
              },
              {
                tipo: 'parrafo',
                texto:
                  'A diferencia de Taukit, en Lactokit no se encuentra disponible la opción **Reiniciar muestra** dentro de esta ventana.',
              },
            ],
          },
          {
            titulo: '8.3 Consideraciones generales',
            parrafos: [
              'En todos los casos, la validación bioquímica representa la última instancia de revisión antes de completar la muestra e informar el resultado.',
              'Se recomienda verificar especialmente:',
            ],
            items: [
              'Datos del paciente.',
              'Tipo de estudio.',
              'Resultados cargados.',
              'Coherencia general del informe antes de su envío.',
            ],
          },
        ],
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Si aparece un mensaje de error durante el envío o la verificación, revisá el detalle informado por el sistema antes de volver a intentar la operación.',
          },
        ],
      },
      {
        id: 'reinicio',
        titulo: '9. Reinicio de muestra Taukit',
        parrafos: [
          'Si una muestra Taukit presenta un error o sus resultados deben repetirse, puede reiniciarse para permitir una nueva carga de resultados.',
          'El reinicio elimina los resultados cargados anteriormente y suma un registro en el contador **Reinicios**.',
          'El mismo contador también suma los errores de equipo detectados automáticamente. Cuando llega a **2/2**, la muestra queda anulada y deberá utilizarse un nuevo Taukit.',
        ],
        infos: [
          {
            tipo: 'advertencia',
            texto:
              'Reiniciar una muestra elimina los resultados cargados anteriormente y suma un registro en **Reinicios**. Si con esa acción llega a **2/2**, el Taukit queda anulado.',
          },
        ],
        parrafosFinal: [
          'Esta funcionalidad corresponde exclusivamente al circuito de Taukit. Las muestras Lactokit no utilizan este mecanismo de reinicio.',
        ],
      },
      {
        id: 'errores',
        titulo: '10. Errores frecuentes',
        subsecciones: [
          {
            titulo: 'El informe no pudo enviarse o verificarse correctamente',
            parrafos: [
              'Si el sistema no puede confirmar correctamente el envío del informe, se mostrará un mensaje de error con el detalle correspondiente.',
              'Revisá el mensaje y volvé a intentar la operación. El sistema también contempla el envío de una copia de respaldo por correo electrónico a la cuenta definida por BACON.',
            ],
          },
          {
            titulo: 'La muestra Taukit llegó a Reinicios 2/2',
            parrafos: [
              'Una muestra Taukit que llegó a **Reinicios 2/2** no puede volver a validarse ni reiniciarse.',
              'Para continuar con el procesamiento deberá utilizarse un nuevo Taukit.',
            ],
          },
          {
            titulo: 'La muestra ya está completada',
            parrafos: [
              'Una muestra completada no puede volver a recibir una carga de resultados.',
              'Si es necesario corregir los datos de una muestra ya completada, deberá utilizarse la sección Operación, disponible para usuarios administradores.',
            ],
          },
        ],
      },
    ],
    faqsTitulo: 'Preguntas frecuentes',
    faqs: [
      {
        pregunta: '¿Quién puede validar muestras?',
        respuesta:
          'La validación está disponible únicamente para usuarios con rol Bioquímico o Administrador.',
      },
      {
        pregunta: '¿Qué significa que una muestra está "Con error"?',
        respuesta:
          'Significa que ocurrió un inconveniente durante la carga o el procesamiento de sus resultados y que la muestra necesita ser revisada.',
      },
      {
        pregunta: '¿Puedo modificar una muestra ya completada?',
        respuesta:
          'Las correcciones sobre muestras completadas deben realizarse desde la sección Operación por un usuario administrador.',
      },
      {
        pregunta: '¿Qué sucede cuando reinicio una muestra Taukit?',
        respuesta:
          'Se eliminan los resultados cargados anteriormente y se suma un registro en **Reinicios**. Si el contador llega a **2/2**, el Taukit queda anulado.',
      },
      {
        pregunta: '¿Cómo vuelvo a imprimir una etiqueta?',
        respuesta:
          'Desde la columna de acciones de la tabla, utilizando nuevamente la opción Etiquetas correspondiente a la muestra.',
      },
    ],
  },

  {
    id: 'ingreso-por-scanner',
    label: 'Ingreso por scanner',
    titulo: 'Ingreso por scanner',
    descripcion:
      'Desde esta sección se realiza el ingreso inicial de muestras al sistema mediante el escaneo de códigos informados por BACON. Cada código escaneado se agrega a un lote temporal. Al confirmar el ingreso, BACON valida los códigos recibidos, devuelve los datos del paciente y el sistema genera el protocolo interno correspondiente.',
    imagen: '/docs/ingreso-scanner.png',
    imagenAlt: 'Pantalla principal de Ingreso por scanner',
    imagenCaption:
      '**Figura 1. Pantalla principal de Ingreso por scanner.** Los números identifican los bloques explicados a continuación.',
    bloques: [
      {
        id: 'campo-escaneo',
        titulo: '1. Campo de escaneo',
        parrafos: [
          'El campo de escaneo permite ingresar los códigos de las muestras utilizando un lector de código de barras.',
          'El campo mantiene el foco automáticamente, por lo que no es necesario hacer clic nuevamente entre una lectura y otra.',
          'Cada vez que el lector envía un Enter, el código escaneado se agrega al Lote actual.',
          'También puede ingresarse un código manualmente si fuera necesario.',
        ],
      },
      {
        id: 'tarjetas-resumen',
        titulo: '2. Tarjetas de resumen',
        parrafos: ['Las tarjetas superiores permiten conocer el estado general del ingreso:'],
        items: [
          'Enviadas: cantidad de muestras informadas por BACON como enviadas al laboratorio.',
          'Escaneadas: cantidad de códigos agregados al lote actual.',
          'Pendientes: cantidad de muestras informadas por BACON que todavía no fueron ingresadas al sistema.',
          'Total ya ingresadas: cantidad total de muestras ya registradas en la plataforma.',
        ],
        parrafosPost: [
          'Estas métricas ayudan a controlar si el ingreso de muestras coincide con lo informado por BACON.',
        ],
      },
      {
        id: 'lote-actual',
        titulo: '3. Lote actual',
        parrafos: [
          'El lote actual muestra los códigos escaneados antes de confirmar el ingreso.',
          'Desde este bloque es posible revisar los códigos incorporados y quitar alguno si fue escaneado por error.',
          'Hasta que se confirma el ingreso, los códigos permanecen únicamente dentro del lote temporal.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/ingreso-scanner-lote.png',
            alt: 'Lote actual con los códigos escaneados',
            tamano: 'media',
            caption:
              '**Figura 2. Lote actual.** Muestra los códigos escaneados antes de confirmar el ingreso. Desde aquí se pueden quitar códigos cargados por error y revisar el lote antes de enviarlo a validación con **BACON**.',
          },
        ],
      },
      {
        id: 'confirmar-ingreso',
        titulo: '4. Confirmar ingreso',
        parrafos: ['El botón Confirmar ingreso procesa todos los códigos del lote actual.', 'Al confirmar:'],
        items: [
          'BACON valida cada código escaneado.',
          'El sistema obtiene los datos del paciente asociados a la muestra.',
          'Se genera el protocolo interno correspondiente.',
          'La muestra queda registrada en estado Recibido.',
          'Se informa cuántas muestras fueron cargadas correctamente.',
          'Se registran las discrepancias o rechazos detectados.',
        ],
        parrafosPost: [
          'El protocolo interno se genera según el tipo de estudio correspondiente.',
        ],
        contenido: [
          { tipo: 'parrafo', texto: 'El formato del protocolo interno es el siguiente:' },
          {
            tipo: 'lista',
            items: [
              'Los primeros 3 dígitos corresponden a la sucursal.',
              'Los 3 dígitos siguientes corresponden al tipo de estudio.',
              'Los últimos 8 dígitos son un número único que se utiliza para contar los estudios.',
            ],
          },
          {
            tipo: 'parrafo',
            texto:
              'Por ejemplo: 001-001-NNNNNNNN corresponde a Taukit y 001-002-NNNNNNNN a Lactokit.',
          },
        ],
      },
      {
        id: 'control-previo',
        titulo: '5. Control previo',
        parrafos: [
          'El bloque Control previo muestra las muestras informadas por BACON que todavía no fueron ingresadas al sistema.',
          'Sirve para comparar lo que BACON informó como enviado con lo que efectivamente fue escaneado e ingresado en la plataforma.',
          'Cada fila puede mostrar información como:',
        ],
        items: ['Tipo de muestra.', 'Paciente.', 'DNI.', 'Clínica.', 'Estado.'],
        parrafosPost: [
          'Este listado permite anticipar qué muestras siguen pendientes de ingreso.',
        ],
      },
      {
        id: 'actualizar',
        titulo: '6. Actualizar Control previo',
        parrafos: [
          'El botón Actualizar permite volver a consultar la información enviada por BACON y refrescar el listado de muestras pendientes.',
          'Se recomienda utilizarlo cuando se espera una actualización de muestras enviadas o cuando se quiere verificar si hubo cambios recientes.',
        ],
      },
      {
        id: 'orden-paginacion',
        titulo: '7. Ordenamiento y paginación',
        parrafos: [
          'Dentro del bloque Control previo, la tabla permite ordenar la información por columnas como Paciente, Tipo de muestra o Número de serie.',
          'También cuenta con paginación para facilitar la visualización cuando existen muchas muestras pendientes.',
          'La opción de paginación permite navegar entre los registros sin perder el contexto del ingreso.',
        ],
      },
      {
        id: 'resultado',
        titulo: '8. Resultado del ingreso',
        parrafos: [
          'Después de confirmar un lote, el sistema informa el resultado del proceso.',
          'El resultado puede incluir:',
        ],
        items: [
          'Muestras cargadas correctamente.',
          'Códigos rechazados por BACON.',
          'Códigos que ya estaban ingresados previamente.',
        ],
        parrafosPost: [
          'Si el lote fue procesado correctamente, las muestras cargadas quedarán disponibles en la sección Muestras con estado Recibido.',
        ],
        contenido: [
          { tipo: 'subtitulo', texto: 'Códigos rechazados y discrepancias' },
          {
            tipo: 'parrafo',
            texto:
              'Si BACON no reconoce un código como enviado al laboratorio, el sistema no ingresa la muestra y registra una discrepancia.',
          },
          {
            tipo: 'parrafo',
            texto:
              'Estas discrepancias se visualizan luego en el Resumen del día, indicando el código rechazado, la hora y el motivo.',
          },
          {
            tipo: 'parrafo',
            texto:
              'Esto permite identificar rápidamente diferencias entre lo escaneado físicamente y lo informado por BACON.',
          },
          {
            tipo: 'imagen',
            src: '/docs/ingreso-scanner-resultado.png',
            alt: 'Resumen del resultado de un lote ingresado',
            caption: '**Figura 3. Resultado del ingreso.**',
          },
        ],
      },
      {
        id: 'buenas-practicas',
        titulo: 'Buenas prácticas',
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Antes de confirmar el ingreso, revisá el lote actual para asegurarte de que los códigos escaneados sean correctos.',
          },
          {
            tipo: 'importante',
            texto:
              'Si un código es rechazado por BACON, la muestra no será ingresada al sistema y quedará registrada como discrepancia en el Resumen del día.',
          },
          {
            tipo: 'advertencia',
            texto:
              'No confirmes el lote si hay códigos escaneados por error. Quitalos primero desde el Lote actual.',
          },
        ],
      },
    ],
    faqsTitulo: 'Preguntas frecuentes',
    faqs: [
      {
        pregunta: '¿Qué pasa si escaneo un código repetido?',
        respuesta:
          'El sistema detectará si la muestra ya fue ingresada previamente y lo informará al procesar el lote.',
      },
      {
        pregunta: '¿Qué pasa si BACON rechaza un código?',
        respuesta:
          'La muestra no se ingresa al sistema y se registra una discrepancia para su revisión.',
      },
      {
        pregunta: '¿Puedo cargar Taukit y Lactokit en el mismo lote?',
        respuesta:
          'Sí. El sistema identifica automáticamente el tipo de estudio según el código informado por BACON.',
      },
      {
        pregunta: '¿Cuándo se genera el protocolo interno?',
        respuesta:
          'El protocolo se genera al confirmar el ingreso y registrar correctamente la muestra en el sistema.',
      },
      {
        pregunta: '¿Dónde puedo ver las muestras ingresadas?',
        respuesta:
          'Una vez confirmadas, las muestras quedan disponibles en la sección Muestras con estado Recibido.',
      },
      {
        pregunta: '¿Para qué sirve el Control previo?',
        respuesta:
          'Sirve para visualizar las muestras informadas por BACON que aún no fueron ingresadas al sistema.',
      },
    ],
  },

  {
    id: 'carga-de-resultados',
    label: 'Carga de resultados',
    titulo: 'Carga de resultados',
    descripcion:
      'Desde esta sección se incorporan al sistema los resultados obtenidos por los equipos o cargados manualmente, según el tipo de estudio seleccionado. La pantalla permite trabajar por tipo de estudio, ya que cada uno puede tener un método de carga diferente.',
    imagen: '/docs/carga-resultados.png',
    imagenAlt: 'Pantalla principal de Carga de resultados',
    imagenCaption:
      '**Figura 1. Pantalla principal de Carga de resultados.** Desde esta sección se selecciona el tipo de estudio y se muestra el método de carga correspondiente. En el ejemplo se visualiza la carga por archivo para **Taukit**.',
    bloques: [
      {
        id: 'selector-tipo',
        titulo: '1. Selector de tipo de estudio',
        parrafos: [
          'El selector permite elegir el estudio sobre el que se desea trabajar.',
          'Según el tipo de estudio seleccionado, la plataforma muestra el método de carga correspondiente.',
          'Algunos estudios pueden cargarse mediante archivos generados por el equipo, mientras que otros requieren carga manual de valores.',
        ],
      },
      {
        id: 'carga-taukit',
        titulo: '2. Carga de resultados Taukit',
        parrafos: [
          'Para Taukit, los resultados se cargan mediante la importación del archivo TXT generado por el equipo.',
          'El archivo puede subirse desde el área de carga mediante selección manual o arrastrándolo dentro de la pantalla.',
          'Antes de procesar el archivo, el sistema muestra una vista previa de su contenido para facilitar la revisión.',
          'Al confirmar la carga, el sistema lee el archivo, identifica cada muestra y la asocia con el protocolo correspondiente.',
          'Si el TXT es idéntico al último archivo cargado, el sistema muestra el aviso **Este TXT ya fue subido** y no procesa ningún resultado. En ese caso, se debe verificar que el archivo corresponda a una medición nueva antes de volver a cargarlo.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/carga-taukit-preview.png',
            alt: 'Vista previa del archivo TXT adjunto',
            caption: '**Figura 2. Vista previa archivo txt adjunto.**',
          },
          { tipo: 'subtitulo', texto: '**Aviso de TXT duplicado**' },
          {
            tipo: 'imagen',
            src: '/docs/carga-taukit-txt-duplicado.png',
            alt: 'Aviso de TXT duplicado',
            caption:
              '**Figura 3. Aviso de TXT duplicado.** El sistema muestra este mensaje cuando el archivo seleccionado es idéntico al último TXT cargado. En ese caso no se procesa ningún resultado y se debe verificar que el archivo corresponda a una medición nueva.',
            tamano: 'media',
          },
        ],
      },
      {
        id: 'procesamiento-taukit',
        titulo: '3. Procesamiento y resultado de la carga Taukit',
        parrafos: [
          'Durante la carga del archivo TXT, el sistema lee la información generada por el equipo, identifica cada muestra y la asocia con el protocolo correspondiente.',
          'Una vez procesado el archivo, se muestra un resumen con el resultado de la carga, permitiendo identificar rápidamente qué muestras fueron cargadas correctamente y cuáles requieren revisión.',
          'Cuando el archivo es idéntico al último TXT cargado, no se muestra este resumen porque el sistema no procesa el contenido nuevamente.',
          'El resultado puede incluir:',
        ],
        items: [
          'Cargados correctamente: muestras cuyos resultados fueron importados y asociados al protocolo correspondiente. Estas muestras pasan a estado En validación.',
          'Reintentados: muestras cargadas luego de un reinicio previo.',
          'Con error: muestras donde el equipo informó un error en la medición. Podrán revisarse desde la sección Muestras, según los permisos del usuario.',
          'No reiniciadas: muestras que ya tenían resultados cargados y necesitan ser reiniciadas antes de volver a cargar resultados.',
          'Anuladas: muestras que ya no pueden continuar procesándose.',
          'No encontradas: registros del archivo que no pudieron asociarse a una muestra existente.',
          'Ya completadas: muestras que ya fueron validadas y completadas.',
          'Controles descartados: registros del equipo que corresponden a controles y no a muestras reales.',
          'Errores de parseo: líneas del archivo que no pudieron interpretarse correctamente.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/carga-taukit-resultado.png',
            alt: 'Resultado de la carga Taukit',
            caption:
              '**Figura 4. Resultado de la carga Taukit.** El sistema informa el detalle del procesamiento del archivo TXT, agrupando las muestras según el resultado obtenido.',
          },
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'El archivo debe corresponder al formato esperado por el sistema. Si contiene registros no reconocidos, valores inválidos o líneas que no puedan interpretarse, el sistema mostrará el detalle para su revisión.',
          },
        ],
      },
      {
        id: 'carga-lactokit',
        titulo: '4. Carga de resultados Lactokit',
        contenido: [
          {
            tipo: 'parrafo',
            texto: 'Para Lactokit, los resultados se cargan manualmente mediante una grilla editable.',
          },
          {
            tipo: 'parrafo',
            texto:
              'Cada fila representa una muestra Lactokit y permite ingresar los valores correspondientes a cada toma.',
          },
          { tipo: 'parrafo', texto: 'La fila contiene:' },
          {
            tipo: 'lista',
            items: [
              'Código Lactokit.',
              'Frasco 1 — 0 min.',
              'Frasco 2 — 25 min.',
              'Frasco 3 — 50 min.',
              'Frasco 4 — 75 min.',
              'Frasco 5 — 100 min.',
              'Frasco 6 — 125 min.',
              'Frasco 7 — 150 min.',
              'Frasco 8 — 175 min.',
              'Valoración.',
              'Acción Confirmar.',
            ],
          },
          { tipo: 'parrafo', texto: 'Cada frasco contiene tres valores:' },
          { tipo: 'lista', items: ['H2.', 'CH4.', 'CO2.'] },
          {
            tipo: 'parrafo',
            texto:
              'La valoración se calcula automáticamente a partir de los datos ingresados y no debe cargarse manualmente.',
          },
          {
            tipo: 'imagen',
            src: '/docs/carga-lactokit-grilla.png',
            alt: 'Grilla de carga manual de resultados Lactokit',
            caption:
              '**Figura 4. Carga manual de resultados Lactokit.** La grilla permite ingresar los valores de H2, CH4 y CO2 para cada frasco de la muestra. Cada fila corresponde a un Lactokit y la valoración se calcula automáticamente a partir de los datos cargados.',
          },
        ],
      },
      {
        id: 'guardado-parcial',
        titulo: '5. Guardado parcial Lactokit',
        parrafos: [
          'La acción **Guardar parcial** permite conservar los datos cargados hasta el momento sin confirmar la muestra completa.',
          'Esta acción se utiliza cuando todavía no se completaron todos los frascos de una muestra.',
          'Para poder guardar parcialmente, los valores de cada frasco ingresado deben estar completos. Es decir, si se carga un valor para un frasco, también deben completarse sus tres campos: H2, CH4 y CO2.',
          'El guardado parcial:',
        ],
        items: [
          'Conserva los valores ingresados.',
          'No elimina la fila de carga.',
          'Mantiene la muestra en estado En proceso.',
          'Permite continuar la carga más adelante.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/carga-lactokit-parcial.png',
            alt: 'Guardado parcial de resultados Lactokit',
            caption:
              '**Figura 5. Guardado parcial de resultados Lactokit.** Cuando se completan los valores de un frasco, se habilita la opción de guardar parcialmente la carga. Esta acción conserva los datos ingresados sin finalizar la muestra, que permanece en estado **En proceso**.',
          },
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'El sistema no permite guardar parcialmente un frasco incompleto. Cada frasco cargado debe tener sus tres valores: H2, CH4 y CO2.',
          },
        ],
      },
      {
        id: 'confirmacion-lactokit',
        titulo: '6. Confirmación de Lactokit',
        parrafos: [
          'La acción Confirmar se habilita únicamente cuando la fila se encuentra completa.',
          'Para confirmar una muestra Lactokit deben haberse cargado los ocho frascos con sus valores correspondientes.',
          'Al confirmar:',
        ],
        items: [
          'Se guardan definitivamente los resultados.',
          'Se calcula la valoración.',
          'La muestra pasa a estado En validación.',
          'La fila queda disponible para una nueva carga.',
          'La muestra queda lista para la revisión bioquímica.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/carga-lactokit-confirmar.png',
            alt: 'Confirmación de carga Lactokit',
            caption:
              '**Figura 6. Confirmación de carga Lactokit.** Una vez completados todos los frascos de la fila, se habilita la acción **Confirmar**. Al confirmar, los resultados quedan registrados definitivamente y la muestra pasa a estado **En validación** para revisión bioquímica.',
          },
        ],
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Antes de confirmar una fila, revisá que el código Lactokit y los valores cargados correspondan a la misma muestra.',
          },
        ],
      },
      {
        id: 'diferencias',
        titulo: '7. Diferencias entre carga parcial y confirmación',
        parrafos: ['La carga parcial y la confirmación cumplen funciones diferentes.'],
        items: [
          'Guardar parcial: conserva los valores ingresados y mantiene la muestra en estado En proceso.',
          'Confirmar: finaliza la carga de resultados y envía la muestra a estado En validación.',
        ],
        parrafosPost: [
          'La confirmación debe utilizarse únicamente cuando la carga de la muestra esté completa.',
        ],
      },
      {
        id: 'errores',
        titulo: '8. Errores frecuentes',
        subsecciones: [
          {
            titulo: 'El archivo no tiene el formato esperado',
            parrafos: [
              'Si el archivo importado no cumple con el formato esperado, el sistema no podrá procesarlo correctamente y mostrará el error correspondiente.',
              'Revisá que el archivo corresponda al equipo y al estudio seleccionado.',
            ],
          },
          {
            titulo: 'La muestra no fue encontrada',
            parrafos: [
              'Puede ocurrir que un registro del archivo no tenga una muestra asociada en el sistema.',
              'En ese caso, revisá si la muestra fue ingresada previamente desde Ingreso por scanner.',
            ],
          },
          {
            titulo: 'La muestra ya fue completada',
            parrafos: [
              'Una muestra completada no puede volver a recibir resultados.',
              'Si es necesario realizar una corrección, deberá gestionarse desde la sección Operación, disponible para usuarios administradores.',
            ],
          },
          {
            titulo: 'Frasco incompleto en Lactokit',
            parrafos: [
              'Si se intenta guardar un frasco con datos parciales, el sistema solicitará completar los valores faltantes.',
              'Cada frasco debe tener H2, CH4 y CO2.',
            ],
          },
          {
            titulo: 'La fila Lactokit no permite confirmar',
            parrafos: [
              'La acción Confirmar se habilita únicamente cuando la fila tiene cargados todos los frascos requeridos.',
            ],
          },
        ],
      },
    ],
    faqsTitulo: 'Preguntas frecuentes',
    faqs: [
      {
        pregunta: '¿Todos los estudios se cargan de la misma manera?',
        respuesta:
          'No. Cada tipo de estudio puede tener un método de carga diferente, según el equipo o procedimiento asociado.',
      },
      {
        pregunta: '¿Qué pasa si cargo un archivo Taukit con errores?',
        respuesta:
          'El sistema mostrará un resumen indicando qué registros fueron procesados correctamente y cuáles requieren revisión.',
      },
      {
        pregunta: '¿Qué sucede si guardo parcialmente un Lactokit?',
        respuesta:
          'Los valores cargados quedan almacenados y la muestra permanece en estado En proceso hasta que se complete y confirme la fila.',
      },
      {
        pregunta: '¿Qué sucede al confirmar un Lactokit?',
        respuesta:
          'La muestra pasa a estado En validación y queda disponible para la revisión bioquímica.',
      },
      {
        pregunta: '¿La valoración de Lactokit se carga manualmente?',
        respuesta:
          'No. La valoración se calcula automáticamente a partir de los valores ingresados.',
      },
      {
        pregunta: '¿Puedo cargar resultados de una muestra completada?',
        respuesta:
          'No. Una muestra completada ya no puede recibir nuevos resultados desde esta sección.',
      },
    ],
  },

  {
    id: 'informes',
    label: 'Informes',
    titulo: 'Informes',
    descripcion:
      'Desde esta sección se explica qué tipos de informes genera la plataforma, en qué momento se generan y cómo se envían a BACON. Los informes se generan automáticamente según el tipo de estudio, el estado de la muestra y el resultado obtenido.',
    sinPlaceholder: true,
    bloques: [
      {
        id: 'informes-taukit',
        titulo: '1. Informes Taukit',
        parrafos: ['Para Taukit, la plataforma puede generar dos tipos de informes:'],
        items: [
          'Informe de muestra completada exitosamente.',
          'Informe de muestra anulada.',
        ],
      },
      {
        id: 'taukit-completada',
        titulo: '1.1 Muestra completada exitosamente',
        parrafos: [
          'Este informe se genera cuando una muestra Taukit fue validada correctamente por la bioquímica.',
          'Ocurre cuando la muestra se encuentra en estado En validación y se selecciona la acción **Aceptar y completar**.',
          'Al completar la muestra:',
        ],
        items: [
          'Se genera el informe definitivo.',
          'La muestra pasa a estado Completado.',
          'El informe se envía a BACON.',
          'Se envía una copia de respaldo por correo electrónico a la cuenta definida para este proceso.',
          'El sistema muestra una confirmación si el envío y la verificación fueron exitosos.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/informe-taukit-completado.png',
            alt: 'Informe Taukit de muestra completada exitosamente',
            tamano: 'media',
            caption:
              '**Figura 1. Informe Taukit de muestra completada exitosamente.** Ejemplo del informe generado cuando la muestra fue validada y completada correctamente.',
          },
        ],
      },
      {
        id: 'taukit-anulada',
        titulo: '1.2 Muestra anulada',
        parrafos: [
          'Este informe se genera cuando una muestra Taukit no puede continuar procesándose.',
          'Puede ocurrir cuando la muestra llega a **Reinicios 2/2** y queda en estado Anulado.',
          'Al anularse la muestra:',
        ],
        items: [
          'Se genera el informe correspondiente a la anulación.',
          'La muestra queda en estado Anulado.',
          'El informe se envía a BACON.',
          'Se envía una copia de respaldo por correo electrónico a la cuenta definida para este proceso.',
          'La muestra ya no puede reiniciarse ni continuar procesándose.',
        ],
        parrafosPost: [
          'El informe de anulación permite dejar registro formal de que la muestra no pudo completarse y que deberá utilizarse un nuevo kit si se desea continuar con el estudio.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/informe-taukit-anulado.png',
            alt: 'Informe Taukit de muestra anulada',
            tamano: 'media',
            caption:
              '**Figura 2. Informe Taukit de muestra anulada.** Ejemplo del informe generado cuando la muestra Taukit llegó a **Reinicios 2/2** y fue anulada.',
          },
        ],
      },
      {
        id: 'informe-lactokit',
        titulo: '2. Informe Lactokit',
        parrafos: [
          'Para Lactokit, la plataforma genera un único informe en PDF. El contenido del informe mantiene el mismo formato, pero la valoración de la prueba se calcula automáticamente según los valores cargados para la muestra.',
          'El estudio Lactokit evalúa la posible malabsorción de lactosa a partir del análisis de gases en el aliento del paciente.',
        ],
        subsecciones: [
          {
            titulo: '2.1 Datos utilizados para el informe',
            parrafos: [
              'Por cada muestra Lactokit se cargan tres gases, cada uno con ocho frascos o mediciones en el tiempo:',
            ],
            items: [
              'H2 (hidrógeno): indicador asociado a malabsorción.',
              'CH4 (metano): indicador asociado a malabsorción.',
              'CO2 (dióxido de carbono): indicador de calidad de la muestra de aliento.',
            ],
            parrafosPost: [
              'El CO2 no representa un resultado clínico, sino que permite determinar si la muestra fue tomada correctamente.',
              'Cada frasco puede contener un valor numérico, una medición inválida del equipo o quedar vacío si todavía no fue cargado.',
            ],
          },
          {
            titulo: '2.2 Frascos inválidos por CO2',
            parrafos: [
              'Un frasco con CO2 menor a 1,4% se considera inválido, ya que indica que la muestra de aliento no fue tomada correctamente.',
              'Cuando un frasco es inválido por CO2, sus valores de H2 y CH4 se excluyen del cálculo de la valoración.',
              'La cantidad de frascos inválidos permite determinar si el estudio es confiable o si corresponde sugerir la repetición de la prueba.',
            ],
          },
          {
            titulo: '2.3 Cálculo de la valoración',
            contenido: [
              {
                tipo: 'parrafo',
                texto: 'El sistema calcula automáticamente la valoración del Lactokit en base a los valores cargados.',
              },
              { tipo: 'parrafo', texto: 'Primero se evalúa la calidad de la muestra mediante el CO2:' },
              {
                tipo: 'parrafo',
                texto: 'Si existen 4 o más frascos inválidos por CO2 menor a 1,4%, el estudio no se considera válido y se genera la valoración correspondiente a repetición de la prueba por mala toma de muestra.',
              },
              {
                tipo: 'parrafo',
                texto: 'Si existen menos de 4 frascos inválidos, el sistema analiza los valores de H2 y CH4 sobre los frascos válidos:',
              },
              {
                tipo: 'lista',
                items: [
                  'H2 elevado: cuando algún frasco posterior al basal supera al valor basal en más de 20 ppm.',
                  'CH4 elevado: cuando algún frasco posterior al basal supera los 10 ppm.',
                ],
              },
              { tipo: 'parrafo', texto: 'Según estos resultados, la valoración puede indicar:' },
              {
                tipo: 'lista',
                items: [
                  'Elevación de hidrógeno.',
                  'Elevación de metano.',
                  'Elevación de hidrógeno y metano.',
                  'Resultado no compatible con malabsorción de lactosa.',
                ],
              },
              {
                tipo: 'parrafo',
                texto: 'Si existen exactamente 3 frascos inválidos, el sistema muestra la valoración clínica correspondiente y agrega una advertencia indicando que se sugiere repetir la prueba.',
              },
            ],
          },
          {
            titulo: '2.4 Textos de valoración',
            parrafos: [
              'El informe Lactokit mostrará el texto correspondiente según la valoración calculada por el sistema:',
            ],
            items: [
              'Valoración 1: Se debe repetir la prueba por mala práctica en la recogida de las muestras de aliento.',
              'Valoración 2: Resultado compatible con malabsorción de lactosa con elevación de hidrógeno. Si el paciente reporta síntomas, entonces se estaría frente a una intolerancia a la lactosa.',
              'Valoración 3: Resultado compatible con malabsorción de lactosa con elevación de metano. Si el paciente reporta síntomas, entonces se estaría frente a una intolerancia a la lactosa.',
              'Valoración 4: Resultado compatible con malabsorción de lactosa con elevación de hidrógeno y metano. Si el paciente reporta síntomas, entonces se estaría frente a una intolerancia a la lactosa.',
              'Valoración 5: Resultado no compatible con malabsorción de lactosa.',
              'Valoración 6: Se muestra la valoración clínica correspondiente y se agrega una advertencia indicando que, debido a que varias muestras contenían CO2 menor a 1,4%, se sugiere repetir la prueba.',
            ],
          },
          {
            titulo: '2.5 Contenido del informe Lactokit',
            parrafos: ['El informe Lactokit incluye:'],
            items: [
              'Cabecera con datos del paciente.',
              'Gráfico de evolución de H2 y CH4 en los ocho frascos.',
              'Tabla con los valores cargados para cada gas y frasco.',
              'Valoración de la prueba.',
              'Texto descriptivo de la valoración calculada.',
              'Valores de referencia.',
              'Notas del estudio.',
            ],
            parrafosPost: [
              'La tabla y el gráfico muestran los valores reales cargados para los ocho frascos.',
              'La exclusión de frascos inválidos por CO2 menor a 1,4% afecta únicamente al cálculo de la valoración, pero no modifica los valores visibles en la tabla ni en el gráfico del informe.',
            ],
            contenido: [
              {
                tipo: 'imagen',
                src: '/docs/informe-lactokit.png',
                alt: 'Informe Lactokit',
                caption:
                  '**Figura 3. Informe Lactokit.** Ejemplo del informe generado para una muestra Lactokit, con gráfico, tabla de resultados, valoración de la prueba y valores de referencia.',
              },
            ],
          },
        ],
      },
      {
        id: 'envio-verificacion',
        titulo: '3. Envío y verificación de informes',
        parrafos: [
          'Cada vez que se genera un informe, el sistema realiza los envíos correspondientes y verifica el resultado del proceso.',
          'Cuando el envío y la verificación finalizan correctamente, se muestra un mensaje de confirmación.',
          'Si ocurre un inconveniente durante el envío o la verificación, el sistema muestra un mensaje de error con el detalle disponible para que el usuario pueda revisarlo y volver a intentar la operación.',
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'El informe también se envía por correo electrónico como respaldo, para que BACON pueda consultarlo en caso de que exista algún inconveniente con el envío principal.',
          },
        ],
      },
      {
        id: 'consulta-pdf',
        titulo: '4. Consulta y descarga de informes',
        parrafos: [
          'Cuando una muestra se encuentra en estado Completado, se habilita la acción **Ver PDF** desde la tabla de Muestras.',
          'Esta acción permite abrir o descargar el informe generado.',
          'Las acciones disponibles pueden variar según el estado de la muestra y el rol del usuario.',
        ],
      },
    ],
    faqsTitulo: 'Preguntas frecuentes',
    faqs: [
      {
        pregunta: '¿Cuándo se genera un informe?',
        respuesta:
          'El informe se genera al completar una muestra o cuando el sistema debe informar una situación específica, como la anulación de una muestra Taukit o una valoración inválida en Lactokit.',
      },
      {
        pregunta: '¿Quién puede completar una muestra y generar el informe?',
        respuesta:
          'La acción de completar una muestra está disponible para usuarios con rol Bioquímico o Administrador.',
      },
      {
        pregunta: '¿Dónde puedo ver el informe generado?',
        respuesta:
          'Desde la sección Muestras, utilizando la acción **Ver PDF** disponible para muestras completadas.',
      },
      {
        pregunta: '¿Qué pasa si el informe no se envía correctamente?',
        respuesta:
          'El sistema muestra un mensaje de error con el detalle disponible para que pueda revisarse y volver a intentar la operación.',
      },
      {
        pregunta: '¿El informe se envía solamente a BACON?',
        respuesta:
          'No. Además del envío a BACON, se envía una copia de respaldo por correo electrónico a la cuenta definida para este proceso.',
      },
    ],
  },

  {
    id: 'operacion',
    label: 'Operación',
    titulo: 'Operación',
    descripcion:
      'La sección Operación reúne herramientas administrativas y correctivas sobre muestras ya ingresadas en el sistema. No forma parte del circuito habitual de trabajo (Ingreso por scanner, Carga de resultados y Validación), sino que se utiliza para resolver errores, corregir datos y comunicarse con BACON cuando sea necesario. El acceso está disponible únicamente para usuarios con rol Administrador.',
    parrafosPrevios: [
      'Desde este módulo se pueden realizar acciones sensibles, por lo que todas las operaciones quedan registradas para auditoría.',
    ],
    infosPosteriores: [
      {
        tipo: 'importante',
        texto:
          'Las acciones realizadas desde Operación pueden modificar información ya registrada en el sistema. Por este motivo, deben utilizarse únicamente en casos correctivos y siempre indicando el motivo correspondiente.',
      },
    ],
    imagen: '/docs/operacion.png',
    imagenAlt: 'Pantalla principal de Operación',
    imagenCaption:
      '**Figura 1. Pantalla principal de Operación.** Los números identifican las herramientas administrativas disponibles para usuarios con rol Administrador.',
    bloques: [
      {
        id: 'protocolos-editados',
        titulo: '1. Protocolos editados',
        parrafos: [
          'El bloque Protocolos editados muestra un resumen de las correcciones realizadas desde esta sección.',
          'Cada corrección queda registrada con información de auditoría, incluyendo:',
        ],
        items: [
          'Protocolo.',
          'Número de serie.',
          'Tipo de estudio.',
          'Fecha de ingreso.',
          'Fecha de edición.',
          'Campos modificados.',
          'Motivo de la corrección.',
          'Usuario responsable.',
        ],
        parrafosPost: [
          'Este bloque permite controlar la trazabilidad de los cambios realizados sobre las muestras.',
        ],
      },
      {
        id: 'exportar-historial',
        titulo: '2. Exportar historial',
        parrafos: [
          'La acción **Exportar Excel** permite descargar el historial completo de ediciones realizadas desde Operación.',
          'El archivo exportado incluye el detalle de las correcciones registradas, permitiendo revisar o compartir la trazabilidad de los cambios realizados.',
        ],
        imagen: '/docs/operacion-exportar.png',
        imagenAlt: 'Exportación del historial de protocolos editados',
        imagenCaption:
          '**Figura 2. Exportación del historial de protocolos editados.** El archivo descargado permite consultar las correcciones realizadas, junto con el motivo y el usuario responsable.',
      },
      {
        id: 'buscar-muestra',
        titulo: '3. Buscador de muestra',
        contenido: [
          { tipo: 'parrafo', texto: 'El buscador permite localizar una muestra utilizando:' },
          { tipo: 'lista', items: ['Número de serie.', 'Protocolo.'] },
          {
            tipo: 'parrafo',
            texto: 'Al encontrar una muestra, el sistema muestra una ficha con los principales datos:',
          },
          { tipo: 'lista', items: ['Serie.', 'Tipo de estudio.', 'Protocolo.', 'Estado.'] },
          {
            tipo: 'parrafo',
            texto:
              'La muestra seleccionada será utilizada por las acciones de Eliminar número de serie, Corregir paciente y Contacto BACON.',
          },
          {
            tipo: 'parrafo',
            texto: 'Si no hay una muestra seleccionada, las acciones correctivas permanecen deshabilitadas.',
          },
        ],
        imagen: '/docs/operacion-buscador.png',
        imagenAlt: 'Buscador de muestra',
        imagenCaption:
          '**Figura 3. Buscador de muestra.** Permite localizar una muestra por número de serie o protocolo antes de realizar una acción correctiva.',
      },
      {
        id: 'eliminar-serie',
        titulo: '4. Eliminar número de serie',
        parrafos: [
          'La acción Eliminar número de serie permite dar de baja una muestra del sistema cuando fue cargada por error o no corresponde al circuito operativo.',
          'Esta acción requiere:',
        ],
        items: [
          'Tener una muestra seleccionada.',
          'Ingresar un motivo obligatorio.',
          'Confirmar la operación en dos pasos.',
        ],
        parrafosPost: [
          'El botón solicita primero una confirmación y recién en el segundo paso ejecuta la acción.',
          'Luego de eliminar o dar de baja el número de serie, la acción queda registrada en auditoría.',
        ],
        infos: [
          {
            tipo: 'advertencia',
            texto:
              'Esta acción es sensible y debe utilizarse únicamente cuando el número de serie fue cargado por error o no corresponde. Antes de confirmar, verificá que la muestra seleccionada sea la correcta.',
          },
        ],
        imagen: '/docs/operacion-eliminar.png',
        imagenAlt: 'Eliminación de número de serie',
        imagenCaption:
          '**Figura 4. Eliminación de número de serie.** La acción requiere motivo obligatorio y confirmación en dos pasos para evitar bajas accidentales.',
      },
      {
        id: 'corregir-paciente',
        titulo: '5. Corregir paciente',
        contenido: [
          {
            tipo: 'parrafo',
            texto:
              'La herramienta Corregir paciente permite modificar los datos del paciente asociados a una muestra seleccionada.',
          },
          { tipo: 'parrafo', texto: 'Los campos que pueden corregirse son:' },
          { tipo: 'lista', items: ['Nombre.', 'Apellido.', 'DNI.'] },
          { tipo: 'parrafo', texto: 'Para guardar una corrección se debe indicar un motivo.' },
          { tipo: 'parrafo', texto: 'Los motivos disponibles son:' },
          {
            tipo: 'lista',
            items: ['No corresponden al número de serie.', 'Error de tipeo.', 'Otro.'],
          },
          { tipo: 'parrafo', texto: 'Cuando se selecciona Otro, se debe ingresar un detalle adicional.' },
          {
            tipo: 'parrafo',
            texto: 'Toda corrección queda registrada en la auditoría de protocolos editados.',
          },
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'Después de corregir los datos del paciente, se recomienda utilizar la herramienta Contacto BACON para informar el cambio realizado.',
          },
        ],
        imagen: '/docs/operacion-corregir.png',
        imagenAlt: 'Corrección de datos del paciente',
        imagenCaption:
          '**Figura 5. Corrección de datos del paciente.** Permite modificar nombre, apellido o DNI de la muestra seleccionada, registrando siempre el motivo y el usuario responsable.',
      },
      {
        id: 'contacto-bacon',
        titulo: '6. Contacto BACON',
        parrafos: [
          'La herramienta Contacto BACON permite redactar y enviar un correo a BACON desde la plataforma.',
          'El destinatario se encuentra configurado por sistema, por lo que el usuario solo debe completar o revisar el asunto, el mensaje y los adjuntos correspondientes.',
          'El módulo cuenta con plantillas predeterminadas según el caso:',
        ],
        items: [
          'Aviso de corrección sin informe: se utiliza cuando el error se detectó antes de generar el informe.',
          'Aviso de corrección con informe enviado: se utiliza cuando el informe ya fue completado y enviado.',
        ],
        parrafosPost: [
          'En el caso de corrección con informe enviado, el sistema adjunta automáticamente el PDF corregido de la muestra.',
          'También se pueden agregar adjuntos manuales cuando sea necesario.',
        ],
        imagen: '/docs/operacion-contacto-bacon.png',
        imagenAlt: 'Contacto BACON',
        imagenCaption:
          '**Figura 6. Contacto BACON.** Permite enviar correos a BACON utilizando plantillas predefinidas, con posibilidad de adjuntar archivos manualmente o incluir el informe corregido.',
      },
      {
        id: 'auditoria',
        titulo: '7. Auditoría de acciones',
        parrafos: [
          'Todas las acciones realizadas desde la sección Operación quedan registradas para trazabilidad.',
          'Se auditan, entre otras:',
        ],
        items: [
          'Correcciones de datos del paciente.',
          'Eliminación o baja de números de serie.',
          'Motivos ingresados por el usuario.',
          'Usuario responsable.',
          'Fecha y hora de la acción.',
          'Campos modificados.',
          'Contactos enviados a BACON.',
        ],
        parrafosPost: [
          'La auditoría permite reconstruir qué cambio se realizó, cuándo, por quién y por qué motivo.',
        ],
      },
      {
        id: 'buenas-practicas',
        titulo: 'Buenas prácticas',
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Antes de realizar una corrección o baja, buscá la muestra y verificá cuidadosamente el protocolo, número de serie, tipo de estudio y estado.',
          },
          {
            tipo: 'importante',
            texto:
              'Toda modificación realizada desde Operación debe tener un motivo claro, ya que quedará registrada en la auditoría.',
          },
        ],
      },
    ],
    faqsTitulo: 'Preguntas frecuentes',
    faqs: [
      {
        pregunta: '¿Quién puede acceder a Operación?',
        respuesta: 'Solo los usuarios con rol Administrador pueden acceder a esta sección.',
      },
      {
        pregunta: '¿Qué pasa si no tengo permisos?',
        respuesta:
          'No podrás ver la sección Operación en el menú principal. Si necesitás acceso, consultá con un administrador.',
      },
      {
        pregunta: '¿Para qué sirve el buscador de muestra?',
        respuesta:
          'Sirve para seleccionar la muestra sobre la que se aplicarán las acciones correctivas, como eliminar un número de serie, corregir datos del paciente o contactar a BACON.',
      },
      {
        pregunta: '¿Puedo corregir una muestra sin motivo?',
        respuesta:
          'No. Toda corrección requiere indicar un motivo para que la acción quede correctamente auditada.',
      },
      {
        pregunta: '¿Cuándo debo usar Contacto BACON?',
        respuesta:
          'Se utiliza cuando es necesario informar a BACON una corrección realizada sobre una muestra, especialmente si se modificaron datos del paciente o si ya existía un informe enviado.',
      },
      {
        pregunta: '¿El destinatario del mail puede modificarse?',
        respuesta:
          'No. El destinatario se encuentra configurado por sistema para evitar errores de envío.',
      },
      {
        pregunta: '¿Las acciones quedan registradas?',
        respuesta:
          'Sí. Las correcciones, bajas y contactos enviados quedan registrados para auditoría.',
      },
    ],
  },

  {
    id: 'configuracion',
    label: 'Configuración',
    titulo: 'Configuración',
    descripcion:
      'Desde esta sección se administran las credenciales personales y, en el caso de los usuarios administradores, la configuración de las cuentas que tienen acceso a la plataforma. Las opciones disponibles dependen del rol: todos los usuarios pueden modificar su propia contraseña, mientras que solo los administradores pueden crear, editar o eliminar usuarios y cambiar la contraseña de otras cuentas.',
    imagen: '/docs/configuracion.png',
    imagenAlt: 'Pantalla principal de Configuración',
    imagenCaption:
      '**Figura 1. Pantalla principal de Configuración.** Las opciones visibles dependen del rol del usuario. Los administradores tienen acceso a las herramientas de gestión de usuarios y contraseñas.',
    bloques: [
      {
        id: 'acceso-permisos',
        titulo: 'Acceso y permisos',
        parrafos: ['La pestaña Mi contraseña está disponible para todos los roles del sistema:'],
        items: ['Técnico.', 'Bioquímico.', 'Administrador.'],
        parrafosPost: [
          'Las pestañas Usuarios y Cambiar contraseñas están disponibles únicamente para usuarios con rol Administrador.',
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'Si una opción administrativa no se encuentra visible, significa que el usuario no posee los permisos necesarios para utilizarla.',
          },
        ],
      },
      {
        id: 'mi-contrasena',
        titulo: '1. Mi contraseña',
        parrafos: [
          'Esta pestaña permite que cada usuario modifique su propia contraseña de acceso.',
          'Para realizar el cambio, se deben completar los campos solicitados y definir una nueva contraseña que cumpla con las reglas de seguridad indicadas en pantalla.',
          'Las reglas pueden contemplar requisitos como:',
        ],
        items: [
          'Longitud mínima.',
          'Uso de letras mayúsculas.',
          'Inclusión de números.',
          'Confirmación de la nueva contraseña.',
        ],
        parrafosPost: [
          'Una vez guardado el cambio, la nueva contraseña deberá utilizarse en los siguientes inicios de sesión.',
        ],
        subsecciones: [
          {
            titulo: 'Vencimiento de la contraseña',
            parrafos: ['La contraseña puede requerir un cambio obligatorio en los siguientes casos:'],
            items: [
              'Pasaron 90 días desde la última modificación.',
              'Un administrador restableció la contraseña de la cuenta.',
              'La cuenta todavía no posee una fecha de cambio de contraseña registrada.',
            ],
            parrafosPost: [
              'Cuando esto ocurre, luego de iniciar sesión la plataforma solicita definir una nueva contraseña antes de permitir el acceso al resto de las secciones.',
              'Una vez realizado el cambio, se inicia nuevamente el período de vigencia de 90 días.',
            ],
          },
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/configuracion-mi-contrasena.png',
            alt: 'Cambio de contraseña personal',
            caption:
              '**Figura 2. Cambio de contraseña personal.** Cada usuario puede actualizar su propia contraseña respetando las reglas de seguridad indicadas por el sistema.',
          },
        ],
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Utilizá una contraseña que no hayas empleado anteriormente y evitá compartirla con otros usuarios.',
          },
        ],
      },
      {
        id: 'usuarios',
        titulo: '2. Usuarios',
        parrafos: [
          'Esta pestaña está disponible únicamente para administradores y permite gestionar las cuentas habilitadas en la plataforma.',
          'Desde esta sección se puede:',
        ],
        items: [
          'Consultar el listado de usuarios.',
          'Crear nuevos usuarios.',
          'Modificar usuarios existentes.',
          'Cambiar el rol asignado.',
          'Activar o desactivar una cuenta.',
          'Eliminar usuarios.',
        ],
      },
      {
        id: 'crear-usuario',
        titulo: '3. Crear usuario',
        contenido: [
          {
            tipo: 'parrafo',
            texto: 'Para crear una cuenta se deben completar los datos solicitados, entre ellos:',
          },
          {
            tipo: 'lista',
            items: [
              'Nombre de usuario.',
              'Correo electrónico.',
              'Nombre.',
              'Rol.',
              'Estado.',
              'Contraseña inicial.',
            ],
          },
          { tipo: 'parrafo', texto: 'Los roles disponibles son:' },
          { tipo: 'lista', items: ['Técnico.', 'Bioquímico.', 'Administrador.'] },
          {
            tipo: 'parrafo',
            texto: 'Una vez creada la cuenta, el usuario podrá ingresar a la plataforma con las credenciales asignadas.',
          },
          {
            tipo: 'imagen',
            src: '/docs/configuracion-crear-usuario.png',
            alt: 'Creación de un usuario',
            caption:
              '**Figura 3. Creación de un usuario.** El administrador debe completar los datos de la cuenta, asignar el rol correspondiente y definir su estado inicial.',
          },
        ],
      },
      {
        id: 'editar-usuario',
        titulo: '4. Editar usuario',
        parrafos: [
          'Los datos de una cuenta existente pueden modificarse desde el listado de usuarios.',
          'Según los campos disponibles, el administrador puede actualizar información como:',
        ],
        items: ['Nombre.', 'Correo electrónico.', 'Rol.', 'Estado activo o inactivo.'],
        parrafosPost: [
          'Los permisos del usuario se actualizan de acuerdo con el rol seleccionado.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/configuracion-editar-usuario.png',
            alt: 'Edición de usuarios',
            caption:
              '**Figura 4. Edición de usuarios.** Desde el listado se pueden modificar los datos, el rol y el estado de cada cuenta.',
          },
        ],
      },
      {
        id: 'activar-desactivar',
        titulo: '5. Activar o desactivar usuarios',
        parrafos: [
          'Una cuenta activa puede ingresar normalmente a la plataforma.',
          'Al desactivar una cuenta, el usuario deja de tener acceso al sistema sin necesidad de eliminar su registro.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/configuracion-activar-desactivar.png',
            alt: 'Activación y desactivación de usuarios',
            caption:
              '**Figura 5. Activación y desactivación de usuarios.** Desde el listado de usuarios, el administrador puede modificar el estado de una cuenta. Al desactivarla, el usuario deja de tener acceso a la plataforma, pero su registro permanece almacenado en el sistema.',
          },
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'Antes de desactivar o eliminar una cuenta, verificá que el usuario seleccionado sea el correcto.',
          },
        ],
      },
      {
        id: 'eliminar-usuario',
        titulo: '6. Eliminar usuario',
        parrafos: [
          'La acción de eliminación permite quitar una cuenta del sistema cuando ya no debe conservar acceso.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/configuracion-eliminar-usuario.png',
            alt: 'Eliminación de usuarios',
            caption:
              '**Figura 6. Eliminación de usuarios.** La acción **Eliminar** permite quitar una cuenta de la plataforma. Antes de confirmar, se recomienda verificar que el usuario seleccionado sea el correcto y evaluar si corresponde desactivarlo en lugar de eliminarlo.',
          },
        ],
        infos: [
          {
            tipo: 'advertencia',
            texto:
              'La eliminación de usuarios debe utilizarse con precaución. Cuando corresponda conservar el registro de la cuenta, se recomienda evaluar primero su desactivación.',
          },
        ],
      },
      {
        id: 'cambiar-contrasenas',
        titulo: '7. Cambiar contraseñas',
        parrafos: [
          'Esta pestaña permite que un administrador restablezca la contraseña de otro usuario.',
          'Se utiliza cuando una persona:',
        ],
        items: [
          'Olvidó su contraseña.',
          'No puede ingresar a la plataforma.',
          'Necesita recibir una nueva contraseña temporal.',
          'Requiere un restablecimiento por motivos de seguridad.',
        ],
        parrafosPost: [
          'Para realizar el cambio, el administrador debe seleccionar el usuario correspondiente e ingresar la nueva contraseña según las reglas de seguridad del sistema.',
        ],
        contenido: [
          {
            tipo: 'imagen',
            src: '/docs/configuracion-cambiar-contrasena.png',
            alt: 'Restablecimiento de contraseña',
            caption:
              '**Figura 7. Restablecimiento de contraseña.** El administrador puede asignar una nueva contraseña a una cuenta cuando el usuario no puede modificarla por sus propios medios.',
          },
        ],
        infos: [
          {
            tipo: 'importante',
            texto:
              'Antes de restablecer una contraseña, verificá cuidadosamente la identidad y el nombre de usuario de la cuenta seleccionada.',
          },
        ],
      },
      {
        id: 'buenas-practicas',
        titulo: 'Buenas prácticas',
        infos: [
          {
            tipo: 'consejo',
            texto:
              'Asigná a cada persona el rol mínimo necesario para realizar sus tareas dentro de la plataforma.',
          },
          {
            tipo: 'importante',
            texto:
              'Cada usuario debe contar con una cuenta individual. No se recomienda compartir credenciales entre distintas personas.',
          },
          {
            tipo: 'advertencia',
            texto:
              'El rol Administrador permite acceder a funciones sensibles, como Operación y gestión de usuarios. Debe asignarse únicamente a personas autorizadas.',
          },
        ],
      },
    ],
    faqsTitulo: 'Preguntas frecuentes',
    faqs: [
      {
        pregunta: '¿Quién puede modificar su propia contraseña?',
        respuesta: 'Todos los usuarios pueden cambiar su contraseña desde la pestaña Mi contraseña.',
      },
      {
        pregunta: '¿Quién puede crear usuarios?',
        respuesta: 'Únicamente los usuarios con rol Administrador.',
      },
      {
        pregunta: '¿Qué diferencia existe entre desactivar y eliminar un usuario?',
        respuesta:
          'Desactivar una cuenta impide temporalmente su acceso, pero conserva el registro. Eliminarla quita la cuenta del sistema.',
      },
      {
        pregunta: '¿Puedo cambiar el rol de un usuario?',
        respuesta: 'Sí. Los administradores pueden modificar el rol desde la pestaña Usuarios.',
      },
      {
        pregunta: '¿Qué hago si olvidé mi contraseña?',
        respuesta:
          'Debés solicitarle a un administrador que la restablezca desde la pestaña Cambiar contraseñas.',
      },
      {
        pregunta: '¿Por qué no veo las pestañas Usuarios o Cambiar contraseñas?',
        respuesta: 'Estas opciones son exclusivas para usuarios con rol Administrador.',
      },
    ],
  },
];
