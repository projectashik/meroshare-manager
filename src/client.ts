import { Curl, CurlHttpVersion, HeaderInfo } from "node-libcurl";
import type {
  DP,
  LoginPayload,
  LoginResponse,
  OwnDetail,
  PortfolioResponse,
} from "./types.js";

const BASE_URL = "https://webbackend.cdsc.com.np/api";

interface CurlResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function request(
  method: "GET" | "POST",
  url: string,
  options?: { data?: unknown; token?: string }
): Promise<CurlResponse> {
  return new Promise((resolve, reject) => {
    const curl = new Curl();

    curl.setOpt("URL", url);
    curl.setOpt("CUSTOMREQUEST", method);
    curl.setOpt("HTTP_VERSION", CurlHttpVersion.V1_1);

    const headers = [
      "Content-Type: application/json",
      "Accept: application/json",
    ];
    if (options?.token) {
      headers.push(`Authorization: ${options.token}`);
    }
    curl.setOpt("HTTPHEADER", headers);

    if (method === "POST" && options?.data !== undefined) {
      curl.setOpt("POSTFIELDS", JSON.stringify(options.data));
    }

    curl.on("end", (statusCode: number, body: string | Buffer, rawHeaders: HeaderInfo[]) => {
      // Parse response headers from the last response (skip redirects)
      const respHeaders: Record<string, string> = {};
      const lastHeaders = rawHeaders[rawHeaders.length - 1];
      if (lastHeaders) {
        for (const [key, value] of Object.entries(lastHeaders)) {
          if (typeof value === "string") {
            respHeaders[key.toLowerCase()] = value;
          }
        }
      }

      curl.close();
      resolve({
        statusCode,
        headers: respHeaders,
        body: typeof body === "string" ? body : body.toString("utf-8"),
      });
    });

    curl.on("error", (err: Error) => {
      curl.close();
      reject(err);
    });

    curl.perform();
  });
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

  private async post<T>(
    url: string,
    data: unknown
  ): Promise<{ parsed: T; headers: Record<string, string> }> {
    const resp = await request("POST", url, {
      data,
      token: this.token ?? undefined,
    });
    if (resp.statusCode >= 400) {
      throw new Error(`HTTP ${resp.statusCode}: ${resp.body.slice(0, 200)}`);
    }
    return { parsed: JSON.parse(resp.body) as T, headers: resp.headers };
  }

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
}
