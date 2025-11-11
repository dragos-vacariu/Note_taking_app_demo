function logoutUser()
{
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');
    window.location.href = '/frontend/login.html';
}

window.onload = function() {
    // Logout the user
    logoutUser();
    
    setTimeout(() => {
        window.location.href = '/frontend/login.html';
    }, 1000);
};
