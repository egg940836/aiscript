
import React from 'react';
import { CardsIcon } from './icons/CardsIcon';
import { FormIcon } from './icons/FormIcon';

type MobileTab = 'brief' | 'results';

interface BottomNavBarProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
}

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => {
    const activeClasses = 'text-indigo-600';
    const inactiveClasses = 'text-gray-500 hover:text-indigo-600';
    
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
        >
            {children}
            <span className={`text-xs font-medium mt-1 ${isActive ? 'font-bold' : ''}`}>{label}</span>
        </button>
    );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg z-30 flex">
        <NavButton
            label="召喚條件"
            isActive={activeTab === 'brief'}
            onClick={() => setActiveTab('brief')}
        >
            <FormIcon className="w-6 h-6" />
        </NavButton>
        <NavButton
            label="靈感卡庫"
            isActive={activeTab === 'results'}
            onClick={() => setActiveTab('results')}
        >
            <CardsIcon className="w-6 h-6" />
        </NavButton>
    </div>
  );
};

export default BottomNavBar;