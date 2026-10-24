// ============================================================================
// TriFunc Studio — Monaco Language Intelligence
// Comprehensive Syntax, Autocompletion, Hover Docs, Formatters & Auto-Detection
// Supports: Haskell (Pure), Hope (Pure 1978/1980), Scheme (Impure R7RS)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Language Definitions & Monarch Tokenizers
// ----------------------------------------------------------------------------
function registerCustomLanguages(monaco) {

  // ==========================================================================
  // A. HOPE LANGUAGE DEFINITION (Edinburgh / Imperial Hope 1978/1980s)
  // Functional Purity: PURE (Strict / Call-by-value, equations & ADTs)
  // ==========================================================================
  monaco.languages.register({ id: 'hope' });

  monaco.languages.setMonarchTokensProvider('hope', {
    defaultToken: '',
    tokenPostfix: '.hop',
    keywords: [
      'dec', 'data', 'type', 'infix', 'let', 'in', 'if', 'then', 'else',
      'true', 'false', 'nil', 'div', 'mod', 'and', 'or', 'not', 'write',
      'read', 'truval', 'num', 'char'
    ],
    typeKeywords: ['num', 'char', 'truval', 'list', 'tree', 'alpha', 'beta', 'gamma', 'delta'],
    operators: [
      '---', '<=', '==', '->', '#', '++', '::', ':', ';', '=', '/=',
      '<', '>', '>=', '+', '-', '*', '/', ','
    ],
    tokenizer: {
      root: [
        // Comments
        [/!.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Equations and arrows
        [/---/, 'keyword.equation'],
        [/<=/, 'operator.def'],
        [/==/, 'operator.eqdef'],
        [/->/, 'operator.arrow'],
        [/::/, 'operator.cons'],
        [/\+\+/, 'operator.append'],

        // Identifiers and Keywords
        [/[a-zA-Z_][a-zA-Z0-9_]*/, {
          cases: {
            '@keywords': 'keyword',
            '@typeKeywords': 'type',
            '@default': 'identifier'
          }
        }],

        // Numbers
        [/\d+(\.\d+)?/, 'number'],

        // Strings & Chars
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)'/, 'string.char'],

        // Delimiters & brackets
        [/[{}()\[\]]/, '@brackets'],
        [/[;,#]/, 'delimiter'],

        // Operators
        [/[-+*\/=<>]/, 'operator']
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ]
    }
  });

  monaco.languages.setLanguageConfiguration('hope', {
    comments: {
      lineComment: '!',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['(', ')'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    indentationRules: {
      increaseIndentPattern: /^(dec\s+.*|data\s+.*|---.*<=\s*)$/,
      decreaseIndentPattern: /^(\s*;|\s*---)/
    }
  });

  // ==========================================================================
  // B. SCHEME LANGUAGE DEFINITION (R5RS / R7RS Standard via BiwaScheme)
  // Functional Purity: IMPURE (First-class functions with side-effects/mutation)
  // ==========================================================================
  monaco.languages.register({ id: 'scheme' });

  monaco.languages.setMonarchTokensProvider('scheme', {
    defaultToken: '',
    tokenPostfix: '.scm',
    keywords: [
      'define', 'lambda', 'let', 'let*', 'letrec', 'cond', 'if', 'else',
      'begin', 'quote', 'quasiquote', 'unquote', 'unquote-splicing',
      'set!', 'and', 'or', 'not', 'case', 'do', 'delay', 'force',
      'call-with-current-continuation', 'call/cc', 'display', 'newline',
      'write', 'read', 'car', 'cdr', 'cons', 'list', 'null?', 'pair?',
      'map', 'filter', 'fold', 'apply', 'append', 'reverse', 'length',
      'vector', 'make-vector', 'vector-ref', 'vector-set!', 'string',
      'number?', 'string?', 'symbol?', 'boolean?', 'procedure?'
    ],
    operators: ['+', '-', '*', '/', '<', '<=', '=', '>', '>=', 'eq?', 'eqv?', 'equal?'],
    tokenizer: {
      root: [
        [/;.*$/, 'comment'],
        [/#t|#f/, 'constant.boolean'],
        [/'[a-zA-Z0-9_!?-]+/, 'variable.symbol'],
        [/[a-zA-Z_!?-][a-zA-Z0-9_!?-]*/, {
          cases: {
            '@keywords': 'keyword',
            '@operators': 'operator',
            '@default': 'identifier'
          }
        }],
        [/-?\d+(\.\d+)?/, 'number'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/[()]/, '@brackets']
      ]
    }
  });

  monaco.languages.setLanguageConfiguration('scheme', {
    comments: {
      lineComment: ';'
    },
    brackets: [
      ['(', ')'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ],
    indentationRules: {
      increaseIndentPattern: /^\s*\((define|lambda|let|let\*|letrec|if|cond|begin)\b.*$/,
      decreaseIndentPattern: /^\s*\)+$/
    }
  });

  // ==========================================================================
  // C. HASKELL LANGUAGE DEFINITION (GHC / Prelude Built-in)
  // Functional Purity: PURE (Lazy evaluation, monadic I/O, static type system)
  // ==========================================================================
  try {
    monaco.languages.register({ id: 'haskell' });
    monaco.languages.setMonarchTokensProvider('haskell', {
      defaultToken: '',
      tokenPostfix: '.hs',
      keywords: [
        'case', 'class', 'data', 'default', 'deriving', 'do', 'else', 'foreign',
        'if', 'import', 'in', 'infix', 'infixl', 'infixr', 'instance', 'let',
        'module', 'newtype', 'of', 'then', 'type', 'where', 'as', 'qualified', 'hiding'
      ],
      typeKeywords: [
        'Int', 'Integer', 'Float', 'Double', 'Bool', 'Char', 'String', 'IO', 'Maybe', 'Either', 'Ordering'
      ],
      tokenizer: {
        root: [
          [/--.*$/, 'comment'],
          [/{-/, 'comment', '@comment'],
          [/::/, 'operator.type'],
          [/->/, 'operator.arrow'],
          [/<-/, 'operator.bind'],
          [/=>/, 'operator.context'],
          [/[A-Z][a-zA-Z0-9_']*/, 'type'],
          [/[a-z_][a-zA-Z0-9_']*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/-?\d+(\.\d+)?/, 'number'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)'/, 'string.char'],
          [/[()\[\]{}]/, '@brackets'],
          [/[-+*\/=<>:|&^%$]+/, 'operator']
        ],
        comment: [
          [/[^-{}]+/, 'comment'],
          [/-}/, 'comment', '@pop'],
          [/[-{}]/, 'comment']
        ]
      }
    });

    monaco.languages.setLanguageConfiguration('haskell', {
      comments: {
        lineComment: '--',
        blockComment: ['{-', '-}']
      },
      brackets: [
        ['(', ')'],
        ['[', ']'],
        ['{', '}']
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      indentationRules: {
        increaseIndentPattern: /^.*(\bwhere\b|\bdo\b|\blet\b|\bof\b|=)\s*$/,
        decreaseIndentPattern: /^\s*(\bin\b|\belse\b)/
      }
    });
  } catch (e) {
    // Already defined in Monaco
  }

  // --------------------------------------------------------------------------
  // 2. Intelligent Autocomplete & IntelliSense Providers
  // --------------------------------------------------------------------------
  registerAutocompleteProviders(monaco);

  // --------------------------------------------------------------------------
  // 3. Rich Hover Documentation Providers
  // --------------------------------------------------------------------------
  registerHoverProviders(monaco);

  // --------------------------------------------------------------------------
  // 4. Auto-Indentation and Document Formatters
  // --------------------------------------------------------------------------
  registerDocumentFormatters(monaco);
}

// ----------------------------------------------------------------------------
// Autocomplete & Snippets Registration
// ----------------------------------------------------------------------------
function registerAutocompleteProviders(monaco) {

  // --- HOPE AUTOCOMPLETE ---
  monaco.languages.registerCompletionItemProvider('hope', {
    triggerCharacters: [' ', ':', '-', '<', '#'],
    provideCompletionItems: (model, position) => {
      const suggestions = [];

      // Built-in keywords & types
      const hopeKeywords = [
        { label: 'dec', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Declaración de tipo de función', insertText: 'dec ${1:nombre} : ${2:tipo_origen} -> ${3:tipo_destino};' },
        { label: '---', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Ecuación con pattern matching', insertText: '--- ${1:nombre} ${2:patron} <= ${3:expresion};' },
        { label: 'data', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Definición de Tipo Algebraico de Datos (ADT)', insertText: 'data ${1:tipo} alpha == ${2:vacio} ++ ${3:nodo}(alpha # ${1:tipo} alpha);' },
        { label: 'type', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Sinónimo de tipo', insertText: 'type ${1:nombre} == ${2:tipo_existente};' },
        { label: 'infix', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Declarar operador infijo y precedencia', insertText: 'infix ${1:++} : ${2:6};' },
        { label: 'if-then-else', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Condicional funcional Hope', insertText: 'if ${1:condicion} then ${2:consecuente} else ${3:alternativa}' },
        { label: 'let-in', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Asignación local inmutable', insertText: 'let ${1:var} == ${2:valor} in ${3:cuerpo}' },
        { label: 'num', kind: monaco.languages.CompletionItemKind.TypeParameter, detail: 'Tipo primitivo numérico' },
        { label: 'truval', kind: monaco.languages.CompletionItemKind.TypeParameter, detail: 'Tipo booleano (true/false)' },
        { label: 'char', kind: monaco.languages.CompletionItemKind.TypeParameter, detail: 'Tipo carácter' },
        { label: 'list', kind: monaco.languages.CompletionItemKind.TypeParameter, detail: 'Constructor de tipo lista (list alpha)' },
        { label: 'tree', kind: monaco.languages.CompletionItemKind.TypeParameter, detail: 'Constructor de tipo árbol' },
        { label: 'nil', kind: monaco.languages.CompletionItemKind.Constant, detail: 'Lista vacía nil' },
        { label: 'true', kind: monaco.languages.CompletionItemKind.Constant, detail: 'Valor booleano true' },
        { label: 'false', kind: monaco.languages.CompletionItemKind.Constant, detail: 'Valor booleano false' }
      ];

      hopeKeywords.forEach(k => {
        suggestions.push({
          label: k.label,
          kind: k.kind,
          detail: k.detail,
          insertText: k.insertText || k.label,
          insertTextRules: k.insertText ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined
        });
      });

      // Snippets for Classical Hope Algorithms
      suggestions.push({
        label: 'snippet:factorial',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Factorial con pattern matching puro (Hope 1980)',
        insertText: [
          'dec fact : num -> num;',
          '--- fact 0 <= 1;',
          '--- fact n <= n * fact(n - 1);',
          '',
          'fact(${1:5});'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      suggestions.push({
        label: 'snippet:tree-adt',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Árbol binario algebraico polimórfico en Hope',
        insertText: [
          'data tree alpha == emptytree ++ node(alpha # tree alpha # tree alpha);',
          '',
          'dec count_nodes : tree alpha -> num;',
          '--- count_nodes emptytree <= 0;',
          '--- count_nodes(node(x, l, r)) <= 1 + count_nodes(l) + count_nodes(r);'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      suggestions.push({
        label: 'snippet:fibonacci',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Fibonacci recursivo en Hope',
        insertText: [
          'dec fib : num -> num;',
          '--- fib 0 <= 0;',
          '--- fib 1 <= 1;',
          '--- fib n <= fib(n - 1) + fib(n - 2);',
          '',
          'fib(${1:10});'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      // Extract user declared identifiers from current Hope buffer
      const text = model.getValue();
      const decMatches = text.matchAll(/dec\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const m of decMatches) {
        suggestions.push({
          label: m[1],
          kind: monaco.languages.CompletionItemKind.Function,
          detail: 'Función definida en el archivo activo',
          insertText: m[1]
        });
      }
      const dataMatches = text.matchAll(/data\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const m of dataMatches) {
        suggestions.push({
          label: m[1],
          kind: monaco.languages.CompletionItemKind.Class,
          detail: 'Tipo algebraico de datos (data)',
          insertText: m[1]
        });
      }

      return { suggestions };
    }
  });

  // --- SCHEME AUTOCOMPLETE ---
  monaco.languages.registerCompletionItemProvider('scheme', {
    triggerCharacters: ['(', ' ', '?'],
    provideCompletionItems: (model, position) => {
      const suggestions = [];

      const schemeKeywords = [
        { label: 'define-func', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Definir función', insertText: '(define (${1:nombre} ${2:argumentos})\n  ${3:cuerpo})' },
        { label: 'define-var', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Definir variable / enlace', insertText: '(define ${1:nombre} ${2:valor})' },
        { label: 'lambda', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Función anónima de primer orden', insertText: '(lambda (${1:args})\n  ${2:cuerpo})' },
        { label: 'let', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Enlace léxico local', insertText: '(let ((${1:var} ${2:val}))\n  ${3:cuerpo})' },
        { label: 'let*', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Enlace secuencial local', insertText: '(let* ((${1:var1} ${2:val1})\n        (${3:var2} ${4:val2}))\n  ${5:cuerpo})' },
        { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Expresión condicional if', insertText: '(if ${1:condicion}\n    ${2:consecuente}\n    ${3:alternativa})' },
        { label: 'cond', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Condicional multi-caso cond', insertText: '(cond\n  ((${1:test1}) ${2:expr1})\n  (else ${3:default}))' },
        { label: 'map', kind: monaco.languages.CompletionItemKind.Function, detail: 'Aplica función a lista', insertText: '(map ${1:proc} ${2:lista})' },
        { label: 'filter', kind: monaco.languages.CompletionItemKind.Function, detail: 'Filtra elementos por predicado', insertText: '(filter ${1:pred} ${2:lista})' },
        { label: 'fold', kind: monaco.languages.CompletionItemKind.Function, detail: 'Reducción de lista', insertText: '(fold ${1:proc} ${2:inicial} ${3:lista})' },
        { label: 'car', kind: monaco.languages.CompletionItemKind.Function, detail: 'Primer elemento de un par/lista', insertText: '(car ${1:lista})' },
        { label: 'cdr', kind: monaco.languages.CompletionItemKind.Function, detail: 'Resto de un par/lista', insertText: '(cdr ${1:lista})' },
        { label: 'cons', kind: monaco.languages.CompletionItemKind.Function, detail: 'Construye un par o añade cabeza a lista', insertText: '(cons ${1:cabeza} ${2:cola})' },
        { label: 'display', kind: monaco.languages.CompletionItemKind.Function, detail: 'Imprime a la salida estándar', insertText: '(display ${1:valor})' },
        { label: 'newline', kind: monaco.languages.CompletionItemKind.Function, detail: 'Salto de línea', insertText: '(newline)' },
        { label: 'null?', kind: monaco.languages.CompletionItemKind.Function, detail: 'Verifica si es lista vacía' },
        { label: 'pair?', kind: monaco.languages.CompletionItemKind.Function, detail: 'Verifica si es par' },
        { label: 'set!', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Mutación destructiva de variable (Efecto secundario / Impuro)', insertText: '(set! ${1:var} ${2:nuevo_valor})' }
      ];

      schemeKeywords.forEach(k => {
        suggestions.push({
          label: k.label,
          kind: k.kind,
          detail: k.detail,
          insertText: k.insertText || k.label,
          insertTextRules: k.insertText && k.insertText.includes('${') ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined
        });
      });

      // Scheme Algorithm Snippets
      suggestions.push({
        label: 'snippet:factorial-tail-rec',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Factorial con recursión de cola en Scheme (TCO)',
        insertText: [
          '(define (fact n)',
          '  (let loop ((count n) (acc 1))',
          '    (if (<= count 1)',
          '        acc',
          '        (loop (- count 1) (* acc count)))))',
          '',
          '(display (fact ${1:10}))',
          '(newline)'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      suggestions.push({
        label: 'snippet:closure-counter',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Clausura léxica generadora de estado en Scheme',
        insertText: [
          '(define (make-counter)',
          '  (let ((count 0))',
          '    (lambda ()',
          '      (set! count (+ count 1))',
          '      count)))',
          '',
          '(define c1 (make-counter))',
          '(display (c1)) (newline)',
          '(display (c1)) (newline)'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      // Extract defined names in current file
      const text = model.getValue();
      const fnMatches = text.matchAll(/\(define\s+\(([a-zA-Z0-9_!?-]+)/g);
      for (const m of fnMatches) {
        suggestions.push({
          label: m[1],
          kind: monaco.languages.CompletionItemKind.Function,
          detail: 'Función definida en este archivo Scheme',
          insertText: m[1]
        });
      }
      const varMatches = text.matchAll(/\(define\s+([a-zA-Z0-9_!?-]+)\s+[^(]/g);
      for (const m of varMatches) {
        suggestions.push({
          label: m[1],
          kind: monaco.languages.CompletionItemKind.Variable,
          detail: 'Variable definida en este archivo Scheme',
          insertText: m[1]
        });
      }

      return { suggestions };
    }
  });

  // --- HASKELL AUTOCOMPLETE ---
  monaco.languages.registerCompletionItemProvider('haskell', {
    triggerCharacters: [' ', ':', '-', '>', '['],
    provideCompletionItems: (model, position) => {
      const suggestions = [];

      const haskellKeywords = [
        { label: 'quicksort', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Algoritmo Quicksort puramente funcional', insertText: 'qsort :: Ord a => [a] -> [a]\nqsort [] = []\nqsort (x:xs) = qsort [y | y <- xs, y <= x] ++ [x] ++ qsort [y | y <- xs, y > x]' },
        { label: 'data', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Definir tipo de dato algebraico', insertText: 'data ${1:Tipo} = ${2:Constructor1} | ${3:Constructor2} deriving (${4:Show, Eq})' },
        { label: 'where', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Cláusula de vinculación where', insertText: 'where\n  ${1:aux} = ${2:expr}' },
        { label: 'let-in', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Expresión let ... in', insertText: 'let ${1:x} = ${2:valor}\nin ${3:cuerpo}' },
        { label: 'case-of', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Coincidencia de patrones case ... of', insertText: 'case ${1:expr} of\n  ${2:patron} -> ${3:resultado}\n  _ -> ${4:defecto}' },
        { label: 'if-then-else', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Expresión condicional', insertText: 'if ${1:condicion} then ${2:consecuente} else ${3:alternativa}' },
        { label: 'list-comp', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Comprensión de listas matemática', insertText: '[${1:x} * 2 | ${1:x} <- ${2:xs}, ${3:condicion}]' },
        { label: 'map', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.map :: (a -> b) -> [a] -> [b]' },
        { label: 'filter', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.filter :: (a -> Bool) -> [a] -> [a]' },
        { label: 'foldr', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.foldr :: (a -> b -> b) -> b -> [a] -> b' },
        { label: 'foldl', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.foldl :: (b -> a -> b) -> b -> [a] -> b' },
        { label: 'head', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.head :: [a] -> a' },
        { label: 'tail', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.tail :: [a] -> [a]' },
        { label: 'sum', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.sum :: Num a => [a] -> a' },
        { label: 'product', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.product :: Num a => [a] -> a' },
        { label: 'reverse', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.reverse :: [a] -> [a]' },
        { label: 'take', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.take :: Int -> [a] -> [a]' },
        { label: 'drop', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.drop :: Int -> [a] -> [a]' },
        { label: 'zip', kind: monaco.languages.CompletionItemKind.Function, detail: 'Prelude.zip :: [a] -> [b] -> [(a, b)]' },
        { label: 'putStrLn', kind: monaco.languages.CompletionItemKind.Function, detail: 'IO: Imprime línea en consola' }
      ];

      haskellKeywords.forEach(k => {
        suggestions.push({
          label: k.label,
          kind: k.kind,
          detail: k.detail,
          insertText: k.insertText || k.label,
          insertTextRules: k.insertText && k.insertText.includes('${') ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined
        });
      });

      // Snippet for full functional file
      suggestions.push({
        label: 'snippet:factorial-haskell',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Factorial puro con guardas y pattern matching en Haskell',
        insertText: [
          'factorial :: Integer -> Integer',
          'factorial 0 = 1',
          'factorial n | n > 0 = n * factorial (n - 1)',
          '',
          'main = print (factorial ${1:10})'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      // User functions from current Haskell buffer
      const text = model.getValue();
      const fnMatches = text.matchAll(/^([a-z][a-zA-Z0-9_']*)\s+::/gm);
      for (const m of fnMatches) {
        suggestions.push({
          label: m[1],
          kind: monaco.languages.CompletionItemKind.Function,
          detail: 'Función con signatura de tipo en este archivo',
          insertText: m[1]
        });
      }

      return { suggestions };
    }
  });
}

// ----------------------------------------------------------------------------
// Rich Hover Documentation Providers
// ----------------------------------------------------------------------------
function registerHoverProviders(monaco) {

  // --- HOPE HOVER ---
  monaco.languages.registerHoverProvider('hope', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const docs = {
        'dec': {
          title: '🟣 Hope — Declaración de Tipo (`dec`)',
          desc: '**Puro por diseño (1978/1980, Edimburgo)**.\nDeclara el nombre y la signatura de tipo estricta de una función.\n\n```hope\ndec nombre : tipo_origen -> tipo_destino;\n```'
        },
        'data': {
          title: '🟣 Hope — Tipo Algebraico de Datos (`data`)',
          desc: 'Hope fue el **primer lenguaje de la historia** en introducir constructores de tipos algebraicos y ecuaciones (`data tree alpha == emptytree ++ node(...)`). Base de ML y Haskell.'
        },
        'infix': {
          title: '🟣 Hope — Operador Infijo (`infix`)',
          desc: 'Define un operador infijo de usuario con su nivel de precedencia (1 a 9).\n\n```hope\ninfix ++ : 6;\n```'
        },
        'num': {
          title: '🟣 Hope — Tipo numérico (`num`)',
          desc: 'Tipo primitivo de números enteros y reales de coma flotante en Hope.'
        },
        'truval': {
          title: '🟣 Hope — Tipo booleano (`truval`)',
          desc: 'Valores booleanos: `true` y `false`. Del término "Truth Value".'
        },
        'nil': {
          title: '🟣 Hope — Lista vacía (`nil`)',
          desc: 'Constante que representa la lista vacía polimórfica en Hope.'
        }
      };

      if (docs[word.word]) {
        const item = docs[word.word];
        return {
          contents: [
            { value: `### ${item.title}` },
            { value: item.desc }
          ]
        };
      }
      return null;
    }
  });

  // --- SCHEME HOVER ---
  monaco.languages.registerHoverProvider('scheme', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const docs = {
        'define': {
          title: '🟢 Scheme — `(define ...)`',
          desc: 'Crea un enlace léxico en el entorno actual para una variable o una función.\n\n```scheme\n(define (cuadrado x) (* x x))\n```'
        },
        'lambda': {
          title: '🟢 Scheme — `(lambda ...)`',
          desc: 'Crea un procedimiento anónimo de primera clase con clausura léxica sobre las variables libres.'
        },
        'set!': {
          title: '⚠️ Scheme — Mutación Destructiva (`set!`)',
          desc: '**IMPUREZA FUNCIONAL**: Modifica destructivamente el valor ligado a una variable. Rompe la transparencia referencial pura.'
        },
        'car': {
          title: '🟢 Scheme — `(car pair)`',
          desc: 'Retorna el primer elemento (Contents of the Address part of Register) de un par o lista.'
        },
        'cdr': {
          title: '🟢 Scheme — `(cdr pair)`',
          desc: 'Retorna el segundo elemento o cola (Contents of the Decrement part of Register) de un par o lista.'
        },
        'cons': {
          title: '🟢 Scheme — `(cons a b)`',
          desc: 'Asigna y retorna un nuevo par con `a` como car y `b` como cdr.'
        },
        'map': {
          title: '🟢 Scheme — `(map proc list)`',
          desc: 'Función de orden superior que aplica un procedimiento a cada elemento de la lista y retorna una nueva lista.'
        }
      };

      if (docs[word.word]) {
        const item = docs[word.word];
        return {
          contents: [
            { value: `### ${item.title}` },
            { value: item.desc }
          ]
        };
      }
      return null;
    }
  });

  // --- HASKELL HOVER ---
  monaco.languages.registerHoverProvider('haskell', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const docs = {
        'where': {
          title: '🔵 Haskell — Cláusula `where`',
          desc: 'Define funciones y enlaces locales al final de una ecuación funcional. Las definiciones tienen alcance en las guardas de la ecuación.'
        },
        'data': {
          title: '🔵 Haskell — Tipo de Dato Algebraico (`data`)',
          desc: 'Define un nuevo tipo algebraico con constructores de valor. Permite tipado estático riguroso y coincidencia de patrones.'
        },
        'foldr': {
          title: '🔵 Haskell — `foldr :: (a -> b -> b) -> b -> [a] -> b`',
          desc: 'Pliegue funcional por la derecha. Esencial en programación funcional pura; consume listas perezosamente y preserva constructores.'
        },
        'map': {
          title: '🔵 Haskell — `map :: (a -> b) -> [a] -> [b]`',
          desc: 'Función pura que transforma cada elemento de una lista mediante una función dada. Sin efectos secundarios observables.'
        },
        'IO': {
          title: '🔵 Haskell — Mónada `IO a`',
          desc: '**Aislamiento de Impureza**: Haskell encapsula obligatoriamente todas las operaciones con efectos colaterales (I/O, mutabilidad) dentro de la mónada `IO` para preservar la pureza matemática.'
        }
      };

      if (docs[word.word]) {
        const item = docs[word.word];
        return {
          contents: [
            { value: `### ${item.title}` },
            { value: item.desc }
          ]
        };
      }
      return null;
    }
  });
}

// ----------------------------------------------------------------------------
// Automatic Document Formatters & Indentation Fixers
// ----------------------------------------------------------------------------
function registerDocumentFormatters(monaco) {

  // Formatter for Scheme (Lisp standard indentation)
  monaco.languages.registerDocumentFormattingEditProvider('scheme', {
    provideDocumentFormattingEdits: (model) => {
      const text = model.getValue();
      const formatted = formatSchemeCode(text);
      return [{
        range: model.getFullModelRange(),
        text: formatted
      }];
    }
  });

  // Formatter for Hope
  monaco.languages.registerDocumentFormattingEditProvider('hope', {
    provideDocumentFormattingEdits: (model) => {
      const text = model.getValue();
      const formatted = formatHopeCode(text);
      return [{
        range: model.getFullModelRange(),
        text: formatted
      }];
    }
  });

  // Formatter for Haskell
  monaco.languages.registerDocumentFormattingEditProvider('haskell', {
    provideDocumentFormattingEdits: (model) => {
      const text = model.getValue();
      const formatted = formatHaskellCode(text);
      return [{
        range: model.getFullModelRange(),
        text: formatted
      }];
    }
  });
}

// ----------------------------------------------------------------------------
// Formatting Implementations
// ----------------------------------------------------------------------------

// Smart Indenter for Scheme (Parentheses depth & 2-space Lisp layout)
function formatSchemeCode(code) {
  const lines = code.split('\n');
  let indentLevel = 0;
  const result = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) {
      result.push('');
      continue;
    }

    // Count open and close parens
    let openCount = 0;
    let closeCount = 0;
    let inString = false;

    // Check leading close parens on this line to dedent before printing
    let leadingCloses = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ')') leadingCloses++;
      else if (line[i] !== ' ' && line[i] !== '\t') break;
    }

    const currentIndent = Math.max(0, indentLevel - leadingCloses);
    const spaces = '  '.repeat(currentIndent);

    result.push(spaces + line);

    // Calculate delta for following lines
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) inString = !inString;
      if (!inString) {
        if (ch === ';') break; // Ignore comments
        if (ch === '(') openCount++;
        else if (ch === ')') closeCount++;
      }
    }

    indentLevel = Math.max(0, indentLevel + openCount - closeCount);
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// Smart Formatter for Hope (Align equations, 2-space indent, operator spacing)
function formatHopeCode(code) {
  const lines = code.split('\n');
  const result = [];
  let inEquationGroup = false;

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) {
      result.push('');
      inEquationGroup = false;
      continue;
    }

    // Normalizing spaces around operators
    line = line
      .replace(/\s*<=\s*/g, ' <= ')
      .replace(/\s*==\s*/g, ' == ')
      .replace(/\s*->\s*/g, ' -> ')
      .replace(/\s*::\s*/g, ' :: ')
      .replace(/\s*#\s*/g, ' # ')
      .replace(/\s*\+\+\s*/g, ' ++ ');

    if (line.startsWith('dec ') || line.startsWith('data ') || line.startsWith('type ') || line.startsWith('infix ')) {
      result.push(line);
      inEquationGroup = false;
    } else if (line.startsWith('---')) {
      // Equations get standard 2 spaces or flush alignment
      result.push('--- ' + line.substring(3).trim());
      inEquationGroup = true;
    } else if (inEquationGroup) {
      result.push('    ' + line);
    } else {
      result.push(line);
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// Smart Formatter for Haskell (2-space alignment, clean where blocks)
function formatHaskellCode(code) {
  const lines = code.split('\n');
  const result = [];
  let inWhere = false;

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) {
      result.push('');
      continue;
    }

    if (line.startsWith('where')) {
      result.push('  where');
      inWhere = true;
    } else if (inWhere && !line.includes('=') && !line.startsWith('module') && !line.startsWith('import')) {
      result.push('    ' + line);
    } else {
      inWhere = false;
      // Normal alignment
      result.push(line);
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ----------------------------------------------------------------------------
// 5. Intelligent Automatic Language Detector
// ----------------------------------------------------------------------------
function detectLanguageFromContent(content) {
  if (!content || !content.trim()) {
    return { language: 'plaintext', confidence: 0, reason: 'Texto vacío' };
  }

  let schemeScore = 0;
  let hopeScore = 0;
  let haskellScore = 0;

  const lines = content.split('\n');
  const text = content;

  // --- SCHEME INDICATORS ---
  // Count of parentheses
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  if (openParens >= 2 && Math.abs(openParens - closeParens) <= 2) {
    schemeScore += Math.min(35, openParens * 4);
  }

  if (/\(\s*define\b/.test(text)) schemeScore += 45;
  if (/\(\s*lambda\b/.test(text)) schemeScore += 40;
  if (/\(\s*let\*?\b/.test(text)) schemeScore += 30;
  if (/\(\s*cond\b/.test(text)) schemeScore += 25;
  if (/\(\s*(?:car|cdr|cons|display|newline|set!|call\/cc)\b/.test(text)) schemeScore += 30;
  if (/#t|#f/.test(text)) schemeScore += 25;
  if (/^\s*;.*$/m.test(text)) schemeScore += 15;

  // --- HOPE INDICATORS ---
  if (/\bdec\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:/m.test(text)) hopeScore += 55;
  if (/^---|\n---/m.test(text)) hopeScore += 50;
  if (/<=\s*[^=]/.test(text) && !/<=/.test(text.replace(/---.*<=/g, ''))) hopeScore += 25;
  if (/\bdata\s+[a-zA-Z_].*==/m.test(text)) hopeScore += 45;
  if (/\b(truval|emptytree|nil)\b/.test(text)) hopeScore += 30;
  if (/#\s*[a-zA-Z_]/.test(text)) hopeScore += 25;
  if (/^\s*!.*$/m.test(text)) hopeScore += 20;

  // --- HASKELL INDICATORS ---
  if (/::\s*[A-Z]/.test(text)) haskellScore += 45;
  if (/\bwhere\b/.test(text)) haskellScore += 30;
  if (/\bimport\s+[A-Z]/.test(text)) haskellScore += 40;
  if (/\bmodule\s+[A-Z]/.test(text)) haskellScore += 40;
  if (/\bderiving\s*\(/m.test(text)) haskellScore += 35;
  if (/\[\s*[a-zA-Z0-9_']+\s*\|\s*[a-zA-Z0-9_']+\s*<-/m.test(text)) haskellScore += 35; // List comprehension
  if (/^\s*--.*$/m.test(text)) haskellScore += 15;
  if (/data\s+[A-Z][a-zA-Z0-9_']*\s*=/.test(text)) haskellScore += 40;

  const total = schemeScore + hopeScore + haskellScore;
  if (total === 0) {
    return { language: 'plaintext', confidence: 0, reason: 'Sin patrones funcionales detectados' };
  }

  let bestLang = 'plaintext';
  let bestScore = 0;

  if (schemeScore > bestScore) {
    bestLang = 'scheme';
    bestScore = schemeScore;
  }
  if (hopeScore > bestScore) {
    bestLang = 'hope';
    bestScore = hopeScore;
  }
  if (haskellScore > bestScore) {
    bestLang = 'haskell';
    bestScore = haskellScore;
  }

  const confidence = Math.min(99, Math.round((bestScore / (total + 10)) * 100));

  return {
    language: bestLang,
    confidence: Math.max(50, confidence),
    scores: { scheme: schemeScore, hope: hopeScore, haskell: haskellScore }
  };
}
