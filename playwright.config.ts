// 画面のテストの設定（詳細設計 common.md 11.7、テスト方針 5章）
import { defineConfig, devices } from '@playwright/test';

// Server（隣のフォルダ）を起動するコマンド。Windows とそれ以外で、gradlew の名前が違う
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

export default defineConfig({
  testDir: './tests',
  // 同じサーバーとデータベースを使うので、1つずつ順番に動かす
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    // 各テストの最後の画面を残す。失敗したテストは操作の記録（トレース）も残す
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  // スマートフォンとPCの2つの大きさで動かす（画面一覧 7章）
  projects: [
    { name: 'smartphone', use: { ...devices['Pixel 7'] } },
    { name: 'pc', use: { ...devices['Desktop Chrome'] } },
  ],
  // テストの前に、画面（Vite）とサーバー（Spring Boot。test の設定）を起動する。すでに動いていれば、それを使う
  webServer: [
    {
      command: `${gradlew} bootRun`,
      cwd: '../EquipmentManagementSystem_Server',
      url: 'http://localhost:8080/api/health',
      env: { SPRING_PROFILES_ACTIVE: 'test' },
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
