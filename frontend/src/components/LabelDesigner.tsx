import React, { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface LabelSize {
  name: string;
  width: number;
  height: number;
}

interface FontSize {
  name: string;
  height: number;
  width: number;
}

interface BarcodeType {
  name: string;
  zpl: string;
}

interface BaseElement {
  id: number;
  x: number;
  y: number;
  content: string;
  labelName: string;
  isVariable: boolean;
}

interface TextElement extends BaseElement {
  type: 'text';
  fontSize: FontSize;
}

interface BarcodeElement extends BaseElement {
  type: 'barcode';
  barcodeType: BarcodeType;
  height: number;
  moduleWidth: number;
  showText: boolean;
}

type LabelElement = TextElement | BarcodeElement;

interface CsvRow {
  [key: string]: string;
}

// ============================================================================
// Constants
// ============================================================================

const DPI = 203;
const INCH_TO_DOTS = DPI;
const DISPLAY_SCALE = 96;

const LABEL_SIZES: LabelSize[] = [
  { name: '4" x 6"', width: 4, height: 6 },
  { name: '4" x 3"', width: 4, height: 3 },
  { name: '2" x 1"', width: 2, height: 1 },
  { name: '3" x 2"', width: 3, height: 2 },
  { name: '2.25" x 1.25"', width: 2.25, height: 1.25 },
  { name: '4" x 2"', width: 4, height: 2 },
];

const FONT_SIZES: FontSize[] = [
  { name: 'Small', height: 20, width: 16 },
  { name: 'Medium', height: 32, width: 26 },
  { name: 'Large', height: 48, width: 40 },
  { name: 'X-Large', height: 64, width: 52 },
  { name: 'Huge', height: 96, width: 80 },
];

const BARCODE_TYPES: BarcodeType[] = [
  { name: 'Code 128', zpl: 'BC' },
  { name: 'Code 39', zpl: 'B3' },
  { name: 'QR Code', zpl: 'BQ' },
  { name: 'UPC-A', zpl: 'BU' },
  { name: 'EAN-13', zpl: 'BE' },
];

// ============================================================================
// API Configuration - Update this to match your setup
// ============================================================================

const API_BASE_URL = '/api';
const STORAGE_KEY = 'zpl-label-designer-state';
const THEME_KEY = 'zpl-label-theme';

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function LabelDesigner() {
  const saved = useRef(loadSavedState());

  const [labelSize, setLabelSize] = useState<LabelSize>(saved.current?.labelSize ?? LABEL_SIZES[0]);
  const [elements, setElements] = useState<LabelElement[]>(saved.current?.elements ?? []);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[] | null>(saved.current?.csvData ?? null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>(saved.current?.csvHeaders ?? []);
  const [previewRow, setPreviewRow] = useState(0);
  const [generatedZpl, setGeneratedZpl] = useState('');
  const [printerIp, setPrinterIp] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [activeTab, setActiveTab] = useState<'design' | 'data' | 'output'>('design');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [editingElement, setEditingElement] = useState<number | null>(null);
  const [quantityColumn, setQuantityColumn] = useState(saved.current?.quantityColumn ?? '');
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [printMessage, setPrintMessage] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const designFileInputRef = useRef<HTMLInputElement>(null);

  // Persist state to localStorage
  useEffect(() => {
    const state = { elements, labelSize, quantityColumn, csvData, csvHeaders };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [elements, labelSize, quantityColumn, csvData, csvHeaders]);

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Theme colors
  const c = darkMode ? {
    pageBg: 'bg-zinc-950',
    pageText: 'text-zinc-200',
    panel: 'bg-zinc-900',
    panelBorder: 'border-zinc-800',
    input: 'bg-zinc-800 border-zinc-700',
    inputText: 'text-zinc-200',
    label: 'text-zinc-500',
    muted: 'text-zinc-600',
    subtle: 'text-zinc-400',
    btn: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700',
    btnDanger: 'bg-zinc-800 border-red-900 text-red-400 hover:bg-red-950',
    tabActive: 'text-emerald-500 border-emerald-500',
    tabInactive: 'text-zinc-500 border-transparent hover:text-zinc-300',
    selectedBg: 'bg-emerald-950',
    elSelected: 'bg-emerald-950 border-emerald-500',
    elNormal: 'bg-zinc-800 border-transparent hover:bg-zinc-700',
    icon: 'bg-zinc-700',
    divider: 'bg-zinc-800',
    canvasRing: 'ring-zinc-700',
    tableHead: 'bg-zinc-800 border-b border-zinc-700 text-zinc-400',
    tableCell: 'border-zinc-800',
    rowHover: 'hover:bg-zinc-800',
    navBtn: 'bg-zinc-800 hover:bg-zinc-700',
    code: 'bg-zinc-950 border-zinc-800 text-emerald-500',
    deleteBtn: 'text-zinc-500 hover:text-red-400',
    statusSuccess: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    statusError: 'bg-red-950 text-red-400 border-red-800',
    statusNeutral: 'bg-zinc-800 text-zinc-300',
    accent: 'text-emerald-500',
    checkbox: 'border-zinc-600',
  } : {
    pageBg: 'bg-gray-50',
    pageText: 'text-gray-800',
    panel: 'bg-white',
    panelBorder: 'border-gray-200',
    input: 'bg-white border-gray-300',
    inputText: 'text-gray-800',
    label: 'text-gray-500',
    muted: 'text-gray-400',
    subtle: 'text-gray-500',
    btn: 'bg-white border-gray-300 hover:bg-gray-100',
    btnDanger: 'bg-white border-red-300 text-red-500 hover:bg-red-50',
    tabActive: 'text-emerald-600 border-emerald-600',
    tabInactive: 'text-gray-400 border-transparent hover:text-gray-600',
    selectedBg: 'bg-emerald-50',
    elSelected: 'bg-emerald-50 border-emerald-500',
    elNormal: 'bg-gray-50 border-transparent hover:bg-gray-100',
    icon: 'bg-gray-300',
    divider: 'bg-gray-200',
    canvasRing: 'ring-gray-300',
    tableHead: 'bg-gray-50 border-b border-gray-200 text-gray-500',
    tableCell: 'border-gray-100',
    rowHover: 'hover:bg-gray-50',
    navBtn: 'bg-gray-100 hover:bg-gray-200',
    code: 'bg-white border-gray-200 text-emerald-700',
    deleteBtn: 'text-gray-400 hover:text-red-500',
    statusSuccess: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    statusError: 'bg-red-50 text-red-600 border-red-200',
    statusNeutral: 'bg-gray-100 text-gray-600',
    accent: 'text-emerald-600',
    checkbox: 'border-gray-300',
  };

  const canvasWidth = labelSize.width * DISPLAY_SCALE;
  const canvasHeight = labelSize.height * DISPLAY_SCALE;

  // Add a new text element
  const addTextElement = () => {
    const newElement: TextElement = {
      id: Date.now(),
      type: 'text',
      x: 20,
      y: 20 + elements.length * 40,
      content: 'New Text',
      labelName: '',
      fontSize: FONT_SIZES[1],
      isVariable: false,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Add a new barcode element
  const addBarcodeElement = () => {
    const newElement: BarcodeElement = {
      id: Date.now(),
      type: 'barcode',
      x: 20,
      y: 20 + elements.length * 60,
      content: '123456789',
      labelName: '',
      barcodeType: BARCODE_TYPES[0],
      height: 60,
      moduleWidth: 2,
      isVariable: false,
      showText: true,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Update element properties
  const updateElement = (id: number, updates: Partial<LabelElement>) => {
    setElements(elements.map(el =>
      el.id === id ? { ...el, ...updates } as LabelElement : el
    ));
  };

  // Delete selected element
  const deleteElement = (id: number) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  // Parse a CSV line handling quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('CSV must have at least a header row and one data row');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const data = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row: CsvRow = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      setCsvHeaders(headers);
      setCsvData(data);
      setPreviewRow(0);

      const qtyHeader = headers.find(h => /^(qty|quantity|count|copies|#\s*labels|num\s*labels|number\s*of\s*labels|labels|num|#)$/i.test(h.trim()));
      if (qtyHeader) setQuantityColumn(qtyHeader);
    };
    reader.readAsText(file);
  };

  // Get the display content for an element (with variable substitution)
  const getDisplayContent = (element: LabelElement): string => {
    if (!element.isVariable || !csvData || csvData.length === 0) {
      return element.content;
    }
    const row = csvData[previewRow];
    return row[element.labelName] || `{${element.labelName}}`;
  };

  // Generate ZPL for all labels
  const generateZpl = useCallback((): string => {
    const rows = csvData || [{}];
    let allZpl = '';

    rows.forEach((row) => {
      const qty = quantityColumn && row[quantityColumn] ? Math.max(1, parseInt(row[quantityColumn]) || 1) : 1;
      for (let q = 0; q < qty; q++) {
      let zpl = '^XA\n';
      zpl += `^PW${Math.round(labelSize.width * INCH_TO_DOTS)}\n`;
      zpl += `^LL${Math.round(labelSize.height * INCH_TO_DOTS)}\n`;

      elements.forEach((element) => {
        const x = Math.round((element.x / DISPLAY_SCALE) * INCH_TO_DOTS);
        const y = Math.round((element.y / DISPLAY_SCALE) * INCH_TO_DOTS);

        let content = element.content;
        if (element.isVariable && element.labelName && row[element.labelName]) {
          content = row[element.labelName];
        }

        if (element.type === 'text') {
          const textWidth = content.length * element.fontSize.width;
          const centeredX = Math.max(0, Math.round(x - textWidth / 2));
          zpl += `^FO${centeredX},${y}`;
          zpl += `^A0N,${element.fontSize.height},${element.fontSize.width}`;
          zpl += `^FD${content}^FS\n`;
        } else if (element.type === 'barcode') {
          zpl += `^FO${x},${y}`;

          if (element.barcodeType.zpl === 'BQ') {
            zpl += `^BQN,2,${Math.round(element.height / 10)}`;
            zpl += `^FDMA,${content}^FS\n`;
          } else {
            zpl += `^BY${element.moduleWidth}`;
            zpl += `^${element.barcodeType.zpl}N,${element.height},${element.showText ? 'Y' : 'N'},N,N`;
            zpl += `^FD${content}^FS\n`;
          }
        }
      });

      zpl += '^XZ\n\n';
      allZpl += zpl;
      }
    });

    setGeneratedZpl(allZpl);
    return allZpl;
  }, [elements, labelSize, csvData, quantityColumn]);

  // Mouse handling for dragging elements
  const handleMouseDown = (e: React.MouseEvent, elementId: number) => {
    e.stopPropagation();
    if (editingElement === elementId) return;
    const element = elements.find(el => el.id === elementId);
    if (!element || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - element.x,
      y: e.clientY - rect.top - element.y
    });
    setSelectedElement(elementId);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || selectedElement === null || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(canvasWidth - 50, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(canvasHeight - 20, e.clientY - rect.top - dragOffset.y));

    updateElement(selectedElement, { x: newX, y: newY });
  }, [isDragging, selectedElement, dragOffset, canvasWidth, canvasHeight]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // Download ZPL file
  const downloadZpl = () => {
    const zpl = generateZpl();
    const blob = new Blob([zpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'labels.zpl';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy ZPL to clipboard
  const copyZpl = async () => {
    const zpl = generateZpl();
    await navigator.clipboard.writeText(zpl);
    setPrintMessage('ZPL copied to clipboard!');
    setTimeout(() => setPrintMessage(''), 3000);
  };

  // Send to printer via backend
  const sendToPrinter = async () => {
    if (!printerIp) {
      setPrintMessage('Please enter the printer IP address');
      setPrintStatus('error');
      return;
    }

    const zpl = generateZpl();
    setPrintStatus('printing');
    setPrintMessage('Sending to printer...');

    try {
      const response = await fetch(`${API_BASE_URL}/print/zpl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zpl,
          printerIp,
          printerPort: parseInt(printerPort) || 9100,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setPrintStatus('success');
        const totalLabels = csvData
          ? csvData.reduce((sum, row) => sum + (quantityColumn && row[quantityColumn] ? Math.max(1, parseInt(row[quantityColumn]) || 1) : 1), 0)
          : 1;
        setPrintMessage(`Printed ${totalLabels} label(s) successfully!`);
      } else {
        setPrintStatus('error');
        setPrintMessage(result.message || 'Print failed');
      }
    } catch (error) {
      setPrintStatus('error');
      setPrintMessage('Failed to connect to print server');
    }

    setTimeout(() => setPrintStatus('idle'), 5000);
  };

  const handleBrowserPrint = () => {
    const rows = csvData && csvData.length > 0 ? csvData : [{}];

    const labelWidthIn = labelSize.width;
    const labelHeightIn = labelSize.height;

    const labelsHtml = rows.map((row) => {
      const qty = quantityColumn && row[quantityColumn] ? Math.max(1, parseInt(row[quantityColumn]) || 1) : 1;
      const labelHtml = elements.map((element) => {
        let content = element.content;
        if (element.isVariable && element.labelName && row[element.labelName]) {
          content = row[element.labelName];
        }

        const xIn = element.x / 96;
        const yIn = element.y / 96;

        if (element.type === 'text') {
          const fontSizePt = element.fontSize.height * 0.75;
          return `<div style="position:absolute; left:${xIn}in; top:${yIn}in; font-size:${fontSizePt}pt; font-family:monospace; font-weight:bold; transform:translateX(-50%);">${content}</div>`;
        } else if (element.type === 'barcode') {
          return `
            <div style="position:absolute; left:${xIn}in; top:${yIn}in; text-align:center;">
              <div style="font-family:'Libre Barcode 128', monospace; font-size:${element.height * 0.8}px;">${content}</div>
              ${element.showText ? `<div style="font-family:monospace; font-size:10px;">${content}</div>` : ''}
            </div>
          `;
        }
        return '';
      }).join('');

      const page = `
        <div class="label-page" style="width:${labelWidthIn}in; height:${labelHeightIn}in; position:relative; page-break-after:always; box-sizing:border-box;">
          ${labelHtml}
        </div>
      `;
      return Array(qty).fill(page).join('');
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to use browser print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${labelWidthIn}in ${labelHeightIn}in;
            margin: 0;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          .label-page { overflow: hidden; }
          .label-page:last-child { page-break-after: avoid; }
          @media screen {
            body { background: #333; padding: 20px; }
            .label-page { background: white; margin: 0 auto 20px auto; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
          }
          @media print {
            .label-page { background: white; }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleClear = () => {
    if (elements.length === 0 && !csvData) return;
    if (!confirm('Clear all elements and data?')) return;
    setElements([]);
    setSelectedElement(null);
    setCsvData(null);
    setCsvHeaders([]);
    setQuantityColumn('');
    setGeneratedZpl('');
    setEditingElement(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSaveDesign = () => {
    const design = { elements, labelSize, quantityColumn };
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'label-design.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadDesign = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const design = JSON.parse(e.target?.result as string);
        if (!Array.isArray(design.elements)) {
          alert('Invalid design file: missing elements');
          return;
        }
        if (elements.length > 0 && !confirm('Replace current design?')) return;
        setElements(design.elements);
        if (design.labelSize) setLabelSize(design.labelSize);
        if (design.quantityColumn) setQuantityColumn(design.quantityColumn);
        setSelectedElement(null);
        setEditingElement(null);
      } catch {
        alert('Invalid design file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div className={`min-h-screen ${c.pageBg} ${c.pageText} font-mono`}>
      {/* Header */}
      <header className={`flex justify-between items-center px-6 py-4 border-b ${c.panelBorder} ${c.panel}`}>
        <div className="flex items-center gap-3">
          <span className={`text-2xl ${c.accent}`}>&#9703;</span>
          <h1 className="text-lg font-semibold tracking-tight">ZPL Label Designer</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1.5 ${c.btn} border rounded text-xs font-medium transition-colors`}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >{darkMode ? '\u2600' : '\u263E'}</button>
          <button
            onClick={handleSaveDesign}
            className={`px-3 py-1.5 ${c.btn} border rounded text-xs font-medium transition-colors`}
          >Save Design</button>
          <button
            onClick={() => designFileInputRef.current?.click()}
            className={`px-3 py-1.5 ${c.btn} border rounded text-xs font-medium transition-colors`}
          >Load Design</button>
          <input
            ref={designFileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadDesign}
            className="hidden"
          />
          <button
            onClick={handleClear}
            className={`px-3 py-1.5 ${c.btnDanger} border rounded text-xs font-medium transition-colors`}
          >Clear</button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className={`flex px-6 border-b ${c.panelBorder} ${c.panel}`}>
        {(['design', 'data', 'output'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? c.tabActive
                : c.tabInactive
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="p-6">
        {/* Design Tab */}
        {activeTab === 'design' && (
          <div className="grid grid-cols-[240px_1fr_280px] gap-6 min-h-[calc(100vh-160px)]">
            {/* Left Sidebar - Tools */}
            <aside className={`${c.panel} rounded-lg p-4 border ${c.panelBorder}`}>
              <div className="mb-6">
                <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                  Label Size
                </h3>
                <select
                  value={LABEL_SIZES.findIndex(s => s.name === labelSize.name)}
                  onChange={(e) => setLabelSize(LABEL_SIZES[parseInt(e.target.value)])}
                  className={`w-full px-3 py-2 ${c.input} ${c.inputText} rounded-md text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  {LABEL_SIZES.map((size, i) => (
                    <option key={size.name} value={i}>{size.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                  Add Elements
                </h3>
                <button
                  onClick={addTextElement}
                  className={`w-full px-3 py-2.5 ${c.btn} border rounded-md text-sm flex items-center gap-2 transition-colors mb-2`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center ${c.icon} rounded text-xs font-bold`}>T</span>
                  Add Text
                </button>
                <button
                  onClick={addBarcodeElement}
                  className={`w-full px-3 py-2.5 ${c.btn} border rounded-md text-sm flex items-center gap-2 transition-colors`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center ${c.icon} rounded text-xs font-bold`}>&#9646;</span>
                  Add Barcode
                </button>
              </div>

              <div>
                <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                  Elements
                </h3>
                <div className="flex flex-col gap-1">
                  {elements.map((el) => (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElement(el.id)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer text-xs transition-colors border ${
                        selectedElement === el.id
                          ? c.elSelected
                          : c.elNormal
                      }`}
                    >
                      <span>{el.type === 'text' ? 'T' : '&#9646;'}</span>
                      <span className={`flex-1 truncate ${c.subtle}`}>
                        {el.labelName || el.content.substring(0, 15)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                        className={`${c.deleteBtn} px-1`}
                      >&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Canvas Area */}
            <div className="flex flex-col items-center justify-center gap-4">
              <div
                ref={canvasRef}
                style={{ width: canvasWidth, height: canvasHeight }}
                className={`bg-white rounded relative shadow-2xl ring-1 ${c.canvasRing} overflow-hidden`}
                onClick={() => { setSelectedElement(null); setEditingElement(null); }}
              >
                {/* Grid pattern */}
                <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
                  <defs>
                    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Elements */}
                {elements.map((element) => (
                  <div
                    key={element.id}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      left: element.x,
                      top: element.y,
                      cursor: isDragging && selectedElement === element.id ? 'grabbing' : 'grab',
                    }}
                    className={`absolute px-2 py-1 rounded-sm border border-dashed select-none transition-colors ${
                      selectedElement === element.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-transparent'
                    }`}
                  >
                    {element.type === 'text' ? (
                      <div style={{ transform: 'translateX(-50%)' }}>
                      {editingElement === element.id && !element.isVariable ? (
                        <input
                          autoFocus
                          type="text"
                          value={element.content}
                          onChange={(e) => updateElement(element.id, { content: e.target.value })}
                          onBlur={() => setEditingElement(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingElement(null); }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: element.fontSize.height * 0.6, width: Math.max(60, element.content.length * element.fontSize.width * 0.4) }}
                          className="font-mono font-bold text-black bg-white border border-emerald-500 outline-none px-0 py-0"
                        />
                      ) : (
                        <span
                          style={{ fontSize: element.fontSize.height * 0.6 }}
                          className="font-mono font-bold text-black whitespace-nowrap"
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingElement(element.id); }}
                        >
                          {getDisplayContent(element)}
                        </span>
                      )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-px items-end">
                          {[...Array(20)].map((_, i) => (
                            <div
                              key={i}
                              style={{ height: element.height * 0.8, width: Math.random() > 0.5 ? 2 : 1 }}
                              className="bg-black"
                            />
                          ))}
                        </div>
                        {element.showText && (
                          <span className="text-[10px] font-mono text-black">{getDisplayContent(element)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className={`text-xs ${c.muted}`}>
                {labelSize.width}" &times; {labelSize.height}" &bull; {Math.round(labelSize.width * INCH_TO_DOTS)} &times; {Math.round(labelSize.height * INCH_TO_DOTS)} dots
              </p>
            </div>

            {/* Right Sidebar - Properties */}
            <aside className={`${c.panel} rounded-lg p-4 border ${c.panelBorder}`}>
              {selectedEl ? (
                <div className="flex flex-col gap-4">
                  <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label}`}>
                    {selectedEl.type === 'text' ? 'Text' : 'Barcode'} Properties
                  </h3>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[11px] font-medium ${c.label} uppercase tracking-wide`}>Label Name</label>
                    <input
                      type="text"
                      value={selectedEl.labelName}
                      onChange={(e) => updateElement(selectedEl.id, { labelName: e.target.value })}
                      placeholder="e.g. SKU, Name, Price"
                      className={`w-full px-3 py-2 ${c.input} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    />
                    {selectedEl.isVariable && (
                      <p className={`text-[10px] ${c.muted}`}>Must match a CSV column name</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[11px] font-medium ${c.label} uppercase tracking-wide`}>Content</label>
                    <input
                      type="text"
                      value={selectedEl.content}
                      onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                      disabled={selectedEl.isVariable}
                      className={`w-full px-3 py-2 ${c.input} rounded-md text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    />
                  </div>

                  {selectedEl.type === 'text' && (
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[11px] font-medium ${c.label} uppercase tracking-wide`}>Font Size</label>
                      <select
                        value={FONT_SIZES.findIndex(f => f.name === selectedEl.fontSize.name)}
                        onChange={(e) => updateElement(selectedEl.id, { fontSize: FONT_SIZES[parseInt(e.target.value)] })}
                        className={`w-full px-3 py-2 ${c.input} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      >
                        {FONT_SIZES.map((size, i) => (
                          <option key={size.name} value={i}>{size.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedEl.type === 'barcode' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[11px] font-medium ${c.label} uppercase tracking-wide`}>Barcode Type</label>
                        <select
                          value={BARCODE_TYPES.findIndex(b => b.name === selectedEl.barcodeType.name)}
                          onChange={(e) => updateElement(selectedEl.id, { barcodeType: BARCODE_TYPES[parseInt(e.target.value)] })}
                          className={`w-full px-3 py-2 ${c.input} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        >
                          {BARCODE_TYPES.map((type, i) => (
                            <option key={type.name} value={i}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[11px] font-medium ${c.label} uppercase tracking-wide`}>Height (dots)</label>
                        <input
                          type="number"
                          value={selectedEl.height}
                          onChange={(e) => updateElement(selectedEl.id, { height: parseInt(e.target.value) || 60 })}
                          className={`w-full px-3 py-2 ${c.input} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        />
                      </div>
                      <label className={`flex items-center gap-2 text-sm ${c.subtle} cursor-pointer`}>
                        <input
                          type="checkbox"
                          checked={selectedEl.showText}
                          onChange={(e) => updateElement(selectedEl.id, { showText: e.target.checked })}
                          className={`rounded ${c.checkbox}`}
                        />
                        Show text below barcode
                      </label>
                    </>
                  )}

                  <div className={`h-px ${c.divider} my-2`} />

                  <label className={`flex items-center gap-2 text-sm ${c.subtle} cursor-pointer`}>
                    <input
                      type="checkbox"
                      checked={selectedEl.isVariable}
                      onChange={(e) => updateElement(selectedEl.id, { isVariable: e.target.checked })}
                      className={`rounded ${c.checkbox}`}
                    />
                    Variable field (from CSV)
                  </label>

                  {selectedEl.isVariable && !selectedEl.labelName && (
                    <p className="text-xs text-amber-500">Set a Label Name above to link to CSV data</p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[11px] font-medium ${c.label} uppercase tracking-wide`}>Position</label>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <span className={`${c.muted} text-xs`}>X:</span>
                        <input
                          type="number"
                          value={Math.round(selectedEl.x)}
                          onChange={(e) => updateElement(selectedEl.id, { x: parseInt(e.target.value) || 0 })}
                          className={`w-16 px-2 py-1 ${c.input} rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`${c.muted} text-xs`}>Y:</span>
                        <input
                          type="number"
                          value={Math.round(selectedEl.y)}
                          onChange={(e) => updateElement(selectedEl.id, { y: parseInt(e.target.value) || 0 })}
                          className={`w-16 px-2 py-1 ${c.input} rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className={`${c.muted} text-sm text-center`}>Select an element to edit its properties</p>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="max-w-4xl mx-auto">
            <div className={`${c.panel} rounded-lg p-6 border ${c.panelBorder} mb-6 text-center`}>
              <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                Import CSV Data
              </h3>
              <p className={`text-xs ${c.muted} mb-4`}>
                Upload a CSV file with headers. Each row will generate a separate label.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-emerald-500 text-black font-semibold rounded-md hover:bg-emerald-400 transition-colors"
              >
                Choose CSV File
              </button>
            </div>

            {csvData && (
              <>
              <div className={`${c.panel} rounded-lg p-6 border ${c.panelBorder} mb-6`}>
                <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                  Quantity Column
                </h3>
                <p className={`text-xs ${c.muted} mb-3`}>
                  Select which column specifies how many copies of each label to print.
                </p>
                <select
                  value={quantityColumn}
                  onChange={(e) => setQuantityColumn(e.target.value)}
                  className={`w-full px-3 py-2 ${c.input} ${c.inputText} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  <option value="">None (1 each)</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div className={`${c.panel} rounded-lg p-6 border ${c.panelBorder}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label}`}>
                    Data Preview ({csvData.length} rows)
                  </h3>
                  <div className={`flex items-center gap-3 text-sm ${c.label}`}>
                    <button
                      onClick={() => setPreviewRow(Math.max(0, previewRow - 1))}
                      disabled={previewRow === 0}
                      className={`px-3 py-1 ${c.navBtn} rounded disabled:opacity-50 transition-colors`}
                    >&larr;</button>
                    <span>Row {previewRow + 1} of {csvData.length}</span>
                    <button
                      onClick={() => setPreviewRow(Math.min(csvData.length - 1, previewRow + 1))}
                      disabled={previewRow === csvData.length - 1}
                      className={`px-3 py-1 ${c.navBtn} rounded disabled:opacity-50 transition-colors`}
                    >&rarr;</button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {csvHeaders.map(header => (
                          <th key={header} className={`text-left px-3 py-2.5 ${c.tableHead} font-semibold`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((row, i) => (
                        <tr
                          key={i}
                          onClick={() => setPreviewRow(i)}
                          className={`cursor-pointer transition-colors ${
                            i === previewRow ? c.selectedBg : c.rowHover
                          }`}
                        >
                          {csvHeaders.map(header => (
                            <td key={header} className={`px-3 py-2.5 border-b ${c.tableCell}`}>
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.length > 10 && (
                    <p className={`text-xs ${c.muted} mt-3`}>Showing first 10 rows of {csvData.length}</p>
                  )}
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 mb-6">
              <button
                onClick={generateZpl}
                className="px-6 py-3 bg-emerald-500 text-black font-semibold rounded-md hover:bg-emerald-400 transition-colors"
              >
                Generate ZPL
              </button>
              <button
                onClick={copyZpl}
                className={`px-6 py-3 ${c.btn} border rounded-md font-medium transition-colors`}
              >
                Copy to Clipboard
              </button>
              <button
                onClick={downloadZpl}
                className={`px-6 py-3 ${c.btn} border rounded-md font-medium transition-colors`}
              >
                Download .zpl File
              </button>
              <button
                onClick={handleBrowserPrint}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-500 transition-colors"
              >
                Browser Print
              </button>
            </div>

            {csvData && csvHeaders.length > 0 && (
              <div className={`flex items-center gap-3 mb-6 px-4 py-3 ${c.panel} rounded-md border ${c.panelBorder}`}>
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} whitespace-nowrap`}>Quantity Column</span>
                <select
                  value={quantityColumn}
                  onChange={(e) => setQuantityColumn(e.target.value)}
                  className={`flex-1 px-3 py-1.5 ${c.input} ${c.inputText} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  <option value="">None (1 each)</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                <span className={`text-xs ${c.muted}`}>
                  {quantityColumn
                    ? `${csvData.reduce((sum, row) => sum + Math.max(1, parseInt(row[quantityColumn]) || 1), 0)} labels total`
                    : `${csvData.length} labels total`
                  }
                </span>
              </div>
            )}

            {printMessage && (
              <div className={`mb-6 px-4 py-3 rounded-md border text-sm ${
                printStatus === 'success' ? c.statusSuccess :
                printStatus === 'error' ? c.statusError :
                c.statusNeutral
              }`}>
                {printMessage}
              </div>
            )}

            <div className={`${c.panel} rounded-lg p-6 border ${c.panelBorder} mb-6`}>
              <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                Direct Print (Network Printer)
              </h3>
              <p className={`text-xs ${c.muted} mb-4`}>
                Enter your Zebra printer's IP address to print directly from the browser.
              </p>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Printer IP (e.g., 192.168.1.100)"
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  className={`flex-1 px-3 py-2 ${c.input} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
                <input
                  type="text"
                  placeholder="Port"
                  value={printerPort}
                  onChange={(e) => setPrinterPort(e.target.value)}
                  className={`w-20 px-3 py-2 ${c.input} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
                <button
                  onClick={sendToPrinter}
                  disabled={printStatus === 'printing'}
                  className="px-6 py-2 bg-emerald-500 text-black font-semibold rounded-md hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {printStatus === 'printing' ? 'Printing...' : 'Print'}
                </button>
              </div>
            </div>

            <div className={`${c.panel} rounded-lg p-6 border ${c.panelBorder}`}>
              <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${c.label} mb-3`}>
                Generated ZPL
              </h3>
              <pre className={`p-4 ${c.code} rounded-md border text-xs overflow-auto max-h-96 whitespace-pre-wrap break-all`}>
                {generatedZpl || 'Click "Generate ZPL" to preview the output'}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
