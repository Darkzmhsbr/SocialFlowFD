import { STATUS_TABS } from '../utils/postConstants.js';

// Simple, controlled tabs for filtering the posts list by status.
// The parent (Posts.jsx) owns the active tab key; this component only
// renders and reports clicks.
export default function StatusTabs({ activeKey, onChange }) {
  return (
    <div className="sf-status-tabs" role="tablist">
      {STATUS_TABS.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`sf-status-tab${isActive ? ' sf-status-tab--active' : ''}`}
            onClick={() => onChange(tab)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}