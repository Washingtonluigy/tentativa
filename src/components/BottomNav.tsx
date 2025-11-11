import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface BottomNavProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ items, activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl safe-area-bottom">
      <div className="flex justify-around items-center h-18 max-w-lg mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;

          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 rounded-xl transition-all duration-200 ${
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive ? 'bg-gradient-to-br from-purple-50 to-purple-100' : ''
              }`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              </div>
              <span className={`text-[11px] mt-1 font-semibold ${
                isActive ? 'text-purple-600' : 'text-gray-500'
              }`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
