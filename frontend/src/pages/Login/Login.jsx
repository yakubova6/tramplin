import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import Button from '../../components/Button'
import Input from '../../components/Input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../components/Card'
import Label from '../../components/Label'
import PasswordField from '../../components/auth/PasswordField/PasswordField'
import AuthLayout from '../../layouts/AuthLayout/AuthLayout'
import { useToast } from '../../hooks/use-toast'
import { loginUser, validateSession } from '../../utils/authApi'
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

            await loginUser({
                email,
                password,
            })

            let sessionData = null

            try {
                sessionData = await validateSession()
            } catch {
                sessionData = null
            }

            if (sessionData) {
                localStorage.setItem('career_user', JSON.stringify(sessionData))
            }

            const role = sessionData?.role

            toast({
                title: 'Добро пожаловать!',
                description: 'Вы успешно вошли в систему',
            })

            if (role === 'EMPLOYER') {
                setLocation('/employer')
            } else if (role === 'CURATOR' || role === 'ADMIN') {
                setLocation('/curator')
            } else {
                setLocation('/seeker')
            }
        } catch (error) {
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