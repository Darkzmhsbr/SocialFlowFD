import '../styles/card.css';

export default function DashboardCard({ title, subtitle, actions, children }) {
  return (
    <section className="sf-card">
      {(title || actions) && (
        <div className="sf-card__header">
          <div>
            {title && <h2 className="sf-card__title">{title}</h2>}
            {subtitle && <p className="sf-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="sf-card__actions">{actions}</div>}
        </div>
      )}
      <div className="sf-card__body">{children}</div>
    </section>
  );
}
