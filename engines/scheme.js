/**
 * ============================================================================
 * TriFunc Studio — Scheme Execution Engine (R7RS-small + TCO)
 * Autor: Nhyix
 * Core Verification: #7620859-NHYIX-CORE
 * Powered by BiwaScheme with Canvas 2D and GUI Window Primitives
 * ============================================================================
 */

const BiwaScheme = require('biwascheme');

let activeGraphicsBuffer = [];
let activeDialogsBuffer = [];

// Register GUI & Canvas primitives in BiwaScheme
BiwaScheme.define_libfunc('clear-canvas', 0, 1, (ar) => {
  activeGraphicsBuffer.push({ type: 'clear', color: ar[0] ? String(ar[0]) : '#11111b' });
  return BiwaScheme.undef;
});

BiwaScheme.define_libfunc('draw-circle', 3, 4, (ar) => {
  activeGraphicsBuffer.push({
    type: 'circle',
    x: Number(ar[0]) || 0,
    y: Number(ar[1]) || 0,
    r: Number(ar[2]) || 10,
    color: ar[3] ? String(ar[3]) : '#cba6f7'
  });
  return BiwaScheme.undef;
});

BiwaScheme.define_libfunc('draw-rect', 4, 5, (ar) => {
  activeGraphicsBuffer.push({
    type: 'rect',
    x: Number(ar[0]) || 0,
    y: Number(ar[1]) || 0,
    w: Number(ar[2]) || 20,
    h: Number(ar[3]) || 20,
    color: ar[4] ? String(ar[4]) : '#89dceb'
  });
  return BiwaScheme.undef;
});

BiwaScheme.define_libfunc('draw-line', 4, 6, (ar) => {
  activeGraphicsBuffer.push({
    type: 'line',
    x1: Number(ar[0]) || 0,
    y1: Number(ar[1]) || 0,
    x2: Number(ar[2]) || 0,
    y2: Number(ar[3]) || 0,
    color: ar[4] ? String(ar[4]) : '#a6e3a1',
    width: Number(ar[5]) || 2
  });
  return BiwaScheme.undef;
});

BiwaScheme.define_libfunc('draw-text', 3, 5, (ar) => {
  activeGraphicsBuffer.push({
    type: 'text',
    x: Number(ar[0]) || 0,
    y: Number(ar[1]) || 0,
    text: String(ar[2] ?? ''),
    color: ar[3] ? String(ar[3]) : '#cdd6f4',
    size: Number(ar[4]) || 16
  });
  return BiwaScheme.undef;
});

BiwaScheme.define_libfunc('show-image', 1, 3, (ar) => {
  activeGraphicsBuffer.push({
    type: 'image',
    url: String(ar[0] || ''),
    w: Number(ar[1]) || 220,
    h: Number(ar[2]) || 220
  });
  return BiwaScheme.undef;
});

BiwaScheme.define_libfunc('msgbox', 1, 2, (ar) => {
  if (ar.length === 1) {
    activeDialogsBuffer.push({ title: 'Ventana de Scheme', message: String(ar[0]) });
  } else {
    activeDialogsBuffer.push({ title: String(ar[0]), message: String(ar[1]) });
  }
  return BiwaScheme.undef;
});

// Math helpers for fractals (sin, cos, floor, round)
BiwaScheme.define_libfunc('deg-sin', 1, 1, (ar) => Math.sin((Number(ar[0]) * Math.PI) / 180));
BiwaScheme.define_libfunc('deg-cos', 1, 1, (ar) => Math.cos((Number(ar[0]) * Math.PI) / 180));

class SchemeEngine {
  constructor() {
    this.env = new BiwaScheme.Interpreter();
  }

  async run(code) {
    const outputBuffer = [];
    activeGraphicsBuffer = [];
    activeDialogsBuffer = [];

    // Set up BiwaScheme output catcher
    const originalPutString = BiwaScheme.Port.current_output.put_string;

    BiwaScheme.Port.current_output.put_string = function(str) {
      outputBuffer.push(str);
    };

    const startTime = Date.now();
    const traces = [];
    const self = this;

    // Normalize Windows CRLF (\r\n) and \r to \n so BiwaScheme doesn't parse \r as a symbol
    const normalizedCode = String(code || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    try {
      const interpreter = new BiwaScheme.Interpreter((err) => {
        throw err;
      });

      // Hook into BiwaScheme VM to record user closure/function applications for Reductions Trace
      interpreter.run_dump_hook = function(a, x, f, c, s) {
        if (x && x[0] === 'apply' && traces.length < 150) {
          if (BiwaScheme.isClosure && BiwaScheme.isClosure(a)) {
            const fnName = this.last_refer || 'lambda';
            const nArgs = this.index(s, 0);
            const callArgs = [];
            for (let i = 1; i <= nArgs; i++) {
              callArgs.push(self.formatResult(this.index(s, i)));
            }
            traces.push(`(${fnName}${callArgs.length ? ' ' + callArgs.join(' ') : ''})`);
          }
        }
      };

      const result = await new Promise((resolve, reject) => {
        try {
          interpreter.evaluate(normalizedCode, (res) => {
            resolve(res);
          });
        } catch (e) {
          reject(e);
        }
      });

      const durationMs = Date.now() - startTime;

      const hasOutput = outputBuffer.length > 0;
      return {
        success: true,
        result: this.formatResult(result, hasOutput),
        rawResult: result,
        output: outputBuffer.join(''),
        traces,
        graphics: [...activeGraphicsBuffer],
        dialogs: [...activeDialogsBuffer],
        durationMs
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        error: err.message || String(err),
        output: outputBuffer.join(''),
        traces,
        graphics: [...activeGraphicsBuffer],
        dialogs: [...activeDialogsBuffer],
        durationMs
      };
    } finally {
      BiwaScheme.Port.current_output.put_string = originalPutString;
    }
  }

  formatResult(val, hasOutput = false) {
    if (val === BiwaScheme.undef) {
      return hasOutput ? undefined : 'Módulo cargado correctamente.';
    }
    if (val === null) return '()';
    if (typeof val === 'boolean') return val ? '#t' : '#f';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'symbol') return val.name;
    if (BiwaScheme.isPair && BiwaScheme.isPair(val)) {
      return BiwaScheme.to_write(val);
    }
    if (BiwaScheme.isVector && BiwaScheme.isVector(val)) {
      return `#(${val.map(x => this.formatResult(x)).join(' ')})`;
    }
    if (typeof val === 'function') return '#<procedure>';
    return String(val);
  }
}

async function runScheme(code) {
  const engine = new SchemeEngine();
  return await engine.run(code);
}

module.exports = { SchemeEngine, runScheme };
