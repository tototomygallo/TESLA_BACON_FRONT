import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  SECCIONES_DOC,
  type BloqueInfo,
  type ContenidoItem,
  type PasoFlujo,
  type SeccionDoc,
} from '../data/asistenciaDocs';

// ============================================
// Asistencia y documentación (base de conocimiento integrada)
// ============================================
// Documentación estática con menú lateral, buscador, contenido central e
// índice lateral derecho. No conecta con backend en esta etapa.

interface ResultadoBusqueda {
  seccionId: string;
  seccionLabel: string;
  ancla: string;
  titulo: string;
}

function buscar(q: string): ResultadoBusqueda[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const resultados: ResultadoBusqueda[] = [];

  for (const seccion of SECCIONES_DOC) {
    for (const bloque of seccion.bloques) {
      const texto = [
        bloque.titulo,
        ...(bloque.parrafos ?? []),
        ...(bloque.items ?? []),
        ...(bloque.infos?.map((i) => i.texto) ?? []),
      ]
        .join(' ')
        .toLowerCase();
      if (texto.includes(query)) {
        resultados.push({
          seccionId: seccion.id,
          seccionLabel: seccion.label,
          ancla: bloque.id,
          titulo: bloque.titulo,
        });
      }
    }
    for (const faq of seccion.faqs ?? []) {
      if (`${faq.pregunta} ${faq.respuesta}`.toLowerCase().includes(query)) {
        resultados.push({
          seccionId: seccion.id,
          seccionLabel: seccion.label,
          ancla: 'faqs',
          titulo: faq.pregunta,
        });
      }
    }
  }
  return resultados.slice(0, 12);
}

export function AsistenciaPage() {
  const [seccionId, setSeccionId] = useState(SECCIONES_DOC[0].id);
  const [query, setQuery] = useState('');
  const [anclaPendiente, setAnclaPendiente] = useState<string | null>(null);

  const seccion =
    SECCIONES_DOC.find((s) => s.id === seccionId) ?? SECCIONES_DOC[0];
  const resultados = useMemo(() => buscar(query), [query]);

  // Al cambiar de sección, subimos al inicio (o al ancla pendiente si venís
  // de un resultado de búsqueda).
  useEffect(() => {
    if (anclaPendiente) {
      const el = document.getElementById(anclaPendiente);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setAnclaPendiente(null);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [seccionId, anclaPendiente]);

  const scrollA = (ancla: string) => {
    document.getElementById(ancla)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const irASeccion = (id: string, ancla?: string) => {
    if (id !== seccionId) {
      setSeccionId(id);
      if (ancla) setAnclaPendiente(ancla);
    } else if (ancla) {
      scrollA(ancla);
    }
  };

  const irAResultado = (r: ResultadoBusqueda) => {
    irASeccion(r.seccionId, r.ancla);
    setQuery('');
  };

  return (
    <div className="mx-[calc(50%-50vw)] px-4 lg:px-8 space-y-6">
      {/* Buscador superior */}
      <div className="relative max-w-3xl">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en la documentación…"
          className="w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}

        {query.trim().length >= 2 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {resultados.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">
                No se encontraron resultados para “{query}”.
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {resultados.map((r, i) => (
                  <li key={`${r.seccionId}-${r.ancla}-${i}`}>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        irAResultado(r);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                        {r.seccionLabel}
                      </div>
                      <div className="text-sm text-slate-800">{r.titulo}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selector de sección para mobile */}
      <div className="lg:hidden">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Sección
        </label>
        <select
          value={seccionId}
          onChange={(e) => irASeccion(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          {SECCIONES_DOC.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-8">
        {/* Menú lateral izquierdo */}
        <aside className="hidden lg:block w-56 flex-shrink-0 self-start lg:sticky lg:top-24">
          <div className="px-1 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Asistencia y documentación
          </div>
          <nav className="space-y-0.5">
            {SECCIONES_DOC.map((s) => {
              const activo = s.id === seccionId;
              return (
                <button
                  key={s.id}
                  onClick={() => irASeccion(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activo
                      ? 'bg-violet-50 text-violet-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Área central de contenido */}
        <main className="min-w-0 flex-1 max-w-3xl">
          <ContenidoSeccion seccion={seccion} onNavegar={(id) => irASeccion(id)} />
        </main>

        {/* Índice lateral derecho */}
        <aside className="hidden xl:block w-56 flex-shrink-0 self-start xl:sticky xl:top-24">
          <div className="px-1 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            En esta página
          </div>
          <nav className="space-y-0.5 border-l border-slate-200">
            {seccion.bloques.map((b) => (
              <button
                key={b.id}
                onClick={() => scrollA(b.id)}
                className="block w-full text-left -ml-px border-l-2 border-transparent pl-3 py-1 text-xs text-slate-500 hover:border-violet-400 hover:text-violet-700 transition-colors"
              >
                {b.titulo}
              </button>
            ))}
            {seccion.faqs && seccion.faqs.length > 0 && (
              <button
                onClick={() => scrollA('faqs')}
                className="block w-full text-left -ml-px border-l-2 border-transparent pl-3 py-1 text-xs text-slate-500 hover:border-violet-400 hover:text-violet-700 transition-colors"
              >
                {seccion.faqsTitulo ?? 'Preguntas frecuentes'}
              </button>
            )}
          </nav>
        </aside>
      </div>
    </div>
  );
}

// ============================================
// Contenido de una sección
// ============================================
function ContenidoSeccion({
  seccion,
  onNavegar,
}: {
  seccion: SeccionDoc;
  onNavegar: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500">
          <span className="text-slate-400">Asistencia</span>
          <span className="mx-1.5 text-slate-300">›</span>
          <span className="font-medium text-slate-700">{seccion.label}</span>
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          {seccion.titulo}
        </h1>
        <p className="text-slate-600">{seccion.descripcion}</p>
        {seccion.intro && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-blue-900">
              <span aria-hidden>📌</span>
              {seccion.intro.titulo}
            </div>
            <p className="text-sm leading-relaxed text-blue-900/90">
              {seccion.intro.texto}
            </p>
          </div>
        )}
        {seccion.parrafosPrevios?.map((p, i) => (
          <p key={i} className="text-sm text-slate-600 leading-relaxed">
            {p}
          </p>
        ))}
        {seccion.infosPrevias?.map((info, i) => (
          <BloqueInfoCard key={i} info={info} />
        ))}
        {seccion.imagen ? (
          <figure className="space-y-2">
            <ImagenSeccion src={seccion.imagen} alt={seccion.imagenAlt ?? seccion.titulo} />
            {seccion.imagenCaption && (
              <figcaption className="text-xs text-slate-500 italic">
                {conNegrita(seccion.imagenCaption)}
              </figcaption>
            )}
          </figure>
        ) : (
          !seccion.sinPlaceholder && <PlaceholderImagen />
        )}
        {seccion.infosPosteriores?.map((info, i) => (
          <BloqueInfoCard key={i} info={info} />
        ))}
      </div>

      {seccion.bloques.map((bloque) => (
        <section key={bloque.id} id={bloque.id} className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            {bloque.titulo}
          </h2>
          {bloque.parrafos?.map((p, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed">
              {conNegrita(p)}
            </p>
          ))}
          {bloque.imagenParrafo && (
            <figure className="space-y-2">
              <ImagenSeccion
                src={bloque.imagenParrafo}
                alt={bloque.imagenParrafoAlt ?? bloque.titulo}
                tamano="chica"
              />
              {bloque.imagenParrafoCaption && (
                <figcaption className="text-xs italic text-slate-500">
                  {conNegrita(bloque.imagenParrafoCaption)}
                </figcaption>
              )}
            </figure>
          )}
          {bloque.items && (
            <ul className="space-y-1.5">
              {bloque.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-violet-400 mt-0.5">·</span>
                  <span>{conNegrita(item)}</span>
                </li>
              ))}
            </ul>
          )}
          {bloque.parrafosPost?.map((p, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed">
              {conNegrita(p)}
            </p>
          ))}
          {bloque.subsecciones?.map((sub, i) => (
            <div key={i} className="space-y-2 pt-1">
              <h3 className="text-sm font-semibold text-slate-800">{sub.titulo}</h3>
              {sub.parrafos?.map((p, j) => (
                <p key={j} className="text-sm text-slate-600 leading-relaxed">
                  {conNegrita(p)}
                </p>
              ))}
              {sub.items && (
                <ul className="space-y-1.5">
                  {sub.items.map((item, j) => (
                    <li key={j} className="flex gap-2 text-sm text-slate-600">
                      <span className="text-violet-400 mt-0.5">·</span>
                      <span>{conNegrita(item)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {sub.parrafosPost?.map((p, j) => (
                <p key={j} className="text-sm text-slate-600 leading-relaxed">
                  {conNegrita(p)}
                </p>
              ))}
              {sub.imagen && (
                <figure className="space-y-2">
                  <ImagenSeccion src={sub.imagen} alt={sub.imagenAlt ?? sub.titulo} />
                  {sub.imagenCaption && (
                    <figcaption className="text-xs italic text-slate-500">
                      {conNegrita(sub.imagenCaption)}
                    </figcaption>
                  )}
                </figure>
              )}
              {sub.contenido && (
                <ContenidoBloques items={sub.contenido} onNavegar={onNavegar} />
              )}
            </div>
          ))}
          {bloque.contenido && (
            <ContenidoBloques items={bloque.contenido} onNavegar={onNavegar} />
          )}
          {bloque.casos?.map((caso, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{caso.texto}</p>
              {caso.imagen && (
                <figure className="space-y-2">
                  <ImagenSeccion src={caso.imagen} alt={caso.imagenAlt ?? caso.texto} />
                  {caso.imagenCaption && (
                    <figcaption className="text-xs italic text-slate-500">
                      {conNegrita(caso.imagenCaption)}
                    </figcaption>
                  )}
                </figure>
              )}
            </div>
          ))}
          {bloque.flujo && <DiagramaFlujo pasos={bloque.flujo} />}
          {bloque.infos?.map((info, i) => (
            <div key={i} className="space-y-3">
              <BloqueInfoCard info={info} />
              {info.imagen && (
                <figure className="space-y-2">
                  <ImagenSeccion src={info.imagen} alt={info.imagenAlt ?? info.texto} />
                  {info.imagenCaption && (
                    <figcaption className="text-xs italic text-slate-500">
                      {conNegrita(info.imagenCaption)}
                    </figcaption>
                  )}
                </figure>
              )}
            </div>
          ))}
          {bloque.parrafosFinal?.map((p, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed">
              {conNegrita(p)}
            </p>
          ))}
          {bloque.imagen && (
            <figure className="space-y-2">
              <ImagenSeccion
                src={bloque.imagen}
                alt={bloque.imagenAlt ?? bloque.titulo}
              />
              {bloque.imagenCaption && (
                <figcaption className="text-xs italic text-slate-500">
                  {conNegrita(bloque.imagenCaption)}
                </figcaption>
              )}
            </figure>
          )}
        </section>
      ))}

      {seccion.faqs && seccion.faqs.length > 0 && (
        <section id="faqs" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            {seccion.faqsTitulo ?? 'Preguntas frecuentes'}
          </h2>
          <div className="space-y-2">
            {seccion.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-800 list-none">
                  {faq.pregunta}
                  <span className="text-slate-400 transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {conNegrita(faq.respuesta)}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================
// Bloques informativos reutilizables
// ============================================
const ESTILOS_INFO: Record<
  BloqueInfo['tipo'],
  { border: string; bg: string; text: string; icono: string; label: string }
> = {
  importante: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    icono: 'ℹ️',
    label: 'Importante',
  },
  consejo: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    icono: '💡',
    label: 'Consejo',
  },
  advertencia: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    icono: '⚠️',
    label: 'Advertencia',
  },
  error: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-800',
    icono: '⛔',
    label: 'Error frecuente',
  },
};

// Convierte los fragmentos **texto** de un string plano en <strong>.
function conNegrita(texto: string): ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) =>
    parte.length > 4 && parte.startsWith('**') && parte.endsWith('**') ? (
      <strong key={i} className="font-semibold text-slate-800">
        {parte.slice(2, -2)}
      </strong>
    ) : (
      parte
    ),
  );
}

// Contenido flexible: renderiza en orden párrafos, subtítulos, listas,
// imágenes (con epígrafe) y enlaces a otra sección de la documentación.
function ContenidoBloques({
  items,
  onNavegar,
}: {
  items: ContenidoItem[];
  onNavegar: (id: string) => void;
}) {
  return (
    <>
      {items.map((item, i) => {
        switch (item.tipo) {
          case 'parrafo':
            return (
              <p key={i} className="text-sm text-slate-600 leading-relaxed">
                {conNegrita(item.texto)}
              </p>
            );
          case 'subtitulo':
            return (
              <h4 key={i} className="pt-1 text-sm font-semibold text-slate-800">
                {conNegrita(item.texto)}
              </h4>
            );
          case 'lista':
            return (
              <ul key={i} className="space-y-1.5">
                {item.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-violet-400 mt-0.5">·</span>
                    <span>{conNegrita(it)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'imagen':
            return (
              <figure key={i} className="space-y-2">
                <ImagenSeccion src={item.src} alt={item.alt ?? ''} tamano={item.tamano} />
                {item.caption && (
                  <figcaption className="text-xs italic text-slate-500">
                    {conNegrita(item.caption)}
                  </figcaption>
                )}
              </figure>
            );
          case 'link':
            return (
              <p key={i} className="text-sm text-slate-600 leading-relaxed">
                {item.antes}
                <button
                  onClick={() => onNavegar(item.seccion)}
                  className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900"
                >
                  {item.texto}
                </button>
                {item.despues}
              </p>
            );
        }
      })}
    </>
  );
}

// Diagrama de flujo vertical con estilo Tesla (azules, blancos, líneas suaves).
function DiagramaFlujo({ pasos }: { pasos: PasoFlujo[] }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white px-4 py-6">
      {pasos.map((paso, i) => (
        <div key={i} className="flex w-full max-w-xs flex-col items-center">
          <div className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(37,99,235,0.06)]">
            {paso.icono && (
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg" aria-hidden>
                {paso.icono}
              </span>
            )}
            <span className="text-sm font-medium text-slate-800">{paso.texto}</span>
          </div>
          {i < pasos.length - 1 && (
            <div className="flex flex-col items-center py-1 text-blue-300" aria-hidden>
              <span className="h-4 w-px bg-blue-200" />
              <span className="-mt-1.5 text-xs leading-none">▼</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BloqueInfoCard({ info }: { info: BloqueInfo }) {
  const e = ESTILOS_INFO[info.tipo];
  return (
    <div className={`rounded-xl border ${e.border} ${e.bg} px-4 py-3`}>
      <div className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${e.text}`}>
        <span aria-hidden>{e.icono}</span>
        {e.label}
      </div>
      <div className={`text-sm ${e.text}`}>{conNegrita(info.texto)}</div>
    </div>
  );
}

// Imagen real de la sección. Si el archivo todavía no está en /public/docs,
// hace fallback al placeholder para no mostrar una imagen rota.
function ImagenSeccion({
  src,
  alt,
  tamano,
}: {
  src: string;
  alt: string;
  tamano?: 'chica' | 'media';
}) {
  const [error, setError] = useState(false);
  const [ampliada, setAmpliada] = useState(false);

  // Cerrar el modal con Escape.
  useEffect(() => {
    if (!ampliada) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAmpliada(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ampliada]);

  const maxW =
    tamano === 'chica' ? 'max-w-xs' : tamano === 'media' ? 'max-w-lg' : '';

  if (error) return <PlaceholderImagen tamano={tamano} />;

  return (
    <>
      <figure
        className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${maxW}`}
      >
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          title="Ampliar imagen"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={src}
            alt={alt}
            onError={() => setError(true)}
            className="w-full h-auto"
          />
        </button>
      </figure>

      {ampliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setAmpliada(false)}
        >
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
          />
          <button
            onClick={() => setAmpliada(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg text-slate-700 shadow hover:bg-white"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// Espacio reservado para capturas reales (con flechas e indicaciones) que se
// cargarán más adelante.
function PlaceholderImagen({ tamano }: { tamano?: 'chica' | 'media' }) {
  const claseTamano =
    tamano === 'chica'
      ? 'max-w-xs px-4 py-6'
      : tamano === 'media'
        ? 'max-w-lg px-5 py-8'
        : 'px-6 py-10';
  return (
    <div
      className={`rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center ${claseTamano}`}
    >
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
        </svg>
      </div>
      <div className="text-sm font-medium text-slate-500">Captura ilustrativa del módulo </div>
      <div className="text-xs text-slate-400 mt-0.5">
        Las imágenes de esta documentación son ilustrativas y podrán variar levemente respecto de la versión instalada.
      </div>
    </div>
  );
}
