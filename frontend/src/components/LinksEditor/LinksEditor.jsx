import Input from '../Input'
import Label from '../Label'
import './LinksEditor.scss'

function LinksEditor({ label, rows, setRows, placeholderTitle = 'Название (GitHub, Telegram...)', placeholderUrl = 'https://...' }) {
    const updateRow = (id, patch) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    }

    const removeRow = (id) => {
        setRows((prev) => prev.filter((r) => r.id !== id))
    }

    const addRow = () => {
        const newId = Date.now()
        setRows((prev) => [...prev, { id: newId, title: '', url: '' }])
    }

    return (
        <div className="links-editor">
            <Label>{label}</Label>
            <div className="links-editor__list">
                {rows.map((row) => (
                    <div key={row.id} className="links-editor__row">
                        <Input
                            placeholder={placeholderTitle}
                            value={row.title}
                            onChange={(e) => updateRow(row.id, { title: e.target.value })}
                        />
                        <Input
                            placeholder={placeholderUrl}
                            value={row.url}
                            onChange={(e) => updateRow(row.id, { url: e.target.value })}
                        />
                        <button
                            type="button"
                            className="links-editor__remove"
                            onClick={() => removeRow(row.id)}
                            aria-label="Удалить ссылку"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" className="links-editor__add" onClick={addRow}>
                + Добавить ссылку
            </button>
        </div>
    )
}

export default LinksEditor