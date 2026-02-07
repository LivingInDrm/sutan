import React from 'react';
import { BtnPrimary, BtnSecondary, BtnConfirm, CircleFrame } from './svg';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'confirm';
type ButtonSize = 'sm' | 'md' | 'lg';

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-5 py-2 text-sm',
  lg: 'px-8 py-3 text-base',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const SVG_MAP: Partial<Record<ButtonVariant, React.FC<React.SVGProps<SVGSVGElement>>>> = {
  primary: BtnPrimary,
  secondary: BtnSecondary,
  confirm: BtnConfirm,
  icon: CircleFrame,
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  glow?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  glow = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const SvgBg = SVG_MAP[variant];
  const isIcon = variant === 'icon';

  if (isIcon) {
    return (
      <button
        disabled={disabled || loading}
        className={`
          relative inline-flex items-center justify-center
          ${ICON_SIZES[size]}
          text-gold transition-all duration-200
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-gold-bright active:scale-[0.97] cursor-pointer'}
          ${glow ? 'drop-shadow-[0_0_8px_rgba(201,168,76,0.3)]' : ''}
          ${className}
        `}
        {...rest}
      >
        {SvgBg && (
          <SvgBg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          />
        )}
        <span className="relative z-10">{children}</span>
      </button>
    );
  }

  if (variant === 'ghost') {
    return (
      <button
        disabled={disabled || loading}
        className={`
          inline-flex items-center gap-1.5 font-bold
          ${SIZE_STYLES[size]}
          text-gold transition-all duration-200
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-gold-bright active:scale-[0.97] cursor-pointer'}
          ${className}
        `}
        {...rest}
      >
        {leftIcon && <span>{leftIcon}</span>}
        {children}
        {rightIcon && <span>{rightIcon}</span>}
      </button>
    );
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center gap-1.5 font-bold
        ${SIZE_STYLES[size]}
        text-gold transition-all duration-200
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-gold-bright active:scale-[0.97] cursor-pointer'}
        ${glow ? 'drop-shadow-[0_0_8px_rgba(201,168,76,0.3)]' : ''}
        ${className}
      `}
      {...rest}
    >
      {SvgBg && (
        <SvgBg
          className="absolute inset-0 w-full h-full text-gold-dim/70 pointer-events-none"
          preserveAspectRatio="none"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {leftIcon && <span>{leftIcon}</span>}
        {loading ? <span className="animate-pulse">...</span> : children}
        {rightIcon && <span>{rightIcon}</span>}
      </span>
    </button>
  );
}
