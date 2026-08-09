'use client';

// ThemeProvider: wrapper next-themes cho toàn app.
// - attribute="class" để match với CSS `.dark` selector trong globals.css.
// - defaultTheme="system" để tôn trọng OS preference.
// - enableSystem cho phép user chuyển sang "system" option.

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
