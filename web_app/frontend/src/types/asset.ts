export type AssetStatus = 'active' | 'disconnected' | 'never_connected' | 'unknown';

export interface AssetItem {
  id: string;
  name: string;
  ip: string;
  mac?: string;
  os?: string;
  status: AssetStatus;
  risk_score: number;
  last_seen?: string;
}

export interface DhcpRecord {
  ip: string;
  mac: string;
  hostname?: string;
  lease_start: string;
  lease_end: string;
  state?: string;
}

export interface WifiSession {
  username: string;
  mac: string;
  ap_ip: string;
  ap_name?: string;
  ssid?: string;
  signal_strength?: number;
  duration?: number;
  bytes_tx?: number;
  bytes_rx?: number;
  login_time: string;
}

export interface RiskScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
}

export interface DeviceDetail extends AssetItem {
  hardware?: {
    cpu?: string;
    ram_mb?: number;
    disk_gb?: number;
    network_interfaces?: {
      name: string;
      ip: string;
      mac: string;
    }[];
  };
  packages?: {
    name: string;
    version: string;
  }[];
  ports?: {
    port: number;
    protocol: string;
    state: string;
    process?: string;
  }[];
}
