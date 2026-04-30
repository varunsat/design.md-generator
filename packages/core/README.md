# `@creoit.com/design-md-core`

Internal package: framework detection, token extraction, brief building, and DESIGN.md file utilities for [`@creoit.com/design-md`](https://www.npmjs.com/package/@creoit.com/design-md).

## Most users

You probably want the CLI, not this package directly:

```bash
npm i @creoit.com/design-md
```

See the CLI's [README](https://www.npmjs.com/package/@creoit.com/design-md) for the full workflow.

## Programmatic API

Useful if you're embedding DESIGN.md generation into another tool. The package exposes:

```ts
import {
  detect,                // framework detection
  extractAll,            // run all matching extractors
  extractTailwindV3,
  extractTailwindV4,
  extractCssVars,
  buildBrief,            // markdown agent brief
  parseDesignMd,         // split YAML front matter from body
  serializeDesignMd,     // emit DESIGN.md from tokens + body
  scaffoldBody,          // default placeholder body
  mergeTokens,           // merge extracted into existing
} from '@creoit.com/design-md-core';
```

All functions are pure / file-system-reading; none invoke an LLM.

## Source

[github.com/varunsat/design.md-generator](https://github.com/varunsat/design.md-generator) (`packages/core`)

## License

MIT © Creo IT
