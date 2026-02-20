#!/usr/bin/env node

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
import { MeroshareClient } from "./client.js";
import {
  printHeader,
  printStatus,
  printError,
  displayPortfolio,
  printGrandTotal,
  printFooter,
  displayIssueList,
  displayIssueDetail,
  displayApplyResult,
  displayBankInfo,
} from "./display.js";
import type { Config, DP, Account } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = "0.1.0";

// ─── ANSI Colors ────────────────────────────────────────────────────────────────

const c = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
  reset: "\x1b[0m",
} as const;

// ─── Config ─────────────────────────────────────────────────────────────────────

function getConfigDir(): string {
  const home = homedir();
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "meroshare");
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(home, ".config"), "meroshare");
}

function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

const SAMPLE_CONFIG: Config = { accounts: [] };

function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function loadConfig(exitIfEmpty = true): Config {
  const configPath = getConfigPath();

  const paths = [
    configPath,
    resolve(process.cwd(), "config.json"),
    resolve(__dirname, "..", "config.json"),
  ];

  for (const p of paths) {
    try {
      const raw = readFileSync(p, "utf-8");
      return JSON.parse(raw) as Config;
    } catch {
      continue;
    }
  }

  if (exitIfEmpty) {
    console.log("\n  No config found. Run " + c.cyan + "meroshare init" + c.reset + " to get started.");
    console.log("  Config path: " + c.dim + configPath + c.reset + "\n");
    process.exit(1);
  }

  return SAMPLE_CONFIG;
}

// ─── Prompt Helper ──────────────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let password = "";
    process.stdout.write(question);

    const onData = (ch: Buffer) => {
      const char = ch.toString("utf-8");
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.removeListener("data", onData);
        if (stdin.isTTY) stdin.setRawMode(false);
        process.stdout.write("\n");
        rl.close();
        resolve(password);
      } else if (char === "\u007F" || char === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (char === "\u0003") {
        process.stdout.write("\n");
        process.exit(0);
      } else {
        password += char;
        process.stdout.write("*");
      }
    };

    stdin.resume();
    stdin.on("data", onData);
  });
}

// ─── Curl Check ─────────────────────────────────────────────────────────────────

function isCurlInstalled(): boolean {
  try {
    execFileSync("curl", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function isBrewInstalled(): boolean {
  try {
    execFileSync("brew", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function ensureCurl(): Promise<boolean> {
  if (isCurlInstalled()) {
    console.log("  " + c.green + "✓" + c.reset + " curl is installed");
    return true;
  }

  console.log("\n  " + c.red + "✗" + c.reset + " curl is not installed. Meroshare CLI requires curl.\n");

  const os = platform();

  if (os === "darwin") {
    if (isBrewInstalled()) {
      const install = await prompt("  Install curl via Homebrew? (y/n): ");
      if (install.toLowerCase() === "y") {
        console.log("\n  " + c.dim + "Running: brew install curl" + c.reset + "\n");
        try {
          execFileSync("brew", ["install", "curl"], { stdio: "inherit" });
          if (isCurlInstalled()) {
            console.log("\n  " + c.green + "✓" + c.reset + " curl installed successfully.\n");
            return true;
          }
        } catch {
          console.error("\n  " + c.red + "✗" + c.reset + " Failed to install curl via Homebrew.\n");
        }
      }
    } else {
      console.log("  Install curl using Homebrew:");
      console.log("    " + c.cyan + "brew install curl" + c.reset + "\n");
      console.log("  Or install Homebrew first: " + c.dim + "https://brew.sh" + c.reset + "\n");
    }
  } else if (os === "linux") {
    console.log("  Install curl using your package manager:");
    console.log("    " + c.cyan + "sudo apt install curl" + c.reset + "       " + c.dim + "# Debian/Ubuntu" + c.reset);
    console.log("    " + c.cyan + "sudo dnf install curl" + c.reset + "       " + c.dim + "# Fedora" + c.reset);
    console.log("    " + c.cyan + "sudo pacman -S curl" + c.reset + "         " + c.dim + "# Arch" + c.reset + "\n");
  } else if (os === "win32") {
    console.log("  Install curl: " + c.dim + "https://curl.se/windows/" + c.reset);
    console.log("  Or via winget: " + c.cyan + "winget install curl" + c.reset + "\n");
  }

  return false;
}

// ─── Help Command ───────────────────────────────────────────────────────────────

function helpCommand(): void {
  const lines = [
    "",
    "  " + c.bold + c.cyan + "@cbashik/meroshare" + c.reset + " " + c.dim + "v" + VERSION + c.reset,
    "  CLI tool for Meroshare — portfolio viewer & IPO applicator",
    "",
    "  " + c.bold + "USAGE" + c.reset,
    "    " + c.cyan + "meroshare" + c.reset + " " + c.dim + "<command>" + c.reset,
    "",
    "  " + c.bold + "COMMANDS" + c.reset,
    "    " + c.cyan + "init" + c.reset + "         Check dependencies and create config file",
    "    " + c.cyan + "configure" + c.reset + "    Interactive account setup",
    "    " + c.cyan + "accounts" + c.reset + "     List, add, remove, or update accounts",
    "    " + c.cyan + "portfolio" + c.reset + "    Show portfolio for all accounts " + c.dim + "(default)" + c.reset,
    "    " + c.cyan + "apply" + c.reset + "        Apply for an open IPO across accounts",
    "    " + c.cyan + "help" + c.reset + "         Show this help message",
    "    " + c.cyan + "version" + c.reset + "      Show version",
    "",
    "  " + c.bold + "CONFIG" + c.reset,
    "    " + c.dim + getConfigPath() + c.reset,
    "",
    "  " + c.bold + "EXAMPLES" + c.reset,
    "    " + c.dim + "$" + c.reset + " meroshare init              " + c.dim + "# first-time init" + c.reset,
    "    " + c.dim + "$" + c.reset + " meroshare configure          " + c.dim + "# add accounts" + c.reset,
    "    " + c.dim + "$" + c.reset + " meroshare                    " + c.dim + "# show portfolio" + c.reset,
    "    " + c.dim + "$" + c.reset + " meroshare apply              " + c.dim + "# apply for an IPO" + c.reset,
    "    " + c.dim + "$" + c.reset + " meroshare accounts           " + c.dim + "# manage accounts" + c.reset,
    "",
  ];
  console.log(lines.join("\n"));
}

// ─── Init Command ───────────────────────────────────────────────────────────────

async function initCommand(): Promise<void> {
  printHeader("MEROSHARE CLI — INIT");

  // 1. Check dependencies
  console.log("\n  " + c.bold + "Checking dependencies..." + c.reset + "\n");

  const hasCurl = await ensureCurl();
  if (!hasCurl) {
    console.log("  Install curl and run " + c.cyan + "meroshare init" + c.reset + " again.\n");
    process.exit(1);
  }

  // 2. Check Node version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0]!, 10);
  if (major < 18) {
    console.log("  " + c.red + "✗" + c.reset + " Node.js v" + nodeVersion + " detected. v18+ is required.\n");
    process.exit(1);
  }
  console.log("  " + c.green + "✓" + c.reset + " Node.js v" + nodeVersion);

  // 3. Create config file
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    const existing = loadConfig(false);
    console.log("  " + c.green + "✓" + c.reset + " Config exists (" + existing.accounts.length + " account(s))");
    console.log("    " + c.dim + configPath + c.reset);
  } else {
    ensureConfigDir();
    saveConfig(SAMPLE_CONFIG);
    console.log("  " + c.green + "✓" + c.reset + " Config created at:");
    console.log("    " + c.dim + configPath + c.reset);
  }

  // 4. Test API connectivity
  console.log("\n  " + c.bold + "Testing API connectivity..." + c.reset + "\n");
  try {
    const client = new MeroshareClient();
    const dpList = await client.getDPList();
    console.log("  " + c.green + "✓" + c.reset + " Meroshare API is reachable (" + dpList.length + " DPs)");
  } catch {
    console.log("  " + c.yellow + "⚠" + c.reset + " Could not reach Meroshare API. This may be a temporary issue.");
  }

  // 5. Next steps
  const existing = loadConfig(false);
  if (existing.accounts.length === 0) {
    console.log("\n  " + c.bold + "Next steps:" + c.reset);
    console.log("    1. Run " + c.cyan + "meroshare configure" + c.reset + " to add your accounts");
    console.log("    2. Run " + c.cyan + "meroshare" + c.reset + " to view your portfolio");
    console.log("    3. Run " + c.cyan + "meroshare apply" + c.reset + " to apply for IPOs\n");
  } else {
    console.log("\n  " + c.green + "All good!" + c.reset + " Run " + c.cyan + "meroshare" + c.reset + " to get started.\n");
  }
}

// ─── Configure Command ──────────────────────────────────────────────────────────

async function configureCommand(): Promise<void> {
  printHeader("MEROSHARE — CONFIGURE");

  const existing = loadConfig(false);
  if (existing.accounts.length > 0) {
    console.log("\n  You already have " + c.bold + existing.accounts.length + c.reset + " account(s) configured.");
    const action = await prompt("  Add another account? (y/n): ");
    if (action.toLowerCase() !== "y") {
      console.log("\n  Run " + c.cyan + "meroshare accounts" + c.reset + " to manage existing accounts.\n");
      return;
    }
  } else {
    console.log("\n  Let's set up your first Meroshare account.\n");
  }

  const account = await promptAccountDetails();
  if (!account) return;

  existing.accounts.push(account);
  saveConfig(existing);

  console.log("\n  " + c.green + "✓" + c.reset + " Account " + c.bold + account.username + c.reset + " added successfully.");
  console.log("  Config saved to: " + c.dim + getConfigPath() + c.reset);

  const addMore = await prompt("\n  Add another account? (y/n): ");
  if (addMore.toLowerCase() === "y") {
    const another = await promptAccountDetails();
    if (another) {
      existing.accounts.push(another);
      saveConfig(existing);
      console.log("\n  " + c.green + "✓" + c.reset + " Account " + c.bold + another.username + c.reset + " added successfully.");
    }
  }

  console.log("\n  Setup complete! Run " + c.cyan + "meroshare" + c.reset + " to view your portfolio.\n");
}

async function promptAccountDetails(): Promise<Account | null> {
  console.log("  " + c.dim + "─".repeat(50) + c.reset);

  const dpCode = await prompt("  DP Code (e.g. 11000): ");
  if (!dpCode) { console.log("  Cancelled."); return null; }

  const username = await prompt("  BOID / Username: ");
  if (!username) { console.log("  Cancelled."); return null; }

  const password = await promptPassword("  Password: ");
  if (!password) { console.log("  Cancelled."); return null; }

  const crn = await prompt("  CRN Number: ");
  const transactionPin = await prompt("  Transaction PIN (4 digits): ");

  return { dpCode, username, password, crn: crn || undefined, transactionPin: transactionPin || undefined };
}

// ─── Accounts Command ───────────────────────────────────────────────────────────

async function accountsCommand(): Promise<void> {
  const config = loadConfig(false);

  if (config.accounts.length === 0) {
    console.log("\n  No accounts configured. Run " + c.cyan + "meroshare configure" + c.reset + " to add one.\n");
    return;
  }

  printHeader("MEROSHARE ACCOUNTS (" + config.accounts.length + ")");

  for (let i = 0; i < config.accounts.length; i++) {
    const a = config.accounts[i]!;
    const hasCrn = a.crn ? c.green + "✓" + c.reset : c.red + "✗" + c.reset;
    const hasPin = a.transactionPin ? c.green + "✓" + c.reset : c.red + "✗" + c.reset;
    console.log(
      "  " + c.cyan + (i + 1) + "." + c.reset + "  " +
      c.bold + a.username + c.reset + "  " +
      c.dim + "DP: " + a.dpCode + c.reset + "  " +
      "CRN: " + hasCrn + "  PIN: " + hasPin
    );
  }

  console.log("\n  " + c.bold + "Actions:" + c.reset);
  console.log("  " + c.cyan + "a" + c.reset + " — Add new account");
  console.log("  " + c.cyan + "r" + c.reset + " — Remove an account");
  console.log("  " + c.cyan + "u" + c.reset + " — Update an account");
  console.log("  " + c.cyan + "q" + c.reset + " — Quit");

  const action = await prompt("\n  Choose action: ");

  switch (action.toLowerCase()) {
    case "a":
      await accountsAdd(config);
      break;
    case "r":
      await accountsRemove(config);
      break;
    case "u":
      await accountsUpdate(config);
      break;
    case "q":
      break;
    default:
      console.log("  Invalid action.");
      break;
  }
}

async function accountsAdd(config: Config): Promise<void> {
  console.log("");
  const account = await promptAccountDetails();
  if (!account) return;

  config.accounts.push(account);
  saveConfig(config);
  console.log("\n  " + c.green + "✓" + c.reset + " Account " + c.bold + account.username + c.reset + " added.\n");
}

async function accountsRemove(config: Config): Promise<void> {
  const idx = await prompt("  Enter account number to remove (1-" + config.accounts.length + "): ");
  const i = parseInt(idx, 10) - 1;
  if (isNaN(i) || i < 0 || i >= config.accounts.length) {
    console.log("  Invalid selection.");
    return;
  }

  const removed = config.accounts[i]!;
  const confirmRemove = await prompt("  Remove " + c.bold + removed.username + c.reset + " (DP: " + removed.dpCode + ")? (y/n): ");
  if (confirmRemove.toLowerCase() !== "y") {
    console.log("  Cancelled.");
    return;
  }

  config.accounts.splice(i, 1);
  saveConfig(config);
  console.log("\n  " + c.green + "✓" + c.reset + " Account " + c.bold + removed.username + c.reset + " removed.\n");
}

async function accountsUpdate(config: Config): Promise<void> {
  const idx = await prompt("  Enter account number to update (1-" + config.accounts.length + "): ");
  const i = parseInt(idx, 10) - 1;
  if (isNaN(i) || i < 0 || i >= config.accounts.length) {
    console.log("  Invalid selection.");
    return;
  }

  const existing = config.accounts[i]!;
  console.log("\n  Updating " + c.bold + existing.username + c.reset + ". Press Enter to keep current value.\n");

  const dpCode = await prompt("  DP Code [" + existing.dpCode + "]: ");
  const username = await prompt("  BOID / Username [" + existing.username + "]: ");
  const password = await promptPassword("  Password [" + c.dim + "unchanged" + c.reset + "]: ");
  const crn = await prompt("  CRN [" + (existing.crn ?? "not set") + "]: ");
  const transactionPin = await prompt("  Transaction PIN [" + (existing.transactionPin ? "****" : "not set") + "]: ");

  config.accounts[i] = {
    dpCode: dpCode || existing.dpCode,
    username: username || existing.username,
    password: password || existing.password,
    crn: crn || existing.crn,
    transactionPin: transactionPin || existing.transactionPin,
  };

  saveConfig(config);
  console.log("\n  " + c.green + "✓" + c.reset + " Account " + c.bold + config.accounts[i]!.username + c.reset + " updated.\n");
}

// ─── Portfolio Command ──────────────────────────────────────────────────────────

async function portfolioCommand(config: Config, dpList: DP[]): Promise<void> {
  const { accounts } = config;
  printHeader("MEROSHARE PORTFOLIO  —  " + accounts.length + " Account(s)");

  const client = new MeroshareClient();
  let grandTotal = 0;

  for (const account of accounts) {
    const dpCode = String(account.dpCode);
    const { username, password } = account;

    try {
      const { id: dpId, name: dpName } = client.getDPId(dpCode, dpList);
      printStatus("Logging in as " + username + " @ " + dpName + "...");

      await client.login(dpId, username, password);
      printStatus("", true);

      const detail = await client.getOwnDetail();
      const portfolio = await client.getPortfolio(detail.demat, detail.clientCode);

      const total = displayPortfolio(detail, portfolio);
      grandTotal += total;

      await client.logout();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      printError("Error for " + username + ": " + msg);
    }
  }

  if (accounts.length > 1) {
    printGrandTotal(grandTotal);
  }

  printFooter();
}

// ─── Apply Command ──────────────────────────────────────────────────────────────

interface AccountStatus {
  account: Account;
  name: string;
  demat: string;
  boid: string;
  applied: boolean;
  dpId: number;
  dpName: string;
}

async function applyCommand(config: Config, dpList: DP[]): Promise<void> {
  const { accounts } = config;

  const missingConfig = accounts.filter((a) => !a.crn || !a.transactionPin);
  if (missingConfig.length > 0) {
    console.error("\n  Error: The following accounts are missing 'crn' or 'transactionPin':");
    for (const a of missingConfig) {
      console.error("    - " + a.username);
    }
    console.error("\n  Run " + c.cyan + "meroshare accounts" + c.reset + " to update them.\n");
    process.exit(1);
  }

  printHeader("MEROSHARE IPO APPLY  —  " + accounts.length + " Account(s)");

  const firstAccount = accounts[0]!;
  const client = new MeroshareClient();
  const { id: dpId, name: dpName } = client.getDPId(String(firstAccount.dpCode), dpList);

  printStatus("Logging in as " + firstAccount.username + " @ " + dpName + " to fetch issues...");
  await client.login(dpId, firstAccount.username, firstAccount.password);
  printStatus("", true);

  printStatus("Fetching applicable issues...");
  const issueResp = await client.getApplicableIssues();
  printStatus("", true);

  const issues = issueResp.object ?? [];
  if (issues.length === 0) {
    console.log("\n  No applicable issues found at the moment.\n");
    await client.logout();
    return;
  }

  displayIssueList(issues);

  const selection = await prompt("\n  Select issue number (1-" + issues.length + "): ");
  const issueIdx = parseInt(selection, 10) - 1;
  if (isNaN(issueIdx) || issueIdx < 0 || issueIdx >= issues.length) {
    console.error("  Invalid selection.");
    await client.logout();
    return;
  }

  const selectedIssue = issues[issueIdx]!;

  printStatus("Fetching details for " + selectedIssue.scrip + "...");
  const issueDetail = await client.getIssueDetail(selectedIssue.companyShareId);
  printStatus("", true);

  displayIssueDetail(issueDetail);

  // Check all accounts' apply status (reuse first account's session)
  console.log("");
  printStatus("Checking all accounts...\n");

  const accountStatuses: AccountStatus[] = [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]!;
    const dpCode = String(account.dpCode);
    const { id: acDpId, name: acDpName } = client.getDPId(dpCode, dpList);

    const acClient = i === 0 ? client : new MeroshareClient();

    try {
      if (i !== 0) {
        await acClient.login(acDpId, account.username, account.password);
      }
      const detail = await acClient.getOwnDetail();
      const applied = await acClient.checkAlreadyApplied(selectedIssue.companyShareId);
      accountStatuses.push({
        account,
        name: detail.name,
        demat: detail.demat,
        boid: detail.boid,
        applied,
        dpId: acDpId,
        dpName: acDpName,
      });
      if (i !== 0) {
        await acClient.logout();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      printError("Error checking " + account.username + ": " + msg);
    }
  }

  await client.logout();

  // Display account list with status
  const unapplied = accountStatuses.filter((s) => !s.applied);

  console.log("\n  " + c.bold + c.white + "Accounts for " + selectedIssue.scrip + ":" + c.reset);
  console.log("  " + c.dim + "─".repeat(60) + c.reset);

  let optionIdx = 0;
  if (unapplied.length > 0) {
    console.log("  " + c.bold + c.cyan + "(" + optionIdx + ")" + c.reset + "  " + c.bold + "All Unapplied (" + unapplied.length + " accounts)" + c.reset);
    optionIdx++;
  }

  for (const status of accountStatuses) {
    const tag = status.applied
      ? c.red + "[Applied]" + c.reset
      : c.green + "[Not Applied]" + c.reset;
    const selectable = !status.applied;
    const idx = selectable ? c.cyan + "(" + optionIdx + ")" + c.reset : c.dim + "   " + c.reset;
    if (selectable) optionIdx++;
    console.log("  " + idx + "  " + status.name + " (" + status.account.username + ")  " + tag);
  }

  if (unapplied.length === 0) {
    console.log("\n  All accounts have already applied for " + selectedIssue.scrip + ".");
    printFooter();
    return;
  }

  const maxOption = optionIdx - 1;
  const accountSelection = await prompt("\n  Select option (0-" + maxOption + "): ");
  const selectedOption = parseInt(accountSelection, 10);
  if (isNaN(selectedOption) || selectedOption < 0 || selectedOption > maxOption) {
    console.error("  Invalid selection.");
    return;
  }

  let targetAccounts: AccountStatus[];
  if (unapplied.length > 0 && selectedOption === 0) {
    targetAccounts = unapplied;
  } else {
    const unappliedIdx = unapplied.length > 0 ? selectedOption - 1 : selectedOption;
    targetAccounts = [unapplied[unappliedIdx]!];
  }

  const kittaInput = await prompt(
    "\n  Enter number of kitta to apply (min: " + issueDetail.minUnit + ", max: " + issueDetail.maxUnit + ", multiple of " + issueDetail.multipleOf + "): "
  );
  const kitta = parseInt(kittaInput, 10);
  if (
    isNaN(kitta) ||
    kitta < issueDetail.minUnit ||
    kitta > issueDetail.maxUnit ||
    kitta % issueDetail.multipleOf !== 0
  ) {
    console.error(
      "  Invalid kitta. Must be between " + issueDetail.minUnit + "-" + issueDetail.maxUnit + ", multiple of " + issueDetail.multipleOf + "."
    );
    return;
  }

  // Confirm
  console.log(
    "\n  Applying " + c.bold + kitta + c.reset + " kitta of " + c.bold + selectedIssue.scrip + c.reset + " to " + c.bold + targetAccounts.length + c.reset + " account(s):"
  );
  for (const t of targetAccounts) {
    console.log("    - " + t.name + " (" + t.account.username + ")");
  }
  const confirmApply = await prompt("\n  Proceed? (y/n): ");
  if (confirmApply.toLowerCase() !== "y") {
    console.log("  Cancelled.");
    return;
  }

  // Apply
  console.log("");
  printHeader("APPLYING " + kitta + " KITTA of " + selectedIssue.scrip);

  const results: { username: string; success: boolean; message: string }[] = [];

  for (const status of targetAccounts) {
    const { account } = status;
    const acClient = new MeroshareClient();

    try {
      printStatus("Logging in as " + account.username + " @ " + status.dpName + "...");
      await acClient.login(status.dpId, account.username, account.password);
      printStatus("", true);

      const detail = await acClient.getOwnDetail();

      printStatus("  Fetching bank details...");
      const banks = await acClient.getBankList();
      if (banks.length === 0) {
        printStatus("", true);
        displayApplyResult(account.username, false, "No banks linked");
        results.push({ username: account.username, success: false, message: "No banks linked" });
        await acClient.logout();
        continue;
      }

      const bank = banks[0]!;
      const bankAccounts = await acClient.getBankAccounts(bank.id);
      if (bankAccounts.length === 0) {
        printStatus("", true);
        displayApplyResult(account.username, false, "No bank accounts");
        results.push({ username: account.username, success: false, message: "No bank accounts" });
        await acClient.logout();
        continue;
      }
      const bankAccount = bankAccounts[0]!;
      printStatus("", true);

      displayBankInfo(account.username, detail.name, bank.name, bankAccount.accountNumber);

      printStatus("  Applying " + kitta + " kitta...");
      await acClient.applyIPO({
        demat: detail.demat,
        boid: detail.boid,
        accountNumber: bankAccount.accountNumber,
        customerId: bankAccount.id,
        accountBranchId: bankAccount.accountBranchId,
        accountTypeId: bankAccount.accountTypeId,
        appliedKitta: String(kitta),
        crnNumber: account.crn!,
        transactionPIN: account.transactionPin!,
        companyShareId: String(selectedIssue.companyShareId),
        bankId: String(bank.id),
      });
      printStatus("", true);

      displayApplyResult(account.username, true, "Applied successfully");
      results.push({ username: account.username, success: true, message: "Applied successfully" });

      await acClient.logout();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      displayApplyResult(account.username, false, msg);
      results.push({ username: account.username, success: false, message: msg });
    }
  }

  // Summary
  console.log("");
  printHeader("APPLY SUMMARY");
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  console.log("  " + c.green + "✓" + c.reset + " Success: " + successCount + "  |  " + c.red + "✗" + c.reset + " Failed/Skipped: " + failCount);
  for (const r of results) {
    const icon = r.success ? "✓" : "✗";
    const color = r.success ? c.green : c.red;
    console.log("  " + color + icon + c.reset + "  " + r.username + ": " + r.message);
  }
  printFooter();
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const command = process.argv[2] ?? "portfolio";

  // Commands that don't need accounts or API
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      helpCommand();
      return;
    case "version":
    case "--version":
    case "-v":
      console.log("@cbashik/meroshare v" + VERSION);
      return;
    case "init":
      await initCommand();
      return;
    case "configure":
      await configureCommand();
      return;
    case "accounts":
      await accountsCommand();
      return;
  }

  // Validate known API commands
  const apiCommands = ["portfolio", "apply"];
  if (!apiCommands.includes(command)) {
    console.log("\n  Unknown command: " + c.red + command + c.reset);
    console.log("  Run " + c.cyan + "meroshare help" + c.reset + " for usage.\n");
    process.exit(1);
  }

  // Commands that need config + API
  const config = loadConfig();
  const { accounts } = config;

  if (!accounts?.length) {
    console.log("\n  No accounts configured. Run " + c.cyan + "meroshare configure" + c.reset + " to add one.\n");
    process.exit(1);
  }

  // Check curl before making API calls
  if (!isCurlInstalled()) {
    console.log("\n  " + c.red + "✗" + c.reset + " curl is not installed. Run " + c.cyan + "meroshare init" + c.reset + " to set up dependencies.\n");
    process.exit(1);
  }

  // Fetch DP list once (shared across commands)
  const client = new MeroshareClient();
  printStatus("Fetching DP list...");
  const dpList = await client.getDPList();
  printStatus("", true);
  process.stdout.write("  " + c.dim + "(" + dpList.length + " DPs)" + c.reset + "\n");

  switch (command) {
    case "portfolio":
      await portfolioCommand(config, dpList);
      break;
    case "apply":
      await applyCommand(config, dpList);
      break;
  }
}

main();
