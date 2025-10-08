import React from 'react';

export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.537a59.731 59.731 0 01-1.04-.083l-3.722-.537a2.25 2.25 0 01-2.25-2.25v-4.286c0-.97.616-1.813 1.5-2.097l3.722-.537a59.732 59.732 0 011.04.084l3.722.536zM9 13.5a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75v-.008a.75.75 0 01.75-.75H9zm3.75 0a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75v-.008a.75.75 0 01.75-.75h.75zm3.75 0a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-.008a.75.75 0 01.75-.75h.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V13.5A2.25 2.25 0 005.25 15h1.031c.362 0 .724.062 1.074.182l3.722.537a59.458 59.458 0 001.04.083l3.722-.537a59.351 59.351 0 001.074-.182H18.75A2.25 2.25 0 0021 13.5V8.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 8.25z" />
    </svg>
);
