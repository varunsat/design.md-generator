/**
 * Types modeling the DESIGN.md format (v0 / alpha).
 * Spec: https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
 */

export type Color = string;
export type Dimension = string;
export type TokenRef = string;

export interface Typography {
  fontFamily?: string;
  fontSize?: Dimension;
  fontWeight?: number;
  lineHeight?: Dimension | number;
  letterSpacing?: Dimension;
  fontFeature?: string;
  fontVariation?: string;
}

export type ComponentProperty =
  | 'backgroundColor'
  | 'textColor'
  | 'typography'
  | 'rounded'
  | 'padding'
  | 'size'
  | 'height'
  | 'width';

export type ComponentTokens = Partial<Record<ComponentProperty, string>> & Record<string, string>;

export interface DesignTokens {
  version?: string;
  name?: string;
  description?: string;
  colors?: Record<string, Color>;
  typography?: Record<string, Typography>;
  rounded?: Record<string, Dimension>;
  spacing?: Record<string, Dimension | number>;
  components?: Record<string, ComponentTokens>;
}

export type FrameworkId =
  | 'tailwind-v3'
  | 'tailwind-v4'
  | 'shadcn'
  | 'css-vars'
  | 'mui'
  | 'chakra'
  | 'mantine';

export interface FrameworkDetection {
  id: FrameworkId;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface PackageJson {
  name?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface ProjectContext {
  root: string;
  packageJson?: PackageJson;
  frameworks: FrameworkDetection[];
}

export interface ExtractionResult {
  tokens: DesignTokens;
  sources: string[];
  warnings: string[];
}
