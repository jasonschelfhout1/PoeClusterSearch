// PoE Trade API Types based on official API documentation
// Reference: https://github.com/wgnodejsstudy/nodejs/issues/7

export interface PriceData {
  type: string;
  amount: number;
  currency: string;
}

export interface AccountInfo {
  name: string;
  lastCharacterName: string;
  online: boolean;
  league: string;
}

export interface StashInfo {
  name: string;
  x: number;
  y: number;
}

export interface ListingInfo {
  method: string;
  indexed: string;
  stash: StashInfo;
  whisper: string;
  account: AccountInfo;
  price: PriceData;
}

export interface SocketInfo {
  group: number;
  attr: string;
  sColour: string;
}

export interface PropertyValue {
  name: string;
  values: Array<[string, number]>;
  displayMode: number;
}

export interface RequirementValue {
  name: string;
  values: Array<[string, number]>;
  displayMode: number;
}

export interface ModMagnitude {
  hash: string;
  min: number;
  max: number;
}

export interface ModInfo {
  name: string;
  tier: string;
  magnitudes: ModMagnitude[];
}

export interface ItemMods {
  implicit: ModInfo[];
  explicit: ModInfo[];
  enchant?: ModInfo[];
}

export interface ItemHashes {
  implicit: Array<[string, number[]]>;
  explicit: Array<[string, number[]]>;
  enchant?: Array<[string, number[]]>;
}

export interface ItemExtended {
  es?: number;
  ar?: number;
  ev?: number;
  mods: ItemMods;
  hashes: ItemHashes;
  text: string;
}

export interface ItemData {
  verified: boolean;
  w: number;
  h: number;
  icon: string;
  league: string;
  sockets: SocketInfo[];
  name: string;
  typeLine: string;
  identified: boolean;
  ilvl: number;
  properties?: PropertyValue[];
  requirements?: RequirementValue[];
  implicitMods?: string[];
  explicitMods?: string[];
  flavourText?: string[];
  frameType: number;
  extended: ItemExtended;
}

export interface ResultItem {
  id: string;
  listing: ListingInfo;
  item: ItemData;
}

export interface SearchResponse {
  result: string[]; // Array of item IDs
  id: string; // Query ID for fetching details
  total: number; // Total number of results matching query
}

export interface FetchResponse {
  result: ResultItem[]; // Array of full item details
}

// Search Query Types
export interface StatFilter {
  id: string;
  disabled: boolean;
  value?: {
    min?: number;
    max?: number;
    option?: number | string;
  };
}

export interface StatGroup {
  type: "and" | "or" | "count";
  filters: StatFilter[];
  disabled: boolean;
  value?: {
    min?: number;
    max?: number;
  };
}

export interface IlvlFilter {
  min?: number;
  max?: number;
}

export interface MiscFilters {
  filters: {
    ilvl?: IlvlFilter;
    veiled?: { option: string };
    corrupted?: { option: string };
    synthesised_item?: { option: string };
  };
  disabled: boolean;
}

export interface TypeFilters {
  filters: {
    rarity?: { option: string };
    category?: { option: string };
  };
  disabled: boolean;
}

export interface TradeFilters {
  filters: {
    fee?: {
      min?: number;
      max?: number | null;
    };
  };
  disabled: boolean;
}

export interface QueryFilters {
  misc_filters: MiscFilters;
  type_filters: TypeFilters;
  trade_filters: TradeFilters;
}

export interface SearchQuery {
  query: {
    status?: { option: string };
    stats: StatGroup[];
    filters: QueryFilters;
  };
  sort: {
    price: "asc" | "desc";
  };
}

// UI State Types
export interface ClusterJewelFilters {
  jewelType: string | null;
  priceMin: number;
  priceMax: number | null;
  ilvlMin: number;
  ilvlMax: number;
  enabledStatFilters: string[];
}

export interface SearchResult {
  id: string;
  name: string;
  typeLine: string;
  ilvl: number;
  priceAmount: number;
  priceCurrency: string;
  seller: string;
  online: boolean;
  listed: string;
  category?: string;
  explicitMods: string[];
}
