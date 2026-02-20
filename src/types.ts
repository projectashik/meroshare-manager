export interface Account {
  dpCode: string;
  username: string;
  password: string;
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
