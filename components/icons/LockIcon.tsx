import React from 'react';

// @-fix: Explicitly added the 'title' attribute to the component's props to resolve a TypeScript error.
export const LockIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ className = "w-5 h-5", ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);