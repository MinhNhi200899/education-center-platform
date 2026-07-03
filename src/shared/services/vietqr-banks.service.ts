export interface VietQRBank {
  code: string;
  name: string;
  fullName: string;
  logo: string;
  bin: string;
}

interface VietQRBankApiItem {
  code: string;
  name: string;
  shortName: string;
  logo: string;
  bin: string;
  transferSupported?: number;
  isTransfer?: number;
}

interface VietQRBankApiResponse {
  code: string;
  data: VietQRBankApiItem[];
}

let cachedBanks: VietQRBank[] | null = null;
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchVietQRBanks(): Promise<VietQRBank[]> {
  if (cachedBanks && Date.now() < cacheExpiresAt) {
    return cachedBanks;
  }

  const response = await fetch('https://api.vietqr.io/v2/banks');
  if (!response.ok) {
    throw new Error(`VietQR banks API failed: ${response.status}`);
  }

  const json = (await response.json()) as VietQRBankApiResponse;
  if (json.code !== '00' || !Array.isArray(json.data)) {
    throw new Error('Invalid VietQR banks API response');
  }

  cachedBanks = json.data
    .filter((bank) => bank.transferSupported === 1 || bank.isTransfer === 1)
    .map((bank) => ({
      code: bank.code,
      name: bank.shortName,
      fullName: bank.name,
      logo: bank.logo,
      bin: bank.bin,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedBanks;
}

/** @internal test helper */
export function clearVietQRBanksCache(): void {
  cachedBanks = null;
  cacheExpiresAt = 0;
}
