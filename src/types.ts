// A plain data-shape file — no logic, just describing what a "ping data
// point" looks like so every other file agrees on it. This is the
// TypeScript equivalent of a small C# POCO/record, minus the runtime
// class: `interface` exists ONLY at compile time. There's no JS object
// you could `new PingDataPoint()` from — interfaces are erased entirely
// once TypeScript compiles down to JavaScript, unlike a C# class or
// struct which still exists as a real runtime type.
//
// TypeScript also has a second, very similar way to write this:
//   export type PingDataPoint = { time: string; latencyMs: number }
// `type` and `interface` overlap a lot for simple object shapes like this
// one. The common convention: use `interface` for object shapes (as
// here), and `type` when you need things interfaces can't express, e.g.
// unions (`type Status = 'ok' | 'error'`). Neither has a direct one-to-one
// C# equivalent — C# doesn't have union types like `'ok' | 'error'` built in.
export interface PingDataPoint {
  // Field types are required in TypeScript interfaces — there's no
  // "var" style inference here since there's no value to infer from,
  // only a shape being declared.
  time: string
  latencyMs: number
}
