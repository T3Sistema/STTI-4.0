import React from 'react';

export const PhoneOutgoingIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 8V4h5M16 8l-4 4-4-4M4 16l4-4 4 4M20 16l-4-4-4 4" />
    </svg>
);