// Import Firebase
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
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Add to app.js
import { SmartMatchingAlgorithm } from './matching-algorithm.js';

const matchingAlgorithm = new SmartMatchingAlgorithm();

// Enhanced loadPartnersData function
async function loadPartnersData() {
    if (!currentUser) return;
    
    try {
        // Get current user profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const currentProfile = userDoc.data();
        
        // Get all users for matching
        const usersQuery = query(collection(db, 'users'), where('uid', '!=', currentUser.uid));
        const querySnapshot = await getDocs(usersQuery);
        
        const allUsers = [];
        querySnapshot.forEach(doc => allUsers.push(doc.data()));
        
        // Run matching algorithm
        const matches = await matchingAlgorithm.findPartners(currentProfile, allUsers);
        
        // Display matches
        displayMatches(matches);
        
    } catch (error) {
        console.error('❌ Matching error:', error);
        document.getElementById('partners-list').innerHTML = 
            '<p class="text-center text-danger">Error loading matches</p>';
    }
}

function displayMatches(matches) {
    let html = '';
    
    matches.forEach(match => {
        html += `
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="profile-circle" style="background: ${match.compatibilityColor}">
                                ${match.name.charAt(0)}
                            </div>
                        </div>
                        <div class="col">
                            <h5>${match.name}</h5>
                            <p class="mb-1">${match.school} • ${match.academicLevel}</p>
                            <p class="mb-1 text-muted">${match.region}</p>
                            <small class="text-muted">${match.subjects?.slice(0, 3).join(', ')}</small>
                        </div>
                        <div class="col-auto text-center">
                            <div class="compatibility-score">
                                <div class="progress-ring" style="color: ${match.compatibilityColor}">
                                    ${match.compatibilityScore}%
                                </div>
                                <small>${matchingAlgorithm.generateMatchMessage(match.compatibilityScore)}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="fas fa-check-circle"></i> ${match.matchReasons.join(' • ')}
                        </small>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-primary btn-sm" onclick="sendConnectionRequest('${match.uid}')">
                            <i class="fas fa-user-plus"></i> Connect
                        </button>
                        <button class="btn btn-outline-secondary btn-sm ms-2" onclick="viewProfile('${match.uid}')">
                            <i class="fas fa-eye"></i> Profile
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('partners-list').innerHTML = html || 
        '<p class="text-center">No matches found. Try adjusting your preferences!</p>';
}

// Add connection request function
async function sendConnectionRequest(targetUserId) {
    if (!currentUser) return;
    
    try {
        await addDoc(collection(db, 'connectionRequests'), {
            fromUserId: currentUser.uid,
            toUserId: targetUserId,
            status: 'pending',
            timestamp: serverTimestamp()
        });
        
        showAlert('Connection request sent!', 'success');
    } catch (error) {
        showAlert('Failed to send request', 'danger');
    }
}

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2Kl8otpakwNYDAM88YlTJ71OnM_Qb-Sk",
    authDomain: "studybuddyghana.firebaseapp.com",
    projectId: "studybuddyghana",
    storageBucket: "studybuddyghana.firebasestorage.app",
    messagingSenderId: "775379484331",
    appId: "1:775379484331:web:65443b3d223772e220c1ee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 StudyBuddy Ghana initialized');
    setupAuthListener();
    setupOfflineDetection();
});

// Auth State Listener
function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        console.log('🔐 Auth state:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            showSection('dashboard');
            document.getElementById('logout-btn').classList.remove('d-none');
        } else {
            currentUser = null;
            showSection('auth');
            showLogin();
            document.getElementById('logout-btn').classList.add('d-none');
        }
    });
}

// Section Management
function showSection(section) {
    console.log('📍 Showing section:', section);
    
    const sections = ['auth-section', 'dashboard-section', 'find-partners-section', 'study-groups-section'];
    sections.forEach(s => {
        const element = document.getElementById(s);
        if (element) element.style.display = 'none';
    });
    
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        if (section === 'dashboard') loadDashboardData();
        if (section === 'find-partners') loadPartnersData();
        if (section === 'study-groups') loadGroupsData();
    }
}

// Auth Functions
async function handleLogin(event) {
    event.preventDefault();
    console.log('🎯 Login attempt');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAlert('Please enter email and password', 'warning');
        return;
    }

    showLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert('🎉 Welcome back!', 'success');
    } catch (error) {
        console.error('❌ Login error:', error);
        showAlert(error.message, 'danger');
    }
    showLoading(false);
}

async function handleRegister(event) {
    event.preventDefault();
    console.log('🎯 Registration attempt');
    
    const userData = {
        name: document.getElementById('reg-name').value,
        school: document.getElementById('reg-school').value,
        academicLevel: document.getElementById('reg-level').value,
        region: document.getElementById('reg-region').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
    };

    // Validation
    if (!Object.values(userData).every(v => v)) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }

    if (userData.password.length < 6) {
        showAlert('Password must be at least 6 characters', 'warning');
        return;
    }

    console.log('✅ Validation passed:', userData);

    showLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        console.log('✅ User created:', userCredential.user.uid);
        
        await createUserProfile(userCredential.user.uid, userData);
        console.log('✅ Profile created');
        
        showAlert('🎉 Account created successfully!', 'success');
        showLogin();
        
    } catch (error) {
        console.error('❌ Registration error:', error.code, error.message);
        showAlert(error.message, 'danger');
    }
    showLoading(false);
}

async function createUserProfile(uid, userData) {
    const profile = {
        uid: uid,
        name: userData.name,
        school: userData.school,
        academicLevel: userData.academicLevel,
        region: userData.region,
        email: userData.email,
        subjects: [],
        subjectStrengths: {},
        studyPreferences: {
            groupSize: "2-4_people",
            sessionLength: "2-3_hours",
            preferredTime: ["weekends"],
            studyStyle: ["visual_learner"]
        },
        stats: {
            studyHoursLogged: 0,
            groupsJoined: 0,
            peersHelped: 0,
            averageSessionRating: 0,
            streakDays: 0
        },
        preferences: {
            notifications: true,
            visibility: "public",
            matchingRadius: 25,
            languagePreference: ["English", "Twi"]
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', uid), profile);
}

async function handleGoogleSignIn() {
    console.log('🎯 Google sign-in attempt');
    const provider = new GoogleAuthProvider();
    
    try {
        await signInWithPopup(auth, provider);
        showAlert('🎉 Google login successful!', 'success');
    } catch (error) {
        console.error('❌ Google login error:', error);
        showAlert(error.message, 'danger');
    }
}

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
                    <p>${partner.school} • ${partner.academicLevel}</p>
                    <p>${partner.region}</p>
                    <button class="btn btn-primary btn-sm">Connect</button>
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
    alertDiv.style.cssText = 'top: 70px; right: 10px; z-index: 9999; min-width: 300px;';
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

async function logout() {
    try {
        await signOut(auth);
        showAlert('Logged out successfully', 'info');
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// Offline Detection
function setupOfflineDetection() {
    window.addEventListener('online', () => {
        document.getElementById('offline-banner').style.display = 'none';
        showAlert('Back online!', 'success');
    });
    
    window.addEventListener('offline', () => {
        document.getElementById('offline-banner').style.display = 'block';
    });
}

// Export to global scope
window.showSection = showSection;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleSignIn = handleGoogleSignIn;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
