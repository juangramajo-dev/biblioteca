import React from 'react';

function SearchBar({
    value,
    onChange,
    onSearch,
    placeholder = 'Buscar...',
    loading = false,
    buttonClassName = 'btn btn-success',
    buttonText = 'Buscar',
}) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch();
    };

    return (
        <form className="d-flex gap-2 mb-3" onSubmit={handleSubmit}>
            <input
                type="text"
                className="form-control"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <button type="submit" className={buttonClassName} disabled={loading}>
                {loading ? 'Buscando...' : buttonText}
            </button>
        </form>
    );
}

export default SearchBar;

