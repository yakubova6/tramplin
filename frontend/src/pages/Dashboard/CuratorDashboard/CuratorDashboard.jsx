import {useState, useEffect, useMemo} from 'react'
import {useToast} from '../../../hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import Label from '../../../components/Label'
import CustomSelect from '../../../components/CustomSelect'
import {getCurrentUser} from '../../../utils/userHelpers'
import {getVerificationQueue, setVerificationStatus} from '../../../utils/mockModeration'
import '../DashboardBase.scss'
import './CuratorDashboard.scss'

const USER_ROLES = [
    {value: 'APPLICANT', label: 'Соискатель'},
    {value: 'EMPLOYER', label: 'Работодатель'},
    {value: 'CURATOR', label: 'Куратор'},
]

function CuratorDashboard() {
    const [refresh, setRefresh] = useState(0)
    const [user, setUser] = useState(null)
    const [activeTab, setActiveTab] = useState('verification')
    const [users, setUsers] = useState([])
    const [newCuratorEmail, setNewCuratorEmail] = useState('')
    const [newCuratorName, setNewCuratorName] = useState('')
    const [newCuratorPassword, setNewCuratorPassword] = useState('')
    const {toast} = useToast()

    const queue = useMemo(() => getVerificationQueue(), [refresh])
    const pending = queue.filter(item => item.status === 'pending')
    const reviewed = queue.filter(item => item.status !== 'pending')

    useEffect(() => {
        const currentUser = getCurrentUser()
        setUser(currentUser)
        const allUsers = localStorage.getItem('all_users')
        if (allUsers) setUsers(JSON.parse(allUsers))
    }, [])

    const approveDraft = (id) => {
        setVerificationStatus(id, 'approved')
        setRefresh(v => v + 1)
        toast({title: 'Одобрено', description: 'Заявка одобрена'})
    }

    const rejectDraft = (id) => {
        setVerificationStatus(id, 'rejected', 'Отклонено куратором')
        setRefresh(v => v + 1)
        toast({title: 'Отклонено', description: 'Заявка отклонена'})
    }

    const createCurator = () => {
        if (!newCuratorEmail.trim() || !newCuratorName.trim() || !newCuratorPassword.trim()) {
            toast({title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive'})
            return
        }
        const newUser = {
            id: Date.now(),
            email: newCuratorEmail,
            displayName: newCuratorName,
            password: newCuratorPassword,
            role: 'CURATOR',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
        }
        const updatedUsers = [...users, newUser]
        setUsers(updatedUsers)
        localStorage.setItem('all_users', JSON.stringify(updatedUsers))
        setNewCuratorEmail('')
        setNewCuratorName('')
        setNewCuratorPassword('')
        toast({title: 'Куратор создан', description: `Куратор ${newCuratorName} добавлен`})
    }

    const isAdmin = user?.role === 'ADMIN'

    return (
        <DashboardLayout title="Панель управления" subtitle="Модерация и администрирование">
            <div className="dashboard-tabs">
                <button className={`dashboard-tabs__btn ${activeTab === 'verification' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('verification')}>Верификация
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'users' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('users')}>Пользователи
                </button>
                {isAdmin && <button className={`dashboard-tabs__btn ${activeTab === 'create' ? 'is-active' : ''}`}
                                    onClick={() => setActiveTab('create')}>+ Куратор</button>}
            </div>

            <div className="dashboard-panel">
                {activeTab === 'verification' && (
                    <>
                        <div className="curator-card"><h3>Заявки на верификацию</h3>{pending.length === 0 ?
                            <p className="curator-empty">Нет заявок</p> : pending.map(item => (
                                <div key={item.id} className="curator-item">
                                    <div><strong>{item.userDisplayName}</strong> ({item.userEmail})
                                        <p>Роль: {item.role === 'EMPLOYER' ? 'Работодатель' : 'Соискатель'}</p>{item.payload?.profile?.companyName &&
                                            <p>Компания: {item.payload.profile.companyName}</p>}</div>
                                    <div className="curator-item__actions"><Button
                                        onClick={() => approveDraft(item.id)}>Одобрить</Button>
                                        <button className="curator-item__reject"
                                                onClick={() => rejectDraft(item.id)}>Отклонить
                                        </button>
                                    </div>
                                </div>))}</div>
                        <div className="curator-card"><h3>Обработанные</h3>{reviewed.length === 0 ?
                            <p className="curator-empty">Нет обработанных</p> : reviewed.map(item => (
                                <div key={item.id} className="curator-reviewed-item">
                                    <span><strong>{item.userDisplayName}</strong> — {item.status === 'approved' ? 'Одобрено' : 'Отклонено'}</span>
                                </div>))}</div>
                    </>
                )}

                {activeTab === 'users' && (
                    <div className="curator-card"><h3>Все пользователи</h3>
                        <div className="curator-users">
                            <table>
                                <thead>
                                <tr>
                                    <th>Имя</th>
                                    <th>Email</th>
                                    <th>Роль</th>
                                    <th>Статус</th>
                                    <th>Дата</th>
                                </tr>
                                </thead>
                                <tbody>{users.map(u => (<tr key={u.id}>
                                    <td>{u.displayName}</td>
                                    <td>{u.email}</td>
                                    <td>{u.role === 'APPLICANT' ? 'Соискатель' : u.role === 'EMPLOYER' ? 'Работодатель' : 'Куратор'}</td>
                                    <td><span
                                        className={`status-badge status-${u.status?.toLowerCase()}`}>{u.status === 'ACTIVE' ? 'Активен' : 'Неактивен'}</span>
                                    </td>
                                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                </tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'create' && isAdmin && (
                    <div className="curator-card"><h3>Создать куратора</h3>
                        <div className="curator-create-form">
                            <div className="curator-create-form__field"><Label>Email</Label><Input type="email"
                                                                                                   value={newCuratorEmail}
                                                                                                   onChange={e => setNewCuratorEmail(e.target.value)}
                                                                                                   placeholder="curator@example.com"/>
                            </div>
                            <div className="curator-create-form__field"><Label>Имя</Label><Input value={newCuratorName}
                                                                                                 onChange={e => setNewCuratorName(e.target.value)}
                                                                                                 placeholder="Иван Кураторов"/>
                            </div>
                            <div className="curator-create-form__field"><Label>Пароль</Label><Input type="password"
                                                                                                    value={newCuratorPassword}
                                                                                                    onChange={e => setNewCuratorPassword(e.target.value)}
                                                                                                    placeholder="••••••••"/>
                            </div>
                            <Button onClick={createCurator}>Создать</Button></div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default CuratorDashboard