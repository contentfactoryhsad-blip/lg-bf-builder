import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { IconSvg, IconItem } from './IconRegistry';

interface Props {
  value: string;
  onSelect: (id: string) => void;
  icons: IconItem[];
  iconStyle: 'solid-white' | 'solid-black' | 'line-white' | 'line-black';
}

function IconPreview({ id, iconStyle }: { id: string; iconStyle: Props['iconStyle'] }) {
  const isLine = iconStyle.startsWith('line');
  const isWhite = iconStyle.endsWith('white');
  const bg = isLine && isWhite ? '#888' : '#F5F5F5';
  return (
    <div
      className="w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden rounded-lg"
      style={{ background: bg }}
    >
      {id && (
        <div style={{ transform: 'scale(0.5)', transformOrigin: 'center', width: 60, height: 60, display: 'flex' }}>
          <IconSvg iconId={id} style={iconStyle} />
        </div>
      )}
    </div>
  );
}

export function IconCombobox({ value, onSelect, icons, iconStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedLabel = icons.find((i) => i.id === value)?.label ?? '';

  const filtered = query.trim()
    ? icons.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : icons;

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-full flex items-center gap-3 bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#A50034] rounded-lg hover:border-gray-400 transition-colors">
          <IconPreview id={value} iconStyle={iconStyle} />
          <span className="flex-1 text-left truncate text-gray-700">{selectedLabel}</span>
          <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
            />
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No icon found.</div>
            ) : (
              filtered.map((icon) => (
                <button
                  key={icon.id}
                  onClick={() => { onSelect(icon.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <IconPreview id={icon.id} iconStyle={iconStyle} />
                  <span className="flex-1 truncate text-sm text-gray-800">{icon.label}</span>
                  <Check
                    size={14}
                    className="shrink-0 text-[#A50034]"
                    style={{ opacity: value === icon.id ? 1 : 0 }}
                  />
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
