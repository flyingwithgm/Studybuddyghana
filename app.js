import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    setDoc,
    query, 
    where, 
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Setup auth listener
    onAuthStateChanged(auth, handleAuthStateChange);
    
    // Setup offline detection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial state
    showSection('auth');
}

// Auth State Handler
function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        loadUserData(user.uid);
        showSection('dashboard');
        document.getElementById('logout-btn').classList.remove('d-none');
    } else {
        currentUser = null;
        showSection('auth');
        document.getElementById('logout-btn').classList.add('d-none');
    }
}

// Section Management
function showSection(section) {
    const sections = ['auth-section', 'dashboard-section', 'find-partners-section', 'study-groups-section'];
    sections.forEach(s => {
        const element = document.getElementById(s);
        if (element) element.style.display = 'none';
    });
    
    document.getElementById(`${section}-section`).style.display = 'block';
    
    if (section === 'dashboard') loadDashboardData();
    if (section === 'find-partners') loadPartnersData();
    if (section === 'study-groups') loadGroupsData();
}

// Auth Functions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    showLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert('🎉 Welcome back!', 'success');
    } catch (error) {
        showAlert(error.message, 'danger');
    }
    showLoading(false);
}

async function handleRegister(event) {
    event.preventDefault();
    const userData = {
        name: document.getElementById('reg-name').value,
        school: document.getElementById('reg-school').value,
        academicLevel: document.getElementById('reg-level').value,
        region: document.getElementById('reg-region').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
    };

    showLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        await createUserProfile(userCredential.user.uid, userData);
        showAlert('🎉 Account created!', 'success');
        showLogin();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
    showLoading(false);
}

async function handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function createUserProfile(uid, userData) {
    const profile = {
        name: userData.name,
        school: userData.school,
        academicLevel: userData.academicLevel,
        region: userData.region,
        email: userData.email,
        subjects: [],
        stats: {
            studyHoursLogged: 0,
            groupsJoined: 0,
            peersHelped: 0,
            streakDays: 0
        },
        createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', uid), profile);
}

async function logout() {
    await signOut(auth);
    showAlert('Logged out successfully', 'info');
}

// Data Loading Functions
async function loadUserData(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById('user-name').textContent = userData.name;
    }
}

async function loadDashboardData() {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        document.getElementById('groups-count').textContent = data.stats?.groupsJoined || 0;
        document.getElementById('hours-count').textContent = data.stats?.studyHoursLogged || 0;
        document.getElementById('streak-count').textContent = data.stats?.streakDays || 0;
    }
}

async function loadPartnersData() {
    if (!currentUser) return;
    
    const partnersQuery = query(collection(db, 'users'), where('uid', '!=', currentUser.uid));
    const querySnapshot = await getDocs(partnersQuery);
    
    let html = '';
    querySnapshot.forEach(doc => {
        const partner = doc.data();
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>${partner.name}</h5>
                    <p class="text-muted">${partner.school} • ${partner.academicLevel}</p>
                    <button class="btn btn-primary btn-sm" onclick="connectPartner('${partner.uid}')">
                        Connect
                    </button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('partners-list').innerHTML = html || '<p class="text-center">No partners found</p>';
}

async function loadGroupsData() {
    if (!currentUser) return;
    
    const groupsQuery = query(
        collection(db, 'studyGroups'),
        where('members', 'array-contains', currentUser.uid)
    );
    const querySnapshot = await getDocs(groupsQuery);
    
    let html = '';
    querySnapshot.forEach(doc => {
        const group = doc.data();
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>${group.name || 'Study Group'}</h5>
                    <p>${group.subject || 'General'}</p>
                    <p><small>${group.members?.length || 0} members</small></p>
                </div>
            </div>
        `;
    });
    
    document.getElementById('groups-list').innerHTML = html || '<p class="text-center">No groups found</p>';
}

// UI Functions
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 10px; right: 10px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>`;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function showLoading(show) {
    document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

function createStudyGroup() {
    showAlert('Study groups coming soon!', 'info');
}

function connectPartner(partnerId) {
    showAlert(`Connection request sent to ${partnerId}`, 'success');
}

// Export functions to global scope
window.showSection = showSection;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleSignIn = handleGoogleSignIn;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.createStudyGroup = createStudyGroup;
