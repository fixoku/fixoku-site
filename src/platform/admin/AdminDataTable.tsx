import { flexRender, tableFeatures, rowSortingFeature, useTable, type ColumnDef, type SortingState } from "@tanstack/react-table";

export const adminTableFeatures = tableFeatures({ rowSortingFeature });
export type AdminTableFeatures = typeof adminTableFeatures;

type Props<T extends Record<string, any>> = { columns: ColumnDef<AdminTableFeatures, T, any>[]; data: T[]; sorting: SortingState; onSortingChange: (sorting: SortingState) => void; loading?: boolean; emptyMessage?: string };
export function AdminDataTable<T extends Record<string, any>>({ columns, data, sorting, onSortingChange, loading = false, emptyMessage = "Kayıt bulunamadı." }: Props<T>) {
  const table = useTable({ features: adminTableFeatures, data, columns, state: { sorting }, onSortingChange: (updater: any) => onSortingChange(typeof updater === "function" ? updater(sorting) : updater), manualSorting: true });
  if (loading) return <p role="status">Siparişler yükleniyor…</p>;
  if (!data.length) return <p>{emptyMessage}</p>;
  return <div className="admin-data-table-wrap"><table className="admin-data-table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{header.isPlaceholder ? null : <button type="button" disabled={!header.column.getCanSort()} onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}</button>}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getAllCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>;
}