import './Button.scss'

function Button({
                    type = 'button',
                    children,
                    className = '',
                    disabled = false,
                    onClick,
                }) {
    return (
        <button
            type={type}
            className={`button ${className}`.trim()}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

export default Button