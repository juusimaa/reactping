// Recharts components are just React components someone else wrote —
// there's no special "chart" concept in the language, unlike e.g. a
// WinForms/WPF chart control with its own designer surface. You compose
// them with JSX exactly like your own components below.
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
// `import type` is TypeScript-specific: it tells the compiler this import
// is ONLY used for type-checking and should be erased entirely from the
// compiled JavaScript. Think of it as the difference between a C# `using`
// for a real dependency vs. one that only exists for compile-time
// generics/interfaces — except here you have to say so explicitly.
import type { PingDataPoint } from './types'

// This is a TypeScript `interface`, same keyword as C#. Big difference:
// TypeScript uses *structural* typing, not nominal typing. In C#, a class
// must explicitly `: IFoo` to count as an IFoo. In TypeScript, ANY object
// shaped like `{ data: PingDataPoint[] }` satisfies this interface — no
// explicit "implements" needed. It's duck typing, checked at compile time.
interface PingChartProps {
  data: PingDataPoint[]
}

// This is a "function component" — the modern React style. Under the
// hood it's just a plain function: call it with props, get back a
// description of UI (JSX) to render. There's no base class to inherit
// from and no explicit "new PingChart()" anywhere in the codebase; React
// itself decides when to call this function.
//
// `{ data }: PingChartProps` is destructuring the single props argument
// straight into a local variable, with an inline type annotation. It's
// equivalent to receiving one parameter object and doing
// `var data = props.Data;` on the next line, just done in the parameter
// list itself. If PingChart took multiple props, they'd all be fields
// on that same one object — React always passes exactly one "props" argument.
function PingChart({ data }: PingChartProps) {
  // JSX below looks like HTML/XML embedded in code — the closest C#
  // analogy is XAML, except JSX isn't a separate markup file: it's
  // syntactic sugar that compiles down to plain function calls
  // (essentially `React.createElement(LineChart, {...}, ...)` chains).
  // Because it's "just" function calls under the hood, you can freely
  // mix in real TypeScript expressions using `{ }`, as seen further down.
  return (
    // ResponsiveContainer measures its parent element and resizes the
    // chart to fit — width="100%" here means "fill whatever container
    // this ends up inside of."
    <ResponsiveContainer width="100%" height={360}>
      {/* `data={data}` passes our array of points down as a prop, same
          concept as passing a constructor argument or setting a public
          property on a control — just spelled as an XML-style attribute. */}
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        {/* dataKey tells Recharts which field of each PingDataPoint object
            to read for this axis — "time" here matches the property name
            on PingDataPoint (see types.ts). There's no compile-time check
            tying this string to the actual field name (it's just a prop
            typed as `string` on Recharts' side), so a typo here wouldn't
            be caught by TypeScript the way a real property access would. */}
        <XAxis dataKey="time" />
        <YAxis unit="ms" />
        {/* `formatter` is a prop whose value is a function — passing
            functions as arguments/props is completely ordinary in
            TypeScript/JavaScript, similar to passing a delegate or lambda
            in C# (e.g. `Func<T, TResult>`). Recharts calls this function
            for us whenever it needs to render tooltip text, passing in
            the raw value; we return a 2-element array of [displayValue, label]. */}
        <Tooltip formatter={(value) => [`${value} ms`, 'Latency']} />
        <Line
          type="monotone"
          dataKey="latencyMs"
          stroke="#2563eb"
          // dot={false} hides the little circle marker at each data point.
          dot={false}
          // Turning off Recharts' built-in animation — with data changing
          // every couple of seconds (Step 3), re-animating the whole line
          // on every update would look jittery rather than smooth.
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Default export — means "this is the main thing this file provides."
// Other files import it without curly braces: `import PingChart from
// './PingChart'`. Compare to a *named* export (`export function Foo`),
// which requires `import { Foo } from './file'`. Roughly: a default
// export is like a file with one public type matching the filename,
// whereas named exports are like a file that can expose several public
// types side by side.
export default PingChart
