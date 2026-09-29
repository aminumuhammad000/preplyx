"use client";
import { useState, useRef, useEffect } from 'react';
import { 
  X, History, Delete, RotateCcw, Calculator, 
  Divide, Minus, Plus, Equal, Percent, Eraser
} from 'lucide-react';
import { playCalculatorKeySound } from '@/lib/soundEffects';

interface ScientificCalculatorProps {
  onClose: () => void;
}

export default function ScientificCalculator({ onClose }: ScientificCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [memory, setMemory] = useState(0);
  const [isDegree, setIsDegree] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isError, setIsError] = useState(false);

  // Draggable
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPos({ x: window.innerWidth - rect.width - 24, y: 80 });
      initialized.current = true;
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const addToDisplay = (value: string) => {
    playCalculatorKeySound();
    setIsError(false);
    if (display === '0' && value !== '.' && !isNaN(Number(value))) {
      setDisplay(value);
    } else if (display === 'Error') {
      setDisplay(value);
    } else {
      setDisplay(display + value);
    }
  };

  const addOperator = (operator: string) => {
    playCalculatorKeySound();
    setIsError(false);
    setExpression(display + ' ' + operator + ' ');
    setDisplay('0');
  };

  const addFunction = (func: string) => {
    playCalculatorKeySound();
    setIsError(false);
    setDisplay(func + '(');
  };

  const toggleSign = () => {
    playCalculatorKeySound();
    if (display !== '0' && display !== 'Error') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  };

  const percentage = () => {
    playCalculatorKeySound();
    const val = parseFloat(display);
    if (!isNaN(val)) setDisplay(String(val / 100));
  };

  const calculate = () => {
    playCalculatorKeySound();
    try {
      let fullExpression = expression + display;
      fullExpression = fullExpression
        .replace(/sin\(/g, isDegree ? 'Math.sin(Math.PI/180*' : 'Math.sin(')
        .replace(/cos\(/g, isDegree ? 'Math.cos(Math.PI/180*' : 'Math.cos(')
        .replace(/tan\(/g, isDegree ? 'Math.tan(Math.PI/180*' : 'Math.tan(')
        .replace(/asin\(/g, isDegree ? '(180/Math.PI)*Math.asin(' : 'Math.asin(')
        .replace(/acos\(/g, isDegree ? '(180/Math.PI)*Math.acos(' : 'Math.acos(')
        .replace(/atan\(/g, isDegree ? '(180/Math.PI)*Math.atan(' : 'Math.atan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/cbrt\(/g, 'Math.cbrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/\^/g, '**')
        .replace(/π/g, 'Math.PI')
        .replace(/℮/g, 'Math.E')
        .replace(/÷/g, '/')
        .replace(/×/g, '*');
      // Safe expression evaluation
      const result = new Function(`"use strict"; return (${fullExpression});`)();
      const resultStr = Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(10)).toString();
      const historyEntry = `${expression}${display} = ${resultStr}`;
      setHistory(prev => [historyEntry, ...prev].slice(0, 20));
      setDisplay(resultStr);
      setExpression('');
      setIsError(false);
    } catch {
      setDisplay('Error');
      setExpression('');
      setIsError(true);
    }
  };

  const clearAll = () => { playCalculatorKeySound(); setDisplay('0'); setExpression(''); setIsError(false); };
  const clearEntry = () => { playCalculatorKeySound(); setDisplay('0'); setIsError(false); };
  const backspace = () => {
    playCalculatorKeySound();
    setIsError(false);
    if (display === 'Error') { setDisplay('0'); return; }
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };
  const memoryRecall = () => { playCalculatorKeySound(); setDisplay(String(memory)); };
  const memoryStore = () => { playCalculatorKeySound(); setMemory(parseFloat(display) || 0); };
  const memoryClear = () => { playCalculatorKeySound(); setMemory(0); };
  const memoryAdd = () => { playCalculatorKeySound(); setMemory(memory + (parseFloat(display) || 0)); };

  type BtnDef = { label: React.ReactNode; onClick: () => void; bg: string; fg: string; span?: number; fontSize?: string };

  // Professional uniform color scheme:
  // Function keys: #1e293b (slate)
  // Number keys: #131826 (dark graphite)
  // Memory keys: #181b26 (slate accent)
  // Operator keys: #4f46e5 (indigo accent)
  // Clear keys: #2a1c24 (muted maroon)
  // Equal key: #10b981 (emerald)

  const rows: BtnDef[][] = [
    // Row 1 – Trigonometric & Logs
    [
      { label: 'sin', onClick: () => addFunction('sin'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'cos', onClick: () => addFunction('cos'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'tan', onClick: () => addFunction('tan'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'log', onClick: () => addFunction('log'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'ln', onClick: () => addFunction('ln'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
    ],
    // Row 2 – Scientific powers & constants
    [
      { label: '√x', onClick: () => addFunction('sqrt'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'x²', onClick: () => setDisplay(display + '^2'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'xʸ', onClick: () => addOperator('^'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '13px' },
      { label: 'π', onClick: () => addToDisplay('π'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '14px' },
      { label: 'e', onClick: () => addToDisplay('℮'), bg: '#1e293b', fg: '#cbd5e1', fontSize: '14px' },
    ],
    // Row 3 – Memory & Brackets
    [
      { label: 'MC', onClick: memoryClear, bg: '#181b26', fg: '#94a3b8', fontSize: '12px' },
      { label: 'MR', onClick: memoryRecall, bg: '#181b26', fg: '#94a3b8', fontSize: '12px' },
      { label: 'MS', onClick: memoryStore, bg: '#181b26', fg: '#94a3b8', fontSize: '12px' },
      { label: 'M+', onClick: memoryAdd, bg: '#181b26', fg: '#94a3b8', fontSize: '12px' },
      { label: '( )', onClick: () => addToDisplay(display.includes('(') && !display.includes(')') ? ')' : '('), bg: '#181b26', fg: '#cbd5e1', fontSize: '13px' },
    ],
    // Row 4 – Clear & Basic Operations
    [
      { label: 'AC', onClick: clearAll, bg: '#2a1c24', fg: '#f87171', fontSize: '13px' },
      { label: 'CE', onClick: clearEntry, bg: '#2a1c24', fg: '#f87171', fontSize: '13px' },
      { label: <Percent size={15} style={{ display: 'block', margin: '0 auto' }} />, onClick: percentage, bg: '#181b26', fg: '#cbd5e1' },
      { label: <Divide size={17} style={{ display: 'block', margin: '0 auto' }} />, onClick: () => addOperator('÷'), bg: '#4f46e5', fg: '#ffffff' },
      { label: <Delete size={16} style={{ display: 'block', margin: '0 auto' }} />, onClick: backspace, bg: '#2a1c24', fg: '#f87171' },
    ],
    // Row 5 – Numbers 7-9 & Multiply
    [
      { label: '7', onClick: () => addToDisplay('7'), bg: '#131826', fg: '#ffffff' },
      { label: '8', onClick: () => addToDisplay('8'), bg: '#131826', fg: '#ffffff' },
      { label: '9', onClick: () => addToDisplay('9'), bg: '#131826', fg: '#ffffff' },
      { label: <X size={15} style={{ display: 'block', margin: '0 auto' }} />, onClick: () => addOperator('×'), bg: '#4f46e5', fg: '#ffffff' },
      { label: '±', onClick: toggleSign, bg: '#181b26', fg: '#cbd5e1', fontSize: '14px' },
    ],
    // Row 6 – Numbers 4-6 & Subtract
    [
      { label: '4', onClick: () => addToDisplay('4'), bg: '#131826', fg: '#ffffff' },
      { label: '5', onClick: () => addToDisplay('5'), bg: '#131826', fg: '#ffffff' },
      { label: '6', onClick: () => addToDisplay('6'), bg: '#131826', fg: '#ffffff' },
      { label: <Minus size={17} style={{ display: 'block', margin: '0 auto' }} />, onClick: () => addOperator('-'), bg: '#4f46e5', fg: '#ffffff' },
      { label: '1/x', onClick: () => { try { setDisplay(String(1 / parseFloat(display))); } catch { setDisplay('Error'); } }, bg: '#181b26', fg: '#cbd5e1', fontSize: '12px' },
    ],
    // Row 7 – Numbers 1-3, Add & Equals
    [
      { label: '1', onClick: () => addToDisplay('1'), bg: '#131826', fg: '#ffffff' },
      { label: '2', onClick: () => addToDisplay('2'), bg: '#131826', fg: '#ffffff' },
      { label: '3', onClick: () => addToDisplay('3'), bg: '#131826', fg: '#ffffff' },
      { label: <Plus size={17} style={{ display: 'block', margin: '0 auto' }} />, onClick: () => addOperator('+'), bg: '#4f46e5', fg: '#ffffff' },
      { label: <Equal size={18} style={{ display: 'block', margin: '0 auto' }} />, onClick: calculate, bg: '#10b981', fg: '#ffffff' },
    ],
    // Row 8 – Number 0, Decimal & Brackets
    [
      { label: '0', onClick: () => addToDisplay('0'), bg: '#131826', fg: '#ffffff', span: 2 },
      { label: '.', onClick: () => { if (!display.includes('.')) addToDisplay('.'); }, bg: '#131826', fg: '#ffffff' },
      { label: '(', onClick: () => addToDisplay('('), bg: '#181b26', fg: '#cbd5e1' },
      { label: ')', onClick: () => addToDisplay(')'), bg: '#181b26', fg: '#cbd5e1' },
    ],
  ];

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '350px',
        backgroundColor: '#0f172a',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
        zIndex: 2000,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Header – drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px',
          backgroundColor: '#181b28',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Calculator size={17} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>Scientific Calculator</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>JAMB & WAEC CBT Mode</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            onClick={() => setShowHistory(h => !h)} 
            title="Calculation History"
            style={{ 
              background: showHistory ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' 
            }}
          >
            <History size={14} color="#cbd5e1" />
          </button>

          <button 
            onClick={() => setIsDegree(d => !d)} 
            title="Toggle Angle Unit (DEG/RAD)"
            style={{ 
              background: 'rgba(99, 102, 241, 0.15)', 
              border: '1px solid rgba(99, 102, 241, 0.3)', 
              borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#818cf8', transition: 'all 0.2s' 
            }}
          >
            {isDegree ? 'DEG' : 'RAD'}
          </button>

          <button 
            onClick={onClose} 
            title="Close Calculator"
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' 
            }}
          >
            <X size={15} color="#cbd5e1" />
          </button>
        </div>
      </div>

      {/* Display */}
      <div style={{ padding: '14px 18px 10px', backgroundColor: '#080a10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isDegree ? 'DEG' : 'RAD'} {memory !== 0 ? '• M' : ''}
          </span>
          {/* Expression line */}
          <div style={{ fontSize: '12px', color: '#38bdf8', textAlign: 'right', fontFamily: 'monospace', opacity: 0.95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expression || '\u00a0'}
          </div>
        </div>

        {/* Main number */}
        <div style={{
          fontSize: display.length > 12 ? '22px' : display.length > 8 ? '28px' : '36px',
          fontWeight: 700, color: isError ? '#f87171' : '#ffffff',
          textAlign: 'right', fontFamily: 'monospace',
          letterSpacing: '-1px', lineHeight: 1.1,
          wordBreak: 'break-all', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end'
        }}>
          {display}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#080a10', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '12px 0' }}>No calculation history yet</div>
          ) : (
            history.map((item, i) => (
              <div
                key={i}
                onClick={() => { const res = item.split(' = ')[1]; if (res) setDisplay(res); }}
                style={{ fontSize: '11px', color: '#cbd5e1', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '3px', fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {item}
              </div>
            ))
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ padding: '12px 14px 16px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {row.map((btn, bi) => (
              <button
                key={bi}
                onClick={btn.onClick}
                style={{
                  gridColumn: btn.span ? `span ${btn.span}` : 'span 1',
                  padding: '12px 4px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  fontSize: btn.fontSize || '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  backgroundColor: btn.bg,
                  color: btn.fg,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  fontFamily: 'sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}

        {/* Clear history button */}
        {history.length > 0 && (
          <button 
            onClick={() => setHistory([])} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <RotateCcw size={12} /> Clear calculation history
          </button>
        )}
      </div>
    </div>
  );
}
