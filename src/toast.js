const toastContainer = document.getElementById('toast-container');

export const sendToast = (message, variant = 'warning') => {
    let toast = document.createElement('div');
    toast.classList.add('toast');
    toast.classList.add('toast--' + variant);
    toast.classList.add('toast--active');

    let toastText = document.createElement('span');
    toastText.id = 'toast-text';
    toastText.innerHTML = message;

    let toastClose = document.createElement('toast-close');
    toastClose.id = 'toast-close';
    toastClose.innerHTML = '<img id="toast-close" src="./close-icon.png" alt="x"></img>';

    if (toastContainer.childNodes.length >= 3) toastContainer.removeChild(toastContainer.childNodes[0]);

    toast.appendChild(toastText);
    toast.appendChild(toastClose);
    toastContainer.appendChild(toast);

    const handleToastClose = () => {
        toastContainer.removeChild(toast);
    };

    toastClose.addEventListener('click', handleToastClose);
    setTimeout(() => {
        toastContainer.contains(toast) && handleToastClose();
    }, 5000);
};
