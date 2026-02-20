/**
 * macOS Keychain integration for secure credential storage.
 * Uses the system `security` CLI tool to interact with Keychain.
 */

import { execFileSync } from "node:child_process";
import type { Account } from "./types.js";

const SERVICE_NAME = "meroshare-cli";
const ACCOUNT_NAME = "accounts";

export function isMacOS(): boolean {
  return process.platform === "darwin";
}

export function keychainAvailable(): boolean {
  if (!isMacOS()) return false;
  try {
    execFileSync("security", ["help"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load accounts from macOS Keychain.
 * Returns null if no entry exists or not on macOS.
 */
export function loadFromKeychain(): Account[] | null {
  if (!keychainAvailable()) return null;

  try {
    const result = execFileSync(
      "security",
      ["find-generic-password", "-s", SERVICE_NAME, "-a", ACCOUNT_NAME, "-w"],
      { stdio: ["pipe", "pipe", "pipe"], encoding: "utf-8" }
    );
    const parsed = JSON.parse(result.trim());
    if (Array.isArray(parsed)) {
      return parsed as Account[];
    }
    return null;
  } catch {
    // Entry not found or parse error
    return null;
  }
}

/**
 * Save accounts to macOS Keychain.
 * Deletes any existing entry first, then creates a new one.
 */
export function saveToKeychain(accounts: Account[]): void {
  if (!keychainAvailable()) {
    throw new Error("Keychain is not available on this system.");
  }

  const json = JSON.stringify(accounts);

  // Delete existing entry (ignore errors if it doesn't exist)
  try {
    execFileSync(
      "security",
      ["delete-generic-password", "-s", SERVICE_NAME, "-a", ACCOUNT_NAME],
      { stdio: "pipe" }
    );
  } catch {
    // Entry didn't exist, that's fine
  }

  // Add new entry
  execFileSync(
    "security",
    ["add-generic-password", "-s", SERVICE_NAME, "-a", ACCOUNT_NAME, "-w", json],
    { stdio: "pipe" }
  );
}

/**
 * Delete all accounts from macOS Keychain.
 */
export function deleteFromKeychain(): void {
  if (!keychainAvailable()) return;

  try {
    execFileSync(
      "security",
      ["delete-generic-password", "-s", SERVICE_NAME, "-a", ACCOUNT_NAME],
      { stdio: "pipe" }
    );
  } catch {
    // Entry didn't exist
  }
}
