/* ==========================================================
   D+G TERMINAL — SYSTEM CONFIGURATION
   For each system, set:
     url:    the full web address, e.g. "https://ddq.example.com"
             (leave "" until the system is ready; the card will not navigate)
     status: "live" | "maintenance" | "offline"
   ========================================================== */
export type SystemId = "ddq" | "aml" | "rtg" | "esg" | "mon" | "grn";
export type SystemStatus = "live" | "maintenance" | "offline";

export interface SystemConfig {
  url: string;
  status: SystemStatus;
}

export const SYSTEMS: Record<SystemId, SystemConfig> = {
  ddq: { url: "", status: "live" }, // 01 Due Diligence
  aml: { url: "", status: "live" }, // 02 AML/CFT
  rtg: { url: "", status: "live" }, // 03 Credit Rating
  esg: { url: "", status: "live" }, // 04 Sustainability Rating
  mon: { url: "", status: "live" }, // 05 Portfolio Monitor
  grn: { url: "", status: "live" }, // 06 Green Academy
};

/* Open systems in a new browser tab (true) or the same tab (false). */
export const OPEN_IN_NEW_TAB = true;
