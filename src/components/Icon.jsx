// Rodada 6: small inline icon set (stroke icons, 24x24) for the sidebar and
// pages. No icon library needed.
const PATHS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  users:
    'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-4.3-4.3',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  image: 'M4 5h16v14H4zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M20 15l-5-5L5 19',
  // Rodada 10
  key: 'M15 7a4 4 0 1 1-3.9 4.9L4 19v-3h3v-3h3l1.1-1.1A4 4 0 0 1 15 7zM16 8h.01',
  // Rodada 11
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  // Rodada 12
  broom: 'M14 4l6 6M17 7l-6 6M11 13l-7 7M9 11l4 4M6 14l4 4',
  // Rodada 15
  month: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2M14 17h2',
  // Rodada 16
  template: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  // Rodada 17
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
};

export default function Icon({ name, size = 20, className = '' }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={`sf-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}