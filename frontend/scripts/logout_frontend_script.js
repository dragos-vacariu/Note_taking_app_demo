function logoutUser()
{
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem("MEK");
    window.location.href = APP_LOCATION + '/frontend/login.html';
}

window.onload = function() {
    // Logout the user
    logoutUser();
    
    setTimeout(() => {
            window.location.href = APP_LOCATION + '/frontend/login.html';
        }, 1000);
};
