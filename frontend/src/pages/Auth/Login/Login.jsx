import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../../components/Card'
import Label from '../../../components/Label'
import PasswordField from '../../../components/Auth/PasswordField'
import AuthLayout from '../../../layouts/AuthLayout'
import { useToast } from '../../../hooks/use-toast'
import {
    loginUser,
    resendLoginTwoFactorCode,
    verifyLoginTwoFactor,
} from '../../../api/auth'
import './Login.scss'

const STEP_CREDENTIALS = 'credentials'
const STEP_TWO_FACTOR = 'two-factor'
const LOGIN_RESEND_COOLDOWN_SECONDS = 60

function getRedirectPathByRole(role) {
    if (role === 'EMPLOYER') {
        return '/employer'
    }

    if (role === 'CURATOR' || role === 'ADMIN') {
        return '/curator'
    }

    return '/seeker'
}

function formatExpiresAt(value) {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function Login() {
    const [step, setStep] = useState(STEP_CREDENTIALS)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [pendingToken, setPendingToken] = useState('')
    const [pendingTokenExpiresAt, setPendingTokenExpiresAt] = useState(null)
    const [isPending, setIsPending] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    const [, setLocation] = useLocation()
    const { toast } = useToast()

    useEffect(() => {
        if (step !== STEP_TWO_FACTOR || resendCooldown <= 0) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            setResendCooldown((prev) => Math.max(prev - 1, 0))
        }, 1000)

        return () => window.clearTimeout(timeoutId)
    }, [step, resendCooldown])

    const resetTwoFactorState = () => {
        setStep(STEP_CREDENTIALS)
        setCode('')
        setPendingToken('')
        setPendingTokenExpiresAt(null)
        setResendCooldown(0)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!email.trim() || !password.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Заполни email и пароль',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsPending(true)

            const response = await loginUser({
                email: email.trim(),
                password,
            })

            if (response?.requiresTwoFactor) {
                if (!response?.pendingToken) {
                    throw new Error('Не удалось начать двухфакторную проверку')
                }

                setPendingToken(response.pendingToken)
                setPendingTokenExpiresAt(response.pendingTokenExpiresAt || null)
                setCode('')
                setPassword('')
                setStep(STEP_TWO_FACTOR)
                setResendCooldown(LOGIN_RESEND_COOLDOWN_SECONDS)

                toast({
                    title: 'Нужен код подтверждения',
                    description: 'Мы отправили шестизначный код на вашу почту',
                })
                return
            }

            const role = response?.user?.role

            if (!role) {
                throw new Error('Не удалось определить роль пользователя')
            }

            toast({
                title: 'Добро пожаловать!',
                description: 'Вы успешно вошли в систему',
            })

            setLocation(getRedirectPathByRole(role))
        } catch (error) {
            console.error('[Login] Login error:', error)
            toast({
                title: 'Ошибка входа',
                description: error.message || 'Не удалось выполнить вход',
                variant: 'destructive',
            })
        } finally {
            setIsPending(false)
        }
    }

    const handleVerifySubmit = async (event) => {
        event.preventDefault()

        const normalizedCode = code.trim()

        if (!pendingToken) {
            toast({
                title: 'Сессия подтверждения истекла',
                description: 'Введите email и пароль ещё раз',
                variant: 'destructive',
            })
            resetTwoFactorState()
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
            setIsPending(true)

            const response = await verifyLoginTwoFactor({
                pendingToken,
                code: normalizedCode,
            })

            const role = response?.user?.role

            if (!role) {
                throw new Error('Не удалось завершить вход')
            }

            toast({
                title: 'Вход подтверждён',
                description: 'Вы успешно вошли в систему',
            })

            setLocation(getRedirectPathByRole(role))
        } catch (error) {
            console.error('[Login] 2FA verify error:', error)
            toast({
                title: 'Код не подошёл',
                description: error?.message || 'Проверьте код и попробуйте снова',
                variant: 'destructive',
            })
        } finally {
            setIsPending(false)
        }
    }

    const handleResendCode = async () => {
        if (!pendingToken || isResending || resendCooldown > 0) {
            return
        }

        try {
            setIsResending(true)

            await resendLoginTwoFactorCode({
                pendingToken,
            })

            setResendCooldown(LOGIN_RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Код отправлен повторно',
                description: 'Проверьте входящие письма',
            })
        } catch (error) {
            console.error('[Login] 2FA resend error:', error)
            toast({
                title: 'Не удалось отправить код',
                description: error?.message || 'Попробуйте ещё раз чуть позже',
                variant: 'destructive',
            })
        } finally {
            setIsResending(false)
        }
    }

    const formattedExpiresAt = formatExpiresAt(pendingTokenExpiresAt)

    return (
        <AuthLayout>
            <Card className="login-page__card">
                <CardHeader>
                    <CardTitle>
                        {step === STEP_TWO_FACTOR
                            ? 'Подтверждение входа'
                            : 'Вход в аккаунт'}
                    </CardTitle>
                    <CardDescription>
                        {step === STEP_TWO_FACTOR
                            ? 'Введите код, который пришёл на вашу почту'
                            : 'Введите ваши данные для входа'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === STEP_CREDENTIALS && (
                        <>
                            <form className="login-form" onSubmit={handleSubmit}>
                                <div className="login-form__field">
                                    <Label htmlFor="email">Электронная почта</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        required
                                    />
                                </div>

                                <PasswordField
                                    id="password"
                                    name="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />

                                <div className="login-form__actions">
                                    <Link
                                        href="/forgot-password"
                                        className="login-form__forgot-link"
                                    >
                                        Забыли пароль?
                                    </Link>
                                </div>

                                <Button
                                    type="submit"
                                    className="login-form__submit"
                                    disabled={isPending}
                                >
                                    {isPending ? <span className="login-form__loader" /> : 'Войти'}
                                </Button>
                            </form>

                            <div className="login-page__bottom">
                                <span>Нет аккаунта?</span>{' '}
                                <Link href="/register" className="login-page__register-link">
                                    Зарегистрироваться
                                </Link>
                            </div>
                        </>
                    )}

                    {step === STEP_TWO_FACTOR && (
                        <>
                            <div className="login-page__note">
                                <p className="login-page__note-title">
                                    Проверьте почту
                                </p>
                                <p className="login-page__note-text">
                                    Мы отправили шестизначный код на{' '}
                                    <span className="login-page__email">{email}</span>.
                                    {formattedExpiresAt && (
                                        <>
                                            {' '}Код действует до{' '}
                                            <span className="login-page__email">
                                                {formattedExpiresAt}
                                            </span>
                                            .
                                        </>
                                    )}
                                </p>
                            </div>

                            <form className="login-form" onSubmit={handleVerifySubmit}>
                                <div className="login-form__field">
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

                                <Button
                                    type="submit"
                                    className="login-form__submit"
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <span className="login-form__loader" />
                                    ) : (
                                        'Подтвердить вход'
                                    )}
                                </Button>
                            </form>

                            <div className="login-page__actions">
                                <button
                                    type="button"
                                    className="login-page__secondary-action"
                                    onClick={resetTwoFactorState}
                                >
                                    Изменить email
                                </button>

                                <button
                                    type="button"
                                    className="login-page__secondary-action"
                                    onClick={handleResendCode}
                                    disabled={isResending || resendCooldown > 0}
                                >
                                    {isResending
                                        ? 'Отправка...'
                                        : resendCooldown > 0
                                            ? `Отправить код повторно через ${resendCooldown} c`
                                            : 'Отправить код повторно'}
                                </button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </AuthLayout>
    )
}

export default Login