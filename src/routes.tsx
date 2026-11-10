// URLと画面の対応表（CLAUDE.md 4.3、詳細設計 common.md 11.2）。
// 画面を足すときは、children に1行足す（CLAUDE.md 9章：2人で共有するファイル）。
import type { RouteObject } from 'react-router';
import { AppLayout } from './common/components/AppLayout';
import { NotFoundPage } from './common/components/NotFoundPage';
import { TopPlaceholderPage } from './common/components/TopPlaceholderPage';

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
      { index: true, Component: TopPlaceholderPage },
      ...devRoutes,
      // どの画面にも当たらないとき（ZPOP-30 でエラー画面 S-19 に置き換える）
      { path: '*', Component: NotFoundPage },
    ],
  },
];
