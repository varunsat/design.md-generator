export type {
  Color,
  ComponentProperty,
  ComponentTokens,
  DesignTokens,
  Dimension,
  ExtractionResult,
  FrameworkDetection,
  FrameworkId,
  PackageJson,
  ProjectContext,
  TokenRef,
  Typography,
} from './types.js';

export { detect } from './detector.js';
export {
  extractAll,
  extractCssVars,
  extractTailwindV3,
  extractTailwindV4,
} from './extractors/index.js';
export type { CssVarsOptions } from './extractors/index.js';
