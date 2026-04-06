# Las Memorias del Inspector Mondragón

Juego narrativo de detectives ambientado en Colombia, 1952.
Estilo Agatha Christie. Disponible en navegador sin instalación.

## Estructura

```
mondragon/
├── index.html              ← Colección de casos (portada)
├── caso-01/
│   └── index.html          ← El Último Invitado (disponible)
├── caso-02/
│   └── coming-soon.html    ← El Tren de las Tres (próximamente)
├── caso-03/
│   └── coming-soon.html    ← La Viuda de Salamina (próximamente)
└── assets/
    └── css/                ← (reservado para estilos compartidos futuros)
```

## Publicación en GitHub Pages

1. Crear repositorio en GitHub
2. Subir esta carpeta `mondragon/` como raíz del repositorio
3. Activar GitHub Pages desde **Settings → Pages → Source: main branch / root**
4. URL resultante: `https://[usuario].github.io/[repositorio]/`

## Caso I — El Último Invitado

**Ubicación:** Villa Cipreses, Caldas, Colombia, 1952
**Víctima:** Don Augusto Villanueva Leal
**Método:** Arsénico administrado en dosis graduales
**Dificultad:** Media-Alta

El jugador interroga a cinco sospechosos a lo largo de cuatro capítulos.
Para resolver el caso correctamente se requiere cruzar al menos tres cadenas
de evidencia independientes. Un jugador casual acusará a la persona equivocada
la primera vez.

## Tecnologías

- HTML5 / CSS3 / JavaScript vanilla
- Sin dependencias externas ni frameworks
- Sin servidor requerido — abre directamente en el navegador
- Google Fonts vía CDN (IM Fell English, Cormorant Garamond, Josefin Sans)
- Progreso persistido en `localStorage` con clave `mondragon_save`
