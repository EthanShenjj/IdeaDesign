'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ColorCardProps {
  labelKey: string;
  color: string;
}

// 生成色卡渐变色
function generateColorShades(hexColor: string): string[] {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const shades: string[] = [];

  // 生成从黑到白的渐变（包含原色）
  for (let i = 0; i <= 10; i++) {
    let newR, newG, newB;

    if (i < 5) {
      // 从黑色到原色
      const darkFactor = i / 5;
      newR = Math.round(r * darkFactor);
      newG = Math.round(g * darkFactor);
      newB = Math.round(b * darkFactor);
    } else {
      // 从原色到白色
      const lightFactor = (i - 5) / 5;
      newR = Math.round(r + (255 - r) * lightFactor);
      newG = Math.round(g + (255 - g) * lightFactor);
      newB = Math.round(b + (255 - b) * lightFactor);
    }

    const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    shades.push(newHex.toUpperCase());
  }

  return shades;
}

export default function ColorCard({ labelKey, color }: ColorCardProps) {
  const { t } = useLanguage();
  const shades = generateColorShades(color);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-black/5 shadow-sm">
      <div className="mb-2">
        <h4 className="font-bold text-sm text-ink">{t(`detail.${labelKey}`)}</h4>
      </div>

      {/* Main Color Display */}
      <div
        className="w-full h-20 rounded-lg mb-2 shadow-md"
        style={{ backgroundColor: color }}
      />

      <p className="font-mono font-bold text-xs text-ink text-center mb-2">{color}</p>

      {/* Color Shades */}
      <div className="flex gap-0.5 rounded overflow-hidden shadow-sm">
        {shades.map((shade, i) => (
          <div
            key={i}
            className="flex-1 h-6 hover:h-8 transition-all cursor-pointer group relative"
            style={{ backgroundColor: shade }}
            title={shade}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[6px] font-mono font-bold text-white mix-blend-difference">
                {shade}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
