import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

/**
 * Premium branded empty state — reusable across the app.
 *
 * @param {React.ElementType} icon - Lucide icon component
 * @param {string} title - Main heading
 * @param {string} description - Supporting text
 * @param {string} [primaryLabel] - Primary CTA text
 * @param {string} [primaryTo] - Primary CTA link (internal)
 * @param {Function} [primaryOnClick] - Primary CTA click handler (alternative to primaryTo)
 * @param {string} [secondaryLabel] - Secondary CTA text
 * @param {string} [secondaryTo] - Secondary CTA link
 * @param {Function} [secondaryOnClick] - Secondary CTA click handler
 * @param {React.ReactNode} [children] - Extra content below CTAs
 * @param {string} [accent] - Gradient accent class
 * @param {string} [badge] - Small badge text above title
 * @param {'default'|'compact'} [size] - Visual density (compact for nested sections)
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  primaryLabel,
  primaryTo,
  primaryOnClick,
  secondaryLabel,
  secondaryTo,
  secondaryOnClick,
  children,
  accent = 'from-primary/15 via-violet-500/10 to-blue-500/10',
  badge,
  size = 'default',
  className = '',
}) => {
  const compact = size === 'compact';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center animate-fade-in-up ${
        compact ? 'py-10 px-4' : 'py-16 px-6'
      } ${className}`}
    >
      {/* Illustration */}
      <div
        className={`relative mx-auto ${
          compact ? 'mb-5 h-24 w-24 sm:h-28 sm:w-28' : 'mb-8 h-36 w-36 sm:h-40 sm:w-40'
        }`}
      >
        <div
          className={`absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-gradient-to-br ${accent} blur-2xl`}
        />
        {!compact && (
          <div className="absolute inset-4 rounded-full border border-dashed border-border/60 opacity-50" />
        )}
        <div className="relative flex h-full w-full items-center justify-center">
          <div
            className={`flex items-center justify-center border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 shadow-xl shadow-primary/5 ring-1 ring-white/20 dark:ring-white/5 ${
              compact
                ? 'h-16 w-16 sm:h-18 sm:w-18 rounded-2xl'
                : 'h-24 w-24 sm:h-28 sm:w-28 rounded-[2rem]'
            }`}
          >
            {Icon && (
              <Icon
                className={`text-muted-foreground/50 ${
                  compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-10 w-10 sm:h-12 sm:w-12'
                }`}
                strokeWidth={1.15}
              />
            )}
          </div>
        </div>
      </div>

      {/* Badge */}
      {badge && (
        <p
          className={`font-semibold uppercase tracking-widest text-muted-foreground/60 ${
            compact ? 'mb-1.5 text-[10px]' : 'mb-2 text-xs'
          }`}
        >
          {badge}
        </p>
      )}

      {/* Text */}
      <h2
        className={`font-bold tracking-tight text-foreground ${
          compact ? 'mb-1.5 text-lg sm:text-xl' : 'mb-2.5 text-2xl sm:text-3xl'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mx-auto leading-relaxed text-muted-foreground ${
            compact
              ? 'mb-5 max-w-xs text-sm'
              : 'mb-8 max-w-sm text-sm sm:text-base'
          }`}
        >
          {description}
        </p>
      )}

      {/* CTAs */}
      {(primaryLabel || secondaryLabel) && (
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {primaryLabel &&
            (primaryTo ? (
              <Button
                asChild
                size={compact ? 'default' : 'lg'}
                className={`rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 ${
                  compact
                    ? 'h-10 px-5 text-sm'
                    : 'h-11 sm:h-12 px-7 sm:px-8 text-sm sm:text-base'
                }`}
              >
                <Link to={primaryTo}>{primaryLabel}</Link>
              </Button>
            ) : (
              <Button
                size={compact ? 'default' : 'lg'}
                onClick={primaryOnClick}
                className={`rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 ${
                  compact
                    ? 'h-10 px-5 text-sm'
                    : 'h-11 sm:h-12 px-7 sm:px-8 text-sm sm:text-base'
                }`}
              >
                {primaryLabel}
              </Button>
            ))}

          {secondaryLabel &&
            (secondaryTo ? (
              <Button
                asChild
                variant="outline"
                size={compact ? 'default' : 'lg'}
                className={`rounded-2xl border-border/70 bg-card/50 backdrop-blur-sm transition-all hover:bg-card ${
                  compact ? 'h-10 px-5 text-sm' : 'h-11 sm:h-12 px-7 sm:px-8'
                }`}
              >
                <Link to={secondaryTo}>{secondaryLabel}</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size={compact ? 'default' : 'lg'}
                onClick={secondaryOnClick}
                className={`rounded-2xl border-border/70 bg-card/50 backdrop-blur-sm transition-all hover:bg-card ${
                  compact ? 'h-10 px-5 text-sm' : 'h-11 sm:h-12 px-7 sm:px-8'
                }`}
              >
                {secondaryLabel}
              </Button>
            ))}
        </div>
      )}

      {/* Extra content */}
      {children}
    </div>
  );
};

export default EmptyState;
