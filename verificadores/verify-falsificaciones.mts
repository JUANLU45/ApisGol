/**
 * verify-falsificaciones.mts - Lo que hace pasar por bueno algo que nadie ha comprobado.
 *
 * QUE COMPRUEBA
 *   Lee src/ con el comprobador de tipos de TypeScript del proyecto y su tsconfig.json: el
 *   programa entero con sus tipos, no el texto de cada linea. Las pruebas (.test., .spec.,
 *   __tests__/) no se leen aqui: las persigue la regla 6 de verify-trampas.mts.
 *     1. COMPROBACION_A_MANO - una funcion que le dice al comprobador "esto es un T" (x is T,
 *                              asserts x is T) con una comprobacion escrita a mano: el
 *                              comprobador se la cree sin mirar si lo mira todo. Solo vale la
 *                              que hace un esquema de zod, sola: return
 *                              Esquema.safeParse(x).success.
 *     2. NOTA_QUE_CITA_MAL   - un comentario que cita archivo:linea de algo que no existe: el
 *                              archivo no esta, no llega a esa linea, o su nombre vale para
 *                              varios archivos y no se sabe cual. La ruta puede llevar
 *                              espacios y partirse entre dos lineas del comentario.
 *     3. VALOR_POR_DEFECTO   - si falta un dato se pone vacio, 0, false, [] o {} sin avisar:
 *                              con ??, ||, ??=, ||=, o como valor por defecto en la firma de
 *                              una funcion o al desmontar un objeto.
 *     4. RECORTE_CALLADO     - una lista se corta en un numero fijo (slice con un final fijo,
 *                              o un principio fijo que no es 0; splice con un solo numero;
 *                              lista.length = n), o una consulta de Firestore se queda en los
 *                              primeros (limit, limitToLast) sin pasar de pagina en esa misma
 *                              funcion (startAfter, startAt, endBefore, endAt u offset). Un
 *                              numero fijo es el que el comprobador de tipos sabe de antemano
 *                              (3, -1, o una constante como MAXIMO = 100); partir una lista
 *                              por la mitad o pasar de pagina con cuentas no tira nada.
 *     5. ESCRITURA_SIN_FORMA - una escritura en Firestore por una referencia sin forma
 *                              declarada (DocumentData o any): sin withConverter nadie dice
 *                              que forma tiene lo que se guarda.
 *     6. FICHA_QUE_CRECE     - lo que va sumando a una lista dentro de una ficha: arrayUnion,
 *                              o una escritura con una lista hecha con lo que habia mas lo
 *                              nuevo ([...a, b] o a.concat(b)). Una ficha tiene un tope de
 *                              1 MiB.
 *     7. CODIGO_SIN_USO      - algo exportado que nadie usa, ni en su archivo ni fuera, o un
 *                              archivo que nadie carga. Cuentan como usados: los nombres que
 *                              el propio Next comprueba en cada page, layout y route, el
 *                              default de not-found, sitemap y robots, el middleware y la
 *                              instrumentacion de Next, lo que lanzan los comandos de
 *                              package.json y lo que importa cualquier otro archivo de codigo
 *                              del proyecto (pruebas, verificadores, comandos y
 *                              configuracion).
 *     8. RESULTADO_TIRADO    - Promise.allSettled cuyo resultado nadie mira en esa funcion (ni
 *                              "rejected" ni .reason): los que fallan se pierden sin avisar.
 *     9. CODIGO_COMENTADO    - un comentario que es codigo: se deja de ejecutar sin que nadie
 *                              lo diga.
 *   Si no lee ningun archivo, falla: un verde sin haber comprobado nada no vale.
 *
 * QUE NO COMPRUEBA (sus limites, dichos)
 *   - Un dato sin tipo dado por bueno sin escribir as no lo mira este verificador: eso lo
 *     caza ESLint con typescript-eslint en modo estricto con tipos (no-unsafe-assignment,
 *     -member-access, -call, -argument y -return).
 *   - La 2 solo comprueba que lo citado existe, no que la nota diga la verdad; una nota que
 *     no cita nada no la puede comprobar ninguna regla. Una segunda linea citada sin su
 *     archivo (":142") no se comprueba.
 *   - La 4 no sabe si un recorte es ensenar los primeros a proposito: sale igual, y lo
 *     decide quien lo lea.
 *   - La 6 solo ve la lista escrita en la propia escritura, no la que llega en una variable.
 *   - La 7 cuenta como uso cualquier referencia, tambien la de una funcion que a su vez nadie
 *     usa (sale esa, y al quitarla sale la siguiente). Solo conoce como entradas de Next los
 *     archivos page, layout, route, not-found, sitemap y robots de src/app, ademas de
 *     src/middleware.ts y src/instrumentation.ts: otros archivos especiales de Next (loading,
 *     error, template, default, global-error, icon, opengraph-image...) saldran como codigo
 *     sin uso.
 *   - La 8 da por mirado el resultado que se devuelve o se pasa a otro.
 *   - La 9 reconoce el codigo porque se lee sin errores y hace algo (una llamada con el
 *     parentesis pegado, una asignacion, una declaracion...): una frase como "Cabecera
 *     (titulo y plan)" no es una llamada; los comentarios de documentacion (los que empiezan
 *     por barra y dos asteriscos) no se miran.
 *   - Las reglas 1 y 3 no admiten excepciones: en un proyecto que no las haya seguido daran
 *     muchos avisos.
 *
 * QUE DEBE ADAPTAR QUIEN LO DESCARGUE
 *   - PROYECTOS: cada carpeta de codigo con su tsconfig (aqui, src/ con tsconfig.json). Si
 *     tiene otra parte con su propio tsconfig, por ejemplo unas funciones de servidor, se
 *     anade.
 *   - nombresDeEntrada: los archivos que Next carga por su cuenta y los nombres que lee de
 *     cada uno. Si usa otros archivos especiales de Next, van ahi.
 *   - resolverDesdeFuera: el alias '@/' apunta a src/; si su alias es otro, se cambia.
 *   - PRUEBAS y SIN_MIRAR: lo que no se lee.
 *   - esLaDeZod: la regla 1 solo acepta zod; si usa otra libreria de esquemas, se cambia ahi.
 *   - Las reglas 4, 5 y 6 reconocen Firestore (firebase-admin y firebase/firestore); sin
 *     Firestore esas partes no saltan nunca.
 *
 * REQUISITOS
 *   Node 22.18 o superior (ejecuta .mts sin compilar), git en el PATH (la lista del proyecto
 *   la da git), el paquete typescript instalado en el proyecto y su tsconfig.json.
 *
 * COMO SE EJECUTA
 *   Desde la raiz del proyecto (tiene que ser un repositorio git):
 *     node verificadores/verify-falsificaciones.mts
 *   Termina con 0 si no encuentra nada y con 1 si encuentra algo o no ha leido ningun archivo.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface Hallazgo {
  file: string;
  line: number;
  rule: string;
  codigo: string;
  motivo: string;
}

interface Proyecto {
  tsconfig: string;
  carpeta: string;
}

interface Leido {
  checker: ts.TypeChecker;
  archivos: ts.SourceFile[];
}

interface ArchivosDelProyecto {
  lista: readonly string[];
  conjunto: ReadonlySet<string>;
  lineas: Map<string, number>;
}

interface UsosDeFuera {
  nombres: Set<string>;
  archivos: Set<string>;
}

const RAIZ = process.cwd();
// Cada carpeta de codigo con su tsconfig. Si hay otra parte con su propio tsconfig, otra entrada.
const PROYECTOS: readonly Proyecto[] = [
  { tsconfig: 'tsconfig.json', carpeta: 'src' },
];
const PRUEBAS = /(^|\/)__tests__\/|\.(test|spec)\./;
const CODIGO = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
const SIN_MIRAR = new Set(['node_modules', '.next', '.git', 'coverage', 'out', 'build']);

const hallazgos: Hallazgo[] = [];

function rel(archivo: string): string {
  return path.relative(RAIZ, archivo).split(path.sep).join('/');
}

function apuntarEnLinea(sf: ts.SourceFile, linea: number, rule: string, motivo: string): void {
  const codigo = sf.text.split('\n')[linea - 1];
  hallazgos.push({ file: rel(sf.fileName), line: linea, rule, codigo: codigo.trim().substring(0, 120), motivo });
}

function apuntar(sf: ts.SourceFile, nodo: ts.Node, rule: string, motivo: string): void {
  apuntarEnLinea(sf, sf.getLineAndCharacterOfPosition(nodo.getStart(sf)).line + 1, rule, motivo);
}

function recorrer(n: ts.Node, visitar: (n: ts.Node) => void): void {
  visitar(n);
  ts.forEachChild(n, h => {
    recorrer(h, visitar);
  });
}

function sinEnvoltorio(e: ts.Expression): ts.Expression {
  let x = e;
  while (ts.isParenthesizedExpression(x) || ts.isAwaitExpression(x) || ts.isNonNullExpression(x)
    || ts.isAsExpression(x) || ts.isSatisfiesExpression(x)) x = x.expression;
  return x;
}

// El programa de cada parte con su tsconfig de verdad. Sin el tsconfig, esa parte no existe aqui.
function leerProyecto(p: Proyecto): Leido | null {
  const ruta = path.join(RAIZ, p.tsconfig);
  if (!fs.existsSync(ruta)) return null;
  const errores: string[] = [];
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: d => {
      errores.push(ts.flattenDiagnosticMessageText(d.messageText, ' '));
    },
  };
  const leida = ts.getParsedCommandLineOfConfigFile(ruta, { incremental: false, noEmit: true }, host);
  if (!leida) throw new Error(`no se pudo leer ${p.tsconfig}: ${errores.join('; ')}`);
  const programa = ts.createProgram({ rootNames: leida.fileNames, options: leida.options });
  const archivos = programa.getSourceFiles().filter(sf => {
    const r = rel(sf.fileName);
    return !sf.isDeclarationFile && r.startsWith(`${p.carpeta}/`) && !PRUEBAS.test(r);
  });
  return { checker: programa.getTypeChecker(), archivos };
}

function simboloReal(checker: ts.TypeChecker, s: ts.Symbol): ts.Symbol {
  return (s.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(s) : s;
}

function nombreDelTipo(t: ts.Type): string {
  return (t.aliasSymbol ?? t.getSymbol())?.getName() ?? '';
}

// Lo declarado en los tipos de Firestore (el del servidor o el del navegador).
function esDeFirestore(checker: ts.TypeChecker, nodo: ts.Node): boolean {
  const s = checker.getSymbolAtLocation(nodo);
  if (!s) return false;
  return (simboloReal(checker, s).declarations ?? []).some(d =>
    /\/node_modules\/(@firebase\/firestore|firebase\/firestore|@google-cloud\/firestore)\//.test(d.getSourceFile().fileName));
}

// --- 1: la comprobacion escrita a mano ---

function cuerpoDe(n: ts.Node): ts.ConciseBody | undefined {
  if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)) return n.body;
  return undefined;
}

// return Esquema.safeParse(x).success, sola, con el safeParse de zod.
function esLaDeZod(checker: ts.TypeChecker, cuerpo: ts.ConciseBody): boolean {
  let e: ts.Expression | undefined;
  if (ts.isBlock(cuerpo)) {
    if (cuerpo.statements.length !== 1) return false;
    const unica = cuerpo.statements[0];
    if (!ts.isReturnStatement(unica)) return false;
    e = unica.expression;
  } else {
    e = cuerpo;
  }
  if (!e) return false;
  const x = sinEnvoltorio(e);
  if (!ts.isPropertyAccessExpression(x) || x.name.text !== 'success' || !ts.isCallExpression(x.expression)) return false;
  const llamada = x.expression.expression;
  if (!ts.isPropertyAccessExpression(llamada) || llamada.name.text !== 'safeParse') return false;
  const s = checker.getSymbolAtLocation(llamada.name);
  return (s?.declarations ?? []).some(d => d.getSourceFile().fileName.includes('/node_modules/zod/'));
}

function comprobacionAMano(checker: ts.TypeChecker, sf: ts.SourceFile, n: ts.SignatureDeclaration): void {
  if (!n.type || !ts.isTypePredicateNode(n.type)) return;
  const cuerpo = cuerpoDe(n);
  // Una firma sin cuerpo (una interfaz) no comprueba nada: se juzga donde se escribe la comprobacion.
  if (!cuerpo || esLaDeZod(checker, cuerpo)) return;
  apuntar(sf, n, 'COMPROBACION_A_MANO', 'dice al comprobador que el dato es de un tipo con una comprobacion escrita a mano, y se la cree sin mirar si lo mira todo: usa un esquema de zod (return Esquema.safeParse(x).success)');
}

// --- 3: el valor por defecto ---

const RELLENOS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken, ts.SyntaxKind.BarBarEqualsToken,
]);

// Vacio, 0, false, [] o {}: un valor que no dice que el dato falta.
function valorVacio(e: ts.Expression): boolean {
  const x = sinEnvoltorio(e);
  if (x.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) return x.text === '';
  if (ts.isNumericLiteral(x)) return Number(x.text) === 0;
  if (ts.isArrayLiteralExpression(x)) return x.elements.length === 0;
  return ts.isObjectLiteralExpression(x) && x.properties.length === 0;
}

// --- 4: el recorte ---

function esLista(checker: ts.TypeChecker, t: ts.Type): boolean {
  const u = checker.getNonNullableType(t);
  const partes = u.isUnion() ? u.types : [u];
  return partes.length > 0 && partes.every(p => checker.isArrayType(p) || checker.isTupleType(p));
}

const CONSULTAS = new Set(['Query', 'CollectionReference', 'CollectionGroup']);
const PAGINAR = new Set(['startAfter', 'startAt', 'endBefore', 'endAt', 'offset']);

function esLimite(checker: ts.TypeChecker, c: ts.CallExpression): boolean {
  const e = c.expression;
  if (ts.isPropertyAccessExpression(e) && (e.name.text === 'limit' || e.name.text === 'limitToLast')) {
    return CONSULTAS.has(nombreDelTipo(checker.getNonNullableType(checker.getTypeAtLocation(e.expression))));
  }
  return ts.isIdentifier(e) && (e.text === 'limit' || e.text === 'limitToLast') && esDeFirestore(checker, e);
}

function suFuncion(n: ts.Node): ts.Node {
  let f: ts.Node = n.parent;
  while (!ts.isSourceFile(f) && !ts.isFunctionLike(f)) f = f.parent;
  return f;
}

function paginaEnSuFuncion(n: ts.Node): boolean {
  let pagina = false;
  recorrer(suFuncion(n), x => {
    if (ts.isIdentifier(x) && PAGINAR.has(x.text)) pagina = true;
  });
  return pagina;
}

// --- 5 y 6: las escrituras en Firestore ---

const ESCRIBE = new Set(['set', 'update', 'create', 'add']);
const REFERENCIAS = new Set(['DocumentReference', 'CollectionReference']);
const TANDAS = new Set(['Transaction', 'WriteBatch', 'BulkWriter']);
const FUNCIONES_QUE_ESCRIBEN = new Set(['setDoc', 'updateDoc', 'addDoc']);

interface Escritura {
  referencia: ts.Expression;
  datos: ts.Expression | undefined;
}

// ref.set(datos), coleccion.add(datos), transaccion.set(ref, datos) o setDoc(ref, datos).
function escrituraDeFirestore(checker: ts.TypeChecker, c: ts.CallExpression): Escritura | null {
  const e = c.expression;
  const [primero] = c.arguments;
  if (ts.isIdentifier(e) && FUNCIONES_QUE_ESCRIBEN.has(e.text) && esDeFirestore(checker, e)) {
    return c.arguments.length > 0 ? { referencia: primero, datos: c.arguments.at(1) } : null;
  }
  if (!ts.isPropertyAccessExpression(e) || !ESCRIBE.has(e.name.text)) return null;
  const quien = nombreDelTipo(checker.getNonNullableType(checker.getTypeAtLocation(e.expression)));
  if (REFERENCIAS.has(quien)) return { referencia: e.expression, datos: c.arguments.at(0) };
  if (TANDAS.has(quien) && c.arguments.length > 0) return { referencia: primero, datos: c.arguments.at(1) };
  return null;
}

function esReferenciaDeTipo(t: ts.Type): t is ts.TypeReference {
  return 'target' in t;
}

// La forma de lo que se guarda por esa referencia es su primer tipo (DocumentReference<T>).
function sinForma(checker: ts.TypeChecker, t: ts.Type): boolean {
  const u = checker.getNonNullableType(t);
  if ((u.flags & ts.TypeFlags.Any) !== 0 || !esReferenciaDeTipo(u)) return true;
  const forma = checker.getTypeArguments(u).at(0);
  return forma === undefined || (forma.flags & ts.TypeFlags.Any) !== 0 || nombreDelTipo(forma) === 'DocumentData';
}

function listaQueCrece(datos: ts.Expression): boolean {
  const o = sinEnvoltorio(datos);
  if (!ts.isObjectLiteralExpression(o)) return false;
  return o.properties.some(p => {
    if (!ts.isPropertyAssignment(p)) return false;
    const v = sinEnvoltorio(p.initializer);
    if (ts.isArrayLiteralExpression(v)) return v.elements.some(x => ts.isSpreadElement(x));
    return ts.isCallExpression(v) && ts.isPropertyAccessExpression(v.expression) && v.expression.name.text === 'concat';
  });
}

// --- 8: el resultado de allSettled ---

function esAllSettled(c: ts.CallExpression): boolean {
  return c.expression.getText().replace(/\s+/g, '') === 'Promise.allSettled';
}

// Tirado si se queda suelto; guardado, solo cuenta si en su funcion se mira "rejected" o .reason.
function resultadoMirado(c: ts.CallExpression): boolean {
  let n: ts.Node = c;
  while (ts.isAwaitExpression(n.parent) || ts.isParenthesizedExpression(n.parent)) n = n.parent;
  const p = n.parent;
  if (ts.isExpressionStatement(p) || ts.isVoidExpression(p)) return false;
  if (!ts.isVariableDeclaration(p)) return true;
  let mira = false;
  recorrer(suFuncion(p), x => {
    if ((ts.isStringLiteralLike(x) && x.text === 'rejected') || (ts.isPropertyAccessExpression(x) && x.name.text === 'reason')) mira = true;
  });
  return mira;
}

// Un numero que el comprobador sabe de antemano: 3, -1 o una constante (MAXIMO = 100).
function numeroFijo(checker: ts.TypeChecker, e: ts.Expression | undefined): boolean {
  return e !== undefined && checker.getTypeAtLocation(e).isNumberLiteral();
}

function esCero(checker: ts.TypeChecker, e: ts.Expression): boolean {
  const t = checker.getTypeAtLocation(e);
  return t.isNumberLiteral() && t.value === 0;
}

// lista.slice(0, 3), lista.slice(2) o lista.splice(5): se queda con una parte fija.
function cortaEnUnNumero(checker: ts.TypeChecker, c: ts.CallExpression, metodo: string): boolean {
  const desde = c.arguments.at(0);
  const hasta = c.arguments.at(1);
  if (metodo === 'splice') return c.arguments.length === 1;
  if (hasta) return numeroFijo(checker, hasta);
  return desde !== undefined && numeroFijo(checker, desde) && !esCero(checker, desde);
}

function revisarLlamada(checker: ts.TypeChecker, sf: ts.SourceFile, c: ts.CallExpression): void {
  const e = c.expression;
  if (ts.isPropertyAccessExpression(e) && (e.name.text === 'slice' || e.name.text === 'splice')
    && esLista(checker, checker.getTypeAtLocation(e.expression)) && cortaEnUnNumero(checker, c, e.name.text)) {
    apuntar(sf, c, 'RECORTE_CALLADO', `se corta una lista en un numero fijo con ${e.name.text}: lo de mas se tira sin decirlo`);
  }
  if (esLimite(checker, c) && !paginaEnSuFuncion(c)) {
    apuntar(sf, c, 'RECORTE_CALLADO', 'la consulta se queda en los primeros (limit) y su funcion no pasa de pagina: lo de mas no se lee y nadie lo dice');
  }
  const nombre = ts.isPropertyAccessExpression(e) ? e.name : e;
  if (ts.isIdentifier(nombre) && nombre.text === 'arrayUnion' && esDeFirestore(checker, nombre)) {
    apuntar(sf, c, 'FICHA_QUE_CRECE', 'arrayUnion va sumando a una lista dentro de la ficha: puede crecer hasta el tope de 1 MiB de una ficha');
  }
  const escritura = escrituraDeFirestore(checker, c);
  if (escritura) {
    if (sinForma(checker, checker.getTypeAtLocation(escritura.referencia))) {
      apuntar(sf, c, 'ESCRITURA_SIN_FORMA', 'se escribe en Firestore por una referencia sin forma declarada (DocumentData): sin withConverter nadie dice que forma tiene lo que se guarda');
    }
    if (escritura.datos && listaQueCrece(escritura.datos)) {
      apuntar(sf, c, 'FICHA_QUE_CRECE', 'se guarda una lista hecha con lo que habia mas lo nuevo: la ficha crece en cada escritura');
    }
  }
  if (esAllSettled(c) && !resultadoMirado(c)) {
    apuntar(sf, c, 'RESULTADO_TIRADO', 'Promise.allSettled y en su funcion nadie mira los que fallan (rejected o reason): se pierden sin avisar');
  }
}

// --- 2 y 9: los comentarios ---

interface Comentario {
  texto: string;
  inicio: number;
  bloque: boolean;
  documentacion: boolean;
}

// Donde hay un comentario lo dice el analizador de TypeScript, que distingue un comentario de un
// texto o de un patron.
function comentariosDe(sf: ts.SourceFile): Comentario[] {
  const tramos = new Map<number, ts.CommentRange>();
  const anota = (rangos: ts.CommentRange[] | undefined): void => {
    for (const r of rangos ?? []) tramos.set(r.pos, r);
  };
  const visitar = (n: ts.Node): void => {
    anota(ts.getLeadingCommentRanges(sf.text, n.getFullStart()));
    anota(ts.getTrailingCommentRanges(sf.text, n.getEnd()));
    for (const h of n.getChildren(sf)) visitar(h);
  };
  visitar(sf);
  return [...tramos.values()].map(r => {
    const crudo = sf.text.slice(r.pos, r.end);
    const bloque = r.kind === ts.SyntaxKind.MultiLineCommentTrivia;
    const texto = bloque ? crudo.slice(2, -2).split('\n').map(l => l.replace(/^\s*\*?/, '')).join('\n') : crudo.slice(2);
    return { texto, inicio: r.pos, bloque, documentacion: crudo.startsWith('/**') };
  });
}

const CITA = /([^\s()`'",;]+\.(?:tsx?|mts|cts|mjs|cjs|jsx?|md|json|ya?ml|rules|css)):(\d+)(?:-(\d+))?/g;

function lineasDe(archivos: ArchivosDelProyecto, r: string): number {
  const sabidas = archivos.lineas.get(r);
  if (sabidas !== undefined) return sabidas;
  const texto = fs.readFileSync(path.join(RAIZ, r), 'utf-8');
  const n = texto.split('\n').length - (texto.endsWith('\n') ? 1 : 0);
  archivos.lineas.set(r, n);
  return n;
}

interface Cita {
  ruta: string;
  desde: number;
  hasta: number;
  // El texto del comentario antes de la ruta, con los espacios y los saltos de linea juntados en uno:
  // la ruta puede llevar espacios (docs/mi carpeta/...) y partirse entre dos lineas.
  antes: string;
}

function revisarCita(sf: ts.SourceFile, linea: number, cita: Cita, archivos: ArchivosDelProyecto): void {
  const { ruta: citada, desde, hasta, antes } = cita;
  const aqui = path.posix.dirname(rel(sf.fileName));
  const directos = [citada, path.posix.join(aqui, citada)].map(c => path.posix.normalize(c)).filter(c => archivos.conjunto.has(c));
  const limpia = path.posix.normalize(citada).replace(/^(\.\.?\/)+/, '');
  const candidatos = directos.length > 0 ? directos.slice(0, 1) : archivos.lista.filter(f => f.endsWith(`/${limpia}`)
    || (f.endsWith(` ${limpia}`) && antes.endsWith(f.slice(0, f.length - limpia.length))));
  if (candidatos.length === 0) {
    apuntarEnLinea(sf, linea, 'NOTA_QUE_CITA_MAL', `cita ${citada}:${String(desde)} y ese archivo no existe en el proyecto`);
    return;
  }
  if (candidatos.length > 1) {
    apuntarEnLinea(sf, linea, 'NOTA_QUE_CITA_MAL', `cita ${citada}:${String(desde)} y ese nombre vale para ${String(candidatos.length)} archivos: escribe la ruta para que se pueda comprobar`);
    return;
  }
  const total = lineasDe(archivos, candidatos[0]);
  if (desde < 1 || Math.max(desde, hasta) > total) {
    apuntarEnLinea(sf, linea, 'NOTA_QUE_CITA_MAL', `cita ${candidatos[0]}:${String(Math.max(desde, hasta))} y ese archivo tiene ${String(total)} lineas`);
  }
}

const PISTA_DE_CODIGO = /[=;(){}]/;
const HACE: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.VariableStatement, ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.WhileStatement, ts.SyntaxKind.ThrowStatement, ts.SyntaxKind.TryStatement, ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.ExportDeclaration, ts.SyntaxKind.ExportAssignment, ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration, ts.SyntaxKind.AwaitExpression, ts.SyntaxKind.JsxElement, ts.SyntaxKind.JsxSelfClosingElement,
]);

// Una llamada de codigo lleva el parentesis pegado (guardar(x)); en una frase va separado
// (Cabecera (titulo y plan)).
function llamadaPegada(n: ts.CallExpression | ts.NewExpression, texto: string): boolean {
  return /[(<?]/.test(texto.charAt(n.expression.getEnd()));
}

// Codigo: se lee sin ningun error de escritura y hace algo (llama, asigna, declara...).
function esCodigo(texto: string, tsx: boolean): boolean {
  const limpio = texto.trim();
  if (!PISTA_DE_CODIGO.test(limpio)) return false;
  const nombre = tsx ? 'comentario.tsx' : 'comentario.ts';
  const salida = ts.transpileModule(limpio, { reportDiagnostics: true, fileName: nombre, compilerOptions: { jsx: ts.JsxEmit.Preserve } });
  if ((salida.diagnostics ?? []).length > 0) return false;
  const sf = ts.createSourceFile(nombre, limpio, ts.ScriptTarget.Latest, true, tsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let hace = false;
  recorrer(sf, n => {
    if ((ts.isCallExpression(n) || ts.isNewExpression(n)) ? llamadaPegada(n, limpio)
      : HACE.has(n.kind) || (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken)) hace = true;
  });
  return hace;
}

function revisarComentarios(sf: ts.SourceFile, archivos: ArchivosDelProyecto): void {
  const tsx = sf.fileName.endsWith('.tsx');
  for (const c of comentariosDe(sf)) {
    const fila = sf.getLineAndCharacterOfPosition(c.inicio).line + 1;
    for (const m of c.texto.matchAll(CITA)) {
      const previo = c.texto.slice(0, m.index);
      const linea = fila + previo.split('\n').length - 1;
      const desde = Number(m[2]);
      const cita: Cita = { ruta: m[1], desde, hasta: m[3] ? Number(m[3]) : desde, antes: previo.replace(/\s+/g, ' ') };
      revisarCita(sf, linea, cita, archivos);
    }
    if (!c.documentacion && esCodigo(c.texto, tsx)) {
      apuntarEnLinea(sf, fila, 'CODIGO_COMENTADO', 'este comentario es codigo que no se ejecuta: o se borra, o vuelve a ser codigo');
    }
  }
}

// --- 1 a 6, 8 y 9 en cada archivo ---

function revisarArchivo(l: Leido, sf: ts.SourceFile, archivos: ArchivosDelProyecto): void {
  recorrer(sf, n => {
    if (ts.isFunctionLike(n)) comprobacionAMano(l.checker, sf, n);
    if (ts.isBinaryExpression(n) && RELLENOS.has(n.operatorToken.kind) && valorVacio(n.right)) {
      apuntar(sf, n.operatorToken, 'VALOR_POR_DEFECTO', 'si falta el dato se pone un valor vacio (vacio, 0, false, [] o {}) y nadie se entera de que faltaba');
    }
    if ((ts.isBindingElement(n) || ts.isParameter(n)) && n.initializer && valorVacio(n.initializer)) {
      apuntar(sf, n, 'VALOR_POR_DEFECTO', 'si no llega el dato se pone un valor vacio por defecto y nadie se entera de que faltaba');
    }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left)
      && n.left.name.text === 'length' && esLista(l.checker, l.checker.getTypeAtLocation(n.left.expression))
      && numeroFijo(l.checker, n.right)) {
      apuntar(sf, n, 'RECORTE_CALLADO', 'se corta una lista en un numero fijo cambiando su length: lo de mas se tira sin decirlo');
    }
    if (ts.isCallExpression(n)) revisarLlamada(l.checker, sf, n);
  });
  revisarComentarios(sf, archivos);
}

// --- 7: el codigo sin uso ---

// Lo que Next comprueba en cada entrada (los tipos que genera en .next/types para cada page y
// cada route).
const DE_SEGMENTO = ['config', 'generateStaticParams', 'revalidate', 'dynamic', 'dynamicParams', 'fetchCache', 'preferredRegion', 'runtime', 'maxDuration'];
const DE_PAGINA = new Set(['default', ...DE_SEGMENTO, 'metadata', 'generateMetadata', 'viewport', 'generateViewport', 'experimental_ppr']);
const DE_RUTA = new Set(['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH', ...DE_SEGMENTO]);

// Los nombres que se cargan por su cuenta en ese archivo, o "todos". null si no es una entrada.
function nombresDeEntrada(r: string, comandos: ReadonlySet<string>): ReadonlySet<string> | 'todos' | null {
  if (comandos.has(r)) return 'todos';
  const app = /^src\/app\/(?:.*\/)?(page|layout|route|not-found|sitemap|robots)\.(ts|tsx)$/.exec(r);
  if (app) {
    if (app[1] === 'route') return DE_RUTA;
    if (app[1] === 'page' || app[1] === 'layout') return DE_PAGINA;
    return new Set(['default']);
  }
  if (r === 'src/middleware.ts') return new Set(['default', 'middleware', 'config']);
  if (r === 'src/instrumentation.ts') return new Set(['register', 'onRequestError']);
  return null;
}

function entradasDeComandos(): Set<string> {
  const ruta = path.join(RAIZ, 'package.json');
  const out = new Set<string>();
  if (!fs.existsSync(ruta)) return out;
  const datos: unknown = JSON.parse(fs.readFileSync(ruta, 'utf-8'));
  if (typeof datos !== 'object' || datos === null || !('scripts' in datos)) return out;
  const scripts = datos.scripts;
  if (typeof scripts !== 'object' || scripts === null) return out;
  const valores: unknown[] = Object.values(scripts);
  for (const valor of valores) {
    if (typeof valor !== 'string') continue;
    for (const m of valor.matchAll(/(?:^|[\s'"])(src\/[^\s'"]+\.(?:ts|tsx))/g)) out.add(m[1]);
  }
  return out;
}

function resolverDesdeFuera(especificador: string, desde: string): string | null {
  let base: string;
  if (especificador.startsWith('@/')) base = path.posix.join('src', especificador.slice(2));
  else if (especificador.startsWith('./') || especificador.startsWith('../')) base = path.posix.normalize(path.posix.join(path.posix.dirname(desde), especificador));
  else return null;
  const sinJs = base.replace(/\.(m?js)$/, '');
  for (const c of [base, `${sinJs}.ts`, `${sinJs}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    const ruta = path.join(RAIZ, c);
    if (fs.existsSync(ruta) && fs.statSync(ruta).isFile()) return c;
  }
  return null;
}

function nombresImportados(n: ts.ImportDeclaration | ts.ExportDeclaration): string[] {
  if (ts.isImportDeclaration(n)) {
    const c = n.importClause;
    if (!c) return ['*'];
    const nombres: string[] = [];
    if (c.name) nombres.push('default');
    if (c.namedBindings) {
      if (ts.isNamespaceImport(c.namedBindings)) nombres.push('*');
      else for (const e of c.namedBindings.elements) nombres.push((e.propertyName ?? e.name).text);
    }
    return nombres;
  }
  if (n.exportClause && ts.isNamedExports(n.exportClause)) return n.exportClause.elements.map(e => (e.propertyName ?? e.name).text);
  return ['*'];
}

// Lo que importan los demas archivos de codigo del proyecto (la lista la da git): pruebas,
// verificadores, comandos y configuracion.
function usosDeFuera(): UsosDeFuera {
  const r = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`no se pudo pedir a git la lista del proyecto: ${r.error?.message ?? r.stderr.trim()}`);
  const usos: UsosDeFuera = { nombres: new Set(), archivos: new Set() };
  for (const f of r.stdout.split('\0')) {
    if (!CODIGO.test(f) || /^(src|docs)\//.test(f) || /(^|\/)node_modules\//.test(f) || !fs.existsSync(path.join(RAIZ, f))) continue;
    const sf = ts.createSourceFile(f, fs.readFileSync(path.join(RAIZ, f), 'utf-8'), ts.ScriptTarget.Latest, true);
    recorrer(sf, n => {
      let especificador: ts.Expression | undefined;
      let nombres = ['*'];
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) {
        especificador = n.moduleSpecifier;
        nombres = nombresImportados(n);
      } else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
        especificador = n.arguments.at(0);
      }
      if (!especificador || !ts.isStringLiteralLike(especificador)) return;
      const destino = resolverDesdeFuera(especificador.text, f);
      if (!destino) return;
      usos.archivos.add(destino);
      for (const nombre of nombres) usos.nombres.add(`${destino}#${nombre}`);
    });
  }
  return usos;
}

function esNombreDeSuDeclaracion(id: ts.Identifier): boolean {
  const p = id.parent;
  return (ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)
    || ts.isEnumDeclaration(p) || ts.isVariableDeclaration(p) || ts.isModuleDeclaration(p)) && p.name === id;
}

// Importar o reexportar solo nombra: no usa.
function soloNombra(id: ts.Identifier): boolean {
  const p = id.parent;
  return ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p)
    || ts.isExportAssignment(p) || ts.isImportEqualsDeclaration(p);
}

interface UsosDentro {
  simbolos: Set<ts.Symbol>;
  cargados: Set<string>;
  enteros: Set<string>;
}

function usosDentro(l: Leido): UsosDentro {
  const u: UsosDentro = { simbolos: new Set(), cargados: new Set(), enteros: new Set() };
  for (const sf of l.archivos) {
    recorrer(sf, n => {
      if (ts.isIdentifier(n) && !esNombreDeSuDeclaracion(n) && !soloNombra(n)) {
        const s = ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n
          ? l.checker.getShorthandAssignmentValueSymbol(n.parent) : l.checker.getSymbolAtLocation(n);
        if (s) {
          u.simbolos.add(s);
          u.simbolos.add(simboloReal(l.checker, s));
        }
      }
      let especificador: ts.Expression | undefined;
      let dinamico = false;
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) especificador = n.moduleSpecifier;
      else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
        especificador = n.arguments.at(0);
        dinamico = true;
      }
      if (!especificador || !ts.isStringLiteralLike(especificador)) return;
      const modulo = l.checker.getSymbolAtLocation(especificador)?.declarations?.at(0);
      if (!modulo || !ts.isSourceFile(modulo)) return;
      u.cargados.add(rel(modulo.fileName));
      if (dinamico) u.enteros.add(rel(modulo.fileName));
    });
  }
  return u;
}

// Lo que exporta una entrada lo usa quien la carga (Next o el comando): tambien lo que
// reexporta de otro archivo.
function marcarLoQueCarganLasEntradas(l: Leido, comandos: ReadonlySet<string>, dentro: UsosDentro): void {
  for (const sf of l.archivos) {
    const entrada = nombresDeEntrada(rel(sf.fileName), comandos);
    const modulo = l.checker.getSymbolAtLocation(sf);
    if (!entrada || !modulo) continue;
    for (const e of l.checker.getExportsOfModule(modulo)) {
      if (entrada === 'todos' || entrada.has(e.name)) dentro.simbolos.add(simboloReal(l.checker, e));
    }
  }
}

function revisarSinUso(l: Leido, fuera: UsosDeFuera, comandos: ReadonlySet<string>): void {
  const dentro = usosDentro(l);
  marcarLoQueCarganLasEntradas(l, comandos, dentro);
  for (const sf of l.archivos) {
    const r = rel(sf.fileName);
    const entrada = nombresDeEntrada(r, comandos);
    if (entrada === 'todos' || dentro.enteros.has(r) || fuera.nombres.has(`${r}#*`)) continue;
    if (!entrada && !dentro.cargados.has(r) && !fuera.archivos.has(r)) {
      apuntarEnLinea(sf, 1, 'CODIGO_SIN_USO', 'nadie carga este archivo: ni otro archivo, ni Next, ni un comando');
      continue;
    }
    const modulo = l.checker.getSymbolAtLocation(sf);
    if (!modulo) continue;
    for (const e of l.checker.getExportsOfModule(modulo)) {
      const real = simboloReal(l.checker, e);
      const declaracion = real.declarations?.at(0);
      // Lo reexportado de otro archivo se juzga en su archivo.
      if (!declaracion || declaracion.getSourceFile() !== sf) continue;
      if (entrada?.has(e.name) || dentro.simbolos.has(real) || dentro.simbolos.has(e) || fuera.nombres.has(`${r}#${e.name}`)) continue;
      apuntar(sf, ts.getNameOfDeclaration(declaracion) ?? declaracion, 'CODIGO_SIN_USO', `"${e.name}" se exporta y nadie lo usa`);
    }
  }
}

// --- Principal ---

function archivosDelProyecto(): ArchivosDelProyecto {
  const lista: string[] = [];
  const visitar = (dir: string): void => {
    for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const r = dir === '' ? e.name : `${dir}/${e.name}`;
      if (e.isDirectory() && !SIN_MIRAR.has(e.name)) visitar(r);
      else if (e.isFile()) lista.push(r);
    }
  };
  visitar('');
  return { lista, conjunto: new Set(lista), lineas: new Map() };
}

const leidos: Leido[] = [];
for (const p of PROYECTOS) {
  const l = leerProyecto(p);
  if (l) leidos.push(l);
}
const archivosLeidos = leidos.reduce((suma, l) => suma + l.archivos.length, 0);
if (archivosLeidos === 0) {
  console.error(`\n  No se ha leido ningun archivo de ${PROYECTOS.map(p => p.carpeta).join(' ni de ')}: el verificador no ha comprobado nada.\n`);
  process.exit(1);
}

const archivos = archivosDelProyecto();
const fuera = usosDeFuera();
const comandos = entradasDeComandos();
for (const l of leidos) {
  for (const sf of l.archivos) revisarArchivo(l, sf, archivos);
  revisarSinUso(l, fuera, comandos);
}

console.log(`Archivos leidos con el comprobador de tipos: ${String(archivosLeidos)} (src/, sin las pruebas).`);

if (hallazgos.length === 0) {
  console.log('Nada se da por bueno sin comprobarlo.\n');
  process.exit(0);
}

hallazgos.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
console.error(`\n  ${String(hallazgos.length)} problema(s):\n`);
for (const h of hallazgos) {
  console.error(`  ${h.file}:${String(h.line)} [${h.rule}]`);
  if (h.codigo) console.error(`    ${h.codigo}`);
  console.error(`    Por que: ${h.motivo}`);
}
process.exit(1);
