/**
 * verify-runtime-safety.ts - Codigo que revienta en ejecucion en cuanto algo no sale
 * como se esperaba.
 *
 * QUE COMPRUEBA
 *   Recorre src/ (archivos .ts, .tsx, .js y .jsx, menos pruebas y scripts) y avisa de
 *   cuatro formas de dar por hecho que todo saldra bien:
 *     1. JSON_PARSE_UNPROTECTED - JSON.parse() fuera de un try: si el texto viene roto
 *                                 (por ejemplo, un servidor que devuelve HTML en vez de
 *                                 JSON), el programa revienta.
 *     2. ENV_DIRECT_ACCESS      - process.env.X usado con ., [ o ! detras: se da por
 *                                 hecho que la variable existe. NODE_ENV no cuenta.
 *     3. FETCH_NO_OK_CHECK      - await fetch() sin mirar response.ok ni status en las
 *                                 lineas siguientes: una respuesta de error se trata
 *                                 como si fueran datos validos.
 *     4. ARRAY_ZERO_ACCESS      - [0]. sin una guardia cerca (.length, Array.isArray o
 *                                 [0]?.): si la lista viene vacia, revienta.
 *   Si no encuentra ningun archivo que mirar, falla: un verde sin haber comprobado
 *   nada no vale.
 *
 * QUE NO COMPRUEBA (sus limites, dichos)
 *   Lee el codigo linea a linea, con expresiones regulares, no con un analizador:
 *   - El try se detecta contando llaves por linea. Una llave dentro de un texto o de
 *     un comentario lo descoloca.
 *   - La regla 3 solo ve "await fetch(" y mira una ventana de 15 lineas desde ahi.
 *     Un fetch sin await, o una respuesta que se pasa entera a otra funcion que si la
 *     mira, salen como aviso. Esta misma comprobacion la hace mejor, leyendo el codigo
 *     entero, la regla RESPUESTA_SIN_MIRAR de verify-error-handling.mts: si se usan los
 *     dos, un mismo fetch puede salir en ambos.
 *   - La regla 4 busca la guardia en las 3 lineas anteriores. Una guardia mas arriba
 *     no la ve; una palabra ".length" que no guarda nada la da por buena.
 *   Dara falsos positivos y se le escaparan casos. No es un defecto que esconder: es
 *   lo que es.
 *
 * QUE DEBE ADAPTAR QUIEN LO DESCARGUE
 *   - ALLOWED_PATHS: lo que no se mira. Vienen las pruebas y scripts/; cada excepcion
 *     nueva, con su porque al lado.
 *   - La carpeta que recorre (src/) si su codigo vive en otra.
 *
 * REQUISITOS
 *   Node con ts-node y typescript instalados en el proyecto. Usa __dirname, asi que
 *   tiene que ejecutarse como CommonJS: es lo que hace ts-node en un proyecto sin
 *   "type": "module".
 *
 * COMO SE EJECUTA
 *   Desde la raiz del proyecto, con el archivo dentro de verificadores/ (busca src/ al
 *   lado de esa carpeta, no desde donde se le lance):
 *     npx ts-node verificadores/verify-runtime-safety.ts
 *   Termina con 0 si no encuentra nada y con 1 si encuentra algun aviso o no hay
 *   archivos que mirar.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  rule: string;
  content: string;
}

// src/ junto a la carpeta de este verificador, no desde donde se le lance.
const SRC_DIR = path.join(path.resolve(__dirname, '..'), 'src');

// Lo que no se mira: las pruebas y los scripts. Cada excepcion nueva, con su porque al lado.
const ALLOWED_PATHS = [
  /\.test\./,
  /\.spec\./,
  /__tests__[/\\]/,
  /scripts[/\\]/,
];

function shouldSkipFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWED_PATHS.some(p => p.test(normalized));
}

function collectFiles(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.git', 'coverage'].includes(entry.name)) continue;
      collectFiles(full, results);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath);

  // Las lineas que estan dentro de un try, contando llaves.
  const tryLines = new Set<number>();
  let depth = 0;
  let inTry = false;
  let tryDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\btry\s*\{/.test(line)) {
      inTry = true;
      tryDepth = depth;
    }
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (inTry) {
      tryLines.add(i + 1);
      if (depth <= tryDepth && i > 0) {
        inTry = false;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    if (/JSON\.parse\s*\(/.test(line) && !tryLines.has(lineNum)) {
      if (!trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('import')) {
        violations.push({ file: relPath, line: lineNum, rule: 'JSON_PARSE_UNPROTECTED', content: trimmed.substring(0, 120) });
      }
    }

    if (/process\.env\.[A-Z_]+[.[!]/.test(line)) {
      if (!/process\.env\.NODE_ENV/.test(line)) {
        violations.push({ file: relPath, line: lineNum, rule: 'ENV_DIRECT_ACCESS', content: trimmed.substring(0, 120) });
      }
    }

    if (/\[0\]\./.test(line)) {
      const context = lines.slice(Math.max(0, i - 3), i + 1).join(' ');
      const hasGuard = /\.length|Array\.isArray|\[0\]\?\./.test(context);
      if (!hasGuard && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        violations.push({ file: relPath, line: lineNum, rule: 'ARRAY_ZERO_ACCESS', content: trimmed.substring(0, 120) });
      }
    }
  }

  const fetchLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/await\s+fetch\s*\(/.test(lines[i])) fetchLines.push(i);
  }

  for (const fetchLine of fetchLines) {
    const windowEnd = Math.min(fetchLine + 15, lines.length);
    const window = lines.slice(fetchLine, windowEnd).join('\n');
    const hasOkCheck = /response\.ok|res\.ok|\.status\s*[=!<>]|\.status\s*===/.test(window);

    if (!hasOkCheck) {
      violations.push({
        file: relPath,
        line: fetchLine + 1,
        rule: 'FETCH_NO_OK_CHECK',
        content: lines[fetchLine].trim().substring(0, 120),
      });
    }
  }

  return violations;
}

const files = collectFiles(SRC_DIR).filter(f => !shouldSkipFile(f));
const allViolations: Violation[] = [];

for (const file of files) {
  allViolations.push(...scanFile(file));
}

console.log(`Archivos escaneados: ${files.length}`);

if (files.length === 0) {
  console.error(`FALLO: no hay ningun archivo que mirar en ${SRC_DIR}: no se ha comprobado nada.\n`);
  process.exit(1);
}

if (allViolations.length === 0) {
  console.log('No se encontraron patrones de riesgo en runtime.\n');
  process.exit(0);
} else {
  console.error(`\n  ${allViolations.length} violacion(es):\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} [${v.rule}]`);
    console.error(`    ${v.content}`);
  }
  process.exit(1);
}
