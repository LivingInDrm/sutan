import React from 'react';
import { CircleFrame } from './svg';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'choice' | 'confirm';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
type ButtonVisualState = 'default' | 'hover' | 'active';

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-[11px] tracking-[0.12em]',
  md: 'min-h-[44px] px-5 py-2 text-[13px] tracking-[0.1em]',
  lg: 'min-h-[52px] px-7 py-3 text-[15px] tracking-[0.1em]',
  xl: 'min-h-[60px] px-10 py-4 text-[17px] tracking-[0.12em]',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-[36px] h-[36px]',
  md: 'w-[44px] h-[44px]',
  lg: 'w-[52px] h-[52px]',
  xl: 'w-[64px] h-[64px]',
};

const CHOICE_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[64px] px-4 py-3 text-[12px]',
  md: 'min-h-[80px] px-5 py-4 text-[14px]',
  lg: 'min-h-[96px] px-6 py-5 text-[15px]',
  xl: 'min-h-[112px] px-7 py-6 text-[17px]',
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
      ? 'scale-[0.97] -translate-y-[1px]'
      : isHover
        ? '-translate-y-[1px]'
        : 'hover:-translate-y-[1px] active:scale-[0.97] active:translate-y-0 cursor-pointer';

  const commonTextClass = resolvedVariant === 'secondary'
    ? 'font-[family-name:var(--font-body)] font-semibold'
    : resolvedVariant === 'ghost'
      ? 'font-[family-name:var(--font-body)] font-medium'
      : 'font-[family-name:var(--font-display)]';

  const visualTone = {
    primary: {
      shell: 'border-gold-500/80 text-gold-100',
      surface: 'bg-[linear-gradient(180deg,rgba(106,80,32,0.94)_0%,rgba(138,109,43,0.9)_32%,rgba(201,168,76,0.34)_100%)]',
      inset: 'bg-[linear-gradient(180deg,rgba(240,208,96,0.16)_0%,rgba(42,24,16,0)_62%,rgba(14,8,6,0.35)_100%)]',
      shadow: glow || isHover ? 'shadow-[var(--shadow-gold)]' : 'shadow-[var(--shadow-ink)]',
      text: isDisabled ? 'text-parchment-500' : isHover ? 'text-gold-100' : 'text-gold-300',
    },
    secondary: {
      shell: 'border-gold-500/70 text-parchment-200',
      surface: 'bg-[linear-gradient(180deg,rgba(61,36,24,0.9)_0%,rgba(42,24,16,0.88)_60%,rgba(26,15,10,0.92)_100%)]',
      inset: 'bg-[linear-gradient(180deg,rgba(232,220,200,0.08)_0%,rgba(26,15,10,0)_55%,rgba(0,0,0,0.24)_100%)]',
      shadow: isHover ? 'shadow-[var(--shadow-gold-sm)]' : 'shadow-[var(--shadow-ink-sm)]',
      text: isDisabled ? 'text-parchment-500' : isHover ? 'text-parchment-100' : 'text-parchment-200',
    },
    danger: {
      shell: 'border-crimson-500/85 text-crimson-300',
      surface: 'bg-[linear-gradient(180deg,rgba(107,15,15,0.94)_0%,rgba(139,26,26,0.88)_45%,rgba(61,8,8,0.96)_100%)]',
      inset: 'bg-[linear-gradient(180deg,rgba(212,64,64,0.18)_0%,rgba(0,0,0,0)_60%,rgba(14,8,6,0.35)_100%)]',
      shadow: glow || isHover ? 'shadow-[var(--shadow-danger)]' : 'shadow-[var(--shadow-ink)]',
      text: isDisabled ? 'text-parchment-500' : isHover ? 'text-crimson-300' : 'text-parchment-100',
    },
    ghost: {
      shell: 'border-transparent',
      surface: isHover ? 'bg-gold-500/12' : 'bg-transparent',
      inset: isHover ? 'bg-[linear-gradient(90deg,rgba(201,168,76,0.06)_0%,rgba(240,208,96,0.12)_50%,rgba(201,168,76,0.06)_100%)]' : 'bg-transparent',
      shadow: '',
      text: isDisabled ? 'text-parchment-500/70' : isHover ? 'text-gold-100' : 'text-gold-300',
    },
    icon: {
      shell: 'border-gold-500/75 text-gold-300',
      surface: 'bg-[radial-gradient(circle_at_50%_35%,rgba(240,208,96,0.16)_0%,rgba(42,24,16,0.94)_58%,rgba(14,8,6,0.98)_100%)]',
      inset: 'bg-[radial-gradient(circle_at_50%_35%,rgba(240,208,96,0.14)_0%,rgba(0,0,0,0)_66%)]',
      shadow: glow || isHover ? 'shadow-[var(--shadow-gold)]' : 'shadow-[var(--shadow-ink)]',
      text: isDisabled ? 'text-parchment-500' : isHover ? 'text-gold-100' : 'text-gold-300',
    },
    choice: {
      shell: selected || isHover ? 'border-gold-300/90 text-leather-950' : 'border-gold-500/75 text-leather-900',
      surface: selected || isHover
        ? 'bg-[linear-gradient(180deg,rgba(245,240,232,0.98)_0%,rgba(232,220,200,0.95)_60%,rgba(212,197,169,0.95)_100%)]'
        : 'bg-[linear-gradient(180deg,rgba(232,220,200,0.95)_0%,rgba(212,197,169,0.94)_55%,rgba(196,181,148,0.95)_100%)]',
      inset: selected
        ? 'bg-[radial-gradient(circle_at_24%_32%,rgba(26,15,10,0.12)_0%,rgba(26,15,10,0)_28%),radial-gradient(circle_at_78%_70%,rgba(201,168,76,0.18)_0%,rgba(201,168,76,0)_35%)]'
        : 'bg-[radial-gradient(circle_at_18%_28%,rgba(26,15,10,0.08)_0%,rgba(26,15,10,0)_24%)]',
      shadow: selected || glow ? 'shadow-[var(--shadow-gold-sm)]' : 'shadow-[var(--shadow-ink-sm)]',
      text: isDisabled ? 'text-parchment-500' : 'text-leather-900',
    },
  } as const;

  const tone = visualTone[resolvedVariant];

  if (isIcon) {
    return (
      <button
        disabled={isDisabled}
        className={`
          group relative inline-flex items-center justify-center overflow-hidden rounded-full border
          ${ICON_SIZES[size]}
          ${tone.shell} ${tone.shadow} ${tone.text}
          transition-all duration-200 ease-out
          ${isDisabled ? 'opacity-55 saturate-50' : ''}
          ${motionClass}
          ${className}
        `}
        {...rest}
      >
        <span className={`absolute inset-[2px] rounded-full ${tone.surface}`} />
        <span className={`absolute inset-[4px] rounded-full ${tone.inset}`} />
        <CircleFrame className="absolute inset-0 w-full h-full pointer-events-none text-gold-500/70 opacity-85" preserveAspectRatio="none" />
        <span className="absolute inset-[7px] rounded-full border border-gold-100/10 pointer-events-none" />
        <span className="relative z-10 inline-flex items-center justify-center text-[1.05em]">{loading ? '…' : children}</span>
      </button>
    );
  }

  return (
    <button
      disabled={isDisabled}
      className={`
        group relative inline-flex items-center justify-center overflow-hidden
        ${isChoice ? CHOICE_SIZE_STYLES[size] : SIZE_STYLES[size]}
        ${resolvedVariant === 'ghost' ? 'rounded-[10px]' : isChoice ? 'rounded-[12px]' : 'rounded-[10px] border'}
        ${commonTextClass}
        ${tone.shell} ${tone.shadow} ${tone.text}
        transition-all duration-200 ease-out
        ${isDisabled ? 'opacity-55 saturate-50' : ''}
        ${motionClass}
        ${className}
      `}
      {...rest}
    >
      {resolvedVariant !== 'ghost' && <span className={`absolute inset-0 ${tone.surface}`} />}
      <span className={`absolute inset-[1px] rounded-[inherit] ${tone.inset}`} />
      {resolvedVariant !== 'ghost' && (
        <>
          <span className="absolute left-[8px] right-[8px] top-[4px] h-px bg-parchment-50/16 pointer-events-none" />
          <span className="absolute left-[10px] right-[10px] bottom-[5px] h-px bg-leather-950/28 pointer-events-none" />
          <span className="absolute inset-[4px] rounded-[inherit] border border-gold-100/8 pointer-events-none" />
        </>
      )}
      {isChoice && (
        <>
          <span className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-leather-900/12 pointer-events-none" />
          <span className="absolute right-3 bottom-3 h-3 w-3 rounded-full bg-gold-300/10 pointer-events-none" />
          {selected && <span className="absolute right-3 top-2 text-[12px] text-gold-500/70 pointer-events-none">印</span>}
        </>
      )}
      <span className={`
        relative z-10 inline-flex items-center justify-center gap-1.5
        ${vertical ? 'writing-mode-vertical min-h-[5.5em] tracking-[0.18em]' : ''}
        ${resolvedVariant === 'ghost' ? 'px-1' : ''}
      `}>
        {leftIcon && <span className="opacity-85">{leftIcon}</span>}
        {loading ? <span className="animate-pulse tracking-[0.2em]">加载中</span> : children}
        {rightIcon && <span className="opacity-85">{rightIcon}</span>}
      </span>
    </button>
  );
}
