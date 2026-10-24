/**
 * ============================================================================
 * TriFunc Studio — Haskell Functional Execution Engine
 * Autor: Nhyix
 * Core Verification: #7620859-NHYIX-CORE
 * Combines built-in functional evaluator with lazy reductions and optional GHC.
 * ============================================================================
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class HaskellEvaluator {
  constructor(options = {}) {
    this.functions = new Map(); // name -> [{ patterns, guards, rhs }]
    this.output = [];
    this.traces = [];
    this.graphics = [];
    this.dialogs = [];
    this.maxSteps = options.maxSteps || 10000;
    this.stepCount = 0;
    this.registerPrelude();
  }

  registerPrelude() {
    this.prelude = {
      id: ([x]) => x,
      const: ([x, _]) => x,
      not: ([b]) => !b,
      even: ([n]) => n % 2 === 0,
      odd: ([n]) => n % 2 !== 0,
      max: ([a, b]) => Math.max(a, b),
      min: ([a, b]) => Math.min(a, b),
      abs: ([n]) => Math.abs(n),
      head: ([xs]) => {
        if (!Array.isArray(xs) || xs.length === 0) throw new Error("Prelude.head: empty list");
        return xs[0];
      },
      tail: ([xs]) => {
        if (!Array.isArray(xs) || xs.length === 0) throw new Error("Prelude.tail: empty list");
        return xs.slice(1);
      },
      null: ([xs]) => Array.isArray(xs) && xs.length === 0,
      length: ([xs]) => Array.isArray(xs) ? xs.length : 0,
      sum: ([xs]) => Array.isArray(xs) ? xs.reduce((a, b) => a + b, 0) : 0,
      product: ([xs]) => Array.isArray(xs) ? xs.reduce((a, b) => a * b, 1) : 1,
      reverse: ([xs]) => Array.isArray(xs) ? [...xs].reverse() : xs,
      take: ([n, xs]) => Array.isArray(xs) ? xs.slice(0, n) : [],
      drop: ([n, xs]) => Array.isArray(xs) ? xs.slice(n) : [],
      elem: ([x, xs]) => Array.isArray(xs) ? xs.some(item => this.deepEqual(item, x)) : false,
      replicate: ([n, x]) => Array.from({ length: Math.max(0, n) }, () => x),
      concat: ([xss]) => Array.isArray(xss) ? xss.flat() : [],
      zip: ([xs, ys]) => {
        const len = Math.min(xs.length, ys.length);
        const res = [];
        for (let i = 0; i < len; i++) res.push({ isTuple: true, items: [xs[i], ys[i]] });
        return res;
      },
      fromIntegral: ([n]) => Number(n),
      fst: ([t]) => (t && t.isTuple ? t.items[0] : (Array.isArray(t) ? t[0] : null)),
      snd: ([t]) => (t && t.isTuple ? t.items[1] : (Array.isArray(t) ? t[1] : null)),
      flip: ([f, x, y], env) => {
        if (x !== undefined && y !== undefined) {
          return this.callFuncVal(f, [y, x], env);
        }
        if (x !== undefined) {
          return { isCurried: true, fn: 'flip', appliedArgs: [f, x], targetArity: 3 };
        }
        return { isCurried: true, fn: 'flip', appliedArgs: [f], targetArity: 3 };
      },
      otherwise: true,
      putStrLn: ([str]) => {
        const s = typeof str === 'string' ? str : this.formatValue(str);
        this.output.push(s);
        return { isIO: true, val: null };
      },
      print: ([val]) => {
        const s = this.formatValue(val);
        this.output.push(s);
        return { isIO: true, val: null };
      },
      clearCanvas: ([color]) => {
        this.graphics.push({ type: 'clear', color: color ? String(color) : '#11111b' });
        return { isIO: true, val: null };
      },
      drawCircle: ([x, y, r, color]) => {
        this.graphics.push({ type: 'circle', x: Number(x) || 0, y: Number(y) || 0, r: Number(r) || 10, color: color ? String(color) : '#cba6f7' });
        return { isIO: true, val: null };
      },
      drawRect: ([x, y, w, h, color]) => {
        this.graphics.push({ type: 'rect', x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || 20, h: Number(h) || 20, color: color ? String(color) : '#89dceb' });
        return { isIO: true, val: null };
      },
      drawLine: ([x1, y1, x2, y2, color, width]) => {
        this.graphics.push({ type: 'line', x1: Number(x1) || 0, y1: Number(y1) || 0, x2: Number(x2) || 0, y2: Number(y2) || 0, color: color ? String(color) : '#a6e3a1', width: Number(width) || 2 });
        return { isIO: true, val: null };
      },
      drawText: ([x, y, text, color, size]) => {
        this.graphics.push({ type: 'text', x: Number(x) || 0, y: Number(y) || 0, text: String(text ?? ''), color: color ? String(color) : '#cdd6f4', size: Number(size) || 16 });
        return { isIO: true, val: null };
      },
      showImage: ([url, w, h]) => {
        this.graphics.push({ type: 'image', url: String(url || ''), w: Number(w) || 220, h: Number(h) || 220 });
        return { isIO: true, val: null };
      },
      msgbox: ([title, message]) => {
        if (message === undefined) {
          this.dialogs.push({ title: 'Ventana de Haskell', message: String(title ?? '') });
        } else {
          this.dialogs.push({ title: String(title ?? ''), message: String(message ?? '') });
        }
        return { isIO: true, val: null };
      }
    };

    this.preludeArities = {
      id: 1, const: 2, not: 1, even: 1, odd: 1, max: 2, min: 2, abs: 1,
      head: 1, tail: 1, null: 1, length: 1, sum: 1, product: 1, reverse: 1,
      take: 2, drop: 2, elem: 2, replicate: 2, concat: 1, zip: 2, fromIntegral: 1,
      fst: 1, snd: 1, flip: 3, print: 1, putStrLn: 1, map: 2, filter: 2, foldr: 3, foldl: 3
    };
  }

  // Preprocessor to clean comments and normalize lines
  cleanCode(code) {
    const lines = String(code || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const cleaned = [];
    let inBlockComment = false;

    for (let line of lines) {
      if (inBlockComment) {
        const endIdx = line.indexOf('-}');
        if (endIdx !== -1) {
          inBlockComment = false;
          line = line.substring(endIdx + 2);
        } else {
          continue;
        }
      }

      const blockStart = line.indexOf('{-');
      if (blockStart !== -1) {
        const blockEnd = line.indexOf('-}', blockStart + 2);
        if (blockEnd !== -1) {
          line = line.substring(0, blockStart) + line.substring(blockEnd + 2);
        } else {
          inBlockComment = true;
          line = line.substring(0, blockStart);
        }
      }

      // Single line comments
      const commentIdx = line.indexOf('--');
      if (commentIdx !== -1) {
        line = line.substring(0, commentIdx);
      }

      if (line.trim()) {
        cleaned.push(line);
      }
    }

    return cleaned.join('\n');
  }

  parseAndLoad(source) {
    const cleaned = this.cleanCode(source);
    const rawLines = cleaned.split('\n');
    let exprToRun = null;
    let pendingGuardedFn = null; // { name, patterns, guards: [] }

    const commitPendingGuards = () => {
      if (pendingGuardedFn) {
        if (!this.functions.has(pendingGuardedFn.name)) {
          this.functions.set(pendingGuardedFn.name, []);
        }
        this.functions.get(pendingGuardedFn.name).push({
          patterns: pendingGuardedFn.patterns,
          guards: pendingGuardedFn.guards
        });
        pendingGuardedFn = null;
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      // Ignore type signatures for now: `factorial :: Int -> Int`
      if (line.includes('::') && !line.startsWith('data') && !line.startsWith('let')) {
        commitPendingGuards();
        continue;
      }

      // Ignore import and type / data lines
      if (line.startsWith('import ') || line.startsWith('type ') || line.startsWith('data ')) {
        commitPendingGuards();
        continue;
      }

      // Guard line continuing a pending function: `| cond = rhs`
      if (pendingGuardedFn && line.startsWith('|')) {
        const guardMatch = line.match(/^\|\s*(.+?)\s*=\s*(.+)$/);
        if (guardMatch) {
          pendingGuardedFn.guards.push({
            condition: guardMatch[1].trim(),
            rhs: guardMatch[2].trim()
          });
          continue;
        }
      }

      // Check for inline guards on the same line: `fnName args | cond1 = rhs1 | cond2 = rhs2`
      if (line.includes('|') && line.includes('=')) {
        const pipeIdx = line.indexOf('|');
        const lhs = line.substring(0, pipeIdx).trim();
        const guardsPart = line.substring(pipeIdx);

        const lhsTokens = this.tokenizeLhs(lhs);
        if (lhsTokens.length > 0 && /^[a-z_][a-zA-Z0-9_']*$/.test(lhsTokens[0])) {
          commitPendingGuards();
          const fnName = lhsTokens[0];
          const patternStrs = lhsTokens.slice(1);

          const guardPieces = guardsPart.split(/(?=\|)/);
          const guards = [];
          for (const gp of guardPieces) {
            const gm = gp.trim().match(/^\|\s*(.+?)\s*=\s*(.+)$/);
            if (gm) {
              guards.push({ condition: gm[1].trim(), rhs: gm[2].trim() });
            }
          }
          if (guards.length > 0) {
            if (!this.functions.has(fnName)) this.functions.set(fnName, []);
            this.functions.get(fnName).push({ patterns: patternStrs, guards });
            continue;
          }
        }
      }

      // Check for function header without = followed by guards on next line(s):
      // e.g. `descuentoMayoreo t`
      if (!line.includes('=')) {
        const lhsTokens = this.tokenizeLhs(line);
        if (lhsTokens.length > 0 && /^[a-z_][a-zA-Z0-9_']*$/.test(lhsTokens[0])) {
          let nextIsGuard = false;
          for (let j = i + 1; j < rawLines.length; j++) {
            const nextL = rawLines[j].trim();
            if (!nextL) continue;
            if (nextL.startsWith('|')) nextIsGuard = true;
            break;
          }
          if (nextIsGuard) {
            commitPendingGuards();
            pendingGuardedFn = {
              name: lhsTokens[0],
              patterns: lhsTokens.slice(1),
              guards: []
            };
            continue;
          }
        }
      }

      commitPendingGuards();

      // Standard function clause: e.g. `fact 0 = 1` or `subtotal = ...`
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const lhs = line.substring(0, eqIdx).trim();
        const rhs = line.substring(eqIdx + 1).trim();

        const lhsTokens = this.tokenizeLhs(lhs);
        if (lhsTokens.length > 0) {
          const fnName = lhsTokens[0];
          const patternStrs = lhsTokens.slice(1);

          if (!this.functions.has(fnName)) {
            this.functions.set(fnName, []);
          }

          this.functions.get(fnName).push({
            patterns: patternStrs,
            rhs
          });
          continue;
        }
      }

      // Otherwise treated as direct expression to run (or main call)
      exprToRun = line;
    }

    commitPendingGuards();
    return exprToRun;
  }

  tokenizeLhs(lhs) {
    const tokens = [];
    let cur = '';
    let depth = 0;

    for (let i = 0; i < lhs.length; i++) {
      const ch = lhs[i];
      if (ch === '(' || ch === '[') {
        depth++;
        cur += ch;
      } else if (ch === ')' || ch === ']') {
        depth--;
        cur += ch;
      } else if (/\s/.test(ch) && depth === 0) {
        if (cur.trim()) tokens.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) tokens.push(cur.trim());
    return tokens;
  }

  evalCode(source, replExpr = null) {
    this.stepCount = 0;
    this.output = [];
    this.traces = [];
    this.graphics = [];
    this.dialogs = [];
    const mainExpr = this.parseAndLoad(source);
    const expr = replExpr || mainExpr;

    if (!expr) {
      if (this.functions.has('main')) {
        // Evaluate main function
        const val = this.applyFunction('main', []);
        return {
          success: true,
          result: this.formatValue(val),
          output: this.output.join('\n'),
          traces: this.traces,
          graphics: this.graphics,
          dialogs: this.dialogs
        };
      }
      return {
        success: true,
        result: 'Module loaded successfully.',
        output: this.output.join('\n'),
        traces: this.traces,
        graphics: this.graphics,
        dialogs: this.dialogs
      };
    }

    try {
      const val = this.evaluateExpression(expr, new Map());
      return {
        success: true,
        result: this.formatValue(val),
        output: this.output.join('\n'),
        traces: this.traces,
        graphics: this.graphics,
        dialogs: this.dialogs
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || String(err),
        output: this.output.join('\n'),
        traces: this.traces,
        graphics: this.graphics,
        dialogs: this.dialogs
      };
    }
  }

  evaluateExpression(exprStr, env = new Map()) {
    if (!env) env = new Map();
    if (++this.stepCount > this.maxSteps) {
      throw new Error(`Max reduction steps (${this.maxSteps}) exceeded. Infinite loop or recursion?`);
    }

    const str = exprStr.trim();
    if (!str) return null;

    // Handle string literal
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }

    // Handle number
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return parseFloat(str);
    }

    // Handle boolean & otherwise
    if (str === 'True' || str === 'otherwise') return true;
    if (str === 'False') return false;

    // Handle Lambda: `\pat -> body`
    if (str.startsWith('\\')) {
      const arrowIdx = str.indexOf('->');
      if (arrowIdx !== -1) {
        const paramStr = str.substring(1, arrowIdx).trim();
        const bodyStr = str.substring(arrowIdx + 2).trim();
        return {
          isLambda: true,
          paramStr,
          body: bodyStr,
          env: new Map(env)
        };
      }
    }

    // Handle operator section: `(* 1.16)` or `(1.16 *)` or `(.)`
    if (str.startsWith('(') && str.endsWith(')')) {
      const inner = str.slice(1, -1).trim();
      if (inner === '.') {
        return { isBuiltin: true, name: '.' };
      }
      // Right section: `(* 1.16)` or `(+ 1)`
      const rightSec = inner.match(/^([+*\/<>=!&|:-]+)\s+(.+)$/);
      if (rightSec) {
        return {
          isSection: true,
          op: rightSec[1],
          rightValStr: rightSec[2],
          env: new Map(env)
        };
      }
      // Left section: `(1.16 *)`
      const leftSec = inner.match(/^(.+?)\s+([+*\/<>=!&|:-]+)$/);
      if (leftSec) {
        return {
          isSection: true,
          op: leftSec[2],
          leftValStr: leftSec[1],
          env: new Map(env)
        };
      }
    }

    // Handle list literal: [1, 2, 3] or [1..10]
    if (str.startsWith('[') && str.endsWith(']')) {
      const inner = str.slice(1, -1).trim();
      if (!inner) return [];

      // List range: [a..b]
      const rangeMatch = inner.match(/^(\d+)\s*\.\.\s*(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const res = [];
        for (let i = start; i <= end; i++) res.push(i);
        return res;
      }

      // List comprehension: [ expr | var <- list, cond ]
      if (inner.includes('|') && inner.includes('<-')) {
        return this.evalListComprehension(inner, env);
      }

      // Standard list elements
      const elems = this.splitTopLevel(inner, ',');
      return elems.map(e => this.evaluateExpression(e, env));
    }

    // Handle tuple: (a, b)
    if (str.startsWith('(') && str.endsWith(')') && this.splitTopLevel(str.slice(1, -1), ',').length > 1) {
      const elems = this.splitTopLevel(str.slice(1, -1), ',');
      return { isTuple: true, items: elems.map(e => this.evaluateExpression(e, env)) };
    }

    // Handle stripped parentheses: (expr)
    if (str.startsWith('(') && str.endsWith(')')) {
      if (this.isEnclosedInParens(str)) {
        return this.evaluateExpression(str.slice(1, -1), env);
      }
    }

    // Handle `if cond then e1 else e2`
    if (str.startsWith('if ')) {
      const ifMatch = str.match(/^if\s+(.+?)\s+then\s+(.+?)\s+else\s+(.+)$/s);
      if (ifMatch) {
        const cond = this.evaluateExpression(ifMatch[1], env);
        return cond ? this.evaluateExpression(ifMatch[2], env) : this.evaluateExpression(ifMatch[3], env);
      }
    }

    // Handle `let var = val in body`
    if (str.startsWith('let ')) {
      const letMatch = str.match(/^let\s+([a-zA-Z0-9_]+)\s*=\s*(.+?)\s+in\s+(.+)$/s);
      if (letMatch) {
        const val = this.evaluateExpression(letMatch[2], env);
        const newEnv = new Map(env);
        newEnv.set(letMatch[1], val);
        return this.evaluateExpression(letMatch[3], newEnv);
      }
    }

    // Handle binary operators by precedence (including composition `.`)
    const binRes = this.tryEvalBinary(str, env);
    if (binRes !== null) return binRes;

    // Handle variable in environment
    if (env.has(str)) {
      return env.get(str);
    }

    // Handle standard Prelude or registered functions
    if (this.prelude[str] !== undefined) {
      return { isBuiltin: true, name: str };
    }

    if (this.functions.has(str)) {
      const clauses = this.functions.get(str);
      // If 0 patterns and no guards, evaluate directly
      if (clauses.length === 1 && clauses[0].patterns.length === 0 && !clauses[0].guards) {
        return this.evaluateExpression(clauses[0].rhs, env);
      }
      return { isFuncRef: true, name: str };
    }

    // Handle function application: `f arg1 arg2`
    const tokens = this.splitTopLevel(str, ' ');
    if (tokens.length > 1) {
      const fnTarget = tokens[0];
      const argExprs = tokens.slice(1);
      const args = argExprs.map(a => this.evaluateExpression(a, env));

      return this.applyFunction(fnTarget, args, env);
    }

    throw new Error(`Unknown Haskell symbol or expression: '${str}'`);
  }

  isEnclosedInParens(str) {
    if (!str.startsWith('(') || !str.endsWith(')')) return false;
    let depth = 0;
    for (let i = 0; i < str.length - 1; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      if (depth === 0) return false;
    }
    return depth === 1;
  }

  splitTopLevel(str, delimiter) {
    const parts = [];
    let cur = '';
    let parenDepth = 0;
    let bracketDepth = 0;
    let inStr = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"' && str[i - 1] !== '\\') inStr = !inStr;
      if (!inStr) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        else if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth--;
      }

      if (ch === delimiter && parenDepth === 0 && bracketDepth === 0 && !inStr) {
        if (cur.trim()) parts.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  tryEvalBinary(str, env) {
    const operatorGroups = [
      ['$'],
      ['||'],
      ['&&'],
      ['==', '/=', '<=', '>=', '<', '>'],
      ['++', ':'],
      ['+', '-'],
      ['*', '/', '`div`', '`mod`'],
      ['.']
    ];

    for (const group of operatorGroups) {
      const opMatch = this.findTopLevelOperator(str, group);
      if (opMatch) {
        const left = this.evaluateExpression(opMatch.left, env);
        const right = this.evaluateExpression(opMatch.right, env);
        return this.evalBinaryOp(opMatch.op, left, right, env);
      }
    }

    return null;
  }

  findTopLevelOperator(str, ops) {
    let parenDepth = 0;
    let bracketDepth = 0;
    let inStr = false;

    for (let i = str.length - 1; i >= 0; i--) {
      const ch = str[i];
      if (ch === '"' && str[i - 1] !== '\\') inStr = !inStr;
      if (!inStr) {
        if (ch === ')') parenDepth++;
        else if (ch === '(') parenDepth--;
        else if (ch === ']') bracketDepth++;
        else if (ch === '[') bracketDepth--;
      }

      if (parenDepth === 0 && bracketDepth === 0 && !inStr) {
        for (const op of ops) {
          const startIdx = i - op.length + 1;
          if (startIdx >= 0 && str.substring(startIdx, i + 1) === op) {
            const left = str.substring(0, startIdx).trim();
            const right = str.substring(i + 1).trim();
            if (left && right) {
              return { op, left, right };
            }
          }
        }
      }
    }
    return null;
  }

  evalBinaryOp(op, l, r, env) {
    switch (op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/': return l / r;
      case '`div`': return Math.trunc(l / r);
      case '`mod`': return l % r;
      case '==': return this.deepEqual(l, r);
      case '/=': return !this.deepEqual(l, r);
      case '<': return l < r;
      case '<=': return l <= r;
      case '>': return l > r;
      case '>=': return l >= r;
      case '&&': return Boolean(l && r);
      case '||': return Boolean(l || r);
      case ':':
        if (Array.isArray(r)) return [l, ...r];
        return [l, r];
      case '++':
        if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
        if (typeof l === 'string' && typeof r === 'string') return l + r;
        return [l, r];
      case '$':
        return this.callFuncVal(l, [r], env);
      case '.':
        return { isComposed: true, f: l, g: r };
      default:
        throw new Error(`Unsupported operator '${op}'`);
    }
  }

  evalListComprehension(inner, env) {
    const parts = inner.split('|');
    const expr = parts[0].trim();
    const clauses = parts[1].split(',').map(c => c.trim());

    const gen = clauses[0].match(/^([a-zA-Z0-9_]+)\s*<-\s*(.+)$/);
    if (!gen) throw new Error("Invalid list comprehension");

    const varName = gen[1];
    const sourceList = this.evaluateExpression(gen[2], env);
    if (!Array.isArray(sourceList)) throw new Error("Comprehension generator source is not a list");

    const results = [];
    for (const item of sourceList) {
      const localEnv = new Map(env);
      localEnv.set(varName, item);

      let pass = true;
      for (let i = 1; i < clauses.length; i++) {
        if (!this.evaluateExpression(clauses[i], localEnv)) {
          pass = false;
          break;
        }
      }

      if (pass) {
        results.push(this.evaluateExpression(expr, localEnv));
      }
    }

    return results;
  }

  applyFunction(name, args, env = new Map()) {
    if (!env) env = new Map();

    if (typeof name === 'object') {
      return this.callFuncVal(name, args, env);
    }

    if (name === '.') {
      if (args.length === 2) return { isComposed: true, f: args[0], g: args[1] };
      if (args.length === 1) return { isCurried: true, fn: '.', appliedArgs: [args[0]], targetArity: 2 };
    }

    if (this.prelude[name] !== undefined) {
      const arity = this.preludeArities[name] || 1;
      if (args.length < arity) {
        return { isCurried: true, fn: name, appliedArgs: [...args], targetArity: arity };
      }
      return this.prelude[name](args, env);
    }

    if (name === 'map') {
      if (args.length < 2) return { isCurried: true, fn: 'map', appliedArgs: [...args], targetArity: 2 };
      const [fn, xs] = args;
      if (!Array.isArray(xs)) throw new Error("map requires a list");
      return xs.map(x => this.callFuncVal(fn, [x], env));
    }
    if (name === 'filter') {
      if (args.length < 2) return { isCurried: true, fn: 'filter', appliedArgs: [...args], targetArity: 2 };
      const [pred, xs] = args;
      if (!Array.isArray(xs)) throw new Error("filter requires a list");
      return xs.filter(x => this.callFuncVal(pred, [x], env));
    }
    if (name === 'foldr') {
      if (args.length < 3) return { isCurried: true, fn: 'foldr', appliedArgs: [...args], targetArity: 3 };
      const [fn, init, xs] = args;
      if (!Array.isArray(xs)) throw new Error("foldr requires a list");
      return xs.reduceRight((acc, x) => this.callFuncVal(fn, [x, acc], env), init);
    }
    if (name === 'foldl') {
      if (args.length < 3) return { isCurried: true, fn: 'foldl', appliedArgs: [...args], targetArity: 3 };
      const [fn, init, xs] = args;
      if (!Array.isArray(xs)) throw new Error("foldl requires a list");
      return xs.reduce((acc, x) => this.callFuncVal(fn, [acc, x], env), init);
    }

    const clauses = this.functions.get(name);
    if (!clauses) {
      if (env && env.has(name)) {
        return this.callFuncVal(env.get(name), args, env);
      }
      throw new Error(`Undefined Haskell function: '${name}'`);
    }

    for (const clause of clauses) {
      if (clause.patterns.length === 0) {
        const fnVal = this.evaluateExpression(clause.rhs, env);
        if (args.length > 0) {
          return this.callFuncVal(fnVal, args, env);
        }
        return fnVal;
      }

      if (args.length < clause.patterns.length) {
        return { isCurried: true, fn: name, appliedArgs: [...args], targetArity: clause.patterns.length };
      }

      const bindings = new Map(env);
      let matched = true;

      for (let i = 0; i < clause.patterns.length; i++) {
        if (!this.matchHsPattern(clause.patterns[i], args[i], bindings)) {
          matched = false;
          break;
        }
      }

      if (matched) {
        if (this.traces.length < 150) {
          const argsFmt = args.map(a => this.formatValue(a)).join(' ');
          this.traces.push(`${name}${argsFmt ? ' ' + argsFmt : ''}  ===>  ${clause.guards ? '[Guards]' : clause.rhs}`);
        }

        if (clause.guards && clause.guards.length > 0) {
          for (const g of clause.guards) {
            const condVal = this.evaluateExpression(g.condition, bindings);
            if (condVal === true || condVal === 'otherwise') {
              const res = this.evaluateExpression(g.rhs, bindings);
              const remainingArgs = args.slice(clause.patterns.length);
              if (remainingArgs.length > 0) {
                return this.callFuncVal(res, remainingArgs, env);
              }
              return res;
            }
          }
          continue;
        }

        const res = this.evaluateExpression(clause.rhs, bindings);
        const remainingArgs = args.slice(clause.patterns.length);
        if (remainingArgs.length > 0) {
          return this.callFuncVal(res, remainingArgs, env);
        }
        return res;
      }
    }

    throw new Error(`Non-exhaustive patterns in function '${name}' for arguments (${args.map(a => this.formatValue(a)).join(', ')})`);
  }

  callFuncVal(fnVal, args, env = new Map()) {
    if (!env) env = new Map();

    if (typeof fnVal === 'object' && fnVal !== null) {
      if (fnVal.isCurried) {
        const allArgs = [...fnVal.appliedArgs, ...args];
        if (allArgs.length >= fnVal.targetArity) {
          if (typeof fnVal.fn === 'string') {
            return this.applyFunction(fnVal.fn, allArgs, env);
          } else {
            return this.callFuncVal(fnVal.fn, allArgs, env);
          }
        }
        return { ...fnVal, appliedArgs: allArgs };
      }

      if (fnVal.isBuiltin) {
        return this.applyFunction(fnVal.name, args, env);
      }

      if (fnVal.isFuncRef) {
        return this.applyFunction(fnVal.name, args, env);
      }

      if (fnVal.isSection) {
        const x = args[0];
        const localEnv = new Map(fnVal.env);
        if (fnVal.rightValStr !== undefined) {
          const r = this.evaluateExpression(fnVal.rightValStr, localEnv);
          return this.evalBinaryOp(fnVal.op, x, r, localEnv);
        } else {
          const l = this.evaluateExpression(fnVal.leftValStr, localEnv);
          return this.evalBinaryOp(fnVal.op, l, x, localEnv);
        }
      }

      if (fnVal.isLambda) {
        const localEnv = new Map(fnVal.env);
        const paramStr = fnVal.paramStr.trim();
        if (paramStr.startsWith('(') && paramStr.endsWith(')')) {
          this.matchHsPattern(paramStr, args[0], localEnv);
        } else {
          const params = this.tokenizeLhs(paramStr);
          for (let i = 0; i < Math.min(params.length, args.length); i++) {
            this.matchHsPattern(params[i], args[i], localEnv);
          }
        }
        return this.evaluateExpression(fnVal.body, localEnv);
      }

      if (fnVal.isComposed) {
        const gRes = this.callFuncVal(fnVal.g, args, env);
        return this.callFuncVal(fnVal.f, [gRes], env);
      }
    }

    if (typeof fnVal === 'string') {
      return this.applyFunction(fnVal, args, env);
    }

    if (typeof fnVal === 'function') {
      return fnVal(args, env);
    }

    throw new Error(`Cannot call non-function value: ${this.formatValue(fnVal)}`);
  }

  matchHsPattern(patStr, val, bindings) {
    const pat = patStr.trim();
    if (pat === '_') return true;

    // Numeric pattern
    if (/^\d+(\.\d+)?$/.test(pat)) {
      return parseFloat(pat) === val;
    }

    // Boolean pattern
    if (pat === 'True') return val === true;
    if (pat === 'False') return val === false;

    // Empty list
    if (pat === '[]') {
      return Array.isArray(val) && val.length === 0;
    }

    // Cons pattern: (x:xs)
    if (pat.startsWith('(') && pat.endsWith(')') && pat.includes(':')) {
      const inner = pat.slice(1, -1);
      const colonIdx = inner.indexOf(':');
      const headPat = inner.substring(0, colonIdx).trim();
      const tailPat = inner.substring(colonIdx + 1).trim();

      if (!Array.isArray(val) || val.length === 0) return false;
      const head = val[0];
      const tail = val.slice(1);
      return this.matchHsPattern(headPat, head, bindings) && this.matchHsPattern(tailPat, tail, bindings);
    }

    // Tuple pattern: (x, y) or (_, precio, cant)
    if (pat.startsWith('(') && pat.endsWith(')') && pat.includes(',')) {
      const elems = this.splitTopLevel(pat.slice(1, -1), ',');
      if (!val || !val.isTuple || val.items.length !== elems.length) return false;
      for (let i = 0; i < elems.length; i++) {
        if (!this.matchHsPattern(elems[i], val.items[i], bindings)) return false;
      }
      return true;
    }

    // Variable pattern
    if (/^[a-zA-Z_][a-zA-Z0-9_']*$/.test(pat)) {
      bindings.set(pat, val);
      return true;
    }

    return false;
  }

  deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.deepEqual(v, b[i]));
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (a.isTuple && b.isTuple) {
        return this.deepEqual(a.items, b.items);
      }
    }
    return false;
  }

  formatValue(val) {
    if (val === null || val === undefined) return '()';
    if (typeof val === 'number') return Number.isInteger(val) ? String(val) : String(Math.round(val * 10000) / 10000);
    if (typeof val === 'boolean') return val ? 'True' : 'False';
    if (typeof val === 'string') return `"${val}"`;
    if (Array.isArray(val)) {
      return `[${val.map(v => this.formatValue(v)).join(', ')}]`;
    }
    if (val.isTuple) {
      return `(${val.items.map(v => this.formatValue(v)).join(', ')})`;
    }
    if (val.isIO) {
      return '()';
    }
    if (val.isFuncRef) {
      return `<function ${val.name}>`;
    }
    return String(val);
  }
}

// Check native GHC installation
function checkNativeGHC() {
  try {
    const out = execSync('ghc --version', { stdio: 'pipe' }).toString();
    return { available: true, version: out.trim() };
  } catch (e) {
    return { available: false, version: null };
  }
}

function runNativeGHC(code) {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `temp_haskell_${Date.now()}.hs`);
    fs.writeFileSync(tmpFile, code, 'utf8');

    const proc = spawn('runghc', [tmpFile], { shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => stdout += data.toString());
    proc.stderr.on('data', data => stderr += data.toString());

    proc.on('close', (code) => {
      try { fs.unlinkSync(tmpFile); } catch (e) {}
      if (code === 0) {
        resolve({ success: true, result: stdout.trim(), output: stdout });
      } else {
        resolve({ success: false, error: stderr || stdout, output: stderr });
      }
    });

    proc.on('error', (err) => {
      try { fs.unlinkSync(tmpFile); } catch (e) {}
      resolve({ success: false, error: err.message });
    });
  });
}

async function runHaskell(code, replExpr = null, preferNative = false) {
  const ghcInfo = checkNativeGHC();
  if (preferNative && ghcInfo.available) {
    return await runNativeGHC(code);
  }

  // Use built-in fast functional engine
  const startTime = Date.now();
  const evaluator = new HaskellEvaluator();
  const res = evaluator.evalCode(code, replExpr);
  res.durationMs = Date.now() - startTime;
  res.engine = 'built-in';
  res.nativeAvailable = ghcInfo.available;
  return res;
}

module.exports = { HaskellEvaluator, runHaskell, checkNativeGHC };
