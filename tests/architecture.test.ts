import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('mantiene dependencias descendentes entre las tres capas', () => {
  const forbidden: Record<string, string[]> = {
    presentation: ['/persistence/'], application: ['/presentation/'], persistence: ['/application/', '/presentation/'],
    domain: ['/application/', '/presentation/', '/persistence/'],
  };
  for (const [layer, patterns] of Object.entries(forbidden)) {
    for (const name of readdirSync(join('src', layer))) {
      if (!name.endsWith('.ts')) continue;
      const file = join('src', layer, name);
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
      for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          for (const pattern of patterns) expect(statement.moduleSpecifier.text, `${file}: dependencia no permitida`).not.toContain(pattern);
        }
      }
    }
  }
});
