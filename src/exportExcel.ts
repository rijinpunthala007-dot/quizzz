import ExcelJS from 'exceljs';
import type { QuizState, RankedTeam } from './types';
import { rankTeams } from './utils.ts';

export const EXPORT_CREDIT = 'Designed and developed by RJ';

/**
 * Sanitize quiz title for use in file names.
 * Removes / \ : * ? " < > | and control characters, trims, collapses spaces to hyphens, max 60 chars.
 * If empty, defaults to "Quiz".
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'Quiz';
  // Remove invalid filename characters and control characters (0x00-0x1F, 0x7F-0x9F)
  let clean = name.replace(/[/\\:*?"<>|\x00-\x1f\x7f-\x9f]/g, '').trim();
  // Collapse whitespace to hyphens
  clean = clean.replace(/\s+/g, '-');
  // Limit to 60 characters
  if (clean.length > 60) {
    clean = clean.slice(0, 60);
  }
  // Trim trailing hyphens
  clean = clean.replace(/-+$/, '');
  return clean || 'Quiz';
}

/**
 * Format local date and time: e.g. "10 Nov 2026, 7:45 PM"
 */
export function formatExportDateTime(d: Date = new Date()): string {
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Format date for file name: YYYY-MM-DD
 */
export function formatFileDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert 1-based column index to Excel column letter (1 -> 'A', 27 -> 'AA')
 */
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Build the status string for a group.
 */
export function getGroupStatus(team: RankedTeam): string {
  if (team.out) {
    const lvl = typeof team.out === 'string' && team.out.trim() ? team.out.trim() : '';
    return lvl ? `Eliminated (${lvl})` : 'Eliminated';
  }
  const isMarked = Boolean(team.marked);
  const isTied = Boolean(team.isTied);

  if (isMarked) {
    const lvl = typeof team.marked === 'string' && team.marked.trim() ? team.marked.trim() : 'Active';
    return isTied ? `Marked red (${lvl}), tied` : `Marked red (${lvl})`;
  }
  if (isTied) {
    return 'Tied';
  }
  return 'Active';
}

/**
 * Determine subtitle based on played levels.
 */
export function getSubtitle(state: QuizState): string {
  const levels = state.levels || [];
  const teams = state.teams || [];

  if (levels.length === 0) {
    return 'Standings';
  }

  const playedLevelIndices: number[] = [];
  levels.forEach((lvl, idx) => {
    const hasScores = teams.some((t) => (t.scores?.[lvl.id] ?? 0) > 0);
    if (hasScores) {
      playedLevelIndices.push(idx);
    }
  });

  if (playedLevelIndices.length === levels.length && levels.length > 0) {
    return 'Final Standings';
  }
  if (playedLevelIndices.length > 0) {
    const lastPlayedIdx = Math.max(...playedLevelIndices);
    return `Standings after ${levels[lastPlayedIdx].name}`;
  }
  return 'Standings';
}

/**
 * Export the current quiz state as a beautifully styled Excel (.xlsx) file.
 * Returns the generated filename.
 */
export async function exportLeaderboardToExcel(state: QuizState): Promise<string> {
  const quizTitle = (state.title || '').trim() || 'Quiz Leaderboard';
  const fileDate = formatFileDate();
  const filename = `${sanitizeFileName(state.title)}-Leaderboard-${fileDate}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Verse Up Bible Quiz';
  workbook.title = quizTitle;
  workbook.created = new Date();

  // -------------------------------------------------------------------------
  // Compute Ranks using exact same logic as leaderboard
  // -------------------------------------------------------------------------
  const rankedTeams = rankTeams({ ...state, focus: 'all' });
  const boardTeams = rankedTeams.filter((t) => !t.out);
  const removedTeams = rankedTeams.filter((t) => Boolean(t.out));
  // Sort removed teams by total descending, then alphabetical
  removedTeams.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });

  const levels = state.levels || [];
  const numLevels = levels.length;
  // Columns: Col 1 = Rank, Col 2 = Group, Cols 3..(2+numLevels) = Levels, Col (3+numLevels) = Total, Col (4+numLevels) = Status
  const totalCols = Math.max(5, 4 + numLevels);
  const totalColIdx = 3 + numLevels;
  const statusColIdx = 4 + numLevels;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
  };

  // =========================================================================
  // SHEET 1: Leaderboard
  // =========================================================================
  const sheet1 = workbook.addWorksheet('Leaderboard', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '5:5',
      horizontalCentered: true,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    },
    headerFooter: {
      oddFooter: 'Page &P of &N',
      evenFooter: 'Page &P of &N',
    },
  });

  // Row 1: Heading (Quiz Title)
  sheet1.mergeCells(1, 1, 1, totalCols);
  const cellHeading = sheet1.getCell(1, 1);
  cellHeading.value = quizTitle;
  cellHeading.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  cellHeading.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A1A6E' } };
  cellHeading.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet1.getRow(1).height = quizTitle.length > 50 ? Math.max(36, Math.ceil(quizTitle.length / 40) * 24) : 36;

  // Row 2: Subtitle
  const subtitle = getSubtitle(state);
  sheet1.mergeCells(2, 1, 2, totalCols);
  const cellSub = sheet1.getCell(2, 1);
  cellSub.value = subtitle;
  cellSub.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFB8860B' } };
  cellSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEAFB' } };
  cellSub.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 24;

  // Row 3: Export Date
  const exportDateStr = `Exported on ${formatExportDateTime()}`;
  sheet1.mergeCells(3, 1, 3, totalCols);
  const cellDate = sheet1.getCell(3, 1);
  cellDate.value = exportDateStr;
  cellDate.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF7A7A8C' } };
  cellDate.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(3).height = 18;

  // Row 4: Empty spacer
  sheet1.getRow(4).height = 12;

  // Row 5: Table Header
  const headers = ['Rank', 'Group', ...levels.map((l) => l.name), 'Total', 'Status'];
  const headerRow = sheet1.getRow(5);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = headerRow.getCell(colIdx);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B2FB5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Autofilter range will be applied below
  let currentRow = 6;

  // If 0 groups in quiz
  if (state.teams.length === 0) {
    sheet1.mergeCells(currentRow, 1, currentRow, totalCols);
    const cellEmpty = sheet1.getCell(currentRow, 1);
    cellEmpty.value = 'No groups yet';
    cellEmpty.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF7A7A8C' } };
    cellEmpty.alignment = { horizontal: 'center', vertical: 'middle' };
    cellEmpty.border = thinBorder;
    sheet1.getRow(currentRow).height = 28;
    currentRow++;
  } else {
    // -----------------------------------------------------------------------
    // Rows for Board Groups
    // -----------------------------------------------------------------------
    boardTeams.forEach((t, i) => {
      const row = sheet1.getRow(currentRow);
      row.height = 24;
      const isAlt = i % 2 === 1;
      const defaultRowFill: ExcelJS.Fill | undefined = isAlt
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F5FD' } }
        : undefined;

      const isMarkedRed = Boolean(t.marked);
      const isPodium = !isMarkedRed && (t.rank === 1 || t.rank === 2 || t.rank === 3);
      let podiumFill: ExcelJS.Fill | undefined = undefined;
      if (isPodium) {
        if (t.rank === 1) podiumFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1C2' } }; // Gold
        else if (t.rank === 2) podiumFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF4' } }; // Silver
        else if (t.rank === 3) podiumFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E3D3' } }; // Bronze
      }

      const markedRedFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD6DC' },
      };
      const markedRedTextColor = { argb: 'FF8E1B2E' };

      // Col 1: Rank (Numeric)
      const cellRank = row.getCell(1);
      cellRank.value = t.rank;
      cellRank.alignment = { horizontal: 'center', vertical: 'middle' };
      cellRank.border = thinBorder;
      if (isMarkedRed) {
        cellRank.fill = markedRedFill;
        cellRank.font = { name: 'Calibri', size: 11, bold: true, color: markedRedTextColor };
      } else if (isPodium && podiumFill) {
        cellRank.fill = podiumFill;
        cellRank.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF2A1A00' } };
      } else {
        if (defaultRowFill) cellRank.fill = defaultRowFill;
        cellRank.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
      }

      // Col 2: Group (Text, prevent formula injection, indent 1)
      const cellGroup = row.getCell(2);
      cellGroup.value = String(t.name);
      cellGroup.numFmt = '@';
      cellGroup.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      cellGroup.border = thinBorder;
      if (isMarkedRed) {
        cellGroup.fill = markedRedFill;
        cellGroup.font = { name: 'Calibri', size: 11, bold: true, color: markedRedTextColor };
      } else if (isPodium && podiumFill) {
        cellGroup.fill = podiumFill;
        cellGroup.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF2A1A00' } };
      } else {
        if (defaultRowFill) cellGroup.fill = defaultRowFill;
        cellGroup.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
      }

      // Cols 3..(2+numLevels): Level scores
      levels.forEach((lvl, lIdx) => {
        const cellLvl = row.getCell(3 + lIdx);
        const score = t.scores?.[lvl.id] ?? 0;
        cellLvl.value = Number(score);
        cellLvl.numFmt = '0.##';
        cellLvl.alignment = { horizontal: 'center', vertical: 'middle' };
        cellLvl.border = thinBorder;
        if (isMarkedRed) {
          cellLvl.fill = markedRedFill;
          cellLvl.font = { name: 'Calibri', size: 11, color: markedRedTextColor };
        } else {
          if (defaultRowFill) cellLvl.fill = defaultRowFill;
          cellLvl.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
        }
      });

      // Total Column (Live SUM formula + cached result)
      const cellTotal = row.getCell(totalColIdx);
      if (numLevels > 0) {
        const startLetter = getColumnLetter(3);
        const endLetter = getColumnLetter(2 + numLevels);
        cellTotal.value = {
          formula: `SUM(${startLetter}${currentRow}:${endLetter}${currentRow})`,
          result: t.total,
        };
      } else {
        cellTotal.value = t.total;
      }
      cellTotal.numFmt = '0.##';
      cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTotal.border = thinBorder;
      if (isMarkedRed) {
        cellTotal.fill = markedRedFill;
        cellTotal.font = { name: 'Calibri', size: 11, bold: true, color: markedRedTextColor };
      } else {
        if (defaultRowFill) cellTotal.fill = defaultRowFill;
        cellTotal.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1F1F2E' } };
      }

      // Status Column
      const cellStatus = row.getCell(statusColIdx);
      cellStatus.value = getGroupStatus(t);
      cellStatus.alignment = { horizontal: 'center', vertical: 'middle' };
      cellStatus.border = thinBorder;
      if (isMarkedRed) {
        cellStatus.fill = markedRedFill;
        cellStatus.font = { name: 'Calibri', size: 11, bold: true, color: markedRedTextColor };
      } else {
        if (defaultRowFill) cellStatus.fill = defaultRowFill;
        cellStatus.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
      }

      currentRow++;
    });

    // -----------------------------------------------------------------------
    // Removed groups (Out)
    // -----------------------------------------------------------------------
    if (removedTeams.length > 0) {
      // Spacer row: "Removed from the board"
      sheet1.mergeCells(currentRow, 1, currentRow, totalCols);
      const spacerCell = sheet1.getCell(currentRow, 1);
      spacerCell.value = 'Removed from the board';
      spacerCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF7A7A8C' } };
      spacerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      spacerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F2FA' } };
      spacerCell.border = thinBorder;
      sheet1.getRow(currentRow).height = 22;
      currentRow++;

      removedTeams.forEach((t) => {
        const row = sheet1.getRow(currentRow);
        row.height = 24;
        const removedTextColor = { argb: 'FF7A7A8C' };

        // Col 1: Rank ("—")
        const cellRank = row.getCell(1);
        cellRank.value = '—';
        cellRank.alignment = { horizontal: 'center', vertical: 'middle' };
        cellRank.font = { name: 'Calibri', size: 11, italic: true, color: removedTextColor };
        cellRank.border = thinBorder;

        // Col 2: Group (Text, italic grey)
        const cellGroup = row.getCell(2);
        cellGroup.value = String(t.name);
        cellGroup.numFmt = '@';
        cellGroup.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        cellGroup.font = { name: 'Calibri', size: 11, italic: true, color: removedTextColor };
        cellGroup.border = thinBorder;

        // Cols 3..(2+numLevels): Level scores
        levels.forEach((lvl, lIdx) => {
          const cellLvl = row.getCell(3 + lIdx);
          const score = t.scores?.[lvl.id] ?? 0;
          cellLvl.value = Number(score);
          cellLvl.numFmt = '0.##';
          cellLvl.alignment = { horizontal: 'center', vertical: 'middle' };
          cellLvl.font = { name: 'Calibri', size: 11, italic: true, color: removedTextColor };
          cellLvl.border = thinBorder;
        });

        // Total Column
        const cellTotal = row.getCell(totalColIdx);
        if (numLevels > 0) {
          const startLetter = getColumnLetter(3);
          const endLetter = getColumnLetter(2 + numLevels);
          cellTotal.value = {
            formula: `SUM(${startLetter}${currentRow}:${endLetter}${currentRow})`,
            result: t.total,
          };
        } else {
          cellTotal.value = t.total;
        }
        cellTotal.numFmt = '0.##';
        cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellTotal.font = { name: 'Calibri', size: 11, italic: true, color: removedTextColor };
        cellTotal.border = thinBorder;

        // Status Column
        const cellStatus = row.getCell(statusColIdx);
        cellStatus.value = getGroupStatus(t);
        cellStatus.alignment = { horizontal: 'center', vertical: 'middle' };
        cellStatus.font = { name: 'Calibri', size: 11, italic: true, color: removedTextColor };
        cellStatus.border = thinBorder;

        currentRow++;
      });
    }
  }

  // Set Autofilter on Table Header Row
  sheet1.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(5, currentRow - 1), column: totalCols },
  };

  // Blank row before footer
  sheet1.getRow(currentRow).height = 14;
  currentRow++;

  // Footer Credit Row
  sheet1.mergeCells(currentRow, 1, currentRow, totalCols);
  const footerCell = sheet1.getCell(currentRow, 1);
  footerCell.value = EXPORT_CREDIT;
  footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF7A7A8C' } };
  footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(currentRow).height = 20;

  // -------------------------------------------------------------------------
  // Column Widths for Sheet 1
  // -------------------------------------------------------------------------
  // Rank: 8
  sheet1.getColumn(1).width = 8;

  // Group: between 24 and 44, wrapping if longer
  let maxGroupNameLen = 12;
  state.teams.forEach((t) => {
    if (t.name && t.name.length > maxGroupNameLen) {
      maxGroupNameLen = t.name.length;
    }
  });
  sheet1.getColumn(2).width = Math.max(24, Math.min(44, maxGroupNameLen + 3));

  // Levels: 12 to 18
  levels.forEach((lvl, idx) => {
    const colIdx = 3 + idx;
    const len = lvl.name ? lvl.name.length : 8;
    sheet1.getColumn(colIdx).width = Math.max(12, Math.min(18, len + 3));
  });

  // Total: 11
  sheet1.getColumn(totalColIdx).width = 11;

  // Status: 28
  sheet1.getColumn(statusColIdx).width = 28;

  // =========================================================================
  // SHEET 2: Group Scores (Plain data table in entry order)
  // =========================================================================
  const sheet2 = workbook.addWorksheet('Group Scores', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
  });

  // Rank Map for quick lookup
  const rankMap = new Map<string, RankedTeam>();
  rankedTeams.forEach((t) => rankMap.set(t.id, t));

  // Header: Group | one column per level | Total | Rank | Status
  const s2Headers = ['Group', ...levels.map((l) => l.name), 'Total', 'Rank', 'Status'];
  const s2TotalColIdx = 2 + numLevels;
  const s2RankColIdx = 3 + numLevels;
  const s2StatusColIdx = 4 + numLevels;
  const s2TotalCols = Math.max(4, 4 + numLevels);

  const s2HeaderRow = sheet2.getRow(1);
  s2HeaderRow.height = 26;
  s2Headers.forEach((h, idx) => {
    const cell = s2HeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B2FB5' } };
    cell.alignment = { horizontal: idx === 0 ? 'left' : 'center', vertical: 'middle', indent: idx === 0 ? 1 : 0 };
    cell.border = thinBorder;
  });

  let s2CurrentRow = 2;
  state.teams.forEach((t, i) => {
    const row = sheet2.getRow(s2CurrentRow);
    row.height = 22;
    const isAlt = i % 2 === 1;
    const zebra: ExcelJS.Fill | undefined = isAlt
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F5FD' } }
      : undefined;

    const rankedInfo = rankMap.get(t.id);

    // Group
    const cellGroup = row.getCell(1);
    cellGroup.value = String(t.name);
    cellGroup.numFmt = '@';
    cellGroup.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    cellGroup.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
    cellGroup.border = thinBorder;
    if (zebra) cellGroup.fill = zebra;

    // Levels
    levels.forEach((lvl, lIdx) => {
      const cellLvl = row.getCell(2 + lIdx);
      const score = t.scores?.[lvl.id] ?? 0;
      cellLvl.value = Number(score);
      cellLvl.numFmt = '0.##';
      cellLvl.alignment = { horizontal: 'center', vertical: 'middle' };
      cellLvl.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
      cellLvl.border = thinBorder;
      if (zebra) cellLvl.fill = zebra;
    });

    // Total formula
    const cellTotal = row.getCell(s2TotalColIdx);
    const totalScore = rankedInfo?.total ?? 0;
    if (numLevels > 0) {
      const startLetter = getColumnLetter(2);
      const endLetter = getColumnLetter(1 + numLevels);
      cellTotal.value = {
        formula: `SUM(${startLetter}${s2CurrentRow}:${endLetter}${s2CurrentRow})`,
        result: totalScore,
      };
    } else {
      cellTotal.value = totalScore;
    }
    cellTotal.numFmt = '0.##';
    cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTotal.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1F1F2E' } };
    cellTotal.border = thinBorder;
    if (zebra) cellTotal.fill = zebra;

    // Rank
    const cellRank = row.getCell(s2RankColIdx);
    cellRank.value = t.out ? '—' : rankedInfo ? rankedInfo.rank : 0;
    cellRank.alignment = { horizontal: 'center', vertical: 'middle' };
    cellRank.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
    cellRank.border = thinBorder;
    if (zebra) cellRank.fill = zebra;

    // Status
    const cellStatus = row.getCell(s2StatusColIdx);
    cellStatus.value = rankedInfo ? getGroupStatus(rankedInfo) : 'Active';
    cellStatus.alignment = { horizontal: 'center', vertical: 'middle' };
    cellStatus.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F1F2E' } };
    cellStatus.border = thinBorder;
    if (zebra) cellStatus.fill = zebra;

    s2CurrentRow++;
  });

  if (state.teams.length > 0) {
    sheet2.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: s2CurrentRow - 1, column: s2TotalCols },
    };
  }

  // Column widths for Sheet 2
  sheet2.getColumn(1).width = Math.max(24, Math.min(44, maxGroupNameLen + 3));
  levels.forEach((lvl, idx) => {
    const len = lvl.name ? lvl.name.length : 8;
    sheet2.getColumn(2 + idx).width = Math.max(12, Math.min(18, len + 3));
  });
  sheet2.getColumn(s2TotalColIdx).width = 11;
  sheet2.getColumn(s2RankColIdx).width = 8;
  sheet2.getColumn(s2StatusColIdx).width = 24;

  // -------------------------------------------------------------------------
  // Generate Buffer and Trigger Browser Download
  // -------------------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return filename;
}
