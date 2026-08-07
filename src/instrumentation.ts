// Next.js 16 instrumentation hook. Runs once at server startup.
// Phase 25 URL strategy: locale đã được paraglideMiddleware (proxy.ts) resolve
// từ URL prefix qua AsyncLocalStorage, RSC render dùng locale đó. Không cần
// override getLocale qua cookie vì:
// - server getLocale() returns AsyncLocalStorage.getStore().locale (set bởi paraglide).
// - Cookie chỉ là hint cho client init.
//
// File này giữ để Next.js hook load; nội dung trống vì không cần setup runtime.
export async function register(): Promise<void> {
  // Intentionally empty — paraglide runtime handles locale via proxy.ts + AsyncLocalStorage.
}