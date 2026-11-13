import React from 'react';

function ModalBase({
    titulo,
    cerrar,
    children,
    footer,
    size = '',
    overlayClassName = 'modal-socios',
    headerExtra = null,
}) {
    return (
        <div
            className={`modal d-block ${overlayClassName}`}
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        >
            <div className={`modal-dialog ${size} modal-dialog-centered modal-dialog-scrollable`}>
                <div className="modal-content border-0 shadow-lg">
                    <div className={`modal-header ${headerExtra ? 'd-block pb-0' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center w-100">
                            <h5 className="modal-title mb-0">{titulo}</h5>
                            {cerrar && (
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Cerrar"
                                    onClick={cerrar}
                                ></button>
                            )}
                        </div>
                        {headerExtra && <div className="mt-3">{headerExtra}</div>}
                    </div>

                    <div className="modal-body">{children}</div>

                    <div className="modal-footer">
                        {footer || (
                            <button type="button" className="btn btn-secondary" onClick={cerrar}>
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModalBase;

