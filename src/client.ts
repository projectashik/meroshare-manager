import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  ApplicableIssueResponse,
  ApplyPayload,
  ApplyResponse,
  Bank,
  BankAccount,
  DP,
  IssueDetail,
  LoginPayload,
  LoginResponse,
  OwnDetail,
  PortfolioResponse,
} from "./types.js";

const execFileAsync = promisify(execFile);

const BASE_URL = "https://webbackend.cdsc.com.np/api";

interface CurlResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

async function request(
  method: "GET" | "POST",
  url: string,
  options?: { data?: unknown; token?: string }
): Promise<CurlResponse> {
  // curl -s -i: silent, include headers in output (headers + blank line + body)
  const args = ["-s", "-i", "-X", method];

  const headers: string[] = [
    "Content-Type: application/json",
    "Accept: application/json",
  ];
  if (options?.token) {
    headers.push(`Authorization: ${options.token}`);
  }
  for (const h of headers) {
    args.push("-H", h);
  }

  if (method === "POST" && options?.data !== undefined) {
    args.push("-d", JSON.stringify(options.data));
  }

  args.push(url);

  let stdout: string;
  try {
    const result = await execFileAsync("curl", args, {
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err: unknown) {
    // curl returns non-zero for HTTP errors but still outputs the response
    const execErr = err as { stdout?: string; stderr?: string; code?: number };
    if (execErr.stdout) {
      stdout = execErr.stdout;
    } else {
      throw new Error(`curl failed (code ${execErr.code}): ${execErr.stderr ?? "unknown error"}`);
    }
  }

  // Parse: headers are separated from body by a blank line (\r\n\r\n)
  // Handle potential multiple HTTP responses (redirects) — use the last one
  const respHeaders: Record<string, string> = {};
  let statusCode = 0;
  let body = "";

  // Split on double CRLF or double LF
  const separator = stdout.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
  const parts = stdout.split(separator);

  // Find the last HTTP header block and the body after it
  let lastHeaderIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]!.trimStart().startsWith("HTTP/")) {
      lastHeaderIdx = i;
    }
  }

  if (lastHeaderIdx >= 0) {
    // Parse the last header block
    const headerBlock = parts[lastHeaderIdx]!;
    for (const line of headerBlock.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("HTTP/")) {
        const hParts = trimmed.split(/\s+/);
        statusCode = parseInt(hParts[1] ?? "0", 10);
      } else if (trimmed.includes(": ")) {
        const idx = trimmed.indexOf(": ");
        const key = trimmed.slice(0, idx).toLowerCase();
        const val = trimmed.slice(idx + 2);
        respHeaders[key] = val;
      }
    }
    // Body is everything after the last header block
    body = parts.slice(lastHeaderIdx + 1).join(separator);
  } else {
    // No headers found, treat everything as body
    body = stdout;
  }

  return { statusCode, headers: respHeaders, body };
}

export class MeroshareClient {
  private token: string | null = null;

  private async get<T>(url: string): Promise<T> {
    const resp = await request("GET", url, { token: this.token ?? undefined });
    if (resp.statusCode >= 400) {
      throw new Error(`HTTP ${resp.statusCode}: ${resp.body.slice(0, 200)}`);
    }
    return JSON.parse(resp.body) as T;
  }

  private async getRaw(url: string): Promise<CurlResponse> {
    return request("GET", url, { token: this.token ?? undefined });
  }

  private async post<T>(
    url: string,
    data: unknown
  ): Promise<{ parsed: T; headers: Record<string, string>; statusCode: number }> {
    const resp = await request("POST", url, {
      data,
      token: this.token ?? undefined,
    });
    if (resp.statusCode >= 400) {
      throw new Error(`HTTP ${resp.statusCode}: ${resp.body.slice(0, 200)}`);
    }
    return { parsed: JSON.parse(resp.body) as T, headers: resp.headers, statusCode: resp.statusCode };
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async getDPList(): Promise<DP[]> {
    return this.get<DP[]>(`${BASE_URL}/meroShare/capital/`);
  }

  getDPId(dpCode: string, dpList: DP[]): { id: number; name: string } {
    const dp = dpList.find((d) => d.code === dpCode);
    if (!dp) throw new Error(`DP with code '${dpCode}' not found`);
    return { id: dp.id, name: dp.name };
  }

  async login(
    clientId: number,
    username: string,
    password: string
  ): Promise<LoginResponse> {
    const payload: LoginPayload = { clientId, username, password };
    const { parsed, headers } = await this.post<LoginResponse>(
      `${BASE_URL}/meroShare/auth/`,
      payload
    );

    this.token = headers["authorization"] ?? null;
    if (!this.token) {
      throw new Error(`Login failed: ${JSON.stringify(parsed).slice(0, 200)}`);
    }

    return parsed;
  }

  async getOwnDetail(): Promise<OwnDetail> {
    return this.get<OwnDetail>(`${BASE_URL}/meroShare/ownDetail/`);
  }

  async logout(): Promise<void> {
    try {
      await request("GET", `${BASE_URL}/meroShare/logout/`, {
        token: this.token ?? undefined,
      });
    } catch {
      // ignore logout errors
    }
    this.token = null;
  }

  // ─── Portfolio ──────────────────────────────────────────────────────────────

  async getPortfolio(
    demat: string,
    clientCode: string
  ): Promise<PortfolioResponse> {
    const { parsed } = await this.post<PortfolioResponse>(
      `${BASE_URL}/meroShareView/myPortfolio/`,
      {
        sortBy: "script",
        demat: [demat],
        clientCode,
        page: 1,
        size: 200,
        sortAsc: true,
      }
    );
    return parsed;
  }

  // ─── IPO Apply ──────────────────────────────────────────────────────────────

  async getApplicableIssues(): Promise<ApplicableIssueResponse> {
    const { parsed } = await this.post<ApplicableIssueResponse>(
      `${BASE_URL}/meroShare/companyShare/applicableIssue/`,
      {
        filterFieldParams: [
          { key: "companyIssue.companyISIN.script", alias: "Scrip" },
          { key: "companyIssue.companyISIN.company.name", alias: "Company Name" },
          { key: "companyIssue.assignedToClient.name", value: "", alias: "Issue Manager" },
        ],
        page: 1,
        size: 200,
        searchRoleViewConstants: "VIEW_APPLICABLE_SHARE",
        filterDateParams: [
          { key: "minIssueOpenDate", condition: "", alias: "", value: "" },
          { key: "maxIssueCloseDate", condition: "", alias: "", value: "" },
        ],
      }
    );
    return parsed;
  }

  async getIssueDetail(companyShareId: number): Promise<IssueDetail> {
    return this.get<IssueDetail>(`${BASE_URL}/meroShare/active/${companyShareId}`);
  }

  async checkAlreadyApplied(companyShareId: number): Promise<boolean> {
    const { parsed } = await this.post<{ object: { companyShareId: number }[] }>(
      `${BASE_URL}/meroShare/applicantForm/active/search/`,
      {
        filterFieldParams: [
          { key: "companyShare.companyIssue.companyISIN.script", alias: "Scrip" },
          { key: "companyShare.companyIssue.companyISIN.company.name", alias: "Company Name" },
        ],
        page: 1,
        size: 200,
        searchRoleViewConstants: "VIEW_APPLICANT_FORM_COMPLETE",
        filterDateParams: [
          { key: "appliedDate", condition: "", alias: "", value: "" },
          { key: "appliedDate", condition: "", alias: "", value: "" },
        ],
      }
    );
    const applications = parsed.object ?? [];
    return applications.some((app) => app.companyShareId === companyShareId);
  }

  async getBankList(): Promise<Bank[]> {
    return this.get<Bank[]>(`${BASE_URL}/meroShare/bank/`);
  }

  async getBankAccounts(bankId: number): Promise<BankAccount[]> {
    return this.get<BankAccount[]>(`${BASE_URL}/meroShare/bank/${bankId}`);
  }

  async applyIPO(payload: ApplyPayload): Promise<ApplyResponse> {
    const resp = await request("POST", `${BASE_URL}/meroShare/applicantForm/share/apply`, {
      data: payload,
      token: this.token ?? undefined,
    });

    let parsed: ApplyResponse;
    try {
      parsed = JSON.parse(resp.body) as ApplyResponse;
    } catch {
      parsed = { message: resp.body.slice(0, 300) };
    }
    parsed.statusCode = resp.statusCode;

    if (resp.statusCode >= 400) {
      throw new Error(parsed.message ?? `HTTP ${resp.statusCode}`);
    }

    return parsed;
  }
}
