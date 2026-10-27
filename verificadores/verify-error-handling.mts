/**
 * verify-error-handling.mts - Errores que se tragan o se callan.
 *
 * QUE COMPRUEBA
 *   Recorre src/ y busca las formas de que un fallo desaparezca sin que nadie se entere.
 *   Las reglas 1, 2 y 4 miran linea a linea, con los comentarios quitados. La 3 y la 8
 *   se aplican solo al codigo de servidor (STRICT_EMPTY_STRING_PATHS: api/, services/ y
 *   lib/) y, como de la 5 a la 10, leen el codigo con el analizador de TypeScript. De la
 *   5 a la 10 miran todo src/ menos las pruebas.
 *     1. CATCH_NO_PARAM       - catch sin capturar el error: } catch {
 *     2. SILENT_CATCH         - catch vacio o con solo un comentario, en una linea
 *     3. EMPTY_STRING_DEFAULT - ?? '': un dato que falta se rellena con texto vacio
 *     4. NULL_RETURN_IN_CATCH - catch que devuelve null, en una linea
 *     5. CATCH_CALLADO        - catch vacio o con solo comentarios
 *     6. CATCH_DEVUELVE_VACIO - catch donde el fallo no llega a nadie
 *     7. PROMESA_CALLADA      - .catch de una promesa (o el segundo manejador de .then)
 *                               donde el fallo no llega a nadie
 *     8. RELLENO_VACIO        - || '': igual que la 3
 *     9. SIN_BASE_CALLADO     - si falta la base de datos, el almacenamiento o el login
 *                               (los nombres de BASES_DE_DATOS), la funcion se va sin que
 *                               el fallo llegue a nadie
 *    10. RESPUESTA_SIN_MIRAR  - una peticion (fetch) cuya respuesta de error nadie mira:
 *                               se tira, se usa sin mirar ok ni status, o la rama del
 *                               fallo no avisa
 *
 *   Cuando llega un fallo a alguien. Llega si se lanza; si se devuelve o se guarda como
 *   fallo (el propio error o algo hecho con el, un objeto con error, fallo, motivo u
 *   ok: false, o una respuesta con estado 400 o mas); o si se ensena o se apunta: una
 *   llamada que recibe el error, un texto que dice fallo o un objeto de fallo, o que se
 *   llama como un aviso (setError, alert, avisos.push...) y recibe algo. Lo demas es
 *   silencio: la consola, process.stderr, un logger, un valor fijo, una respuesta de
 *   exito vacia o dejar la pantalla como estaba.
 *
 *   Todos los caminos. Cada salida del sitio (cada return, cada break o continue que lo
 *   deja, y el final del bloque) tiene que llevar el fallo o tener un aviso antes en su
 *   mismo camino. Un aviso dentro de un if solo cubre ese if; dentro de un bucle no cubre
 *   lo de despues. Vale para el catch, la promesa, la regla 9 y la rama del fallo de un
 *   fetch. Un try dentro de un catch no lo excusa: sus caminos se siguen como los demas.
 *
 *   Mas detalles de como lee:
 *   - Un aviso por su nombre que recibe un texto fijo cuenta solo si el texto dice que
 *     algo fallo o es un codigo de fallo (DB_UNAVAILABLE).
 *   - El estado de una respuesta (ok, status) cuenta solo si con el se decide algo y la
 *     rama del fallo avisa, o si se entrega a otro; leido y tirado, o guardado en un
 *     nombre que nadie usa, no cuenta. void fetch(...) tira la respuesta.
 *   - Un comentario no es codigo: las reglas de linea no lo leen, y la 3 y la 8 tampoco
 *     cuentan un texto que hable de ?? '' o de || ''.
 *   - Dos rechazos que el propio estandar define no son un fallo de la aplicacion, y la
 *     rama que los atiende no cuenta como silencio. Solo si se cumplen las tres cosas: la
 *     llamada que puede rechazar esta en el mismo try (o es la promesa del .catch o del
 *     .then), el error se compara por su nombre (error.name === 'AbortError', sola o junto
 *     a error instanceof DOMException) y la pareja llamada y nombre es una de estas:
 *       navigator.share con 'AbortError': la persona cerro la ventana de compartir
 *       (W3C Web Share, 2.1.2, paso 13.4).
 *       orientation.lock con 'NotSupportedError': el navegador no admite girar la
 *       pantalla (W3C Screen Orientation, 5.2, paso 3).
 *     Cada rechazo aceptado sale listado con su norma en cada pasada: nada se esconde.
 *   - No admite excepciones: ninguna nota escrita en el codigo calla un silencio.
 *   - Sin ningun archivo que leer, falla: un verde sin haber comprobado nada no vale.
 *
 * QUE NO COMPRUEBA (sus limites, dichos)
 *   - Las reglas 1, 2 y 4 miran linea a linea: se les escapa lo que ocupa varias lineas o
 *     lleva el error entre parentesis.
 *   - Un aviso se reconoce por lo que recibe (el error, un texto que dice fallo o un
 *     codigo de fallo, un objeto de fallo) o por el nombre de la funcion si recibe algo
 *     que no es un texto fijo sin fallo. Una funcion que avisa con otro nombre y sin nada
 *     de eso sale como silencio.
 *   - El nombre solo cuenta en una llamada que hace algo; en un valor que se calcula y se
 *     guarda (const codigo = getErrorCode(error)) no cuenta: calcular no avisa a nadie.
 *   - Guardar el fallo en una variable solo cuenta si esa variable se lee en otro sitio
 *     del mismo archivo; una variable que solo se lee desde otro archivo sale como
 *     silencio.
 *   - Una cuenta en un nombre de fallo (fallos++) cuenta como aviso aunque nadie la lea
 *     despues. Una llamada que recibe el error cuenta aunque lo pase a una funcion que
 *     quiza no se ejecuta (un bucle vacio, una callback).
 *   - No sabe si quien recibe el error lo ensena de verdad.
 *   - La regla 9 reconoce la base por los nombres de BASES_DE_DATOS; guardada con otro
 *     nombre no la ve, y solo juzga la rama que se va (return, continue o break).
 *   - La regla 10 sigue la respuesta de cada fetch directo; si se devuelve, se pasa entera
 *     a otra funcion o se guarda en una lista, decide quien la recibe; el estado que se
 *     pasa a una funcion cuenta como entregado.
 *
 * QUE DEBE ADAPTAR QUIEN LO DESCARGUE
 *   - SRC_DIRS: las carpetas con el codigo (aqui, src/). Si tiene mas, por ejemplo el
 *     codigo de unas funciones de servidor, se anaden.
 *   - STRICT_EMPTY_STRING_PATHS: las carpetas de codigo de servidor donde se aplican la 3
 *     y la 8.
 *   - ALLOWED_PATHS: lo que no miran las reglas de linea (vienen las pruebas y scripts/).
 *   - BASES_DE_DATOS: los nombres con los que su codigo guarda la base de datos, el
 *     almacenamiento y el login. Vienen los habituales de Firebase.
 *   - NOMBRE_DE_AVISO, TEXTO_DE_FALLO y CLAVES_DE_FALLO: como dice su codigo que algo
 *     fallo. Los textos vienen sobre todo en castellano; si su interfaz habla otro idioma,
 *     hay que anadir sus frases o los avisos con texto fijo saldran como silencio.
 *   - SIN_LECTOR: lo que cuenta como escribir donde nadie lo lee (la consola, las salidas
 *     del proceso y un logger). Si su logger lleva los errores a un sitio que alguien
 *     vigila, es decision suya sacarlo de ahi.
 *
 * REQUISITOS
 *   Node 22.18 o superior (ejecuta .mts sin compilar) y el paquete typescript instalado
 *   en el proyecto (lee el codigo con su analizador).
 *
 * COMO SE EJECUTA
 *   Desde la raiz del proyecto:
 *     node verificadores/verify-error-handling.mts
 *   Termina con 0 si no encuentra nada y con 1 si encuentra algun silencio o no hay
 *   archivos que leer.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface Violation {
  file: string;
  line: number;
  rule: string;
  content: string;
}

// Las carpetas con el codigo, desde la raiz del proyecto.
const SRC_DIRS = ['src'].map(d => path.join(process.cwd(), d));

// Lo que no miran las reglas de linea: las pruebas y los scripts.
const ALLOWED_PATHS = [
  /\.test\./,
  /\.spec\./,
  /__tests__[/\\]/,
  /scripts[/\\]/,
];

// El codigo de servidor: aqui se aplican la 3 y la 8.
const STRICT_EMPTY_STRING_PATHS = [
  /api[/\\]/,
  /services[/\\]/,
  /lib[/\\]/,
];

function shouldSkipFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWED_PATHS.some(p => p.test(normalized));
}

function isStrictPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return STRICT_EMPTY_STRING_PATHS.some(p => p.test(normalized));
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
  const sf = ts.createSourceFile(path.basename(filePath), content, ts.ScriptTarget.ES2017, true);
  const originales = content.split('\n');
  // Las reglas de linea buscan en el codigo sin comentarios: un comentario que habla de
  // un patron no es el patron.
  const lines = sinComentarios(content, sf).split('\n');
  const relPath = path.relative(process.cwd(), filePath);
  const strict = isStrictPath(filePath);
  // La 3 y la 8 miran el codigo de verdad, no el texto de la linea.
  if (strict) violations.push(...rellenosVacios(sf, originales, relPath));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();
    // Lo que se ensena es la linea tal cual, con sus comentarios.
    const visible = originales[i].trim().substring(0, 120);

    if (/^\}\s*catch\s*\{/.test(trimmed)) {
      violations.push({ file: relPath, line: lineNum, rule: 'CATCH_NO_PARAM', content: visible });
    }

    if (/\}\s*catch[^(]*\{\s*(\/\*[^*]*\*\/|\/\/[^\n]*)?\s*\}/.test(line)) {
      violations.push({ file: relPath, line: lineNum, rule: 'SILENT_CATCH', content: visible });
    }

    if (/catch[^{]*\{[^}]*return\s+null/.test(line)) {
      violations.push({ file: relPath, line: lineNum, rule: 'NULL_RETURN_IN_CATCH', content: visible });
    }
  }

  return ordenarPorLinea(violations);
}

// El codigo con cada comentario cambiado por espacios (los saltos de linea se quedan,
// asi los numeros de linea no cambian). Donde hay un comentario lo dice el analizador
// de TypeScript, que distingue un comentario de un texto o de una expresion regular.
function sinComentarios(texto: string, sf: ts.SourceFile): string {
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
  const letras = texto.split('');
  for (const [inicio, fin] of tramos) {
    for (let i = inicio; i < fin; i++) if (letras[i] !== '\n' && letras[i] !== '\r') letras[i] = ' ';
  }
  return letras.join('');
}

const REGLA_DE_RELLENO: Readonly<Partial<Record<ts.SyntaxKind, string>>> = {
  [ts.SyntaxKind.QuestionQuestionToken]: 'EMPTY_STRING_DEFAULT',
  [ts.SyntaxKind.BarBarToken]: 'RELLENO_VACIO',
};

function esTextoVacio(e: ts.Expression): boolean {
  const v = sinEnvoltorio(e);
  return (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) && v.text === '';
}

// La 3 y la 8 sobre el codigo: un ?? '' o un || '' de verdad, no uno escrito dentro de
// un comentario o de un texto. Una por linea, como antes.
function rellenosVacios(sf: ts.SourceFile, lineas: string[], rel: string): Violation[] {
  const out: Violation[] = [];
  const vistos = new Set<string>();
  const anota = (n: ts.BinaryExpression): void => {
    const regla = REGLA_DE_RELLENO[n.operatorToken.kind];
    if (!regla) return;
    const fila = sf.getLineAndCharacterOfPosition(n.operatorToken.getStart(sf)).line;
    if (vistos.has(`${regla}:${fila}`)) return;
    vistos.add(`${regla}:${fila}`);
    out.push({ file: rel, line: fila + 1, rule: regla, content: lineas[fila].trim().substring(0, 120) });
  };
  const visitar = (n: ts.Node): void => {
    if (ts.isBinaryExpression(n) && esTextoVacio(n.right)) anota(n);
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return out;
}

// Por linea y, en la misma linea, en este orden.
const ORDEN_DE_LINEA = ['CATCH_NO_PARAM', 'SILENT_CATCH', 'EMPTY_STRING_DEFAULT', 'RELLENO_VACIO', 'NULL_RETURN_IN_CATCH'];

function ordenarPorLinea(lista: Violation[]): Violation[] {
  return [...lista].sort((a, b) => a.line - b.line || ORDEN_DE_LINEA.indexOf(a.rule) - ORDEN_DE_LINEA.indexOf(b.rule));
}

// --- Las formas de callar un error, leyendo el codigo entero (reglas 5, 6, 7, 9 y 10) ---

// Los nombres de la base de datos, el almacenamiento y el login (los habituales de Firebase).
const BASES_DE_DATOS: ReadonlySet<string> = new Set(['db', 'adminDb', 'storage', 'adminStorage', 'auth', 'adminAuth']);
// Un objeto con alguna de estas claves lleva el fallo dentro: no es silencio.
const CLAVES_DE_FALLO: ReadonlySet<string> = new Set(['error', 'errorCode', 'errores', 'fallo', 'fallos', 'motivo', 'reason']);
// Funciones y datos que avisan de un fallo por su nombre: setError, alert, avisos.push, errorDetails...
const NOMBRE_DE_AVISO = /error|fallo|falla|aviso|msg|mensaje|message|feedback|warn|alert|notif|toast|fail/i;
// Un texto que dice fallo, pasado a una funcion: setState('error'), pushLog(texto, 'error'),
// alert('No se pudo guardar'), setErrorMsg('Sesion no valida...').
const TEXTO_DE_FALLO = /error|fallo|falla|fail|aviso|no se ha|no se pudo|no se puede|no[ _]responde|no ha respondido|sin[ _]conexi|no hay conexi|no[ _]v[aá]lid|inv[aá]lid|caducad|denegad|no tienes permiso|falta/i;
// Lo que se escribe aqui no lo lee nadie: la consola, las salidas del proceso y un
// logger (logger.error, app.logger.warn...).
const SIN_LECTOR = /^(console\.\w+|process\.(stderr|stdout)\.write|(\w+\.)*logger\.\w+)$/;
// Lo que se mira de una respuesta para saber si la peticion fallo.
const LECTURAS_DE_ESTADO: ReadonlySet<string> = new Set(['ok', 'status', 'statusText']);
const PROMESAS_JUNTAS: ReadonlySet<string> = new Set(['Promise.all', 'Promise.allSettled']);
const COMPARACIONES: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken,
]);
const SIN_NOMBRES: ReadonlySet<string> = new Set();

// Rechazos que el estandar define y que no son un fallo de la aplicacion. La llamada se
// mira como texto, sin ?. ni espacios.
const RECHAZOS_ESPERADOS: ReadonlyArray<{ llamada: RegExp; nombre: string; norma: string }> = [
  {
    llamada: /^navigator\.share$/,
    nombre: 'AbortError',
    norma: 'la persona cerro la ventana de compartir (W3C Web Share, 2.1.2, paso 13.4)',
  },
  {
    llamada: /(^|\.)orientation\.lock$/,
    nombre: 'NotSupportedError',
    norma: 'el navegador no admite girar la pantalla (W3C Screen Orientation, 5.2, paso 3)',
  },
];

const QUE_ESCONDE: Readonly<Record<string, string>> = {
  CATCH_CALLADO: 'el catch no hace nada: el fallo se pierde',
  CATCH_DEVUELVE_VACIO: 'el fallo no llega a nadie: solo va a la consola o a un registro, se cambia por un valor fijo o una respuesta de exito vacia, o la pantalla se queda como estaba',
  PROMESA_CALLADA: 'la promesa se traga el fallo',
  RELLENO_VACIO: 'un dato que falta se rellena con texto vacio',
  SIN_BASE_CALLADO: 'sin base de datos, almacenamiento o login, la funcion se va y el fallo no llega a nadie',
  RESPUESTA_SIN_MIRAR: 'la peticion puede fallar y nadie mira su respuesta de error ni lo dice',
};

interface Hallazgo {
  regla: string;
  inicio: number;
}

function nombreDe(name: ts.Node | undefined): string | null {
  return name && ts.isIdentifier(name) ? name.text : null;
}

function sinEnvoltorio(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)
    || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e) || ts.isAwaitExpression(e)) e = e.expression;
  return e;
}

function textoDeLlamada(expr: ts.Expression): string {
  return expr.getText().replace(/\?\./g, '.').replace(/\s+/g, '');
}

function esSinLector(nodo: ts.Node): boolean {
  return ts.isCallExpression(nodo) && SIN_LECTOR.test(textoDeLlamada(nodo.expression));
}

function mencionaAlguno(nodo: ts.Node, nombres: ReadonlySet<string>): boolean {
  if (nombres.size === 0 || esSinLector(nodo)) return false;
  if (ts.isIdentifier(nodo)) return nombres.has(nodo.text);
  return ts.forEachChild(nodo, h => (mencionaAlguno(h, nombres) ? true : undefined)) === true;
}

function nombreDeClave(p: ts.ObjectLiteralElementLike): string | null {
  return p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;
}

function llevaFallo(obj: ts.ObjectLiteralExpression): boolean {
  return obj.properties.some(p => {
    const clave = nombreDeClave(p);
    if (clave !== null && CLAVES_DE_FALLO.has(clave)) return true;
    return (clave === 'ok' || clave === 'success') && ts.isPropertyAssignment(p)
      && p.initializer.kind === ts.SyntaxKind.FalseKeyword;
  });
}

// Un valor que no dice nada: vacio, nulo, falso o cero.
function esNeutro(expr: ts.Expression): boolean {
  const e = sinEnvoltorio(expr);
  if (e.kind === ts.SyntaxKind.NullKeyword || e.kind === ts.SyntaxKind.FalseKeyword || ts.isVoidExpression(e)) return true;
  if (ts.isIdentifier(e)) return e.text === 'undefined';
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text === '';
  if (ts.isNumericLiteral(e)) return Number(e.text) === 0;
  if (ts.isArrayLiteralExpression(e)) return e.elements.length === 0;
  return ts.isObjectLiteralExpression(e) && e.properties.length === 0;
}

function textoDiceFallo(arg: ts.Expression): boolean {
  const e = sinEnvoltorio(arg);
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return TEXTO_DE_FALLO.test(e.text);
  return ts.isTemplateExpression(e)
    && (TEXTO_DE_FALLO.test(e.head.text) || e.templateSpans.some(s => TEXTO_DE_FALLO.test(s.literal.text)));
}

function contieneObjetoDeFallo(nodo: ts.Node): boolean {
  if (esSinLector(nodo)) return false;
  if (ts.isObjectLiteralExpression(nodo) && llevaFallo(nodo)) return true;
  return ts.forEachChild(nodo, h => (contieneObjetoDeFallo(h) ? true : undefined)) === true;
}

// Una respuesta HTTP de error: { status: 400 } o mas.
function conEstadoDeError(nodo: ts.Node): boolean {
  if (esSinLector(nodo)) return false;
  if (ts.isPropertyAssignment(nodo) && nombreDeClave(nodo) === 'status') {
    const v = sinEnvoltorio(nodo.initializer);
    if (ts.isNumericLiteral(v) && Number(v.text) >= 400) return true;
  }
  return ts.forEachChild(nodo, h => (conEstadoDeError(h) ? true : undefined)) === true;
}

// Un codigo de fallo (DB_UNAVAILABLE, INVALID_BODY: detalle) tambien dice que algo fallo.
const CODIGO_DE_FALLO = /^[A-Z][A-Z0-9_]{2,}(:|$)/;

// Un texto fijo que no dice que algo fallo: con el no se avisa de nada, aunque la funcion
// se llame setError. setError('realizada con exito') no avisa de ningun fallo.
function textoFijoSinFallo(arg: ts.Expression): boolean {
  const e = sinEnvoltorio(arg);
  return (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))
    && !TEXTO_DE_FALLO.test(e.text) && !CODIGO_DE_FALLO.test(e.text);
}

// Una llamada que pasa el fallo a alguien: recibe el error (si se pide), un objeto de
// fallo, un estado HTTP de error o un texto que dice fallo; o se llama como un aviso
// (setError, alert, avisos.push...) y recibe algo que no esta vacio ni es un texto fijo
// que no dice fallo. La consola no cuenta.
function llamadaAvisa(llamada: ts.CallExpression | ts.NewExpression, deError: ReadonlySet<string>, conMencion: boolean): boolean {
  if (esSinLector(llamada)) return false;
  const args = llamada.arguments ? [...llamada.arguments] : [];
  if (args.some(a => (conMencion && mencionaAlguno(a, deError)) || contieneObjetoDeFallo(a) || conEstadoDeError(a) || textoDiceFallo(a))) {
    return true;
  }
  return NOMBRE_DE_AVISO.test(textoDeLlamada(llamada.expression)) && args.some(a => !esNeutro(a) && !textoFijoSinFallo(a));
}

// Un valor que lleva el fallo: el error, un objeto de fallo, un estado HTTP de error o una llamada que avisa.
function llevaElFallo(expr: ts.Expression, deError: ReadonlySet<string>): boolean {
  if (mencionaAlguno(expr, deError) || contieneObjetoDeFallo(expr) || conEstadoDeError(expr)) return true;
  const e = sinEnvoltorio(expr);
  return (ts.isCallExpression(e) || ts.isNewExpression(e)) && llamadaAvisa(e, deError, true);
}

function asignacionAvisa(asig: ts.BinaryExpression, deError: ReadonlySet<string>): boolean {
  if (!seLeeEnElArchivo(asig.left)) return false;
  if (llevaElFallo(asig.right, deError)) return true;
  let destino = '';
  if (ts.isPropertyAccessExpression(asig.left)) destino = asig.left.name.text;
  else if (ts.isIdentifier(asig.left)) destino = asig.left.text;
  return (NOMBRE_DE_AVISO.test(destino) || CLAVES_DE_FALLO.has(destino)) && !esNeutro(asig.right) && !textoFijoSinFallo(asig.right);
}

// Lo que se guarda en una variable solo llega a alguien si esa variable se lee en algun
// otro sitio del archivo: guardado y nunca leido, el fallo se queda ahi. Se mira solo en
// el mismo archivo. Si no se sabe a que se guarda (no hay una variable o this al
// principio), esta comprobacion no se aplica.
function seLeeEnElArchivo(destino: ts.Expression): boolean {
  let raiz: ts.Expression = destino;
  while (ts.isPropertyAccessExpression(raiz) || ts.isElementAccessExpression(raiz)
    || ts.isParenthesizedExpression(raiz) || ts.isNonNullExpression(raiz)) raiz = raiz.expression;
  const sf = destino.getSourceFile();
  if (raiz.kind === ts.SyntaxKind.ThisKeyword && ts.isPropertyAccessExpression(destino)) {
    return propiedadSeLee(destino.name.text, sf);
  }
  return ts.isIdentifier(raiz) ? variableSeLee(raiz.text, sf) : true;
}

// Una escritura: la variable es la que se asigna (x = ..., x.campo = ..., x[i] = ...).
function esEscritura(id: ts.Identifier): boolean {
  let n: ts.Node = id;
  while ((ts.isPropertyAccessExpression(n.parent) || ts.isElementAccessExpression(n.parent)) && n.parent.expression === n) n = n.parent;
  const p = n.parent;
  return ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.left === n;
}

function variableSeLee(nombre: string, sf: ts.SourceFile): boolean {
  let leida = false;
  const visitar = (n: ts.Node): void => {
    if (leida) return;
    if (ts.isIdentifier(n) && n.text === nombre && esReferencia(n) && !esEscritura(n)) leida = true;
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return leida;
}

function propiedadSeLee(nombre: string, sf: ts.SourceFile): boolean {
  let leida = false;
  const visitar = (n: ts.Node): void => {
    if (leida) return;
    if (ts.isPropertyAccessExpression(n) && n.name.text === nombre) {
      const p = n.parent;
      if (!(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.left === n)) leida = true;
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return leida;
}

// Calcular un valor (const x = ...) no avisa a nadie, salvo que el valor sea una llamada
// que recibe un objeto de fallo, un estado HTTP de error o un texto que dice fallo (en un
// ?:, las dos ramas). El nombre de la funcion no cuenta aqui: guardar lo que calcula
// getErrorCode(error) no avisa a nadie.
function valorAvisaSiempre(expr: ts.Expression): boolean {
  const e = sinEnvoltorio(expr);
  if (ts.isConditionalExpression(e)) return valorAvisaSiempre(e.whenTrue) && valorAvisaSiempre(e.whenFalse);
  if ((!ts.isCallExpression(e) && !ts.isNewExpression(e)) || esSinLector(e)) return false;
  const args = e.arguments ? [...e.arguments] : [];
  return args.some(a => contieneObjetoDeFallo(a) || conEstadoDeError(a) || textoDiceFallo(a));
}

function anadeDerivados(cuerpo: ts.Node, nombres: Set<string>): boolean {
  let anadido = false;
  const visitar = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && !nombres.has(n.name.text)
      && n.initializer && mencionaAlguno(n.initializer, nombres)) {
      nombres.add(n.name.text);
      anadido = true;
    }
    ts.forEachChild(n, visitar);
  };
  visitar(cuerpo);
  return anadido;
}

// Los nombres que llevan el fallo: el del error y los que se calculan a partir de el.
function deErrorDe(cuerpo: ts.Node, nombre: string | null): Set<string> {
  const nombres = new Set<string>(nombre ? [nombre] : []);
  let crece = nombres.size > 0;
  while (crece) crece = anadeDerivados(cuerpo, nombres);
  return nombres;
}

// --- Todos los caminos ---
// No basta un aviso en cualquier parte del bloque: un catch que avisa en una rama y en la
// otra devuelve null no puede salir en verde. Se sigue cada camino del bloque.

interface Camino {
  // Algun camino sale del sitio sin que el fallo llegue a nadie.
  silencio: boolean;
  // El bloque puede terminar sin salir (sigue por debajo).
  sigue: boolean;
  // En todos los caminos que siguen por debajo ya se ha avisado.
  avisado: boolean;
}

// Una expresion avisa siempre que se ejecuta: una llamada que avisa, una asignacion que
// guarda el fallo, o las dos ramas de un ?: que avisan. De a && b o a || b solo cuenta a,
// que es lo unico que se ejecuta siempre.
function expresionAvisa(expr: ts.Expression, deError: ReadonlySet<string>): boolean {
  let e = sinEnvoltorio(expr);
  if (ts.isVoidExpression(e)) e = sinEnvoltorio(e.expression);
  if (cuentaElFallo(e)) return true;
  if (ts.isCallExpression(e) || ts.isNewExpression(e)) return llamadaAvisa(e, deError, true) || llamadaEncadenadaAvisa(e, deError);
  if (ts.isConditionalExpression(e)) return expresionAvisa(e.whenTrue, deError) && expresionAvisa(e.whenFalse, deError);
  if (!ts.isBinaryExpression(e)) return false;
  if (e.operatorToken.kind === ts.SyntaxKind.EqualsToken) return asignacionAvisa(e, deError);
  if (e.operatorToken.kind === ts.SyntaxKind.CommaToken) return expresionAvisa(e.left, deError) || expresionAvisa(e.right, deError);
  return expresionAvisa(e.left, deError);
}

// fallos++ o errores += 1: el fallo se cuenta en un nombre de fallo, igual que
// errores = errores + 1, que ya contaba como aviso.
function cuentaElFallo(e: ts.Expression): boolean {
  let destino: ts.Expression | null = null;
  if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e))
    && (e.operator === ts.SyntaxKind.PlusPlusToken || e.operator === ts.SyntaxKind.MinusMinusToken)) destino = e.operand;
  else if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) destino = e.left;
  if (!destino) return false;
  const nombre = ts.isIdentifier(destino) ? destino.text : ts.isPropertyAccessExpression(destino) ? destino.name.text : '';
  return NOMBRE_DE_AVISO.test(nombre) || CLAVES_DE_FALLO.has(nombre);
}

// aviso(err).then(...): la llamada de dentro se hace siempre.
function llamadaEncadenadaAvisa(e: ts.CallExpression | ts.NewExpression, deError: ReadonlySet<string>): boolean {
  return ts.isPropertyAccessExpression(e.expression) && expresionAvisa(e.expression.expression, deError);
}

// Una sentencia suelta avisa si su expresion avisa siempre o si declara un valor con una
// llamada que avisa.
function sentenciaAvisa(s: ts.Statement, deError: ReadonlySet<string>): boolean {
  if (ts.isExpressionStatement(s)) return expresionAvisa(s.expression, deError);
  if (!ts.isVariableStatement(s)) return false;
  return s.declarationList.declarations.some(d => d.initializer !== undefined && valorAvisaSiempre(d.initializer));
}

// Lo que se devuelve lleva el fallo; un ?: devuelto se mira rama a rama.
function devuelveElFallo(expr: ts.Expression, deError: ReadonlySet<string>): boolean {
  const e = sinEnvoltorio(expr);
  if (ts.isConditionalExpression(e)) return devuelveElFallo(e.whenTrue, deError) && devuelveElFallo(e.whenFalse, deError);
  return llevaElFallo(e, deError);
}

function sinSalir(avisado: boolean): Camino {
  return { silencio: false, sigue: true, avisado };
}

// Los caminos de una sentencia. avisado: si en el camino que llega ya se ha avisado.
// enBucle: si un break o un continue solo deja un bucle (o un switch) del propio sitio.
function caminos(s: ts.Statement, avisado: boolean, deError: ReadonlySet<string>, enBucle: boolean): Camino {
  if (ts.isThrowStatement(s)) return { silencio: false, sigue: false, avisado: true };
  if (ts.isReturnStatement(s)) {
    const lleva = avisado || (s.expression !== undefined && devuelveElFallo(s.expression, deError));
    return { silencio: !lleva, sigue: false, avisado };
  }
  if (ts.isBreakStatement(s) || ts.isContinueStatement(s)) return { silencio: !enBucle && !avisado, sigue: false, avisado };
  if (ts.isBlock(s)) return caminosDeLista(s.statements, avisado, deError, enBucle);
  if (ts.isIfStatement(s)) return caminosDeIf(s, avisado, deError, enBucle);
  if (ts.isTryStatement(s)) return caminosDeTry(s, avisado, deError, enBucle);
  if (ts.isSwitchStatement(s)) return caminosDeSwitch(s, avisado, deError);
  if (ts.isLabeledStatement(s)) return caminos(s.statement, avisado, deError, enBucle);
  if (ts.isIterationStatement(s, false)) {
    // El bucle puede no dar ninguna vuelta: lo que avisa dentro no cubre lo de despues.
    return { silencio: caminos(s.statement, avisado, deError, true).silencio, sigue: true, avisado };
  }
  return sinSalir(avisado || sentenciaAvisa(s, deError));
}

function caminosDeLista(lista: ReadonlyArray<ts.Statement>, avisado: boolean, deError: ReadonlySet<string>, enBucle: boolean): Camino {
  let estado = avisado;
  let silencio = false;
  for (const s of lista) {
    const c = caminos(s, estado, deError, enBucle);
    silencio = silencio || c.silencio;
    if (!c.sigue) return { silencio, sigue: false, avisado: estado };
    estado = c.avisado;
  }
  return { silencio, sigue: true, avisado: estado };
}

// Por debajo de varias ramas solo se ha avisado si se aviso en todas las que siguen.
function unir(ramas: Camino[]): Camino {
  return {
    silencio: ramas.some(r => r.silencio),
    sigue: ramas.some(r => r.sigue),
    avisado: ramas.every(r => !r.sigue || r.avisado),
  };
}

// --- Los rechazos que el estandar define ---

// Los nombres de rechazo que admite el sitio que se esta juzgando: los de las llamadas de
// su try (o de la promesa de su .catch o .then). Fuera de un catch o de una promesa, ninguno.
let rechazosPermitidos: ReadonlySet<string> = new Set();
// Cada condicion aceptada del archivo que se esta leyendo: donde empieza y que nombre
// compara (para listarlas con su norma).
let aceptadosEnArchivo: Array<{ inicio: number; nombre: string }> = [];

// Los nombres que admiten las llamadas de "origen", sin entrar en funciones de dentro
// (su rechazo no llega a este catch).
function rechazosQueAdmite(origen: ts.Node): Set<string> {
  const nombres = new Set<string>();
  const visitar = (n: ts.Node): void => {
    if (n !== origen && ts.isFunctionLike(n)) return;
    if (ts.isCallExpression(n)) {
      const llamada = textoDeLlamada(n.expression);
      for (const r of RECHAZOS_ESPERADOS) if (r.llamada.test(llamada)) nombres.add(r.nombre);
    }
    ts.forEachChild(n, visitar);
  };
  visitar(origen);
  return nombres;
}

function conRechazosDe<T>(origen: ts.Node, comprobar: () => T): T {
  const antes = rechazosPermitidos;
  rechazosPermitidos = rechazosQueAdmite(origen);
  try {
    return comprobar();
  } finally {
    rechazosPermitidos = antes;
  }
}

function esDomExceptionDe(expr: ts.Expression, deError: ReadonlySet<string>): boolean {
  const e = sinEnvoltorio(expr);
  return ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword
    && ts.isIdentifier(e.left) && deError.has(e.left.text)
    && ts.isIdentifier(e.right) && e.right.text === 'DOMException';
}

// El nombre con el que la condicion compara el error: error.name === 'X' (o al reves),
// sola o junto a error instanceof DOMException. null si no es eso.
function nombreComparado(cond: ts.Expression, deError: ReadonlySet<string>): string | null {
  const e = sinEnvoltorio(cond);
  if (!ts.isBinaryExpression(e)) return null;
  const op = e.operatorToken.kind;
  if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
    if (esDomExceptionDe(e.left, deError)) return nombreComparado(e.right, deError);
    return esDomExceptionDe(e.right, deError) ? nombreComparado(e.left, deError) : null;
  }
  if (op !== ts.SyntaxKind.EqualsEqualsEqualsToken && op !== ts.SyntaxKind.EqualsEqualsToken) return null;
  const derecha = sinEnvoltorio(e.right);
  const [acceso, texto] = ts.isStringLiteral(derecha) ? [sinEnvoltorio(e.left), derecha] : [derecha, sinEnvoltorio(e.left)];
  if (!ts.isStringLiteral(texto) || !ts.isPropertyAccessExpression(acceso) || acceso.name.text !== 'name') return null;
  return ts.isIdentifier(acceso.expression) && deError.has(acceso.expression.text) ? texto.text : null;
}

function rechazoEsperado(cond: ts.Expression, deError: ReadonlySet<string>): boolean {
  const nombre = nombreComparado(cond, deError);
  if (nombre === null || !rechazosPermitidos.has(nombre)) return false;
  aceptadosEnArchivo.push({ inicio: cond.getStart(), nombre });
  return true;
}

function caminosDeIf(s: ts.IfStatement, avisado: boolean, deError: ReadonlySet<string>, enBucle: boolean): Camino {
  // La rama de un rechazo que el estandar define como no fallo no es un silencio.
  const si = caminos(s.thenStatement, avisado || rechazoEsperado(s.expression, deError), deError, enBucle);
  const no = s.elseStatement ? caminos(s.elseStatement, avisado, deError, enBucle) : sinSalir(avisado);
  return unir([si, no]);
}

// Un try del propio sitio: el camino va por su try entero o salta a su catch, y su
// finally va despues de los dos.
function caminosDeTry(s: ts.TryStatement, avisado: boolean, deError: ReadonlySet<string>, enBucle: boolean): Camino {
  const prueba = caminos(s.tryBlock, avisado, deError, enBucle);
  const unido = s.catchClause ? unir([prueba, caminos(s.catchClause.block, avisado, deError, enBucle)]) : prueba;
  if (!s.finallyBlock) return unido;
  const fin = caminos(s.finallyBlock, unido.avisado, deError, enBucle);
  return { silencio: unido.silencio || fin.silencio, sigue: unido.sigue && fin.sigue, avisado: fin.avisado };
}

// break dentro de un switch solo deja el switch.
function caminosDeSwitch(s: ts.SwitchStatement, avisado: boolean, deError: ReadonlySet<string>): Camino {
  const clausulas = s.caseBlock.clauses.map(c => caminosDeLista(c.statements, avisado, deError, true));
  return { silencio: clausulas.some(c => c.silencio), sigue: true, avisado };
}

// El fallo llega a alguien en todos los caminos: ninguno sale callado y, si el bloque
// sigue por debajo, en todos los que siguen ya se ha avisado.
function caminosAvisan(c: Camino): boolean {
  return !c.silencio && (!c.sigue || c.avisado);
}

function todosAvisan(cuerpo: ts.Statement, deError: ReadonlySet<string>): boolean {
  return caminosAvisan(caminos(cuerpo, false, deError, false));
}

// Un try dentro del catch no lo excusa: sus caminos se siguen como los demas.
function reglaCatch(node: ts.CatchClause): string | null {
  const bloque = node.block;
  if (bloque.statements.length === 0) return 'CATCH_CALLADO';
  const deError = deErrorDe(bloque, nombreDe(node.variableDeclaration?.name));
  const intento = ts.isTryStatement(node.parent) ? node.parent.tryBlock : bloque;
  return conRechazosDe(intento, () => todosAvisan(bloque, deError)) ? null : 'CATCH_DEVUELVE_VACIO';
}

function manejadorDeFallo(node: ts.CallExpression): ts.Expression | null {
  if (!ts.isPropertyAccessExpression(node.expression)) return null;
  const metodo = node.expression.name.text;
  if (metodo === 'catch') return node.arguments[0] ?? null;
  return metodo === 'then' ? node.arguments[1] ?? null : null;
}

// El nombre "catch" (o "then") de una promesa que se traga el fallo, o null.
function promesaCallada(node: ts.CallExpression): ts.Node | null {
  const fn = manejadorDeFallo(node);
  if (!fn || !ts.isPropertyAccessExpression(node.expression)) return null;
  const nombre = node.expression.name;
  if (ts.isPropertyAccessExpression(fn) || ts.isIdentifier(fn)) return SIN_LECTOR.test(textoDeLlamada(fn)) ? nombre : null;
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return null;
  const deError = deErrorDe(fn.body, nombreDe(fn.parameters[0]?.name));
  if (!ts.isBlock(fn.body)) return devuelveElFallo(fn.body, deError) || expresionAvisa(fn.body, deError) ? null : nombre;
  if (fn.body.statements.length === 0) return nombre;
  const cuerpo = fn.body;
  return conRechazosDe(node.expression.expression, () => todosAvisan(cuerpo, deError)) ? null : nombre;
}

function operandos(expr: ts.Expression): ts.Expression[] {
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
    return [...operandos(expr.left), ...operandos(expr.right)];
  }
  return [expr];
}

// Si falta la base y la rama se va sin que el fallo llegue a nadie: la misma regla del
// reves que el catch. Lanzar o devolver un fallo (un 503, un objeto con error u ok: false,
// una llamada que avisa) pasa; irse con un valor, una respuesta de exito o sin nada, no.
function sinBaseCallado(node: ts.IfStatement): boolean {
  const preguntaPorLaBase = operandos(node.expression).some(e => ts.isPrefixUnaryExpression(e)
    && e.operator === ts.SyntaxKind.ExclamationToken && ts.isIdentifier(e.operand) && BASES_DE_DATOS.has(e.operand.text));
  if (!preguntaPorLaBase) return false;
  return sale(node.thenStatement) && !todosAvisan(node.thenStatement, SIN_NOMBRES);
}

// --- Regla 10: la respuesta de una peticion que nadie mira ---

// A donde va la respuesta de un fetch: a nadie, a quien la recibe entera, o a un nombre.
type Destino =
  | { tipo: 'nadie' }
  | { tipo: 'entregada' }
  | { tipo: 'nombre'; nombre: string; ambito: ts.Node };

const NADIE: Destino = { tipo: 'nadie' };
const ENTREGADA: Destino = { tipo: 'entregada' };

function esFetch(node: ts.CallExpression): boolean {
  return ts.isIdentifier(node.expression) && node.expression.text === 'fetch';
}

function subirEnvoltorios(n: ts.Node): ts.Node {
  let a = n;
  while (a.parent && (ts.isAwaitExpression(a.parent) || ts.isParenthesizedExpression(a.parent)
    || ts.isAsExpression(a.parent) || ts.isNonNullExpression(a.parent) || ts.isSatisfiesExpression(a.parent))) a = a.parent;
  return a;
}

function ambitoDe(n: ts.Node): ts.Node {
  let a: ts.Node | undefined = n.parent;
  while (a && !ts.isFunctionLike(a) && !ts.isSourceFile(a)) a = a.parent;
  return a ?? n.getSourceFile();
}

function enNombre(nombre: string, donde: ts.Node): Destino {
  return { tipo: 'nombre', nombre, ambito: ambitoDe(donde) };
}

function destinoDe(n: ts.Node): Destino {
  const e = subirEnvoltorios(n);
  const p = e.parent;
  // void fetch(...) tira la respuesta, igual que dejarla suelta.
  if (!p || ts.isExpressionStatement(p) || ts.isVoidExpression(p)) return NADIE;
  if (ts.isVariableDeclaration(p)) return ts.isIdentifier(p.name) ? enNombre(p.name.text, p) : ENTREGADA;
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === e) {
    return ts.isIdentifier(p.left) ? enNombre(p.left.text, p) : ENTREGADA;
  }
  if (ts.isArrowFunction(p) && p.body === e) return destinoDeDevuelta(p);
  if (ts.isArrayLiteralExpression(p)) return destinoEnLista(p, e);
  if (ts.isPropertyAccessExpression(p) && p.expression === e) return destinoEncadenado(p);
  return ENTREGADA;
}

// lista.map(u => fetch(u)) dentro de Promise.all: la respuesta va a donde vaya el resultado.
function destinoDeDevuelta(flecha: ts.ArrowFunction): Destino {
  const map = flecha.parent;
  if (!ts.isCallExpression(map) || !ts.isPropertyAccessExpression(map.expression) || map.expression.name.text !== 'map') return ENTREGADA;
  const juntas = map.parent;
  if (!ts.isCallExpression(juntas) || !PROMESAS_JUNTAS.has(textoDeLlamada(juntas.expression))) return ENTREGADA;
  return destinoDeJuntas(juntas, null);
}

// Promise.all([fetch(a), fetch(b)]): la respuesta numero i va al hueco i del resultado.
function destinoEnLista(lista: ts.ArrayLiteralExpression, elemento: ts.Node): Destino {
  const juntas = lista.parent;
  if (!ts.isCallExpression(juntas) || !PROMESAS_JUNTAS.has(textoDeLlamada(juntas.expression))) return ENTREGADA;
  return destinoDeJuntas(juntas, lista.elements.indexOf(elemento as ts.Expression));
}

function destinoDeJuntas(juntas: ts.CallExpression, indice: number | null): Destino {
  const e = subirEnvoltorios(juntas);
  const p = e.parent;
  if (!p || ts.isExpressionStatement(p)) return NADIE;
  if (indice === null || !ts.isVariableDeclaration(p) || !ts.isArrayBindingPattern(p.name)) return ENTREGADA;
  const hueco = p.name.elements[indice];
  if (!hueco || ts.isOmittedExpression(hueco)) return NADIE;
  return ts.isIdentifier(hueco.name) ? enNombre(hueco.name.text, p) : ENTREGADA;
}

// (await fetch(u)).json() usa el cuerpo sin mirar; fetch(u).then(r => ...) se sigue en r.
function destinoEncadenado(acceso: ts.PropertyAccessExpression): Destino {
  const metodo = acceso.name.text;
  const llamada = acceso.parent;
  if (!ts.isCallExpression(llamada)) return NADIE;
  if (metodo === 'catch' || metodo === 'finally') return destinoDe(llamada);
  if (metodo !== 'then') return NADIE;
  const manejador = llamada.arguments[0];
  if (!manejador || (!ts.isArrowFunction(manejador) && !ts.isFunctionExpression(manejador))) return ENTREGADA;
  const param = manejador.parameters[0]?.name;
  return param && ts.isIdentifier(param) ? { tipo: 'nombre', nombre: param.text, ambito: manejador } : NADIE;
}

function dentroDeSinLector(n: ts.Node, tope: ts.Node): boolean {
  for (let a: ts.Node | undefined = n.parent; a && a !== tope; a = a.parent) {
    if (esSinLector(a)) return true;
  }
  return false;
}

function esReferencia(id: ts.Identifier): boolean {
  const p = id.parent;
  if ((ts.isVariableDeclaration(p) || ts.isBindingElement(p) || ts.isParameter(p) || ts.isPropertyAssignment(p)) && p.name === id) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  return !(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.left === id);
}

// Si la comparacion de ok o status es verdadera cuando la peticion fallo.
function comparacionDiceFallo(bin: ts.BinaryExpression, lado: ts.Node, campo: string): boolean {
  const otro = sinEnvoltorio(bin.left === lado ? bin.right : bin.left);
  const op = bin.operatorToken.kind;
  const igual = op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken;
  const distinto = op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken;
  if (campo === 'ok') {
    const conTrue = otro.kind === ts.SyntaxKind.TrueKeyword;
    if (igual) return !conTrue;
    return distinto ? conTrue : true;
  }
  const n = ts.isNumericLiteral(otro) ? Number(otro.text) : Number.NaN;
  if (igual) return !(n >= 200 && n < 300);
  if (distinto) return true;
  if (op === ts.SyntaxKind.LessThanToken || op === ts.SyntaxKind.LessThanEqualsToken) return !(n > 200);
  return !(n < 299);
}

interface Decision {
  raiz: ts.Node;
  fallaSiVerdad: boolean;
}

// Sube desde la lectura (res.ok, res.status) hasta la condicion que la usa y dice si
// esa condicion verdadera es la rama del fallo.
function polaridad(nodo: ts.Node, fallaSiVerdad: boolean, campo: string): Decision {
  const p = nodo.parent;
  if (ts.isParenthesizedExpression(p)) return polaridad(p, fallaSiVerdad, campo);
  if (ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.ExclamationToken) return polaridad(p, !fallaSiVerdad, campo);
  if (ts.isBinaryExpression(p)) {
    const op = p.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) return polaridad(p, fallaSiVerdad, campo);
    if (COMPARACIONES.has(op)) return polaridad(p, comparacionDiceFallo(p, nodo, campo), campo);
  }
  return { raiz: nodo, fallaSiVerdad };
}

function sale(s: ts.Statement): boolean {
  const ultima = ts.isBlock(s) ? s.statements[s.statements.length - 1] : s;
  return ultima !== undefined && (ts.isReturnStatement(ultima) || ts.isThrowStatement(ultima)
    || ts.isContinueStatement(ultima) || ts.isBreakStatement(ultima));
}

function restoDelBloque(si: ts.IfStatement): ts.Statement[] {
  const p = si.parent;
  if (!ts.isBlock(p) && !ts.isSourceFile(p) && !ts.isCaseClause(p) && !ts.isDefaultClause(p)) return [];
  const lista = [...p.statements];
  return lista.slice(lista.indexOf(si) + 1);
}

function ramaDeFalloAtiende(si: ts.IfStatement, fallaSiVerdad: boolean, deError: ReadonlySet<string>): boolean {
  if (fallaSiVerdad) return todosAvisan(si.thenStatement, deError);
  if (si.elseStatement) return todosAvisan(si.elseStatement, deError);
  // if (res.ok) { ...; return } y el fallo sigue por debajo: lo que viene despues es su rama.
  return sale(si.thenStatement) && caminosAvisan(caminosDeLista(restoDelBloque(si), false, deError, false));
}

// Una lectura del estado (res.ok, res.status) atiende el fallo si con ella se decide algo
// y la rama del fallo avisa, o si se entrega a otro: se devuelve, se pasa a una funcion o
// va dentro de un objeto o de un texto que se entrega. Leida y tirada (void, una variable
// que nadie usa) no atiende nada.
function lecturaAtiende(lectura: ts.PropertyAccessExpression, deError: ReadonlySet<string>): boolean {
  return estadoAtiende(lectura, { campo: lectura.name.text, falla: false, vueltas: 0 }, deError);
}

// Como se lee un estado: de que campo sale, si su valor verdadero es el fallo y cuantas
// veces se ha guardado ya en otro nombre.
interface Lectura { campo: string; falla: boolean; vueltas: number }

function estadoAtiende(nodo: ts.Node, l: Lectura, deError: ReadonlySet<string>): boolean {
  const { raiz, fallaSiVerdad } = polaridad(nodo, l.falla, l.campo);
  const p = raiz.parent;
  if (ts.isIfStatement(p) && p.expression === raiz) return ramaDeFalloAtiende(p, fallaSiVerdad, deError);
  if (ts.isConditionalExpression(p) && p.condition === raiz) return devuelveElFallo(fallaSiVerdad ? p.whenTrue : p.whenFalse, deError);
  if (ts.isExpressionStatement(p)) return cortocircuitoAvisa(raiz, fallaSiVerdad, deError);
  const destino = destinoDeValor(raiz);
  if (destino.tipo !== 'nombre') return destino.tipo === 'entregada';
  // Guardado en un nombre: se sigue ese nombre (si se guardo ya decidido, como un si o no).
  const siguiente: Lectura = { campo: raiz === nodo ? l.campo : 'ok', falla: fallaSiVerdad, vueltas: l.vueltas + 1 };
  return siguiente.vueltas <= 3 && nombreDeEstadoAtiende(destino, siguiente, deError);
}

// !res.ok && aviso(...) o res.ok || aviso(...) sueltos: la parte derecha es la rama del fallo.
function cortocircuitoAvisa(raiz: ts.Node, fallaSiVerdad: boolean, deError: ReadonlySet<string>): boolean {
  if (!ts.isBinaryExpression(raiz)) return false;
  const op = raiz.operatorToken.kind;
  const derechaEnFallo = (op === ts.SyntaxKind.AmpersandAmpersandToken && fallaSiVerdad)
    || (op === ts.SyntaxKind.BarBarToken && !fallaSiVerdad);
  return derechaEnFallo && expresionAvisa(raiz.right, deError);
}

// A donde va un valor leido de la respuesta: a nadie (se tira), a quien lo recibe, o a un
// nombre que hay que seguir. Un texto, una cuenta, un objeto o una lista con el valor
// dentro van a donde vayan ellos.
function destinoDeValor(n: ts.Node): Destino {
  let e: ts.Node = n;
  let p: ts.Node | undefined = e.parent;
  while (p) {
    if (ts.isExpressionStatement(p) || ts.isVoidExpression(p)) return NADIE;
    if (ts.isVariableDeclaration(p)) return p.initializer === e && ts.isIdentifier(p.name) ? enNombre(p.name.text, p) : ENTREGADA;
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      return p.right === e && ts.isIdentifier(p.left) ? enNombre(p.left.text, p) : ENTREGADA;
    }
    if (!envuelveElValor(p, e)) return ENTREGADA;
    e = p;
    p = e.parent;
  }
  return NADIE;
}

// Lo que solo envuelve el valor, sin decidir nada ni entregarlo.
function envuelveElValor(p: ts.Node, e: ts.Node): boolean {
  if (ts.isConditionalExpression(p)) return p.condition !== e;
  return ts.isBinaryExpression(p) || ts.isParenthesizedExpression(p) || ts.isAsExpression(p)
    || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p) || ts.isPrefixUnaryExpression(p)
    || ts.isTemplateSpan(p) || ts.isTemplateExpression(p) || ts.isPropertyAssignment(p)
    || ts.isShorthandPropertyAssignment(p) || ts.isObjectLiteralExpression(p)
    || ts.isArrayLiteralExpression(p) || ts.isSpreadElement(p) || ts.isSpreadAssignment(p);
}

// El estado guardado en un nombre: atiende si alguna vez se decide con el y la rama del
// fallo avisa, o si se entrega a otro.
function nombreDeEstadoAtiende(destino: Extract<Destino, { tipo: 'nombre' }>, l: Lectura, deError: ReadonlySet<string>): boolean {
  let atendido = false;
  const visitar = (n: ts.Node): void => {
    if (atendido) return;
    if (ts.isIdentifier(n) && n.text === destino.nombre && esReferencia(n) && !dentroDeSinLector(n, destino.ambito)) {
      atendido = estadoAtiende(n, l, deError);
    }
    ts.forEachChild(n, visitar);
  };
  visitar(destino.ambito);
  return atendido;
}

function usoAtiende(ref: ts.Identifier, deError: ReadonlySet<string>): boolean {
  let q: ts.Node = ref;
  while (ts.isNonNullExpression(q.parent) || ts.isParenthesizedExpression(q.parent)) q = q.parent;
  const p = q.parent;
  // La respuesta entera se devuelve, se pasa o se guarda: decide quien la recibe.
  if (!ts.isPropertyAccessExpression(p) || p.expression !== q) return true;
  // res.json(), res.text(): se usa el cuerpo sin mirar si fallo.
  if (!LECTURAS_DE_ESTADO.has(p.name.text)) return false;
  return lecturaAtiende(p, deError);
}

// La respuesta guardada en "nombre": se mira si fallo y la rama del fallo avisa, o se entrega entera.
function respuestaAtendida(nombre: string, ambito: ts.Node): boolean {
  const deError: ReadonlySet<string> = new Set([nombre]);
  let atendida = false;
  const visitar = (n: ts.Node): void => {
    if (atendida) return;
    if (ts.isIdentifier(n) && n.text === nombre && esReferencia(n) && !dentroDeSinLector(n, ambito)) {
      atendida = usoAtiende(n, deError);
    }
    ts.forEachChild(n, visitar);
  };
  visitar(ambito);
  return atendida;
}

function respuestaMirada(llamada: ts.CallExpression): boolean {
  const destino = destinoDe(llamada);
  if (destino.tipo === 'nadie') return false;
  if (destino.tipo === 'entregada') return true;
  return respuestaAtendida(destino.nombre, destino.ambito);
}

function hallazgosDe(sf: ts.SourceFile): Hallazgo[] {
  const out: Hallazgo[] = [];
  const visitar = (n: ts.Node): void => {
    if (ts.isCatchClause(n)) {
      const regla = reglaCatch(n);
      if (regla) out.push({ regla, inicio: n.getStart(sf) });
    } else if (ts.isCallExpression(n)) {
      const nombre = promesaCallada(n);
      if (nombre) out.push({ regla: 'PROMESA_CALLADA', inicio: nombre.getStart(sf) });
      if (esFetch(n) && !respuestaMirada(n)) out.push({ regla: 'RESPUESTA_SIN_MIRAR', inicio: n.getStart(sf) });
    } else if (ts.isIfStatement(n) && sinBaseCallado(n)) {
      out.push({ regla: 'SIN_BASE_CALLADO', inicio: n.getStart(sf) });
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return out;
}

// Los rechazos del estandar aceptados en todo el proyecto, uno por linea.
const rechazosAceptados = new Map<string, { file: string; line: number; norma: string }>();

function silenciosDe(file: string): Violation[] {
  const texto = fs.readFileSync(file, 'utf-8');
  const sf = ts.createSourceFile(path.basename(file), texto, ts.ScriptTarget.ES2017, true);
  const lineas = texto.split('\n');
  const rel = path.relative(process.cwd(), file);
  aceptadosEnArchivo = [];
  const hallazgos = hallazgosDe(sf);
  for (const { inicio, nombre } of aceptadosEnArchivo) {
    const fila = sf.getLineAndCharacterOfPosition(inicio).line;
    const norma = RECHAZOS_ESPERADOS.find(r => r.nombre === nombre)?.norma ?? nombre;
    rechazosAceptados.set(`${rel}:${fila + 1}`, { file: rel, line: fila + 1, norma });
  }
  return hallazgos.map(h => {
    const fila = sf.getLineAndCharacterOfPosition(h.inicio).line;
    return {
      file: rel, line: fila + 1, rule: h.regla,
      content: lineas[fila].trim().substring(0, 120),
    };
  });
}

function esArchivoDePrueba(file: string): boolean {
  return /\.test\.|\.spec\.|__tests__[/\\]/.test(file.replace(/\\/g, '/'));
}

// Sin corchetes, para que no se confunda con un fallo ([REGLA]).
function imprimirRechazos(): void {
  if (rechazosAceptados.size === 0) return;
  console.log(`\nRechazos que el estandar define como no fallo (${rechazosAceptados.size}), cada uno con su norma:`);
  for (const r of rechazosAceptados.values()) console.log(`  ${r.file}:${r.line} (rechazo del estandar) ${r.norma}`);
}

function imprimirLeyenda(violaciones: Violation[]): void {
  const reglas = [...new Set(violaciones.map(v => v.rule))].filter(r => QUE_ESCONDE[r]);
  if (reglas.length === 0) return;
  console.error('\n  Que esconde cada forma de callar un error:');
  for (const r of reglas) {
    console.error(`    ${r}: ${QUE_ESCONDE[r]} (${violaciones.filter(v => v.rule === r).length}).`);
  }
  console.error('  Para arreglarlo: que el fallo llegue a alguien (se lance con su codigo y su motivo, se devuelva como fallo o se ensene en pantalla).');
  console.error('  Ninguna nota escrita en el codigo lo calla: no hay excepciones.\n');
}

const todos = SRC_DIRS.flatMap(d => collectFiles(d));
// Sin ningun archivo que leer no se ha comprobado nada: eso nunca es un verde.
if (todos.length === 0) {
  console.error(`\n  No se ha leido ningun archivo en ${SRC_DIRS.join(', ')}: el verificador no ha comprobado nada.\n`);
  process.exit(1);
}
const files = todos.filter(f => !shouldSkipFile(f));
const allViolations: Violation[] = [];

for (const file of files) {
  allViolations.push(...scanFile(file));
}

// Las formas que leen el codigo entero miran todo SRC_DIRS, menos las pruebas.
const conFormas = todos.filter(f => !esArchivoDePrueba(f));
allViolations.push(...conFormas.flatMap(silenciosDe));

console.log(`Archivos escaneados: ${files.length} (reglas de linea) y ${conFormas.length} (leyendo el codigo entero)`);
imprimirRechazos();

if (allViolations.length === 0) {
  console.log('No se encontraron errores silenciados ni defaults falsos.\n');
  process.exit(0);
} else {
  console.error(`\n  ${allViolations.length} violacion(es):\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} [${v.rule}]`);
    console.error(`    ${v.content}`);
  }
  imprimirLeyenda(allViolations);
  process.exit(1);
}
