/*Importing global variables from the external module*/
import { PLATFORM, API_URL, API_SCRIPT, MEK, APP_LOCATION } from './auth_frontend_script.js';

function logoutUser()
{
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');
    window.location.href = APP_LOCATION + '/frontend/login.html';
}

window.onload = function() {
    // Logout the user
    logoutUser();
    
    setTimeout(() => {
            window.location.href = APP_LOCATION + '/frontend/login.html';
        }, 1000);
};
