'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class WorkOut {
  id = (Date.now() + '').slice(-10);
  date = new Date();
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
}

class Running extends WorkOut {
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends WorkOut {
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}
const run1 = new Running(10, 20, [23, -23], 100);
console.log(run1);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #coords;
  constructor() {
    this._getPosition(); //this = App
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
  }
  _getPosition = function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('can not acces to location, please reactivate GPS');
        }
      );
    }
  };

  _loadMap(position) {
    const { latitude } = position.coords; //give user's location
    const { longitude } = position.coords;
    this.#coords = [latitude, longitude];

    this.#map = L.map('map').setView(this.#coords, 16); //generate the map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    inputDistance.focus();
    this.#mapEvent = mapE;
    const { lat, lng } = this.#mapEvent.latlng;
    this.#coords = [lat, lng];
    console.log(this.#coords);

    form.classList.remove('hidden');
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
    //functions
    const isNumber = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    //guard statements
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!isPositive(distance, duration, cadence)) {
        return alert(
          'You can only introduce positive numbers, nor negative nor empty'
        );
      }
      //create the instance
      const workout = new Running(distance, duration, this.#coords, cadence);
      this.#workouts.push(workout);
      console.log(this);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !isNumber(distance, duration, elevation) ||
        !isPositive(distance, duration)
      ) {
        return alert(
          'You can only introduce numbers, positive or negative but not empty'
        );
      }
      //create the instance
      const workout = new Cycling(distance, duration, this.#coords, elevation);
      this.#workouts.push(workout);
    }
    //draw the marker
    this.marker(this.#workouts);
    //clean the inputs
    inputDistance.value = inputCadence.value = inputDuration.value = '';
  }
  marker(workouts) {
    const lastWork = workouts[workouts.length - 1];
    L.marker(lastWork.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `running-popup`,
        })
      )
      .setPopupContent('Workout')
      .openPopup();
  }
}
const test = new App();
