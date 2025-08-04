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
    const calendarView = document.getElementById('calendar-view');
    const dayView = document.getElementById('day-view');
    const monthYearEl = document.getElementById('month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const toggleTemplatesPanelBtn = document.getElementById('toggle-templates-panel-btn');
    const calendarActionBar = document.getElementById('calendar-action-bar');
    const finishEditingDaysBtn = document.getElementById('finish-editing-days-btn');
    const dayHeaders = document.querySelectorAll('#day-headers .day-header');

    // --- SELEKTORY WIDOKU DNIA ---
    const backToCalendarBtn = document.getElementById('back-to-calendar');
    const dayViewDateEl = document.getElementById('day-view-date');
    const exerciseList = document.getElementById('exercise-list');
    const exerciseNameInput = document.getElementById('exercise-name');
    const saveExerciseBtn = document.getElementById('save-exercise');
    const saveDayAsTemplateBtn = document.getElementById('save-day-as-template-btn');
    const dayNoteTextarea = document.getElementById('day-note');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const noteSavedFeedback = document.getElementById('note-saved-feedback');
    const addExerciseForm = {
        name: exerciseNameInput,
        reps: { container: document.getElementById('reps-input-container'), input: document.getElementById('reps-input'), addBtn: document.getElementById('add-reps-btn') },
        sets: { container: document.getElementById('sets-input-container'), input: document.getElementById('sets-input'), addBtn: document.getElementById('add-sets-btn') },
        km: { container: document.getElementById('km-input-container'), input: document.getElementById('km-input'), addBtn: document.getElementById('add-km-btn') }
    };
    
    // --- SELEKTORY PANEU SZABLONÓW ---
    const templatesPanel = document.getElementById('templates-panel');
    const templateList = document.getElementById('template-list');
    const createTemplateColumn = document.getElementById('create-template-column');
    const templateNameInput = document.getElementById('template-name-input');
    const newTemplateExercisesContainer = document.getElementById('new-template-exercises');
    const addExerciseToTemplateBtn = document.getElementById('add-exercise-to-template-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const deleteTemplatesModeBtn = document.getElementById('delete-templates-mode-btn');
    const templateDeleteBar = document.getElementById('template-delete-bar');
    const templateSelectionCounter = document.getElementById('template-selection-counter');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // --- STAN APLIKACJI ---
    let currentDate = new Date();
    let selectedDate = null;
    let workouts = {};
    let workoutTemplates = [];

    // Stany trybów specjalnych
    let isDayEditModeActive = false;
    let selectedTemplateForEdit = null;
    let isTemplateDeleteModeActive = false;
    let templatesToDelete = [];

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const dayNames = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."];

    // --- FUNKCJE FIREBASE ---
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

    async function loadData() {
        if (!userDataRef) return;
        loadingScreen.querySelector('p').textContent = "Proszę czekać, ładuję dane...";
        loginBtn.classList.add('hidden');
        loadingScreen.classList.remove('hidden');

        const doc = await userDataRef.get();
        if (doc.exists) {
            const data = doc.data();
            workouts = data.workouts || {};
            workoutTemplates = data.workoutTemplates || [];
        } else {
            workouts = {};
            workoutTemplates = [];
        }
        renderCalendar();
        mainContent.classList.remove('hidden');
        loadingScreen.classList.add('hidden');
    }

    // --- LOGIKA AUTENTYKACJI ---
    const provider = new firebase.auth.GoogleAuthProvider();
    loginBtn.addEventListener('click', () => {
        auth.signInWithPopup(provider)
            .then(() => {
                window.location.reload();
            })
            .catch(error => {
                console.error("Błąd logowania:", error);
                alert("Logowanie nie powiodło się.");
            });
    });

    function signOut() {
        auth.signOut();
    }

    auth.onAuthStateChanged(newUser => {
        if (newUser) {
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

    // --- Pozostałe funkcje ---
    const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    function checkWorkoutCompletion(dateKey) {
        const dayData = workouts[dateKey];
        if (!dayData || !dayData.exercises || dayData.exercises.length === 0) return null;
        return dayData.exercises.every(ex => 
            (!ex.reps || ex.reps.done >= ex.reps.target) &&
            (!ex.sets || ex.sets.done >= ex.sets.target) &&
            (!ex.km || ex.km.done >= ex.km.target)
        );
    }

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearEl.textContent = `${monthNames[month]} ${year}`;
        calendarGrid.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dayOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

        for (let i = 0; i < dayOffset; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            const date = new Date(year, month, day);
            const dateKey = formatDateKey(date);
            
            dayCell.textContent = day;
            dayCell.className = 'p-1 h-12 sm:p-4 sm:h-auto rounded-lg cursor-pointer transition-colors duration-200 flex items-center justify-center relative text-sm';
            
            const isToday = date.toDateString() === new Date().toDateString();

            if (isToday) {
                const completionStatus = checkWorkoutCompletion(dateKey);
                if (completionStatus === true) {
                    dayCell.classList.add('bg-green-800', 'hover:bg-green-700', 'text-white', 'font-bold');
                } else {
                    dayCell.classList.add('bg-cyan-600', 'text-white', 'font-bold');
                }
            } else if (date < today) {
                const completionStatus = checkWorkoutCompletion(dateKey);
                if (completionStatus === true) {
                    dayCell.classList.add('bg-green-800', 'hover:bg-green-700');
                } else if (completionStatus === false) {
                    dayCell.classList.add('bg-red-800', 'hover:bg-red-700');
                } else {
                    dayCell.classList.add('bg-gray-700', 'opacity-50');
                }
            } else {
                dayCell.classList.add('bg-gray-700', 'hover:bg-cyan-500');
            }

            if (isDayEditModeActive && dayHasTemplate(dateKey, selectedTemplateForEdit)) {
                dayCell.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-800');
            }

            const dayData = workouts[dateKey];
            if (dayData && (dayData.exercises.length > 0 || dayData.note?.trim())) {
                const dot = document.createElement('span');
                dot.className = 'absolute bottom-1 right-1 w-2 h-2 bg-green-400 rounded-full';
                dayCell.appendChild(dot);
            }

            dayCell.addEventListener('click', () => {
                if (isDayEditModeActive) {
                    toggleTemplateOnDay(date);
                } else {
                    selectedDate = date;
                    showDayView();
                }
            });
            calendarGrid.appendChild(dayCell);
        }
    };
    
    const renderDayView = () => {
        const dateKey = formatDateKey(selectedDate);
        dayViewDateEl.textContent = selectedDate.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const dayData = workouts[dateKey] || { exercises: [], note: '' };
        exerciseList.innerHTML = '';
        exerciseList.className = 'mb-6';

        if (dayData.exercises.length === 0) {
            exerciseList.innerHTML = `<div class="text-center text-gray-400 p-4 bg-gray-700 rounded-lg max-w-2xl mx-auto">Brak zaplanowanych ćwiczeń na ten dzień.</div>`;
            saveDayAsTemplateBtn.classList.add('hidden');
        } else {
            saveDayAsTemplateBtn.classList.remove('hidden');
            exerciseList.className = 'bg-gray-700 p-2 sm:p-4 rounded-lg shadow-md max-w-2xl mx-auto mb-6';
            let allExercisesHtml = '';
            dayData.exercises.forEach((exercise, index) => {
                let detailsHtml = '<div class="space-y-3 mt-2">';
                if (exercise.reps) detailsHtml += createProgressHtml('reps', 'Powtórzenia', '', exercise.reps, index);
                if (exercise.sets) detailsHtml += createProgressHtml('sets', 'Serie', '', exercise.sets, index);
                if (exercise.km) detailsHtml += createProgressHtml('km', 'Dystans', ' km', exercise.km, index);
                detailsHtml += '</div>';
                allExercisesHtml += `
                    <div class="p-2 border-b border-gray-600 last:border-b-0">
                        <div class="flex justify-between items-start">
                            <h4 class="text-lg sm:text-xl font-semibold text-white">${exercise.name}</h4>
                            <button data-index="${index}" class="delete-exercise-btn bg-red-600 hover:bg-red-500 text-white font-bold p-2 rounded-lg transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>
                        ${detailsHtml}
                    </div>`;
            });
            exerciseList.innerHTML = allExercisesHtml;
        }
        dayNoteTextarea.value = dayData.note || '';
    };

    function createProgressHtml(type, label, unit, data, index) {
        const progressPercentage = data.target > 0 ? (data.done / data.target) * 100 : 0;
        return `
            <div class="bg-gray-600/50 p-3 rounded-lg">
                <div class="flex justify-between items-center">
                    <span class="font-medium text-gray-300 text-sm">${label}</span>
                    <div class="text-right">
                        <span class="editable-progress font-bold text-cyan-400 text-lg cursor-pointer" data-index="${index}" data-type="${type}">${data.done}</span>
                        <span class="text-gray-400"> / ${data.target}${unit}</span>
                    </div>
                </div>
                <div class="w-full bg-gray-500 rounded-full h-1.5 mt-2"><div class="bg-cyan-400 h-1.5 rounded-full" style="width: ${progressPercentage}%"></div></div>
                <div class="flex flex-wrap justify-end items-center gap-1 mt-3">
                    <button class="update-progress-btn bg-gray-500 hover:bg-gray-400 text-xs font-mono py-1 px-2 rounded" data-index="${index}" data-type="${type}" data-value="-10">-10</button>
                    <button class="update-progress-btn bg-gray-500 hover:bg-gray-400 text-xs font-mono py-1 px-2 rounded" data-index="${index}" data-type="${type}" data-value="-5">-5</button>
                    <button class="update-progress-btn bg-gray-500 hover:bg-gray-400 text-xs font-mono py-1 px-2 rounded" data-index="${index}" data-type="${type}" data-value="-1">-1</button>
                    <span class="w-px h-5 bg-gray-500 mx-1"></span>
                    <button class="update-progress-btn bg-gray-500 hover:bg-gray-400 text-xs font-mono py-1 px-2 rounded" data-index="${index}" data-type="${type}" data-value="1">+1</button>
                    <button class="update-progress-btn bg-gray-500 hover:bg-gray-400 text-xs font-mono py-1 px-2 rounded" data-index="${index}" data-type="${type}" data-value="5">+5</button>
                    <button class="update-progress-btn bg-gray-500 hover:bg-gray-400 text-xs font-mono py-1 px-2 rounded" data-index="${index}" data-type="${type}" data-value="10">+10</button>
                </div>
            </div>`;
    }

    const resetAddExerciseForm = () => {
        addExerciseForm.name.value = '';
        ['reps', 'sets', 'km'].forEach(type => {
            addExerciseForm[type].container.classList.add('hidden');
            addExerciseForm[type].input.value = '';
        });
    };

    function updateProgress(index, type, value) {
        const dateKey = formatDateKey(selectedDate);
        const exercise = workouts[dateKey]?.exercises[index];
        if (exercise && exercise[type]) {
            let currentDone = exercise[type].done;
            let newValue = currentDone + value;
            exercise[type].done = Math.min(exercise[type].target, Math.max(0, newValue));
        }
        saveData();
        renderDayView();
        renderCalendar();
    }

    function makeProgressEditable(spanElement, index, type) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'bg-gray-900 text-cyan-400 font-bold text-lg w-20 text-center rounded-md p-0';
        input.value = spanElement.textContent;
        
        const saveAndUpdate = () => {
            const dateKey = formatDateKey(selectedDate);
            const exercise = workouts[dateKey].exercises[index];
            const newValue = parseFloat(input.value) || 0;
            exercise[type].done = Math.min(exercise[type].target, Math.max(0, newValue));
            saveData();
            renderDayView();
            renderCalendar();
        };

        input.addEventListener('blur', saveAndUpdate);
        input.addEventListener('keydown', e => (e.key === 'Enter') && input.blur());
        spanElement.parentElement.replaceChild(input, spanElement);
        input.focus();
        input.select();
    }

    const deleteExercise = (index) => {
        const dateKey = formatDateKey(selectedDate);
        if (workouts[dateKey]?.exercises) {
            workouts[dateKey].exercises.splice(index, 1);
            if (workouts[dateKey].exercises.length === 0 && !workouts[dateKey].note?.trim()) {
                delete workouts[dateKey];
            }
            saveData();
            renderDayView();
            renderCalendar();
        }
    };
    
    const showCalendarView = () => {
        dayView.classList.add('hidden');
        calendarView.classList.remove('hidden');
    };

    const showDayView = () => {
        calendarView.classList.add('hidden');
        templatesPanel.classList.add('hidden');
        dayView.classList.remove('hidden');
        resetAddExerciseForm();
        renderDayView();
    };

    const renderTemplateList = () => {
        templateList.innerHTML = workoutTemplates.length === 0 ? `<p class="text-gray-400">Brak zapisanych szablonów.</p>` : '';
        deleteTemplatesModeBtn.style.display = workoutTemplates.length > 0 ? 'block' : 'none';

        workoutTemplates.forEach((template, index) => {
            const templateEl = document.createElement('div');
            templateEl.className = 'bg-gray-700 p-3 rounded-lg flex flex-col transition-all duration-200';
            templateEl.dataset.templateIndex = index;

            if (isTemplateDeleteModeActive) {
                templateEl.classList.add('cursor-pointer');
                if (templatesToDelete.includes(index)) {
                    templateEl.classList.add('ring-2', 'ring-red-500', 'bg-red-900/50');
                }
            }

            templateEl.innerHTML = `
                <div class="flex-grow pointer-events-none">
                    <h4 class="font-bold text-lg text-indigo-400">${template.name}</h4>
                    <ul class="list-disc list-inside my-2">${template.exercises.map(ex => `<li class="text-sm text-gray-300">${ex.name}</li>`).join('')}</ul>
                </div>
                <div class="mt-3 flex flex-wrap gap-2 justify-end items-center">
                    <button class="edit-custom-days-btn bg-cyan-600 hover:bg-cyan-500 p-2 rounded-md text-sm" data-template-index="${index}">Edytuj Dni</button>
                </div>`;
            templateList.appendChild(templateEl);
        });
    };

    const addExerciseFieldToTemplateForm = () => {
        const exerciseField = document.createElement('div');
        exerciseField.className = 'grid grid-cols-3 gap-2 new-exercise-row';
        exerciseField.innerHTML = `
            <input type="text" placeholder="Nazwa" class="template-ex-name col-span-3 bg-gray-800 p-1 rounded-sm text-sm">
            <input type="number" placeholder="Serie" class="template-ex-sets bg-gray-800 p-1 rounded-sm text-sm">
            <input type="number" placeholder="Powt." class="template-ex-reps bg-gray-800 p-1 rounded-sm text-sm">
            <input type="number" step="0.1" placeholder="km" class="template-ex-km bg-gray-800 p-1 rounded-sm text-sm">`;
        newTemplateExercisesContainer.appendChild(exerciseField);
    };

    const resetTemplateForm = () => {
        templateNameInput.value = '';
        newTemplateExercisesContainer.innerHTML = '';
        addExerciseFieldToTemplateForm();
    };

    const saveNewTemplate = () => {
        const name = templateNameInput.value.trim();
        if (!name) return alert('Proszę podać nazwę szablonu.');

        const exercises = [];
        newTemplateExercisesContainer.querySelectorAll('.new-exercise-row').forEach(row => {
            const exName = row.querySelector('.template-ex-name').value.trim();
            if (exName) {
                const ex = { name: exName };
                const sets = parseInt(row.querySelector('.template-ex-sets').value);
                const reps = parseInt(row.querySelector('.template-ex-reps').value);
                const km = parseFloat(row.querySelector('.template-ex-km').value);
                if (sets) ex.sets = { target: sets, done: 0 };
                if (reps) ex.reps = { target: reps, done: 0 };
                if (km) ex.km = { target: km, done: 0 };
                if (Object.keys(ex).length > 1) exercises.push(ex);
            }
        });

        if (exercises.length === 0) return alert('Szablon musi zawierać co najmniej jedno ćwiczenie.');
        workoutTemplates.push({ name, exercises });
        saveData();
        renderTemplateList();
        resetTemplateForm();
    };

    function enterTemplateDeleteMode() {
        isTemplateDeleteModeActive = true;
        templatesToDelete = [];
        createTemplateColumn.classList.add('hidden');
        templateDeleteBar.classList.remove('hidden');
        deleteTemplatesModeBtn.classList.add('hidden');
        templateSelectionCounter.textContent = `Zaznaczono: 0`;
        renderTemplateList();
    }

    function exitTemplateDeleteMode() {
        isTemplateDeleteModeActive = false;
        templatesToDelete = [];
        createTemplateColumn.classList.remove('hidden');
        templateDeleteBar.classList.add('hidden');
        deleteTemplatesModeBtn.classList.remove('hidden');
        renderTemplateList();
    }

    function toggleTemplateForDeletion(index) {
        const selectedIndex = templatesToDelete.indexOf(index);
        if (selectedIndex > -1) {
            templatesToDelete.splice(selectedIndex, 1);
        } else {
            templatesToDelete.push(index);
        }
        templateSelectionCounter.textContent = `Zaznaczono: ${templatesToDelete.length}`;
        renderTemplateList();
    }

    function confirmTemplateDeletion() {
        if (templatesToDelete.length === 0) {
            exitTemplateDeleteMode();
            return;
        }
        if (confirm(`Czy na pewno chcesz usunąć ${templatesToDelete.length} zaznaczone szablony?`)) {
            templatesToDelete.sort((a, b) => b - a);
            templatesToDelete.forEach(index => {
                workoutTemplates.splice(index, 1);
            });
            saveData();
        }
        exitTemplateDeleteMode();
    }

    function dayHasTemplate(dateKey, templateIndex) {
        const template = workoutTemplates[templateIndex];
        const dayData = workouts[dateKey];
        if (!template || !dayData || !dayData.exercises) return false;
        const dayExerciseNames = new Set(dayData.exercises.map(ex => ex.name));
        return template.exercises.every(ex => dayExerciseNames.has(ex.name));
    }

    function enterDayEditMode(templateIndex) {
        isDayEditModeActive = true;
        selectedTemplateForEdit = templateIndex;
        templatesPanel.classList.add('hidden');
        calendarActionBar.classList.remove('hidden');
        monthYearEl.classList.add('cursor-pointer', 'hover:text-cyan-400');
        dayHeaders.forEach(h => h.classList.add('cursor-pointer', 'hover:text-cyan-400'));
        renderCalendar();
    }

    function exitDayEditMode() {
        isDayEditModeActive = false;
        selectedTemplateForEdit = null;
        calendarActionBar.classList.add('hidden');
        monthYearEl.classList.remove('cursor-pointer', 'hover:text-cyan-400');
        dayHeaders.forEach(h => h.classList.remove('cursor-pointer', 'hover:text-cyan-400'));
        renderCalendar();
    }

    function toggleTemplateOnDay(date) {
        const dateKey = formatDateKey(date);
        const template = workoutTemplates[selectedTemplateForEdit];
        if (!template) return;
        const hasTemplateAlready = dayHasTemplate(dateKey, selectedTemplateForEdit);

        if (hasTemplateAlready) {
            const templateExerciseNames = new Set(template.exercises.map(ex => ex.name));
            if (workouts[dateKey]?.exercises) {
                workouts[dateKey].exercises = workouts[dateKey].exercises.filter(ex => !templateExerciseNames.has(ex.name));
                if (workouts[dateKey].exercises.length === 0 && !workouts[dateKey].note?.trim()) {
                    delete workouts[dateKey];
                }
            }
        } else {
            workouts[dateKey] = workouts[dateKey] || { exercises: [], note: '' };
            const dayExerciseNames = new Set(workouts[dateKey].exercises.map(ex => ex.name));
            const templateExercisesCopy = JSON.parse(JSON.stringify(template.exercises));
            templateExercisesCopy.forEach(templateEx => {
                if (!dayExerciseNames.has(templateEx.name)) {
                    workouts[dateKey].exercises.push(templateEx);
                }
            });
        }
        saveData();
        renderCalendar();
    }

    function toggleTemplateForGroup(dayFilter) {
        const { year, month } = { year: currentDate.getFullYear(), month: currentDate.getMonth() };
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const relevantDates = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            if (date >= today && dayFilter(date)) {
                relevantDates.push(date);
            }
        }

        if (relevantDates.length === 0) return;
        const shouldAdd = !relevantDates.every(date => dayHasTemplate(formatDateKey(date), selectedTemplateForEdit));
        
        relevantDates.forEach(date => {
            const dateKey = formatDateKey(date);
            const template = workoutTemplates[selectedTemplateForEdit];
            const hasTemplateAlready = dayHasTemplate(dateKey, selectedTemplateForEdit);

            if (shouldAdd && !hasTemplateAlready) {
                workouts[dateKey] = workouts[dateKey] || { exercises: [], note: '' };
                const dayExerciseNames = new Set(workouts[dateKey].exercises.map(ex => ex.name));
                const templateExercisesCopy = JSON.parse(JSON.stringify(template.exercises));
                templateExercisesCopy.forEach(templateEx => {
                    if (!dayExerciseNames.has(templateEx.name)) {
                        workouts[dateKey].exercises.push(templateEx);
                    }
                });
            } else if (!shouldAdd && hasTemplateAlready) {
                const templateExerciseNames = new Set(template.exercises.map(ex => ex.name));
                workouts[dateKey].exercises = workouts[dateKey].exercises.filter(ex => !templateExerciseNames.has(ex.name));
                if (workouts[dateKey].exercises.length === 0 && !workouts[dateKey].note?.trim()) {
                    delete workouts[dateKey];
                }
            }
        });
        saveData();
        renderCalendar();
    }

    // --- LISTENERY ZDARZEŃ ---
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    backToCalendarBtn.addEventListener('click', showCalendarView);
    
    toggleTemplatesPanelBtn.addEventListener('click', () => {
        templatesPanel.classList.toggle('hidden');
        if (!templatesPanel.classList.contains('hidden')) {
            exitTemplateDeleteMode();
            renderTemplateList();
            resetTemplateForm();
        }
    });

    addExerciseToTemplateBtn.addEventListener('click', addExerciseFieldToTemplateForm);
    saveTemplateBtn.addEventListener('click', saveNewTemplate);
    
    ['reps', 'sets', 'km'].forEach(type => addExerciseForm[type].addBtn.addEventListener('click', () => addExerciseForm[type].container.classList.toggle('hidden')));
    
    saveExerciseBtn.addEventListener('click', () => {
        const name = addExerciseForm.name.value.trim();
        if (!name) return alert('Proszę podać nazwę ćwiczenia.');
        
        const newExercise = { name };
        const reps = parseInt(addExerciseForm.reps.input.value);
        const sets = parseInt(addExerciseForm.sets.input.value);
        const km = parseFloat(addExerciseForm.km.input.value);
        if (reps) newExercise.reps = { target: reps, done: 0 };
        if (sets) newExercise.sets = { target: sets, done: 0 };
        if (km) newExercise.km = { target: km, done: 0 };
        
        if (Object.keys(newExercise).length < 2) return alert('Dodaj przynajmniej jedną wartość (powtórzenia, serie lub dystans).');
        
        const dateKey = formatDateKey(selectedDate);
        workouts[dateKey] = workouts[dateKey] || { exercises: [], note: '' };
        workouts[dateKey].exercises.push(newExercise);
        
        saveData();
        renderDayView();
        resetAddExerciseForm();
        renderCalendar();
    });

    saveNoteBtn.addEventListener('click', () => {
        const dateKey = formatDateKey(selectedDate);
        workouts[dateKey] = workouts[dateKey] || { exercises: [], note: '' };
        workouts[dateKey].note = dayNoteTextarea.value;
        if (!workouts[dateKey].note?.trim() && workouts[dateKey].exercises.length === 0) delete workouts[dateKey];
        saveData();
        renderCalendar();
        noteSavedFeedback.classList.remove('hidden');
        noteSavedFeedback.classList.add('flex');
        setTimeout(() => noteSavedFeedback.classList.add('hidden'), 2000);
    });

    saveDayAsTemplateBtn.addEventListener('click', () => {
        const dateKey = formatDateKey(selectedDate);
        const dayData = workouts[dateKey];

        if (!dayData || dayData.exercises.length === 0) {
            alert("Brak ćwiczeń w tym dniu, aby zapisać szablon.");
            return;
        }

        const templateName = prompt("Podaj nazwę dla nowego szablonu:", `Trening z ${selectedDate.toLocaleDateString()}`);
        if (!templateName || templateName.trim() === '') return;

        const templateExercises = JSON.parse(JSON.stringify(dayData.exercises));
        templateExercises.forEach(ex => {
            if (ex.reps) ex.reps.done = 0;
            if (ex.sets) ex.sets.done = 0;
            if (ex.km) ex.km.done = 0;
        });

        workoutTemplates.push({ name: templateName.trim(), exercises: templateExercises });
        saveData();
        alert(`Szablon "${templateName.trim()}" został zapisany!`);
    });

    exerciseList.addEventListener('click', e => {
        const btn = e.target.closest('button');
        const span = e.target.closest('span.editable-progress');
        if (btn?.matches('.delete-exercise-btn')) deleteExercise(btn.dataset.index);
        if (btn?.matches('.update-progress-btn')) updateProgress(btn.dataset.index, btn.dataset.type, parseFloat(btn.dataset.value));
        if (span) makeProgressEditable(span, span.dataset.index, span.dataset.type);
    });

    templateList.addEventListener('click', e => {
        const target = e.target;
        const templateCard = target.closest('[data-template-index]');

        if (isTemplateDeleteModeActive) {
            if (templateCard) {
                toggleTemplateForDeletion(parseInt(templateCard.dataset.templateIndex));
            }
            return;
        }

        const btn = target.closest('button');
        if (btn?.matches('.edit-custom-days-btn')) {
            enterDayEditMode(btn.dataset.templateIndex);
        }
    });
    
    deleteTemplatesModeBtn.addEventListener('click', enterTemplateDeleteMode);
    cancelDeleteBtn.addEventListener('click', exitTemplateDeleteMode);
    confirmDeleteBtn.addEventListener('click', confirmTemplateDeletion);
    
    finishEditingDaysBtn.addEventListener('click', exitDayEditMode);

    monthYearEl.addEventListener('click', () => {
        if (isDayEditModeActive) {
            toggleTemplateForGroup(() => true);
        }
    });

    dayHeaders.forEach(header => {
        header.addEventListener('click', () => {
            if (isDayEditModeActive) {
                const dayIndex = parseInt(header.dataset.dayIndex);
                toggleTemplateForGroup(date => date.getDay() === dayIndex);
            }
        });
    });

    // --- INICJALIZACJA ---
    // Inicjalizacja odbywa się w listenerze onAuthStateChanged
});
