import { useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import './Toaster.scss'

const ANIMATION_DURATION = 300

function Toaster() {
    const { toasts, dismiss } = useToast()
    const [exitingIds, setExitingIds] = useState(new Set())

    const handleDismiss = (id) => {
        setExitingIds(prev => new Set(prev).add(id))

        setTimeout(() => {
            dismiss(id)
            setExitingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }, ANIMATION_DURATION)
    }

    if (toasts.length === 0 && exitingIds.size === 0) return null

    return (
        <div className="toaster">
            {toasts.map((toast) => {
                const isExiting = exitingIds.has(toast.id)
                return (
                    <div
                        key={toast.id}
                        className={`toast ${toast.variant === 'destructive' ? 'toast--destructive' : ''} ${
                            isExiting ? 'toast--exiting' : 'toast--entered'
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
                            onClick={() => handleDismiss(toast.id)}
                            aria-label="Закрыть уведомление"
                        >
                            ×
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default Toaster