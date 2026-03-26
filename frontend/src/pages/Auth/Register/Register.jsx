import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import seekerIcon from '../../../assets/icons/role-seeker.svg'
import employerIcon from '../../../assets/icons/role-employer.svg'
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
import PasswordField from '../../../components/auth/PasswordField'
import AuthLayout from '../../../layouts/AuthLayout'
import { useToast } from '../../../hooks/use-toast'
import { registerUser, getCurrentUserInfo } from '../../../utils/authApi'
import './Register.scss'

function Register() {
    const [email, setEmail] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('APPLICANT')
    const [isPending, setIsPending] = useState(false)

    const [, setLocation] = useLocation()
    const { toast } = useToast()

    const isEmployer = role === 'EMPLOYER'

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!displayName.trim() || !email.trim() || !password.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Заполни все поля формы',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsPending(true)

            // Регистрация через API
            await registerUser({
                displayName: displayName.trim(),
                email: email.trim(),
                password,
                role,
                status: 'ACTIVE',
            })

            // Ждём немного, чтобы сессия успела установиться
            await new Promise(resolve => setTimeout(resolve, 500))

            // После регистрации получаем данные пользователя через /me
            let userData = null
            try {
                const response = await getCurrentUserInfo()
                console.log('[Register] getCurrentUserInfo response:', response)

                // Обрабатываем разные форматы ответа
                if (response && response.user) {
                    userData = response.user
                } else if (response && response.userId) {
                    userData = response
                } else if (response && response.id) {
                    userData = {
                        userId: response.id,
                        displayName: response.displayName,
                        email: response.email,
                        role: response.role,
                    }
                } else {
                    userData = response
                }
            } catch (err) {
                console.warn('[Register] Failed to get user info after registration:', err)
            }

            // Формируем данные пользователя для localStorage
            const finalUserData = {
                userId: userData?.userId || userData?.id,
                displayName: userData?.displayName || displayName.trim(),
                email: userData?.email || email.trim(),
                role: userData?.role || role,
            }

            localStorage.setItem('tramplin_current_user', JSON.stringify(finalUserData))
            console.log('[Register] Saved user to localStorage:', finalUserData)

            toast({
                title: 'Аккаунт создан!',
                description: 'Заполните профиль, чтобы продолжить работу с платформой',
            })

            setLocation('/profile/edit')
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

    return (
        <AuthLayout>
            <Card className="register-page__card">
                <CardHeader>
                    <CardTitle>Создать аккаунт</CardTitle>
                    <CardDescription>
                        Зарегистрируйтесь, чтобы искать или публиковать вакансии
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form className="register-form" onSubmit={handleSubmit}>
                        <div className="register-form__roles">
                            <button
                                type="button"
                                className={`register-form__role-card ${
                                    role === 'APPLICANT' ? 'is-active' : ''
                                }`}
                                onClick={() => setRole('APPLICANT')}
                            >
                                <img
                                    src={seekerIcon}
                                    alt=""
                                    className="register-form__role-icon"
                                    aria-hidden="true"
                                />
                                <span className="register-form__role-title">Соискатель</span>
                            </button>

                            <button
                                type="button"
                                className={`register-form__role-card ${
                                    role === 'EMPLOYER' ? 'is-active' : ''
                                }`}
                                onClick={() => setRole('EMPLOYER')}
                            >
                                <img
                                    src={employerIcon}
                                    alt=""
                                    className="register-form__role-icon"
                                    aria-hidden="true"
                                />
                                <span className="register-form__role-title">Работодатель</span>
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