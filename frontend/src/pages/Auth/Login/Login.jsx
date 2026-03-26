import { useState } from 'react'
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
import PasswordField from '../../../components/auth/PasswordField'
import AuthLayout from '../../../layouts/AuthLayout'
import { useToast } from '../../../hooks/use-toast'
import { loginUser, getCurrentUserInfo } from '../../../utils/authApi'
import './Login.scss'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isPending, setIsPending] = useState(false)

    const [, setLocation] = useLocation()
    const { toast } = useToast()

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

            // Логин через API (кука sessionId установится автоматически)
            await loginUser({
                email: email.trim(),
                password,
            })

            // Ждём немного, чтобы сессия успела установиться
            await new Promise(resolve => setTimeout(resolve, 500))

            // Получаем данные пользователя через /me
            const response = await getCurrentUserInfo()
            console.log('[Login] getCurrentUserInfo response:', response)

            // Обрабатываем разные форматы ответа
            let userData
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

            // Сохраняем в localStorage для быстрого доступа
            const storedUser = {
                userId: userData?.userId || userData?.id,
                displayName: userData?.displayName,
                email: userData?.email,
                role: userData?.role,
            }
            localStorage.setItem('tramplin_current_user', JSON.stringify(storedUser))
            console.log('[Login] Saved user to localStorage:', storedUser)

            const role = userData?.role

            toast({
                title: 'Добро пожаловать!',
                description: 'Вы успешно вошли в систему',
            })

            // Редирект в зависимости от роли
            if (role === 'EMPLOYER') {
                setLocation('/employer')
            } else if (role === 'CURATOR' || role === 'ADMIN') {
                setLocation('/curator')
            } else {
                setLocation('/seeker')
            }
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

    return (
        <AuthLayout>
            <Card className="login-page__card">
                <CardHeader>
                    <CardTitle>Вход в аккаунт</CardTitle>
                    <CardDescription>
                        Введите ваши данные для входа
                    </CardDescription>
                </CardHeader>

                <CardContent>
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
                </CardContent>
            </Card>
        </AuthLayout>
    )
}

export default Login