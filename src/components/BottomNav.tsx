export type TabKey = 'chat' | 'table' | 'summary' | 'settings';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'chat', label: 'แชท', icon: '💬' },
  { key: 'table', label: 'ตาราง', icon: '📋' },
  { key: 'summary', label: 'สรุป', icon: '📊' },
  { key: 'settings', label: 'ตั้งค่า', icon: '⚙️' },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="grid grid-cols-4 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
            active === tab.key ? 'text-brand-600 font-semibold' : 'text-gray-400'
          }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
