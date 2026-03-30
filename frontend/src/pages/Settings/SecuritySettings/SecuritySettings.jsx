import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import DashboardLayout from '../../Dashboard/DashboardLayout'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../../components/Card'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import Label from '../../../components/Label'
import PasswordField from '../../../components/Auth/PasswordField'
import { useToast } from '../../../hooks/use-toast'
import {
    clearSessionUser,
    getSessionUser,
    setSessionUser,
    subscribeSessionChange,
} from '../../../utils/sessionStore'
import {
    confirmDisableTwoFactor,
    confirmEnableTwoFactor,
    getCurrentUserInfo,
    requestDisableTwoFactor,
    requestEnableTwoFactor,
} from '../../../api/auth'
import './SecuritySettings.scss'

const ACTION_ENABLE = 'enable'
const ACTION_DISABLE = 'disable'
const RESEND_COOLDOWN_SECONDS = 60

function formatExpiresAt(value) {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function SecuritySettings() {
    const [user, setUser] = useState(getSessionUser())
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isResending, setIsResending] = useState(false)

    const [password, setPassword] = useState('')
    const [challengePassword, setChallengePassword] = useState('')
    const [code, setCode] = useState('')
    const [pendingToken, setPendingToken] = useState('')
    const [pendingTokenExpiresAt, setPendingTokenExpiresAt] = useState(null)
    const [operation, setOperation] = useState(null)
    const [resendCooldown, setResendCooldown] = useState(0)

    const [, setLocation] = useLocation()
    const { toast } = useToast()

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
            if (!nextUser) {
                setIsLoading(false)
            }
        })

        const loadUser = async () => {
            setIsLoading(true)

            try {
                const localUser = getSessionUser()

                if (!localUser) {
                    setUser(null)
                    return
                }

                const response = await getCurrentUserInfo()
                const nextUser = response?.user || response || null

                if (nextUser) {
                    const normalizedUser = setSessionUser(nextUser)
                    setUser(normalizedUser)
                } else {
                    clearSessionUser()
                    setUser(null)
                }
            } catch (error) {
                console.error('[SecuritySettings] Failed to load user:', error)

                if (error?.code === 'invalid_session') {
                    clearSessionUser()
                    setUser(null)
                    return
                }

                toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить настройки безопасности',
                    variant: 'destructive',
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadUser()

        return unsubscribe
    }, [toast])

    useEffect(() => {
        if (!isLoading && !user) {
            setLocation('/login')
        }
    }, [isLoading, user, setLocation])

    useEffect(() => {
        if (!pendingToken || resendCooldown <= 0) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            setResendCooldown((prev) => Math.max(prev - 1, 0))
        }, 1000)

        return () => window.clearTimeout(timeoutId)
    }, [pendingToken, resendCooldown])

    const resetFlow = () => {
        setPassword('')
        setChallengePassword('')
        setCode('')
        setPendingToken('')
        setPendingTokenExpiresAt(null)
        setOperation(null)
        setResendCooldown(0)
    }

    const handleProtectedActionError = (error, fallbackMessage) => {
        if (error?.code === 'invalid_session') {
            clearSessionUser()

            toast({
                title: 'Сессия истекла',
                description: 'Пожалуйста, войдите снова',
                variant: 'destructive',
            })

            setLocation('/login')
            return
        }

        if (error?.code === 'invalid_two_factor_pending_token') {
            resetFlow()
        }

        toast({
            title: 'Ошибка',
            description: error?.message || fallbackMessage,
            variant: 'destructive',
        })
    }

    const isTwoFactorEnabled = Boolean(user?.twoFactorEnabled)
    const currentAction = operation || (isTwoFactorEnabled ? ACTION_DISABLE : ACTION_ENABLE)
    const isEnableAction = currentAction === ACTION_ENABLE

    const handleRequestChallenge = async (event) => {
        event.preventDefault()

        const normalizedPassword = password.trim()

        if (!normalizedPassword) {
            toast({
                title: 'Ошибка',
                description: 'Введите текущий пароль',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsSubmitting(true)

            const response = isTwoFactorEnabled
                ? await requestDisableTwoFactor({ password: normalizedPassword })
                : await requestEnableTwoFactor({ password: normalizedPassword })

            if (!response?.pendingToken) {
                throw new Error('Не удалось получить код подтверждения')
            }

            setOperation(isTwoFactorEnabled ? ACTION_DISABLE : ACTION_ENABLE)
            setPendingToken(response.pendingToken)
            setPendingTokenExpiresAt(response.expiresAt || null)
            setChallengePassword(normalizedPassword)
            setPassword('')
            setCode('')
            setResendCooldown(RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Код отправлен',
                description: `Мы отправили письмо на ${user?.email}`,
            })
        } catch (error) {
            console.error('[SecuritySettings] Request challenge error:', error)
            handleProtectedActionError(
                error,
                isTwoFactorEnabled
                    ? 'Не удалось начать отключение 2FA'
                    : 'Не удалось начать подключение 2FA'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleConfirmChallenge = async (event) => {
        event.preventDefault()

        const normalizedCode = code.trim()

        if (!pendingToken) {
            toast({
                title: 'Код устарел',
                description: 'Запросите новый код подтверждения',
                variant: 'destructive',
            })
            resetFlow()
            return
        }

        if (!/^\d{6}$/.test(normalizedCode)) {
            toast({
                title: 'Ошибка',
                description: 'Введите шестизначный код',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsSubmitting(true)

            if (currentAction === ACTION_ENABLE) {
                await confirmEnableTwoFactor({
                    pendingToken,
                    code: normalizedCode,
                })
            } else {
                await confirmDisableTwoFactor({
                    pendingToken,
                    code: normalizedCode,
                })
            }

            const nextEnabled = currentAction === ACTION_ENABLE
            const updatedUser = setSessionUser({
                ...user,
                twoFactorEnabled: nextEnabled,
            })

            setUser(updatedUser)
            resetFlow()

            toast({
                title: nextEnabled ? '2FA включена' : '2FA отключена',
                description: nextEnabled
                    ? 'Теперь вход будет подтверждаться кодом из письма'
                    : 'Теперь вход снова выполняется только по паролю',
            })
        } catch (error) {
            console.error('[SecuritySettings] Confirm challenge error:', error)
            handleProtectedActionError(
                error,
                currentAction === ACTION_ENABLE
                    ? 'Не удалось включить 2FA'
                    : 'Не удалось отключить 2FA'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResendCode = async () => {
        if (!pendingToken || resendCooldown > 0 || isResending) {
            return
        }

        if (!challengePassword) {
            toast({
                title: 'Нужно подтвердить действие заново',
                description: 'Снова введите текущий пароль',
                variant: 'destructive',
            })
            resetFlow()
            return
        }

        try {
            setIsResending(true)

            const response = currentAction === ACTION_ENABLE
                ? await requestEnableTwoFactor({ password: challengePassword })
                : await requestDisableTwoFactor({ password: challengePassword })

            if (!response?.pendingToken) {
                throw new Error('Не удалось повторно отправить код')
            }

            setPendingToken(response.pendingToken)
            setPendingTokenExpiresAt(response.expiresAt || null)
            setResendCooldown(RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Код отправлен повторно',
                description: 'Проверьте почту',
            })
        } catch (error) {
            console.error('[SecuritySettings] Resend code error:', error)
            handleProtectedActionError(
                error,
                'Не удалось повторно отправить код'
            )
        } finally {
            setIsResending(false)
        }
    }

    const formattedExpiresAt = formatExpiresAt(pendingTokenExpiresAt)

    if (isLoading) {
        return (
            <DashboardLayout title="Настройки безопасности">
                <div className="security-settings">
                    <Card className="security-settings__card">
                        <CardHeader>
                            <CardTitle>Загрузка...</CardTitle>
                            <CardDescription>
                                Получаем текущие настройки безопасности
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </DashboardLayout>
        )
    }

    if (!user) {
        return null
    }

    return (
        <DashboardLayout
            title="Настройки безопасности"
            subtitle={user.displayName || user.email}
        >
            <div className="security-settings">
                <div className="security-settings__layout">
                    <section className="security-settings__hero">
                        <span className="security-settings__eyebrow">
                            Защита аккаунта
                        </span>

                        <h2 className="security-settings__headline">
                            Управляйте входом в аккаунт аккуратно и безопасно
                        </h2>

                        <p className="security-settings__lead">
                            Двухфакторная аутентификация добавляет второй шаг
                            при входе. После ввода пароля система попросит
                            подтвердить вход одноразовым кодом из письма.
                        </p>

                        <div className="security-settings__highlights">
                            <div className="security-settings__highlight">
                                <span className="security-settings__highlight-label">
                                    Статус
                                </span>
                                <strong className="security-settings__highlight-value">
                                    {isTwoFactorEnabled ? '2FA включена' : '2FA отключена'}
                                </strong>
                            </div>

                            <div className="security-settings__highlight">
                                <span className="security-settings__highlight-label">
                                    Почта для подтверждений
                                </span>
                                <strong className="security-settings__highlight-value">
                                    {user.email}
                                </strong>
                            </div>
                        </div>

                        <div className="security-settings__info-list">
                            <div className="security-settings__info-item">
                                <span className="security-settings__info-dot" />
                                <span>
                                    Код подтверждения приходит на вашу почту и
                                    нужен только при входе или изменении 2FA.
                                </span>
                            </div>
                            <div className="security-settings__info-item">
                                <span className="security-settings__info-dot" />
                                <span>
                                    Включение и отключение защищено текущим
                                    паролем аккаунта.
                                </span>
                            </div>
                            <div className="security-settings__info-item">
                                <span className="security-settings__info-dot" />
                                <span>
                                    Повторная отправка кода доступна через 60
                                    секунд и выполняется без повторного ввода
                                    пароля.
                                </span>
                            </div>
                        </div>
                    </section>

                    <Card className="security-settings__card">
                        <CardHeader>
                            <CardTitle>Двухфакторная аутентификация</CardTitle>
                            <CardDescription>
                                Подтверждение выполняется одноразовым кодом из письма
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="security-settings__status">
                                <span
                                    className={`security-settings__badge ${isTwoFactorEnabled ? 'is-enabled' : 'is-disabled'}`}
                                >
                                    {isTwoFactorEnabled ? '2FA включена' : '2FA отключена'}
                                </span>

                                <p className="security-settings__status-text">
                                    {isTwoFactorEnabled
                                        ? 'Сейчас вход в аккаунт требует дополнительный код подтверждения из письма.'
                                        : 'Подключите 2FA, чтобы дополнительно подтверждать вход одноразовым кодом.'}
                                </p>
                            </div>

                            {!pendingToken ? (
                                <form
                                    className="security-settings__form"
                                    onSubmit={handleRequestChallenge}
                                >
                                    <PasswordField
                                        id="currentPassword"
                                        name="currentPassword"
                                        label="Текущий пароль"
                                        placeholder="Введите текущий пароль"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        required
                                    />

                                    <p className="security-settings__hint">
                                        Для {isEnableAction ? 'подключения' : 'отключения'} 2FA
                                        подтвердите действие текущим паролем.
                                    </p>

                                    <div className="security-settings__actions">
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting
                                                ? 'Отправляем код...'
                                                : isEnableAction
                                                    ? 'Включить 2FA'
                                                    : 'Отключить 2FA'}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="security-settings__note">
                                        <p className="security-settings__note-title">
                                            Введите код подтверждения
                                        </p>
                                        <p className="security-settings__note-text">
                                            Мы отправили письмо на{' '}
                                            <span className="security-settings__accent">
                                                {user.email}
                                            </span>
                                            .
                                            {formattedExpiresAt && (
                                                <>
                                                    {' '}Код действует до{' '}
                                                    <span className="security-settings__accent">
                                                        {formattedExpiresAt}
                                                    </span>
                                                    .
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <form
                                        className="security-settings__form"
                                        onSubmit={handleConfirmChallenge}
                                    >
                                        <div className="security-settings__field">
                                            <Label htmlFor="twoFactorCode">Код из письма</Label>
                                            <Input
                                                id="twoFactorCode"
                                                name="twoFactorCode"
                                                type="text"
                                                placeholder="123456"
                                                value={code}
                                                onChange={(event) =>
                                                    setCode(
                                                        event.target.value
                                                            .replace(/\D/g, '')
                                                            .slice(0, 6)
                                                    )
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="security-settings__actions">
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting
                                                    ? 'Подтверждаем...'
                                                    : isEnableAction
                                                        ? 'Подключить 2FA'
                                                        : 'Отключить 2FA'}
                                            </Button>

                                            <button
                                                type="button"
                                                className="security-settings__secondary-button"
                                                onClick={handleResendCode}
                                                disabled={isResending || resendCooldown > 0}
                                            >
                                                {isResending
                                                    ? 'Отправка...'
                                                    : resendCooldown > 0
                                                        ? `Отправить код повторно через ${resendCooldown} c`
                                                        : 'Отправить код повторно'}
                                            </button>

                                            <button
                                                type="button"
                                                className="security-settings__secondary-button"
                                                onClick={resetFlow}
                                                disabled={isSubmitting || isResending}
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}

export default SecuritySettings