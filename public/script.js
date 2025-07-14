'use strict';

const locationBttn = document.querySelector('.location-btn');
const popover = document.querySelector('.popover');
const toast = document.querySelector('.toast');
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const LOCATE_FIXED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-locate-fixed-icon lucide-locate-fixed"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>`;
const LOCATE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-locate-icon lucide-locate"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/></svg>`;

class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();
  workoutDate;
  clicks = 0;
  /**
    * @param {number} distance
    * @param {number} duration
    * @param {[number, number]} coords
    */
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
  calcDate() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.workoutDate = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}, ${this.date.getFullYear()}`;
  }
  addClick() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this.calcDate();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.calcDate();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #coords = COORDS;
  #zoomLevelPopup = 13;
  #pulsateInterval;
  #latestMarker;

  constructor() {
    this._loadData();

    this._updateHistory();
    this._loadMap.bind(this)();
    this._setInitialPopover();

    locationBttn.addEventListener('click', this._getPosition.bind(this));
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

  }

  _updateHistory() {
    if (COORDS.length > 0) {
      window.history.pushState({}, "", `@${COORDS[0]},${COORDS[1]}`);
    }
  }

  _setInitialPopover() {
    popover.textContent = 'Get your current location';
  }

  _showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  _startLoading() {
    locationBttn.classList.add('loading');
    popover.textContent = 'Getting your location';

    let iconState = 0;
    this.#pulsateInterval = setInterval(() => {
      locationBttn.innerHTML = iconState % 2 === 0 ? LOCATE_ICON : LOCATE_FIXED_ICON;
      iconState++;
    }, 500);
  }

  _stopLoading() {
    locationBttn.classList.remove('loading');
    clearInterval(this.#pulsateInterval);
    locationBttn.innerHTML = LOCATE_FIXED_ICON;
    this._setInitialPopover();
  }

  _getPosition() {
    if (navigator.geolocation) {
      this._startLoading();
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this._updateMap(position);
          this._stopLoading();
        },
        () => {
          this._stopLoading();
          this._showToast('Failed to get your location.');
        }
      );
    }
  };

  /**
    * @param {[number, number] | undefined} coords
    */
  _loadMap(coords) {
    if (coords) {
      this.#coords = coords;
    }

    this.#map = L.map('map').setView(this.#coords, this.#zoomLevelPopup);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._handleMapClick.bind(this));

    if (this.#workouts) {
      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });
    }
  }
  _handleMapClick(mapE) {
    if (this.#latestMarker) {
      this.#latestMarker.remove();
    }
    this.#latestMarker = L.marker([mapE.latlng.lat, mapE.latlng.lng])
      .addTo(this.#map)

    this._showForm(mapE)
  }

  /**
    * @param {GeolocationPosition} position
    */
  _updateMap(position) {
    const coords = [position.coords.latitude, position.coords.longitude];
    this.#map.setView(coords, this.#zoomLevelPopup, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _showForm(mapE) {
    // TODO: fails to focus after first load
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    const isNumber = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!isPositive(distance, duration, cadence)) {
        return this._showToast('Inputs have to be positive numbers.');
      }
      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!isNumber(distance, duration, elevation) || !isPositive(distance, duration)) {
        return this._showToast('Inputs have to be valid numbers.');
      }
      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }

    this.#workouts.push(workout);
    //update latest marker
    this._updateWorkoutMarker(workout, this.#latestMarker);
    this.#latestMarker = null; // resets latest marker to avoid removing it in _handleMapClick
    //create new workout boxes
    this._renderWorkout(workout);
    //hide the form
    this._hideForm();
    //save data into local storage
    this._saveData();
  }

  /**
    * @param {Workout} workout
    */
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.workoutDate}`
      )
      .openPopup();
  }

  /**
    * @param {Workout} workout
    * @param {L.Marker} marker
    */
  _updateWorkoutMarker(workout, marker) {
    marker.bindPopup(
      L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      })
    )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.workoutDate}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.workoutDate}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain.toFixed(
        1
      )}</span>
            <span class="workout__unit">m</span>
          </div>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#zoomLevelPopup, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _saveData() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _loadData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    data.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

new App();
