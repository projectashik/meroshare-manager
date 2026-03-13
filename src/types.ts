export interface Account {
  dpCode: string;
  username: string;
  password: string;
  crn?: string;
  transactionPin?: string;
  boid?: string;
}

export interface Config {
  accounts: Account[];
}

export interface DP {
  code: string;
  id: number;
  name: string;
}

export interface LoginPayload {
  clientId: number;
  username: string;
  password: string;
}

export interface LoginResponse {
  statusCode: number;
  passwordPolicyChanged: boolean;
  passwordExpired: boolean;
  changePassword: boolean;
  accountExpired: boolean;
  dematExpired: boolean;
  message: string;
  isTransactionPINNotSetBefore: boolean;
  isTransactionPINReset: boolean;
}

export interface OwnDetail {
  address: string;
  boid: string;
  clientCode: string;
  contact: string;
  demat: string;
  dematExpiryDate: string;
  email: string;
  gender: string;
  id: number;
  meroShareEmail: string;
  name: string;
  profileName: string;
  username: string;
}

export interface PortfolioItem {
  currentBalance: number;
  lastTransactionPrice: string;
  previousClosingPrice: string;
  script: string;
  scriptDesc: string;
  valueAsOfLastTransactionPrice: string;
  valueAsOfPreviousClosingPrice: string;
  valueOfLastTransPrice: number;
  valueOfPrevClosingPrice: number;
}

export interface PortfolioResponse {
  meroShareMyPortfolio: PortfolioItem[];
  totalItems: number;
  totalValueAsOfLastTransactionPrice: string;
  totalValueAsOfPreviousClosingPrice: string;
  totalValueOfLastTransPrice: number;
  totalValueOfPrevClosingPrice: number;
}

// ─── IPO Apply Types ──────────────────────────────────────────────────────────

export interface ApplicableIssue {
  companyShareId: number;
  scrip: string;
  companyName: string;
  shareTypeName: string;
  shareGroupName: string;
  subGroup: string;
}

export interface ApplicableIssueResponse {
  object: ApplicableIssue[];
  totalCount: number;
}

export interface IssueDetail {
  clientName: string;
  companyName: string;
  companyShareId: number;
  minUnit: number;
  maxUnit: number;
  multipleOf: number;
  scrip: string;
  sharePerUnit: number;
  shareValue: number;
  shareTypeName: string;
  shareGroupName: string;
  subGroup: string;
}

export interface Bank {
  code: string;
  id: number;
  name: string;
}

export interface BankAccount {
  accountBranchId: number;
  accountNumber: string;
  accountTypeId: number;
  accountTypeName: string;
  branchName: string;
  id: number;
}

export interface ApplyPayload {
  demat: string;
  boid: string;
  accountNumber: string;
  customerId: number;
  accountBranchId: number;
  accountTypeId: number;
  appliedKitta: string;
  crnNumber: string;
  transactionPIN: string;
  companyShareId: string;
  bankId: string;
}

export interface ApplyResponse {
  statusCode?: number;
  message?: string;
  status?: string;
}
