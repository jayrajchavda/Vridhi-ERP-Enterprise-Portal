/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Brand — Sky blue
        brand: {
          50:  'hsl(204,100%,97%)',
          100: 'hsl(204,94%,94%)',
          200: 'hsl(201,94%,86%)',
          300: 'hsl(199,95%,74%)',
          400: 'hsl(198,93%,60%)',
          500: 'hsl(199,89%,48%)',
          600: 'hsl(200,98%,39%)',
          700: 'hsl(201,96%,32%)',
          800: 'hsl(201,90%,27%)',
          900: 'hsl(202,80%,24%)',
        },
        // Semantic status
        success:  { DEFAULT: 'hsl(142,71%,45%)', light: 'hsl(142,76%,95%)', dark: 'hsl(142,71%,32%)' },
        warning:  { DEFAULT: 'hsl(38,92%,50%)',  light: 'hsl(48,96%,95%)',  dark: 'hsl(32,95%,44%)' },
        danger:   { DEFAULT: 'hsl(0,84%,60%)',   light: 'hsl(0,86%,97%)',   dark: 'hsl(0,72%,51%)' },
        info:     { DEFAULT: 'hsl(217,91%,60%)', light: 'hsl(214,100%,96%)',dark: 'hsl(224,76%,48%)' },
        // shadcn/ui CSS-variable based tokens
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary:    { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:  { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted:      { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:     { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive:{ DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        card:       { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover:    { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        sidebar:    { DEFAULT: 'hsl(var(--sidebar))', foreground: 'hsl(var(--sidebar-foreground))', border: 'hsl(var(--sidebar-border))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':        { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'pulse-subtle':   { '0%,100%': { opacity: '1' }, '50%': { opacity: '.7' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.25s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'pulse-subtle':   'pulse-subtle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
