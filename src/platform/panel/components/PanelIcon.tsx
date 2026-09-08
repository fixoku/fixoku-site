type IconName =
  | "home" | "user" | "book" | "presentation" | "folder" | "cube"
  | "users" | "calendar" | "wallet" | "logout" | "search" | "bell"
  | "arrow" | "package" | "menu" | "bolt";

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
  package: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5m-8-4.5 8 4.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  bolt: "m13 2-9 12h7l-1 8 9-12h-7l1-8Z",
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
