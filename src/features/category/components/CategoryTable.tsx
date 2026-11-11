// 種別の一覧の表（画面設計 16章、詳細設計 category/S-13_種別管理.md 3章）
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { orDash } from '../../../common/format/format';
import type { CategoryResponse } from '../types';

/** 使っている備品があって消せないときの文（画面設計 16章） */
export const IN_USE_MESSAGE = 'この種別の備品があるため削除できません';

type CategoryTableProps = {
  /** サーバーが返した順（頭文字の順、頭文字がないものは後ろに名前の順）のまま出す */
  categories: CategoryResponse[];
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
};

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  return (
    // PCだけの画面だが、狭い画面で開いても画面全体は横にスクロールさせず、表だけを横にスクロールする
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" data-testid="category-table">
        <TableHead>
          <TableRow>
            <TableCell>名前</TableCell>
            <TableCell>頭文字</TableCell>
            <TableCell align="right">使っている備品の数</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map((category) => {
            const inUse = category.equipmentCount > 0;
            return (
              <TableRow key={category.id} data-testid="category-row">
                <TableCell>{category.name}</TableCell>
                <TableCell>{orDash(category.initial)}</TableCell>
                <TableCell align="right">{category.equipmentCount}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => onEdit(category)}>
                      変更
                    </Button>
                    {/* 使っている備品が1つでもあれば押せなくする（画面設計 16章） */}
                    <Button variant="outlined" color="error" disabled={inUse} onClick={() => onDelete(category)}>
                      削除
                    </Button>
                  </Stack>
                  {inUse && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {IN_USE_MESSAGE}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
