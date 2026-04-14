import { homedir } from "node:os";

export const API_BASE = process.env.ZERION_API_BASE || "https://api.zerion.io/v1";
export const HOME = process.env.HOME || process.env.USERPROFILE || homedir();
export const CONFIG_DIR = `${HOME}/.zerion`;
export const CONFIG_PATH = `${CONFIG_DIR}/config.json`;
export const DEFAULT_SLIPPAGE = 2;
export const DEFAULT_CHAIN = "ethereum";
export const NATIVE_ASSET_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
