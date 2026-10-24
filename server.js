/**
 * ============================================================================
 * TriFunc Studio — Pure Functional IDE (Haskell · Scheme · Hope)
 * 
 * Autor: Nhyix
 * Verification Code: #7620859-NHYIX-CORE
 * Architecture: 100% Offline Local Reactive Architecture
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { runHope } = require('./engines/hope');
const { runScheme } = require('./engines/scheme');
const { runHaskell, checkNativeGHC } = require('./engines/haskell');

const app = express();
const PORT = process.env.PORT || 3333;
const WORKSPACE_DIR = path.join(__dirname, 'workspace');
const EXAMPLES_DIR = path.join(__dirname, 'examples');

// Ensure directories exist
if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve local vendor dependencies for 100% offline usage
app.use('/vendor/monaco', express.static(path.join(__dirname, 'node_modules/monaco-editor/min')));
app.use('/vendor/fontawesome', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free')));

app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// System Status
// -------------------------------------------------------------
app.get('/api/status', (req, res) => {
  const ghcInfo = checkNativeGHC();
  res.json({
    app: 'TriFunc Studio',
    author: 'Nhyix',
    easterEggId: '7620859',
    version: '2.0.0-pure',
    languages: {
      haskell: {
        engine: 'Built-in Functional Evaluator (Instant)',
        nativeGHC: ghcInfo.available ? ghcInfo.version : 'Not installed (Using built-in engine)',
        hasNative: ghcInfo.available
      },
      scheme: {
        engine: 'BiwaScheme R7RS-small Engine (Standard Compliant)',
        features: ['First-class continuations', 'Tail-call optimization', 'Lexical closures', 'Macros']
      },
      hope: {
        engine: 'Hope Functional Interpreter & Reducer (1978/1980s Edinburgh)',
        features: ['Pattern matching', 'Algebraic data types (data)', 'Infix operators', 'Step-by-step reduction trace']
      }
    },
    nodeVersion: process.version,
    workspaceDir: WORKSPACE_DIR
  });
});

// -------------------------------------------------------------
// File Explorer API
// -------------------------------------------------------------
function scanDir(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: relPath,
        isDirectory: true,
        children: scanDir(fullPath, baseDir)
      });
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      let lang = 'plaintext';
      if (ext === '.hs') lang = 'haskell';
      else if (ext === '.scm' || ext === '.ss') lang = 'scheme';
      else if (ext === '.hop' || ext === '.hope') lang = 'hope';

      items.push({
        name: entry.name,
        path: relPath,
        isDirectory: false,
        language: lang,
        size: fs.statSync(fullPath).size
      });
    }
  }
  return items;
}

app.get('/api/files', (req, res) => {
  try {
    const workspaceFiles = scanDir(WORKSPACE_DIR);
    const exampleFiles = scanDir(EXAMPLES_DIR);
    res.json({ workspace: workspaceFiles, examples: exampleFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/file', (req, res) => {
  try {
    const relPath = req.query.path;
    const isExample = req.query.isExample === 'true';
    const baseDir = isExample ? EXAMPLES_DIR : WORKSPACE_DIR;
    const targetPath = path.resolve(baseDir, relPath);

    if (!targetPath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied: path outside directory' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    res.json({ path: relPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/file', (req, res) => {
  try {
    const { path: relPath, content } = req.body;
    if (!relPath) return res.status(400).json({ error: 'Missing file path' });

    const targetPath = path.resolve(WORKSPACE_DIR, relPath);
    if (!targetPath.startsWith(WORKSPACE_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

    fs.writeFileSync(targetPath, content || '', 'utf8');
    res.json({ success: true, message: 'File saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/file', (req, res) => {
  try {
    const relPath = req.query.path;
    const targetPath = path.resolve(WORKSPACE_DIR, relPath);
    if (!targetPath.startsWith(WORKSPACE_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Code Execution API
// -------------------------------------------------------------
app.post('/api/run', async (req, res) => {
  const { language, code, options = {} } = req.body;
  if (!code && code !== '') {
    return res.status(400).json({ error: 'No code provided' });
  }

  const startTime = Date.now();
  try {
    if (language === 'haskell') {
      const result = await runHaskell(code, null, options.preferNative);
      return res.json(result);
    } else if (language === 'scheme') {
      const result = await runScheme(code);
      return res.json(result);
    } else if (language === 'hope') {
      const result = runHope(code);
      result.durationMs = Date.now() - startTime;
      result.success = true;
      return res.json(result);
    } else {
      return res.status(400).json({ error: `Unsupported language '${language}'` });
    }
  } catch (err) {
    return res.json({
      success: false,
      error: err.message || String(err),
      durationMs: Date.now() - startTime
    });
  }
});

// -------------------------------------------------------------
// REPL API
// -------------------------------------------------------------
app.post('/api/repl', async (req, res) => {
  const { language, expression, contextCode = '' } = req.body;
  const startTime = Date.now();

  try {
    if (language === 'haskell') {
      const result = await runHaskell(contextCode, expression);
      return res.json(result);
    } else if (language === 'scheme') {
      const fullCode = contextCode ? `${contextCode}\n${expression}` : expression;
      const result = await runScheme(fullCode);
      return res.json(result);
    } else if (language === 'hope') {
      // In Hope, evaluate expression with previous declarations loaded
      const { HopeLexer, HopeParser, HopeEvaluator } = require('./engines/hope');
      let ast = { dataTypes: [], declarations: [], equations: [], expression: null };
      if (contextCode.trim()) {
        try {
          const l = new HopeLexer(contextCode);
          ast = new HopeParser(l.tokenize()).parseProgram();
        } catch (e) {
          // If context has syntax error, still try to proceed with just the expression
        }
      }
      const exprLexer = new HopeLexer(expression.endsWith(';') ? expression : expression + ';');
      const exprTokens = exprLexer.tokenize();
      const exprParser = new HopeParser(exprTokens);
      const parsed = exprParser.parseProgram();

      const evaluator = new HopeEvaluator();
      evaluator.loadProgram(ast);
      evaluator.loadProgram(parsed);
      const result = evaluator.evaluate(parsed);
      result.success = true;
      result.durationMs = Date.now() - startTime;
      return res.json(result);
    } else {
      return res.status(400).json({ error: `Unsupported language '${language}'` });
    }
  } catch (err) {
    return res.json({
      success: false,
      error: err.message || String(err),
      durationMs: Date.now() - startTime
    });
  }
});

// -------------------------------------------------------------
// Real-time Syntax, Symbol & Typo Linter Validation API
// -------------------------------------------------------------
function levenshtein(a, b) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function findClosestMatch(word, candidates) {
  if (!word || word.length < 2) return null;
  let best = null;
  let bestDist = Infinity;
  const maxAllowed = word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3;

  for (const cand of candidates) {
    if (!cand || cand === word) continue;
    const dist = levenshtein(word, cand);
    if (dist <= maxAllowed && dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best;
}

const SCHEME_BUILTINS = new Set([
  'define', 'lambda', 'let', 'let*', 'letrec', 'if', 'cond', 'else', 'begin',
  'quote', 'quasiquote', 'unquote', 'unquote-splicing', 'set!', 'and', 'or', 'not',
  'case', 'do', 'delay', 'force', 'call/cc', 'call-with-current-continuation',
  'display', 'newline', 'write', 'read', 'print', 'car', 'cdr', 'caar', 'cadr',
  'cdar', 'cddr', 'caddr', 'cdddr', 'cons', 'list', 'append', 'reverse', 'length',
  'null?', 'pair?', 'list?', 'number?', 'integer?', 'real?', 'zero?', 'positive?',
  'negative?', 'odd?', 'even?', 'string?', 'symbol?', 'boolean?', 'procedure?',
  'eq?', 'eqv?', 'equal?', 'map', 'for-each', 'filter', 'fold', 'fold-left',
  'fold-right', 'apply', 'member', 'memq', 'memv', 'assoc', 'assq', 'assv',
  'vector', 'make-vector', 'vector-ref', 'vector-set!', 'vector-length',
  'vector->list', 'list->vector', 'string', 'string-length', 'string-append',
  'substring', 'string->number', 'number->string', 'symbol->string', 'string->symbol',
  'max', 'min', 'abs', 'modulo', 'remainder', 'quotient', 'gcd', 'lcm', 'expt',
  'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'floor', 'ceiling',
  'truncate', 'round', 'exact->inexact', 'inexact->exact',
  '+', '-', '*', '/', '<', '<=', '=', '>', '>=',
  'clear-canvas', 'draw-circle', 'draw-rect', 'draw-line', 'draw-text', 'show-image',
  'msgbox', 'deg-sin', 'deg-cos'
]);

const HOPE_BUILTINS = new Set([
  'dec', 'data', 'type', 'infix', 'let', 'in', 'if', 'then', 'else',
  'true', 'false', 'nil', 'cons', 'div', 'mod', 'and', 'or', 'not',
  'write', 'read', 'truval', 'num', 'char', 'list', 'tree',
  'alpha', 'beta', 'gamma', 'delta', 'max', 'min', 'abs', 'sqrt',
  'clear_canvas', 'draw_circle', 'draw_rect', 'draw_line', 'draw_text',
  'show_image', 'msgbox'
]);

const HASKELL_BUILTINS = new Set([
  'case', 'class', 'data', 'default', 'deriving', 'do', 'else', 'foreign',
  'if', 'import', 'in', 'infix', 'infixl', 'infixr', 'instance', 'let',
  'module', 'newtype', 'of', 'then', 'type', 'where', 'as', 'qualified', 'hiding',
  'id', 'const', 'not', 'even', 'odd', 'max', 'min', 'abs', 'head', 'tail',
  'init', 'last', 'null', 'length', 'sum', 'product', 'reverse', 'take', 'drop',
  'elem', 'notElem', 'replicate', 'concat', 'concatMap', 'zip', 'zipWith',
  'unzip', 'fst', 'snd', 'curry', 'uncurry', 'flip', 'map', 'filter', 'foldr', 'foldl',
  'foldr1', 'foldl1', 'scanr', 'scanl', 'all', 'any', 'and', 'or', 'lines',
  'words', 'unlines', 'unwords', 'show', 'read', 'putStr', 'putStrLn', 'print',
  'return', 'pure', 'fmap', 'div', 'mod', 'quot', 'rem', 'gcd', 'lcm', 'sqrt',
  'sin', 'cos', 'tan', 'exp', 'log', 'fromIntegral', 'round', 'floor', 'ceiling',
  'otherwise', 'True', 'False', 'Nothing', 'Just', 'Left', 'Right', 'LT', 'EQ', 'GT',
  'Int', 'Integer', 'Float', 'Double', 'Bool', 'Char', 'String', 'IO', 'Maybe',
  'Either', 'Ordering', 'Ord', 'Eq', 'Show', 'Read', 'Num', 'Integral', 'Floating',
  'clearCanvas', 'drawCircle', 'drawRect', 'drawLine', 'drawText', 'showImage',
  'msgbox', 'main'
]);

app.post('/api/validate', (req, res) => {
  const { language, code } = req.body;
  if (!code || !code.trim()) {
    return res.json({ valid: true, errors: [] });
  }

  const normalized = String(code).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const errors = [];

  try {
    if (language === 'scheme') {
      const stack = [];
      const lines = normalized.split('\n');

      // 1. Delimiter & String balance check
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        let inString = false;
        let stringStartCol = 1;
        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if (ch === '"' && (c === 0 || line[c - 1] !== '\\')) {
            if (!inString) stringStartCol = c + 1;
            inString = !inString;
            continue;
          }
          if (inString) continue;
          if (ch === ';') break;
          if (ch === '(') stack.push({ line: l + 1, col: c + 1, ch });
          else if (ch === ')') {
            if (stack.length === 0) {
              errors.push({
                line: l + 1,
                col: c + 1,
                endCol: c + 2,
                message: 'Paréntesis ")" inesperado sin apertura "(" previa.',
                severity: 'error'
              });
            } else {
              stack.pop();
            }
          }
        }
        if (inString) {
          errors.push({
            line: l + 1,
            col: stringStartCol,
            endCol: line.length + 1,
            message: 'Cadena de texto (") abierta sin cerrar en esta línea.',
            severity: 'error'
          });
        }
      }
      if (stack.length > 0) {
        const unclosed = stack.pop();
        errors.push({
          line: unclosed.line,
          col: unclosed.col,
          endCol: unclosed.col + 1,
          message: 'Paréntesis "(" abierto sin cerrar.',
          severity: 'error'
        });
      }

      // 2. Collect user-defined Scheme symbols & parameters
      const userSymbols = new Set();

      // Match (define (fnName param1 param2 ...) ...) or (define fnName val)
      for (const m of normalized.matchAll(/\(\s*(define|defin)\s+\(\s*([a-zA-Z_!?*+<>=/-][a-zA-Z0-9_!?*+<>=/-]*)\s*([^)]*)\)/gi)) {
        userSymbols.add(m[2]);
        m[3].trim().split(/\s+/).forEach(p => {
          if (p && p !== '.') userSymbols.add(p);
        });
      }

      for (const m of normalized.matchAll(/\(\s*(define|defin)\s+([a-zA-Z_!?*+<>=/-][a-zA-Z0-9_!?*+<>=/-]*)\s+/gi)) {
        userSymbols.add(m[2]);
      }

      // Match (lambda (param1 param2 ...) ...)
      for (const m of normalized.matchAll(/\(\s*(lambda|lamda)\s+\(([^)]*)\)/gi)) {
        m[2].trim().split(/\s+/).forEach(p => {
          if (p && p !== '.') userSymbols.add(p);
        });
      }

      // Match (lambda param ...) [varargs]
      for (const m of normalized.matchAll(/\(\s*(lambda|lamda)\s+([a-zA-Z_!?*+<>=/-][a-zA-Z0-9_!?*+<>=/-]*)\s+/gi)) {
        userSymbols.add(m[2]);
      }

      // Match (let / let* / letrec ((v1 val1) (v2 val2)) or named let (let loop ((v1 val1))
      const letFormRegex = /\(\s*(?:let\*?|letrec|do)\s+(?:([a-zA-Z0-9_!?-]+)\s+)?\(\s*((?:\(\s*[a-zA-Z_][a-zA-Z0-9_!?-]*\s+[^)]+\)\s*)+)\)/g;
      for (const m of normalized.matchAll(letFormRegex)) {
        if (m[1]) userSymbols.add(m[1]);
        const bindingsBlock = m[2];
        for (const bm of bindingsBlock.matchAll(/\(\s*([a-zA-Z_][a-zA-Z0-9_!?-]*)\s+/g)) {
          userSymbols.add(bm[1]);
        }
      }

      // 3. Scan tokens and check for undefined symbols / typos (ignoring strings, comments, and quoted lists)
      let quoteParenDepth = 0;
      let quotePending = false;

      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        let c = 0;
        while (c < line.length) {
          const ch = line[c];
          if (ch === ';') break;
          if (ch === '"') {
            c++;
            while (c < line.length && !(line[c] === '"' && line[c - 1] !== '\\')) c++;
            c++;
            continue;
          }
          if (ch === "'") {
            quotePending = true;
            c++;
            continue;
          }
          if (ch === '(') {
            if (quotePending) {
              quoteParenDepth = 1;
              quotePending = false;
            } else if (quoteParenDepth > 0) {
              quoteParenDepth++;
            }
            c++;
            continue;
          }
          if (ch === ')') {
            if (quoteParenDepth > 0) quoteParenDepth--;
            quotePending = false;
            c++;
            continue;
          }
          if (/\s/.test(ch)) {
            c++;
            continue;
          }

          // Read token
          const startCol = c + 1;
          let token = '';
          while (c < line.length && !/[\s()"';]/.test(line[c])) {
            token += line[c];
            c++;
          }

          if (quotePending) {
            quotePending = false;
            continue;
          }
          if (quoteParenDepth > 0) continue;

          // Ignore numbers, booleans, characters, vectors
          if (/^-?\d+(\.\d+)?$/.test(token)) continue;
          if (token.startsWith('#')) continue;
          if (token === '.') continue;

          if (!SCHEME_BUILTINS.has(token) && !userSymbols.has(token)) {
            const allCandidates = [...SCHEME_BUILTINS, ...userSymbols];
            const suggestion = findClosestMatch(token, allCandidates);
            errors.push({
              line: l + 1,
              col: startCol,
              endCol: startCol + token.length,
              word: token,
              suggestion,
              message: suggestion
                ? `Error de escritura: "${token}" no está definido. ¿Quisiste decir "${suggestion}"?`
                : `Símbolo o función desconocida: "${token}". No está definido en este archivo ni en Scheme.`,
              severity: 'error'
            });
          }
        }
      }
    } else if (language === 'hope') {
      const { HopeLexer, HopeParser } = require('./engines/hope');
      let tokens = [];
      try {
        const lexer = new HopeLexer(normalized);
        tokens = lexer.tokenize();
        const parser = new HopeParser(tokens);
        parser.parseProgram();
      } catch (err) {
        const match = err.message.match(/line\s+(\d+),\s*col\s+(\d+)/i);
        const line = match ? parseInt(match[1]) : 1;
        const col = match ? parseInt(match[2]) : 1;
        errors.push({
          line,
          col,
          endCol: col + 4,
          message: err.message
            .replace('Syntax Error: Expected', 'Error de sintaxis: Se esperaba')
            .replace('Unexpected token at line', 'Token inesperado en línea')
            .replace('but got', 'pero se encontró'),
          severity: 'error'
        });
      }

      // Check Hope identifiers for typos (declared functions, constructors, parameters)
      const declaredHopeIdents = new Set();
      const decFuncNames = new Set();
      const lines = normalized.split('\n');

      for (let l = 0; l < lines.length; l++) {
        const clean = lines[l].replace(/!.*$/, '').trim();
        if (!clean) continue;

        const decM = clean.match(/^dec\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (decM) {
          declaredHopeIdents.add(decM[1]);
          decFuncNames.add(decM[1]);
        }
      }

      for (let l = 0; l < lines.length; l++) {
        const clean = lines[l].replace(/!.*$/, '').trim();
        if (!clean) continue;

        // Check misspelled line starters (e.g. "dek ", "dat ", "infx ")
        const firstWordMatch = clean.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+/);
        if (firstWordMatch) {
          const fw = firstWordMatch[1];
          if (!HOPE_BUILTINS.has(fw) && !declaredHopeIdents.has(fw) && (levenshtein(fw, 'dec') === 1 || levenshtein(fw, 'data') === 1 || levenshtein(fw, 'type') === 1)) {
            const sug = findClosestMatch(fw, ['dec', 'data', 'type', 'infix']);
            const colIdx = lines[l].indexOf(fw) + 1;
            errors.push({
              line: l + 1,
              col: colIdx,
              endCol: colIdx + fw.length,
              word: fw,
              suggestion: sug,
              message: `Error de escritura en palabra clave "${fw}". ¿Quisiste decir "${sug}"?`,
              severity: 'error'
            });
          }
        }

        const dataM = clean.match(/^data\s+([a-zA-Z_][a-zA-Z0-9_]*).*==\s*(.+);?$/);
        if (dataM) {
          declaredHopeIdents.add(dataM[1]);
          const rhs = dataM[2];
          for (const ctorM of rhs.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
            declaredHopeIdents.add(ctorM[1]);
          }
        }

        const typeM = clean.match(/^type\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (typeM) {
          declaredHopeIdents.add(typeM[1]);
        }

        const eqM = clean.match(/^---\s*([a-zA-Z_][a-zA-Z0-9_]*)(.*)<=/);
        if (eqM) {
          const eqFn = eqM[1];
          if (decFuncNames.size > 0 && !decFuncNames.has(eqFn)) {
            const sug = findClosestMatch(eqFn, [...decFuncNames]);
            if (sug) {
              const colIdx = lines[l].indexOf(eqFn) + 1;
              errors.push({
                line: l + 1,
                col: colIdx,
                endCol: colIdx + eqFn.length,
                word: eqFn,
                suggestion: sug,
                message: `Error de escritura en ecuación: "${eqFn}" no coincide con la declaración 'dec'. ¿Quisiste decir "${sug}"?`,
                severity: 'error'
              });
            } else {
              declaredHopeIdents.add(eqFn);
            }
          } else {
            declaredHopeIdents.add(eqFn);
          }

          const patStr = eqM[2];
          for (const pm of patStr.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
            declaredHopeIdents.add(pm[1]);
          }
        }
      }

      // Check all IDENT tokens against HOPE_BUILTINS + declaredHopeIdents
      for (const tok of tokens) {
        if (tok.type === 'IDENT') {
          const name = tok.value;
          if (!HOPE_BUILTINS.has(name) && !declaredHopeIdents.has(name)) {
            const sug = findClosestMatch(name, [...HOPE_BUILTINS, ...declaredHopeIdents]);
            errors.push({
              line: tok.line,
              col: tok.col,
              endCol: tok.col + name.length,
              word: name,
              suggestion: sug,
              message: sug
                ? `Error de escritura: "${name}" no está definido. ¿Quisiste decir "${sug}"?`
                : `Identificador no declarado en Hope: "${name}".`,
              severity: 'error'
            });
          }
        }
      }
    } else if (language === 'haskell') {
      const stack = [];
      const lines = normalized.split('\n');
      let inBlockComment = false;
      const definedHs = new Set();

      // Pass 1: Collect defined functions, parameters, types, and check brackets
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        const noComment = line.replace(/--.*$/, '').trim();
        if (!noComment) continue;

        // Collect LHS definitions: `func arg1 arg2 = ...` or `func :: ...`
        const sigMatch = noComment.match(/^([a-z_][a-zA-Z0-9_']*)\s*::/);
        if (sigMatch) definedHs.add(sigMatch[1]);

        // Type / Data definitions: `type Producto = ...` or `data Tree a = ...`
        const typeMatch = noComment.match(/^(?:type|data)\s+([A-Z][a-zA-Z0-9_']*)/);
        if (typeMatch) definedHs.add(typeMatch[1]);

        // Function with = (e.g. `foo x y = ...` or `subtotal = ...`)
        const eqMatch = noComment.match(/^([a-z_][a-zA-Z0-9_']*)([^=]*)=/);
        if (eqMatch && !noComment.includes('==') && !noComment.startsWith('|')) {
          definedHs.add(eqMatch[1]);
          for (const pm of eqMatch[2].matchAll(/\b([a-z_][a-zA-Z0-9_']*)\b/g)) {
            definedHs.add(pm[1]);
          }
        }

        // Function with guards header: `descuentoMayoreo t` followed by guards
        const guardHeaderMatch = noComment.match(/^([a-z_][a-zA-Z0-9_']*)(.*)$/);
        if (guardHeaderMatch && !noComment.includes('=') && !noComment.includes('::') && !noComment.startsWith('data') && !noComment.startsWith('type') && !noComment.startsWith('import') && !noComment.startsWith('|')) {
          definedHs.add(guardHeaderMatch[1]);
          for (const pm of guardHeaderMatch[2].matchAll(/\b([a-z_][a-zA-Z0-9_']*)\b/g)) {
            definedHs.add(pm[1]);
          }
        }

        // Collect list comprehension variables: `| x <-`
        for (const lc of noComment.matchAll(/\b([a-z_][a-zA-Z0-9_']*)\s*<-/g)) {
          definedHs.add(lc[1]);
        }

        // Collect lambda args: `\x y ->` or `\(_, precio, cant) ->`
        for (const lm of noComment.matchAll(/\\([^->]+)->/g)) {
          for (const pm of lm[1].matchAll(/\b([a-z_][a-zA-Z0-9_']*)\b/g)) {
            definedHs.add(pm[1]);
          }
        }

        // Collect let / where bindings
        for (const wm of noComment.matchAll(/\b(?:where|let)\s+([a-z_][a-zA-Z0-9_']*)/g)) {
          definedHs.add(wm[1]);
        }

        for (let c = 0; c < line.length; c++) {
          if (!inBlockComment && line.substr(c, 2) === '{-') {
            inBlockComment = true;
            stack.push({ line: l + 1, col: c + 1, ch: '{-' });
            c++;
            continue;
          }
          if (inBlockComment && line.substr(c, 2) === '-}') {
            inBlockComment = false;
            stack.pop();
            c++;
            continue;
          }
          if (inBlockComment) continue;
          if (line.substr(c, 2) === '--') break;
          const ch = line[c];
          if (ch === '"') {
            c++;
            while (c < line.length && !(line[c] === '"' && line[c - 1] !== '\\')) c++;
            continue;
          }
          if (ch === '(' || ch === '[' || ch === '{') {
            stack.push({ line: l + 1, col: c + 1, ch });
          } else if (ch === ')' || ch === ']' || ch === '}') {
            const expected = ch === ')' ? '(' : ch === ']' ? '[' : '{';
            const top = stack[stack.length - 1];
            if (!top || top.ch !== expected) {
              errors.push({
                line: l + 1,
                col: c + 1,
                endCol: c + 2,
                message: `Delimitador de cierre inesperado "${ch}"`,
                severity: 'error'
              });
            } else {
              stack.pop();
            }
          }
        }
      }

      if (inBlockComment) {
        errors.push({
          line: lines.length,
          col: 1,
          endCol: 3,
          message: 'Comentario de bloque "{-" no cerrado con "-}"',
          severity: 'error'
        });
      } else if (stack.length > 0) {
        const unclosed = stack.pop();
        errors.push({
          line: unclosed.line,
          col: unclosed.col,
          endCol: unclosed.col + 1,
          message: `Delimitador "${unclosed.ch}" abierto sin cerrar`,
          severity: 'error'
        });
      }

      // Pass 2: Check identifiers on each line for typos
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        const commentIdx = line.indexOf('--');
        let codePart = commentIdx !== -1 ? line.slice(0, commentIdx) : line;
        if (!codePart.trim()) continue;

        // Skip type signatures (`func :: a -> b`), only check identifier before `::`
        const sigIdx = codePart.indexOf('::');
        if (sigIdx !== -1) {
          codePart = codePart.substring(0, sigIdx);
        }

        // Skip lines that are type declarations (`type ... = ...` or `data ... = ...` or `import ...`)
        if (/^\s*(?:type|data|import)\s+/.test(codePart)) {
          continue;
        }

        // Strip string literals while preserving column positions with spaces
        const masked = codePart.replace(/"([^"\\]|\\.)*"/g, m => ' '.repeat(m.length));

        for (const idMatch of masked.matchAll(/\b([a-z_][a-zA-Z0-9_']*)\b/g)) {
          const word = idMatch[1];
          const col = idMatch.index + 1;
          if (word === '_') continue;
          if (!HASKELL_BUILTINS.has(word) && !definedHs.has(word)) {
            const sug = findClosestMatch(word, [...HASKELL_BUILTINS, ...definedHs]);
            errors.push({
              line: l + 1,
              col,
              endCol: col + word.length,
              word,
              suggestion: sug,
              message: sug
                ? `Error de escritura: "${word}" no está definido. ¿Quisiste decir "${sug}"?`
                : `Función o variable no definida en Haskell: "${word}".`,
              severity: 'error'
            });
          }
        }
      }
    }
  } catch (globalErr) {
    errors.push({ line: 1, col: 1, endCol: 2, message: globalErr.message, severity: 'error' });
  }

  res.json({ valid: errors.length === 0, errors });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 TriFunc IDE (Haskell, Scheme & Hope) Server Running!`);
  console.log(`📡 Access IDE at: http://localhost:${PORT}`);
  console.log(`📁 Workspace Directory: ${WORKSPACE_DIR}`);
  console.log(`=======================================================`);
});
