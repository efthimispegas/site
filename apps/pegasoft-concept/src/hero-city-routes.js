// City centres selected by name AND country from the pinned Natural Earth source.
// Connections illustrate the user-requested geography; no company routes implied.
export const CITIES = Object.freeze({
  newYork: Object.freeze({
    name: 'New York',
    country: 'United States of America',
    lon: -73.995718,
    lat: 40.721562,
  }),
  paris: Object.freeze({
    name: 'Paris',
    country: 'France',
    lon: 2.352992,
    lat: 48.858092,
  }),
  tokyo: Object.freeze({
    name: 'Tokyo',
    country: 'Japan',
    lon: 139.749462,
    lat: 35.686963,
  }),
  losAngeles: Object.freeze({
    name: 'Los Angeles',
    country: 'United States of America',
    lon: -118.231986,
    lat: 34.049219,
  }),
  barcelona: Object.freeze({
    name: 'Barcelona',
    country: 'Spain',
    lon: 2.181424,
    lat: 41.385245,
  }),
  milan: Object.freeze({
    name: 'Milan',
    country: 'Italy',
    lon: 9.203063,
    lat: 45.471921,
  }),
  athens: Object.freeze({
    name: 'Athens',
    country: 'Greece',
    lon: 23.731375,
    lat: 37.985272,
  }),
  london: Object.freeze({
    name: 'London',
    country: 'United Kingdom',
    lon: -0.118668,
    lat: 51.501941,
  }),
  moscow: Object.freeze({
    name: 'Moscow',
    country: 'Russia',
    lon: 37.613577,
    lat: 55.75411,
  }),
  newDelhi: Object.freeze({
    name: 'New Delhi',
    country: 'India',
    lon: 77.19998,
    lat: 28.600023,
  }),
  dubai: Object.freeze({
    name: 'Dubai',
    country: 'United Arab Emirates',
    lon: 55.286946,
    lat: 25.214912,
  }),
  abuDhabi: Object.freeze({
    name: 'Abu Dhabi',
    country: 'United Arab Emirates',
    lon: 54.366593,
    lat: 24.466684,
  }),
  berlin: Object.freeze({
    name: 'Berlin',
    country: 'Germany',
    lon: 13.399603,
    lat: 52.523764,
  }),
});
export const CITY_CONNECTIONS = Object.freeze([
  Object.freeze({ from: 'newYork', to: 'paris' }),
  Object.freeze({ from: 'tokyo', to: 'losAngeles' }),
  Object.freeze({ from: 'barcelona', to: 'paris' }),
  Object.freeze({ from: 'milan', to: 'athens' }),
  Object.freeze({ from: 'paris', to: 'newDelhi' }),
  Object.freeze({ from: 'london', to: 'moscow' }),
  Object.freeze({ from: 'tokyo', to: 'dubai' }),
  Object.freeze({ from: 'abuDhabi', to: 'berlin' }),
]);
