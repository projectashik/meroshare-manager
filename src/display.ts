import type {
  OwnDetail,
  PortfolioResponse,
  PortfolioItem,
  ApplicableIssue,
  IssueDetail,
} from "./types.js";

// ─── Colors ─────────────────────────────────────────────────────────────────────

const c = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
  magenta: "\x1b[95m",
  reset: "\x1b[0m",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtMoney(val: number | string): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pad(str: string, len: number, align: "left" | "right" = "left"): string {
  if (align === "right") return str.padStart(len);
  return str.padEnd(len);
}

// ─── Public — Common ────────────────────────────────────────────────────────────

export function printHeader(text: string, width = 80): void {
  console.log(`\n${c.bold}${c.cyan}${"═".repeat(width)}${c.reset}`);
  console.log(`${c.bold}${c.white}  ${text}${c.reset}`);
  console.log(`${c.bold}${c.cyan}${"═".repeat(width)}${c.reset}`);
}

export function printStatus(msg: string, done = false): void {
  if (done) {
    process.stdout.write(` ${c.green}✓${c.reset}\n`);
  } else {
    process.stdout.write(`  ${c.dim}${msg}${c.reset}`);
  }
}

export function printError(msg: string): void {
  process.stdout.write(` ${c.red}✗${c.reset}\n`);
  console.log(`  ${c.red}  ${msg}${c.reset}`);
}

export function printFooter(width = 80): void {
  console.log(`\n${c.bold}${c.cyan}${"═".repeat(width)}${c.reset}\n`);
}

// ─── Public — Portfolio ─────────────────────────────────────────────────────────

export function displayPortfolio(
  detail: OwnDetail,
  portfolio: PortfolioResponse
): number {
  // Subheader
  console.log(
    `\n${c.bold}${c.yellow}  ▸ ${detail.name}  |  DMAT: ${detail.demat}  |  DP: ${detail.clientCode}${c.reset}`
  );
  console.log(`  ${c.dim}${"─".repeat(76)}${c.reset}`);

  const items = portfolio.meroShareMyPortfolio ?? [];

  if (items.length === 0) {
    console.log(`  ${c.dim}No shares found in portfolio.${c.reset}`);
    return 0;
  }

  // Column widths
  const W = { sn: 4, sym: 12, name: 38, qty: 8, ltp: 12, val: 14 };

  // Table header
  console.log(
    `  ${c.bold}${c.white}` +
      `${pad("#", W.sn, "right")}  ` +
      `${pad("Symbol", W.sym)}  ` +
      `${pad("Company", W.name)}  ` +
      `${pad("Qty", W.qty, "right")}  ` +
      `${pad("LTP", W.ltp, "right")}  ` +
      `${pad("Value", W.val, "right")}` +
      `${c.reset}`
  );

  const lineW = W.sn + W.sym + W.name + W.qty + W.ltp + W.val + 10;
  console.log(`  ${c.dim}${"─".repeat(lineW)}${c.reset}`);

  let totalValue = 0;
  let totalQty = 0;

  items.forEach((item: PortfolioItem, i: number) => {
    const qty = Math.floor(item.currentBalance);
    const ltp = parseFloat(item.lastTransactionPrice);
    const value = item.valueOfLastTransPrice;
    totalValue += value;
    totalQty += qty;

    let company = item.scriptDesc;
    if (company.length > W.name) company = company.slice(0, W.name - 2) + "..";

    console.log(
      `  ${c.dim}${pad(String(i + 1), W.sn, "right")}${c.reset}  ` +
        `${c.bold}${c.green}${pad(item.script, W.sym)}${c.reset}  ` +
        `${c.white}${pad(company, W.name)}${c.reset}  ` +
        `${c.cyan}${pad(String(qty), W.qty, "right")}${c.reset}  ` +
        `${c.yellow}${pad(fmtMoney(ltp), W.ltp, "right")}${c.reset}  ` +
        `${c.bold}${c.white}${pad(fmtMoney(value), W.val, "right")}${c.reset}`
    );
  });

  console.log(`  ${c.dim}${"─".repeat(lineW)}${c.reset}`);
  console.log(
    `  ${pad("", W.sn, "right")}  ` +
      `${pad("", W.sym)}  ` +
      `${c.bold}${pad("TOTAL", W.name, "right")}${c.reset}  ` +
      `${c.bold}${c.cyan}${pad(String(totalQty), W.qty, "right")}${c.reset}  ` +
      `${pad("", W.ltp, "right")}  ` +
      `${c.bold}${c.green}${pad(fmtMoney(totalValue), W.val, "right")}${c.reset}`
  );

  return totalValue;
}

export function printGrandTotal(total: number, width = 80): void {
  console.log(`\n${c.bold}${c.cyan}${"═".repeat(width)}${c.reset}`);
  console.log(
    `  ${c.bold}${c.white}GRAND TOTAL across all accounts: ${c.green}Rs. ${fmtMoney(total)}${c.reset}`
  );
}

// ─── Public — IPO Apply ─────────────────────────────────────────────────────────

export function displayIssueList(issues: ApplicableIssue[]): void {
  console.log(
    `\n  ${c.bold}${c.white}Available Issues (${issues.length}):${c.reset}`
  );
  console.log(`  ${c.dim}${"─".repeat(76)}${c.reset}`);

  const W = { sn: 4, scrip: 12, name: 40, type: 10, group: 20 };

  console.log(
    `  ${c.bold}${c.white}` +
      `${pad("#", W.sn, "right")}  ` +
      `${pad("Scrip", W.scrip)}  ` +
      `${pad("Company", W.name)}  ` +
      `${pad("Type", W.type)}  ` +
      `${pad("Group", W.group)}` +
      `${c.reset}`
  );
  console.log(`  ${c.dim}${"─".repeat(W.sn + W.scrip + W.name + W.type + W.group + 8)}${c.reset}`);

  issues.forEach((issue, i) => {
    let name = issue.companyName;
    if (name.length > W.name) name = name.slice(0, W.name - 2) + "..";

    console.log(
      `  ${c.dim}${pad(String(i + 1), W.sn, "right")}${c.reset}  ` +
        `${c.bold}${c.green}${pad(issue.scrip, W.scrip)}${c.reset}  ` +
        `${c.white}${pad(name, W.name)}${c.reset}  ` +
        `${c.cyan}${pad(issue.shareTypeName, W.type)}${c.reset}  ` +
        `${c.yellow}${pad(issue.subGroup || issue.shareGroupName, W.group)}${c.reset}`
    );
  });
}

export function displayIssueDetail(detail: IssueDetail): void {
  console.log(`\n  ${c.bold}${c.magenta}▸ ${detail.companyName}${c.reset}`);
  console.log(`  ${c.dim}${"─".repeat(50)}${c.reset}`);
  console.log(`  ${c.white}Scrip:${c.reset}       ${c.bold}${detail.scrip}${c.reset}`);
  console.log(`  ${c.white}Type:${c.reset}        ${detail.shareTypeName} — ${detail.shareGroupName}`);
  console.log(`  ${c.white}Sub Group:${c.reset}   ${detail.subGroup}`);
  console.log(`  ${c.white}Min Kitta:${c.reset}   ${c.cyan}${detail.minUnit}${c.reset}`);
  console.log(`  ${c.white}Max Kitta:${c.reset}   ${c.cyan}${detail.maxUnit}${c.reset}`);
  console.log(`  ${c.white}Multiple Of:${c.reset} ${c.cyan}${detail.multipleOf}${c.reset}`);
  console.log(
    `  ${c.white}Share Value:${c.reset} ${c.green}Rs. ${fmtMoney(detail.shareValue)}${c.reset}  (${detail.sharePerUnit} per unit)`
  );
  console.log(`  ${c.white}Manager:${c.reset}     ${detail.clientName}`);
}

export function displayBankInfo(
  username: string,
  name: string,
  bankName: string,
  accountNumber: string
): void {
  console.log(
    `  ${c.dim}  ${name} → ${bankName} (${accountNumber})${c.reset}`
  );
}

export function displayApplyResult(
  username: string,
  success: boolean,
  message: string
): void {
  if (success) {
    console.log(`  ${c.green}✓${c.reset}  ${c.bold}${username}${c.reset}: ${c.green}${message}${c.reset}`);
  } else {
    console.log(`  ${c.red}✗${c.reset}  ${c.bold}${username}${c.reset}: ${c.red}${message}${c.reset}`);
  }
}
