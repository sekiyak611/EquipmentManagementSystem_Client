# CLAUDE.md（備品管理システム：Client）

このリポジトリ（EquipmentManagementSystem_Client）は、備品管理システムの画面（React・TypeScript・MUI）。

## 1. 共通の決まり（必ず読む）

共通の決まりは、同じフォルダに並べた Document リポジトリ（EquipmentManagementSystem_Document）の `internaldesign/CLAUDE.md` にある。作業の前に必ず読み、そのとおりに作業する。次の1行で読み込んでいる。

@../EquipmentManagementSystem_Document/internaldesign/CLAUDE.md

- 共通の決まりが読み込めていない（中身が分からない）ときは、作業を始めずに人に知らせる。Document のフォルダが、このフォルダと同じ場所に並んでいるかを確かめてもらう。
- Claude Code は、Document も読み書きできるように起動する（`claude --add-dir ../EquipmentManagementSystem_Document`、または起動したあとに `/add-dir ../EquipmentManagementSystem_Document`）。詳細設計と証跡は Document に書くため。

## 2. このリポジトリだけの決まり

- フォルダの分け方は、共通の決まりの 4.3 のとおり（このリポジトリのいちばん上が、4.3 の EquipmentManagementSystem_Client/）。
- skill の名前の「frontend」（frontend-impl・frontend-test・frontend-review）は、このリポジトリの作業に使うもの（共通の決まり 4.4）。
- 画面のテスト（Playwright）では、Server も動かして確かめる（Server は同じフォルダに並んだ EquipmentManagementSystem_Server にある）。

## 3. よく使うコマンド

**最初に1回だけ**

- Node.js 24.12.0 を入れる（`node -v` で確かめる。Document の internaldesign/環境構築手順書.md の手順8。package.json の決まりは 22.22 以上だが、2人で 24.12.0 にそろえる）。PowerShell で `npm` が「デジタル署名されていません」と出たら、同じ手順8の2。
- `npm install`（部品を入れる。package.json が変わったときも動かす）。
- `npx playwright install chromium`（画面のテストで使うブラウザを入れる）。
- 画面のテストは Server も使うので、Server の準備（MySQL と secret.yml。Server の CLAUDE.md 3章）を済ませておく。

| やること | コマンド（このフォルダで） |
|---|---|
| Claude Code を起動する | `claude --add-dir ../EquipmentManagementSystem_Document` |
| 画面を開発用に起動する | `npm run dev` → ブラウザで http://localhost:5173 を開く（Server も起動しておく。/api の呼び出しは Server に回る） |
| 型を確かめる | `npm run typecheck` |
| 画面のテスト | `npx playwright test`（Vite と Server を自動で起動する。Server はテスト用の設定（equipment_test）で動く。すでに動いていれば、それを使う） |
| AWS 用に組み立てる | `npm run build`（dist にできる。そのあと Server で bootJar） |
| 共通部品の見本を見る | `npm run dev` のあと http://localhost:5173/_dev/components |

テストの証跡は、playwright-report の中身（レポート）と、test-results の中の各テストの最後の画面を、Document の `evidence/日付_種類_内容/` に写す（docs/テスト方針.md 7章）。

## 4. Gitで管理しないもの

Claude Code が .gitignore に入れる（共通の CLAUDE.md 7章）。公開してはいけないものが増えたら、.gitignore とこの表を同じ作業で直す。

| もの | 理由 |
|---|---|
| node_modules/ | npm が入れる部品 |
| dist/ | 組み立てた画面 |
| test-results/、playwright-report/、blob-report/、playwright/.cache/ | Playwright が作るもの（証跡は Document に写す） |
| .env.local、.env.*.local | 秘密の値を書くことがある Vite の各自の設定 |
| *.log | ログ |
| .project、.settings/、.vscode/、.idea/ | Eclipse・エディタの各自の設定 |
| output/ | Claude Code の作業記録（作業メモなど）を置く場所 |
| .claude/settings.local.json | Claude Code の各自の設定（.claude/settings.json は共有するので管理する） |
| Thumbs.db、desktop.ini、.DS_Store | OS が作るもの |
