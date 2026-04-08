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
    confirmPasswordReset,
    requestPasswordReset,
    verifyPasswordResetCode,
} from '../../../api/auth'
import './ForgotPassword.scss'

const STEP_REQUEST = 'request'
const STEP_VERIFY = 'verify'
const STEP_CONFIRM = 'confirm'
const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60

const STEP_CONTENT = {
    [STEP_REQUEST]: {
        title: 'Восстановление пароля',
        description: 'Введите email, и мы отправим код подтверждения',
    },
    [STEP_VERIFY]: {
        title: 'Подтверждение кода',
        description: 'Введите код, который пришёл на вашу почту',
    },
    [STEP_CONFIRM]: {
        title: 'Новый пароль',
        description: 'Придумайте новый пароль для входа в аккаунт',
    },
}

function ForgotPassword() {
    const [step, setStep] = useState(STEP_REQUEST)
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isPending, setIsPending] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    const [, setLocation] = useLocation()
    const { toast } = useToast()

    useEffect(() => {
        if (step !== STEP_VERIFY || resendCooldown <= 0) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            setResendCooldown((prev) => Math.max(prev - 1, 0))
        }, 1000)

        return () => window.clearTimeout(timeoutId)
    }, [step, resendCooldown])

    const handleRequestSubmit = async (event) => {
        event.preventDefault()

        const normalizedEmail = email.trim()

        if (!normalizedEmail) {
            toast({
                title: 'Ошибка',
                description: 'Введите email',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsPending(true)

            await requestPasswordReset({
                email: normalizedEmail,
            })

            setEmail(normalizedEmail)
            setCode('')
            setResetToken('')
            setNewPassword('')
            setConfirmPassword('')
            setStep(STEP_VERIFY)
            setResendCooldown(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Проверьте почту',
                description: 'Если аккаунт существует, код уже отправлен на указанный email',
            })
        } catch (error) {
            console.error('[ForgotPassword] Request reset error:', error)
            toast({
                title: 'Не удалось отправить код',
                description: error?.message || 'Попробуйте ещё раз',
                variant: 'destructive',
            })
        } finally {
            setIsPending(false)
        }
    }

    const handleVerifySubmit = async (event) => {
        event.preventDefault()

        const normalizedCode = code.trim()

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

            const response = await verifyPasswordResetCode({
                email: email.trim(),
                code: normalizedCode,
            })

            if (!response?.resetToken) {
                throw new Error('Не удалось подтвердить код')
            }

            setResetToken(response.resetToken)
            setStep(STEP_CONFIRM)

            toast({
                title: 'Код подтверждён',
                description: 'Теперь задайте новый пароль',
            })
        } catch (error) {
            console.error('[ForgotPassword] Verify code error:', error)
            toast({
                title: 'Код не подошёл',
                description: error?.message || 'Проверьте код и попробуйте снова',
                variant: 'destructive',
            })
        } finally {
            setIsPending(false)
        }
    }

    const handleConfirmSubmit = async (event) => {
        event.preventDefault()

        if (!newPassword || !confirmPassword) {
            toast({
                title: 'Ошибка',
                description: 'Заполните оба поля пароля',
                variant: 'destructive',
            })
            return
        }

        if (newPassword.length < 8 || newPassword.length > 16) {
            toast({
                title: 'Ошибка',
                description: 'Пароль должен быть длиной от 8 до 16 символов',
                variant: 'destructive',
            })
            return
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: 'Ошибка',
                description: 'Пароли не совпадают',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsPending(true)

            await confirmPasswordReset({
                email: email.trim(),
                resetToken,
                newPassword,
            })

            toast({
                title: 'Пароль обновлён',
                description: 'Теперь вы можете войти с новым паролем',
            })

            setLocation('/login')
        } catch (error) {
            console.error('[ForgotPassword] Confirm reset error:', error)
            toast({
                title: 'Не удалось сменить пароль',
                description: error?.message || 'Попробуйте пройти восстановление заново',
                variant: 'destructive',
            })
        } finally {
            setIsPending(false)
        }
    }

    const handleChangeEmail = () => {
        setStep(STEP_REQUEST)
        setCode('')
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
        setResendCooldown(0)
    }

    const handleResendCode = async () => {
        if (isResending || resendCooldown > 0) {
            return
        }

        try {
            setIsResending(true)

            await requestPasswordReset({
                email: email.trim(),
            })

            setResendCooldown(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Код отправлен повторно',
                description: 'Если аккаунт существует, проверьте входящие письма',
            })
        } catch (error) {
            console.error('[ForgotPassword] Resend code error:', error)
            toast({
                title: 'Не удалось отправить код',
                description: error?.message || 'Попробуйте ещё раз чуть позже',
                variant: 'destructive',
            })
        } finally {
            setIsResending(false)
        }
    }

    const handleRequestNewCode = () => {
        setStep(STEP_REQUEST)
        setCode('')
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
        setResendCooldown(0)
    }

    const currentStepContent = STEP_CONTENT[step]

    return (
        <AuthLayout>
            <Card className="forgot-password-page__card">
                <CardHeader>
                    <CardTitle>{currentStepContent.title}</CardTitle>
                    <CardDescription>
                        {currentStepContent.description}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === STEP_REQUEST && (
                        <form
                            className="forgot-password-form"
                            onSubmit={handleRequestSubmit}
                        >
                            <div className="forgot-password-form__field">
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

                            <Button
                                type="submit"
                                className="forgot-password-form__submit"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <span className="forgot-password-form__loader" />
                                ) : (
                                    'Отправить код'
                                )}
                            </Button>
                        </form>
                    )}

                    {step === STEP_VERIFY && (
                        <>
                            <div className="forgot-password-page__note">
                                <p className="forgot-password-page__note-title">
                                    Проверьте почту
                                </p>
                                <p className="forgot-password-page__note-text">
                                    Если аккаунт с адресом{' '}
                                    <span className="forgot-password-page__email">
                                        {email}
                                    </span>{' '}
                                    существует, на него отправлен шестизначный код.
                                </p>
                            </div>

                            <form
                                className="forgot-password-form"
                                onSubmit={handleVerifySubmit}
                            >
                                <div className="forgot-password-form__field">
                                    <Label htmlFor="code">Код из письма</Label>
                                    <Input
                                        id="code"
                                        name="code"
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
                                    className="forgot-password-form__submit"
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <span className="forgot-password-form__loader" />
                                    ) : (
                                        'Подтвердить код'
                                    )}
                                </Button>
                            </form>

                            <div className="forgot-password-page__actions">
                                <button
                                    type="button"
                                    className="forgot-password-page__secondary-action"
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
                                    className="forgot-password-page__secondary-action"
                                    onClick={handleChangeEmail}
                                >
                                    Изменить email
                                </button>
                            </div>
                        </>
                    )}

                    {step === STEP_CONFIRM && (
                        <>
                            <div className="forgot-password-page__note">
                                <p className="forgot-password-page__note-title">
                                    Код подтверждён
                                </p>
                                <p className="forgot-password-page__note-text">
                                    Задайте новый пароль для аккаунта{' '}
                                    <span className="forgot-password-page__email">
                                        {email}
                                    </span>
                                    .
                                </p>
                            </div>

                            <form
                                className="forgot-password-form"
                                onSubmit={handleConfirmSubmit}
                            >
                                <PasswordField
                                    id="newPassword"
                                    name="newPassword"
                                    label="Новый пароль"
                                    placeholder="Введите новый пароль"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    required
                                />

                                <PasswordField
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    label="Повторите пароль"
                                    placeholder="Повторите новый пароль"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(event.target.value)
                                    }
                                    required
                                />

                                <p className="forgot-password-form__hint">
                                    Пароль должен содержать от 8 до 16 символов.
                                </p>

                                <Button
                                    type="submit"
                                    className="forgot-password-form__submit"
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <span className="forgot-password-form__loader" />
                                    ) : (
                                        'Сохранить новый пароль'
                                    )}
                                </Button>
                            </form>

                            <div className="forgot-password-page__actions">
                                <button
                                    type="button"
                                    className="forgot-password-page__secondary-action"
                                    onClick={handleRequestNewCode}
                                >
                                    Вернуться к вводу email
                                </button>
                            </div>
                        </>
                    )}

                    <div className="forgot-password-page__bottom">
                        <span>Вспомнили пароль?</span>{' '}
                        <Link
                            href="/login"
                            className="forgot-password-page__login-link"
                        >
                            Вернуться ко входу
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    )
}

export default ForgotPassword