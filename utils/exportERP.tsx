// lib/exportERP.ts
// ERP Dashboard Export — Excel + PDF
// Generates Expense Summary (GIS) or Item Net Summary reports
// with light/dark theming, org info, and profit/loss chart data
//
// Install:
//   npx expo install expo-sharing expo-file-system expo-print
//   npm install exceljs

import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

const { cacheDirectory, writeAsStringAsync, moveAsync, EncodingType } =
  FileSystem;
import type { GISRow, SummaryRow } from '@/data/SummaryData';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportTable = 'expense' | 'itemnet';
export type ExportTheme = 'light' | 'dark';

export interface ExportConfig {
  table: ExportTable;
  theme: ExportTheme;
  fullName: string;
  organization: string;
  dateLabel: string; // e.g. "Last 6 Months", "March 2026"
  gisRows: GISRow[];
  summaryRows: SummaryRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₱' +
  Math.abs(n).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────

export async function exportERPExcel(cfg: ExportConfig): Promise<void> {
  const ExcelJS = require('exceljs/dist/exceljs.bare.min.js');

  // ── Theme palette ───────────────────────────────────────────────────────────
  const isDark = cfg.theme === 'dark';
  const BG = isDark ? '0D1B2E' : 'F5F7FA';
  const SURFACE = isDark ? '162D52' : 'FFFFFF';
  const SURFACE2 = isDark ? '1B3A6B' : 'EEF2F8';
  const NAVY = '1B3A6B';
  const ORANGE = 'E87722';
  const WHITE = isDark ? 'F0F4FF' : '1B3A6B';
  const MUTED = isDark ? 'A8B8D8' : '5A6A85';
  const BORDER = isDark ? '2A4A7F' : 'D6DCE8';
  const SUCCESS = isDark ? '34D399' : '10B981';
  const ERROR = isDark ? 'F87171' : 'EF4444';
  const HEADER_BG = isDark ? NAVY : NAVY;
  const HEADER_FG = 'FFFFFF';

  const solid = (argb: string) => ({
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  });
  const font = (argb: string, bold = false, size = 10) => ({
    color: { argb },
    bold,
    size,
    name: 'Calibri',
  });
  const thin = (argb: string) => ({ style: 'thin', color: { argb } });
  const allBorders = (argb: string) => ({
    top: thin(argb),
    bottom: thin(argb),
    left: thin(argb),
    right: thin(argb),
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'KompraPOS ERP';
  wb.created = new Date();

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 1 — GIS / EXPENSE SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  if (cfg.table === 'expense') {
    const ws = wb.addWorksheet('Expense Summary', {
      properties: { tabColor: { argb: ORANGE } },
      views: [{ showGridLines: false, state: 'frozen', ySplit: 5 }],
    });
    ws.columns = [
      { key: 'a', width: 14 }, // Main
      { key: 'b', width: 18 }, // Group
      { key: 'c', width: 38 }, // Description
      { key: 'd', width: 16 }, // Debit
      { key: 'e', width: 16 }, // Credit
      { key: 'f', width: 18 }, // Total
    ];

    // ── Orange top strip ──────────────────────────────────────────────────
    let r = 1;
    ws.getRow(r).height = 8;
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(ORANGE);
    });
    r++;

    // ── Title row ─────────────────────────────────────────────────────────
    ws.getRow(r).height = 46;
    ws.mergeCells(r, 1, r, 4);
    ws.getCell(r, 1).value = 'KompraPOS ERP — Expense Summary';
    ws.getCell(r, 1).font = {
      bold: true,
      size: 18,
      color: { argb: ORANGE },
      name: 'Calibri',
    };
    ws.getCell(r, 1).fill = solid(isDark ? NAVY : 'FFFFFF');
    ws.getCell(r, 1).alignment = {
      vertical: 'middle',
      horizontal: 'left',
      indent: 1,
    };
    ws.mergeCells(r, 5, r, 6);
    ws.getCell(r, 5).value = cfg.dateLabel;
    ws.getCell(r, 5).font = font(ORANGE, true, 12);
    ws.getCell(r, 5).fill = solid(isDark ? NAVY : 'FFFFFF');
    ws.getCell(r, 5).alignment = { vertical: 'middle', horizontal: 'right' };
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).border = {
        bottom: { style: 'medium', color: { argb: ORANGE } },
      };
    });
    r++;

    // ── Org info ──────────────────────────────────────────────────────────
    ws.getRow(r).height = 24;
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(SURFACE2);
      ws.getCell(r, c).border = { bottom: thin(BORDER) };
    });
    ws.mergeCells(r, 1, r, 3);
    ws.getCell(r, 1).value =
      `${cfg.organization}   ·   Prepared by: ${cfg.fullName}`;
    ws.getCell(r, 1).font = font(MUTED, false, 10);
    ws.getCell(r, 1).alignment = { vertical: 'middle', indent: 1 };
    ws.mergeCells(r, 4, r, 6);
    ws.getCell(r, 4).value =
      `Generated: ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    ws.getCell(r, 4).font = font(MUTED, false, 10);
    ws.getCell(r, 4).alignment = { vertical: 'middle', horizontal: 'right' };
    r++;

    // ── Spacer ────────────────────────────────────────────────────────────
    ws.getRow(r).height = 6;
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(BG);
      ws.getCell(r, c).border = {};
    });
    r++;

    // ── Column headers ────────────────────────────────────────────────────
    ws.getRow(r).height = 30;
    const gisHeaders = [
      'MAIN',
      'GROUP',
      'DESCRIPTION',
      'DEBIT',
      'CREDIT',
      'TOTAL',
    ];
    const gisAligns = ['left', 'left', 'left', 'right', 'right', 'right'];
    gisHeaders.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = h;
      cell.fill = solid(HEADER_BG);
      cell.font = {
        color: { argb: HEADER_FG },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      cell.alignment = {
        horizontal: gisAligns[i] as any,
        vertical: 'middle',
        indent: i < 3 ? 1 : 0,
      };
      cell.border = { bottom: { style: 'medium', color: { argb: ORANGE } } };
    });
    r++;

    // ── Data rows ─────────────────────────────────────────────────────────
    cfg.gisRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? SURFACE : SURFACE2;
      const isInc = row.main === 'Income';
      ws.getRow(r).height = 22;

      ws.getCell(r, 1).value = row.main;
      ws.getCell(r, 1).font = {
        color: { argb: isInc ? SUCCESS : ERROR },
        bold: true,
        size: 11,
        name: 'Calibri',
      };
      ws.getCell(r, 1).alignment = { vertical: 'middle', indent: 1 };

      ws.getCell(r, 2).value = row.group;
      ws.getCell(r, 2).font = font(MUTED, false, 10);
      ws.getCell(r, 2).alignment = { vertical: 'middle', indent: 1 };

      ws.getCell(r, 3).value = row.description;
      ws.getCell(r, 3).font = font(WHITE, false, 10);
      ws.getCell(r, 3).alignment = { vertical: 'middle', indent: 1 };

      ws.getCell(r, 4).value = row.debit > 0 ? row.debit : null;
      ws.getCell(r, 4).font = {
        color: { argb: row.debit > 0 ? ERROR : MUTED },
        bold: false,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 4).numFmt = '₱#,##0.00';
      ws.getCell(r, 4).alignment = { horizontal: 'right', vertical: 'middle' };

      ws.getCell(r, 5).value = row.credit > 0 ? row.credit : null;
      ws.getCell(r, 5).font = {
        color: { argb: row.credit > 0 ? SUCCESS : MUTED },
        bold: false,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 5).numFmt = '₱#,##0.00';
      ws.getCell(r, 5).alignment = { horizontal: 'right', vertical: 'middle' };

      ws.getCell(r, 6).value = row.total;
      ws.getCell(r, 6).font = {
        color: { argb: row.total >= 0 ? SUCCESS : ERROR },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 6).numFmt = '₱#,##0.00';
      ws.getCell(r, 6).alignment = { horizontal: 'right', vertical: 'middle' };

      [1, 2, 3, 4, 5, 6].forEach((c) => {
        ws.getCell(r, c).fill = solid(bg);
        ws.getCell(r, c).border = { bottom: thin(BORDER) };
      });
      r++;
    });

    // ── Totals footer ─────────────────────────────────────────────────────
    const totalCredit = cfg.gisRows.reduce((s, x) => s + x.credit, 0);
    const totalDebit = cfg.gisRows.reduce((s, x) => s + x.debit, 0);
    const netIncome = totalCredit - totalDebit;

    ws.getRow(r).height = 30;
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(isDark ? NAVY : 'E8EDF5');
      ws.getCell(r, c).border = {
        top: { style: 'medium', color: { argb: NAVY } },
      };
    });
    ws.getCell(r, 3).value = 'NET INCOME / (LOSS)';
    ws.getCell(r, 3).font = {
      bold: true,
      size: 11,
      color: { argb: WHITE },
      name: 'Calibri',
    };
    ws.getCell(r, 3).alignment = { vertical: 'middle', indent: 1 };
    ws.getCell(r, 4).value = totalDebit;
    ws.getCell(r, 4).font = {
      color: { argb: ERROR },
      bold: true,
      size: 11,
      name: 'Calibri',
    };
    ws.getCell(r, 4).numFmt = '₱#,##0.00';
    ws.getCell(r, 4).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(r, 5).value = totalCredit;
    ws.getCell(r, 5).font = {
      color: { argb: SUCCESS },
      bold: true,
      size: 11,
      name: 'Calibri',
    };
    ws.getCell(r, 5).numFmt = '₱#,##0.00';
    ws.getCell(r, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(r, 6).value = netIncome;
    ws.getCell(r, 6).font = {
      color: { argb: netIncome >= 0 ? SUCCESS : ERROR },
      bold: true,
      size: 13,
      name: 'Calibri',
    };
    ws.getCell(r, 6).numFmt = '₱#,##0.00';
    ws.getCell(r, 6).alignment = { horizontal: 'right', vertical: 'middle' };
    r += 2;

    // ── Income vs Expenses summary for chart ──────────────────────────────
    ws.getRow(r).height = 24;
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(SURFACE2);
      ws.getCell(r, c).border = {};
    });
    ws.getCell(r, 1).value = 'INCOME vs EXPENSES — by Group';
    ws.getCell(r, 1).font = font(ORANGE, true, 11);
    ws.getCell(r, 1).alignment = { vertical: 'middle', indent: 1 };
    r++;

    // Group totals
    const groups: Record<string, { income: number; expense: number }> = {};
    cfg.gisRows.forEach((row) => {
      if (!groups[row.group]) groups[row.group] = { income: 0, expense: 0 };
      if (row.main === 'Income') groups[row.group].income += row.credit;
      else groups[row.group].expense += row.debit;
    });

    ws.getRow(r).height = 26;
    ['GROUP', 'INCOME', 'EXPENSES', 'NET'].forEach((h, i) => {
      ws.getCell(r, i + 1).value = h;
      ws.getCell(r, i + 1).fill = solid(HEADER_BG);
      ws.getCell(r, i + 1).font = {
        color: { argb: HEADER_FG },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, i + 1).alignment = {
        horizontal: i > 0 ? 'right' : 'left',
        vertical: 'middle',
        indent: i === 0 ? 1 : 0,
      };
      ws.getCell(r, i + 1).border = {
        bottom: { style: 'medium', color: { argb: ORANGE } },
      };
    });
    [5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(HEADER_BG);
    });
    r++;

    Object.entries(groups).forEach(([group, vals], idx) => {
      const bg = idx % 2 === 0 ? SURFACE : SURFACE2;
      const net = vals.income - vals.expense;
      ws.getRow(r).height = 22;
      ws.getCell(r, 1).value = group;
      ws.getCell(r, 1).font = font(WHITE, false, 10);
      ws.getCell(r, 1).alignment = { vertical: 'middle', indent: 1 };
      ws.getCell(r, 2).value = vals.income || null;
      ws.getCell(r, 2).font = {
        color: { argb: SUCCESS },
        bold: false,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 2).numFmt = '₱#,##0.00';
      ws.getCell(r, 2).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(r, 3).value = vals.expense || null;
      ws.getCell(r, 3).font = {
        color: { argb: ERROR },
        bold: false,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 3).numFmt = '₱#,##0.00';
      ws.getCell(r, 3).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(r, 4).value = net;
      ws.getCell(r, 4).font = {
        color: { argb: net >= 0 ? SUCCESS : ERROR },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 4).numFmt = '₱#,##0.00';
      ws.getCell(r, 4).alignment = { horizontal: 'right', vertical: 'middle' };
      [1, 2, 3, 4, 5, 6].forEach((c) => {
        ws.getCell(r, c).fill = solid(bg);
        ws.getCell(r, c).border = { bottom: thin(BORDER) };
      });
      r++;
    });

    // ── Bottom strip ──────────────────────────────────────────────────────
    ws.getRow(r).height = 8;
    [1, 2, 3, 4, 5, 6].forEach((c) => {
      ws.getCell(r, c).fill = solid(NAVY);
    });
  } else {
    // ──────────────────────────────────────────────────────────────────────
    // SHEET 1 — ITEM NET SUMMARY
    // ──────────────────────────────────────────────────────────────────────
    const ws = wb.addWorksheet('Item Net Summary', {
      properties: { tabColor: { argb: NAVY } },
      views: [{ showGridLines: false, state: 'frozen', ySplit: 5 }],
    });
    ws.columns = [
      { key: 'a', width: 16 }, // Item Code
      { key: 'b', width: 34 }, // Description
      { key: 'c', width: 10 }, // OpEx %
      { key: 'd', width: 16 }, // Computed Cost
      { key: 'e', width: 18 }, // Cost Contribution
      { key: 'f', width: 16 }, // Selling Price
      { key: 'g', width: 14 }, // Profit
      { key: 'h', width: 10 }, // Margin %
    ];

    let r = 1;
    ws.getRow(r).height = 8;
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      ws.getCell(r, c).fill = solid(NAVY);
    });
    r++;

    ws.getRow(r).height = 46;
    ws.mergeCells(r, 1, r, 5);
    ws.getCell(r, 1).value = 'KompraPOS ERP — Item Net Summary';
    ws.getCell(r, 1).font = {
      bold: true,
      size: 18,
      color: { argb: NAVY },
      name: 'Calibri',
    };
    ws.getCell(r, 1).fill = solid(isDark ? '0D1B2E' : 'FFFFFF');
    ws.getCell(r, 1).alignment = {
      vertical: 'middle',
      horizontal: 'left',
      indent: 1,
    };
    ws.mergeCells(r, 6, r, 8);
    ws.getCell(r, 6).value = cfg.dateLabel;
    ws.getCell(r, 6).font = font(NAVY, true, 12);
    ws.getCell(r, 6).fill = solid(isDark ? '0D1B2E' : 'FFFFFF');
    ws.getCell(r, 6).alignment = { vertical: 'middle', horizontal: 'right' };
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      ws.getCell(r, c).border = {
        bottom: { style: 'medium', color: { argb: NAVY } },
      };
    });
    r++;

    ws.getRow(r).height = 24;
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      ws.getCell(r, c).fill = solid(SURFACE2);
      ws.getCell(r, c).border = { bottom: thin(BORDER) };
    });
    ws.mergeCells(r, 1, r, 5);
    ws.getCell(r, 1).value =
      `${cfg.organization}   ·   Prepared by: ${cfg.fullName}`;
    ws.getCell(r, 1).font = font(MUTED, false, 10);
    ws.getCell(r, 1).alignment = { vertical: 'middle', indent: 1 };
    ws.mergeCells(r, 6, r, 8);
    ws.getCell(r, 6).value =
      `Generated: ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    ws.getCell(r, 6).font = font(MUTED, false, 10);
    ws.getCell(r, 6).alignment = { vertical: 'middle', horizontal: 'right' };
    r++;

    ws.getRow(r).height = 6;
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      ws.getCell(r, c).fill = solid(BG);
      ws.getCell(r, c).border = {};
    });
    r++;

    const smHeaders = [
      'ITEM CODE',
      'DESCRIPTION',
      'OPEX %',
      'COMP. COST',
      'COST CONTRIB.',
      'SELL PRICE',
      'PROFIT',
      'MARGIN %',
    ];
    const smAligns = [
      'left',
      'left',
      'center',
      'right',
      'right',
      'right',
      'right',
      'right',
    ];
    ws.getRow(r).height = 30;
    smHeaders.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = h;
      cell.fill = solid(HEADER_BG);
      cell.font = {
        color: { argb: HEADER_FG },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      cell.alignment = {
        horizontal: smAligns[i] as any,
        vertical: 'middle',
        indent: i < 2 ? 1 : 0,
      };
      cell.border = { bottom: { style: 'medium', color: { argb: NAVY } } };
    });
    r++;

    cfg.summaryRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? SURFACE : SURFACE2;
      const profit = row.sellingPrice - row.costContribution;
      const margin =
        row.sellingPrice > 0 ? (profit / row.sellingPrice) * 100 : 0;
      const itemPct =
        row.sellingPrice > 0
          ? (row.costContribution / row.sellingPrice) * 100
          : 0;

      ws.getRow(r).height = 22;
      ws.getCell(r, 1).value = row.itemCode;
      ws.getCell(r, 1).font = {
        color: { argb: MUTED },
        size: 9,
        name: 'Courier New',
      };
      ws.getCell(r, 1).alignment = { vertical: 'middle', indent: 1 };

      ws.getCell(r, 2).value = row.description;
      ws.getCell(r, 2).font = font(WHITE, false, 10);
      ws.getCell(r, 2).alignment = { vertical: 'middle', indent: 1 };

      ws.getCell(r, 3).value = `${(row.opExPct * 100).toFixed(0)}%`;
      ws.getCell(r, 3).font = font(ORANGE, false, 10);
      ws.getCell(r, 3).alignment = { horizontal: 'center', vertical: 'middle' };

      [
        [4, row.computedCost, MUTED],
        [5, row.costContribution, MUTED],
        [6, row.sellingPrice, WHITE],
      ].forEach(([col, val, color]) => {
        ws.getCell(r, col as number).value = val;
        ws.getCell(r, col as number).font = {
          color: { argb: color as string },
          bold: false,
          size: 10,
          name: 'Calibri',
        };
        ws.getCell(r, col as number).numFmt = '₱#,##0.00';
        ws.getCell(r, col as number).alignment = {
          horizontal: 'right',
          vertical: 'middle',
        };
      });

      ws.getCell(r, 7).value = profit;
      ws.getCell(r, 7).font = {
        color: { argb: profit >= 0 ? SUCCESS : ERROR },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 7).numFmt = '₱#,##0.00';
      ws.getCell(r, 7).alignment = { horizontal: 'right', vertical: 'middle' };

      ws.getCell(r, 8).value = `${margin.toFixed(1)}%`;
      ws.getCell(r, 8).font = {
        color: { argb: margin >= 0 ? SUCCESS : ERROR },
        bold: true,
        size: 10,
        name: 'Calibri',
      };
      ws.getCell(r, 8).alignment = { horizontal: 'right', vertical: 'middle' };

      [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
        ws.getCell(r, c).fill = solid(bg);
        ws.getCell(r, c).border = { bottom: thin(BORDER) };
      });
      r++;
    });

    // Totals
    const totalSales = cfg.summaryRows.reduce((s, x) => s + x.sellingPrice, 0);
    const totalContrib = cfg.summaryRows.reduce(
      (s, x) => s + x.costContribution,
      0,
    );
    const totalProfit = totalSales - totalContrib;
    const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    ws.getRow(r).height = 30;
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      ws.getCell(r, c).fill = solid(isDark ? NAVY : 'E8EDF5');
      ws.getCell(r, c).border = {
        top: { style: 'medium', color: { argb: NAVY } },
      };
    });
    ws.getCell(r, 2).value = 'TOTAL';
    ws.getCell(r, 2).font = {
      bold: true,
      size: 11,
      color: { argb: WHITE },
      name: 'Calibri',
    };
    ws.getCell(r, 2).alignment = { vertical: 'middle', indent: 1 };
    ws.getCell(r, 5).value = totalContrib;
    ws.getCell(r, 5).numFmt = '₱#,##0.00';
    ws.getCell(r, 5).font = font(MUTED, true, 11);
    ws.getCell(r, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(r, 6).value = totalSales;
    ws.getCell(r, 6).numFmt = '₱#,##0.00';
    ws.getCell(r, 6).font = font(WHITE, true, 11);
    ws.getCell(r, 6).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(r, 7).value = totalProfit;
    ws.getCell(r, 7).numFmt = '₱#,##0.00';
    ws.getCell(r, 7).font = {
      color: { argb: totalProfit >= 0 ? SUCCESS : ERROR },
      bold: true,
      size: 13,
      name: 'Calibri',
    };
    ws.getCell(r, 7).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(r, 8).value = `${avgMargin.toFixed(1)}%`;
    ws.getCell(r, 8).font = {
      color: { argb: avgMargin >= 0 ? SUCCESS : ERROR },
      bold: true,
      size: 13,
      name: 'Calibri',
    };
    ws.getCell(r, 8).alignment = { horizontal: 'right', vertical: 'middle' };
    r += 2;

    ws.getRow(r).height = 8;
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      ws.getCell(r, c).fill = solid(NAVY);
    });
  }

  // ── Write & share ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const label = cfg.table === 'expense' ? 'ExpenseSummary' : 'ItemNetSummary';
  const safe = cfg.dateLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `KompraPOS_ERP_${label}_${safe}.xlsx`;

  if (Platform.OS === 'web') {
    // Web: Use Blob and download
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Native: Use FileSystem and Sharing
    const b64 = buffer.toString('base64');
    const path = `${cacheDirectory}${fileName}`;
    await writeAsStringAsync(path, b64, { encoding: EncodingType.Base64 });
    try {
      await Sharing.shareAsync(path, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `KompraPOS ERP — ${label}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (_) {}
  }
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────

export async function exportERPPDF(cfg: ExportConfig): Promise<void> {
  const isDark = cfg.theme === 'dark';
  const BG = isDark ? '#0D1B2E' : '#F5F7FA';
  const CARD = isDark ? '#162D52' : '#FFFFFF';
  const TEXT = isDark ? '#F0F4FF' : '#1B3A6B';
  const MUTED = isDark ? '#A8B8D8' : '#5A6A85';
  const BORDER = isDark ? '#2A4A7F' : '#D6DCE8';
  const SUCCESS = isDark ? '#34D399' : '#10B981';
  const ERROR = isDark ? '#F87171' : '#EF4444';
  const NAVY = '#1B3A6B';
  const ORANGE = '#E87722';

  const fmt2 = (n: number) =>
    '₱' +
    Math.abs(n).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  let tableHTML = '';
  let chartHTML = '';

  if (cfg.table === 'expense') {
    const totalCredit = cfg.gisRows.reduce((s, x) => s + x.credit, 0);
    const totalDebit = cfg.gisRows.reduce((s, x) => s + x.debit, 0);
    const net = totalCredit - totalDebit;

    // Chart bars — income groups vs expense groups
    const groups: Record<string, { income: number; expense: number }> = {};
    cfg.gisRows.forEach((row) => {
      if (!groups[row.group]) groups[row.group] = { income: 0, expense: 0 };
      if (row.main === 'Income') groups[row.group].income += row.credit;
      else groups[row.group].expense += row.debit;
    });
    const maxVal = Math.max(
      ...Object.values(groups).flatMap((g) => [g.income, g.expense]),
    );

    chartHTML = `
      <div class="section-title">Income vs Expenses by Group</div>
      <div class="chart">
        ${Object.entries(groups)
          .map(([group, vals]) => {
            const incW =
              maxVal > 0 ? ((vals.income / maxVal) * 100).toFixed(1) : '0';
            const expW =
              maxVal > 0 ? ((vals.expense / maxVal) * 100).toFixed(1) : '0';
            return `
          <div class="chart-row">
            <div class="chart-label">${group}</div>
            <div class="chart-bars">
              ${vals.income > 0 ? `<div class="bar income" style="width:${incW}%"><span>${fmt2(vals.income)}</span></div>` : ''}
              ${vals.expense > 0 ? `<div class="bar expense" style="width:${expW}%"><span>${fmt2(vals.expense)}</span></div>` : ''}
            </div>
          </div>`;
          })
          .join('')}
        <div class="chart-legend">
          <span class="legend-dot income"></span><span>Income</span>
          <span class="legend-dot expense" style="margin-left:16px"></span><span>Expense</span>
        </div>
      </div>`;

    tableHTML = `
      <table>
        <thead><tr><th>Main</th><th>Group</th><th>Description</th><th>Debit</th><th>Credit</th><th>Total</th></tr></thead>
        <tbody>
          ${cfg.gisRows
            .map(
              (row, i) => `
            <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
              <td style="font-weight:700;color:${row.main === 'Income' ? SUCCESS : ERROR}">${row.main}</td>
              <td style="color:${MUTED}">${row.group}</td>
              <td>${row.description}</td>
              <td class="num" style="color:${row.debit > 0 ? ERROR : MUTED}">${row.debit > 0 ? fmt2(row.debit) : '—'}</td>
              <td class="num" style="color:${row.credit > 0 ? SUCCESS : MUTED}">${row.credit > 0 ? fmt2(row.credit) : '—'}</td>
              <td class="num" style="font-weight:700;color:${row.total >= 0 ? SUCCESS : ERROR}">${fmt2(row.total)}</td>
            </tr>`,
            )
            .join('')}
          <tr class="total-row">
            <td colspan="3"><b>NET INCOME / (LOSS)</b></td>
            <td class="num" style="color:${ERROR}"><b>${fmt2(totalDebit)}</b></td>
            <td class="num" style="color:${SUCCESS}"><b>${fmt2(totalCredit)}</b></td>
            <td class="num" style="font-size:15px;color:${net >= 0 ? SUCCESS : ERROR}"><b>${net >= 0 ? '+' : ''}${fmt2(net)}</b></td>
          </tr>
        </tbody>
      </table>`;
  } else {
    const totalSales = cfg.summaryRows.reduce((s, x) => s + x.sellingPrice, 0);
    const totalContrib = cfg.summaryRows.reduce(
      (s, x) => s + x.costContribution,
      0,
    );
    const totalProfit = totalSales - totalContrib;
    const maxProfit = Math.max(
      ...cfg.summaryRows.map((r) =>
        Math.abs(r.sellingPrice - r.costContribution),
      ),
    );

    chartHTML = `
      <div class="section-title">Profit / Loss by Item</div>
      <div class="chart">
        ${cfg.summaryRows
          .map((row) => {
            const profit = row.sellingPrice - row.costContribution;
            const w =
              maxProfit > 0
                ? ((Math.abs(profit) / maxProfit) * 100).toFixed(1)
                : '0';
            return `
          <div class="chart-row">
            <div class="chart-label" style="font-size:11px">${row.description}</div>
            <div class="chart-bars">
              <div class="bar ${profit >= 0 ? 'income' : 'expense'}" style="width:${w}%"><span>${fmt2(profit)}</span></div>
            </div>
          </div>`;
          })
          .join('')}
        <div class="chart-legend">
          <span class="legend-dot income"></span><span>Profit</span>
          <span class="legend-dot expense" style="margin-left:16px"></span><span>Loss</span>
        </div>
      </div>`;

    tableHTML = `
      <table>
        <thead><tr><th>Code</th><th>Description</th><th>OpEx%</th><th>Cost</th><th>Contrib.</th><th>Sell Price</th><th>Profit</th><th>Margin</th></tr></thead>
        <tbody>
          ${cfg.summaryRows
            .map((row, i) => {
              const profit = row.sellingPrice - row.costContribution;
              const margin =
                row.sellingPrice > 0
                  ? ((profit / row.sellingPrice) * 100).toFixed(1)
                  : '0';
              return `
            <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
              <td style="font-family:monospace;font-size:10px;color:${MUTED}">${row.itemCode}</td>
              <td>${row.description}</td>
              <td class="num" style="color:${ORANGE}">${(row.opExPct * 100).toFixed(0)}%</td>
              <td class="num" style="color:${MUTED}">${fmt2(row.computedCost)}</td>
              <td class="num" style="color:${MUTED}">${fmt2(row.costContribution)}</td>
              <td class="num">${fmt2(row.sellingPrice)}</td>
              <td class="num" style="font-weight:700;color:${profit >= 0 ? SUCCESS : ERROR}">${fmt2(profit)}</td>
              <td class="num" style="font-weight:700;color:${profit >= 0 ? SUCCESS : ERROR}">${margin}%</td>
            </tr>`;
            })
            .join('')}
          <tr class="total-row">
            <td colspan="5"><b>TOTAL</b></td>
            <td class="num"><b>${fmt2(totalSales)}</b></td>
            <td class="num" style="font-size:14px;color:${totalProfit >= 0 ? SUCCESS : ERROR}"><b>${fmt2(totalProfit)}</b></td>
            <td class="num" style="color:${totalProfit >= 0 ? SUCCESS : ERROR}"><b>${totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%</b></td>
          </tr>
        </tbody>
      </table>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:${BG};color:${TEXT};font-size:12px}
    .page{padding:32px;max-width:900px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid ${ORANGE}}
    .brand{font-size:22px;font-weight:800;color:${NAVY}}
    .brand span{color:${ORANGE}}
    .meta{text-align:right;font-size:11px;color:${MUTED}}
    .meta b{font-size:13px;color:${TEXT};display:block}
    .cards{display:flex;gap:12px;margin-bottom:24px}
    .card{flex:1;background:${CARD};border-radius:10px;padding:14px;border:1px solid ${BORDER}}
    .card-label{font-size:9px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;margin-bottom:4px}
    .card-value{font-size:18px;font-weight:800}
    .section-title{font-size:10px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;margin:20px 0 10px}
    table{width:100%;border-collapse:collapse;background:${CARD};border-radius:8px;overflow:hidden}
    th{background:${NAVY};color:#fff;padding:8px 10px;font-size:10px;font-weight:700;letter-spacing:0.5px;text-align:left}
    .num{text-align:right}
    tr.even td{background:${CARD}}
    tr.odd td{background:${isDark ? '#1B3A6B22' : '#F0F4FF'}}
    td{padding:7px 10px;border-bottom:1px solid ${BORDER};font-size:11px}
    tr.total-row td{background:${isDark ? NAVY : '#E8EDF5'};font-size:12px;border-top:2px solid ${NAVY};padding:10px}
    .chart{background:${CARD};border-radius:10px;padding:16px;border:1px solid ${BORDER};margin-bottom:16px}
    .chart-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .chart-label{width:140px;font-size:10px;color:${MUTED};flex-shrink:0}
    .chart-bars{flex:1;display:flex;flex-direction:column;gap:3px}
    .bar{height:16px;border-radius:3px;display:flex;align-items:center;padding:0 6px;font-size:9px;font-weight:700;min-width:20px;white-space:nowrap;overflow:hidden}
    .bar.income{background:${SUCCESS};color:#fff}
    .bar.expense{background:${ERROR};color:#fff}
    .chart-legend{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:10px;color:${MUTED}}
    .legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
    .legend-dot.income{background:${SUCCESS}}
    .legend-dot.expense{background:${ERROR}}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;font-size:10px;color:${MUTED}}
  </style></head><body><div class="page">
    <div class="header">
      <div>
        <div class="brand">Kompra<span>POS</span> ERP</div>
        <div style="font-size:11px;color:${MUTED};margin-top:2px">${cfg.table === 'expense' ? 'Expense Summary (GIS)' : 'Item Net Summary'}</div>
      </div>
      <div class="meta">
        <b>${cfg.organization}</b>
        Prepared by ${cfg.fullName}<br/>
        ${cfg.dateLabel} · ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
    ${chartHTML}
    <div class="section-title">${cfg.table === 'expense' ? 'Expense Summary Detail' : 'Item Net Summary Detail'}</div>
    ${tableHTML}
    <div class="footer">
      <span>KompraPOS ERP · Right Apps Inc.</span>
      <span>Generated ${new Date().toISOString().split('T')[0]}</span>
    </div>
  </div></body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dest = `${cacheDirectory}KompraPOS_ERP_${cfg.table === 'expense' ? 'ExpenseSummary' : 'ItemNet'}_${cfg.dateLabel.replace(/\s/g, '_')}.pdf`;
  await moveAsync({ from: uri, to: dest });
  try {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/pdf',
      dialogTitle: 'KompraPOS ERP Report',
      UTI: 'com.adobe.pdf',
    });
  } catch (_) {}
}
