import React from 'react';

function NavTabs({ tabs, activeTab, onChange }) {
    return (
        <ul className="nav nav-tabs">
            {tabs.map((tab) => (
                <li className="nav-item" key={tab.id}>
                    <button
                        type="button"
                        className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default NavTabs;

