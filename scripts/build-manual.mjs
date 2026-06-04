// =============================================================================
// build-manual.mjs — Generates a self-contained manual.html for the
// "Métodos de Solución para Investigación de Operaciones" web application.
//
// Usage:   bun scripts/build-manual.mjs
// Output:  manual.html (project root)
// =============================================================================

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Embed KaTeX fonts as base64 data URIs so the HTML is fully self-contained
// ---------------------------------------------------------------------------

const fontsDir = resolve(projectRoot, "node_modules/katex/dist/fonts");
const fontFiles = readdirSync(fontsDir);

const katexCss = readFileSync(
  resolve(projectRoot, "node_modules/katex/dist/katex.min.css"),
  "utf-8",
).replaceAll(/url\(fonts\/([^)]+)\)/g, (_match, filename) => {
  const fontPath = resolve(fontsDir, filename);
  const fontData = readFileSync(fontPath);
  const base64 = fontData.toString("base64");
  const mime = filename.endsWith(".woff2")
    ? "font/woff2"
    : filename.endsWith(".woff")
      ? "font/woff"
      : "font/truetype";
  return `url(data:${mime};base64,${base64})`;
});

// ---------------------------------------------------------------------------
// KaTeX helpers
// ---------------------------------------------------------------------------

const m = (expression) =>
  katex.renderToString(expression, { throwOnError: false, displayMode: false });

const md = (expression) =>
  katex.renderToString(expression, { throwOnError: false, displayMode: true });

// ---------------------------------------------------------------------------
// HTML builder utilities
// ---------------------------------------------------------------------------

const raw = String.raw;

const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const tag = (name, attrs = {}, content = "") => {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return `<${name}${attrStr}>${content}</${name}>`;
};

// ---------------------------------------------------------------------------
// Content building blocks
// ---------------------------------------------------------------------------

const coverPage = () => raw`
<main class="cover">
  <div class="cover-body">
    <h1 class="cover-title">Manual de Usuario y Funcionamiento Interno</h1>
    <p class="cover-subtitle">M&eacute;todos de Soluci&oacute;n para Investigaci&oacute;n de Operaciones</p>
    <div class="cover-line"></div>
    <div class="cover-info">
      <p><strong>Alumno:</strong> Mario Dariel Fierro Guti&eacute;rrez</p>
      <p><strong>Profesora:</strong> Miriam Rend&oacute;n</p>
      <p><strong>Materia:</strong> Investigaci&oacute;n de Operaciones</p>
      <p><strong>Instituto:</strong> Tecnol&oacute;gico Nacional de M&eacute;xico (TecNM)</p>
    </div>
  </div>
</main>`;

const toc = () => raw`
<nav class="toc" id="toc">
  <h2 class="toc-title">&Iacute;ndice</h2>
  <ol class="toc-list">
    <li><a href="#c1">Introducci&oacute;n</a></li>
    <li><a href="#c2">Uso de la p&aacute;gina</a>
      <ol>
        <li><a href="#c2-1">Navegaci&oacute;n general</a></li>
        <li><a href="#c2-2">M&eacute;todo de Transporte</a></li>
        <li><a href="#c2-3">M&eacute;todo Simplex tabular</a></li>
        <li><a href="#c2-4">M&eacute;todo Gr&aacute;fico Lineal</a></li>
        <li><a href="#c2-5">M&eacute;todo No Lineal Gr&aacute;fico</a></li>
      </ol>
    </li>
    <li><a href="#c3">Funcionamiento interno de los algoritmos</a>
      <ol>
        <li><a href="#c3-1">Problemas de Transporte</a></li>
        <li><a href="#c3-2">M&eacute;todo Simplex tabular</a></li>
        <li><a href="#c3-3">M&eacute;todo Gr&aacute;fico Lineal</a></li>
        <li><a href="#c3-4">M&eacute;todo No Lineal Gr&aacute;fico</a></li>
      </ol>
    </li>
    <li><a href="#c4">Validaci&oacute;n y pruebas</a></li>
    <li><a href="#refs">Referencias</a></li>
  </ol>
</nav>`;

const chapterIntro = () => raw`
<section class="chapter" id="c1">
  <h2>1. Introducci&oacute;n</h2>

  <p>Este documento corresponde al proyecto <strong>&laquo;M&eacute;todos de Soluci&oacute;n para Investigaci&oacute;n de Operaciones&raquo;</strong>, una aplicaci&oacute;n web interactiva desarrollada para la materia de Investigaci&oacute;n de Operaciones del Tecnol&oacute;gico Nacional de M&eacute;xico (TecNM).</p>

  <p>El sitio ofrece soluciones paso a paso de cuatro algoritmos cl&aacute;sicos de la disciplina, presentando cada decisi&oacute;n intermedia con notaci&oacute;n matem&aacute;tica, tablas interactivas y gr&aacute;ficas. Los ejercicios son completamente editables, lo que permite modificar los datos de entrada y observar c&oacute;mo cambian las soluciones en tiempo real.</p>

  <p>Los cuatro m&eacute;todos implementados son:</p>

  <ol class="alt">
    <li><strong>Problemas de Transporte.</strong> Incluye los m&eacute;todos de Esquina Noroeste, Costo M&iacute;nimo y Aproximaci&oacute;n de Vogel para la soluci&oacute;n inicial factible, adem&aacute;s de la optimizaci&oacute;n mediante el m&eacute;todo MODI (Modified Distribution Method).</li>
    <li><strong>Simplex tabular.</strong> Resuelve problemas de programaci&oacute;n lineal por el m&eacute;todo tabular, mostrando el tableau inicial, cada iteraci&oacute;n de pivoteo, las operaciones de rengl&oacute;n y el valor de la funci&oacute;n objetivo.</li>
    <li><strong>M&eacute;todo Gr&aacute;fico.</strong> Para problemas de dos variables, construye la regi&oacute;n factible en el plano cartesiano, enumera los v&eacute;rtices candidatos y eval&uacute;a la funci&oacute;n objetivo en cada uno.</li>
    <li><strong>No lineal gr&aacute;fico.</strong> Extiende el m&eacute;todo gr&aacute;fico a restricciones cuadr&aacute;ticas (c&iacute;rculos, elipses, par&aacute;bolas), incluyendo puntos de tangencia de la funci&oacute;n objetivo con las fronteras curvas.</li>
  </ol>

  <p>El sitio est&aacute; construido como una p&aacute;gina web est&aacute;tica, lo que significa que todo el procesamiento ocurre directamente en el navegador del usuario. No se env&iacute;an datos a ning&uacute;n servidor; cada problema se resuelve localmente en el instante en que se modifican los valores de entrada.</p>
</section>`;

// =============================================================================
// CHAPTER 2: USAGE GUIDE
// =============================================================================

const chapterUsage = () => raw`
<section class="chapter" id="c2">
  <h2>2. Uso de la p&aacute;gina</h2>

  <section id="c2-1">
    <h3>2.1 Navegaci&oacute;n general</h3>

    <p>La p&aacute;gina de inicio muestra las fichas de los cuatro m&eacute;todos disponibles. Para acceder a cualquiera de ellos se puede hacer clic en el bot&oacute;n <em>&laquo;Abrir m&eacute;todo&raquo;</em> de la ficha correspondiente, o bien usar la barra de navegaci&oacute;n superior que enlista los m&eacute;todos directamente.</p>

    <p>En la esquina superior derecha se encuentra un interruptor de tema que alterna entre modo claro y modo oscuro, &uacute;til para distintos entornos de lectura.</p>

    <p>En dispositivos m&oacute;viles la navegaci&oacute;n se adapta mediante un men&uacute; desplegable.</p>

    <p>Todas las p&aacute;ginas de m&eacute;todo comparten un dise&ntilde;o com&uacute;n:</p>

    <ul>
      <li><strong>Panel izquierdo:</strong> contiene la tabla, gr&aacute;fica o visualizaci&oacute;n principal del m&eacute;todo, as&iacute; como el editor de datos de entrada.</li>
      <li><strong>Panel derecho:</strong> muestra la explicaci&oacute;n del paso actual, los resultados parciales y los controles de navegaci&oacute;n entre pasos (anterior / siguiente). En escritorio permanece visible al hacer scroll; en m&oacute;vil se ubica en la parte inferior.</li>
    </ul>

    <p>Cada m&eacute;todo avanza mediante pasos numerados. La explicaci&oacute;n de cada paso describe la decisi&oacute;n tomada en ese momento (celda seleccionada, columna pivote, restricci&oacute;n agregada, etc.) y las justifica con los c&aacute;lculos correspondientes.</p>
  </section>

  <section id="c2-2">
    <h3>2.2 M&eacute;todo de Transporte</h3>

    <p>La p&aacute;gina de Transporte permite resolver problemas de transporte mediante tres m&eacute;todos de soluci&oacute;n inicial y optimizaci&oacute;n MODI.</p>

    <p><strong>Editor de datos.</strong> El usuario puede modificar:</p>
    <ul>
      <li>La cantidad de or&iacute;genes y destinos (entre 2 y 8 cada uno).</li>
      <li>La <strong>matriz de costos</strong> ${m("c_{ij}")}: costo de transportar una unidad desde el origen ${m("i")} hasta el destino ${m("j")}.</li>
      <li>El vector de <strong>oferta</strong> ${m("s_i")}: disponibilidad de cada origen.</li>
      <li>El vector de <strong>demanda</strong> ${m("d_j")}: requerimiento de cada destino.</li>
    </ul>

    <p><strong>Selecci&oacute;n de m&eacute;todo.</strong> Mediante botones de radio en la cabecera se puede elegir entre Esquina Noroeste, Costo M&iacute;nimo o Aproximaci&oacute;n de Vogel. El m&eacute;todo MODI se aplica autom&aacute;ticamente despu&eacute;s de la soluci&oacute;n inicial, optimizando el costo total.</p>

    <p><strong>Tabla de soluci&oacute;n.</strong> La tabla principal muestra:</p>
    <ul>
      <li>Los costos en cada celda (n&uacute;mero peque&ntilde;o).</li>
      <li>Las cantidades asignadas (n&uacute;mero grande en negritas).</li>
      <li>Las celdas b&aacute;sicas resaltadas con color.</li>
      <li>Las celdas seleccionadas en el paso actual, resaltadas con un color distinto.</li>
      <li>Las ofertas y demandas que ya fueron satisfechas aparecen tachadas.</li>
      <li>Para Vogel, las penalizaciones de cada rengl&oacute;n y columna se muestran como texto coloreado debajo de la tabla.</li>
    </ul>

    <p><strong>Navegaci&oacute;n de pasos.</strong> Los botones <em>Anterior</em> y <em>Siguiente</em> permiten recorrer cada asignaci&oacute;n individual, y posteriormente las iteraciones de MODI. La explicaci&oacute;n a la derecha detalla qu&eacute; celda se eligi&oacute;, por qu&eacute;, y c&oacute;mo quedaron oferta y demanda despu&eacute;s de la asignaci&oacute;n.</p>
  </section>

  <section id="c2-3">
    <h3>2.3 M&eacute;todo Simplex tabular</h3>

    <p>La p&aacute;gina de Simplex resuelve problemas de programaci&oacute;n lineal por el m&eacute;todo tabular completo.</p>

    <p><strong>Editor de datos.</strong> El usuario puede definir:</p>
    <ul>
      <li>La cantidad de restricciones y variables de decisi&oacute;n (hasta 6 cada una).</li>
      <li>Los <strong>coeficientes</strong> de las restricciones ${m("a_{ij}")}.</li>
      <li>Los <strong>recursos</strong> ${m("b_i")} (lado derecho de cada restricci&oacute;n).</li>
      <li>Los <strong>coeficientes de la funci&oacute;n objetivo</strong> ${m("c_j")}.</li>
      <li>El sentido de optimizaci&oacute;n: maximizar o minimizar.</li>
    </ul>

    <p><strong>Tableau.</strong> La tabla muestra las variables b&aacute;sicas a la izquierda, las variables no b&aacute;sicas como encabezados de columna, y el rengl&oacute;n de la funci&oacute;n objetivo al final. Los n&uacute;meros que cambian en cada operaci&oacute;n se resaltan con color, y junto a la tabla se muestra la f&oacute;rmula aplicada (por ejemplo: <em>R2 = R2 &minus; 3 &times; R1</em>).</p>

    <p><strong>Elementos visuales de cada iteraci&oacute;n:</strong></p>
    <ul>
      <li>La <strong>columna pivote</strong> se marca con un color distintivo.</li>
      <li>La <strong>columna de razones</strong> muestra el cociente entre el recurso y el coeficiente de la columna pivote.</li>
      <li>La <strong>fila pivote</strong> se identifica por tener la raz&oacute;n m&iacute;nima positiva.</li>
      <li>El <strong>elemento pivote</strong> se resalta con doble color.</li>
      <li>Las <strong>operaciones de rengl&oacute;n</strong> se describen textualmente.</li>
    </ul>

    <p>Al finalizar, se muestra el valor &oacute;ptimo de la funci&oacute;n objetivo ${m("Z")} y los valores de todas las variables (b&aacute;sicas y no b&aacute;sicas).</p>
  </section>

  <section id="c2-4">
    <h3>2.4 M&eacute;todo Gr&aacute;fico Lineal</h3>

    <p>La p&aacute;gina del M&eacute;todo Gr&aacute;fico resuelve problemas de dos variables ${m("x_1, x_2")} mediante construcci&oacute;n geom&eacute;trica.</p>

    <p><strong>Editor de datos.</strong> Permite definir:</p>
    <ul>
      <li>Los coeficientes de la funci&oacute;n objetivo ${m("c_1, c_2")} y el sentido (maximizar o minimizar).</li>
      <li>Hasta 8 restricciones lineales, cada una con coeficientes ${m("a, b")}, operador (${m("\\le, \\ge, =, \\lt, \\gt")}) y lado derecho ${m("c")}.</li>
    </ul>

    <p><strong>Gr&aacute;fica.</strong> La visualizaci&oacute;n principal es un plano cartesiano que evoluciona paso a paso:</p>
    <ul>
      <li>Cada paso agrega una restricci&oacute;n y muestra su recta frontera.</li>
      <li>La <strong>regi&oacute;n factible</strong> se sombrea progresivamente conforme se a&ntilde;aden restricciones.</li>
      <li>Los <strong>v&eacute;rtices</strong> de la regi&oacute;n factible se marcan con puntos una vez construida la regi&oacute;n completa.</li>
      <li>El <strong>punto &oacute;ptimo</strong> se resalta con un marcador especial, y el segmento &oacute;ptimo se dibuja cuando hay soluciones m&uacute;ltiples.</li>
      <li>Cuando el problema es no acotado se dibuja una flecha en la direcci&oacute;n de mejora infinita.</li>
    </ul>

    <p><strong>Tabla de v&eacute;rtices.</strong> Una tabla enumera cada v&eacute;rtice factible con sus coordenadas, las restricciones que lo generan, el valor de ${m("Z")} en ese punto, y si es el &oacute;ptimo.</p>
  </section>

  <section id="c2-5">
    <h3>2.5 M&eacute;todo No Lineal Gr&aacute;fico</h3>

    <p>Esta p&aacute;gina extiende el m&eacute;todo gr&aacute;fico a problemas con restricciones cuadr&aacute;ticas.</p>

    <p><strong>Editor de datos.</strong> Permite definir restricciones de la forma:</p>

    ${md("q_1 x_1^2 + q_2 x_2^2 + a x_1 + b x_2 \\; \\text{[operador]} \\; c")}

    <p>Donde los coeficientes ${m("q_1, q_2, a, b")} pueden ser cero, dando lugar a distintos tipos de curvas: rectas, c&iacute;rculos, elipses o par&aacute;bolas.</p>

    <p><strong>Gr&aacute;fica.</strong> La visualizaci&oacute;n muestra:</p>
    <ul>
      <li>Cada restricci&oacute;n como su curva frontera (recta, c&iacute;rculo, elipse o par&aacute;bola).</li>
      <li>Las fronteras estrictas (operadores ${m("\\lt")} y ${m("\\gt")}) se dibujan con l&iacute;nea discontinua.</li>
      <li>La <strong>regi&oacute;n factible</strong> se representa mediante un muestreo de puntos.</li>
      <li>Los <strong>puntos candidatos</strong> (intersecciones, tangencias) se marcan y etiquetan.</li>
      <li>El &oacute;ptimo se resalta, mostrando su valor exacto cuando es posible (fracciones y radicales).</li>
    </ul>

    <p><strong>Explicaci&oacute;n de candidatos.</strong> Cada punto candidato incluye la deducci&oacute;n algebraica que lo produjo, presentada paso a paso.</p>
  </section>
</section>`;

// =============================================================================
// CHAPTER 3: INTERNAL WORKINGS
// =============================================================================

const chapterInternal = () => raw`
<section class="chapter" id="c3">
  <h2>3. Funcionamiento interno de los algoritmos</h2>

  <p>En este cap&iacute;tulo se describen los fundamentos matem&aacute;ticos de cada algoritmo. No se discuten detalles de implementaci&oacute;n en c&oacute;digo, sino la l&oacute;gica matem&aacute;tica que produce cada resultado. Los conceptos expuestos provienen de la literatura est&aacute;ndar de investigaci&oacute;n de operaciones; las referencias completas se listan al final del documento.</p>

  <!-- ================================================================= -->
  <section id="c3-1">
    <h3>3.1 Problemas de Transporte</h3>

    <p>Un problema de transporte consiste en minimizar el costo total de enviar unidades desde ${m("m")} or&iacute;genes hasta ${m("n")} destinos. El modelo matem&aacute;tico es:</p>

    ${md("\\min Z = \\sum_{i=1}^{m} \\sum_{j=1}^{n} c_{ij} x_{ij}")}

    <p>Sujeto a:</p>

    ${md("\\sum_{j=1}^{n} x_{ij} = s_i \\quad (i = 1,\\ldots,m)")}
    ${md("\\sum_{i=1}^{m} x_{ij} = d_j \\quad (j = 1,\\ldots,n)")}
    ${md("x_{ij} \\ge 0")}

    <p>Donde ${m("c_{ij}")} es el costo unitario de transportar desde el origen ${m("i")} al destino ${m("j")}, ${m("s_i")} es la oferta del origen ${m("i")}, y ${m("d_j")} es la demanda del destino ${m("j")}.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.1.1 Balanceo de oferta y demanda</h4>

    <p>Para que el problema tenga soluci&oacute;n, la oferta total debe igualar a la demanda total. Si ${m("\\sum s_i \\neq \\sum d_j")}, se a&ntilde;ade:</p>
    <ul>
      <li>Un <strong>origen ficticio</strong> (cuando la demanda excede a la oferta) o</li>
      <li>Un <strong>destino ficticio</strong> (cuando la oferta excede a la demanda),</li>
    </ul>
    <p>ambos con costos de transporte iguales a cero.</p>

    <p>Un problema con ${m("m")} or&iacute;genes y ${m("n")} destinos tendr&aacute; ${m("m + n - 1")} variables b&aacute;sicas en cualquier soluci&oacute;n factible b&aacute;sica no degenerada.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.1.2 Esquina Noroeste</h4>

    <p>Es un m&eacute;todo heur&iacute;stico que construye una soluci&oacute;n inicial factible recorriendo la matriz de costos de izquierda a derecha y de arriba hacia abajo.</p>

    <p><strong>Procedimiento:</strong></p>
    <ol class="alt">
      <li>Se comienza en la celda superior izquierda (esquina noroeste).</li>
      <li>Se asigna la m&aacute;xima cantidad posible: ${m("x_{ij} = \\min(s_i, d_j)")}.</li>
      <li>Se actualizan oferta y demanda restando la cantidad asignada.</li>
      <li>Si la oferta se agota, se avanza hacia abajo a la siguiente fila. Si la demanda se satisface, se avanza hacia la derecha a la siguiente columna. Si ambas se cumplen simult&aacute;neamente, se avanza en diagonal (una fila hacia abajo y una columna a la derecha).</li>
      <li>Se repite hasta que todas las ofertas y demandas quedan en cero.</li>
    </ol>

    <p>Este m&eacute;todo no considera los costos; solo garantiza factibilidad, no optimalidad.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.1.3 Costo M&iacute;nimo</h4>

    <p>Este m&eacute;todo s&iacute; considera los costos para construir la soluci&oacute;n inicial: en cada paso se elige la celda con el menor costo entre todas las filas y columnas que a&uacute;n tienen oferta o demanda disponible.</p>

    <p><strong>Procedimiento:</strong></p>
    <ol class="alt">
      <li>Se busca la celda con el menor costo ${m("c_{ij}")} entre las filas y columnas activas (aquellas cuya oferta o demanda a&uacute;n no es cero).</li>
      <li>Se asigna ${m("x_{ij} = \\min(s_i, d_j)")}.</li>
      <li>Se actualizan oferta y demanda. La fila o columna que llega a cero se desactiva.</li>
      <li>Se repite hasta que todas las filas y columnas quedan desactivadas.</li>
    </ol>

    <p>En caso de empate (varias celdas con el mismo costo m&iacute;nimo), se elige la primera encontrada.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.1.4 Aproximaci&oacute;n de Vogel (VAM)</h4>

    <p>El m&eacute;todo de Aproximaci&oacute;n de Vogel (Vogel&rsquo;s Approximation Method, VAM) suele producir una soluci&oacute;n inicial m&aacute;s cercana al &oacute;ptimo que los m&eacute;todos anteriores, porque penaliza la no asignaci&oacute;n a la celda de menor costo en cada fila o columna.</p>

    <p><strong>Procedimiento:</strong></p>
    <ol class="alt">
      <li>Para cada fila activa, se calcula la <strong>penalizaci&oacute;n</strong> como la diferencia entre el menor costo y el segundo menor costo de esa fila. Lo mismo para cada columna activa.</li>
      <li>Se selecciona la fila o columna con la <strong>mayor penalizaci&oacute;n</strong>.</li>
      <li>Dentro de esa fila o columna, se elige la celda de <strong>menor costo</strong>.</li>
      <li>Se asigna ${m("x_{ij} = \\min(s_i, d_j)")} y se actualizan oferta y demanda.</li>
      <li>Se repite desde el paso 1 hasta completar todas las asignaciones.</li>
    </ol>

    <p>Las penalizaciones se recalculan en cada iteraci&oacute;n porque las filas y columnas que se agotan desaparecen del c&aacute;lculo.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.1.5 Optimizaci&oacute;n MODI (Modified Distribution Method)</h4>

    <p>El m&eacute;todo MODI toma una soluci&oacute;n factible b&aacute;sica inicial (generada por cualquiera de los m&eacute;todos anteriores) y la mejora iterativamente hasta alcanzar el &oacute;ptimo. Se basa en la teor&iacute;a de dualidad de la programaci&oacute;n lineal.</p>

    <p><strong>Paso 1: C&aacute;lculo de potenciales.</strong> Para cada celda b&aacute;sica ${m("(i,j)")} se debe cumplir:</p>

    ${md("u_i + v_j = c_{ij}")}

    <p>Se fija ${m("u_1 = 0")} (o cualquier valor arbitrario) y se resuelve el sistema por sustituci&oacute;n sucesiva para obtener todos los potenciales de fila ${m("u_i")} y columna ${m("v_j")}.</p>

    <p><strong>Paso 2: Costos de oportunidad.</strong> Para cada celda no b&aacute;sica se calcula:</p>

    ${md("\\Delta_{ij} = c_{ij} - (u_i + v_j)")}

    <p>Si todos los ${m("\\Delta_{ij} \\ge 0")}, la soluci&oacute;n actual es &oacute;ptima y el algoritmo termina. En caso contrario, la celda con el valor m&aacute;s negativo de ${m("\\Delta_{ij}")} (la que m&aacute;s reduce el costo) se elige como <strong>celda entrante</strong>.</p>

    <p><strong>Paso 3: Construcci&oacute;n del ciclo.</strong> Se a&ntilde;ade temporalmente la celda entrante a la base (ahora hay ${m("(m+n-1)+1")} celdas) y se busca un ciclo cerrado que alterne celdas b&aacute;sicas, comenzando y terminando en la celda entrante, con movimientos exclusivamente horizontales y verticales, doblando solo en celdas b&aacute;sicas. El ciclo siempre existe y es &uacute;nico.</p>

    <p>Las celdas del ciclo se etiquetan alternadamente como receptoras (+) y donadoras (&minus;), comenzando con + en la celda entrante.</p>

    <p><strong>Paso 4: Determinaci&oacute;n de ${m("\\theta")}.</strong> Se toma el menor valor de asignaci&oacute;n entre las celdas donadoras del ciclo:</p>

    ${md("\\theta = \\min\\{ x_{ij} \\mid (i,j) \\text{ es celda donadora en el ciclo} \\}")}

    <p><strong>Paso 5: Actualizaci&oacute;n.</strong> Se suma ${m("\\theta")} a las celdas receptoras y se resta de las celdas donadoras. La celda donadora que llega a cero se elimina de la base (celda saliente). Si m&aacute;s de una llega a cero, solo una sale; las dem&aacute;s permanecen con valor cero para mantener el n&uacute;mero correcto de variables b&aacute;sicas.</p>

    <p>Se repite desde el Paso 1 hasta alcanzar la optimalidad.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.1.6 Degeneraci&oacute;n</h4>

    <p>Una soluci&oacute;n factible b&aacute;sica se considera degenerada cuando tiene menos de ${m("m + n - 1")} celdas b&aacute;sicas con valor positivo. Esto puede ocurrir durante la soluci&oacute;n inicial o durante MODI, y dificulta el c&aacute;lculo de potenciales y la construcci&oacute;n de ciclos.</p>

    <p>Para resolverlo, se a&ntilde;aden asignaciones de valor cero en celdas no b&aacute;sicas que no creen ciclos con las celdas b&aacute;sicas existentes, hasta alcanzar exactamente ${m("m + n - 1")} celdas b&aacute;sicas.</p>
  </section>

  <!-- ================================================================= -->
  <section id="c3-2">
    <h3>3.2 M&eacute;todo Simplex tabular</h3>

    <p>El m&eacute;todo Simplex resuelve problemas de programaci&oacute;n lineal en forma est&aacute;ndar. El problema general es:</p>

    ${md("\\max Z = \\sum_{j=1}^{n} c_j x_j")}

    <p>Sujeto a:</p>

    ${md("\\sum_{j=1}^{n} a_{ij} x_j \\le b_i \\quad (i = 1,\\ldots,m)")}
    ${md("x_j \\ge 0")}

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.2.1 Forma est&aacute;ndar y variables de holgura</h4>

    <p>Para aplicar el Simplex, las restricciones de desigualdad ${m("\\le")} se convierten en igualdades a&ntilde;adiendo <strong>variables de holgura</strong> ${m("s_i \\ge 0")}:</p>

    ${md("a_{i1}x_1 + a_{i2}x_2 + \\cdots + a_{in}x_n + s_i = b_i")}

    <p>Las variables de holgura forman la base inicial del tableau, y sus coeficientes en la funci&oacute;n objetivo son cero.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.2.2 Tabla inicial (tableau)</h4>

    <p>El tableau inicial tiene la siguiente estructura:</p>

    <table class="simple">
      <thead>
        <tr><th>Base</th><th>${m("x_1")}</th><th>${m("x_2")}</th><th>${m("\\cdots")}</th><th>${m("s_1")}</th><th>${m("\\cdots")}</th><th>RHS</th></tr>
      </thead>
      <tbody>
        <tr><td>${m("s_1")}</td><td>${m("a_{11}")}</td><td>${m("a_{12}")}</td><td>${m("\\cdots")}</td><td>1</td><td>${m("\\cdots")}</td><td>${m("b_1")}</td></tr>
        <tr><td>${m("s_2")}</td><td>${m("a_{21}")}</td><td>${m("a_{22}")}</td><td>${m("\\cdots")}</td><td>0</td><td>${m("\\cdots")}</td><td>${m("b_2")}</td></tr>
        <tr><td>${m("Z")}</td><td>${m("-c_1")}</td><td>${m("-c_2")}</td><td>${m("\\cdots")}</td><td>0</td><td>${m("\\cdots")}</td><td>0</td></tr>
      </tbody>
    </table>

    <p>La columna <em>Base</em> indica qu&eacute; variable est&aacute; asociada a cada rengl&oacute;n. La columna RHS contiene los valores de las variables b&aacute;sicas y el valor actual de ${m("Z")}. El rengl&oacute;n ${m("Z")} almacena los coeficientes de la funci&oacute;n objetivo con signo cambiado (negados para maximizaci&oacute;n).</p>

    <p>El sistema supone que todos los recursos ${m("b_i")} son no negativos, lo cual es necesario para que la base inicial (holguras) sea factible.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.2.3 Selecci&oacute;n del pivote</h4>

    <p>En cada iteraci&oacute;n se realizan dos selecciones:</p>

    <p><strong>Columna pivote (variable entrante):</strong> se elige la columna cuyo coeficiente en el rengl&oacute;n ${m("Z")} sea el m&aacute;s negativo. Esta variable entrar&aacute; a la base porque es la que potencialmente produce el mayor incremento en ${m("Z")} por unidad.</p>

    <p><strong>Fila pivote (variable saliente):</strong> para cada rengl&oacute;n (excepto el de ${m("Z")}), se calcula la raz&oacute;n entre el RHS y el coeficiente de la columna pivote, solo si este coeficiente es positivo:</p>

    ${md("\\text{raz\\'on}_i = \\frac{\\text{RHS}_i}{a_{i,\\text{pivote}}} \\quad \\text{para } a_{i,\\text{pivote}} > 0")}

    <p>La fila pivote es aquella con la raz&oacute;n m&iacute;nima. Esta regla (prueba de la raz&oacute;n m&iacute;nima) garantiza que la nueva soluci&oacute;n siga siendo factible (todas las variables b&aacute;sicas no negativas).</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.2.4 Operaciones de rengl&oacute;n</h4>

    <p>Una vez identificado el <strong>elemento pivote</strong> (intersecci&oacute;n de la columna y fila pivote), se realizan dos operaciones:</p>

    <ol class="alt">
      <li><strong>Normalizaci&oacute;n del rengl&oacute;n pivote:</strong> se divide todo el rengl&oacute;n pivote entre el elemento pivote, de modo que el elemento pivote se convierta en 1 y la variable entrante tome el valor del RHS dividido.</li>
      <li><strong>Eliminaci&oacute;n en los dem&aacute;s renglones:</strong> para cada uno de los otros renglones (incluyendo el de ${m("Z")}), se aplica la operaci&oacute;n:</li>
    </ol>

    ${md("R_i \\leftarrow R_i - a_{i,\\text{pivote}} \\times R_{\\text{pivote}}")}

    <p>Esto hace cero el coeficiente de la columna pivote en todos los dem&aacute;s renglones, dejando un vector can&oacute;nico (1 en la fila pivote, 0 en las dem&aacute;s). En particular, la operaci&oacute;n sobre el rengl&oacute;n ${m("Z")} actualiza el valor de la funci&oacute;n objetivo.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.2.5 Criterio de optimalidad y terminaci&oacute;n</h4>

    <p>El algoritmo itera hasta que se cumple alguna de estas condiciones:</p>

    <ul>
      <li><strong>&Oacute;ptimo alcanzado:</strong> todos los coeficientes en el rengl&oacute;n ${m("Z")} son no negativos. El valor de ${m("Z")} en la columna RHS es el valor &oacute;ptimo, y las variables b&aacute;sicas toman los valores indicados en la columna RHS.</li>
      <li><strong>Problema no acotado:</strong> existe una columna con coeficiente negativo en ${m("Z")} pero ning&uacute;n coeficiente positivo en los dem&aacute;s renglones. Esto significa que la variable puede crecer indefinidamente sin violar ninguna restricci&oacute;n, por lo que ${m("Z")} puede crecer sin l&iacute;mite (en maximizaci&oacute;n).</li>
    </ul>

    <p>El algoritmo incluye un l&iacute;mite de 100 iteraciones para evitar ciclos infinitos en casos patol&oacute;gicos.</p>
  </section>

  <!-- ================================================================= -->
  <section id="c3-3">
    <h3>3.3 M&eacute;todo Gr&aacute;fico Lineal</h3>

    <p>El m&eacute;todo gr&aacute;fico resuelve problemas de dos variables aprovechando que cada restricci&oacute;n lineal define un semiplano en ${m("\\mathbb{R}^2")}.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.3.1 An&aacute;lisis de restricciones</h4>

    <p>Cada restricci&oacute;n de la forma:</p>

    ${md("a x_1 + b x_2 \\; \\text{[operador]} \\; c")}

    <p>se analiza para determinar:</p>
    <ul>
      <li>Su <strong>tipo</strong>: lineal general, vertical (cuando ${m("b = 0")}), horizontal (cuando ${m("a = 0")}), o degenerada (${m("a = b = 0")}).</li>
      <li>Sus <strong>intersecciones con los ejes</strong>: se eval&uacute;a en ${m("x_1 = 0")} para obtener la intersecci&oacute;n con el eje ${m("x_2")}, y en ${m("x_2 = 0")} para obtener la intersecci&oacute;n con el eje ${m("x_1")}.</li>
      <li>El <strong>semiplano factible</strong>: se determina si la regi&oacute;n que satisface la restricci&oacute;n est&aacute; por debajo o por encima de la recta frontera, evaluando un punto de prueba.</li>
    </ul>

    <p>Las restricciones con operador estricto (${m("\\lt, \\gt")}) definen fronteras que no pertenecen a la regi&oacute;n factible; esto puede dar lugar a valores &oacute;ptimos no alcanzados (supremo o &iacute;nfimo).</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.3.2 Construcci&oacute;n de la regi&oacute;n factible</h4>

    <p>La regi&oacute;n factible es la intersecci&oacute;n de todos los semiplanos definidos por las restricciones. Geom&eacute;tricamente puede ser:</p>
    <ul>
      <li>Un <strong>pol&iacute;gono convexo</strong> acotado.</li>
      <li>Una <strong>regi&oacute;n no acotada</strong> (abierta en alguna direcci&oacute;n).</li>
      <li>Un <strong>conjunto vac&iacute;o</strong> cuando las restricciones son contradictorias.</li>
    </ul>

    <p>El m&eacute;todo construye la regi&oacute;n factible mediante recorte sucesivo de pol&iacute;gonos (algoritmo de Sutherland-Hodgman), partiendo de un rect&aacute;ngulo suficientemente grande y recort&aacute;ndolo contra cada frontera activa.</p>

    <p>Antes de construir el pol&iacute;gono se verifica la existencia de al menos un punto factible mediante un muestreo dirigido. Si no se encuentra ninguno, el problema se clasifica como infactible.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.3.3 V&eacute;rtices candidatos</h4>

    <p>Por el teorema fundamental de la programaci&oacute;n lineal, si existe un &oacute;ptimo finito, este se alcanza en al menos un v&eacute;rtice de la regi&oacute;n factible. Los v&eacute;rtices se obtienen resolviendo todos los pares de ecuaciones de frontera mediante la regla de Cramer:</p>

    ${md("x_1 = \\frac{c_1 b_2 - c_2 b_1}{a_1 b_2 - a_2 b_1}, \\quad x_2 = \\frac{a_1 c_2 - a_2 c_1}{a_1 b_2 - a_2 b_1}")}

    <p>Cada punto de intersecci&oacute;n se eval&uacute;a contra todas las restricciones originales; solo se conservan aquellos que las satisfacen (v&eacute;rtices factibles).</p>

    <p>Se detectan casos especiales como:</p>
    <ul>
      <li><strong>Degeneraci&oacute;n:</strong> m&aacute;s de dos restricciones coinciden en el mismo v&eacute;rtice.</li>
      <li><strong>Redundancia:</strong> una restricci&oacute;n no contribuye a formar ning&uacute;n v&eacute;rtice nuevo.</li>
    </ul>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.3.4 Evaluaci&oacute;n de la funci&oacute;n objetivo</h4>

    <p>La funci&oacute;n objetivo ${m("Z = c_1 x_1 + c_2 x_2")} se eval&uacute;a en cada v&eacute;rtice factible. El v&eacute;rtice que produce el mayor valor de ${m("Z")} (para maximizaci&oacute;n) o el menor (para minimizaci&oacute;n) es el &oacute;ptimo.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.3.5 Casos especiales</h4>

    <ul>
      <li><strong>Soluciones &oacute;ptimas m&uacute;ltiples:</strong> ocurre cuando la funci&oacute;n objetivo es paralela a una restricci&oacute;n activa en el &oacute;ptimo. El segmento completo entre dos v&eacute;rtices &oacute;ptimos adyacentes es &oacute;ptimo.</li>
      <li><strong>Problema no acotado:</strong> la regi&oacute;n factible es no acotada en una direcci&oacute;n donde la funci&oacute;n objetivo puede mejorar indefinidamente. Se detecta verificando si existe una direcci&oacute;n de recesi&oacute;n factible que mejore ${m("Z")}.</li>
      <li><strong>Valor l&iacute;mite no alcanzado:</strong> cuando el &oacute;ptimo recae sobre una frontera estricta, el valor es un supremo o &iacute;nfimo pero no es alcanzable por ning&uacute;n punto de la regi&oacute;n factible.</li>
      <li><strong>Problema infactible:</strong> ninguna combinaci&oacute;n de ${m("x_1, x_2")} satisface todas las restricciones simult&aacute;neamente.</li>
    </ul>
  </section>

  <!-- ================================================================= -->
  <section id="c3-4">
    <h3>3.4 M&eacute;todo No Lineal Gr&aacute;fico</h3>

    <p>Este m&eacute;todo extiende el enfoque gr&aacute;fico a problemas donde las restricciones pueden ser no lineales. A diferencia del caso lineal, los &oacute;ptimos no necesariamente ocurren en v&eacute;rtices, por lo que se emplea una estrategia de <strong>puntos candidatos</strong>.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.4.1 Tipos de restricciones</h4>

    <p>Cada restricci&oacute;n se escribe en la forma general:</p>

    ${md("q_1 x_1^2 + q_2 x_2^2 + a x_1 + b x_2 \\; \\text{[operador]} \\; c")}

    <p>Seg&uacute;n los valores de ${m("q_1")} y ${m("q_2")}, la restricci&oacute;n se clasifica en uno de estos tipos:</p>

    <ul>
      <li><strong>Lineal</strong> (${m("q_1 = q_2 = 0")}): la frontera es una recta, igual que en el m&eacute;todo gr&aacute;fico lineal.</li>
      <li><strong>Vertical</strong> (${m("q_1 = q_2 = 0,\\; b = 0")}): restricci&oacute;n que solo involucra a ${m("x_1")}.</li>
      <li><strong>Horizontal</strong> (${m("q_1 = q_2 = 0,\\; a = 0")}): restricci&oacute;n que solo involucra a ${m("x_2")}.</li>
      <li><strong>C&iacute;rculo</strong> (${m("q_1 = q_2 \\neq 0")}): la frontera es una circunferencia (si los coeficientes lineales son cero) o un c&iacute;rculo desplazado.</li>
      <li><strong>Elipse</strong> (${m("q_1 \\neq q_2,\\; q_1, q_2 \\gt 0")}): frontera el&iacute;ptica con semiejes distintos.</li>
      <li><strong>Cuadr&aacute;tica general:</strong> cualquier otra combinaci&oacute;n de coeficientes.</li>
    </ul>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.4.2 Puntos candidatos</h4>

    <p>Dado que la regi&oacute;n factible puede tener fronteras curvas, los &oacute;ptimos pueden ocurrir en cualquier punto de la frontera. Para encontrar el &oacute;ptimo de forma sistem&aacute;tica se consideran las siguientes fuentes de candidatos:</p>

    <ol class="alt">
      <li><strong>Origen</strong> ${m("(0,0)")}: se eval&uacute;a directamente por ser un punto de referencia natural.</li>
      <li><strong>Intersecciones con los ejes:</strong> para cada restricci&oacute;n, se resuelve la ecuaci&oacute;n resultante de hacer ${m("x_1 = 0")} o ${m("x_2 = 0")}. Si la restricci&oacute;n es cuadr&aacute;tica, se resuelve mediante la f&oacute;rmula general:</li>
    </ol>

    ${md("x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}")}

    <ol class="alt" start="3">
      <li><strong>Intersecciones de fronteras:</strong> se resuelven algebraicamente los sistemas formados por pares de ecuaciones de frontera:
        <ul>
          <li>Recta-recta: soluci&oacute;n por eliminaci&oacute;n gaussiana o Cramer.</li>
          <li>Recta-c&iacute;rculo: sustituci&oacute;n de la ecuaci&oacute;n lineal en la del c&iacute;rculo, resolviendo la cuadr&aacute;tica resultante.</li>
          <li>C&iacute;rculo-c&iacute;rculo: soluci&oacute;n geom&eacute;trica usando la l&iacute;nea radical entre las dos circunferencias.</li>
        </ul>
      </li>
      <li><strong>Tangencias de la funci&oacute;n objetivo:</strong> en restricciones de tipo c&iacute;rculo o elipse, el punto donde la funci&oacute;n objetivo es tangente a la frontera suele ser candidato a &oacute;ptimo. Se calcula imponiendo que el gradiente de la restricci&oacute;n sea paralelo al gradiente de la funci&oacute;n objetivo.</li>
    </ol>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.4.3 Tangencias</h4>

    <p>Para una restricci&oacute;n de tipo c&iacute;rculo o elipse y una funci&oacute;n objetivo lineal ${m("Z = c_1 x_1 + c_2 x_2")}$, el punto de tangencia se obtiene resolviendo el sistema:</p>

    ${md("\\nabla g(x_1, x_2) = \\lambda \\nabla Z(x_1, x_2)")}

    <p>Donde ${m("g(x_1, x_2)")} es la ecuaci&oacute;n de la frontera. Para un c&iacute;rculo centrado en el origen ${m("x_1^2 + x_2^2 = r^2")}$, el punto de tangencia que maximiza ${m("Z")} es:</p>

    ${md("(x_1, x_2) = \\left(\\frac{c_1 r}{\\sqrt{c_1^2 + c_2^2}},\\; \\frac{c_2 r}{\\sqrt{c_1^2 + c_2^2}}\\right)")}

    <p>Este punto se incluye como candidato y se verifica su factibilidad contra todas las dem&aacute;s restricciones.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.4.4 Fronteras estrictas</h4>

    <p>Cuando una restricci&oacute;n usa un operador estricto (${m("\\lt")} o ${m("\\gt")}), los puntos que est&aacute;n exactamente sobre la frontera no pertenecen a la regi&oacute;n factible. Si el &oacute;ptimo entre todos los candidatos factibles recae justo sobre una frontera estricta, el algoritmo marca el estado como <em>valor l&iacute;mite no alcanzado</em> (supremo o &iacute;nfimo) e indica que el valor puede aproximarse arbitrariamente pero no alcanzarse.</p>

    <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->

    <h4>3.4.5 Casos especiales</h4>

    <ul>
      <li><strong>&Oacute;ptimo &uacute;nico:</strong> un solo candidato factible alcanza el mejor valor de ${m("Z")}.</li>
      <li><strong>&Oacute;ptimos m&uacute;ltiples:</strong> varios candidatos factibles empatan en el mejor valor de ${m("Z")}.</li>
      <li><strong>No acotado:</strong> la regi&oacute;n factible se extiende en una direcci&oacute;n donde ${m("Z")} puede crecer o decrecer indefinidamente. Se detecta mediante un an&aacute;lisis asint&oacute;tico: se buscan direcciones ${m("d")} tales que, partiendo de un punto factible, todos los puntos ${m("x + t d")} sean factibles para ${m("t \\to \\infty")} y la funci&oacute;n objetivo mejore a lo largo de esa direcci&oacute;n.</li>
      <li><strong>Infactible:</strong> no se encuentra ning&uacute;n punto que satisfaga todas las restricciones.</li>
      <li><strong>Sin candidato alcanzado:</strong> caso extremo donde existen puntos factibles pero ninguno de los candidatos generados es factible o mejora la funci&oacute;n objetivo.</li>
    </ul>
  </section>
</section>`;

// =============================================================================
// CHAPTER 4: VALIDATION & TESTING
// =============================================================================

const chapterValidation = () => raw`
<section class="chapter" id="c4">
  <h2>4. Validaci&oacute;n y pruebas</h2>

  <p>La precisi&oacute;n matem&aacute;tica del sitio se garantiza mediante cuatro estrategias complementarias.</p>

  <h3>4.1 Tipado estricto del c&oacute;digo</h3>

  <p>Todo el c&oacute;digo de los algoritmos est&aacute; escrito en TypeScript con verificaci&oacute;n de tipos estricta. Se utiliza la biblioteca <em>type-fest</em> para tipos de solo lectura profunda, lo que evita modificaciones accidentales de datos durante los c&aacute;lculos. Adem&aacute;s, BiomeJS realiza verificaciones autom&aacute;ticas de estilo y posibles errores en cada cambio.</p>

  <h3>4.2 Pruebas unitarias automatizadas</h3>

  <p>El proyecto cuenta con <strong>43 pruebas unitarias</strong> distribuidas en 6 archivos de prueba:</p>

  <table class="simple">
    <thead>
      <tr><th>Archivo de prueba</th><th>M&oacute;dulo probado</th><th>Cantidad de pruebas</th></tr>
    </thead>
    <tbody>
      <tr><td><code>transportation.test.ts</code></td><td>Problemas de Transporte</td><td>6</td></tr>
      <tr><td><code>simplex.test.ts</code></td><td>Simplex tabular</td><td>6</td></tr>
      <tr><td><code>graphical-lp.test.ts</code></td><td>Gr&aacute;fico Lineal</td><td>12</td></tr>
      <tr><td><code>graphical-lp-plot.test.ts</code></td><td>Gr&aacute;fico Lineal (visualizaci&oacute;n)</td><td>5</td></tr>
      <tr><td><code>nonlinear-graphical.test.ts</code></td><td>No Lineal Gr&aacute;fico</td><td>12</td></tr>
      <tr><td><code>nonlinear-graphical-plot.test.ts</code></td><td>No Lineal Gr&aacute;fico (visualizaci&oacute;n)</td><td>2</td></tr>
    </tbody>
  </table>

  <p>Cada prueba verifica no solo el resultado final (costo total, valor &oacute;ptimo, punto &oacute;ptimo) sino tambi&eacute;n las trazas intermedias que alimentan las explicaciones paso a paso. Por ejemplo, en Transporte se verifica que las penalizaciones de Vogel, las asignaciones de cada iteraci&oacute;n, los ciclos de MODI y los potenciales ${m("u_i, v_j")} coincidan con los valores esperados.</p>

  <h3>4.3 Referencias de implementaci&oacute;n en Python</h3>

  <p>Como segunda capa de verificaci&oacute;n, cada algoritmo cuenta con una implementaci&oacute;n de referencia en Python (scripts independientes dentro del proyecto):</p>

  <ul>
    <li><code>supply_demand.py</code>: soluci&oacute;n completa de transporte (NW, LC, Vogel y MODI).</li>
    <li><code>simplex_tabular.py</code>: m&eacute;todo Simplex tabular con NumPy.</li>
    <li><code>lp_graphical_reference.py</code>: m&eacute;todo gr&aacute;fico lineal con salida JSON y estados de visualizaci&oacute;n.</li>
    <li><code>nonlinear_graphical_reference.py</code>: m&eacute;todo no lineal gr&aacute;fico con c&aacute;lculo de candidatos.</li>
    <li><code>nonlinear_graphical_reference_test.py</code>: 10 pruebas unitarias adicionales en Python.</li>
  </ul>

  <p>Estas implementaciones en Python son completamente independientes del c&oacute;digo TypeScript que corre en el navegador. Comparar los resultados de ambas implementaciones con las mismas entradas permite detectar discrepancias que podr&iacute;an pasar desapercibidas en un solo lenguaje.</p>

  <h3>4.4 Precisi&oacute;n num&eacute;rica</h3>

  <p>Todos los algoritmos operan con comparaciones basadas en tolerancias (&eacute;psilon) para manejar errores de redondeo inherentes a la aritm&eacute;tica de punto flotante:</p>
  <ul>
    <li>Se usa un &eacute;psilon de ${m("10^{-9}")} para considerar si un valor es &laquo;pr&aacute;cticamente cero&raquo; en decisiones como optimalidad, factibilidad y selecci&oacute;n de pivote.</li>
    <li>Se usa ${m("10^{-7}")} como tolerancia de factibilidad para verificar si un punto satisface una restricci&oacute;n.</li>
    <li>Los valores con magnitud absoluta mayor a ${m("10^{15}")} se rechazan para evitar inestabilidad num&eacute;rica en los c&aacute;lculos.</li>
  </ul>

  <h3>4.5 Validaci&oacute;n cruzada con ejemplos de clase</h3>

  <p>Todos los ejemplos precargados en la p&aacute;gina provienen directamente de ejercicios usados en clase en el TecNM. Los resultados fueron comparados con soluciones calculadas manualmente para garantizar su correcci&oacute;n. Al modificar cualquier valor de entrada, los c&aacute;lculos se re-ejecutan completamente desde cero, por lo que los resultados siempre son consistentes con los datos visibles en pantalla.</p>
</section>`;

// =============================================================================
// REFERENCES
// =============================================================================

const chapterReferences = () => raw`
<section class="chapter" id="refs">
  <h2>Referencias</h2>

  <p>Las siguientes obras constituyen la base te&oacute;rica de los m&eacute;todos expuestos en este manual. Se presentan en formato APA 7.&ordf; edici&oacute;n.</p>

  <div class="refs">
    <p>Bazaraa, M. S., Jarvis, J. J. y Sherali, H. D. (2010). <em>Linear programming and network flows</em> (4.&ordf; ed.). Wiley.</p>

    <p>Bazaraa, M. S., Sherali, H. D. y Shetty, C. M. (2006). <em>Nonlinear programming: Theory and algorithms</em> (3.&ordf; ed.). Wiley.</p>

    <p>Chv&aacute;tal, V. (1983). <em>Linear programming</em>. W. H. Freeman.</p>

    <p>Dantzig, G. B. (1963). <em>Linear programming and extensions</em>. Princeton University Press.</p>

    <p>Eppen, G. D., Gould, F. J., Schmidt, C. P., Moore, J. H. y Weatherford, L. R. (2000). <em>Investigaci&oacute;n de operaciones en la ciencia administrativa</em> (5.&ordf; ed.). Prentice Hall.</p>

    <p>Hillier, F. S. y Lieberman, G. J. (2015). <em>Introducci&oacute;n a la investigaci&oacute;n de operaciones</em> (10.&ordf; ed.). McGraw-Hill.</p>

    <p>Hitchcock, F. L. (1941). The distribution of a product from several sources to numerous localities. <em>Journal of Mathematics and Physics</em>, <em>20</em>(1-4), 224-230. https://doi.org/10.1002/sapm1941201224</p>

    <p>Luenberger, D. G. y Ye, Y. (2008). <em>Linear and nonlinear programming</em> (3.&ordf; ed.). Springer.</p>

    <p>Prawda, J. (2004). <em>M&eacute;todos y modelos de investigaci&oacute;n de operaciones</em> (Vols. 1-2). Limusa.</p>

    <p>Reinfeld, N. V. y Vogel, W. R. (1958). <em>Mathematical programming</em>. Prentice-Hall.</p>

    <p>Taha, H. A. (2017). <em>Investigaci&oacute;n de operaciones</em> (10.&ordf; ed.). Pearson Educaci&oacute;n.</p>
  </div>
</section>`;

// =============================================================================
// CSS
// =============================================================================

const styles = raw`
${katexCss}

/* -------------------------------------------------------------------------- */
/* Reset & base                                                               */
/* -------------------------------------------------------------------------- */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font-body: "Liberation Serif", "Times New Roman", Georgia, serif;
  --font-heading: "Liberation Sans", Arial, Helvetica, sans-serif;
  --font-mono: "Liberation Mono", "Courier New", monospace;
  --text-color: #1a1a1a;
  --muted: #555;
  --accent: #1e5a9e;
  --rule: #ccc;
  --table-border: #aaa;
  --table-bg: #f7f8fa;
  --katex-font-size: 1.05em;
}

html {
  font-size: 12pt;
  line-height: 1.6;
  color: var(--text-color);
  font-family: var(--font-body);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  max-width: 100%;
  padding: 0;
  margin: 0;
}

/* -------------------------------------------------------------------------- */
/* Cover page                                                                 */
/* -------------------------------------------------------------------------- */

.cover {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  page-break-after: always;
  text-align: center;
  padding: 2cm;
}

.cover-body {
  max-width: 75%;
}

.cover-title {
  font-family: var(--font-heading);
  font-size: 2.2rem;
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 0.5cm;
}

.cover-subtitle {
  font-size: 1.15rem;
  color: var(--muted);
  margin-bottom: 1.2cm;
}

.cover-line {
  width: 5cm;
  height: 2px;
  background: var(--accent);
  margin: 0 auto 1.2cm;
}

.cover-info {
  font-size: 1rem;
  line-height: 2;
}

.cover-info strong {
  font-family: var(--font-heading);
}

/* -------------------------------------------------------------------------- */
/* Table of contents                                                          */
/* -------------------------------------------------------------------------- */

.toc {
  page-break-after: always;
  padding: 2cm 0 1cm;
  max-width: 100%;
}

.toc-title {
  font-family: var(--font-heading);
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 0.8cm;
  border-bottom: 2px solid var(--accent);
  padding-bottom: 0.3cm;
}

.toc-list {
  list-style: none;
  font-size: 1.05rem;
  line-height: 2.1;
}

.toc-list li {
  margin: 0;
  padding: 0;
}

.toc-list a {
  color: var(--text-color);
  text-decoration: none;
  border-bottom: 1px dotted var(--rule);
}

.toc-list ol {
  list-style: none;
  padding-left: 1.5em;
  font-size: 0.95em;
}

/* -------------------------------------------------------------------------- */
/* Chapter & section headings                                                 */
/* -------------------------------------------------------------------------- */

.chapter {
  page-break-before: always;
  padding-top: 0.8cm;
}

.chapter h2 {
  font-family: var(--font-heading);
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 0.6cm;
  padding-bottom: 0.2cm;
  border-bottom: 2px solid var(--accent);
}

.chapter h3 {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  font-weight: 700;
  margin: 1.2cm 0 0.5cm;
}

.chapter h4 {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 1cm 0 0.4cm;
}

/* -------------------------------------------------------------------------- */
/* Paragraphs & lists                                                         */
/* -------------------------------------------------------------------------- */

p {
  margin: 0.4cm 0;
  orphans: 3;
  widows: 3;
}

ul, ol {
  margin: 0.3cm 0 0.3cm 1.2em;
  padding: 0;
}

ul:not(.toc-list) li,
ol:not(.toc-list) li {
  margin-bottom: 0.15cm;
}

ol.alt li {
  margin-bottom: 0.25cm;
}

/* -------------------------------------------------------------------------- */
/* Inline elements                                                            */
/* -------------------------------------------------------------------------- */

strong {
  font-family: var(--font-heading);
}

em {
  font-style: italic;
}

code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--table-bg);
  padding: 0.05em 0.2em;
  border-radius: 3px;
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

table.simple {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5cm 0;
  font-size: 0.95em;
  page-break-inside: avoid;
}

table.simple thead th {
  background: var(--table-bg);
  font-family: var(--font-heading);
  font-weight: 700;
  padding: 6px 10px;
  border: 1px solid var(--table-border);
  text-align: left;
}

table.simple tbody td {
  padding: 4px 10px;
  border: 1px solid var(--table-border);
}

/* -------------------------------------------------------------------------- */
/* KaTeX display math spacing                                                 */
/* -------------------------------------------------------------------------- */

.katex-display {
  margin: 0.5cm 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.katex-display > .katex {
  text-align: center;
  white-space: normal;
}

 /* -------------------------------------------------------------------------- */
/* References (APA 7th: hanging indent)                                       */
/* -------------------------------------------------------------------------- */

.refs p {
  padding-left: 2em;
  text-indent: -2em;
  margin: 0.25cm 0;
  orphans: 3;
  widows: 3;
}

/* -------------------------------------------------------------------------- */
/* Print                                                                      */
/* -------------------------------------------------------------------------- */

@page {
  size: A4;
  margin: 2cm;

  @bottom-center {
    content: counter(page);
    font-family: var(--font-heading);
    font-size: 9pt;
    color: var(--muted);
  }
}

@page cover {
  @bottom-center {
    content: none;
  }
}

.cover {
  page: cover;
}

@media print {
  html { font-size: 11pt; }

  a { color: var(--text-color); text-decoration: none; }
}
`;

// =============================================================================
// ASSEMBLY
// =============================================================================

const html = raw`<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="scripts/build-manual.mjs" />
  <title>Manual de Usuario — M&eacute;todos de Soluci&oacute;n IO</title>
  <style>
${styles}
  </style>
</head>
<body>

${coverPage()}

<main class="content">

${toc()}

${chapterIntro()}

${chapterUsage()}

${chapterInternal()}

${chapterValidation()}

${chapterReferences()}

</main>

</body>
</html>
`;

// =============================================================================
// WRITE
// =============================================================================

const outPath = resolve(projectRoot, "manual.html");
writeFileSync(outPath, html, "utf-8");

const stats = `${(html.length / 1024).toFixed(0)} KB`;
console.log(`✅ manual.html written (${stats}) → ${outPath}`);
console.log("   Open in browser → Ctrl+P → Save as PDF");
