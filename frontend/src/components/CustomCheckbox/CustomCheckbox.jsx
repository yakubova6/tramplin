import './CustomCheckbox.scss'

function CustomCheckbox({ checked, onChange, label }) {
    return (
        <button
            type="button"
            className={`custom-checkbox ${checked ? 'is-checked' : ''}`}
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
        >
            <span className="custom-checkbox__box">{checked ? '✓' : ''}</span>
            <span className="custom-checkbox__label">{label}</span>
        </button>
    )
}

export default CustomCheckbox