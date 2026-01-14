window.onload = function() {
    // Logout the user
    logoutUser();
    
    setTimeout(() => {
            window.location.href = APP_LOCATION + '/frontend/login.html';
        }, 1000);
};
