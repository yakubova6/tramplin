import { useToast } from '../../hooks/use-toast'
import './Toaster.scss'

function Toaster() {
    const { toasts, dismiss } = useToast()

    if (!toasts.length) return null

    return (
        <div className="toaster">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast ${toast.variant === 'destructive' ? 'toast--destructive' : ''} ${
                        toast.open ? 'toast--visible' : 'toast--hidden'
                    }`}
                >
                    <div className="toast__content">
                        {toast.title && <div className="toast__title">{toast.title}</div>}
                        {toast.description && (
                            <div className="toast__description">{toast.description}</div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="toast__close"
                        onClick={() => dismiss(toast.id)}
                        aria-label="Закрыть уведомление"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    )
}

export default Toaster