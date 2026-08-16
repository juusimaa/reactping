// This file is the entry point of the app — the closest analogy is Main()
// in a C# console/WPF app. It's the one place that actually starts things
// running; every other .tsx file just defines components (think: classes
// that aren't instantiated until something renders them).

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Note the `.tsx` extension is included here — Vite/TS project setups
// generally require it for relative imports. C# doesn't have an
// equivalent since `using` statements reference namespaces, not files.
import App from './App.tsx'

// document.getElementById('root') returns `HTMLElement | null` in the DOM
// typings (like a `FindControl` that could fail to find something).
// The `!` after it is TypeScript's "non-null assertion operator" — same
// idea as C#'s null-forgiving `!` operator. It tells the compiler
// "trust me, this won't be null," without adding a runtime check.
// createRoot() is React's API for attaching a component tree to a real
// DOM node — roughly like calling Application.Run(new MainForm()) to
// hand control to the UI framework.
createRoot(document.getElementById('root')!).render(
  // <StrictMode> isn't a real DOM element — it's a React-only wrapper
  // component that turns on extra development-time checks (e.g. it
  // deliberately double-invokes some code to help you catch code that
  // isn't safe to run twice — see the useEffect comment in App.tsx).
  // It's stripped out in production builds, so it has zero cost when deployed.
  <StrictMode>
    {/* Rendering <App /> here is what actually kicks off the component
        tree — everything the user sees starts from here. */}
    <App />
  </StrictMode>,
)
