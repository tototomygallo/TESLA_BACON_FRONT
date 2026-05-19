# TauKits — Frontend

Sistema de gestión de muestras de laboratorio. Front en React + TypeScript + Vite + Tailwind.

## Quick start

```bash
npm install
npm run dev
```

Abre en `http://localhost:5173`. Usuarios de prueba: `tec1`, `bio1`, `adm1` (o `tec2`/`bio2`/`adm2`).

## Estructura

```
src/
├── components/         # Componentes reutilizables (Badges, Topbar, MetricCard)
├── pages/              # Vistas (Login, Dashboard, Muestras, Scanner)
├── services/           # Capa de API (mock + real)
│   ├── apiClient.ts    # Interfaz/contrato
│   ├── mockApi.ts      # Implementación con datos en memoria
│   ├── httpApi.ts      # Implementación con fetch al back Python
│   └── index.ts        # Selector según VITE_API_MODE
├── hooks/              # Hooks de datos (useMuestras, useHistorial)
├── types/              # Tipos del dominio
└── mocks/              # Datos simulados
```

## Conectar al backend Python

1. Editá `.env`:
   ```
   VITE_API_MODE=real
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
2. Reiniciá `npm run dev`.

Si el back corre en otro origen y hay CORS, descomentá el bloque `proxy` en `vite.config.ts`.

## Endpoints esperados por el back

| Método | Path | Descripción |
|--------|------|-------------|
| POST   | `/auth/login`                  | `{userId}` → `Usuario` |
| GET    | `/muestras`                    | Lista todas las muestras |
| POST   | `/muestras/ingresar-lote`      | `{codigos: string[]}` → `{ingresadas, rechazadas, duplicadas}` |
| GET    | `/resumen/historial`           | Lista de resúmenes diarios |
| GET    | `/resumen/:fecha`              | Resumen de una fecha específica |
| GET    | `/informes/:codigo/pdf`        | PDF del informe (próxima iteración) |

Ver `src/services/apiClient.ts` para el contrato completo.

## Roles

- **Técnico** (`tec1`, `tec2`): ingreso de muestras, etiquetas, ver tabla.
- **Bioquímico** (`bio1`, `bio2`): además puede validar muestras.
- **Administrador** (`adm1`, `adm2`): todo lo anterior.

La validación es la única acción restringida hoy (botón "Validar" en estado `en_validacion`). Para agregar más restricciones, usá `usuario.rol` en los componentes.

## Estados de muestras

| Estado | Cuándo |
|--------|--------|
| `ingresada`     | Recién escaneada |
| `en_proceso`    | Se imprimieron etiquetas |
| `en_validacion` | Se cargó el archivo TXT |
| `completado`    | Informe generado |
| `error`         | Falló (2+ intentos = no se puede generar informe) |

## Próximos pasos

- Integración del PDF de informes (necesita el template del laboratorio).
- Acciones reales sobre las muestras (imprimir etiqueta, validar, generar informe).
- Autenticación real (hoy solo verifica que el ID existe).
