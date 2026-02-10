// Wave Gym - Core Application Logic

const state = {
    user_profile: null,
    routines: [],
    workout_history: [],
    exercise_db: [],
    current_view: 'auth',
    active_workout: null,
    editing_routine: null
};

// --- Core Initialization ---

function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateExerciseDatalist();

    if (state.user_profile) {
        switchView('dashboard');
    } else {
        switchView('auth');
    }
}

function loadFromLocalStorage() {
    const savedState = localStorage.getItem('wave_gym_state');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        state.user_profile = parsed.user_profile;
        state.routines = parsed.routines || [];
        state.workout_history = parsed.workout_history || [];
        state.exercise_db = parsed.exercise_db || [];
    }
}

function saveState() {
    localStorage.setItem('wave_gym_state', JSON.stringify({
        user_profile: state.user_profile,
        routines: state.routines,
        workout_history: state.workout_history,
        exercise_db: state.exercise_db
    }));
}

// --- View Management ---

function switchView(viewId) {
    state.current_view = viewId;
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });

    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) {
        targetView.style.display = 'flex';
        targetView.style.flexDirection = 'column';
    }

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'routine-architect') renderRoutineArchitect();
}

// --- Event Listeners ---

function setupEventListeners() {
    // Auth
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Dashboard
    document.getElementById('add-routine-btn').addEventListener('click', () => {
        state.editing_routine = { id: Date.now(), name: '', exercises: [] };
        switchView('routine-architect');
    });

    document.getElementById('import-db-btn').addEventListener('click', () => {
        document.getElementById('db-file-input').click();
    });

    document.getElementById('db-file-input').addEventListener('change', handleImportDB);

    // Routine Architect
    document.getElementById('add-exercise-to-routine-btn').addEventListener('click', addExerciseToArchitect);
    document.getElementById('save-routine-btn').addEventListener('click', saveRoutine);

    // Workout Engine
    document.getElementById('log-set-btn').addEventListener('click', handleLogSet);
}

// --- Auth Module ---

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    state.user_profile = {
        username: username,
        xp: 0,
        level: 1,
        totalVolume: 0
    };
    saveState();
    switchView('dashboard');
}

// --- Dashboard Module ---

function renderDashboard() {
    document.getElementById('warrior-name-display').textContent = state.user_profile.username;
    document.getElementById('xp-display').textContent = Math.floor(state.user_profile.xp);

    const level = Math.floor(state.user_profile.xp / 1000) + 1;
    state.user_profile.level = level;
    document.getElementById('level-display').textContent = level;

    const xpInLevel = state.user_profile.xp % 1000;
    const xpPercent = (xpInLevel / 1000) * 100;
    document.getElementById('xp-bar-fill').style.width = `${xpPercent}%`;

    const list = document.getElementById('routines-list');
    list.innerHTML = '';

    if (state.routines.length === 0) {
        list.innerHTML = '<p style="opacity: 0.5; text-align: center;">No routines yet. Create your first one!</p>';
    }

    state.routines.forEach(routine => {
        const item = document.createElement('div');
        item.className = 'routine-item';

        const info = document.createElement('div');
        const name = document.createElement('div');
        name.style.fontWeight = '500';
        name.textContent = routine.name;

        const details = document.createElement('div');
        details.style.fontSize = '0.7rem';
        details.style.opacity = '0.6';
        details.textContent = `${routine.exercises.length} exercises`;

        info.appendChild(name);
        info.appendChild(details);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '10px';

        const editBtn = document.createElement('span');
        editBtn.className = 'material-icons';
        editBtn.style.fontSize = '1.2rem';
        editBtn.style.opacity = '0.5';
        editBtn.textContent = 'edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editRoutine(routine);
        };

        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'material-icons';
        deleteBtn.style.fontSize = '1.2rem';
        deleteBtn.style.opacity = '0.5';
        deleteBtn.textContent = 'delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteRoutine(routine.id);
        };

        const playBtn = document.createElement('span');
        playBtn.className = 'material-icons';
        playBtn.style.color = 'var(--action-red)';
        playBtn.textContent = 'play_arrow';

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        actions.appendChild(playBtn);

        item.appendChild(info);
        item.appendChild(actions);

        item.onclick = () => startWorkout(routine);
        list.appendChild(item);
    });
}

function handleImportDB(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            loadDatabase(data);
            alert('Exercise database imported successfully!');
        } catch (err) {
            alert('Error parsing JSON file.');
        }
    };
    reader.readAsText(file);
}

function loadDatabase(jsonData) {
    state.exercise_db = jsonData;
    saveState();
    updateExerciseDatalist();
}

function updateExerciseDatalist() {
    const datalist = document.getElementById('exercise-datalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    state.exercise_db.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex.name;
        datalist.appendChild(option);
    });
}

// --- Routine Architect Module ---

function renderRoutineArchitect() {
    document.getElementById('routine-name-input').value = state.editing_routine.name;
    renderArchitectExercises();
}

function renderArchitectExercises() {
    const container = document.getElementById('architect-exercises');
    container.innerHTML = '';

    state.editing_routine.exercises.forEach((ex, index) => {
        const div = document.createElement('div');
        div.className = 'exercise-entry';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '0.5rem';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = ex.name;
        nameInput.setAttribute('list', 'exercise-datalist');
        nameInput.style.flex = '1';
        nameInput.style.marginRight = '10px';
        nameInput.style.padding = '5px 10px';
        nameInput.onchange = (e) => updateExercise(index, 'name', e.target.value);

        const delBtn = document.createElement('span');
        delBtn.className = 'material-icons';
        delBtn.style.fontSize = '1rem';
        delBtn.style.cursor = 'pointer';
        delBtn.style.opacity = '0.5';
        delBtn.textContent = 'delete';
        delBtn.onclick = () => removeExercise(index);

        header.appendChild(nameInput);
        header.appendChild(delBtn);

        const inputs = document.createElement('div');
        inputs.style.display = 'flex';
        inputs.style.gap = '0.5rem';

        const setsInp = document.createElement('input');
        setsInp.type = 'number';
        setsInp.placeholder = 'Sets';
        setsInp.value = ex.sets;
        setsInp.style.padding = '5px 10px';
        setsInp.onchange = (e) => updateExercise(index, 'sets', e.target.value);

        const repsInp = document.createElement('input');
        repsInp.type = 'number';
        repsInp.placeholder = 'Reps';
        repsInp.value = ex.reps;
        repsInp.style.padding = '5px 10px';
        repsInp.onchange = (e) => updateExercise(index, 'reps', e.target.value);

        inputs.appendChild(setsInp);
        inputs.appendChild(repsInp);

        div.appendChild(header);
        div.appendChild(inputs);
        container.appendChild(div);
    });
}

function addExerciseToArchitect() {
    state.editing_routine.exercises.push({
        name: '',
        sets: 3,
        reps: 10,
        weight: 0
    });
    renderArchitectExercises();
}

window.removeExercise = (index) => {
    state.editing_routine.exercises.splice(index, 1);
    renderArchitectExercises();
};

window.updateExercise = (index, field, value) => {
    state.editing_routine.exercises[index][field] = field === 'name' ? value : parseFloat(value);
};

function saveRoutine() {
    const name = document.getElementById('routine-name-input').value;
    if (!name) return alert('Please enter a routine name');

    state.editing_routine.name = name;

    const existingIndex = state.routines.findIndex(r => r.id === state.editing_routine.id);
    if (existingIndex > -1) {
        state.routines[existingIndex] = state.editing_routine;
    } else {
        state.routines.push(state.editing_routine);
    }

    saveState();
    switchView('dashboard');
}

function deleteRoutine(id) {
    if (confirm('Are you sure you want to delete this routine?')) {
        state.routines = state.routines.filter(r => r.id !== id);
        saveState();
        renderDashboard();
    }
}

function editRoutine(routine) {
    state.editing_routine = JSON.parse(JSON.stringify(routine)); // Deep clone
    switchView('routine-architect');
}

// --- Workout Engine Module ---

let timerInterval = null;
let beepAudioContext = null;

function startWorkout(routine) {
    state.active_workout = {
        routine: routine,
        currentExerciseIndex: 0,
        currentSet: 1,
        logs: [],
        totalPowerScore: 0
    };
    switchView('workout-engine');
    updateWorkoutUI();
}

function updateWorkoutUI() {
    const workout = state.active_workout;
    const exercise = workout.routine.exercises[workout.currentExerciseIndex];

    document.getElementById('current-workout-name').textContent = workout.routine.name;
    document.getElementById('current-exercise-name').textContent = exercise.name;
    document.getElementById('set-counter').textContent = `${workout.currentSet} / ${exercise.sets}`;
    document.getElementById('power-score-current').textContent = Math.floor(workout.totalPowerScore);

    document.getElementById('weight-input').value = exercise.weight || 0;
    document.getElementById('reps-input').value = exercise.reps || 10;

    document.getElementById('workout-active-content').style.display = 'block';
    document.getElementById('log-set-btn').style.display = 'flex';
    document.getElementById('timer-container').style.display = 'none';
    document.getElementById('workout-overlay').className = '';
}

function handleLogSet() {
    const workout = state.active_workout;
    const exercise = workout.routine.exercises[workout.currentExerciseIndex];

    const weight = parseFloat(document.getElementById('weight-input').value) || 0;
    const reps = parseInt(document.getElementById('reps-input').value) || 0;

    const volume = weight * reps;
    workout.totalPowerScore += volume;

    // Save to logs
    workout.logs.push({
        exercise: exercise.name,
        set: workout.currentSet,
        weight,
        reps,
        volume
    });

    // Update global XP
    state.user_profile.xp += volume * 0.1; // 10% of volume as XP
    saveState();

    if (workout.currentSet < exercise.sets) {
        workout.currentSet++;
        startRestTimer(60); // 60 seconds rest
    } else if (workout.currentExerciseIndex < workout.routine.exercises.length - 1) {
        workout.currentExerciseIndex++;
        workout.currentSet = 1;
        startRestTimer(90); // 90 seconds rest between exercises
    } else {
        finishWorkout();
    }
}

function startRestTimer(seconds) {
    document.getElementById('workout-active-content').style.display = 'none';
    document.getElementById('log-set-btn').style.display = 'none';
    document.getElementById('timer-container').style.display = 'block';

    const overlay = document.getElementById('workout-overlay');
    overlay.classList.add('active');
    overlay.style.backgroundColor = 'var(--recovery-teal)';

    let timeLeft = seconds;
    updateTimerDisplay(timeLeft);

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            overlay.style.backgroundColor = 'var(--action-red)';
            playBeep();
            setTimeout(() => {
                overlay.classList.remove('active');
                overlay.style.backgroundColor = 'transparent';
                updateWorkoutUI();
            }, 1500);
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timer-display').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function playBeep() {
    if (!beepAudioContext) {
        beepAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = beepAudioContext.createOscillator();
    const gain = beepAudioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, beepAudioContext.currentTime); // A5

    gain.gain.setValueAtTime(0, beepAudioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, beepAudioContext.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, beepAudioContext.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(beepAudioContext.destination);

    osc.start();
    osc.stop(beepAudioContext.currentTime + 0.5);
}

function finishWorkout() {
    alert(`Journey Complete! Total Power Score: ${Math.floor(state.active_workout.totalPowerScore)}`);
    state.workout_history.push({
        date: new Date().toISOString(),
        routineId: state.active_workout.routine.id,
        powerScore: state.active_workout.totalPowerScore
    });
    state.active_workout = null;
    saveState();
    switchView('dashboard');
}

window.app = {
    switchView,
    confirmEndWorkout: () => {
        if (confirm('End workout? Progress for this session will be saved up to this point.')) {
            finishWorkout();
        }
    }
};

document.addEventListener('DOMContentLoaded', init);
