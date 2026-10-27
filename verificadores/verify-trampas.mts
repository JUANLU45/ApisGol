/**
 * verify-trampas.mts - Que nadie, tampoco una IA, pueda hacer trampa con los errores.
 *
 * QUE COMPRUEBA
 *   Los otros verificadores miran si un error se calla. Este mira que nadie los engañe:
 *   ni apagando comprobaciones, ni disfrazando la consola, ni dejando codigo donde no
 *   miran. El proyecto es lo que git tiene por proyecto: lo guardado y lo nuevo que no
 *   esta ignorado (git ls-files). Busca:
 *     1. MARCA_PARA_CALLAR  - la frase "callado a proposito" en cualquier parte del
 *                             codigo: la frase con la que se excusaria un silencio para
 *                             que un verificador no lo cuente. Escribirla es intentar
 *                             esconder un error.
 *     2. SILENCIADOR        - comentarios que apagan una comprobacion: @ts-ignore,
 *                             @ts-nocheck, @ts-expect-error, eslint-disable, istanbul
 *                             ignore, c8 ignore. Solo en comentarios: un patron o un
 *                             texto que los nombra no apaga nada.
 *     3. TIPO_FORZADO       - "as unknown as" o "as any as": obliga al comprobador de
 *                             tipos a tragarse un tipo, igual que un any.
 *     4. CONSOLA_DISFRAZADA - la consola con otro nombre (const escribir = console.error,
 *                             const { warn } = console, console['error']): asi una
 *                             llamada a la consola deja de parecerlo.
 *     5. AVISO_FALSO        - una funcion con nombre que recibe algo y solo lo escribe en
 *                             la consola o no hace nada; o un estado de aviso (setError...)
 *                             cuyo valor nunca se lee. Pasarles el error engaña a
 *                             verify-error-handling, que lo da por avisado.
 *     6. ARCHIVO_SIN_LEER   - codigo dentro de src/ que los verificadores se saltan
 *                             (scripts/, __tests__/, __mocks__/, node_modules/, .next/,
 *                             dist/, coverage/, .test., .spec.) o que git ignora.
 *     7. AJUSTE_QUE_ESCONDE - un next.config que ignora errores al construir; un
 *                             tsconfig sin strict, con una comprobacion apagada o con
 *                             otras carpetas dentro o fuera de las aprobadas; o un
 *                             comando de package.json cambiado.
 *   La carpeta de los verificadores no se mira con las reglas 1 a 5: sus reglas llevan
 *   escrito lo que buscan. La documentacion no se mira: no se compila ni se ejecuta.
 *   Las librerias de terceros (node_modules, en cualquier sitio) no se miran; si una
 *   aparece dentro de src/, salta la regla 6.
 *   Si git no responde o no hay ningun archivo de codigo, falla: no ha comprobado nada.
 *   No admite excepciones de ningun tipo.
 *
 * QUE NO COMPRUEBA (sus limites, dichos)
 *   - No juzga si un error se calla: eso es verify-error-handling.mts. Aqui solo se
 *     persigue lo que haria que ese y los demas verificadores dejaran de ver.
 *   - La regla 5 reconoce un aviso falso por su forma (solo consola, o nada). Una
 *     funcion que ademas hace otra cosa inutil con el error no sale.
 *   - La regla 7 compara cada tsconfig con lo escrito en TSCONFIGS y cada comando con
 *     COMANDOS: solo vigila lo que ahi se declara.
 *
 * QUE DEBE ADAPTAR QUIEN LO DESCARGUE
 *   - VERIFICADORES: la carpeta donde guarda sus verificadores.
 *   - DOCUMENTACION: su carpeta de documentacion, si la tiene.
 *   - DENTRO_DE_LA_APP y la lista que se pide a git en la regla 6: las carpetas con el
 *     codigo de su aplicacion (aqui, src/).
 *   - TSCONFIGS: lo que tiene hoy cada tsconfig de su proyecto (include, exclude y las
 *     comprobaciones encendidas). Vienen los valores con los que Next crea un proyecto.
 *   - COMANDOS: los comandos de su package.json que no deben cambiar.
 *   - MARCA, si sus verificadores aceptaran otra frase para excusar un silencio.
 *
 * REQUISITOS
 *   Node 22.18 o superior (ejecuta .mts sin compilar), git en el PATH y el paquete
 *   typescript instalado en el proyecto (lee el codigo con su analizador).
 *
 * COMO SE EJECUTA
 *   Desde la raiz del proyecto (tiene que ser un repositorio git):
 *     node verificadores/verify-trampas.mts
 *   Termina con 0 si no hay trampas y con 1 si hay alguna o no ha podido comprobar.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
const RAIZ = process.cwd();
// Los verificadores: sus reglas nombran lo que buscan, asi que no se miran con las reglas 1 a 5.
const VERIFICADORES = 'verificadores';
const CODIGO = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
// La documentacion: no se compila ni se ejecuta, y no se mira.
const DOCUMENTACION = 'docs';

interface Trampa {
  file: string;
  line: number;
  rule: string;
  content: string;
}

const trampas: Trampa[] = [];

function apuntar(file: string, line: number, rule: string, content: string): void {
  trampas.push({ file, line, rule, content: content.trim().substring(0, 120) });
}

// La lista del proyecto la da git. Si git no responde, no se ha comprobado nada.
function git(args: string[]): string[] {
  const r = spawnSync('git', args, { cwd: RAIZ, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    console.error(`No se pudo pedir a git la lista del proyecto (${r.error?.message ?? (r.stderr ?? '').trim()}): no se ha comprobado nada.`);
    process.exit(1);
  }
  return r.stdout.split('\0').filter(Boolean);
}

// --- 1 a 5: el codigo ---

// La frase con la que se excusaria un silencio para que un verificador no lo cuente.
const MARCA = /callado a prop[oó]sito/i;

const SILENCIADORES: ReadonlyArray<RegExp> = [
  /@ts-ignore\b/,
  /@ts-nocheck\b/,
  /@ts-expect-error\b/,
  /eslint-disable/,
  /istanbul\s+ignore/,
  /c8\s+ignore/,
];

// Los mismos nombres de aviso que verify-error-handling: con ellos da un error por avisado.
const NOMBRE_DE_AVISO = /error|fallo|falla|aviso|msg|mensaje|message|feedback|warn|alert|notif|toast|fail/i;

function tipoDeArchivo(ruta: string): ts.ScriptKind {
  if (ruta.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (ruta.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (/\.(js|mjs|cjs)$/.test(ruta)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

// Donde hay un comentario lo dice el analizador de TypeScript, que distingue un
// comentario de un texto o de un patron.
function comentarios(texto: string, sf: ts.SourceFile): Array<[number, number]> {
  const tramos = new Map<number, number>();
  const anota = (rangos: ts.CommentRange[] | undefined): void => {
    for (const r of rangos ?? []) tramos.set(r.pos, r.end);
  };
  const visitar = (n: ts.Node): void => {
    anota(ts.getLeadingCommentRanges(texto, n.getFullStart()));
    anota(ts.getTrailingCommentRanges(texto, n.getEnd()));
    for (const h of n.getChildren(sf)) visitar(h);
  };
  visitar(sf);
  return [...tramos];
}

function fila(sf: ts.SourceFile, posicion: number): number {
  return sf.getLineAndCharacterOfPosition(posicion).line + 1;
}

function sinParentesis(e: ts.Expression): ts.Expression {
  let x = e;
  while (ts.isParenthesizedExpression(x)) x = x.expression;
  return x;
}

function esLlamadaAConsola(e: ts.Expression): boolean {
  let x = sinParentesis(e);
  if (ts.isAwaitExpression(x) || ts.isVoidExpression(x)) x = sinParentesis(x.expression);
  return ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression)
    && ts.isIdentifier(x.expression.expression) && x.expression.expression.text === 'console';
}

type Funcion = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration;

// Recibe algo y solo lo escribe en la consola, o no hace nada con ello.
function soloConsolaONada(fn: Funcion): boolean {
  if (fn.parameters.length === 0 || !fn.body) return false;
  if (!ts.isBlock(fn.body)) return esLlamadaAConsola(fn.body);
  return fn.body.statements.every(s => ts.isExpressionStatement(s) && esLlamadaAConsola(s.expression));
}

function esFuncion(n: ts.Node | undefined): n is ts.FunctionExpression | ts.ArrowFunction {
  return n !== undefined && (ts.isFunctionExpression(n) || ts.isArrowFunction(n));
}

// La funcion con nombre que se declara en este nodo, si la hay.
function funcionConNombre(n: ts.Node): Funcion | null {
  if (ts.isFunctionDeclaration(n) && n.name) return n;
  if (ts.isMethodDeclaration(n)) return n;
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && esFuncion(n.initializer)) return n.initializer;
  if (ts.isPropertyAssignment(n) && esFuncion(n.initializer)) return n.initializer;
  return null;
}

function cuentaDeNombres(sf: ts.SourceFile): Map<string, number> {
  const cuenta = new Map<string, number>();
  const visitar = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) cuenta.set(n.text, (cuenta.get(n.text) ?? 0) + 1);
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return cuenta;
}

// const [valor, setError] = useState(...): si el valor no se lee nunca, el aviso no se ensena.
function estadoDeAvisoSinLeer(n: ts.VariableDeclaration, nombres: Map<string, number>): boolean {
  if (!ts.isArrayBindingPattern(n.name) || !n.initializer || !ts.isCallExpression(n.initializer)) return false;
  if (!/(^|\.)useState$/.test(n.initializer.expression.getText())) return false;
  const [valor, setter] = n.name.elements;
  if (!setter || ts.isOmittedExpression(setter) || !ts.isIdentifier(setter.name) || !NOMBRE_DE_AVISO.test(setter.name.text)) return false;
  if (!valor || ts.isOmittedExpression(valor)) return true;
  return ts.isIdentifier(valor.name) && (nombres.get(valor.name.text) ?? 0) <= 1;
}

// La consola usada sin llamarla directamente: guardada, pasada, desmontada o con corchetes.
function consolaDisfrazada(n: ts.Node): boolean {
  if (ts.isElementAccessExpression(n)) return ts.isIdentifier(n.expression) && n.expression.text === 'console';
  if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'console') {
    return !(ts.isCallExpression(n.parent) && n.parent.expression === n);
  }
  if (!ts.isIdentifier(n) || n.text !== 'console') return false;
  const p = n.parent;
  if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === n) return false;
  if (ts.isTypeOfExpression(p)) return false;
  return !((ts.isVariableDeclaration(p) || ts.isParameter(p)) && p.name === n);
}

function tipoForzado(n: ts.Node): boolean {
  if (!ts.isAsExpression(n)) return false;
  const dentro = sinParentesis(n.expression);
  return ts.isAsExpression(dentro)
    && (dentro.type.kind === ts.SyntaxKind.UnknownKeyword || dentro.type.kind === ts.SyntaxKind.AnyKeyword);
}

function revisarCodigo(rel: string): void {
  const texto = fs.readFileSync(path.join(RAIZ, rel), 'utf-8');
  const lineas = texto.split('\n');
  lineas.forEach((linea, i) => {
    if (MARCA.test(linea)) apuntar(rel, i + 1, 'MARCA_PARA_CALLAR', linea);
  });

  const sf = ts.createSourceFile(path.basename(rel), texto, ts.ScriptTarget.Latest, true, tipoDeArchivo(rel));
  for (const [inicio, fin] of comentarios(texto, sf)) {
    const trozos = texto.slice(inicio, fin).split('\n');
    trozos.forEach((trozo, i) => {
      if (SILENCIADORES.some(s => s.test(trozo))) {
        const n = fila(sf, inicio) + i;
        apuntar(rel, n, 'SILENCIADOR', lineas[n - 1] ?? trozo);
      }
    });
  }

  const nombres = cuentaDeNombres(sf);
  const visitar = (n: ts.Node): void => {
    const linea = (): string => lineas[fila(sf, n.getStart(sf)) - 1] ?? '';
    if (tipoForzado(n)) apuntar(rel, fila(sf, n.getStart(sf)), 'TIPO_FORZADO', linea());
    if (consolaDisfrazada(n)) apuntar(rel, fila(sf, n.getStart(sf)), 'CONSOLA_DISFRAZADA', linea());
    const fn = funcionConNombre(n);
    if (fn && soloConsolaONada(fn)) apuntar(rel, fila(sf, n.getStart(sf)), 'AVISO_FALSO', linea());
    if (ts.isVariableDeclaration(n) && estadoDeAvisoSinLeer(n, nombres)) apuntar(rel, fila(sf, n.getStart(sf)), 'AVISO_FALSO', linea());
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
}

// --- 6: codigo donde los verificadores no miran ---

// Las carpetas con el codigo de la aplicacion.
const DENTRO_DE_LA_APP = /^src\//;
// Lo que los demas verificadores no leen por su nombre o su carpeta.
const QUE_SE_SALTAN = /(^|\/)(scripts|__tests__|__mocks__|node_modules|\.next|dist|coverage)\/|\.(test|spec)\./;
const LIBRERIAS = /(^|\/)node_modules\//;

function revisarArchivosSinLeer(codigo: string[]): void {
  for (const rel of codigo) {
    if (DENTRO_DE_LA_APP.test(rel) && QUE_SE_SALTAN.test(rel)) {
      apuntar(rel, 1, 'ARCHIVO_SIN_LEER', 'los verificadores se saltan este archivo por su nombre o su carpeta');
    }
  }
  const ignorados = git(['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'src']);
  for (const rel of ignorados.filter(f => CODIGO.test(f))) {
    apuntar(rel, 1, 'ARCHIVO_SIN_LEER', 'git ignora este archivo de la aplicacion');
  }
}

// --- 7: ajustes que esconden errores ---

const COMPROBACIONES_ESTRICTAS = [
  'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply',
  'strictPropertyInitialization', 'noImplicitThis', 'alwaysStrict', 'useUnknownInCatchVariables',
];

interface TsconfigAprobado {
  ruta: string;
  include: string[];
  exclude: string[];
  /** Comprobaciones que hoy estan encendidas y no se pueden apagar. */
  encendidas: string[];
}

// Lo que tiene hoy cada tsconfig del proyecto (aqui, el que crea Next). Cambiarlo es
// cambiar este archivo. Si hay mas de uno, una entrada por cada uno.
const TSCONFIGS: ReadonlyArray<TsconfigAprobado> = [
  {
    ruta: 'tsconfig.json',
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
    encendidas: ['strict'],
  },
];

// Los comandos de package.json que no deben cambiar: si uno se cambia o desaparece, salta.
const COMANDOS: Readonly<Record<string, string>> = {
  typecheck: 'tsc --noEmit',
};

function lineaDe(texto: string, clave: string): number {
  const i = texto.split('\n').findIndex(l => l.includes(`"${clave}"`));
  return i === -1 ? 1 : i + 1;
}

function mismaLista(a: unknown, b: string[]): boolean {
  return Array.isArray(a) && a.length === b.length && b.every(x => a.includes(x));
}

function leerJson(rel: string): { texto: string; datos: Record<string, unknown> } | null {
  const ruta = path.join(RAIZ, rel);
  if (!fs.existsSync(ruta)) {
    apuntar(rel, 1, 'AJUSTE_QUE_ESCONDE', 'no existe: sin el no se comprueba lo que comprobaba');
    return null;
  }
  const texto = fs.readFileSync(ruta, 'utf-8');
  try {
    return { texto, datos: JSON.parse(texto) as Record<string, unknown> };
  } catch (error) {
    apuntar(rel, 1, 'AJUSTE_QUE_ESCONDE', `no se puede leer como JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function revisarTsconfig(t: TsconfigAprobado): void {
  const leido = leerJson(t.ruta);
  if (!leido) return;
  const opciones = (leido.datos.compilerOptions ?? {}) as Record<string, unknown>;
  for (const clave of t.encendidas) {
    if (opciones[clave] !== true) apuntar(t.ruta, lineaDe(leido.texto, clave), 'AJUSTE_QUE_ESCONDE', `"${clave}" tiene que estar en true`);
  }
  for (const clave of COMPROBACIONES_ESTRICTAS) {
    if (opciones[clave] === false) apuntar(t.ruta, lineaDe(leido.texto, clave), 'AJUSTE_QUE_ESCONDE', `"${clave}" apagada`);
  }
  if (!mismaLista(leido.datos.include, t.include)) {
    apuntar(t.ruta, lineaDe(leido.texto, 'include'), 'AJUSTE_QUE_ESCONDE', `"include" cambiado: tiene que ser ${JSON.stringify(t.include)}`);
  }
  if (!mismaLista(leido.datos.exclude, t.exclude)) {
    apuntar(t.ruta, lineaDe(leido.texto, 'exclude'), 'AJUSTE_QUE_ESCONDE', `"exclude" cambiado: tiene que ser ${JSON.stringify(t.exclude)}`);
  }
}

function revisarNextConfig(proyecto: string[]): void {
  for (const rel of proyecto.filter(f => /^next\.config\.(ts|js|mjs|cjs)$/.test(f))) {
    const texto = fs.readFileSync(path.join(RAIZ, rel), 'utf-8');
    const sf = ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, tipoDeArchivo(rel));
    const letras = texto.split('');
    for (const [inicio, fin] of comentarios(texto, sf)) {
      for (let i = inicio; i < fin; i++) if (letras[i] !== '\n') letras[i] = ' ';
    }
    const lineas = letras.join('').split('\n');
    lineas.forEach((linea, i) => {
      if (/ignoreBuildErrors\s*:\s*true|ignoreDuringBuilds\s*:\s*true/.test(linea)) {
        apuntar(rel, i + 1, 'AJUSTE_QUE_ESCONDE', linea);
      }
    });
  }
}

function revisarComandos(): void {
  const leido = leerJson('package.json');
  if (!leido) return;
  const scripts = (leido.datos.scripts ?? {}) as Record<string, unknown>;
  for (const [nombre, valor] of Object.entries(COMANDOS)) {
    if (scripts[nombre] !== valor) {
      apuntar('package.json', lineaDe(leido.texto, nombre), 'AJUSTE_QUE_ESCONDE', `el comando ${nombre} tiene que ser "${valor}"`);
    }
  }
}

// --- Principal ---

const proyecto = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
  .filter(f => fs.existsSync(path.join(RAIZ, f)));
const codigoEntero = proyecto.filter(f => CODIGO.test(f) && !f.startsWith(`${VERIFICADORES}/`) && !f.startsWith(`${DOCUMENTACION}/`));
const codigo = codigoEntero.filter(f => !LIBRERIAS.test(f));

if (codigo.length === 0) {
  console.error('No se ha encontrado ningun archivo de codigo en el proyecto: no se ha comprobado nada.\n');
  process.exit(1);
}

for (const rel of codigo) revisarCodigo(rel);
revisarArchivosSinLeer(codigoEntero);
for (const t of TSCONFIGS) revisarTsconfig(t);
revisarNextConfig(proyecto);
revisarComandos();

console.log(`Archivos de codigo del proyecto leidos: ${codigo.length} (la lista la da git).`);
console.log(`Librerias de terceros (carpetas node_modules) que no se miran: ${codigoEntero.length - codigo.length} archivos.`);
console.log(`${VERIFICADORES}/ no se mira con las reglas 1 a 5: sus reglas nombran lo que buscan.`);
console.log(`${DOCUMENTACION}/ no se mira: es documentacion, no se compila ni se ejecuta.`);

if (trampas.length === 0) {
  console.log('Sin trampas.\n');
  process.exit(0);
}

trampas.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
console.error(`\n  ${trampas.length} trampa(s):\n`);
for (const t of trampas) {
  console.error(`  ${t.file}:${t.line} [${t.rule}]`);
  console.error(`    ${t.content}`);
}
process.exit(1);
