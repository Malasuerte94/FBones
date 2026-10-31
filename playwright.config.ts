import {defineConfig} from '@playwright/test';

const port=process.env.FBONES_E2E_PORT??'4173';
const baseURL=process.env.FBONES_E2E_BASE_URL??`http://127.0.0.1:${port}`;

export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:true,
  forbidOnly:!!process.env.CI,
  retries:0,
  workers:2,
  timeout:30_000,
  globalTimeout:120_000,
  expect:{timeout:7_500},
  outputDir:'.local/playwright/test-results',
  reporter:[['list'],['html',{outputFolder:'.local/playwright/report',open:'never'}],['json',{outputFile:'.local/playwright/results.json'}]],
  use:{
    baseURL,
    viewport:{width:1440,height:900},
    locale:'en-US',
    colorScheme:'dark',
    headless:true,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    actionTimeout:7_500,
    navigationTimeout:15_000,
  },
  projects:[{name:'linux-chromium',use:{
    browserName:'chromium',
    launchOptions:{
      executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome',
      args:[
        // This system Chrome aborts HTTP navigation with
        // --disable-crashpad-for-testing; the flag was independently bisected.
        '--no-sandbox','--disable-dev-shm-usage',
        '--no-first-run','--no-default-browser-check','--disable-background-networking',
        '--use-angle=swiftshader','--enable-unsafe-swiftshader',
      ],
    },
  }}],
  webServer:{
    command:'node scripts/serve-e2e.mjs',
    url:baseURL,
    env:{FBONES_E2E_PORT:port},
    reuseExistingServer:false,
    timeout:20_000,
    stdout:'pipe',
    stderr:'pipe',
  },
});
