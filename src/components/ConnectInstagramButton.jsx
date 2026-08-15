import { getConnectUrl } from '../services/instagramService.js';
import '../styles/button.css';

export default function ConnectInstagramButton() {
  const handleClick = () => {
    // Full page navigation on purpose: this hands off to the backend,
    // which redirects to Meta's own login page. No SPA routing here.
    window.location.href = getConnectUrl();
  };

  return (
    <button type="button" className="sf-button sf-button--primary" onClick={handleClick}>
      + Conectar Instagram
    </button>
  );
}
