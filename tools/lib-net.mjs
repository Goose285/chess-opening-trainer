// Keeps the browser tests off the network for analytics: every context/page a test opens gets the GoatCounter script stubbed,
// so test runs never hit gc.zgo.at, never count as visits, and never log "failed to load resource" console errors.
const STUB = '/* GoatCounter stubbed in tests */';
const stub = (ctx) => ctx.route('**/gc.zgo.at/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB })).then(() => ctx);
export function stubAnalytics(browser) {
  const newContext = browser.newContext.bind(browser), newPage = browser.newPage.bind(browser);
  browser.newContext = async (...a) => stub(await newContext(...a));
  browser.newPage = async (...a) => { const page = await newPage(...a); await stub(page.context()); return page; };
  return browser;
}
