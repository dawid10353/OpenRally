# 3D Car Simulator — Dokumentacja Wewnętrzna dla AI

## Status Projektu
- **Etap**: 2/3 (Polerowanie / Rozbudowa) — silnik fizyki, teren i efekty są już w dużej mierze zaimplementowane.
- **Co zrobiono**: Fundamenty, fizyka pojazdu (Rapier), kamery, ślady opon, cząsteczki kurzu, dźwięk silnika, konfiguracje (`src/config`), poprawki błędów TypeScript.
- **Środowisko**: Projekt jest uruchamiany w WSL (Linux) z wykorzystaniem Google Antigravity. Używaj wyłącznie standardowych komend Linux (np. `npm install`, `npm run dev`, `npx`). Nie używaj już obejść dla Windowsa (takich jak `cmd.exe /c`), ponieważ terminal działa w środowisku linuksowym.
  - **Testowanie przez AI (Browser Subagents)**: Serwer deweloperski (`npm run dev`) działa w WSL, a użytkownik wyświetla grę w przeglądarce na Windowsie. Port jest mapowany automatycznie, więc aplikacja jest dostępna pod adresem `http://localhost:5173/`.
  - Aby AI mogło samodzielnie testować grę za pomocą narzędzia `browser_subagent`, poleć subagentowi otworzyć adres URL: `http://localhost:5173/`. Zanim to zrobisz, upewnij się, że serwer deweloperski (np. `npm run dev`) został poprawnie uruchomiony w tle (background task) i jest w pełni gotowy do przyjmowania połączeń.
---

## Wizja Gry
Gra 3D w przeglądarce:
- Jazda samochodem po **nierównym, otwartym terenie** (pagórki, doliny, wzniesienia)
- Fizyka **arcade-sim** (niski próg wejścia, ale drift i praca zawieszenia dają satysfakcję)
- Projekt wieloletni, rozwijany **wyłącznie przez AI**

---

## Stos Technologiczny

| Warstwa | Technologia |
|---|---|
| Język | TypeScript (strict mode) |
| Bundler | Vite |
| Framework UI | React 18+ |
| Grafika 3D | React Three Fiber (R3F) + @react-three/drei |
| Fizyka | @react-three/rapier (Rapier3D, WASM) |
| Stan gry | Zustand |
| Post-processing | @react-three/postprocessing |
| Format modeli | GLB/GLTF |
| Linting | Oxlint (NIE ESLint!) + opcjonalnie Prettier |

### Zależności do zainstalowania (npm install):
```
@react-three/fiber three @react-three/drei @react-three/rapier @react-three/postprocessing zustand
```

---

## Struktura Katalogów

```
src/
├── components/
│   ├── canvas/          # Scena 3D (Canvas, światła, post-processing)
│   ├── vehicle/         # Samochód: model wizualny, efekty (kurz, ślady)
│   ├── terrain/         # Generator terenu, heightmapa, tekstury
│   ├── environment/     # Niebo, pogoda, obiekty dekoracyjne
│   └── ui/              # HUD, menu, prędkościomierz (React overlay)
├── hooks/
│   ├── useVehiclePhysics.ts   # Logika fizyki pojazdu (raycast vehicle)
│   ├── useInput.ts            # Obsługa klawiatury / gamepada
│   ├── useChaseCamera.ts      # Kamera podążająca
│   ├── useBumperCamera.ts     # Kamera zderzaka
│   └── useEngineSound.ts      # Obsługa dźwięku silnika
├── store/
│   ├── gameStore.ts           # Stan gry (prędkość, pozycja, tryb)
│   └── settingsStore.ts       # Ustawienia (grafika, sterowanie)
├── config/                    # Globalne pliki konfiguracyjne (zmienne, stałe, balanse)
├── utils/
│   ├── terrainGenerator.ts    # Perlin noise, heightmapa
│   └── math.ts                # Funkcje pomocnicze (lerp, clamp)
├── types/                     # Interfejsy TypeScript
├── App.tsx
└── main.tsx
public/
└── models/
    ├── vehicles/              # Modele GLB samochodów (z AI)
    └── props/                 # Drzewa, kamienie, budynki (z AI)
```

---

## Konwencje Kodowania

1. **Jeden hook = jeden plik** w `src/hooks/`
2. **Jeden komponent = jeden plik** w odpowiednim podfolderze `src/components/`
3. **Konfiguracje** wydzielone do plików w `src/config/` (np. balans fizyki, pojazdu)
4. **Typy globalne** w `src/types/` (np. `vehicle.ts`, `terrain.ts`, `game.ts`)
5. **Store'y Zustand** w `src/store/` — każdy store w osobnym pliku
6. **Nazewnictwo**: PascalCase dla komponentów, camelCase dla hooków i utils
7. **Komentarze JSDoc** przy każdej eksportowanej funkcji/typie
8. **Brak `any`** — zawsze typuj explicite

---

## Cechy Gry Zaimplementowane (Etap 1 i część 2)

### Teren (Heightmap)
- Perlin noise do generacji heightmapy
- Rapier HeightfieldCollider (fizyczna kolizja z terenem)

### Fizyka Samochodu
- Rapier Raycast Vehicle — zawieszenie
- Zoptymalizowany balans hamulców i driftu, ślady opon

### Kamera
- Chase camera (lerp), Free camera, Bumper camera

### HUD & Wizualia
- Dynamiczny skybox, cienie real-time, efekty post-processing (Bloom, Vignette)
- Efekty cząsteczkowe (DustParticles), dźwięk silnika (EngineSound)

---

## Generowanie Obiektów 3D przez AI

Narzędzia do generacji modeli 3D:
- **Meshy AI** (meshy.ai) — text-to-3D, image-to-3D, auto-rigging, PBR, eksport GLB
- **Tripo AI** (tripo3d.ai) — czysta topologia, hard-surface, eksport GLB
- **Rodin AI** (hyper3d.ai) — fotorealizm, hero assets, eksport GLB

Pipeline: Prompt → API → .glb → /public/models/ → useGLTF() → gra

Targetowane poly-count:
- Pojazdy: 5 000–15 000 trójkątów
- Obiekty otoczenia: 500–3 000 trójkątów

Na start: samochód z prostych kształtów Three.js (box/cylinder), podmiana na GLB = 1 linia kodu.

---

## Roadmapa

### Etap 1 — Fundament (ZAKOŃCZONY)
Teren, fizyka, kamera, sterowanie, HUD, oświetlenie

### Etap 2 — Polerowanie (W TRAKCIE)
Efekty cząsteczkowe, dźwięk, różne podłoża, obiekty na mapie, post-processing

### Etap 3 — Rozbudowa ⬅️ TERAZ (Główny focus)
Modele AI (GLB), podmiana klockowych modeli na prawdziwe modele 3D pojazdów i otoczenia, poprawki optymalizacyjne, refactoring

### Etap 4+ — Przyszłość
Multiplayer, edytor map, pogoda, automatyzacja generacji assetów

---

## ⚠️ Typowe Błędy do Uniknięcia (AI Rules)
1. **Błąd w `tsconfig.app.json`**: NIGDY nie dodawaj opcji `"ignoreDeprecations": "6.0"` w plikach konfiguracyjnych TypeScript (np. `tsconfig.app.json`). Projekt domyślnie w ogóle nie potrzebuje tej flagi. Jej dodanie zawsze psuje konfigurację i rzuca błędem, ze względu na specyfikę aktualnej wersji kompilatora.
