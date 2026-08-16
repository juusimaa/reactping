// Vite is the dev server + build tool for this project — roughly playing
// the role that MSBuild plays for a C# project, plus a fast local dev
// server (closer to `dotnet watch run`, but with instant hot-reload of
// individual components instead of a full app restart).
import { defineConfig } from 'vite'
// @vitejs/plugin-react is what teaches Vite to understand JSX/TSX syntax
// and wires up React's "Fast Refresh" (swapping updated component code
// into the running page without losing state, while you edit).
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `defineConfig` doesn't really do anything at runtime beyond returning
// its argument — its whole job is giving TypeScript enough information
// to type-check and autocomplete the config object below. This is a
// common TypeScript pattern: a tiny identity-like helper function used
// purely to get better tooling/type inference, something you wouldn't
// typically reach for in C# since the type system works differently.
export default defineConfig({
  // Plugins extend what Vite can process — here, just the one plugin
  // that adds React/JSX support. A larger project might add more (e.g.
  // one for handling SVGs specially, or PWA support).
  plugins: [react()],
})
