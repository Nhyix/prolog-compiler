/**
 * ============================================================================
 * TriFunc Studio — Hope Functional Interpreter & Step Tracer
 * Autor: Nhyix
 * Core Verification: #7620859-NHYIX-CORE
 * Implements Lexer, AST Parser, Right-associative Cons, Pattern Matcher & Tracer
 * ============================================================================
 */

class HopeLexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
  }

  peek() {
    return this.pos < this.input.length ? this.input[this.pos] : null;
  }

  next() {
    const ch = this.peek();
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.pos++;
    return ch;
  }

  skipWhitespaceAndComments() {
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (/\s/.test(ch)) {
        this.next();
      } else if (ch === '!') {
        // Line comment
        while (this.pos < this.input.length && this.peek() !== '\n') {
          this.next();
        }
      } else if (ch === '/' && this.input[this.pos + 1] === '*') {
        // Block comment
        this.next(); this.next();
        while (this.pos < this.input.length && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
          this.next();
        }
        if (this.pos < this.input.length) {
          this.next(); this.next();
        }
      } else {
        break;
      }
    }
  }

  tokenize() {
    const tokens = [];
    while (true) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length) break;

      const startLine = this.line;
      const startCol = this.col;
      const ch = this.peek();

      // Multi-char operators
      if (this.input.startsWith('---', this.pos)) {
        this.pos += 3; this.col += 3;
        tokens.push({ type: 'DASHES', value: '---', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('<=', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'LE_DEF', value: '<=', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('==', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'EQ_DEF', value: '==', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('/=', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'NE', value: '/=', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('->', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'ARROW', value: '->', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('::', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'CONS', value: '::', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('++', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'PLUSPLUS', value: '++', line: startLine, col: startCol });
        continue;
      }
      if (this.input.startsWith('>=', this.pos)) {
        this.pos += 2; this.col += 2;
        tokens.push({ type: 'GE', value: '>=', line: startLine, col: startCol });
        continue;
      }

      // Numbers
      if (/\d/.test(ch)) {
        let numStr = '';
        while (this.pos < this.input.length && /\d/.test(this.peek())) {
          numStr += this.next();
        }
        if (this.peek() === '.' && /\d/.test(this.input[this.pos + 1])) {
          numStr += this.next();
          while (this.pos < this.input.length && /\d/.test(this.peek())) {
            numStr += this.next();
          }
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr), line: startLine, col: startCol });
        continue;
      }

      // Strings
      if (ch === '"') {
        this.next();
        let str = '';
        while (this.pos < this.input.length && this.peek() !== '"') {
          if (this.peek() === '\\') {
            this.next();
            const esc = this.next();
            if (esc === 'n') str += '\n';
            else if (esc === 't') str += '\t';
            else str += esc;
          } else {
            str += this.next();
          }
        }
        if (this.peek() === '"') this.next();
        tokens.push({ type: 'STRING', value: str, line: startLine, col: startCol });
        continue;
      }

      // Characters
      if (ch === "'") {
        this.next();
        let charVal = '';
        if (this.peek() === '\\') {
          this.next();
          const esc = this.next();
          charVal = esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
        } else {
          charVal = this.next();
        }
        if (this.peek() === "'") this.next();
        tokens.push({ type: 'CHAR', value: charVal, line: startLine, col: startCol });
        continue;
      }

      // Identifiers or Keywords
      if (/[a-zA-Z_]/.test(ch)) {
        let id = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
          id += this.next();
        }
        const keywords = ['dec', 'data', 'type', 'infix', 'let', 'in', 'if', 'then', 'else', 'true', 'false', 'nil', 'div', 'mod', 'and', 'or', 'not', 'write', 'read', 'truval', 'num', 'char'];
        if (keywords.includes(id)) {
          tokens.push({ type: 'KEYWORD', value: id, line: startLine, col: startCol });
        } else {
          tokens.push({ type: 'IDENT', value: id, line: startLine, col: startCol });
        }
        continue;
      }

      // Single char operators/punctuation
      const singles = {
        ':': 'COLON', ';': 'SEMICOLON', '(': 'LPAREN', ')': 'RPAREN',
        '[': 'LBRACKET', ']': 'RBRACKET', ',': 'COMMA', '#': 'HASH',
        '=': 'EQ', '<': 'LT', '>': 'GT', '+': 'PLUS', '-': 'MINUS',
        '*': 'STAR', '/': 'SLASH'
      };
      if (singles[ch]) {
        this.next();
        tokens.push({ type: singles[ch], value: ch, line: startLine, col: startCol });
        continue;
      }

      throw new Error(`Unexpected character '${ch}' at line ${startLine}, col ${startCol}`);
    }

    tokens.push({ type: 'EOF', value: '', line: this.line, col: this.col });
    return tokens;
  }
}

class HopeParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  match(type, value = null) {
    const t = this.peek();
    if (t.type === type && (value === null || t.value === value)) {
      this.pos++;
      return t;
    }
    return null;
  }

  expect(type, value = null) {
    const t = this.match(type, value);
    if (!t) {
      const cur = this.peek();
      throw new Error(`Syntax Error: Expected ${type}${value ? ` '${value}'` : ''} at line ${cur.line}, col ${cur.col}, but got '${cur.value || cur.type}'`);
    }
    return t;
  }

  parseProgram() {
    const declarations = [];
    const equations = [];
    const dataTypes = [];
    let expression = null;

    while (this.peek().type !== 'EOF') {
      if (this.match('KEYWORD', 'data')) {
        dataTypes.push(this.parseDataDecl());
      } else if (this.match('KEYWORD', 'type')) {
        this.parseTypeSynonym();
      } else if (this.match('KEYWORD', 'infix')) {
        this.parseInfixDecl();
      } else if (this.match('KEYWORD', 'dec')) {
        declarations.push(this.parseDec());
      } else if (this.match('DASHES')) {
        equations.push(this.parseEquation());
      } else {
        // Direct expression to evaluate (REPL or main expression)
        expression = this.parseExpression();
        this.match('SEMICOLON');
      }
    }

    return { dataTypes, declarations, equations, expression };
  }

  parseDataDecl() {
    const nameToken = this.expect('IDENT');
    const typeParams = [];
    while (this.peek().type === 'IDENT') {
      typeParams.push(this.expect('IDENT').value);
    }
    this.expect('EQ_DEF');

    const constructors = [];
    do {
      const cname = this.expect('IDENT').value;
      let argTypes = [];
      if (this.match('LPAREN')) {
        argTypes = this.parseTypeList();
        this.expect('RPAREN');
      }
      constructors.push({ name: cname, args: argTypes });
    } while (this.match('PLUSPLUS'));

    this.match('SEMICOLON');
    return { name: nameToken.value, typeParams, constructors };
  }

  parseTypeSynonym() {
    const name = this.expect('IDENT').value;
    this.expect('EQ_DEF');
    while (this.peek().type !== 'SEMICOLON' && this.peek().type !== 'EOF') {
      this.pos++;
    }
    this.match('SEMICOLON');
  }

  parseInfixDecl() {
    const op = this.peek().value;
    this.pos++;
    this.expect('COLON');
    const prec = this.expect('NUMBER').value;
    this.match('SEMICOLON');
    return { op, prec };
  }

  parseDec() {
    const name = this.expect('IDENT').value;
    this.expect('COLON');
    const typeStr = this.parseTypeSignature();
    this.match('SEMICOLON');
    return { name, typeStr };
  }

  parseTypeSignature() {
    let s = '';
    while (this.peek().type !== 'SEMICOLON' && this.peek().type !== 'EOF') {
      s += this.tokens[this.pos++].value + ' ';
    }
    return s.trim();
  }

  parseTypeList() {
    const types = [];
    let cur = '';
    let depth = 0;
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t.type === 'LPAREN') { depth++; cur += '('; this.pos++; }
      else if (t.type === 'RPAREN' && depth > 0) { depth--; cur += ')'; this.pos++; }
      else if (t.type === 'RPAREN' && depth === 0) { break; }
      else if (t.type === 'HASH' && depth === 0) {
        types.push(cur.trim());
        cur = '';
        this.pos++;
      } else {
        cur += t.value + ' ';
        this.pos++;
      }
    }
    if (cur.trim()) types.push(cur.trim());
    return types;
  }

  parseEquation() {
    const funcToken = this.expect('IDENT');
    const patterns = [];

    // Parse patterns until '<='
    while (this.peek().type !== 'LE_DEF' && this.peek().type !== 'EOF') {
      patterns.push(this.parsePattern());
    }
    this.expect('LE_DEF');
    const body = this.parseExpression();
    this.match('SEMICOLON');

    return { func: funcToken.value, patterns, body };
  }

  parsePattern() {
    const t = this.peek();
    if (t.type === 'NUMBER') {
      this.pos++;
      return { type: 'PatNumber', value: t.value };
    }
    if (t.type === 'KEYWORD' && (t.value === 'true' || t.value === 'false')) {
      this.pos++;
      return { type: 'PatBool', value: t.value === 'true' };
    }
    if (t.type === 'KEYWORD' && t.value === 'nil') {
      this.pos++;
      return { type: 'PatNil' };
    }
    if (t.type === 'STRING') {
      this.pos++;
      return { type: 'PatString', value: t.value };
    }
    if (t.type === 'CHAR') {
      this.pos++;
      return { type: 'PatChar', value: t.value };
    }
    if (t.type === 'LBRACKET') {
      this.pos++;
      const items = [];
      if (!this.match('RBRACKET')) {
        do {
          items.push(this.parsePattern());
        } while (this.match('COMMA'));
        this.expect('RBRACKET');
      }
      return { type: 'PatList', items };
    }
    if (t.type === 'LPAREN') {
      this.pos++;
      const first = this.parsePattern();
      if (this.match('CONS')) {
        const rest = this.parsePattern();
        this.expect('RPAREN');
        return { type: 'PatCons', head: first, tail: rest };
      }
      if (this.match('COMMA')) {
        const tuple = [first];
        do {
          tuple.push(this.parsePattern());
        } while (this.match('COMMA'));
        this.expect('RPAREN');
        return { type: 'PatTuple', items: tuple };
      }
      this.expect('RPAREN');
      return first;
    }
    if (t.type === 'IDENT') {
      this.pos++;
      // Check for constructor application like `cons(h, t)` or `node(v, l, r)`
      if (this.match('LPAREN')) {
        const args = [];
        do {
          args.push(this.parsePattern());
        } while (this.match('COMMA'));
        this.expect('RPAREN');
        return { type: 'PatConstructor', name: t.value, args };
      }
      return { type: 'PatVar', name: t.value };
    }

    throw new Error(`Invalid pattern at line ${t.line}, col ${t.col}: '${t.value}'`);
  }

  parseExpression() {
    return this.parseLetOrIf();
  }

  parseLetOrIf() {
    if (this.match('KEYWORD', 'if')) {
      const cond = this.parseExpression();
      this.expect('KEYWORD', 'then');
      const thenBranch = this.parseExpression();
      this.expect('KEYWORD', 'else');
      const elseBranch = this.parseExpression();
      return { type: 'If', cond, thenBranch, elseBranch };
    }
    if (this.match('KEYWORD', 'let')) {
      const pat = this.parsePattern();
      this.expect('EQ_DEF');
      const val = this.parseExpression();
      this.expect('KEYWORD', 'in');
      const body = this.parseExpression();
      return { type: 'Let', pat, val, body };
    }
    return this.parseLogicalOr();
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.match('KEYWORD', 'or')) {
      const right = this.parseLogicalAnd();
      left = { type: 'Binary', op: 'or', left, right };
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseComparison();
    while (this.match('KEYWORD', 'and')) {
      const right = this.parseComparison();
      left = { type: 'Binary', op: 'and', left, right };
    }
    return left;
  }

  parseComparison() {
    let left = this.parseCons();
    const ops = { EQ: '=', NE: '/=', LT: '<', LE_DEF: '<=', GT: '>', GE: '>=' };
    const t = this.peek();
    if (ops[t.type]) {
      this.pos++;
      const right = this.parseCons();
      return { type: 'Binary', op: ops[t.type], left, right };
    }
    return left;
  }

  parseCons() {
    const left = this.parseAddSub();
    if (this.match('CONS')) {
      const right = this.parseCons();
      return { type: 'Binary', op: '::', left, right };
    }
    if (this.match('PLUSPLUS')) {
      const right = this.parseCons();
      return { type: 'Binary', op: '++', left, right };
    }
    return left;
  }

  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.match('PLUS') || this.match('MINUS')) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseMulDiv();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parseUnary();
    while (this.match('STAR') || this.match('SLASH') || this.match('KEYWORD', 'div') || this.match('KEYWORD', 'mod')) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseUnary();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.match('MINUS')) {
      return { type: 'Unary', op: '-', expr: this.parseUnary() };
    }
    if (this.match('KEYWORD', 'not')) {
      return { type: 'Unary', op: 'not', expr: this.parseUnary() };
    }
    return this.parseApplication();
  }

  parseApplication() {
    const primary = this.parsePrimary();
    const args = [];

    // In Hope, function application can be `f x`, `f (x, y)`, `f x y`
    while (this.canStartPrimary()) {
      args.push(this.parsePrimary());
    }

    if (args.length === 0) return primary;
    return { type: 'Apply', func: primary, args };
  }

  canStartPrimary() {
    const t = this.peek();
    if (!t || t.type === 'EOF') return false;
    return ['NUMBER', 'STRING', 'CHAR', 'IDENT', 'LPAREN', 'LBRACKET'].includes(t.type) ||
      (t.type === 'KEYWORD' && ['true', 'false', 'nil'].includes(t.value));
  }

  parsePrimary() {
    const t = this.peek();

    if (t.type === 'NUMBER') {
      this.pos++;
      return { type: 'Number', value: t.value };
    }
    if (t.type === 'STRING') {
      this.pos++;
      return { type: 'String', value: t.value };
    }
    if (t.type === 'CHAR') {
      this.pos++;
      return { type: 'Char', value: t.value };
    }
    if (t.type === 'KEYWORD') {
      if (t.value === 'true' || t.value === 'false') {
        this.pos++;
        return { type: 'Bool', value: t.value === 'true' };
      }
      if (t.value === 'nil') {
        this.pos++;
        return { type: 'Nil' };
      }
    }
    if (t.type === 'LBRACKET') {
      this.pos++;
      const items = [];
      if (!this.match('RBRACKET')) {
        do {
          items.push(this.parseExpression());
        } while (this.match('COMMA'));
        this.expect('RBRACKET');
      }
      return { type: 'ListLiteral', items };
    }
    if (t.type === 'LPAREN') {
      this.pos++;
      const first = this.parseExpression();
      if (this.match('COMMA')) {
        const tuple = [first];
        do {
          tuple.push(this.parseExpression());
        } while (this.match('COMMA'));
        this.expect('RPAREN');
        return { type: 'Tuple', items: tuple };
      }
      this.expect('RPAREN');
      return first;
    }
    if (t.type === 'IDENT') {
      this.pos++;
      // Check if it's a constructor call with parens or function call with attached parens: f(...)
      const nextToken = this.peek();
      const isAttached = nextToken && nextToken.type === 'LPAREN' && nextToken.col === (t.col + t.value.length);
      if (isAttached && this.match('LPAREN')) {
        const args = [];
        if (!this.match('RPAREN')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
          this.expect('RPAREN');
        }
        return { type: 'CallOrCtor', name: t.value, args };
      }
      return { type: 'Var', name: t.value };
    }

    throw new Error(`Unexpected token at line ${t.line}, col ${t.col}: '${t.value || t.type}'`);
  }
}

class HopeEvaluator {
  constructor(options = {}) {
    this.functions = new Map();
    this.constructors = new Set(['nil', 'cons', 'true', 'false']);
    this.traces = [];
    this.graphics = [];
    this.dialogs = [];
    this.maxSteps = options.maxSteps || 10000;
    this.stepCount = 0;
    this.output = [];

    // Register built-in functions
    this.registerBuiltins();
  }

  registerBuiltins() {
    this.builtins = {
      write: (args) => {
        const s = this.formatValue(args[0]);
        this.output.push(s);
        return s;
      },
      max: (args) => {
        return Math.max(args[0], args[1]);
      },
      min: (args) => {
        return Math.min(args[0], args[1]);
      },
      abs: (args) => {
        return Math.abs(args[0]);
      },
      sqrt: (args) => {
        return Math.sqrt(args[0]);
      },
      clear_canvas: (args) => {
        this.graphics.push({ type: 'clear', color: args[0] ? String(args[0]) : '#11111b' });
        return true;
      },
      draw_circle: (args) => {
        this.graphics.push({ type: 'circle', x: Number(args[0]) || 0, y: Number(args[1]) || 0, r: Number(args[2]) || 10, color: args[3] ? String(args[3]) : '#cba6f7' });
        return true;
      },
      draw_rect: (args) => {
        this.graphics.push({ type: 'rect', x: Number(args[0]) || 0, y: Number(args[1]) || 0, w: Number(args[2]) || 20, h: Number(args[3]) || 20, color: args[4] ? String(args[4]) : '#89dceb' });
        return true;
      },
      draw_line: (args) => {
        this.graphics.push({ type: 'line', x1: Number(args[0]) || 0, y1: Number(args[1]) || 0, x2: Number(args[2]) || 0, y2: Number(args[3]) || 0, color: args[4] ? String(args[4]) : '#a6e3a1', width: Number(args[5]) || 2 });
        return true;
      },
      draw_text: (args) => {
        this.graphics.push({ type: 'text', x: Number(args[0]) || 0, y: Number(args[1]) || 0, text: String(args[2] ?? ''), color: args[3] ? String(args[3]) : '#cdd6f4', size: Number(args[4]) || 16 });
        return true;
      },
      show_image: (args) => {
        this.graphics.push({ type: 'image', url: String(args[0] || ''), w: Number(args[1]) || 220, h: Number(args[2]) || 220 });
        return true;
      },
      msgbox: (args) => {
        if (args.length === 1) {
          this.dialogs.push({ title: 'Ventana de Hope', message: String(args[0] ?? '') });
        } else {
          this.dialogs.push({ title: String(args[0] ?? ''), message: String(args[1] ?? '') });
        }
        return true;
      }
    };
  }

  loadProgram(ast) {
    for (const dt of ast.dataTypes) {
      for (const c of dt.constructors) {
        this.constructors.add(c.name);
      }
    }

    for (const eq of ast.equations) {
      if (!this.functions.has(eq.func)) {
        this.functions.set(eq.func, []);
      }
      this.functions.get(eq.func).push(eq);
    }
  }

  evaluate(ast, replExpr = null) {
    this.stepCount = 0;
    this.traces = [];
    this.graphics = [];
    this.dialogs = [];
    this.output = [];
    this.loadProgram(ast);

    let expr = replExpr || ast.expression;
    if (!expr) {
      return {
        result: 'Program compiled successfully. No main expression provided.',
        output: this.output.join('\n'),
        traces: this.traces,
        graphics: this.graphics,
        dialogs: this.dialogs
      };
    }

    const env = new Map();
    const val = this.evalExpr(expr, env);
    return {
      result: this.formatValue(val),
      raw: val,
      output: this.output.join('\n'),
      traces: this.traces,
      graphics: this.graphics,
      dialogs: this.dialogs
    };
  }

  matchPattern(pattern, value, bindings) {
    if (pattern.type === 'PatVar') {
      if (this.constructors.has(pattern.name)) {
        return Boolean(value && typeof value === 'object' && value.constructorName === pattern.name && (!value.args || value.args.length === 0));
      }
      bindings.set(pattern.name, value);
      return true;
    }
    if (pattern.type === 'PatNumber') {
      return pattern.value === value;
    }
    if (pattern.type === 'PatBool') {
      return pattern.value === value;
    }
    if (pattern.type === 'PatChar' || pattern.type === 'PatString') {
      return pattern.value === value;
    }
    if (pattern.type === 'PatNil') {
      return Array.isArray(value) && value.length === 0;
    }
    if (pattern.type === 'PatList') {
      if (!Array.isArray(value) || value.length !== pattern.items.length) return false;
      for (let i = 0; i < pattern.items.length; i++) {
        if (!this.matchPattern(pattern.items[i], value[i], bindings)) return false;
      }
      return true;
    }
    if (pattern.type === 'PatCons') {
      if (!Array.isArray(value) || value.length === 0) return false;
      const head = value[0];
      const tail = value.slice(1);
      return this.matchPattern(pattern.head, head, bindings) && this.matchPattern(pattern.tail, tail, bindings);
    }
    if (pattern.type === 'PatTuple') {
      if (!value || value.isTuple !== true || value.items.length !== pattern.items.length) {
        // Also allow JS arrays if passed as tuple
        if (Array.isArray(value) && value.length === pattern.items.length) {
          for (let i = 0; i < pattern.items.length; i++) {
            if (!this.matchPattern(pattern.items[i], value[i], bindings)) return false;
          }
          return true;
        }
        return false;
      }
      for (let i = 0; i < pattern.items.length; i++) {
        if (!this.matchPattern(pattern.items[i], value.items[i], bindings)) return false;
      }
      return true;
    }
    if (pattern.type === 'PatConstructor') {
      if (!value || typeof value !== 'object' || value.constructorName !== pattern.name) return false;
      if (pattern.args.length !== value.args.length) return false;
      for (let i = 0; i < pattern.args.length; i++) {
        if (!this.matchPattern(pattern.args[i], value.args[i], bindings)) return false;
      }
      return true;
    }
    return false;
  }

  evalExpr(expr, env) {
    if (++this.stepCount > this.maxSteps) {
      throw new Error(`Maximum execution steps exceeded (${this.maxSteps}). Check for infinite recursion.`);
    }

    switch (expr.type) {
      case 'Number':
      case 'String':
      case 'Char':
      case 'Bool':
        return expr.value;

      case 'Nil':
        return [];

      case 'ListLiteral':
        return expr.items.map(item => this.evalExpr(item, env));

      case 'Tuple':
        return { isTuple: true, items: expr.items.map(item => this.evalExpr(item, env)) };

      case 'CallOrCtor':
      case 'ConstructorCall': {
        const evaluatedArgs = expr.args.map(a => this.evalExpr(a, env));
        // Special case: cons(h, t) -> array
        if (expr.name.toLowerCase() === 'cons' && evaluatedArgs.length === 2 && Array.isArray(evaluatedArgs[1])) {
          return [evaluatedArgs[0], ...evaluatedArgs[1]];
        }
        if (this.constructors.has(expr.name)) {
          return { constructorName: expr.name, args: evaluatedArgs };
        }
        return this.applyFunction(expr.name, evaluatedArgs);
      }

      case 'Var': {
        if (env.has(expr.name)) {
          return env.get(expr.name);
        }
        if (expr.name === 'nil') return [];
        if (this.constructors.has(expr.name)) {
          return { constructorName: expr.name, args: [] };
        }
        if (this.functions.has(expr.name)) {
          // Function reference (first-class closure)
          return { isClosure: true, funcName: expr.name, boundArgs: [] };
        }
        if (this.builtins[expr.name]) {
          return { isBuiltin: true, funcName: expr.name };
        }
        throw new Error(`Unbound identifier: '${expr.name}'`);
      }

      case 'If': {
        const c = this.evalExpr(expr.cond, env);
        return c ? this.evalExpr(expr.thenBranch, env) : this.evalExpr(expr.elseBranch, env);
      }

      case 'Let': {
        const val = this.evalExpr(expr.val, env);
        const newEnv = new Map(env);
        if (!this.matchPattern(expr.pat, val, newEnv)) {
          throw new Error(`Pattern match failed in let-binding`);
        }
        return this.evalExpr(expr.body, newEnv);
      }

      case 'Unary': {
        const v = this.evalExpr(expr.expr, env);
        if (expr.op === '-') return -v;
        if (expr.op === 'not') return !v;
        throw new Error(`Unknown unary operator '${expr.op}'`);
      }

      case 'Binary': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        switch (expr.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return l / r;
          case 'div': return Math.trunc(l / r);
          case 'mod': return l % r;
          case '=': return this.deepEqual(l, r);
          case '/=': return !this.deepEqual(l, r);
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          case '>=': return l >= r;
          case 'and': return Boolean(l && r);
          case 'or': return Boolean(l || r);
          case '::':
            if (Array.isArray(r)) return [l, ...r];
            return [l, r];
          case '++':
            if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
            if (typeof l === 'string' && typeof r === 'string') return l + r;
            return [l, r];
          default:
            throw new Error(`Unsupported binary operator '${expr.op}'`);
        }
      }

      case 'Apply': {
        const funcVal = this.evalExpr(expr.func, env);
        const argVals = expr.args.map(a => this.evalExpr(a, env));

        if (funcVal && funcVal.isBuiltin) {
          return this.builtins[funcVal.funcName](argVals);
        }

        let funcName = null;
        let boundArgs = [];
        if (funcVal && funcVal.isClosure) {
          funcName = funcVal.funcName;
          boundArgs = funcVal.boundArgs;
        } else if (typeof funcVal === 'string') {
          funcName = funcVal;
        }

        if (!funcName) {
          throw new Error(`Target is not a callable function`);
        }

        const totalArgs = [...boundArgs, ...argVals];
        return this.applyFunction(funcName, totalArgs);
      }

      default:
        throw new Error(`Unknown AST node: ${expr.type}`);
    }
  }

  applyFunction(name, args) {
    if (this.builtins[name]) {
      return this.builtins[name](args);
    }

    const clauses = this.functions.get(name);
    if (!clauses) {
      throw new Error(`Undefined function: '${name}'`);
    }

    const minPatterns = Math.min(...clauses.map(c => c.patterns.length));
    if (args.length < minPatterns) {
      return { isClosure: true, funcName: name, boundArgs: [...args] };
    }

    // Unpack single tuple argument if clause expects tuple
    for (const clause of clauses) {
      const bindings = new Map();
      let matched = false;

      if (clause.patterns.length === 1 && args.length === 1) {
        matched = this.matchPattern(clause.patterns[0], args[0], bindings);
      } else if (clause.patterns.length === args.length) {
        matched = true;
        for (let i = 0; i < args.length; i++) {
          if (!this.matchPattern(clause.patterns[i], args[i], bindings)) {
            matched = false;
            break;
          }
        }
      } else if (clause.patterns.length === 1 && args.length > 1) {
        // e.g. tuple pattern `MaxOf3 (x, y, z)` matching args `[x, y, z]`
        const tupleArg = { isTuple: true, items: args };
        matched = this.matchPattern(clause.patterns[0], tupleArg, bindings);
      }

      if (matched) {
        // Record trace step for reduction viewer
        if (this.traces.length < 50) {
          this.traces.push(`${name}(${args.map(a => this.formatValue(a)).join(', ')})`);
        }
        return this.evalExpr(clause.body, bindings);
      }
    }

    throw new Error(`No matching equation for function '${name}' with arguments (${args.map(a => this.formatValue(a)).join(', ')})`);
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
      if (a.constructorName && b.constructorName) {
        return a.constructorName === b.constructorName && this.deepEqual(a.args, b.args);
      }
    }
    return false;
  }

  formatValue(val) {
    if (val === null || val === undefined) return '()';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? String(val) : String(Math.round(val * 10000) / 10000);
    }
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'string') return `"${val}"`;
    if (Array.isArray(val)) {
      return `[${val.map(v => this.formatValue(v)).join(', ')}]`;
    }
    if (val.isTuple) {
      return `(${val.items.map(v => this.formatValue(v)).join(', ')})`;
    }
    if (val.constructorName) {
      if (val.args && val.args.length > 0) {
        return `${val.constructorName}(${val.args.map(v => this.formatValue(v)).join(', ')})`;
      }
      return val.constructorName;
    }
    if (val.isClosure) {
      return `<function ${val.funcName}>`;
    }
    return String(val);
  }
}

function runHope(code, replExpr = null) {
  const lexer = new HopeLexer(code);
  const tokens = lexer.tokenize();
  const parser = new HopeParser(tokens);
  const ast = parser.parseProgram();
  const evaluator = new HopeEvaluator();
  return evaluator.evaluate(ast, replExpr);
}

module.exports = { HopeLexer, HopeParser, HopeEvaluator, runHope };
