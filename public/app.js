// ============================================================================
// TriFunc Studio IDE — Application Logic & Intelligence
// Features: Local Offline Monaco, Real-time Linter, Auto-Detection,
// Auto-Indentation & Format, Snippets, Draggable Resizer, Status Bar
// ============================================================================

let editor = null;
let activeTab = null;
let openTabs = []; // { path, name, language, isExample, model, dirty }
let replHistory = [];
let historyIndex = -1;
let autoDetectEnabled = true;
let lintDebounceTimer = null;

const LANG_CONFIG = {
  haskell: {
    name: 'Haskell',
    badgeClass: 'lang-hs',
    ext: '.hs',
    icon: 'fa-cube',
    purity: 'Puro',
    purityClass: 'purity-pure',
    purityDesc: '100% Funcional Puro'
  },
  scheme: {
    name: 'Scheme',
    badgeClass: 'lang-scm',
    ext: '.scm',
    icon: 'fa-brackets-curly',
    purity: 'Impuro',
    purityClass: 'purity-impure',
    purityDesc: 'Impuro (Funcional con Efectos / set!)'
  },
  hope: {
    name: 'Hope',
    badgeClass: 'lang-hop',
    ext: '.hop',
    icon: 'fa-wand-magic-sparkles',
    purity: 'Puro',
    purityClass: 'purity-pure',
    purityDesc: '100% Funcional Puro (1978/1980s)'
  }
};

// -------------------------------------------------------------
// 1. Initialize Monaco Editor (100% Local Offline Path)
// -------------------------------------------------------------
require.config({ paths: { vs: '/vendor/monaco/vs' } });

require(['vs/editor/editor.main'], function () {
  // Register languages, completions, hover and formatters
  registerCustomLanguages(monaco);

  // Define Custom Modern Themes
  monaco.editor.defineTheme('synthwave-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'fe4450', fontStyle: 'bold' },
      { token: 'keyword.equation', foreground: '36f9f6', fontStyle: 'bold' },
      { token: 'type', foreground: '72f1b8' },
      { token: 'string', foreground: 'fede5d' },
      { token: 'number', foreground: 'f97e72' },
      { token: 'comment', foreground: '848bbd', fontStyle: 'italic' },
      { token: 'operator', foreground: '36f9f6' }
    ],
    colors: {
      'editor.background': '#262335',
      'editor.foreground': '#ff7edb',
      'editorCursor.foreground': '#fe4450',
      'editor.lineHighlightBackground': '#2b2640'
    }
  });

  monaco.editor.defineTheme('monokai-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'f92672', fontStyle: 'bold' },
      { token: 'keyword.equation', foreground: '66d9ef', fontStyle: 'bold' },
      { token: 'type', foreground: '66d9ef' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'operator', foreground: 'f92672' }
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editorCursor.foreground': '#f8f8f0',
      'editor.lineHighlightBackground': '#3e3d32'
    }
  });

  monaco.editor.defineTheme('github-dark-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
      { token: 'type', foreground: '79c0ff' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: 'd2a8ff' },
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'operator', foreground: '79c0ff' }
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorCursor.foreground': '#58a6ff',
      'editor.lineHighlightBackground': '#161b22'
    }
  });

  // Theme 1: Mahou Shoujo Madoka Magica
  monaco.editor.defineTheme('madoka-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'f755a5', fontStyle: 'bold' },
      { token: 'keyword.equation', foreground: 'ffd56b', fontStyle: 'bold' },
      { token: 'type', foreground: 'c084fc' },
      { token: 'string', foreground: 'a8fbc5' },
      { token: 'number', foreground: '98e4ff' },
      { token: 'comment', foreground: '785675', fontStyle: 'italic' },
      { token: 'operator', foreground: 'ff3366' }
    ],
    colors: {
      'editor.background': '#180d1b',
      'editor.foreground': '#ffd3ec',
      'editorCursor.foreground': '#f755a5',
      'editor.lineHighlightBackground': '#221226'
    }
  });

  // Theme 2: Accel World (Burst Link)
  monaco.editor.defineTheme('accel-world-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c56cf0', fontStyle: 'bold' },
      { token: 'keyword.equation', foreground: '00f2fe', fontStyle: 'bold' },
      { token: 'type', foreground: '38bdf8' },
      { token: 'string', foreground: 'ffeaa7' },
      { token: 'number', foreground: '00ff87' },
      { token: 'comment', foreground: '486581', fontStyle: 'italic' },
      { token: 'operator', foreground: 'ff3838' }
    ],
    colors: {
      'editor.background': '#081119',
      'editor.foreground': '#dcf5ff',
      'editorCursor.foreground': '#00f2fe',
      'editor.lineHighlightBackground': '#0d1b26'
    }
  });

  // Theme 3: Tokyo Ghoul (Kakugan)
  monaco.editor.defineTheme('tokyo-ghoul-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff1744', fontStyle: 'bold' },
      { token: 'keyword.equation', foreground: 'ff9100', fontStyle: 'bold' },
      { token: 'type', foreground: 'b83b5e' },
      { token: 'string', foreground: 'cfd8dc' },
      { token: 'number', foreground: 'ff9100' },
      { token: 'comment', foreground: '5c5357', fontStyle: 'italic' },
      { token: 'operator', foreground: 'ff1744' }
    ],
    colors: {
      'editor.background': '#0a0a0c',
      'editor.foreground': '#f5f5f5',
      'editorCursor.foreground': '#ff1744',
      'editor.lineHighlightBackground': '#141418'
    }
  });

  // Create Editor instance
  editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    tabSize: 2,
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    formatOnPaste: true,
    formatOnType: true
  });

  // Track cursor position for Status Bar
  editor.onDidChangeCursorPosition(e => {
    const pos = e.position;
    document.getElementById('sb-cursor-pos').innerHTML = `<i class="fa-regular fa-compass"></i> Ln ${pos.lineNumber}, Col ${pos.column}`;
  });

  // Editor Commands
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCurrentCode);
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCurrentFile);
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, formatCurrentCode);

  initApp();
});

// -------------------------------------------------------------
// 2. Application Initialization
// -------------------------------------------------------------
async function initApp() {
  setupEventListeners();
  setupPanelResizer();
  loadSavedFontSettings();

  // Check if secret themes were previously unlocked
  if (localStorage.getItem('trifunc_secret_themes_unlocked') === 'true') {
    unlockSecretThemes();
  }

  // Restore saved theme if any
  const savedTheme = localStorage.getItem('trifunc_active_theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  await loadFiles();

  // Open default main file
  if (openTabs.length === 0) {
    await openFile('main.hop');
  }
}

// -------------------------------------------------------------
// 3. Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
  // Toolbar Buttons
  document.getElementById('btn-run').addEventListener('click', runCurrentCode);
  document.getElementById('btn-format').addEventListener('click', formatCurrentCode);
  document.getElementById('btn-save').addEventListener('click', saveCurrentFile);
  document.getElementById('btn-new-file').addEventListener('click', showNewFileModal);
  document.getElementById('btn-sidebar-new').addEventListener('click', showNewFileModal);
  document.getElementById('btn-refresh-files').addEventListener('click', loadFiles);
  document.getElementById('btn-clear-console').addEventListener('click', clearConsole);
  document.getElementById('btn-copy-output').addEventListener('click', copyConsoleOutput);

  // Global document shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCurrentCode();
    }
    if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      formatCurrentCode();
    }
  });

  // Snippets Dropdown
  const btnSnippets = document.getElementById('btn-snippets');
  const snippetsDropdown = document.getElementById('snippets-dropdown');
  const btnFontSettings = document.getElementById('btn-font-settings');
  const fontSettingsDropdown = document.getElementById('font-settings-dropdown');

  btnSnippets.addEventListener('click', (e) => {
    e.stopPropagation();
    fontSettingsDropdown.classList.remove('show');
    snippetsDropdown.classList.toggle('show');
  });

  // Font Settings Dropdown
  btnFontSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    snippetsDropdown.classList.remove('show');
    fontSettingsDropdown.classList.toggle('show');
  });

  fontSettingsDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    snippetsDropdown.classList.remove('show');
    fontSettingsDropdown.classList.remove('show');
  });

  document.querySelectorAll('.dropdown-item[data-snippet]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      snippetsDropdown.classList.remove('show');
      insertAlgorithmSnippet(item.getAttribute('data-snippet'));
    });
  });

  // Font Size Controls
  const fontSizeSlider = document.getElementById('font-size-slider');
  fontSizeSlider.addEventListener('input', (e) => {
    applyFontSize(parseInt(e.target.value, 10));
  });

  document.getElementById('btn-font-dec').addEventListener('click', () => {
    const current = parseInt(fontSizeSlider.value, 10) || 14;
    applyFontSize(Math.max(10, current - 1));
  });

  document.getElementById('btn-font-inc').addEventListener('click', () => {
    const current = parseInt(fontSizeSlider.value, 10) || 14;
    applyFontSize(Math.min(28, current + 1));
  });

  // Font Color Controls
  const fontColorPicker = document.getElementById('font-color-picker');
  fontColorPicker.addEventListener('input', (e) => {
    applyFontColor(e.target.value);
  });

  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.getAttribute('data-color');
      applyFontColor(color);
    });
  });

  document.getElementById('btn-font-reset').addEventListener('click', () => {
    applyFontSize(14);
    applyFontColor(null);
    showToast('✔ Tamaño y color de fuente restablecidos');
  });

  // Sidebar navigation tabs
  document.getElementById('tab-btn-files').addEventListener('click', () => switchSidebarTab('files'));
  document.getElementById('tab-btn-examples').addEventListener('click', () => switchSidebarTab('examples'));
  document.getElementById('tab-btn-docs').addEventListener('click', () => switchSidebarTab('docs'));

  // Examples Search Filter
  document.getElementById('examples-search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.example-item').forEach(item => {
      const match = item.textContent.toLowerCase().includes(query);
      item.style.display = match ? 'block' : 'none';
    });
  });

  // Bottom panel tabs
  document.getElementById('ptab-output').addEventListener('click', () => switchBottomTab('output'));
  document.getElementById('ptab-canvas').addEventListener('click', () => switchBottomTab('canvas'));
  document.getElementById('ptab-repl').addEventListener('click', () => switchBottomTab('repl'));
  document.getElementById('ptab-trace').addEventListener('click', () => switchBottomTab('trace'));
  document.getElementById('ptab-diagnostics').addEventListener('click', () => switchBottomTab('diagnostics'));

  // Floating Program Window & Canvas Modal
  const modalProgWin = document.getElementById('modal-program-window');
  const closeProgWin = () => { if (modalProgWin) modalProgWin.style.display = 'none'; };
  const btnCloseProgWin = document.getElementById('btn-close-program-window');
  const btnOkProgWin = document.getElementById('btn-ok-program-window');
  const btnOpenFloating = document.getElementById('btn-open-floating-window');

  if (btnCloseProgWin) btnCloseProgWin.addEventListener('click', closeProgWin);
  if (btnOkProgWin) btnOkProgWin.addEventListener('click', closeProgWin);
  if (modalProgWin) {
    modalProgWin.addEventListener('click', (e) => {
      if (e.target === modalProgWin) closeProgWin();
    });
  }
  if (btnOpenFloating) {
    btnOpenFloating.addEventListener('click', () => {
      openFloatingProgramWindow({
        title: `Lienzo Gráfico — ${activeTab ? activeTab.name : 'TriFunc'}`,
        message: 'Vista en ventana emergente del lienzo 2D actual.'
      }, true);
    });
  }

  // Editor Live Alert Banner buttons
  const btnAlertGoto = document.getElementById('btn-alert-goto');
  const btnAlertAll = document.getElementById('btn-alert-all');
  const btnAlertFix = document.getElementById('btn-alert-quickfix');

  if (btnAlertGoto) {
    btnAlertGoto.addEventListener('click', () => {
      if (currentPrimaryError && editor) {
        editor.revealLineInCenter(currentPrimaryError.line || 1);
        editor.setPosition({ lineNumber: currentPrimaryError.line || 1, column: currentPrimaryError.col || 1 });
        editor.focus();
      }
    });
  }
  if (btnAlertAll) {
    btnAlertAll.addEventListener('click', () => switchBottomTab('diagnostics'));
  }
  if (btnAlertFix) {
    btnAlertFix.addEventListener('click', () => {
      if (currentPrimaryError && currentPrimaryError.suggestion) {
        applyQuickFix(currentPrimaryError);
      }
    });
  }

  // Encoded Vector Glyph Buffers (Disguised Internal Assets)
  const _SYS_GFX_CACHE = {
    madoka: {
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9InNtZyIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIzMCUiIHN0b3AtY29sb3I9IiNmZjgwYmYiLz48c3RvcCBvZmZzZXQ9IjgwJSIgc3RvcC1jb2xvcj0iI2Y3NTVhNSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzNkMGMyNiIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik01MCA4IFE2NSAzMCA2NSA1OCBRNjUgODIgNTAgOTIgUTM1IDgyIDM1IDU4IFEzNSAzMCA1MCA4IFoiIGZpbGw9InVybCgjc21nKSIgc3Ryb2tlPSIjZmZkNTZiIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjU1IiByPSIxNCIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4zIi8+PHBvbHlnb24gcG9pbnRzPSI1MCwxNSA1NCwyNiA2NSwyNiA1NiwzMyA1OSw0NCA1MCwzOCA0MSw0NCA0NCwzMyAzNSwyNiA0NiwyNiIgZmlsbD0iI2ZmZDU2YiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iOTIiIHI9IjQiIGZpbGw9IiNmZmQ1NmIiLz48L3N2Zz4=',
      amb: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9Im1jZyIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjc1NWE1IiBzdG9wLW9wYWNpdHk9IjAuOCIvPjxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjYzA4NGZjIiBzdG9wLW9wYWNpdHk9IjAuNCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwIi8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI5MiIgc3Ryb2tlPSIjZjc1NWE1IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1kYXNoYXJyYXk9IjQsNiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iODIiIHN0cm9rZT0iI2ZmZDU2YiIgc3Ryb2tlLXdpZHRoPSIxLjUiIGZpbGw9InVybCgjbWNnKSIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iNjQiIHN0cm9rZT0iI2Y3NTVhNSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHBvbHlnb24gcG9pbnRzPSIxMDAsMzYgMTU1LDEzMiA0NSwxMzIiIHN0cm9rZT0iI2ZmZDU2YiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHBvbHlnb24gcG9pbnRzPSIxMDAsMTY0IDE1NSw2OCA0NSw2OCIgc3Ryb2tlPSIjZmZkNTZiIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjI4IiBzdHJva2U9IiNmNzU1YTUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzI0MTIyOCIgb3BhY2l0eT0iMC44Ii8+PHBhdGggZD0iTTEwMCA4MCBRMTEyIDEwMCAxMDAgMTIwIFE4OCAxMDAgMTAwIDgwIFoiIGZpbGw9IiNmNzU1YTUiLz48L3N2Zz4=',
      btnText: 'Invocar',
      btnIcon: 'fa-wand-magic-sparkles',
      subTitle: 'Puella Magi Edition · Nhyix',
      engineText: '<i class="fa-solid fa-gem text-pink"></i> Contrato Mágico: Activo',
      tabOutput: '<i class="fa-solid fa-scroll"></i> <span>Pergamino Mágico</span>',
      tabRepl: '<i class="fa-solid fa-star"></i> <span>Oráculo REPL</span>',
      tabTrace: '<i class="fa-solid fa-infinity"></i> <span>Bucle Temporal</span>',
      prompt: '✧ (madoka)> '
    },
    'accel-world': {
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImF3Z2wiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMGYyZmUiLz48c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iIzAwZmY4NyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2M1NmNmMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwb2x5Z29uIHBvaW50cz0iNTAsNiA4OCwyOCA4OCw3MiA1MCw5NCAxMiw3MiAxMiwyOCIgc3Ryb2tlPSJ1cmwoI2F3Z2wpIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9IiMwNDA5MGUiLz48cG9seWdvbiBwb2ludHM9IjUwLDE4IDc4LDM0IDc4LDY2IDUwLDgyIDIyLDY2IDIyLDM0IiBzdHJva2U9IiMwMGYyZmUiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjYiLz48cGF0aCBkPSJNNTAgMjQgTDI4IDQ4IEwzNiA2OCBMNTAgNTYgTDY0IDY4IEw3MiA0OCBaIiBmaWxsPSJ1cmwoI2F3Z2wpIi8+PHBvbHlsaW5lIHBvaW50cz0iMzIsNTIgNTAsMzYgNjgsNTIiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
      amb: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImF3YW1iIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDBmMmZlIiBzdG9wLW9wYWNpdHk9IjAuOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2M1NmNmMCIgc3RvcC1vcGFjaXR5PSIwLjIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48ZyBzdHJva2U9IiMwMGYyZmUiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjYiPjxwb2x5Z29uIHBvaW50cz0iMTAwLDEwIDE3OCw1NSAxNzgsMTQ1IDEwMCwxOTAgMjIsMTQ1IDIyLDU1Ii8+PHBvbHlnb24gcG9pbnRzPSIxMDAsMzAgMTYwLDY1IDE2MCwxMzUgMTAwLDE3MCA0MCwxMzUgNDAsNjUiLz48bGluZSB4MT0iMTAwIiB5MT0iMTAiIHgyPSIxMDAiIHkyPSIxOTAiLz48bGluZSB4MT0iMjIiIHkxPSI1NSIgeDI9IjE3OCIgeTI9IjE0NSIvPjxsaW5lIHgxPSIyMiIgeTE9IjE0NSIgeDI9IjE3OCIgeTI9IjU1Ii8+PC9nPjxwYXRoIGQ9Ik0xMDAgNDUgTDUwIDk1IEw3MCAxNDUgTDEwMCAxMjAgTDEzMCAxNDUgTDE1MCA5NSBaIiBmaWxsPSJ1cmwoI2F3YW1iKSIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTgiIGZpbGw9IiMwMGZmODciIG9wYWNpdHk9IjAuNCIvPjx0ZXh0IHg9IjEwMCIgeT0iMTYwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDBmMmZlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMyIgZm9udC13ZWlnaHQ9ImJvbGQiPkJVUlNUIExJTks8L3RleHQ+PC9zdmc+',
      btnText: 'Burst Link',
      btnIcon: 'fa-bolt-lightning',
      subTitle: 'Burst Link OS · Nhyix',
      engineText: '<i class="fa-solid fa-gauge-high text-cyan"></i> Aceleración: 1000x',
      tabOutput: '<i class="fa-solid fa-display"></i> <span>HUD Neural</span>',
      tabRepl: '<i class="fa-solid fa-network-wired"></i> <span>Enlace Directo</span>',
      tabTrace: '<i class="fa-solid fa-forward-fast"></i> <span>Traza Acelerada</span>',
      prompt: '⚡ [burst-link]> '
    },
    'tokyo-ghoul': {
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9InRnZXllIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjM1JSIgc3RvcC1jb2xvcj0iI2ZmMTc0NCIvPjxzdG9wIG9mZnNldD0iNzUlIiBzdG9wLWNvbG9yPSIjYjgwMDFmIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGEwYTBjIi8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTAiIHJ4PSI0NiIgcnk9IjM0IiBmaWxsPSIjMGEwYTBjIiBzdHJva2U9IiNmZjE3NDQiIHN0cm9rZS13aWR0aD0iMyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjIyIiBmaWxsPSJ1cmwoI3RnZXllKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjgiIGZpbGw9IiMwMDAwMDAiLz48cGF0aCBkPSJNNTAgMjggTDUwIDE0IE01MCA3MiBMNTAgODYgTTI4IDUwIEwxNCA1MCBNNzIgNTAgTDg2IDUwIE0zNCAzNCBMMjIgMjIgTTY2IDY2IEw3OCA3OCBNMzQgNjYgTDIyIDc4IE02NiAzNCBMNzggMjIiIHN0cm9rZT0iI2ZmMTc0NCIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48cGF0aCBkPSJNNTAgMjggUTQyIDQwIDUwIDUwIFE1OCA2MCA1MCA3MiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEuMiIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC42Ii8+PC9zdmc+',
      amb: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImtnZ3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmMTc0NCIgc3RvcC1vcGFjaXR5PSIwLjkiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0YTAwMGQiIHN0b3Atb3BhY2l0eT0iMC4xIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGcgc3Ryb2tlPSIjZmYxNzQ0IiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyI+PHBhdGggZD0iTTIwIDE4MCBRNjAgMTIwIDEwMCAxMDAgUTE0MCA4MCAxODAgMjAiIHN0cm9rZS13aWR0aD0iNCIvPjxwYXRoIGQ9Ik0yMCAxODAgUTgwIDE2MCAxMDAgMTAwIFExMjAgNDAgMTgwIDIwIiBzdHJva2Utd2lkdGg9IjIuNSIvPjxwYXRoIGQ9Ik0xODAgMTgwIFExNDAgMTIwIDEwMCAxMDAgUTYwIDgwIDIwIDIwIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNMTgwIDE4MCBRMTIwIDE2MCAxMDAgMTAwIFE4MCA0MCAyMCAyMCIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48L2c+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI0MiIgZmlsbD0iIzA2MDYwOCIgc3Ryb2tlPSIjZmYxNzQ0IiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjI0IiBmaWxsPSJ1cmwoI2tnZ3JhZCkiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjkiIGZpbGw9IiMwMDAwMDAiLz48dGV4dCB4PSIxMDAiIHk9IjE2NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMCIgZmlsbD0iI2ZmMTc0NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiIGZvbnQtd2VpZ2h0PSJib2xkIj5LQUtVR0FOIC8vIFJDIDM4NTA8L3RleHQ+PC9zdmc+',
      btnText: 'Devorar',
      btnIcon: 'fa-eye',
      subTitle: 'Anteiku Terminal · Nhyix',
      engineText: '<i class="fa-solid fa-skull text-red"></i> Células RC: 3,850',
      tabOutput: '<i class="fa-solid fa-book-skull"></i> <span>Reporte CCG</span>',
      tabRepl: '<i class="fa-solid fa-eye"></i> <span>Diálogo Ghoul</span>',
      tabTrace: '<i class="fa-solid fa-dna"></i> <span>Evolución RC</span>',
      prompt: '🩸 [anteiku]> '
    }
  };

  // Dynamic Theme Switcher with Anime Editions Support
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') monaco.editor.setTheme('vs-dark');
    else if (theme === 'light') monaco.editor.setTheme('vs');
    else if (theme === 'synthwave') monaco.editor.setTheme('synthwave-theme');
    else if (theme === 'monokai') monaco.editor.setTheme('monokai-theme');
    else if (theme === 'github-dark') monaco.editor.setTheme('github-dark-theme');
    else if (theme === 'madoka') monaco.editor.setTheme('madoka-theme');
    else if (theme === 'accel-world') monaco.editor.setTheme('accel-world-theme');
    else if (theme === 'tokyo-ghoul') monaco.editor.setTheme('tokyo-ghoul-theme');

    const pack = _SYS_GFX_CACHE[theme];
    const logoEl = document.getElementById('logo-icon-btn');
    const subTitleEl = document.querySelector('.logo-subtitle');
    const btnRun = document.getElementById('btn-run');
    const engineStatus = document.getElementById('sb-engine-status');
    const tabOut = document.getElementById('ptab-output');
    const tabRepl = document.getElementById('ptab-repl');
    const tabTrace = document.getElementById('ptab-trace');
    const replPrompt = document.getElementById('repl-prompt');
    const ambientEl = document.getElementById('editor-theme-ambient');

    if (pack) {
      if (logoEl) logoEl.innerHTML = `<img src="${pack.logo}" class="logo-theme-img" alt="logo" />`;
      if (subTitleEl) subTitleEl.innerHTML = `${pack.subTitle} <span class="logo-author-tag">by Nhyix</span>`;
      if (btnRun) btnRun.innerHTML = `<i class="fa-solid ${pack.btnIcon}"></i> <span>${pack.btnText}</span>`;
      if (engineStatus) engineStatus.innerHTML = pack.engineText;
      if (tabOut) tabOut.innerHTML = pack.tabOutput;
      if (tabRepl) tabRepl.innerHTML = pack.tabRepl;
      if (tabTrace) tabTrace.innerHTML = pack.tabTrace;
      if (replPrompt) replPrompt.textContent = pack.prompt;
      if (ambientEl) {
        ambientEl.style.display = 'block';
        ambientEl.style.backgroundImage = `url("${pack.amb}")`;
      }
    } else {
      // Revert to standard IDE layout
      if (logoEl) logoEl.innerHTML = 'λ';
      if (subTitleEl) subTitleEl.innerHTML = 'IDE Funcional <span class="logo-author-tag">by Nhyix</span>';
      if (btnRun) btnRun.innerHTML = '<i class="fa-solid fa-play"></i> <span>Ejecutar</span>';
      if (engineStatus) engineStatus.innerHTML = '<i class="fa-solid fa-circle-nodes text-green"></i> Motor Listo';
      if (tabOut) tabOut.innerHTML = '<i class="fa-solid fa-terminal"></i> <span>Salida / Consola</span>';
      if (tabRepl) tabRepl.innerHTML = '<i class="fa-solid fa-comment-dots"></i> <span>REPL Interactivo</span>';
      if (tabTrace) tabTrace.innerHTML = '<i class="fa-solid fa-route"></i> <span>Reducciones (Traza)</span>';
      const lang = activeTab ? activeTab.language : 'hope';
      if (replPrompt) replPrompt.textContent = `λ (${lang})> `;
      if (ambientEl) ambientEl.style.display = 'none';
    }

    const sel = document.getElementById('theme-select');
    if (sel && sel.value !== theme) sel.value = theme;
    try { localStorage.setItem('trifunc_active_theme', theme); } catch (e) {}
  }
  window.applyTheme = applyTheme;

  function unlockSecretThemes() {
    const sel = document.getElementById('theme-select');
    if (sel && !document.getElementById('opt-theme-madoka')) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = '✦ Edición Anime (Desbloqueados)';
      optGroup.id = 'opt-group-secret';

      const optMadoka = document.createElement('option');
      optMadoka.id = 'opt-theme-madoka';
      optMadoka.value = 'madoka';
      optMadoka.textContent = '🌸 Madoka Magica (Soul Gem)';
      optGroup.appendChild(optMadoka);

      const optAccel = document.createElement('option');
      optAccel.id = 'opt-theme-accel';
      optAccel.value = 'accel-world';
      optAccel.textContent = '⚡ Accel World (Burst Link)';
      optGroup.appendChild(optAccel);

      const optGhoul = document.createElement('option');
      optGhoul.id = 'opt-theme-ghoul';
      optGhoul.value = 'tokyo-ghoul';
      optGhoul.textContent = '🩸 Tokyo Ghoul (Kakugan)';
      optGroup.appendChild(optGhoul);

      sel.appendChild(optGroup);
    }
    try {
      localStorage.setItem('trifunc_secret_themes_unlocked', 'true');
    } catch (e) {}
  }
  window.unlockSecretThemes = unlockSecretThemes;

  // Theme switch listener
  document.getElementById('theme-select').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Language switch from Status Bar
  document.getElementById('sb-lang-select').addEventListener('change', (e) => {
    if (!activeTab) return;
    setTabLanguage(activeTab, e.target.value);
  });

  // Auto-detect toggle
  const autoDetectBtn = document.getElementById('sb-autodetect-toggle');
  autoDetectBtn.addEventListener('click', () => {
    autoDetectEnabled = !autoDetectEnabled;
    autoDetectBtn.classList.toggle('active', autoDetectEnabled);
    autoDetectBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Auto-detect: ${autoDetectEnabled ? 'ON' : 'OFF'}`;
    showToast(`Detección automática: ${autoDetectEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
    if (autoDetectEnabled) runLanguageAutoDetect();
  });

  // Modal events
  const modalNew = document.getElementById('modal-new-file');
  document.getElementById('btn-cancel-modal').addEventListener('click', () => modalNew.style.display = 'none');
  document.getElementById('btn-confirm-modal').addEventListener('click', createNewFile);
  document.getElementById('new-file-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewFile();
    if (e.key === 'Escape') modalNew.style.display = 'none';
  });

  // Help Modal
  const modalHelp = document.getElementById('modal-help');
  document.getElementById('btn-help-modal').addEventListener('click', () => modalHelp.style.display = 'flex');
  document.getElementById('btn-close-help').addEventListener('click', () => modalHelp.style.display = 'none');
  modalHelp.addEventListener('click', (e) => {
    if (e.target === modalHelp) modalHelp.style.display = 'none';
  });

  // Secret Protocol 7620859 & Anime Themes Unlocker Modal
  const modalEasterEgg = document.getElementById('modal-easter-egg');
  const openEasterEgg = () => {
    unlockSecretThemes();
    if (modalEasterEgg) {
      modalEasterEgg.style.display = 'flex';
      document.querySelectorAll('.secret-theme-card').forEach(card => {
        const theme = card.getAttribute('data-theme-apply');
        const iconEl = card.querySelector('.st-icon');
        if (iconEl && _SYS_GFX_CACHE[theme]) {
          iconEl.innerHTML = `<img src="${_SYS_GFX_CACHE[theme].logo}" class="st-icon-preview" alt="glyph" />`;
        }
      });
    }
    showToast('✨ ¡3 Temas Secretos Desbloqueados: Madoka Magica, Accel World y Tokyo Ghoul!', 'success');
  };
  const closeEasterEgg = () => {
    if (modalEasterEgg) modalEasterEgg.style.display = 'none';
  };
  window.triggerEasterEgg = openEasterEgg;

  const btnCloseEasterEgg = document.getElementById('btn-close-easter-egg');
  if (btnCloseEasterEgg) btnCloseEasterEgg.addEventListener('click', closeEasterEgg);
  const btnAckEasterEgg = document.getElementById('btn-confirm-easter-egg');
  if (btnAckEasterEgg) btnAckEasterEgg.addEventListener('click', closeEasterEgg);
  if (modalEasterEgg) {
    modalEasterEgg.addEventListener('click', (e) => {
      if (e.target === modalEasterEgg) closeEasterEgg();
    });
  }

  // Wire up secret theme card click-to-apply buttons
  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const theme = btn.getAttribute('data-theme-btn');
      applyTheme(theme);
      showToast(`Tema activado: ${theme}`, 'success');
      closeEasterEgg();
    });
  });
  document.querySelectorAll('.secret-theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const theme = card.getAttribute('data-theme-apply');
      if (theme) {
        applyTheme(theme);
        showToast(`Tema activado: ${theme}`, 'success');
        closeEasterEgg();
      }
    });
  });

  // Footer Author Badge click triggers Easter Egg ONLY if code was entered in console
  const sbAuthorBadge = document.getElementById('sb-author-badge');
  if (sbAuthorBadge) {
    sbAuthorBadge.addEventListener('click', () => {
      const codeWasEntered = localStorage.getItem('trifunc_console_code_entered') === 'true';
      if (codeWasEntered) {
        openEasterEgg();
      } else {
        showToast('TriFunc Studio v2.0 • Diseñado por Nhyix');
      }
    });
  }

  // REPL input
  const replInput = document.getElementById('repl-input');
  replInput.addEventListener('keydown', handleReplKey);
}

// -------------------------------------------------------------
// 4. Draggable Bottom Panel Resizer
// -------------------------------------------------------------
function setupPanelResizer() {
  const resizer = document.getElementById('panel-resizer');
  const panel = document.getElementById('bottom-panel');
  let isDragging = false;

  resizer.addEventListener('mousedown', (e) => {
    isDragging = true;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerHeight = document.querySelector('.workspace-area').clientHeight;
    const containerTop = document.querySelector('.workspace-area').getBoundingClientRect().top;
    const newHeight = containerHeight - (e.clientY - containerTop);
    if (newHeight >= 100 && newHeight <= containerHeight * 0.8) {
      panel.style.height = `${newHeight}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = 'default';
      if (editor) editor.layout();
    }
  });
}

// -------------------------------------------------------------
// 5. File Management & Tabs
// -------------------------------------------------------------
async function loadFiles() {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    renderWorkspaceFiles(data.workspace || []);
    renderExampleFiles(data.examples || []);
  } catch (err) {
    console.error('Error cargando archivos:', err);
  }
}

function renderWorkspaceFiles(files) {
  const container = document.getElementById('workspace-file-list');
  container.innerHTML = '';

  files.forEach(f => {
    const li = document.createElement('li');
    li.className = 'file-item';
    if (activeTab && activeTab.path === f.path) li.classList.add('active');

    const icon = f.language === 'haskell' ? 'fa-cube text-hs' : f.language === 'scheme' ? 'fa-brackets-curly text-scm' : 'fa-wand-magic-sparkles text-hop';
    li.innerHTML = `
      <div class="file-item-info">
        <i class="fa-solid ${icon}"></i>
        <span>${f.name}</span>
      </div>
      <button class="file-item-del" title="Eliminar archivo"><i class="fa-solid fa-trash"></i></button>
    `;

    li.querySelector('.file-item-info').addEventListener('click', () => openFile(f.path));
    li.querySelector('.file-item-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFile(f.path);
    });

    container.appendChild(li);
  });
}

function renderExampleFiles(categories) {
  const hsDiv = document.getElementById('examples-haskell');
  const scmDiv = document.getElementById('examples-scheme');
  const hopDiv = document.getElementById('examples-hope');
  hsDiv.innerHTML = ''; scmDiv.innerHTML = ''; hopDiv.innerHTML = '';

  categories.forEach(cat => {
    let target = null;
    if (cat.name === 'haskell') target = hsDiv;
    else if (cat.name === 'scheme') target = scmDiv;
    else if (cat.name === 'hope') target = hopDiv;

    if (target && cat.children) {
      cat.children.forEach(item => {
        const div = document.createElement('div');
        div.className = 'example-item';
        div.textContent = item.name;
        div.addEventListener('click', () => openFile(item.path, true));
        target.appendChild(div);
      });
    }
  });
}

function detectLanguageFromPath(filePath) {
  if (filePath.endsWith('.hs')) return 'haskell';
  if (filePath.endsWith('.scm') || filePath.endsWith('.ss')) return 'scheme';
  if (filePath.endsWith('.hop') || filePath.endsWith('.hope')) return 'hope';
  return 'hope'; // default to pure Hope
}

async function openFile(relPath, isExample = false) {
  let tab = openTabs.find(t => t.path === relPath && t.isExample === isExample);
  if (!tab) {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(relPath)}&isExample=${isExample}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const lang = detectLanguageFromPath(relPath);
      const model = monaco.editor.createModel(data.content, lang);

      tab = {
        path: relPath,
        name: relPath.split('/').pop(),
        language: lang,
        isExample,
        model,
        dirty: false
      };

      model.onDidChangeContent(() => {
        if (!tab.dirty) {
          tab.dirty = true;
          renderTabs();
        }
        triggerRealtimeLinting();
        if (autoDetectEnabled) runLanguageAutoDetect();
      });

      openTabs.push(tab);
    } catch (err) {
      alert('Error abriendo archivo: ' + err.message);
      return;
    }
  }

  setActiveTab(tab);
}

function setActiveTab(tab) {
  activeTab = tab;
  editor.setModel(tab.model);
  renderTabs();
  updateUIForActiveTab();
  triggerRealtimeLinting();
}

function renderTabs() {
  const tabsBar = document.getElementById('tabs-bar');
  tabsBar.innerHTML = '';

  openTabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = 'editor-tab';
    if (activeTab === tab) tabEl.classList.add('active');

    const iconClass = tab.language === 'haskell' ? 'fa-cube text-hs' : tab.language === 'scheme' ? 'fa-brackets-curly text-scm' : 'fa-wand-magic-sparkles text-hop';

    tabEl.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${tab.name}</span>
      ${tab.dirty ? '<span class="dirty-indicator"></span>' : ''}
      <button class="tab-close" title="Cerrar"><i class="fa-solid fa-xmark"></i></button>
    `;

    tabEl.addEventListener('click', () => setActiveTab(tab));
    tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab);
    });

    tabsBar.appendChild(tabEl);
  });
}

function closeTab(tab) {
  const idx = openTabs.indexOf(tab);
  if (idx !== -1) {
    openTabs.splice(idx, 1);
    if (activeTab === tab) {
      if (openTabs.length > 0) {
        setActiveTab(openTabs[Math.max(0, idx - 1)]);
      } else {
        activeTab = null;
        editor.setModel(null);
        renderTabs();
        updateUIForActiveTab();
      }
    } else {
      renderTabs();
    }
  }
}

function updateUIForActiveTab() {
  if (!activeTab) {
    document.getElementById('breadcrumb-filename').textContent = 'Ninguno';
    document.getElementById('active-lang-badge').textContent = 'Ninguno';
    return;
  }

  const lang = activeTab.language;
  const conf = LANG_CONFIG[lang] || { name: lang, badgeClass: 'lang-hop' };

  // Update Breadcrumbs
  document.getElementById('breadcrumb-workspace').textContent = activeTab.isExample ? 'examples' : 'workspace';
  document.getElementById('breadcrumb-filename').textContent = activeTab.name;
  document.getElementById('breadcrumb-lang-detected').textContent = conf.name;

  // Update Header Badges
  const badge = document.getElementById('active-lang-badge');
  badge.textContent = conf.name;
  badge.className = `lang-badge ${conf.badgeClass}`;

  // Update Status Bar Lang Select
  document.getElementById('sb-lang-select').value = lang;

  updateReplPrompt();
  runLanguageAutoDetect();
}

function setTabLanguage(tab, lang) {
  if (!tab || tab.language === lang) return;
  tab.language = lang;
  monaco.editor.setModelLanguage(tab.model, lang);
  updateUIForActiveTab();
  renderTabs();
  triggerRealtimeLinting();
  showToast(`Lenguaje cambiado a ${LANG_CONFIG[lang].name}`);
}

// -------------------------------------------------------------
// 6. Intelligent Automatic Language Detection
// -------------------------------------------------------------
function runLanguageAutoDetect() {
  if (!activeTab || !editor) return;
  const content = editor.getValue();
  const detection = detectLanguageFromContent(content);

  const autoPill = document.getElementById('auto-detect-pill');
  const autoText = document.getElementById('auto-detect-text');

  if (detection.language !== 'plaintext' && detection.confidence > 50) {
    const langName = LANG_CONFIG[detection.language] ? LANG_CONFIG[detection.language].name : detection.language;
    autoText.textContent = `Auto: ${langName} (${detection.confidence}%)`;
    autoPill.style.display = 'flex';

    // Auto-switch language if auto-detect enabled and high confidence
    if (autoDetectEnabled && detection.confidence >= 65 && activeTab.language !== detection.language) {
      // Only auto-switch if extension is ambiguous or untyped, or content strongly indicates it
      setTabLanguage(activeTab, detection.language);
    }
  } else {
    autoPill.style.display = 'none';
  }
}

// -------------------------------------------------------------
// 7. Real-Time Syntax Validation, Typo Detection & Quick-Fix
// -------------------------------------------------------------
let currentPrimaryError = null;
let lastRenderedGraphics = [];

function triggerRealtimeLinting() {
  clearTimeout(lintDebounceTimer);
  lintDebounceTimer = setTimeout(runLinting, 280);
}

async function runLinting() {
  if (!activeTab || !editor) return;

  const code = editor.getValue();
  const lang = activeTab.language;
  const model = activeTab.model;

  // Local fast delimiter balance check
  const localErrors = checkDelimiterBalance(code, lang);

  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang, code })
    });
    const data = await res.json();
    const serverErrors = data.errors || [];

    // Combine errors
    const allErrors = [...localErrors, ...serverErrors];

    // Deduplicate by line + col + message
    const seen = new Set();
    const uniqueErrors = [];
    for (const err of allErrors) {
      const key = `${err.line}:${err.col}:${err.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueErrors.push(err);
      }
    }

    // Apply Monaco Markers with exact word span
    const markers = uniqueErrors.map(err => ({
      severity: err.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
      message: err.message,
      startLineNumber: err.line || 1,
      startColumn: err.col || 1,
      endLineNumber: err.line || 1,
      endColumn: err.endCol || ((err.col || 1) + (err.word ? err.word.length : 4))
    }));

    monaco.editor.setModelMarkers(model, 'trifunc-linter', markers);

    // Update Diagnostics View, Live Alert Banner, and Status Bar Badges
    renderDiagnostics(uniqueErrors);
  } catch (err) {
    console.error('Linting error:', err);
  }
}

function checkDelimiterBalance(code, lang) {
  const errors = [];
  const lines = code.split('\n');
  const stack = [];

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let inString = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"' && line[c - 1] !== '\\') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      // Skip comments based on language
      if (lang === 'scheme' && ch === ';') break;
      if (lang === 'hope' && ch === '!') break;
      if (lang === 'haskell' && line.substr(c, 2) === '--') break;

      if (ch === '(' || ch === '[' || ch === '{') {
        stack.push({ line: l + 1, col: c + 1, ch });
      } else if (ch === ')' || ch === ']' || ch === '}') {
        const expected = ch === ')' ? '(' : ch === ']' ? '[' : '{';
        const top = stack.pop();
        if (!top || top.ch !== expected) {
          errors.push({
            line: l + 1,
            col: c + 1,
            endCol: c + 2,
            severity: 'error',
            message: `Delimitador de cierre inesperado "${ch}". ${top ? `Se esperaba cierre para "${top.ch}"` : 'Sin apertura previa'}.`
          });
        }
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push({
      line: unclosed.line,
      col: unclosed.col,
      endCol: unclosed.col + 1,
      severity: 'error',
      message: `Delimitador "${unclosed.ch}" abierto sin cerrar.`
    });
  }

  return errors;
}

function applyQuickFix(err) {
  if (!editor || !activeTab || !err || !err.suggestion) return;
  const model = activeTab.model;
  const line = err.line || 1;
  const startCol = err.col || 1;
  const endCol = err.endCol || (startCol + (err.word ? err.word.length : 1));

  editor.executeEdits('trifunc-quickfix', [{
    range: new monaco.Range(line, startCol, line, endCol),
    text: err.suggestion,
    forceMoveMarkers: true
  }]);

  editor.focus();
  showToast(`✔ Corregido: "${err.word}" → "${err.suggestion}"`, 'success');
  triggerRealtimeLinting();
}

function updateEditorAlertBanner(errors) {
  const banner = document.getElementById('editor-alert-banner');
  const textEl = document.getElementById('alert-banner-text');
  const fixBtn = document.getElementById('btn-alert-quickfix');
  const fixLabel = document.getElementById('alert-quickfix-label');

  if (!banner || !textEl) return;

  if (!errors || errors.length === 0) {
    banner.style.display = 'none';
    currentPrimaryError = null;
    return;
  }

  const primary = errors[0];
  currentPrimaryError = primary;

  banner.style.display = 'flex';
  banner.classList.toggle('alert-warning', primary.severity === 'warning');

  const extraCount = errors.length > 1 ? ` (+${errors.length - 1} alerta${errors.length > 2 ? 's' : ''} más)` : '';
  textEl.innerHTML = `<strong>[Línea ${primary.line}, Col ${primary.col}]</strong> ${escapeHtml(primary.message)}${escapeHtml(extraCount)}`;

  if (fixBtn && fixLabel) {
    if (primary.suggestion) {
      fixLabel.textContent = `Corregir por "${primary.suggestion}"`;
      fixBtn.style.display = 'inline-flex';
    } else {
      fixBtn.style.display = 'none';
    }
  }
}

function renderDiagnostics(errors) {
  const container = document.getElementById('diagnostics-container');
  const badge = document.getElementById('diag-badge');
  const statusEl = document.getElementById('sb-linter-status');

  badge.textContent = errors.length;
  badge.classList.toggle('has-errors', errors.length > 0);

  updateEditorAlertBanner(errors);

  if (errors.length === 0) {
    statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> 0 errores';
    statusEl.className = 'status-item status-ok';
    container.innerHTML = '<div class="diagnostics-empty"><i class="fa-solid fa-circle-check text-green"></i> No se encontraron errores de sintaxis ni de escritura en el archivo actual.</div>';
    return;
  }

  statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${errors.length} alerta${errors.length > 1 ? 's' : ''}`;
  statusEl.className = 'status-item status-has-error';

  container.innerHTML = '';
  errors.forEach(err => {
    const div = document.createElement('div');
    div.className = 'diagnostic-item';
    const iconColor = err.severity === 'warning' ? 'text-yellow' : 'text-red';

    div.innerHTML = `
      <i class="fa-solid fa-circle-exclamation ${iconColor}"></i>
      <span class="diag-pos">[Línea ${err.line}, Col ${err.col}]</span>
      <span class="diag-msg">${escapeHtml(err.message)}</span>
      ${err.suggestion ? `<button class="diag-quickfix-btn" title="Reemplazar automáticamente"><i class="fa-solid fa-wand-magic-sparkles"></i> Corregir a "${escapeHtml(err.suggestion)}"</button>` : ''}
    `;

    // Click jumps to error line in Monaco
    div.addEventListener('click', (e) => {
      if (e.target.closest('.diag-quickfix-btn')) return;
      editor.revealLineInCenter(err.line);
      editor.setPosition({ lineNumber: err.line, column: err.col });
      editor.focus();
    });

    const qfBtn = div.querySelector('.diag-quickfix-btn');
    if (qfBtn) {
      qfBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyQuickFix(err);
      });
    }

    container.appendChild(div);
  });
}

// -------------------------------------------------------------
// 8. Auto-Indentation & Document Formatting
// -------------------------------------------------------------
function formatCurrentCode() {
  if (!activeTab || !editor) return;

  const action = editor.getAction('editor.action.formatDocument');
  if (action) {
    action.run().then(() => {
      showToast('✔ Sangría corregida y código formateado', 'success');
      triggerRealtimeLinting();
    });
  }
}

// -------------------------------------------------------------
// 9. Algorithm Templates & Snippets Injection
// -------------------------------------------------------------
const SNIPPET_TEMPLATES = {
  graphics: {
    hope: [
      '! Demostración de Lienzo Gráfico 2D y Ventana Emergente en Hope',
      'dec escena_visual : num -> list char;',
      '--- escena_visual _ <=',
      '  let bg == clear_canvas("#0b1021") in',
      '  let sol == draw_circle(120, 95, 45, "#f59e0b") in',
      '  let edificio1 == draw_rect(220, 110, 95, 160, "#3b82f6") in',
      '  let edificio2 == draw_rect(340, 75, 110, 195, "#8b5cf6") in',
      '  let piso == draw_line(40, 270, 580, 270, "#10b981") in',
      '  let titulo == draw_text(175, 45, "Gráficos Funcionales en Hope", "#38bdf8") in',
      '  msgbox("Ventana Hope GUI", "¡Gráficos 2D renderizados con éxito desde Hope!");',
      '',
      'escena_visual(1);'
    ].join('\n'),
    scheme: [
      '; Demostración de Gráficos 2D y Ventana Emergente en Scheme',
      '(clear-canvas "#0b1021")',
      '',
      '; Función recursiva pura para dibujar anillos concéntricos',
      '(define (dibujar-ondas x y radio paso color)',
      '  (if (> radio 10)',
      '      (begin',
      '        (draw-circle x y radio color)',
      '        (dibujar-ondas (+ x 65) y (- radio paso) paso "#8b5cf6"))))',
      '',
      '(dibujar-ondas 130 160 65 12 "#06b6d4")',
      '(draw-rect 420 95 140 130 "#10b981")',
      '(draw-line 60 265 590 265 "#f59e0b")',
      '(draw-text 165 45 "Arte Generativo y GUI en Scheme" "#f8fafc")',
      '',
      '(msgbox "Ventana Scheme GUI" "¡Hola! Este cuadro de diálogo y el lienzo gráfico fueron creados desde tu código Scheme.")'
    ].join('\n'),
    haskell: [
      '-- Demostración de Lienzo Gráfico 2D y Ventana Emergente en Haskell',
      'escena :: [String]',
      'escena = [',
      '    clearCanvas "#0b1021",',
      '    drawCircle 140 155 60 "#ec4899",',
      '    drawCircle 260 155 45 "#8b5cf6",',
      '    drawRect 360 100 160 115 "#06b6d4",',
      '    drawLine 80 255 560 255 "#10b981",',
      '    drawText 175 50 "Escena Funcional en Haskell" "#f8fafc",',
      '    msgbox "Ventana Haskell GUI" "¡Escena gráfica 2D y ventana desplegadas desde Haskell!"',
      '  ]',
      '',
      'main = print (length escena)'
    ].join('\n')
  },
  factorial: {
    hope: [
      'dec fact : num -> num;',
      '--- fact 0 <= 1;',
      '--- fact n <= n * fact(n - 1);',
      '',
      'fact(6);'
    ].join('\n'),
    scheme: [
      '(define (fact n)',
      '  (if (<= n 1)',
      '      1',
      '      (* n (fact (- n 1)))))',
      '',
      '(display (fact 6))',
      '(newline)'
    ].join('\n'),
    haskell: [
      'factorial :: Integer -> Integer',
      'factorial 0 = 1',
      'factorial n = n * factorial (n - 1)',
      '',
      'main = print (factorial 6)'
    ].join('\n')
  },
  fibonacci: {
    hope: [
      'dec fib : num -> num;',
      '--- fib 0 <= 0;',
      '--- fib 1 <= 1;',
      '--- fib n <= fib(n - 1) + fib(n - 2);',
      '',
      'fib(10);'
    ].join('\n'),
    scheme: [
      '(define (fib n)',
      '  (if (< n 2)',
      '      n',
      '      (+ (fib (- n 1)) (fib (- n 2)))))',
      '',
      '(display (fib 10))',
      '(newline)'
    ].join('\n'),
    haskell: [
      'fib :: Integer -> Integer',
      'fib 0 = 0',
      'fib 1 = 1',
      'fib n = fib (n - 1) + fib (n - 2)',
      '',
      'main = print (fib 10)'
    ].join('\n')
  },
  quicksort: {
    hope: [
      'dec qsort : list num -> list num;',
      '--- qsort nil <= nil;',
      '--- qsort(x :: xs) <= qsort [y | y in xs, y <= x] ++ (x :: qsort [y | y in xs, y > x]);',
      '',
      'qsort(5 :: 2 :: 9 :: 1 :: 7 :: nil);'
    ].join('\n'),
    scheme: [
      '(define (quicksort lst)',
      '  (if (or (null? lst) (null? (cdr lst)))',
      '      lst',
      '      (let* ((pivot (car lst))',
      '             (rest (cdr lst))',
      '             (smaller (filter (lambda (x) (< x pivot)) rest))',
      '             (greater (filter (lambda (x) (>= x pivot)) rest)))',
      '        (append (quicksort smaller)',
      '                (list pivot)',
      '                (quicksort greater)))))',
      '',
      '(display (quicksort \'(5 2 9 1 7)))',
      '(newline)'
    ].join('\n'),
    haskell: [
      'qsort :: Ord a => [a] -> [a]',
      'qsort [] = []',
      'qsort (x:xs) = qsort [y | y <- xs, y <= x] ++ [x] ++ qsort [y | y <- xs, y > x]',
      '',
      'main = print (qsort [5, 2, 9, 1, 7])'
    ].join('\n')
  },
  tree: {
    hope: [
      'data tree alpha == emptytree ++ node(alpha # tree alpha # tree alpha);',
      '',
      'dec size : tree alpha -> num;',
      '--- size emptytree <= 0;',
      '--- size(node(x, l, r)) <= 1 + size(l) + size(r);',
      '',
      'size(node(10, node(5, emptytree, emptytree), node(20, emptytree, emptytree)));'
    ].join('\n'),
    scheme: [
      '; Representación funcional de árbol: (valor izq der) o ()',
      '(define (make-node val left right) (list val left right))',
      '(define (tree-val t) (car t))',
      '(define (tree-left t) (cadr t))',
      '(define (tree-right t) (caddr t))',
      '',
      '(define (tree-size t)',
      '  (if (null? t)',
      '      0',
      '      (+ 1 (tree-size (tree-left t)) (tree-size (tree-right t)))))',
      '',
      '(define my-tree (make-node 10 (make-node 5 \'() \'()) (make-node 20 \'() \'())))',
      '(display (tree-size my-tree)) (newline)'
    ].join('\n'),
    haskell: [
      'data Tree a = Leaf | Node a (Tree a) (Tree a) deriving (Show, Eq)',
      '',
      'treeSize :: Tree a -> Int',
      'treeSize Leaf = 0',
      'treeSize (Node _ left right) = 1 + treeSize left + treeSize right',
      '',
      'myTree = Node 10 (Node 5 Leaf Leaf) (Node 20 Leaf Leaf)',
      'main = print (treeSize myTree)'
    ].join('\n')
  },
  closure: {
    hope: [
      'dec apply_twice : (num -> num) # num -> num;',
      '--- apply_twice(f, x) <= f(f(x));',
      '',
      'dec double : num -> num;',
      '--- double n <= n * 2;',
      '',
      'apply_twice(double, 5);'
    ].join('\n'),
    scheme: [
      '; Clausura de estado en Scheme (Demostración de efectos / impureza)',
      '(define (make-accumulator initial)',
      '  (let ((sum initial))',
      '    (lambda (amount)',
      '      (set! sum (+ sum amount))',
      '      sum)))',
      '',
      '(define acc (make-accumulator 100))',
      '(display (acc 50)) (newline)',
      '(display (acc 25)) (newline)'
    ].join('\n'),
    haskell: [
      '-- Clausura pura y función de orden superior (Currificación)',
      'makeMultiplier :: Int -> (Int -> Int)',
      'makeMultiplier factor = (\\x -> x * factor)',
      '',
      'double = makeMultiplier 2',
      'triple = makeMultiplier 3',
      '',
      'main = print (double 10 + triple 10)'
    ].join('\n')
  }
};

function insertAlgorithmSnippet(key) {
  if (!activeTab || !editor) return;
  const lang = activeTab.language;
  const templatesForSnippet = SNIPPET_TEMPLATES[key];
  if (!templatesForSnippet) return;

  const code = templatesForSnippet[lang] || templatesForSnippet.hope;
  editor.setValue(code);
  formatCurrentCode();
  showToast(`Plantilla "${key}" cargada en ${LANG_CONFIG[lang].name}`, 'success');
}

// -------------------------------------------------------------
// 10. Code Execution, Graphics Canvas & GUI Windows
// -------------------------------------------------------------
async function runCurrentCode() {
  if (!activeTab) return;

  const code = editor.getValue();
  const lang = activeTab.language;
  const durationBadge = document.getElementById('duration-badge');
  const outputView = document.getElementById('view-output');
  const engineStatus = document.getElementById('sb-engine-status');

  switchBottomTab('output');
  engineStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-cyan"></i> Evaluando...';
  outputView.innerHTML = `<span style="color: var(--text-muted)">⚡ Evaluando código en motor ${LANG_CONFIG[lang].name}...</span>\n`;

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang, code })
    });

    const data = await res.json();
    durationBadge.style.display = 'inline-block';
    durationBadge.innerHTML = `<i class="fa-regular fa-clock"></i> ${data.durationMs || 0} ms`;
    engineStatus.innerHTML = '<i class="fa-solid fa-circle-nodes text-green"></i> Motor Listo';

    outputView.innerHTML = '';

    if (code.includes('7620859')) {
      outputView.innerHTML += `<div class="easter-egg-banner-output"><i class="fa-solid fa-terminal"></i> ⚡ [PROTOCOLO 7620859 ACTIVADO] &mdash; Autor: Nhyix | Pureza Funcional: 100%</div>`;
    }

    if (data.output) {
      outputView.innerHTML += `<div class="output-stdout">${escapeHtml(data.output)}</div>`;
    }

    if (data.success) {
      if (data.result !== undefined && data.result !== null && data.result !== 'undefined') {
        outputView.innerHTML += `\n<div class="output-success">===> Resultado: ${escapeHtml(String(data.result))}</div>`;
      } else if (!data.output) {
        outputView.innerHTML += `\n<div class="output-success">===> Módulo cargado exitosamente (definiciones procesadas).</div>`;
      }
    } else {
      outputView.innerHTML += `\n<div class="output-error"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${escapeHtml(data.error)}</div>`;
      showToast(`✖ Error de ejecución: ${data.error}`, 'error');
      // Also surface runtime error in the editor alert banner if none is currently displayed
      if (!currentPrimaryError) {
        updateEditorAlertBanner([{
          line: 1,
          col: 1,
          severity: 'error',
          message: `Error en tiempo de ejecución: ${data.error}`
        }]);
      }
    }

    renderTraces(data.traces || []);
    renderGraphicsAndDialogs(data.graphics || [], data.dialogs || []);
  } catch (err) {
    engineStatus.innerHTML = '<i class="fa-solid fa-circle-exclamation text-red"></i> Error de Red';
    outputView.innerHTML += `\n<div class="output-error">Error al conectar con el servidor: ${err.message}</div>`;
    showToast(`✖ Error de conexión: ${err.message}`, 'error');
  }
}

function drawCommandsOnCanvas(canvas, commands, imagesContainer) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Default dark grid background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (imagesContainer) {
    imagesContainer.innerHTML = '';
  }

  for (const cmd of commands) {
    if (cmd.type === 'clear') {
      ctx.fillStyle = cmd.color || '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (cmd.type === 'circle') {
      ctx.beginPath();
      ctx.arc(cmd.x, cmd.y, Math.max(1, cmd.r), 0, Math.PI * 2);
      ctx.fillStyle = cmd.color || '#06b6d4';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();
    } else if (cmd.type === 'rect') {
      ctx.fillStyle = cmd.color || '#8b5cf6';
      ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h);
    } else if (cmd.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(cmd.x1, cmd.y1);
      ctx.lineTo(cmd.x2, cmd.y2);
      ctx.strokeStyle = cmd.color || '#10b981';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (cmd.type === 'text') {
      ctx.fillStyle = cmd.color || '#f8fafc';
      ctx.font = 'bold 16px "JetBrains Mono", "Inter", sans-serif';
      ctx.fillText(cmd.text || '', cmd.x, cmd.y);
    } else if (cmd.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, cmd.x || 0, cmd.y || 0, cmd.w || 120, cmd.h || 120);
      };
      img.src = cmd.url;

      if (imagesContainer) {
        const card = document.createElement('div');
        card.className = 'canvas-image-card';
        card.innerHTML = `<img src="${escapeHtml(cmd.url)}" alt="Imagen renderizada" /><span>${escapeHtml(cmd.url.slice(0, 32))}</span>`;
        imagesContainer.appendChild(card);
      }
    }
  }
}

function openFloatingProgramWindow(dialogObj, includeCanvas = false) {
  const modal = document.getElementById('modal-program-window');
  const titleEl = document.getElementById('program-window-title');
  const bodyEl = document.getElementById('program-window-body');
  const canvasWrap = document.getElementById('program-window-canvas-wrap');
  const floatingCanvas = document.getElementById('floating-graphics-canvas');

  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = (dialogObj && dialogObj.title) ? dialogObj.title : 'Ventana de Aplicación';
  bodyEl.textContent = (dialogObj && dialogObj.message) ? dialogObj.message : '';

  if (includeCanvas && lastRenderedGraphics.length > 0 && canvasWrap && floatingCanvas) {
    canvasWrap.style.display = 'flex';
    drawCommandsOnCanvas(floatingCanvas, lastRenderedGraphics, null);
  } else if (canvasWrap) {
    canvasWrap.style.display = 'none';
  }

  modal.style.display = 'flex';
}

function renderGraphicsAndDialogs(graphics, dialogs) {
  const hasGraphics = Array.isArray(graphics) && graphics.length > 0;
  const hasDialogs = Array.isArray(dialogs) && dialogs.length > 0;

  if (hasGraphics) {
    lastRenderedGraphics = graphics;
    const canvas = document.getElementById('graphics-canvas');
    const imagesContainer = document.getElementById('graphics-images');
    drawCommandsOnCanvas(canvas, graphics, imagesContainer);
    switchBottomTab('canvas');
    showToast(`🎨 ${graphics.length} elemento(s) dibujado(s) en el Lienzo Gráfico`, 'success');
  }

  if (hasDialogs) {
    const lastDialog = dialogs[dialogs.length - 1];
    openFloatingProgramWindow(lastDialog, hasGraphics);
  }
}

function renderTraces(traces) {
  const container = document.getElementById('trace-container');
  if (!traces || traces.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted)">Sin llamadas de reducción adicionales registradas.</span>';
    return;
  }

  container.innerHTML = `<div style="margin-bottom: 8px; color: var(--accent-purple); font-weight: 700;">Pasos de Reducción Funcional (${traces.length} pasos):</div>`;
  traces.forEach((step, idx) => {
    const div = document.createElement('div');
    div.className = 'trace-step';
    div.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">#${idx + 1}</span> <code>${escapeHtml(step)}</code>`;
    container.appendChild(div);
  });
}

function clearConsole() {
  document.getElementById('view-output').innerHTML = '<span style="color: var(--text-muted)">Consola limpia.</span>';
  document.getElementById('duration-badge').style.display = 'none';
}

function copyConsoleOutput() {
  const text = document.getElementById('view-output').innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✔ Salida copiada al portapapeles', 'success');
  });
}

// -------------------------------------------------------------
// 11. Interactive REPL
// -------------------------------------------------------------
function updateReplPrompt() {
  const promptEl = document.getElementById('repl-prompt');
  const lang = activeTab ? activeTab.language : 'hope';
  const prefix = lang === 'haskell' ? 'hs' : lang === 'scheme' ? 'scm' : 'hop';
  promptEl.textContent = `λ (${prefix})>`;
}

async function handleReplKey(e) {
  const input = e.target;
  if (e.key === 'Enter') {
    const expr = input.value.trim();
    if (!expr) return;

    replHistory.push(expr);
    historyIndex = replHistory.length;
    input.value = '';

    const lang = activeTab ? activeTab.language : 'hope';
    const contextCode = activeTab ? editor.getValue() : '';

    const historyBox = document.getElementById('repl-history');
    historyBox.innerHTML += `<div style="color: var(--text-muted); margin-top: 6px;">λ (${lang})> ${escapeHtml(expr)}</div>`;

    if (expr === ':clear') {
      historyBox.innerHTML = '';
      return;
    }

    if (expr === '7620859' || expr === ':7620859' || expr.toLowerCase() === 'nhyix') {
      try { localStorage.setItem('trifunc_console_code_entered', 'true'); } catch (e) {}
      if (window.triggerEasterEgg) window.triggerEasterEgg();
      historyBox.innerHTML += `<div class="output-easter-egg">
╔══════════════════════════════════════════════════════════════════╗
║           ★ PROTOCOLO 7620859 // SISTEMA NHYIX ACTIVADO ★        ║
║  "La computación funcional no es una técnica, es una forma       ║
║   de pensamiento puro."                                          ║
║                                                                  ║
║  • Creador & Arquitecto: Nhyix                                   ║
║  • 3 Temas Secretos Habilitados en el Selector:                  ║
║    [1] 🌸 Mahou Shoujo Madoka Magica (Soul Gem)                  ║
║    [2] ⚡ Accel World (Burst Link)                               ║
║    [3] 🩸 Tokyo Ghoul (Kakugan)                                  ║
╚══════════════════════════════════════════════════════════════════╝</div>`;
      historyBox.scrollTop = historyBox.scrollHeight;
      return;
    }

    try {
      const res = await fetch('/api/repl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, expression: expr, contextCode })
      });
      const data = await res.json();

      if (data.output) {
        historyBox.innerHTML += `<div style="color: var(--text-main);">${escapeHtml(data.output)}</div>`;
      }

      if (data.success) {
        historyBox.innerHTML += `<div class="output-success">=> ${escapeHtml(String(data.result))}</div>`;
      } else {
        historyBox.innerHTML += `<div class="output-error">Error: ${escapeHtml(data.error)}</div>`;
      }

      if ((data.graphics && data.graphics.length > 0) || (data.dialogs && data.dialogs.length > 0)) {
        renderGraphicsAndDialogs(data.graphics || [], data.dialogs || []);
      }

      historyBox.scrollTop = historyBox.scrollHeight;
    } catch (err) {
      historyBox.innerHTML += `<div class="output-error">Error de red: ${err.message}</div>`;
    }
  } else if (e.key === 'ArrowUp') {
    if (historyIndex > 0) {
      historyIndex--;
      input.value = replHistory[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < replHistory.length - 1) {
      historyIndex++;
      input.value = replHistory[historyIndex];
    } else {
      historyIndex = replHistory.length;
      input.value = '';
    }
  }
}

// -------------------------------------------------------------
// 12. File Operations (Save, Create, Delete)
// -------------------------------------------------------------
async function saveCurrentFile() {
  if (!activeTab || activeTab.isExample) {
    if (activeTab && activeTab.isExample) showToast('⚠ Los archivos de ejemplo son de solo lectura', 'warning');
    return;
  }
  const content = editor.getValue();

  try {
    const res = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: activeTab.path, content })
    });
    const data = await res.json();
    if (data.success) {
      activeTab.dirty = false;
      renderTabs();
      showToast('✔ Archivo guardado exitosamente', 'success');
    } else {
      showToast('✖ Error guardando archivo: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('✖ Error de conexión: ' + err.message, 'error');
  }
}

function showNewFileModal() {
  const modal = document.getElementById('modal-new-file');
  document.getElementById('new-file-name').value = '';
  modal.style.display = 'flex';
  document.getElementById('new-file-name').focus();
}

async function createNewFile() {
  const input = document.getElementById('new-file-name');
  let filename = input.value.trim();
  if (!filename) return;

  if (!filename.includes('.')) filename += '.hop';

  document.getElementById('modal-new-file').style.display = 'none';

  try {
    const res = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filename, content: '' })
    });
    const data = await res.json();
    if (data.success) {
      await loadFiles();
      await openFile(filename);
      showToast(`✔ Archivo "${filename}" creado`, 'success');
    } else {
      showToast(`✖ ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`✖ ${err.message}`, 'error');
  }
}

async function deleteFile(path) {
  if (!confirm(`¿Eliminar archivo "${path}"?`)) return;

  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const open = openTabs.find(t => t.path === path);
      if (open) closeTab(open);
      await loadFiles();
      showToast(`✔ Archivo "${path}" eliminado`, 'warning');
    } else {
      showToast(`✖ ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`✖ ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------
// 13. UI Helpers & Navigation
// -------------------------------------------------------------
function switchSidebarTab(tab) {
  document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-btn-${tab}`).classList.add('active');

  document.getElementById('section-files').style.display = tab === 'files' ? 'block' : 'none';
  document.getElementById('section-examples').style.display = tab === 'examples' ? 'block' : 'none';
  document.getElementById('section-docs').style.display = tab === 'docs' ? 'block' : 'none';
}

function switchBottomTab(tab) {
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.getElementById(`ptab-${tab}`);
  if (tabBtn) tabBtn.classList.add('active');

  document.getElementById('view-output').style.display = tab === 'output' ? 'block' : 'none';
  const viewCanvas = document.getElementById('view-canvas');
  if (viewCanvas) viewCanvas.style.display = tab === 'canvas' ? 'block' : 'none';
  document.getElementById('view-repl').style.display = tab === 'repl' ? 'flex' : 'none';
  document.getElementById('view-trace').style.display = tab === 'trace' ? 'block' : 'none';
  document.getElementById('view-diagnostics').style.display = tab === 'diagnostics' ? 'block' : 'none';

  if (tab === 'repl') {
    document.getElementById('repl-input').focus();
  }
}

// -------------------------------------------------------------
// 14. Font Size & Color Customization
// -------------------------------------------------------------
function applyFontSize(size) {
  const validSize = Math.max(10, Math.min(28, size || 14));
  if (editor) {
    editor.updateOptions({ fontSize: validSize });
  }
  const panelBody = document.querySelector('.panel-body');
  if (panelBody) {
    panelBody.style.fontSize = `${Math.max(11, validSize - 1)}px`;
  }
  const replInput = document.getElementById('repl-input');
  if (replInput) {
    replInput.style.fontSize = `${Math.max(11, validSize - 1)}px`;
  }

  const slider = document.getElementById('font-size-slider');
  const label = document.getElementById('font-size-label');
  if (slider) slider.value = validSize;
  if (label) label.textContent = `${validSize}px`;

  try {
    localStorage.setItem('trifunc_font_size', String(validSize));
  } catch (e) {}
}

function applyFontColor(color) {
  const hexBadge = document.getElementById('font-color-hex');
  const picker = document.getElementById('font-color-picker');

  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.getAttribute('data-color') === color);
  });

  if (!color) {
    document.body.classList.remove('has-custom-font-color');
    document.documentElement.style.removeProperty('--user-font-color');
    if (hexBadge) hexBadge.textContent = 'Tema';
    try {
      localStorage.removeItem('trifunc_font_color');
    } catch (e) {}
    return;
  }

  document.documentElement.style.setProperty('--user-font-color', color);
  document.body.classList.add('has-custom-font-color');
  if (hexBadge) hexBadge.textContent = color.toUpperCase();
  if (picker && /^#[0-9a-fA-F]{6}$/.test(color)) picker.value = color;

  try {
    localStorage.setItem('trifunc_font_color', color);
  } catch (e) {}
}

function loadSavedFontSettings() {
  try {
    const savedSize = parseInt(localStorage.getItem('trifunc_font_size'), 10);
    if (savedSize >= 10 && savedSize <= 28) {
      applyFontSize(savedSize);
    }
    const savedColor = localStorage.getItem('trifunc_font_color');
    if (savedColor) {
      applyFontColor(savedColor);
    }
  } catch (e) {}
}

let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('toast-success', 'toast-error', 'toast-warning');
  if (type === 'error') toast.classList.add('toast-error');
  else if (type === 'warning') toast.classList.add('toast-warning');
  else toast.classList.add('toast-success');

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
