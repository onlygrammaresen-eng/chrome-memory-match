# 🧠 Memory Match - Temático (Chrome Extension)

Juego de **Memory Match** (memoria) como extensión de Chrome, con temas divertidos, varias dificultades, **ranking local**, **sonidos** y **animaciones suaves**.

## Características

- 5 temas: Emojis, Animales, Frutas, Espacio y Comida
- 3 dificultades: Fácil (4 pares), Media (8 pares), Difícil (12 pares)
- Contador de movimientos + temporizador
- Ranking local (top 20) guardado con `chrome.storage.local`
- **Sonidos** (Web Audio API): volteo, match, error y victoria
- Botón de mute (se recuerda la preferencia)
- **Animaciones suaves**: flip con easing, pop al hacer match, shake al fallar, entrada escalonada de cartas y modal con transición
- Diseño moderno y responsive al popup
- 100% offline (después de instalar)

## Cómo probarlo localmente

1. Clona el repo:
   ```bash
   git clone https://github.com/onlygrammaresen-eng/chrome-memory-match.git
   cd chrome-memory-match
   ```

2. Abre Chrome → `chrome://extensions/`

3. Activa **Modo de desarrollador** (arriba a la derecha)

4. Haz clic en **Cargar descomprimida** y selecciona la carpeta del proyecto

5. ¡Listo! Haz clic en el icono de la extensión para jugar

> **Nota sobre iconos**: El `manifest.json` apunta a `icons/icon16.png`, `icon48.png` y `icon128.png`.  
> Si aún no los tienes, usa los que generamos o crea los tuyos (recomendado 128×128 px).

## Estructura del proyecto

```
chrome-memory-match/
├── manifest.json          # Manifest V3
├── popup/
│   ├── popup.html         # UI
│   ├── popup.css          # Estilos + animaciones
│   └── popup.js           # Lógica del juego + ranking + sonidos + animaciones
├── icons/                 # iconos de la extensión
└── README.md
```

## Próximos pasos posibles

- [x] Añadir iconos oficiales
- [x] Sonidos al voltear / hacer match
- [x] Animaciones más suaves
- [ ] Modo diario (challenge del día)
- [ ] Compartir puntuación
- [ ] Publicar en Chrome Web Store

## Publicar en Chrome Web Store

1. Crea una cuenta de desarrollador ($5 USD una sola vez): https://chrome.google.com/webstore/devconsole
2. Empaqueta la carpeta (sin `.git`) en un `.zip`
3. Sube el zip, añade capturas de pantalla y descripción
4. Envía a revisión

---

Hecho con ❤️ para pausas rápidas en el navegador.
