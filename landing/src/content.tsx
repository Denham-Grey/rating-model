import type { ComponentType } from "react";
import type { SystemId } from "./config";
import { AcademyIcon, AmlIcon, DdqIcon, EsgIcon, MonitorIcon, RatingIcon } from "./components/Icons";

export interface SystemContent {
  id: SystemId;
  rgb: string;
  title: string;
  question: string;
  description: string;
  Icon: ComponentType;
}

export const LIFECYCLE = [
  { label: "DILIGENCE", color: "#D9B66A" },
  { label: "SCREEN", color: "#F08A7A" },
  { label: "RATE", color: "#7FB2F0" },
  { label: "SUSTAIN", color: "#6FCF9E" },
  { label: "MONITOR", color: "#B9A2F2" },
  { label: "EMPOWER", color: "#6AD1DA" },
];

export const SYSTEM_CONTENT: SystemContent[] = [
  {
    id: "ddq",
    rgb: "217,182,106",
    title: "Due Diligence",
    question: "Should we lend to this institution?",
    description:
      "Structured diligence on every partner institution — questionnaires, a document vault, on-site findings and pillar scoring, rolled into an investment-committee memo.",
    Icon: DdqIcon,
  },
  {
    id: "aml",
    rgb: "240,138,122",
    title: "AML/CFT",
    question: "Is the money clean?",
    description:
      "Financial-crime controls, end to end — sanctions and PEP screening, real-time transaction monitoring and automated STR/CTR filing, with a full audit trail.",
    Icon: AmlIcon,
  },
  {
    id: "rtg",
    rgb: "127,178,240",
    title: "Credit Rating",
    question: "How much risk are we taking?",
    description:
      "Our proprietary credit model for financial institutions — CAMELS-based analysis, qualitative overlays and country risk, mapped to an AAA–D scale and a one-year probability of default.",
    Icon: RatingIcon,
  },
  {
    id: "esg",
    rgb: "111,207,158",
    title: "Sustainability Rating",
    question: "Is it doing good?",
    description:
      "Sustainability performance, scored and benchmarked — E&S risk management, climate exposure, green and inclusive lending and governance, tracked across the book over time.",
    Icon: EsgIcon,
  },
  {
    id: "mon",
    rgb: "185,162,242",
    title: "Portfolio Monitor",
    question: "Is it still on track?",
    description:
      "Live surveillance of every borrower — covenants, repayments, PAR and liquidity, with a digital twin of each institution and early-warning signals.",
    Icon: MonitorIcon,
  },
  {
    id: "grn",
    rgb: "106,209,218",
    title: "Green Academy",
    question: "Are its people ready?",
    description:
      "Capacity building for partner-institution staff — climate and sustainable-finance courses, live cohorts and certifications, linked to each institution's rating.",
    Icon: AcademyIcon,
  },
];
