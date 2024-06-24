/* eslint-disable no-unused-vars, no-shadow-global */
/* globals google firebase */

// Global Variables
var isDirectionApiUsed = true;
var map, destinationMarker, deliveryPersonMarker, deliveryToDestPolyline;
var destLat = 18.590879, destLng = 73.753157; // Hardcoded destination coordinates
var directionsService, directionsRenderer;

function generateMarker({ position, icon, title }) {
  return new google.maps.Marker({
    position: position,
    icon: icon,
    title: title,
    map: map,
    animation: google.maps.Animation.DROP
  });
}

function drawPolyline(directionResult) {
  return new google.maps.Polyline({
    path: google.maps.geometry.encoding.decodePath(directionResult.routes[0].overview_polyline),
    geodesic: true,
    strokeColor: '#00bcd4',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    map: map
  });
}

// Map Initialize
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: { lat: destLat, lng: destLng } // Center map on destination
  });

  // Set Destination Marker
  destinationMarker = generateMarker({ position: { lat: destLat, lng: destLng }, icon: '/images/placemarker_red.png', title: 'Destination' });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true,
    map: map,
    polylineOptions: {
      strokeColor: "#79a1ee",
      strokeOpacity: 1.0,
      strokeWeight: 5
    }
  });

  // Initialize Firebase Database
  const db = firebase.database();

  // Listen for changes in 'locations' node
  db.ref('locations').on('value', snapshot => {
    const dataSnapshot = snapshot.val();
    onLocationChange(dataSnapshot);
  });
}

function onLocationChange(dataSnapshot) {
  if (deliveryPersonMarker) {
    // Update previous position
    previousLat = deliveryPersonMarker.position.lat();
    previousLng = deliveryPersonMarker.position.lng();
  }

  const nextLat = parseFloat(dataSnapshot.latitude);
  const nextLng = parseFloat(dataSnapshot.longitude);

  // Use Direction API only once
  if (isDirectionApiUsed) {
    const start = new google.maps.LatLng(nextLat, nextLng);
    // Calculate and display Route
    calculateRoute({ start: start, end: destinationMarker.getPosition() });
    isDirectionApiUsed = false;
  }

  if (deliveryPersonMarker) {
    // Update Delivery Person Marker using animation
    animateMarkerNavigation({ current: { lat: previousLat, lng: previousLng }, next: { lat: nextLat, lng: nextLng } });
  } else {
    // Set Delivery Person Marker on First Change
    deliveryPersonMarker = generateMarker({
      position: { lat: nextLat, lng: nextLng },
      icon: '/images/placemarker_blue.png',
      title: 'Delivery Person'
    });
  }
}

function calculateRoute({ start, end }) {
  const request = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  };
  directionsService.route(request, function (result, status) {
    if (status === 'OK') {
      deliveryToDestPolyline = drawPolyline(result);
    }
  });
}

// Move marker from current to next position in 0.5 seconds
function animateMarkerNavigation({ current, next }) {
  const deltalat = (next.lat - current.lat) / 100;
  const deltalng = (next.lng - current.lng) / 100;
  const delay = 10 * 0.5;

  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const lat = deliveryPersonMarker.getPosition().lat() + deltalat;
      const lng = deliveryPersonMarker.getPosition().lng() + deltalng;
      const latlng = new google.maps.LatLng(lat, lng);
      deliveryPersonMarker.setPosition(latlng);
    }, delay * i);
  }
}
