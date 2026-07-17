<div align="center">
  <img src="openrally_logo.png" alt="OpenRally Logo" width="400" />
</div>

# OpenRally

**OpenRally** to projekt otwartoźródłowej gry rajdowej (open-source rally game project).

## Założenia Gry (Game Vision)

- Gra 3D w przeglądarce.
- Jazda samochodem po **nierównym, otwartym terenie** (pagórki, doliny, wzniesienia).
- Fizyka **arcade-sim** (niski próg wejścia, ale drift i praca zawieszenia dają satysfakcję).
- Projekt wieloletni, rozwijany **wyłącznie przez AI**.

## Jak uruchomić (How to run)

1. Zainstaluj zależności (Install dependencies):
   ```bash
   npm install
   ```
2. Uruchom serwer deweloperski (Start the development server):
   ```bash
   npm run dev
   ```
3. Otwórz w przeglądarce adres, który pojawi się w konsoli (zazwyczaj `http://localhost:5173`).

---

## Development Setup

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
