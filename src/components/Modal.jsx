// Same markup the HTML pages used: overlay > .modal > header (+ close button).
// `open` toggles the .visible class; clicking the dark overlay closes it.
export default function Modal({ open, title, onClose, children }) {
  return (
    <div
      className={`modal-overlay${open ? ' visible' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" type="button" onClick={onClose}>
            <span className="material-symbols-sharp">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalError({ message }) {
  return (
    <div className={`modal-error${message ? ' visible' : ''}`}>
      <span>{message}</span>
    </div>
  );
}
