import { Switch, Route } from 'wouter'
import Login from './pages/Auth/Login/Login'
import Register from './pages/Auth/Register/Register'
import Toaster from './components/Toast/Toaster'

import ProfileEditPage from './pages/ProfileEdit/ProfileEdit'
import SeekerDashboard from './pages/Dashboard/SeekerDashboard/SeekerDashboard'
import EmployerDashboard from './pages/Dashboard/EmployerDashboard/EmployerDashboard'
import CuratorDashboard from './pages/Dashboard/CuratorDashboard/CuratorDashboard'
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage/OpportunitiesPage'
import OpportunityDetailPage from './pages/Opportunities/OpportunityDetailPage/OpportunityDetailPage'

function NotFound() {
    return (
        <main className="container" style={{ paddingBlock: '40px' }}>
            <h1>404</h1>
            <p>Страница не найдена.</p>
        </main>
    )
}

function App() {
    return (
        <>
            <Switch>
                <Route path="/" component={OpportunitiesPage} />
                <Route path="/opportunities/:id" component={OpportunityDetailPage} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />

                <Route path="/profile/edit" component={ProfileEditPage} />
                <Route path="/seeker" component={SeekerDashboard} />
                <Route path="/employer" component={EmployerDashboard} />
                <Route path="/curator" component={CuratorDashboard} />

                <Route component={NotFound} />
            </Switch>

            <Toaster />
        </>
    )
}

export default App