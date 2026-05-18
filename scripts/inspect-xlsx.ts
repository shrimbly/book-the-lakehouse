import * as XLSX from "xlsx";

const path = process.argv[2];
if (!path) {
  console.error("usage: tsx scripts/inspect-xlsx.ts <path>");
  process.exit(1);
}

const wb = XLSX.readFile(path, { cellDates: true });

for (const sheetName of wb.SheetNames) {
  console.log("\n========================================");
  console.log(`SHEET: ${sheetName}`);
  console.log("========================================");
  const ws = wb.Sheets[sheetName];
  const ref = ws["!ref"];
  if (!ref) {
    console.log("(empty)");
    continue;
  }
  console.log(`Range: ${ref}`);
  // Print as 2D array — first 60 rows
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  });
  data.slice(0, 60).forEach((row, i) => {
    console.log(`${String(i + 1).padStart(3, " ")}: ${JSON.stringify(row)}`);
  });
  if (data.length > 60) {
    console.log(`... (${data.length - 60} more rows)`);
  }
}
