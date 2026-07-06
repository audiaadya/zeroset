import { useState } from 'react';
import { ChevronDown, ChevronUp, Type } from 'lucide-react';

interface Props {
  onInsert: (latex: string) => void;
}

const MACRO_CATEGORIES = [
  {
    name: 'Binomials & Sums',
    macros: [
      { label: '\\binom{n}{k}', value: '\\binom{n}{k}' },
      { label: '\\sum_{i=1}^{n}', value: '\\sum_{i=1}^{n} ' },
      { label: '\\sum a_i', value: '\\sum_{i=1}^{n} a_i' },
      { label: '\\prod', value: '\\prod_{i=1}^{n} ' },
    ],
  },
  {
    name: 'Modular Arithmetic',
    macros: [
      { label: '\\equiv \\pmod{m}', value: '\\equiv ' },
      { label: '\\pmod{m}', value: '\\pmod{m}' },
      { label: '\\mod', value: '\\mod{m}' },
    ],
  },
  {
    name: 'Sets & Logic',
    macros: [
      { label: '\\mathbb{N}', value: '\\mathbb{N}' },
      { label: '\\mathbb{Z}', value: '\\mathbb{Z}' },
      { label: '\\mathbb{Q}', value: '\\mathbb{Q}' },
      { label: '\\mathbb{R}', value: '\\mathbb{R}' },
      { label: '\\mathbb{C}', value: '\\mathbb{C}' },
      { label: '\\in', value: '\\in ' },
      { label: '\\notin', value: '\\notin ' },
      { label: '\\subset', value: '\\subset ' },
      { label: '\\subseteq', value: '\\subseteq ' },
      { label: '\\cup', value: '\\cup ' },
      { label: '\\cap', value: '\\cap ' },
      { label: '\\forall', value: '\\forall ' },
      { label: '\\exists', value: '\\exists ' },
    ],
  },
  {
    name: 'Operators',
    macros: [
      { label: '\\frac{a}{b}', value: '\\frac{a}{b}' },
      { label: '\\sqrt{x}', value: '\\sqrt{x}' },
      { label: '\\sqrt[n]{x}', value: '\\sqrt[n]{x}' },
      { label: '\\boxed{}', value: '\\boxed{ }' },
      { label: '\\text{}', value: '\\text{ }' },
    ],
  },
  {
    name: 'Limits & Integrals',
    macros: [
      { label: '\\lim_{x \\to a}', value: '\\lim_{x \\to a} ' },
      { label: '\\int_a^b', value: '\\int_a^b ' },
      { label: '\\int_0^\\infty', value: '\\int_0^\\infty ' },
      { label: '\\oint', value: '\\oint ' },
    ],
  },
  {
    name: 'Matrices',
    macros: [
      { label: '\\begin{pmatrix}', value: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: '\\begin{bmatrix}', value: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
      { label: '\\begin{vmatrix}', value: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
    ],
  },
  {
    name: 'Aligned',
    macros: [
      { label: '\\begin{aligned}', value: '\\begin{aligned} \\\\ \\end{aligned}' },
      { label: '&=', value: '&= ' },
      { label: '\\\\', value: '\\\\ ' },
    ],
  },
  {
    name: 'Greek Letters',
    macros: [
      { label: '\\alpha', value: '\\alpha' },
      { label: '\\beta', value: '\\beta' },
      { label: '\\gamma', value: '\\gamma' },
      { label: '\\delta', value: '\\delta' },
      { label: '\\epsilon', value: '\\epsilon' },
      { label: '\\theta', value: '\\theta' },
      { label: '\\lambda', value: '\\lambda' },
      { label: '\\mu', value: '\\mu' },
      { label: '\\pi', value: '\\pi' },
      { label: '\\sigma', value: '\\sigma' },
      { label: '\\phi', value: '\\phi' },
      { label: '\\omega', value: '\\omega' },
      { label: '\\varphi', value: '\\varphi' },
    ],
  },
];

export default function LaTeXMacros({ onInsert }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<string[]>(['Binomials & Sums', 'Modular Arithmetic']);

  const toggleCategory = (name: string) => {
    setVisibleCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850/40">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="focus-ring flex w-full items-center justify-between gap-2 px-3 py-2 text-xs text-ink-300 hover:text-ink-100"
      >
        <span className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5 text-accent-400" />
          LaTeX Macro Dock
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="max-h-[400px] overflow-y-auto border-t border-ink-700 p-2">
          {MACRO_CATEGORIES.map((cat) => (
            <div key={cat.name} className="mb-2">
              <button
                onClick={() => toggleCategory(cat.name)}
                className="focus-ring mb-1 flex w-full items-center justify-between rounded px-2 py-1 text-[10px] uppercase tracking-wider text-ink-400 hover:bg-ink-800"
              >
                {cat.name}
                {visibleCategories.includes(cat.name) ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {visibleCategories.includes(cat.name) && (
                <div className="flex flex-wrap gap-1 px-1">
                  {cat.macros.map((macro) => (
                    <button
                      key={macro.value}
                      onClick={() => onInsert(macro.value)}
                      className="focus-ring rounded border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-[11px] text-ink-300 hover:border-accent-400/40 hover:text-accent-200"
                    >
                      {macro.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
