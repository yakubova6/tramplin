import { Switch, Route, Router as WouterRouter } from 'wouter'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import Toaster from './components/Toast/Toaster'

function Home() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>Трамплин</h1>
            <p>Главная страница пока в разработке.</p>
        </main>
    )
}

function ProfileEditPage() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>Редактирование профиля</h1>
            <p>Заполните профиль после регистрации.</p>
        </main>
    )
}

function SeekerDashboard() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>Кабинет соискателя</h1>
        </main>
    )
}

function EmployerDashboard() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>Кабинет работодателя</h1>
        </main>
    )
}

function CuratorDashboard() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>Кабинет куратора</h1>
        </main>
    )
}

function NotFound() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>404</h1>
            <p>Страница не найдена.</p>
        </main>
    )
}

function AppRouter() {
    return (
        <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/profile/edit" component={ProfileEditPage} />
            <Route path="/seeker" component={SeekerDashboard} />
            <Route path="/employer" component={EmployerDashboard} />
            <Route path="/curator" component={CuratorDashboard} />
            <Route component={NotFound} />
        </Switch>
    )
}

function App() {
    return (
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppRouter />
            <Toaster />
        </WouterRouter>
    )
}

export default App