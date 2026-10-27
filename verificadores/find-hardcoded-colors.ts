/**
 * find-hardcoded-colors.ts - Colores escritos a mano fuera de los archivos del tema.
 *
 * QUE COMPRUEBA
 *   Recorre src/ y avisa de cada color escrito directamente en el codigo o en los
 *   estilos (#hex, rgb(), rgba(), hsl(), hsla()) fuera de los archivos donde vive el
 *   tema (ALLOWED_PATHS). Un color a mano no cambia con el tema ni con el modo oscuro
 *   y se escapa de cualquier cambio de diseno.
 *   Archivos que mira: .ts, .tsx, .css y .scss. No entra en node_modules, .next ni dist.
 *   Si no encuentra ningun archivo que mirar, falla: un verde sin haber comprobado
 *   nada no vale.
 *
 * QUE NO COMPRUEBA (sus limites, dichos)
 *   - No distingue comentarios: un color escrito en un comentario tambien avisa.
 *   - El patron de hexadecimal (#, de 3 a 8 cifras) coge tambien un selector de id
 *     que parezca un color, por ejemplo #feed o #cafe en un .css.
 *   - Un color que usa una variable del tema, por ejemplo hsl(var(--primary)), avisa
 *     igual: el patron de hsl() no mira lo que lleva dentro.
 *   - No mira .js ni .jsx.
 *
 * QUE DEBE ADAPTAR QUIEN LO DESCARGUE
 *   - ALLOWED_PATHS: los archivos y carpetas donde vive el tema de su proyecto, y sus
 *     excepciones justificadas (por ejemplo, el HTML de un correo, que no puede leer
 *     variables CSS). Cada excepcion con su porque al lado.
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
 *     npx ts-node verificadores/find-hardcoded-colors.ts
 *   Termina con 0 si no encuentra nada y con 1 si encuentra algun color o no hay
 *   archivos que mirar.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';

let archivosMirados = 0;

// Donde vive el tema: ahi los colores se escriben una vez. Lo demas los usa a traves
// de variables. Cada excepcion nueva, con su porque al lado.
const ALLOWED_PATHS = [
  'src/config/theme',
  'src/app/globals.css',
  'tailwind.config',
];

const COLOR_PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/g,
  /rgba?\([^)]+\)/g,
  /hsla?\([^)]+\)/g,
];

interface ColorMatch {
  file: string;
  line: number;
  code: string;
  color: string;
}

function isAllowedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWED_PATHS.some(allowed => normalized.includes(allowed));
}

function scanDirectory(dir: string, results: ColorMatch[] = []): ColorMatch[] {
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!entry.includes('node_modules') && !entry.includes('.next') && !entry.includes('dist')) {
        scanDirectory(fullPath, results);
      }
    } else if (stat.isFile() && /\.(ts|tsx|css|scss)$/.test(entry)) {
      if (isAllowedPath(fullPath)) continue;
      archivosMirados += 1;

      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        COLOR_PATTERNS.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            matches.forEach(color => {
              results.push({
                file: relative(process.cwd(), fullPath),
                line: idx + 1,
                code: line.trim(),
                color,
              });
            });
          }
        });
      });
    }
  }

  return results;
}

// src/ junto a la carpeta de este verificador, no desde donde se le lance.
const SRC_DIR = join(resolve(__dirname, '..'), 'src');
const results = scanDirectory(SRC_DIR);
console.log(`Archivos mirados: ${archivosMirados}`);

if (archivosMirados === 0) {
  console.error(`FALLO: no hay ningun archivo que mirar en ${SRC_DIR}: no se ha comprobado nada.\n`);
  process.exit(1);
}

if (results.length === 0) {
  console.log('No se encontraron colores hardcodeados fuera de archivos permitidos.\n');
  process.exit(0);
} else {
  console.error(`\n  ${results.length} colores hardcodeados:\n`);

  const grouped: Record<string, ColorMatch[]> = {};
  results.forEach(match => {
    if (!grouped[match.file]) grouped[match.file] = [];
    grouped[match.file].push(match);
  });

  Object.entries(grouped).forEach(([file, matches]) => {
    console.error(`  ${file}`);
    matches.forEach(match => {
      console.error(`    Linea ${match.line}: ${match.color}`);
    });
  });

  console.error('\n  Los colores deben estar en src/config/theme/\n');
  process.exit(1);
}
