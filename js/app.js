document.addEventListener('DOMContentLoaded', () => {
    
    // --- KONFIGURACJA FIREBASE ---
    // WAŻNE: Wklej tutaj swoją konfigurację Firebase!
    const firebaseConfig = {
        apiKey: "AIzaSyBdMBapaa3ddbBEa5u1X2elfGzbvvE6Ub0",
        authDomain: "notatnik-treningowy-d272a.firebaseapp.com",
        projectId: "notatnik-treningowy-d272a",
        storageBucket: "notatnik-treningowy-d272a.firebasestorage.app",
        messagingSenderId: "624530662988",
        appId: "1:624530662988:web:77d1114564054ba9ff76e9"
    };

    // Inicjalizacja Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let user = null;
    let userDataRef = null;

    // --- SELEKTORY GŁÓWNE ---
    const app = document.getElementById('app');
    const loadingScreen = document.getElementById('loading-screen');
    const loginBtn = document.getElementById('login-btn');
    const mainContent = document.getElementById('main-content');
    const authContainer = document.getElementById('auth-container');
    
    // ... reszta selektorów bez zmian ...

    // --- STAN APLIKACJI ---
    let currentDate = new Date();
    let selectedDate = null;
    let workouts = {};
    let workoutTemplates = [];

    // --- LOGIKA FIREBASE (NOWE FUNKCJE) ---
    
    /**
     * Zapisuje dane użytkownika (treningi i szablony) do Firestore.
     */
    async function saveData() {
        if (!userDataRef) return;
        try {
            await userDataRef.set({
                workouts: workouts,
                workoutTemplates: workoutTemplates
            });
        } catch (error) {
            console.error("Błąd zapisu danych:", error);
            alert("Nie udało się zapisać danych. Sprawdź połączenie z internetem.");
        }
    }

    /**
     * Wczytuje dane użytkownika z Firestore.
     */
    async function loadData() {
        if (!userDataRef) return;
        const doc = await userDataRef.get();
        if (doc.exists) {
            const data = doc.data();
            workouts = data.workouts || {};
            workoutTemplates = data.workoutTemplates || [];
        } else {
            // Nowy użytkownik, inicjalizujemy puste dane
            workouts = {};
            workoutTemplates = [];
        }
        renderCalendar();
        mainContent.classList.remove('hidden');
        loadingScreen.classList.add('hidden');
    }

    // --- LOGIKA AUTENTYKACJI (NOWE FUNKCJE) ---

    const provider = new firebase.auth.GoogleAuthProvider();

    loginBtn.addEventListener('click', () => {
        auth.signInWithPopup(provider).catch(error => {
            console.error("Błąd logowania:", error);
            alert("Logowanie nie powiodło się.");
        });
    });

    function signOut() {
        auth.signOut();
    }

    auth.onAuthStateChanged(newUser => {
        if (newUser) {
            // Użytkownik zalogowany
            user = newUser;
            userDataRef = db.collection('users').doc(user.uid);
            authContainer.innerHTML = `
                <div class="flex items-center gap-2">
                    <img src="${user.photoURL}" alt="Avatar" class="w-8 h-8 rounded-full">
                    <button id="logout-btn" class="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg">Wyloguj</button>
                </div>
            `;
            document.getElementById('logout-btn').addEventListener('click', signOut);
            loadData();
        } else {
            // Użytkownik wylogowany
            user = null;
            userDataRef = null;
            workouts = {};
            workoutTemplates = [];
            authContainer.innerHTML = '';
            mainContent.classList.add('hidden');
            loadingScreen.querySelector('p').textContent = "Zaloguj się, aby kontynuować.";
            loadingScreen.classList.remove('hidden');
            loginBtn.classList.remove('hidden');
        }
    });

    // --- Pozostałe funkcje (z drobną modyfikacją - saveWorkouts/saveTemplates zastąpione przez saveData) ---
    
    // ... (wklej tutaj wszystkie funkcje od migrateData do końca, zastępując saveWorkouts() i saveTemplates() nową funkcją saveData())
    
    // Przykład modyfikacji:
    function confirmTemplateDeletion() {
        // ...
        if (confirm(`...`)) {
            // ...
            templatesToDelete.forEach(index => {
                workoutTemplates.splice(index, 1);
            });
            saveData(); // Zamiast saveTemplates()
        }
        exitTemplateDeleteMode();
    }

    // Zrób to samo dla wszystkich innych miejsc, gdzie były wywoływane stare funkcje zapisu.

});
