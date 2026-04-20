import { useEffect, useState } from 'react'

const TOAST_LIMIT = 3 // Увеличил до 3, чтобы несколько уведомлений могли показываться
const TOAST_AUTO_CLOSE_DELAY = 5000 // 5 секунд до автоматического закрытия
const TOAST_REMOVE_DELAY = 300 // Задержка перед удалением после закрытия (для анимации)

const actionTypes = {
    ADD_TOAST: 'ADD_TOAST',
    UPDATE_TOAST: 'UPDATE_TOAST',
    DISMISS_TOAST: 'DISMISS_TOAST',
    REMOVE_TOAST: 'REMOVE_TOAST',
}

let count = 0

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
}

const toastTimeouts = new Map()
const autoCloseTimeouts = new Map()

function addToRemoveQueue(toastId) {
    if (toastTimeouts.has(toastId)) return

    const timeout = setTimeout(() => {
        toastTimeouts.delete(toastId)
        dispatch({
            type: actionTypes.REMOVE_TOAST,
            toastId,
        })
    }, TOAST_REMOVE_DELAY)

    toastTimeouts.set(toastId, timeout)
}

function clearAutoClose(toastId) {
    if (autoCloseTimeouts.has(toastId)) {
        clearTimeout(autoCloseTimeouts.get(toastId))
        autoCloseTimeouts.delete(toastId)
    }
}

function scheduleAutoClose(toastId, duration) {
    clearAutoClose(toastId)

    const timeout = setTimeout(() => {
        autoCloseTimeouts.delete(toastId)
        dispatch({
            type: actionTypes.DISMISS_TOAST,
            toastId,
        })
    }, duration)

    autoCloseTimeouts.set(toastId, timeout)
}

function reducer(state, action) {
    switch (action.type) {
        case actionTypes.ADD_TOAST:
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            }

        case actionTypes.UPDATE_TOAST:
            return {
                ...state,
                toasts: state.toasts.map((toast) =>
                    toast.id === action.toast.id ? { ...toast, ...action.toast } : toast
                ),
            }

        case actionTypes.DISMISS_TOAST: {
            const { toastId } = action

            // Очищаем авто-закрытие для этого тоста
            if (toastId) {
                clearAutoClose(toastId)
                addToRemoveQueue(toastId)
            } else {
                state.toasts.forEach((toast) => {
                    clearAutoClose(toast.id)
                    addToRemoveQueue(toast.id)
                })
            }

            return {
                ...state,
                toasts: state.toasts.map((toast) =>
                    toast.id === toastId || toastId === undefined
                        ? { ...toast, open: false }
                        : toast
                ),
            }
        }

        case actionTypes.REMOVE_TOAST:
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: [],
                }
            }

            // Очищаем таймауты при удалении
            clearAutoClose(action.toastId)

            return {
                ...state,
                toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
            }

        default:
            return state
    }
}

const listeners = []
let memoryState = { toasts: [] }

function dispatch(action) {
    memoryState = reducer(memoryState, action)
    listeners.forEach((listener) => listener(memoryState))
}

/**
 * Показать уведомление
 * @param {Object} props - параметры уведомления
 * @param {string} props.title - заголовок
 * @param {string} props.description - описание
 * @param {string} props.variant - тип: 'default' или 'destructive'
 * @param {number} props.duration - время показа в мс (по умолчанию 5000)
 */
function toast(props) {
    const id = genId()
    const duration = props.duration ?? TOAST_AUTO_CLOSE_DELAY

    const dismiss = () =>
        dispatch({
            type: actionTypes.DISMISS_TOAST,
            toastId: id,
        })

    const update = (nextProps) =>
        dispatch({
            type: actionTypes.UPDATE_TOAST,
            toast: {
                ...nextProps,
                id,
            },
        })

    dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
            ...props,
            id,
            duration,
            open: true,
            onOpenChange: (open) => {
                if (!open) dismiss()
            },
        },
    })

    // Запускаем автоматическое закрытие
    if (duration > 0) {
        scheduleAutoClose(id, duration)
    }

    return {
        id,
        dismiss,
        update,
    }
}

function useToast() {
    const [state, setState] = useState(memoryState)

    useEffect(() => {
        listeners.push(setState)

        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [])

    return {
        ...state,
        toast,
        dismiss: (toastId) =>
            dispatch({
                type: actionTypes.DISMISS_TOAST,
                toastId,
            }),
    }
}

export { useToast, toast }