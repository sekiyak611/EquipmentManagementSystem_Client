// URLと画面の対応表（CLAUDE.md 4.3、詳細設計 common.md 11.2）。
// 画面を足すときは、children に1行足す（CLAUDE.md 9章：2人で共有するファイル）。
import type { RouteObject } from 'react-router';
import { RequireLogin } from './common/auth/RequireLogin';
import { AppLayout } from './common/components/AppLayout';
import { NotFoundPage } from './common/components/NotFoundPage';
import { TopPlaceholderPage } from './common/components/TopPlaceholderPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { CategoryListPage } from './features/category/pages/CategoryListPage';

/** 開発とテストのときだけ開ける画面（npm run build で組み立てた画面には入らない。common.md 11.7） */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '_dev/components',
        lazy: async () => ({ Component: (await import('./dev/ComponentSamplePage')).ComponentSamplePage }),
      },
    ]
  : [];

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    children: [
      // ログイン前に開ける画面
      { path: 'login', Component: LoginPage },
      // ログインが要る画面（ログインしていなければ /login?redirect=… に移る。画面設計 1.4）
      {
        Component: RequireLogin,
        children: [
          // 仮のトップ画面。S-05・S-07 ができたら、ログイン後の最初の画面（A-03 の homePage）に置き換える
          { index: true, Component: TopPlaceholderPage },
          { path: 'categories', Component: CategoryListPage },
        ],
      },
      ...devRoutes,
      // どの画面にも当たらないとき（ZPOP-121 でエラー画面 S-19 に置き換える）
      { path: '*', Component: NotFoundPage },
    ],
  },
];
