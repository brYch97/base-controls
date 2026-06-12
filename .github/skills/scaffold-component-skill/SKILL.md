---
name: scaffold-component-skill
description: 'Scaffold a React component folder with repository conventions. Use when creating a new component with optional overridable UI contract and strict empty-default templates.'
argument-hint: 'name=<ComponentName> overridableUi=<yes|no>'
---

# Scaffold Component Skill

Scaffold a new component in a new subfolder inside the current folder using repository conventions.

## Input Format

- `name=<ComponentName>` (required, PascalCase)
- `overridableUi=<yes|no>` (required)

If one or both values are missing, ask a concise clarification question before generating files.

## Conventions

Follow all rules from the component code style instructions (`.github/instructions/component-code-style.instructions.md`). Do not re-derive conventions here — use that file as the single source of truth for naming, structure, styling, props, and overridable UI patterns.

## Implementation Requirements

- Create a new component folder inside the current folder.
- Name the new folder in kebab-case derived from `name`.
- Create files using the canonical templates below.
- Keep strong typing and avoid introducing `any` unless unavoidable.
- Do not scaffold fake/example business props or behavior.

## Canonical Templates

Use these templates as source of truth for generated code.

### Template A: `overridableUi=no`

Folder structure:

```text
<component-folder>/
  <ComponentName>.tsx
  styles.ts
  index.ts
```

`<ComponentName>.tsx`

```ts
import React, { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { get<ComponentName>Styles } from './styles';

export interface I<ComponentName>Props {}

export const <ComponentName> = (props: I<ComponentName>Props) => {
	const theme = useTheme();
	const styles = useMemo(() => get<ComponentName>Styles(theme), [theme]);

	return <div className={styles.root} />;
};
```

`styles.ts`

```ts
import { ITheme, mergeStyleSets } from '@fluentui/react';

export const get<ComponentName>Styles = (theme: ITheme) => {
	return mergeStyleSets({
		root: {},
	});
};
```

`index.ts`

```ts
export * from './<ComponentName>';
```

Use the same `index.ts` export pattern for all scaffolded component folders.

## Conditional Requirements

When `overridableUi=yes`:

- Add `components` subfolder and use Template B.
- Do not scaffold `onRender...` callback names or render payload objects unless explicitly requested.

### Template B: `overridableUi=yes`

Folder structure:

```text
<component-folder>/
  <ComponentName>.tsx
  styles.ts
  index.ts
  components/
	components.tsx
	index.ts
```

`<ComponentName>.tsx`

```ts
import React, { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { <ComponentName>Components, I<ComponentName>Components } from './components';
import { get<ComponentName>Styles } from './styles';

export interface I<ComponentName>Props {
	components?: Partial<I<ComponentName>Components>;
}

export const <ComponentName> = (props: I<ComponentName>Props) => {
	const theme = useTheme();
	const styles = useMemo(() => get<ComponentName>Styles(theme), [theme]);
	const components = { ...<ComponentName>Components, ...props.components };

	return <div className={styles.root} />;
};
```

`components/components.tsx`

```ts
export interface I<ComponentName>Components {}

export const <ComponentName>Components: I<ComponentName>Components = {};
```

`components/index.ts`

```ts
export * from './components';
```

## Output Format

1. Brief summary of generated structure.
2. List of created/updated files.
3. Any assumptions made.
4. Validation steps performed (for example: `npm run build`).
