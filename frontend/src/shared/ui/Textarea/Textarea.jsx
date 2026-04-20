import './Textarea.scss'

function Textarea({
                      id,
                      value,
                      onChange,
                      placeholder = '',
                      rows = 3,
                      required = false,
                      className = '',
                  }) {
    return (
        <textarea
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
            className={`textarea ${className}`.trim()}
        />
    )
}

export default Textarea