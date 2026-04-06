/**
 * Bun Plugin for TypeORM Decorator Metadata Support
 *
 * Bun's built-in transpiler does NOT support `emitDecoratorMetadata`,
 * which TypeORM entity decorators require. This plugin:
 *
 * 1. Intercepts .ts source files (not test files, not node_modules)
 * 2. Transpiles them using SWC with decorator metadata support
 * 3. Adds stub exports for type-only exports (SWC strips them but Bun expects them)
 * 4. Uses ES6 module output for compatibility with Bun's ESM imports
 * 5. Fixes circular dependency TDZ issues in decorator metadata
 *
 * IMPORTANT: We capture fs.readFileSync at module load time (before any test
 * can mock it via spyOn) to prevent test fs mocks from corrupting file reads.
 */
import { readFileSync as _originalReadFileSync } from 'fs';

import { plugin } from 'bun';

// Capture the REAL readFileSync at plugin load time,
// before any test's spyOn(fs, 'readFileSync') can replace it.
const originalReadFileSync = _originalReadFileSync;

// Lazy-load @swc/core
let swcCore: typeof import('@swc/core') | null = null;

function getSwc() {
  if (!swcCore) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    swcCore = require('@swc/core');
  }
  return swcCore!;
}

// Cache transformed files
const transformCache = new Map<string, string>();

/**
 * Read a file using the original (unmocked) readFileSync.
 */
function readFile(path: string): string {
  return originalReadFileSync(path, 'utf8');
}

/**
 * Extract all exported type/interface names from TypeScript source.
 */
function extractTypeOnlyExports(source: string): string[] {
  const types: string[] = [];
  const regex = /export\s+(?:type|interface)\s+(\w+)/g;
  let match;
  while ((match = regex.exec(source))) {
    types.push(match[1]);
  }
  return types;
}

/**
 * Extract value export names that will survive SWC transformation.
 */
function extractValueExports(source: string): Set<string> {
  const values = new Set<string>();
  const regex = /export\s+(?:const|let|var|function|class|enum)\s+(\w+)/g;
  let match;
  while ((match = regex.exec(source))) {
    values.add(match[1]);
  }
  return values;
}

function transformWithSwc(filePath: string, source: string): string {
  const cached = transformCache.get(filePath);
  if (cached) return cached;

  const swc = getSwc();
  const result = swc.transformSync(source, {
    filename: filePath,
    jsc: {
      target: 'es2022',
      parser: {
        syntax: 'typescript',
        decorators: true,
        dynamicImport: true,
      },
      transform: {
        decoratorMetadata: true,
        legacyDecorator: true,
      },
      keepClassNames: true,
      externalHelpers: false,
    },
    module: {
      type: 'es6',
    },
    sourceMaps: false,
  });

  let code = result.code;

  // Fix CJS named import incompatibility.
  // SWC outputs `import { X } from "cjs-pkg"` as ES6 named import,
  // but CJS modules don't expose named exports in Bun's ESM resolution.
  // Convert: import { X, Y } from "pkg" → import _pkg from "pkg"; const { X, Y } = _pkg;
  const CJS_PACKAGES = ['express'];
  for (const pkg of CJS_PACKAGES) {
    const regex = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*["']${pkg}["'];?`, 'g');
    const safeAlias = `_${pkg.replace(/[^a-zA-Z0-9]/g, '_')}_default`;
    code = code.replace(regex, (_match, names) => {
      const cleanNames = names.replace(/\s+/g, ' ').trim();
      return `import ${safeAlias} from "${pkg}"; const { ${cleanNames} } = ${safeAlias};`;
    });
  }

  // Fix circular dependency TDZ issues in decorator metadata.
  // SWC emits: typeof X === "undefined" ? Object : X
  // In ES modules, this throws ReferenceError in TDZ instead of returning undefined.
  // Replace with a try/catch pattern that handles TDZ gracefully.
  code = code.replace(
    /typeof (\w+) === "undefined" \? Object : (\w+)/g,
    '(function() { try { return $1; } catch(e) { return Object; } })()'
  );

  // Add stub exports for type-only exports stripped by SWC
  const typeExports = extractTypeOnlyExports(source);
  const valueExports = extractValueExports(source);

  const stubs = typeExports
    .filter((name) => !valueExports.has(name))
    .filter((name) => {
      return (
        !code.includes(`export { ${name}`) &&
        !code.includes(`export const ${name}`) &&
        !code.includes(`export class ${name}`) &&
        !code.includes(`export function ${name}`)
      );
    })
    .map((name) => `export const ${name} = undefined;`);

  if (stubs.length > 0) {
    code += `\n// Type export stubs for Bun ESM compatibility\n${stubs.join('\n')}\n`;
  }

  transformCache.set(filePath, code);
  return code;
}

plugin({
  name: 'decorator-metadata',
  setup(build) {
    // Match .ts files in libs/ and apps/ directories
    build.onLoad({ filter: /\/(libs|apps)\/.*\.ts$/ }, (args) => {
      // Skip node_modules
      if (args.path.includes('node_modules')) {
        return { contents: readFile(args.path), loader: 'ts' };
      }

      // Skip test/spec files — they should use Bun's native transpiler
      if (args.path.includes('.spec.') || args.path.includes('.test.')) {
        return { contents: readFile(args.path), loader: 'ts' };
      }

      // Skip setup/config files
      if (args.path.includes('bun-setup') || args.path.includes('bun-decorator')) {
        return { contents: readFile(args.path), loader: 'ts' };
      }

      // Skip files that don't use TypeORM decorators but import CJS modules
      // or have Sentry decorators that fail without proper decorator metadata
      if (
        args.path.includes('all-exceptions.filter') ||
        args.path.includes('timeout.interceptor') ||
        args.path.includes('/instrument')
      ) {
        return { contents: readFile(args.path), loader: 'ts' };
      }

      const source = readFile(args.path);

      try {
        const code = transformWithSwc(args.path, source);
        return { contents: code, loader: 'js' };
      } catch {
        return { contents: source, loader: 'ts' };
      }
    });
  },
});
