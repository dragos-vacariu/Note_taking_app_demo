function logoutUser()
{
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');
    window.location.href = './login.html';
}

window.onload = function() {
    // Logout the user
    logoutUser();
    
    setTimeout(() => {
        window.location.href = './login.html';
    }, 1000);
};
