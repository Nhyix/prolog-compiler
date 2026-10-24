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

  // Theme switch
  document.getElementById('theme-select').addEventListener('change', (e) => {
    const theme = e.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') monaco.editor.setTheme('vs-dark');
    else if (theme === 'light') monaco.editor.setTheme('vs');
    else if (theme === 'synthwave') monaco.editor.setTheme('synthwave-theme');
    else if (theme === 'monokai') monaco.editor.setTheme('monokai-theme');
    else if (theme === 'github-dark') monaco.editor.setTheme('github-dark-theme');
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

  // Easter Egg Modal (Protocol 7620859 // Nhyix Core)
  const modalEasterEgg = document.getElementById('modal-easter-egg');
  const openEasterEgg = () => {
    if (modalEasterEgg) modalEasterEgg.style.display = 'flex';
    showToast('⚡ Protocolo 7620859 Activado — Nhyix Core', 'success');
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

  // Footer Author Badge click triggers Easter Egg
  const sbAuthorBadge = document.getElementById('sb-author-badge');
  if (sbAuthorBadge) sbAuthorBadge.addEventListener('click', openEasterEgg);

  // Triple-click logo triggers Easter Egg
  let logoClicks = 0;
  let logoTimer = null;
  const logoBtn = document.getElementById('logo-icon-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      logoClicks++;
      clearTimeout(logoTimer);
      if (logoClicks >= 3) {
        logoClicks = 0;
        openEasterEgg();
      } else {
        logoTimer = setTimeout(() => { logoClicks = 0; }, 1000);
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
      if (window.triggerEasterEgg) window.triggerEasterEgg();
      historyBox.innerHTML += `<div class="output-easter-egg">
╔══════════════════════════════════════════════════════════════════╗
║           ★ PROTOCOLO 7620859 // NHYIX CORE ONLINE ★             ║
║  "La computación funcional no es una técnica, es una forma       ║
║   de pensamiento puro."                                          ║
║                                                                  ║
║  • Creador & Arquitecto: Nhyix                                   ║
║  • ID Verificación: #7620859-NHYIX-LAMBDA                        ║
║  • Estado del Núcleo: Pureza Absoluta (Haskell · Scheme · Hope)  ║
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
