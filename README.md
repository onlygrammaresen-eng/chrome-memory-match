# 🧠 Memory Match - Temático (Chrome Extension)

Juego de **Memory Match** como extensión de Chrome, con temas, ranking, sonidos, desafío diario y **sistema de logros/medallas**.

## Características

- 5 temas: Emojis, Animales, Frutas, Espacio y Comida
- 3 dificultades: Fácil (4 pares), Media (8 pares), Difícil (12 pares)
- Contador de movimientos + temporizador
- Ranking local (top 20)
- **Sonidos** (Web Audio API) + mute
- **Animaciones** y cartas encontradas más oscuras
- **📅 Desafío Diario**: tablero fijo del día + récord personal
- **🏅 Logros y medallas** (12 logros con desbloqueo automático)
- 100% offline

## Logros incluidos

| Medalla | Logro | Condición |
|---------|-------|-----------|
| 🥉 | Primera victoria | Gana cualquier partida |
| 🥇 | Memoria perfecta | Gana fácil en 4 movimientos |
| ⚡ | Velocista | Gana media en < 45s |
| 💎 | Maestro difícil | Gana una partida difícil |
| 🎯 | Cirujano | Gana difícil en ≤ 20 movimientos |
| 🗺️ | Explorador | Gana con los 5 temas |
| 📅 | Rutina diaria | Completa tu primer diario |
| 🔥 | Racha x3 | Diario 3 días seguidos |
| 🔥🔥 | Racha x7 | Diario 7 días seguidos |
| 🎮 | Veterano | Gana 10 partidas |
| 🏅 | Campeón | Gana 25 partidas |
| 👑 | Coleccionista | Desbloquea 10 logros |

## Cómo probarlo

```bash
git clone https://github.com/onlygrammaresen-eng/chrome-memory-match.git
cd chrome-memory-match
```

1. Chrome → `chrome://extensions/`
2. Activa **Modo de desarrollador**
3. **Cargar descomprimida** → selecciona la carpeta del proyecto

## Estructura

```
chrome-memory-match/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
└── README.md
```

## Próximos pasos

- [x] Iconos
- [x] Sonidos
- [x] Animaciones
- [x] Modo diario
- [x] Sistema de logros y medallas
- [ ] Compartir puntuación
- [ ] Publicar en Chrome Web Store

---

Hecho con ❤️ para pausas rápidas en el navegador.
