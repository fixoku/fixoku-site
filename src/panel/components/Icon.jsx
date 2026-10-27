export default function Icon({ name }) {
  const common = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" };

  const icons = {
    home: <svg {...common}><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    chart: <svg {...common}><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    book: <svg {...common}><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="1.8"/><path d="M5 5.5V21M9 7h7M9 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    users: <svg {...common}><path d="M16 20c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 19c0-1.8-1.2-3.2-3-3.8M17 5.4a3 3 0 0 1 0 5.2M4 19c0-1.8 1.2-3.2 3-3.8M7 5.4a3 3 0 0 0 0 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    trophy: <svg {...common}><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3M12 11v5M9 20h6M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    settings: <svg {...common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .2 8.6 8.6 0 0 1-1.6.9 1.7 1.7 0 0 0-1.1 1.5V23H9.1v-.1A1.7 1.7 0 0 0 8 21.4a8.6 8.6 0 0 1-1.6-.9 1.7 1.7 0 0 0-2-.2l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 8.2 8.2 0 0 1 0-1.8 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.2A8.6 8.6 0 0 1 8 6.8a1.7 1.7 0 0 0 1.1-1.5V5h3.8v.3A1.7 1.7 0 0 0 14 6.8a8.6 8.6 0 0 1 1.6.9 1.7 1.7 0 0 0 2 .2l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 8.2 8.2 0 0 1 0 1.8Z" stroke="currentColor" strokeWidth="1.2"/></svg>,
    logout: <svg {...common}><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    bell: <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    plus: <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    stopwatch: <svg {...common}><circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2"/><path d="M9 2h6M12 6v7l4-3M5 5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  };

  return icons[name] || icons.home;
}
