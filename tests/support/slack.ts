// 画面のテストで、送ったDMを確かめる部品。
// テストのとき、Server は Slack に送らず、偽物（FakeSlackSender）が記録する。その記録を読み出す・空にする API
// （GET・DELETE /api/test-support/slack-messages。詳細設計 common.md 3.13）を呼ぶ。本番・開発では動かない。
import type { APIRequestContext } from '@playwright/test';

/** 偽物の Slack が記録した、送ったDM 1通 */
export type SentSlackMessage = {
  email: string;
  title: string;
  body: string;
  sentAt: string;
};

/** 記録を空にする */
export async function clearSlackMessages(request: APIRequestContext): Promise<void> {
  const response = await request.delete('/api/test-support/slack-messages');
  if (!response.ok()) {
    throw new Error(`送ったDMの記録を空にできませんでした（${response.status()}）`);
  }
}

/** 送ったDMの一覧（古い順） */
export async function getSlackMessages(request: APIRequestContext): Promise<SentSlackMessage[]> {
  const response = await request.get('/api/test-support/slack-messages');
  if (!response.ok()) {
    throw new Error(`送ったDMの記録を読めませんでした（${response.status()}）`);
  }
  const json = (await response.json()) as { data: { messages: SentSlackMessage[] } };
  return json.data.messages;
}

/** DMの本文から、パスワード設定用のリンクの合言葉（`/password-set?token=` の後ろ）を取り出す */
export function tokenFromMessage(message: SentSlackMessage): string {
  const found = /\/password-set\?token=([A-Za-z0-9_-]+)/.exec(message.body);
  if (!found) {
    throw new Error('DMの本文に、パスワード設定用のリンクがありません');
  }
  return found[1];
}
