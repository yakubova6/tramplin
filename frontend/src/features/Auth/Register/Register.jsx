import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import seekerIcon from '@/assets/icons/role-seeker.svg'
import employerIcon from '@/assets/icons/role-employer.svg'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/Card'
import Label from '@/shared/ui/Label'
import PasswordField from '@/shared/ui/Auth/PasswordField'
import AuthLayout from '@/shared/layouts/AuthLayout'
import { useToast } from '@/shared/hooks/use-toast'
import {
    confirmRegistration,
    registerUser,
    resendRegistrationCode,
} from '@/shared/api/auth'
import './Register.scss'

const STEP_REGISTER = 'register'
const STEP_VERIFY = 'verify'
const REGISTRATION_RESEND_COOLDOWN_SECONDS = 60

function formatExpiresAt(value) {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function Register() {
    const [step, setStep] = useState(STEP_REGISTER)
    const [email, setEmail] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('APPLICANT')
    const [code, setCode] = useState('')
    const [pendingToken, setPendingToken] = useState('')
    const [pendingTokenExpiresAt, setPendingTokenExpiresAt] = useState(null)
    const [isPending, setIsPending] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    const [, setLocation] = useLocation()
    const { toast } = useToast()

    const isEmployer = role === 'EMPLOYER'

    useEffect(() => {
        if (step !== STEP_VERIFY || resendCooldown <= 0) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            setResendCooldown((prev) => Math.max(prev - 1, 0))
        }, 1000)

        return () => window.clearTimeout(timeoutId)
    }, [step, resendCooldown])

    const resetVerificationState = () => {
        setStep(STEP_REGISTER)
        setCode('')
        setPendingToken('')
        setPendingTokenExpiresAt(null)
        setResendCooldown(0)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const normalizedDisplayName = displayName.trim()
        const normalizedEmail = email.trim()

        if (!normalizedDisplayName || !normalizedEmail || !password.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Заполните все поля формы',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsPending(true)

            const response = await registerUser({
                displayName: normalizedDisplayName,
                email: normalizedEmail,
                password,
                role,
            })

            if (!response?.pendingToken) {
                throw new Error('Не удалось начать подтверждение регистрации')
            }

            setDisplayName(normalizedDisplayName)
            setEmail(normalizedEmail)
            setPendingToken(response.pendingToken)
            setPendingTokenExpiresAt(response.expiresAt || null)
            setCode('')
            setPassword('')
            setStep(STEP_VERIFY)
            setResendCooldown(REGISTRATION_RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Проверьте почту',
                description: 'Код подтверждения уже отправлен на указанный email',
            })
        } catch (error) {
            console.error('[Register] Registration error:', error)
            toast({
                title: 'Ошибка регистрации',
                description: error?.message || 'Произошла ошибка',
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
                description: 'Заполните форму регистрации ещё раз',
                variant: 'destructive',
            })
            resetVerificationState()
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

            await confirmRegistration({
                pendingToken,
                code: normalizedCode,
            })

            toast({
                title: 'Аккаунт подтверждён',
                description: isEmployer
                    ? 'Теперь заполните профиль компании.'
                    : 'Теперь заполните профиль, чтобы продолжить работу с платформой.',
            })

            setLocation('/profile/edit')
        } catch (error) {
            console.error('[Register] Confirm registration error:', error)
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

            await resendRegistrationCode({
                pendingToken,
            })

            setResendCooldown(REGISTRATION_RESEND_COOLDOWN_SECONDS)

            toast({
                title: 'Код отправлен повторно',
                description: 'Проверьте входящие письма',
            })
        } catch (error) {
            console.error('[Register] Resend registration code error:', error)
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
            <Card className="register-page__card">
                <CardHeader>
                    <CardTitle>
                        {step === STEP_VERIFY
                            ? 'Подтверждение регистрации'
                            : 'Создать аккаунт'}
                    </CardTitle>
                    <CardDescription>
                        {step === STEP_VERIFY
                            ? 'Введите код, который пришёл на вашу почту'
                            : 'Зарегистрируйтесь, чтобы искать или публиковать вакансии'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === STEP_REGISTER && (
                        <form className="register-form" onSubmit={handleSubmit}>
                            <div className="register-form__roles">
                                <button
                                    type="button"
                                    className={`register-form__role-card ${role === 'APPLICANT' ? 'is-active' : ''}`}
                                    onClick={() => setRole('APPLICANT')}
                                >
                                    <img
                                        src={seekerIcon}
                                        alt=""
                                        className="register-form__role-icon"
                                        aria-hidden="true"
                                    />
                                    <span className="register-form__role-title">
                                        Соискатель
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className={`register-form__role-card ${role === 'EMPLOYER' ? 'is-active' : ''}`}
                                    onClick={() => setRole('EMPLOYER')}
                                >
                                    <img
                                        src={employerIcon}
                                        alt=""
                                        className="register-form__role-icon"
                                        aria-hidden="true"
                                    />
                                    <span className="register-form__role-title">
                                        Работодатель
                                    </span>
                                </button>
                            </div>

                            <div className="register-form__field">
                                <Label htmlFor="displayName">
                                    {isEmployer ? 'Название компании' : 'Отображаемое имя'}
                                </Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    type="text"
                                    placeholder={isEmployer ? 'ООО Трамплин' : 'Иван Иванов'}
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="register-form__field">
                                <Label htmlFor="email">Электронная почта</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder={isEmployer ? 'company@example.com' : 'name@example.com'}
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

                            {isEmployer && (
                                <div className="register-form__field-hint">
                                    После регистрации нужно подтвердить email кодом. Затем
                                    вы заполните профиль компании и сможете пройти
                                    обязательную верификацию.
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="register-form__submit"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <span className="register-form__loader" />
                                ) : isEmployer ? (
                                    'Создать аккаунт работодателя'
                                ) : (
                                    'Создать аккаунт соискателя'
                                )}
                            </Button>
                        </form>
                    )}

                    {step === STEP_VERIFY && (
                        <>
                            <div className="register-page__note">
                                <p className="register-page__note-title">
                                    Подтвердите email
                                </p>
                                <p className="register-page__note-text">
                                    Мы отправили шестизначный код на{' '}
                                    <span className="register-page__email">{email}</span>.
                                    {formattedExpiresAt && (
                                        <>
                                            {' '}Код действует до{' '}
                                            <span className="register-page__email">
                                                {formattedExpiresAt}
                                            </span>
                                            .
                                        </>
                                    )}
                                </p>
                            </div>

                            <form className="register-form" onSubmit={handleVerifySubmit}>
                                <div className="register-form__field">
                                    <Label htmlFor="registrationCode">Код из письма</Label>
                                    <Input
                                        id="registrationCode"
                                        name="registrationCode"
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
                                    className="register-form__submit"
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <span className="register-form__loader" />
                                    ) : (
                                        'Подтвердить аккаунт'
                                    )}
                                </Button>
                            </form>

                            <div className="register-page__actions">
                                <button
                                    type="button"
                                    className="register-page__secondary-action"
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
                                    className="register-page__secondary-action"
                                    onClick={resetVerificationState}
                                >
                                    Изменить данные
                                </button>
                            </div>
                        </>
                    )}

                    <div className="register-page__bottom">
                        <span>Уже есть аккаунт?</span>{' '}
                        <Link href="/login" className="register-page__login-link">
                            Войти
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    )
}

export default Register