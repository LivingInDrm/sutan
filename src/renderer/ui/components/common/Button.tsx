import React from 'react';
import bronzeTexture from '../../../assets/textures/bronze-1024.webp';
import ricePaperTexture from '../../../assets/textures/rice-paper-1024.webp';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'choice' | 'confirm';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
type ButtonVisualState = 'default' | 'hover' | 'active';

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[32px] min-w-[80px] px-4 py-1.5 text-[13px]',
  md: 'min-h-[40px] min-w-[120px] px-6 py-2.5 text-[15px]',
  lg: 'min-h-[48px] min-w-[160px] px-8 py-3.5 text-[17px]',
  xl: 'min-h-[58px] min-w-[200px] px-10 py-[18px] text-[20px]',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-[32px] min-w-[48px] px-3',
  md: 'h-[40px] min-w-[60px] px-4',
  lg: 'h-[48px] min-w-[72px] px-5',
  xl: 'h-[58px] min-w-[88px] px-6',
};

const CHOICE_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[58px] min-w-[180px] px-4 py-3 text-[13px]',
  md: 'min-h-[74px] min-w-[220px] px-5 py-4 text-[15px]',
  lg: 'min-h-[90px] min-w-[260px] px-6 py-5 text-[17px]',
  xl: 'min-h-[108px] min-w-[300px] px-7 py-6 text-[20px]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  glow?: boolean;
  loading?: boolean;
  selected?: boolean;
  vertical?: boolean;
  previewState?: ButtonVisualState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

type VariantTone = {
  frameClass: string;
  innerFrameClass: string;
  textClass: string;
  topBeamClass: string;
  bottomBeamClass: string;
  outerShadowClass: string;
  backgroundBase: string;
  texture?: string;
  textureOpacity?: number;
  showStuds?: boolean;
  showInnerFrame?: boolean;
  showGhostFill?: boolean;
  bodyFont?: 'display' | 'body';
};

export function Button({
  variant = 'primary',
  size = 'md',
  glow = false,
  loading = false,
  selected = false,
  vertical = false,
  previewState = 'default',
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const resolvedVariant = variant === 'confirm' ? 'primary' : variant;
  const isIcon = resolvedVariant === 'icon';
  const isChoice = resolvedVariant === 'choice';
  const isDisabled = Boolean(disabled || loading);
  const isHover = previewState === 'hover';
  const isActive = previewState === 'active';

  const motionClass = isDisabled
    ? 'cursor-not-allowed'
    : isActive
      ? 'scale-[0.98] translate-y-[1px]'
      : isHover
        ? '-translate-y-[1px]'
        : 'hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-[1px] cursor-pointer';

  const visualTone: Record<ButtonVariant, VariantTone> = {
    primary: {
      frameClass: isDisabled ? 'border-[#65583a] outline-[#6f6246]' : isHover ? 'border-[#f0d060] outline-[#a88631]' : 'border-[#c9a84c] outline-[#8a6d2b]',
      innerFrameClass: isDisabled ? 'border-[#786b4f]/80' : isHover ? 'border-[#f0d060]/80' : 'border-[#c9a84c]/75',
      textClass: isDisabled ? 'text-[#9e8d6f]' : 'text-[#f5f0e8]',
      topBeamClass: isDisabled ? 'bg-[#8a7b5e]/40' : 'bg-[#d4bb76]/60',
      bottomBeamClass: isDisabled ? 'bg-[#34281c]/35' : 'bg-[#3f2c12]/55',
      outerShadowClass: glow || isHover ? 'shadow-[0_0_0_1px_rgba(201,168,76,0.18),0_10px_24px_rgba(0,0,0,0.36),0_0_18px_rgba(201,168,76,0.16)]' : 'shadow-[0_8px_18px_rgba(0,0,0,0.32)]',
      backgroundBase: 'linear-gradient(180deg, rgba(106,80,32,0.96) 0%, rgba(122,93,38,0.94) 48%, rgba(138,109,43,0.96) 100%)',
      texture: bronzeTexture,
      textureOpacity: 0.12,
      showStuds: true,
      showInnerFrame: true,
      bodyFont: 'display',
    },
    secondary: {
      frameClass: isDisabled ? 'border-[#615140] outline-[#514335]' : isHover ? 'border-[#c9a84c] outline-[#8a6d2b]' : 'border-[#8a6d2b] outline-[#5b4319]',
      innerFrameClass: 'border-transparent',
      textClass: isDisabled ? 'text-[#8c785a]' : 'text-[#c9a84c]',
      topBeamClass: isDisabled ? 'bg-[#907a63]/20' : 'bg-[#866234]/30',
      bottomBeamClass: isDisabled ? 'bg-[#120a07]/20' : 'bg-[#140c08]/40',
      outerShadowClass: isHover ? 'shadow-[0_8px_20px_rgba(0,0,0,0.34),0_0_16px_rgba(201,168,76,0.08)]' : 'shadow-[0_8px_18px_rgba(0,0,0,0.28)]',
      backgroundBase: 'linear-gradient(180deg, rgba(42,24,16,0.96) 0%, rgba(50,30,21,0.95) 52%, rgba(61,36,24,0.96) 100%)',
      texture: ricePaperTexture,
      textureOpacity: 0.08,
      showInnerFrame: false,
      bodyFont: 'display',
    },
    danger: {
      frameClass: isDisabled ? 'border-[#6a4a42] outline-[#5a3934]' : isHover ? 'border-[#b74242] outline-[#8b1a1a]' : 'border-[#8b1a1a] outline-[#611111]',
      innerFrameClass: isDisabled ? 'border-[#7e5d58]/50' : 'border-[#bb5951]/45',
      textClass: isDisabled ? 'text-[#a18c80]' : 'text-[#f5f0e8]',
      topBeamClass: isDisabled ? 'bg-[#a2786a]/15' : 'bg-[#c86454]/25',
      bottomBeamClass: isDisabled ? 'bg-[#170707]/20' : 'bg-[#200808]/35',
      outerShadowClass: glow || isHover ? 'shadow-[0_8px_22px_rgba(0,0,0,0.34),0_0_14px_rgba(139,26,26,0.16)]' : 'shadow-[0_8px_18px_rgba(0,0,0,0.3)]',
      backgroundBase: 'linear-gradient(180deg, rgba(74,14,14,0.97) 0%, rgba(91,15,15,0.96) 52%, rgba(107,15,15,0.96) 100%)',
      texture: bronzeTexture,
      textureOpacity: 0.06,
      showInnerFrame: false,
      bodyFont: 'display',
    },
    ghost: {
      frameClass: 'border-transparent outline-transparent',
      innerFrameClass: 'border-transparent',
      textClass: isDisabled ? 'text-[#8f8268]' : isHover ? 'text-[#f0d060]' : 'text-[#c9a84c]',
      topBeamClass: 'bg-transparent',
      bottomBeamClass: 'bg-transparent',
      outerShadowClass: '',
      backgroundBase: isHover ? 'linear-gradient(180deg, rgba(138,109,43,0.12) 0%, rgba(138,109,43,0.06) 100%)' : 'transparent',
      showInnerFrame: false,
      showGhostFill: isHover || isActive,
      bodyFont: 'display',
    },
    icon: {
      frameClass: isDisabled ? 'border-[#65583a] outline-[#6f6246]' : isHover ? 'border-[#f0d060] outline-[#8a6d2b]' : 'border-[#c9a84c] outline-[#8a6d2b]',
      innerFrameClass: isDisabled ? 'border-[#786b4f]/80' : 'border-[#c9a84c]/75',
      textClass: isDisabled ? 'text-[#9e8d6f]' : 'text-[#f5f0e8]',
      topBeamClass: isDisabled ? 'bg-[#8a7b5e]/40' : 'bg-[#d4bb76]/55',
      bottomBeamClass: isDisabled ? 'bg-[#34281c]/35' : 'bg-[#3f2c12]/55',
      outerShadowClass: glow || isHover ? 'shadow-[0_8px_22px_rgba(0,0,0,0.34),0_0_18px_rgba(201,168,76,0.14)]' : 'shadow-[0_8px_18px_rgba(0,0,0,0.32)]',
      backgroundBase: 'linear-gradient(180deg, rgba(106,80,32,0.96) 0%, rgba(122,93,38,0.94) 48%, rgba(138,109,43,0.96) 100%)',
      texture: bronzeTexture,
      textureOpacity: 0.11,
      showInnerFrame: true,
      bodyFont: 'display',
    },
    choice: {
      frameClass: selected || isHover ? 'border-[#d8bc62] outline-[#8a6d2b]' : 'border-[#8a6d2b] outline-[#705522]',
      innerFrameClass: selected ? 'border-[#d8bc62]/70' : 'border-[#a88a4a]/45',
      textClass: isDisabled ? 'text-[#776653]' : 'text-[#1a0f0a]',
      topBeamClass: selected ? 'bg-[#efe1bc]/55' : 'bg-[#f1e4c4]/40',
      bottomBeamClass: 'bg-[#7e6541]/28',
      outerShadowClass: selected || glow ? 'shadow-[0_8px_20px_rgba(0,0,0,0.22),0_0_14px_rgba(201,168,76,0.1)]' : 'shadow-[0_8px_18px_rgba(0,0,0,0.18)]',
      backgroundBase: selected
        ? 'linear-gradient(180deg, rgba(233,222,194,0.97) 0%, rgba(221,206,170,0.97) 55%, rgba(212,197,169,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(221,210,182,0.97) 0%, rgba(212,197,169,0.97) 55%, rgba(202,184,148,0.98) 100%)',
      texture: ricePaperTexture,
      textureOpacity: 0.11,
      showInnerFrame: false,
      bodyFont: 'body',
    },
    confirm: {
      frameClass: '',
      innerFrameClass: '',
      textClass: '',
      topBeamClass: '',
      bottomBeamClass: '',
      outerShadowClass: '',
      backgroundBase: '',
    },
  };

  const tone = visualTone[resolvedVariant];
  const textFontClass = tone.bodyFont === 'body'
    ? 'font-[family-name:var(--font-body)]'
    : 'font-[family-name:var(--font-display)]';
  const textShadowStyle: React.CSSProperties = {
    textShadow: isDisabled ? '0 1px 2px rgba(0,0,0,0.28)' : '0 1px 2px rgba(0,0,0,0.5)',
  };
  const textureStyle: React.CSSProperties | undefined = tone.texture
    ? {
        backgroundImage: `url(${tone.texture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: tone.textureOpacity,
        mixBlendMode: resolvedVariant === 'choice' ? 'multiply' : 'soft-light',
      }
    : undefined;
  const baseStyle: React.CSSProperties = {
    backgroundImage: tone.backgroundBase,
  };
  const studClass = isDisabled ? 'bg-[#8f7d5d]' : isHover ? 'bg-[#f0d060]' : 'bg-[#c9a84c]';

  if (isIcon) {
    return (
      <button
        disabled={isDisabled}
        className={`
          group relative inline-flex items-center justify-center overflow-hidden rounded-[3px] border outline outline-2 outline-offset-[-4px]
          ${ICON_SIZES[size]}
          ${textFontClass} ${tone.frameClass} ${tone.outerShadowClass} ${tone.textClass}
          transition-all duration-200 ease-out focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-[#c9a84c]
          ${isDisabled ? 'opacity-35 saturate-50' : ''}
          ${motionClass}
          ${className}
        `}
        {...rest}
      >
        <span className="absolute inset-0" style={baseStyle} />
        <span className="absolute inset-0 pointer-events-none" style={textureStyle} />
        <span className={`absolute inset-[4px] border ${tone.innerFrameClass} pointer-events-none`} />
        <span className={`absolute left-[6px] right-[6px] top-[2px] h-[2px] ${tone.topBeamClass} pointer-events-none`} />
        <span className={`absolute left-[7px] right-[7px] bottom-[2px] h-[2px] ${tone.bottomBeamClass} pointer-events-none`} />
        <span className="relative z-10 inline-flex items-center justify-center tracking-[0.12em]" style={textShadowStyle}>
          {loading ? '载入' : children}
        </span>
      </button>
    );
  }

  return (
    <button
      disabled={isDisabled}
      className={`
        group relative inline-flex items-center justify-center overflow-hidden
        ${isChoice ? CHOICE_SIZE_STYLES[size] : SIZE_STYLES[size]}
        ${resolvedVariant === 'ghost' ? 'rounded-[3px]' : 'rounded-[3px] border outline outline-2 outline-offset-[-4px]'}
        ${textFontClass}
        ${tone.frameClass} ${tone.outerShadowClass} ${tone.textClass}
        transition-all duration-200 ease-out focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-[#c9a84c]
        ${isDisabled ? 'opacity-35 saturate-50' : ''}
        ${motionClass}
        ${className}
      `}
      {...rest}
    >
      {resolvedVariant !== 'ghost' && <span className="absolute inset-0" style={baseStyle} />}
      {resolvedVariant !== 'ghost' && <span className="absolute inset-0 pointer-events-none" style={textureStyle} />}
      {resolvedVariant === 'ghost' && tone.showGhostFill && (
        <span className="absolute inset-0 rounded-[inherit]" style={baseStyle} />
      )}
      {resolvedVariant !== 'ghost' && (
        <>
          <span className={`absolute left-[6px] right-[6px] top-[2px] h-[2px] ${tone.topBeamClass} pointer-events-none`} />
          <span className={`absolute left-[7px] right-[7px] bottom-[2px] h-[2px] ${tone.bottomBeamClass} pointer-events-none`} />
          {tone.showInnerFrame && <span className={`absolute inset-[4px] border ${tone.innerFrameClass} pointer-events-none`} />}
        </>
      )}
      {tone.showStuds && (
        <>
          <span className={`absolute left-[4px] top-[4px] h-[5px] w-[5px] rounded-full ${studClass} shadow-[0_0_0_1px_rgba(61,36,24,0.45)] pointer-events-none`} />
          <span className={`absolute right-[4px] top-[4px] h-[5px] w-[5px] rounded-full ${studClass} shadow-[0_0_0_1px_rgba(61,36,24,0.45)] pointer-events-none`} />
          <span className={`absolute bottom-[4px] left-[4px] h-[5px] w-[5px] rounded-full ${studClass} shadow-[0_0_0_1px_rgba(61,36,24,0.45)] pointer-events-none`} />
          <span className={`absolute bottom-[4px] right-[4px] h-[5px] w-[5px] rounded-full ${studClass} shadow-[0_0_0_1px_rgba(61,36,24,0.45)] pointer-events-none`} />
        </>
      )}
      {isChoice && (
        <>
          {selected && <span className="absolute left-[6px] top-[8px] bottom-[8px] w-[4px] bg-[#8b1a1a] pointer-events-none" />}
        </>
      )}
      <span className={`
        relative z-10 inline-flex items-center justify-center gap-2
        ${vertical ? 'writing-mode-vertical min-h-[5.5em]' : ''}
        ${resolvedVariant === 'ghost' ? 'px-1' : ''}
        tracking-[0.12em]
      `}>
        {leftIcon && <span className="opacity-85">{leftIcon}</span>}
        <span style={textShadowStyle}>{loading ? <span className="animate-pulse tracking-[0.2em]">加载中</span> : children}</span>
        {rightIcon && <span className="opacity-85">{rightIcon}</span>}
      </span>
    </button>
  );
}
