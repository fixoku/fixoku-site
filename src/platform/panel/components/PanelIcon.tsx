type IconName =
  | "home" | "user" | "book" | "presentation" | "folder" | "cube"
  | "users" | "calendar" | "wallet" | "logout" | "search" | "bell"
  | "arrow" | "chevron-down" | "package" | "menu" | "bolt" | "info" | "check"
  | "receipt" | "credit-card" | "graduation" | "chart" | "settings" | "mail"
  | "shield" | "history" | "truck" | "boxes" | "user-check" | "handshake"
  | "bank" | "clipboard" | "flow";

const paths: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16",
  presentation: "M3 4h18v12H3zM7 20h10M12 16v4M8 8h8M8 11h5",
  folder: "M3 6.5h7l2 2h9v9.8A2.7 2.7 0 0 1 18.3 21H5.7A2.7 2.7 0 0 1 3 18.3V6.5Z",
  cube: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5m-8-4.5 8 4.5",
  users: "M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 21a5.5 5.5 0 0 1 11 0M16 10a3 3 0 1 0 0-6M15 15a5 5 0 0 1 6 4",
  calendar: "M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2ZM7 2v4M17 2v4M3 9h18M7 13h3M14 13h3M7 17h3",
  wallet: "M4 6h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM4 6V4h13M16 13h5",
  logout: "M10 4H4v16h6M15 8l4 4-4 4M9 12h10",
  search: "m20 20-4.5-4.5M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z",
  bell: "M6 10a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9ZM10 22h4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  "chevron-down": "m6 9 6 6 6-6",
  package: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5m-8-4.5 8 4.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  bolt: "m13 2-9 12h7l-1 8 9-12h-7l1-8Z",
  info: "M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  check: "m5 12 4 4L19 6",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h4",
  "credit-card": "M3 6h18v12H3V6Zm0 4h18M7 15h4",
  graduation: "m3 9 9-5 9 5-9 5-9-5Zm4 3v4c3 2 7 2 10 0v-4M21 9v6",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 12l2-1-2-4-2 .4-1.5-1.5.4-2L12 2 8.1 3.9l.4 2L7 7.4 5 7 3 11l2 1-2 1 2 4 2-.4 1.5 1.5-.4 2L12 22l3.9-1.9-.4-2 1.5-1.5 2 .4 2-4-2-1Z",
  mail: "M3 5h18v14H3V5Zm0 2 9 7 9-7",
  shield: "M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Zm-3 9 2 2 4-5",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  truck: "M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  boxes: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  "user-check": "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M16 12l2 2 4-5",
  handshake: "m8 12 3 3a2 2 0 0 0 3 0l5-5M3 10l4-4 4 2 2-1 4 4M3 10l-1 5 4 4 3-1M21 10l1 5-4 4-3-1",
  bank: "M3 9 12 4l9 5M5 10v7M9 10v7M15 10v7M19 10v7M3 20h18",
  clipboard: "M8 4h8v3H8V4ZM6 6H4v15h16V6h-2M8 11h8M8 15h8",
  flow: "M5 5h6v6H5V5Zm8 8h6v6h-6v-6ZM11 8h3a3 3 0 0 1 3 3v2M8 11v4a3 3 0 0 0 3 3h2",
};

export function PanelIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="panel-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
