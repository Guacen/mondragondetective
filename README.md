# Las Memorias del Inspector Mondragón

Juego detective narrativo ambientado en la Colombia de 1952. Caso a caso, el jugador investiga crímenes siguiendo al Inspector Héctor Mondragón.

**Stack**: Vanilla JS + Vite + Supabase (auth anónimo + sync de progreso + leaderboard).

---

## Setup local

```bash
cp .env.example .env.local
# Edita .env.local con tus keys de Supabase

npm install
npm run dev          # http://localhost:4242
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (Settings → API) |
| `VITE_SUPABASE_KEY` | `anon` / `publishable` key (NUNCA la `service_role`) |

---

## Setup Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. **SQL Editor** → pegar y correr el contenido de `supabase/schema.sql`
3. **Authentication → Providers → Anonymous** → **Enable Anonymous Sign-Ins**
4. Copiar `Project URL` y `anon public` key a `.env.local`

---

## Estructura

```
mondragon/
├── index.html                 # Página de colección (entrypoint)
├── caso-01/index.html         # Caso I — El Último Invitado
├── caso-02/ caso-03/          # Próximos casos (coming-soon)
├── src/
│   ├── caso-01/game.js        # Lógica completa del caso I
│   └── supabase/
│       ├── client.js          # Client singleton
│       ├── auth.js            # Sesión anónima + promoción a email
│       └── sync.js            # Save progress, record completion, leaderboard
├── supabase/schema.sql        # Esquema completo para Supabase
├── assets/                    # Fuentes, imágenes
└── vite.config.js
```

---

## Scripts

```bash
npm run dev      # Vite dev server con HMR en :4242
npm run build    # Build producción → dist/
npm run preview  # Servir build localmente en :4243
```

Para deploy a GitHub Pages (bajo `/mondragondetective/`):

```bash
GH_PAGES=true npm run build
```

---

## Flujo de datos

1. **Al cargar `caso-01`** → `ensureSession()` crea sesión anónima (transparente, cero fricción).
2. **Cada vez que cambia el estado** → `saveProgress` (debounced 2s) hace upsert en `case_progress.state` (JSONB).
3. **Al acusar** → `recordCompletion` inserta en `case_completions` con score, tiempo, pistas, hints usados.
4. **Profile** → agregados (`total_score`, `cases_solved`, `hints_used_lifetime`) se actualizan automáticamente.

### Conservar progreso entre dispositivos

Llamar `promoteToEmail(email)` de `src/supabase/auth.js` manda un magic link y conserva el `user_id` (progreso intacto).

---

## Analytics disponibles (vistas SQL)

- **`leaderboard`** — Mejor score por usuario por caso (solo opt-in).
- **`clue_stats`** — Qué % de jugadores encontró cada pista.
- **`accusation_stats`** — A quién acusan más y con qué accuracy.

---

## Caso I — El Último Invitado

**Ubicación:** Villa Cipreses, Caldas, Colombia, 1952
**Víctima:** Don Augusto Villanueva Leal
**Método:** Arsénico administrado en dosis graduales
**Dificultad:** Media-Alta

Interrogar a 5 sospechosos a lo largo de 4 capítulos. Resolver el caso requiere cruzar al menos 3 cadenas de evidencia independientes (arsénico, coartada, piano, testamento).
