type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
};

export function RangeControl({ label, value, min, max, unit = "", onChange }: RangeControlProps) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-sm font-black">
        <span>{label}</span>
        <output>{value}{unit}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--ui-brand)]"
      />
    </label>
  );
}
