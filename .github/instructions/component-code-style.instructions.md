---
description: "Use when creating, editing, or refactoring React components in this repo. Covers folder structure, naming, props interfaces, styling with mergeStyleSets, and overridable UI patterns."
applyTo: "src/**/*.tsx, src/**/*.ts"
---

# React Component Code Style

## Folder & File Structure

- Every component lives in its own folder, named in **kebab-case** derived from the component name (e.g. `LookupMany` → `lookup-many/`).
- The main implementation file is named in **PascalCase** after the component (e.g. `LookupMany.tsx`).
- Every component folder must include an `index.ts` that re-exports the component:

```ts
export * from './ComponentName';
```

- Keep sub-components in nested folders using the same kebab-case rule.
- Do not rename existing folders unless the task explicitly asks for it.

## Props Interface

- Props interface name: `I<ComponentName>Props`.
- Define it in the main component file (`<ComponentName>.tsx`), not in a separate `interfaces.ts`, unless explicitly requested.
- The component function parameter must always be named `props`.

```tsx
export interface IMyComponentProps {}

export const MyComponent = (props: IMyComponentProps) => { ... };
```

## Styling

- Keep styles in a colocated `styles.ts` file — never inline style objects in `.tsx` files.
- Use `mergeStyleSets` from `@fluentui/react`.
- Export a factory function named `get<ComponentName>Styles(theme: ITheme)`.
- Call the factory inside `useMemo` in the component, keyed on `theme`:

```ts
// styles.ts
import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getMyComponentStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {},
    });
};
```

```tsx
// MyComponent.tsx
const theme = useTheme();
const styles = useMemo(() => getMyComponentStyles(theme), [theme]);
```

- For new scaffolds, the styles factory must return exactly `{ root: {} }` unless more is explicitly requested.

## Overridable UI (opt-in)

Apply only when the component needs a `components` override contract.

- Add `components?: Partial<I<ComponentName>Components>` to props.
- Define `I<ComponentName>Components` as an **empty interface** in `components/components.tsx`.
- Export a default mapping object `<ComponentName>Components` from the same file.
- Add `components/index.ts` re-exporting everything from `components/components.tsx`.
- In the component body, merge props overrides:

```tsx
const components = { ...MyComponentComponents, ...props.components };
```

- Do **not** scaffold `onRender...` callback names unless explicitly requested.

## TypeScript

- Avoid `any` unless there is no alternative (e.g. untyped third-party library internals).
- Do not add docstrings, comments, or type annotations to code you didn't change.
- Do not add error handling for scenarios that cannot realistically happen.
