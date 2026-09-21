'use client';

interface BottomNavProps {
  activeTab: string;
  /** 탭 id 변경 (URL query와 연동) */
  setActiveTab: (tab: string) => void;
  onAddClick: () => void;
}

export default function BottomNav({ activeTab, setActiveTab, onAddClick }: BottomNavProps) {
  const navItems = [
    { id: 'home', icon: '🏠', label: '홈' },
    { id: 'stats', icon: '📊', label: '통계' },
    null, // Placeholder for Add button
    { id: 'calendar', icon: '🗓️', label: '달력' },
    { id: 'settings', icon: '⚙️', label: '설정' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-end justify-around px-2 pt-3 pb-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      {navItems.map((item, index) => {
        if (!item) {
          return (
            <button key="add" onClick={onAddClick} className="-mt-7 flex flex-col items-center active:scale-90 transition-transform">
              <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white text-3xl font-light leading-none select-none">+</span>
              </div>
            </button>
          );
        }
        return (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center gap-1 py-1 min-w-[52px] active:scale-90 transition-transform">
            <span className={`text-2xl transition-all ${activeTab === item.id ? '' : 'opacity-30'}`}>{item.icon}</span>
            <span className={`text-[10px] font-semibold transition-colors ${activeTab === item.id ? 'text-gray-900' : 'text-gray-300'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
