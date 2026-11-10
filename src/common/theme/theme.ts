// MUI のテーマ（詳細設計 common.md 11.4）
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  // スマートフォンとPCの境目は 600px（MUI の sm）。これより狭ければスマートフォンの並べ方にする
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  typography: {
    // 日本語が読みやすい字体を、PCにあるものから順に使う
    fontFamily: [
      '"Hiragino Sans"',
      '"Hiragino Kaku Gothic ProN"',
      '"Noto Sans JP"',
      'Meiryo',
      'sans-serif',
    ].join(','),
    button: {
      // ボタンの文字を大文字にしない
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        // 指で押しやすい大きさにする（画面一覧 7章）
        root: { minHeight: 44 },
      },
    },
  },
});
